/**
 * WorkoutSessionDO — one Durable Object instance per *active* workout.
 *
 * Why this is the one place in the app that earns a Durable Object:
 *   - It's a single logical entity (one workout) with bursty, single-writer
 *     mutations (set after set after set).
 *   - It needs cross-connection coordination (live multi-device sync over
 *     WebSockets) and per-entity timers (the rest clock).
 *   - Its state is hot for ~45 minutes, then frozen forever — a natural
 *     ephemeral→durable lifecycle.
 *
 * Design: write-behind.
 *   - While the workout is active, the DO's *own* embedded SQLite is the
 *     source of truth for sets. Nothing is written to the central D1 `sets`
 *     table on the hot path.
 *   - On completion (or an abandoned-session alarm) the buffered sets are
 *     materialized into D1 in a single batch, after which the DO deletes its
 *     own state.
 *
 * The DO has direct access to the D1 binding (`env.DB`), which lets it both
 * self-initialize from D1 (for workouts started before this code shipped) and
 * flush back to D1 on completion.
 */

import { DurableObject } from 'cloudflare:workers';
import { calculateOneRepMax } from '../services/ai.js';

// Auto-finish a workout that has seen no activity for this long. The alarm
// flushes whatever was logged so an abandoned tab never strands data in the DO.
const ABANDON_MS = 3 * 60 * 60 * 1000; // 3 hours

export class WorkoutSessionDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;

    // Create the live-set table once, before any other method can run.
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS live_sets (
          local_id            INTEGER PRIMARY KEY AUTOINCREMENT,
          d1_id               INTEGER,           -- real D1 sets.id once persisted (else NULL)
          workout_exercise_id INTEGER NOT NULL,
          set_number          INTEGER NOT NULL,
          weight_kg           REAL,
          reps                INTEGER,
          one_rep_max_kg      REAL,
          rest_seconds        INTEGER,
          duration_seconds    INTEGER,
          calories_burned     INTEGER,
          distance_meters     REAL,
          avg_heart_rate      INTEGER,
          is_cardio           INTEGER DEFAULT 0,
          flushed             INTEGER DEFAULT 0, -- 1 once written to D1
          created_at          TEXT DEFAULT (datetime('now'))
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS exercise_meta (
          workout_exercise_id INTEGER PRIMARY KEY,
          is_cardio           INTEGER DEFAULT 0
        );
      `);
    });
  }

  // -----------------------------------------------------------------------
  // Small KV-style helpers for scalar session metadata.
  // -----------------------------------------------------------------------
  async _get(key, fallback = null) {
    const v = await this.ctx.storage.get(key);
    return v === undefined ? fallback : v;
  }

  async _touch() {
    await this.ctx.storage.put('lastActivity', Date.now());
    // (Re)arm the abandoned-session alarm. setAlarm overwrites any prior one.
    await this.ctx.storage.setAlarm(Date.now() + ABANDON_MS);
  }

  _sql() {
    return this.ctx.storage.sql;
  }

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------

  /**
   * Seed the DO at workout-start time. Called by the Worker right after it
   * creates the workout + workout_exercises rows in D1. Idempotent.
   * @param {{workoutId:number,userId:number,startTime:string,
   *          exercises:Array<{workout_exercise_id:number,is_cardio:boolean}>}} args
   */
  async init({ workoutId, userId, startTime, exercises = [] }) {
    await this.ctx.storage.put('workoutId', workoutId);
    await this.ctx.storage.put('userId', userId);
    await this.ctx.storage.put('startTime', startTime || new Date().toISOString());
    await this.ctx.storage.put('status', 'active');
    await this.ctx.storage.put('initialized', true);

    const sql = this._sql();
    for (const ex of exercises) {
      sql.exec(
        `INSERT INTO exercise_meta (workout_exercise_id, is_cardio)
         VALUES (?, ?)
         ON CONFLICT(workout_exercise_id) DO UPDATE SET is_cardio = excluded.is_cardio`,
        ex.workout_exercise_id,
        ex.is_cardio ? 1 : 0
      );
    }
    await this._touch();
    return { ok: true };
  }

  /**
   * Lazily initialize from D1 for workouts that were started before this DO
   * existed (or if the Worker skipped init). Pulls workout ownership, the
   * exercise list, and any sets already in D1 (marked flushed=1 so we never
   * re-insert them on completion).
   */
  async _ensureInit(workoutId, userId) {
    if (await this._get('initialized')) return;

    const db = this.env.DB;
    const workout = await db
      .prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?')
      .bind(workoutId, userId)
      .first();
    if (!workout) {
      // Can't verify ownership — mark initialized as empty so we don't loop,
      // but store no workoutId. Callers validate ownership separately.
      await this.ctx.storage.put('initialized', true);
      return;
    }

    await this.ctx.storage.put('workoutId', workoutId);
    await this.ctx.storage.put('userId', userId);
    await this.ctx.storage.put('startTime', workout.start_time);
    await this.ctx.storage.put('status', workout.completed ? 'completed' : 'active');

    const sql = this._sql();

    // Seed exercise metadata (is_cardio) for every exercise in the workout.
    const exRows = await db
      .prepare(
        `SELECT we.id AS workout_exercise_id, e.muscle_group
         FROM workout_exercises we
         JOIN exercises e ON we.exercise_id = e.id
         WHERE we.workout_id = ?`
      )
      .bind(workoutId)
      .all();
    for (const row of exRows.results || []) {
      sql.exec(
        `INSERT INTO exercise_meta (workout_exercise_id, is_cardio)
         VALUES (?, ?)
         ON CONFLICT(workout_exercise_id) DO UPDATE SET is_cardio = excluded.is_cardio`,
        row.workout_exercise_id,
        row.muscle_group === 'Cardio' ? 1 : 0
      );
    }

    // Load existing sets (already durable in D1) so reads are complete. These
    // are flushed=1 — completion must not duplicate them.
    const setRows = await db
      .prepare(
        `SELECT s.* FROM sets s
         JOIN workout_exercises we ON s.workout_exercise_id = we.id
         WHERE we.workout_id = ?
         ORDER BY s.workout_exercise_id, s.set_number`
      )
      .bind(workoutId)
      .all();
    for (const s of setRows.results || []) {
      sql.exec(
        `INSERT INTO live_sets
           (d1_id, workout_exercise_id, set_number, weight_kg, reps, one_rep_max_kg,
            rest_seconds, duration_seconds, calories_burned, distance_meters,
            avg_heart_rate, is_cardio, flushed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        s.id, s.workout_exercise_id, s.set_number, s.weight_kg, s.reps, s.one_rep_max_kg,
        s.rest_seconds, s.duration_seconds, s.calories_burned, s.distance_meters,
        s.avg_heart_rate, s.duration_seconds != null ? 1 : 0
      );
    }

    await this.ctx.storage.put('initialized', true);
    await this._touch();
  }

  async _assertOwner(workoutId, userId) {
    await this._ensureInit(workoutId, userId);
    const owner = await this._get('userId');
    if (owner != null && Number(owner) !== Number(userId)) {
      throw new Error('Forbidden: workout belongs to a different user');
    }
  }

  _isCardio(workoutExerciseId) {
    const rows = this._sql()
      .exec('SELECT is_cardio FROM exercise_meta WHERE workout_exercise_id = ?', workoutExerciseId)
      .toArray();
    return rows.length ? !!rows[0].is_cardio : null;
  }

  /** Resolve is_cardio, self-healing from D1 if the exercise is unknown. */
  async _resolveCardio(workoutExerciseId) {
    let cardio = this._isCardio(workoutExerciseId);
    if (cardio === null) {
      const row = await this.env.DB
        .prepare(
          `SELECT e.muscle_group FROM workout_exercises we
           JOIN exercises e ON we.exercise_id = e.id
           WHERE we.id = ?`
        )
        .bind(workoutExerciseId)
        .first();
      cardio = row?.muscle_group === 'Cardio';
      this._sql().exec(
        `INSERT INTO exercise_meta (workout_exercise_id, is_cardio) VALUES (?, ?)
         ON CONFLICT(workout_exercise_id) DO UPDATE SET is_cardio = excluded.is_cardio`,
        workoutExerciseId,
        cardio ? 1 : 0
      );
    }
    return cardio;
  }

  // -----------------------------------------------------------------------
  // Set mutations (the hot path) — all write-behind into DO SQLite.
  // -----------------------------------------------------------------------

  /**
   * Log a set. Returns the set row in the same shape as the D1 `sets` table
   * (with a synthetic positive `id` derived from local_id) so the existing
   * frontend can consume it unchanged.
   */
  async logSet({ workoutId, userId, workoutExerciseId, originId, ...body }) {
    await this._assertOwner(workoutId, userId);
    const weId = Number(workoutExerciseId);
    const isCardio = await this._resolveCardio(weId);

    const sql = this._sql();
    const next =
      sql.exec(
        'SELECT COALESCE(MAX(set_number), 0) + 1 AS n FROM live_sets WHERE workout_exercise_id = ?',
        weId
      ).toArray()[0].n;

    const weight = body.weight_kg ?? (isCardio ? 0 : null);
    const reps = body.reps ?? (isCardio ? 1 : null);
    const oneRepMax = isCardio ? null : calculateOneRepMax(weight, reps);
    const restSeconds = body.rest_seconds ?? (isCardio ? 0 : null);

    const cursor = sql.exec(
      `INSERT INTO live_sets
         (workout_exercise_id, set_number, weight_kg, reps, one_rep_max_kg,
          rest_seconds, duration_seconds, calories_burned, distance_meters,
          avg_heart_rate, is_cardio, flushed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       RETURNING *`,
      weId, next, weight, reps, oneRepMax, restSeconds,
      body.duration_seconds ?? null, body.calories_burned ?? null,
      body.distance_meters ?? null, body.avg_heart_rate ?? null,
      isCardio ? 1 : 0
    );
    const row = cursor.toArray()[0];
    const set = this._toSetShape(row);

    // Authoritative rest clock — start it server-side so every device agrees.
    if (!isCardio && restSeconds > 0) {
      const endsAt = Date.now() + restSeconds * 1000;
      await this.ctx.storage.put('restEndsAt', endsAt);
      this._broadcast({ type: 'timer:rest', endsAt, originId });
    }

    await this._touch();
    this._broadcast({ type: 'set:logged', workoutExerciseId: weId, set, originId });
    return { set };
  }

  async updateSet({ workoutId, userId, setId, originId, ...body }) {
    await this._assertOwner(workoutId, userId);
    const localId = this._localIdFromSyntheticId(setId);
    const sql = this._sql();
    const existing = sql.exec('SELECT * FROM live_sets WHERE local_id = ?', localId).toArray()[0];
    if (!existing) throw new Error('Set not found');

    const weight = body.weight_kg ?? existing.weight_kg;
    const reps = body.reps ?? existing.reps;
    const oneRepMax = existing.is_cardio ? existing.one_rep_max_kg : calculateOneRepMax(weight, reps);
    const restSeconds = body.rest_seconds ?? existing.rest_seconds;

    const cursor = sql.exec(
      `UPDATE live_sets SET weight_kg = ?, reps = ?, one_rep_max_kg = ?, rest_seconds = ?
       WHERE local_id = ? RETURNING *`,
      weight, reps, oneRepMax, restSeconds, localId
    );
    const set = this._toSetShape(cursor.toArray()[0]);

    // If this set is already persisted in D1 (pre-existing row), keep D1 in
    // sync immediately — it won't be re-flushed on completion.
    if (existing.d1_id) {
      await this.env.DB
        .prepare('UPDATE sets SET weight_kg=?, reps=?, one_rep_max_kg=?, rest_seconds=? WHERE id=?')
        .bind(weight, reps, oneRepMax, restSeconds, existing.d1_id)
        .run()
        .catch((e) => console.error('updateSet D1 sync failed:', e));
    }
    await this._touch();
    this._broadcast({ type: 'set:updated', workoutExerciseId: existing.workout_exercise_id, set, originId });
    return { set };
  }

  async deleteSet({ workoutId, userId, setId, originId }) {
    await this._assertOwner(workoutId, userId);
    const localId = this._localIdFromSyntheticId(setId);
    const sql = this._sql();
    const existing = sql.exec('SELECT * FROM live_sets WHERE local_id = ?', localId).toArray()[0];
    if (!existing) return { ok: true };

    // If it was already persisted to D1, remove it there too.
    if (existing.d1_id) {
      await this.env.DB.prepare('DELETE FROM sets WHERE id = ?').bind(existing.d1_id).run().catch(() => {});
    }
    sql.exec('DELETE FROM live_sets WHERE local_id = ?', localId);

    // Renumber remaining sets for this exercise so set_number stays 1..n.
    const remaining = sql
      .exec(
        'SELECT local_id FROM live_sets WHERE workout_exercise_id = ? ORDER BY set_number, local_id',
        existing.workout_exercise_id
      )
      .toArray();
    remaining.forEach((r, i) => {
      sql.exec('UPDATE live_sets SET set_number = ? WHERE local_id = ?', i + 1, r.local_id);
    });

    await this._touch();
    this._broadcast({ type: 'set:deleted', workoutExerciseId: existing.workout_exercise_id, setId, originId });
    return { ok: true };
  }

  // -----------------------------------------------------------------------
  // Reads
  // -----------------------------------------------------------------------

  /** Sets grouped by workout_exercise_id, plus live session/timer state. */
  async getSets({ workoutId, userId }) {
    await this._assertOwner(workoutId, userId);
    const rows = this._sql()
      .exec('SELECT * FROM live_sets ORDER BY workout_exercise_id, set_number')
      .toArray();
    const byExercise = {};
    for (const row of rows) {
      (byExercise[row.workout_exercise_id] ||= []).push(this._toSetShape(row));
    }
    return { sets: byExercise, state: await this._stateSnapshot() };
  }

  async getState({ workoutId, userId }) {
    await this._assertOwner(workoutId, userId);
    return this._stateSnapshot();
  }

  async _stateSnapshot() {
    const restEndsAt = await this._get('restEndsAt');
    return {
      status: await this._get('status', 'active'),
      startTime: await this._get('startTime'),
      // Only report a rest clock that hasn't already elapsed.
      restEndsAt: restEndsAt && restEndsAt > Date.now() ? restEndsAt : null,
      serverNow: Date.now()
    };
  }

  // -----------------------------------------------------------------------
  // Completion — materialize the buffer into D1 (write-behind flush).
  // -----------------------------------------------------------------------

  /**
   * Flush all not-yet-persisted sets into D1 in a single batch. Returns the
   * number of rows written. The Worker computes totals + AI afterward (the
   * sets are in D1 by then). The DO then deletes its own state.
   */
  async complete({ workoutId, userId, originId }) {
    await this._assertOwner(workoutId, userId);
    const flushed = await this._flushToD1();
    await this.ctx.storage.put('status', 'completed');
    this._broadcast({ type: 'session:completed', originId });
    // Close any live sockets — the workout is done.
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.close(1000, 'workout completed'); } catch { /* already closing */ }
    }
    await this._cleanup();
    return { flushed };
  }

  /** Insert pending (flushed=0, DO-originated) sets into D1 as one batch. */
  async _flushToD1() {
    const sql = this._sql();
    const pending = sql.exec('SELECT * FROM live_sets WHERE flushed = 0').toArray();
    if (!pending.length) return 0;

    const db = this.env.DB;
    const statements = pending.map((s) =>
      db.prepare(
        `INSERT INTO sets
           (workout_exercise_id, set_number, weight_kg, reps, one_rep_max_kg,
            rest_seconds, duration_seconds, calories_burned, distance_meters, avg_heart_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        s.workout_exercise_id, s.set_number, s.weight_kg, s.reps, s.one_rep_max_kg,
        s.rest_seconds, s.duration_seconds, s.calories_burned, s.distance_meters, s.avg_heart_rate
      )
    );
    await db.batch(statements);
    sql.exec('UPDATE live_sets SET flushed = 1 WHERE flushed = 0');
    return pending.length;
  }

  async _cleanup() {
    // Drop everything: scalar metadata, the alarm, and the SQLite rows.
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  // -----------------------------------------------------------------------
  // Alarm — abandoned-session sweep.
  // -----------------------------------------------------------------------
  async alarm() {
    const status = await this._get('status', 'active');
    if (status !== 'active') {
      await this._cleanup();
      return;
    }
    const last = (await this._get('lastActivity')) || 0;
    if (Date.now() - last < ABANDON_MS) {
      // Activity happened after the alarm was armed — re-arm and wait.
      await this.ctx.storage.setAlarm(last + ABANDON_MS);
      return;
    }

    // Abandoned: flush whatever exists and finalize the workout in D1.
    const workoutId = await this._get('workoutId');
    if (workoutId) {
      try {
        await this._flushToD1();
        await this.env.DB.prepare(
          `UPDATE workouts
             SET end_time = CURRENT_TIMESTAMP,
                 total_duration_seconds = (strftime('%s','now') - strftime('%s', start_time)),
                 completed = 1
           WHERE id = ? AND completed = 0`
        ).bind(workoutId).run();
      } catch (err) {
        console.error('Abandoned-session flush failed:', err);
      }
    }
    this._broadcast({ type: 'session:completed', reason: 'abandoned' });
    await this._cleanup();
  }

  // -----------------------------------------------------------------------
  // WebSockets — live multi-device sync via the hibernation API.
  // -----------------------------------------------------------------------
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    // Hibernation-aware accept: the runtime can evict us between messages
    // without dropping the socket.
    this.ctx.acceptWebSocket(server);

    // Push the current snapshot immediately so a freshly-connected device
    // (or a reload) renders accurate timer + status state.
    try {
      const snapshot = await this._stateSnapshot();
      server.send(JSON.stringify({ type: 'session:state', ...snapshot }));
    } catch { /* socket may close before first send */ }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    // Clients are mostly read-only; support a lightweight ping for keepalive.
    if (message === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', serverNow: Date.now() }));
    }
  }

  webSocketClose(ws, code, reason, wasClean) {
    try { ws.close(code, reason); } catch { /* noop */ }
  }

  webSocketError(ws) {
    try { ws.close(1011, 'error'); } catch { /* noop */ }
  }

  _broadcast(obj) {
    const payload = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload); } catch { /* socket gone */ }
    }
  }

  // -----------------------------------------------------------------------
  // Shape helpers
  // -----------------------------------------------------------------------

  /**
   * The frontend keys off a numeric `set.id`. DO rows use `local_id`; we
   * expose a synthetic, collision-free positive id so update/delete can map
   * back to the originating row.
   */
  _toSetShape(row) {
    return {
      id: this._syntheticId(row.local_id),
      workout_exercise_id: row.workout_exercise_id,
      set_number: row.set_number,
      weight_kg: row.weight_kg,
      reps: row.reps,
      one_rep_max_kg: row.one_rep_max_kg,
      rest_seconds: row.rest_seconds,
      duration_seconds: row.duration_seconds,
      calories_burned: row.calories_burned,
      distance_meters: row.distance_meters,
      avg_heart_rate: row.avg_heart_rate,
      completed: 1
    };
  }

  // Offset synthetic ids well above real D1 set ids so the two never collide
  // while a workout is live. Once flushed, the frontend re-fetches and gets
  // the real D1 ids, so the synthetic space only needs to be unambiguous
  // in-session.
  _syntheticId(localId) {
    return 2_000_000_000 + Number(localId);
  }

  _localIdFromSyntheticId(setId) {
    const n = Number(setId);
    return n >= 2_000_000_000 ? n - 2_000_000_000 : n;
  }
}
