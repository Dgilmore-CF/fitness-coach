-- Reconcile schema drift between the application code and the migration source.
--
-- These objects are referenced by the code but were never created by any
-- migration. Unlike workout_exercises.target_sets (which production already
-- had out-of-band, so it was folded into 0001), there is no evidence these
-- exist in production — a forward migration is the correct fix and will bring
-- production into line when applied with `wrangler d1 migrations apply --remote`.
--
-- NOTE: SQLite has no "ADD COLUMN IF NOT EXISTS". If a database already has any
-- of these columns, that statement will error; in that case mark this migration
-- as applied (it is otherwise a no-op for that DB).

-- AI feature toggles read/written by GET/PUT /api/ai settings (src/routes/ai.js).
ALTER TABLE users ADD COLUMN ai_auto_apply INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN ai_weekly_analysis INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN ai_realtime_suggestions INTEGER DEFAULT 0;

-- Cardio session detail captured on POST /api/workouts/cardio
-- (src/routes/workouts.js). The insert was previously wrapped in try/catch and
-- failed silently, dropping the data. Creating the table makes it persist.
CREATE TABLE IF NOT EXISTS cardio_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  activity_type TEXT,
  duration_minutes INTEGER,
  distance_km REAL,
  avg_heart_rate INTEGER,
  calories_burned INTEGER,
  intensity TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cardio_sessions_workout ON cardio_sessions(workout_id);
