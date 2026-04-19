/**
 * Resource ownership guard.
 *
 * Replaces the repeated `SELECT ... WHERE id = ? AND user_id = ?` + 404
 * pattern found in workouts.js, programs.js, and other routes.
 *
 * Usage:
 *   const workout = await assertOwnership(db, 'workouts', workoutId, user.id);
 *   // throws NotFoundError if missing
 *
 *   const workout = await findOwned(db, 'workouts', workoutId, user.id);
 *   if (!workout) return c.json({ error: 'Not found' }, 404);
 */

import { NotFoundError, ForbiddenError } from './error-handler.js';

const ALLOWED_TABLES = new Set([
  'workouts',
  'programs',
  'program_days',
  'workout_exercises',
  'ai_recommendations',
  'ai_coach_conversations',
  'meals',
  'saved_meals',
  'nutrition_entries',
  'macro_targets'
]);

/**
 * Find a resource owned by a user. Returns the row or null.
 * Does NOT throw.
 * @param {*} db
 * @param {string} table
 * @param {number} id
 * @param {number} userId
 * @param {object} [opts]
 * @param {string} [opts.userColumn='user_id']
 * @param {string} [opts.select='*']
 * @returns {Promise<object | null>}
 */
export async function findOwned(db, table, id, userId, opts = {}) {
  const { userColumn = 'user_id', select = '*' } = opts;

  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`findOwned: table "${table}" is not in the allow-list`);
  }

  return await db.prepare(
    `SELECT ${select} FROM ${table} WHERE id = ? AND ${userColumn} = ?`
  ).bind(id, userId).first();
}

/**
 * Find a resource owned by a user, throwing NotFoundError if absent.
 * @param {*} db
 * @param {string} table
 * @param {number} id
 * @param {number} userId
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
export async function assertOwnership(db, table, id, userId, opts = {}) {
  const row = await findOwned(db, table, id, userId, opts);
  if (!row) {
    throw new NotFoundError(humanizeTableName(table));
  }
  return row;
}

/**
 * Verify a resource belongs to the user via a parent relationship.
 * E.g. verify a program_day belongs to a program owned by the user.
 *
 * @param {*} db
 * @param {string} table
 * @param {number} id
 * @param {number} userId
 * @param {object} opts
 * @param {string} opts.via - join table (e.g. 'programs')
 * @param {string} opts.foreignKey - FK column in `table` (e.g. 'program_id')
 * @returns {Promise<object>}
 */
export async function assertOwnershipVia(db, table, id, userId, opts) {
  const { via, foreignKey } = opts;

  const row = await db.prepare(
    `SELECT t.* FROM ${table} t
     JOIN ${via} p ON t.${foreignKey} = p.id
     WHERE t.id = ? AND p.user_id = ?`
  ).bind(id, userId).first();

  if (!row) {
    throw new NotFoundError(humanizeTableName(table));
  }
  return row;
}

function humanizeTableName(table) {
  const name = table.replace(/_/g, ' ').replace(/s$/, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}
