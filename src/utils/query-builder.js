/**
 * SQL query building helpers for D1.
 *
 * Replaces the repeated `WHERE 1=1` + push-to-array patterns in
 * exercises.js, health.js, and exports.js with one composable utility.
 *
 * Usage:
 *   const { sql, params } = buildQuery(
 *     'SELECT * FROM workouts',
 *     [
 *       filter('user_id = ?', user.id),
 *       filter('completed = ?', 1),
 *       filter('start_time >= ?', startDate),
 *       filter('start_time <= ?', endDate)
 *     ]
 *   );
 *   const result = await db.prepare(sql).bind(...params).all();
 */

/**
 * Build a conditional filter. Returns null if `value` is nullish so the
 * filter is skipped.
 * @param {string} clause - e.g. 'user_id = ?'
 * @param {*} value
 * @returns {{ clause: string, value: * } | null}
 */
export function filter(clause, value) {
  if (value == null) return null;
  return { clause, value };
}

/**
 * Build a complete SQL query from a base statement and a list of filters.
 * Null filters are skipped. Params are collected in order.
 *
 * @param {string} baseSql - must include `WHERE 1=1` if filters are used
 * @param {Array<{ clause: string, value: * } | null>} filters
 * @param {object} [tail] - additional clauses
 * @param {string} [tail.orderBy]
 * @param {number} [tail.limit]
 * @param {number} [tail.offset]
 * @returns {{ sql: string, params: Array }}
 */
export function buildQuery(baseSql, filters = [], tail = {}) {
  let sql = baseSql;
  const params = [];

  const active = filters.filter(Boolean);
  if (active.length > 0) {
    // Auto-insert WHERE 1=1 if not present
    if (!/\bWHERE\b/i.test(sql)) {
      sql += ' WHERE 1=1';
    }
    for (const f of active) {
      sql += ` AND ${f.clause}`;
      if (Array.isArray(f.value)) {
        params.push(...f.value);
      } else {
        params.push(f.value);
      }
    }
  }

  if (tail.orderBy) sql += ` ORDER BY ${tail.orderBy}`;
  if (tail.limit) {
    sql += ' LIMIT ?';
    params.push(tail.limit);
    if (tail.offset) {
      sql += ' OFFSET ?';
      params.push(tail.offset);
    }
  }

  return { sql, params };
}

/**
 * Parse start/end date query params, returning ISO strings.
 * @param {import('hono').Context} c
 * @returns {{ start: string | null, end: string | null }}
 */
export function parseDateRange(c) {
  const start = c.req.query('start') || c.req.query('start_date');
  const end = c.req.query('end') || c.req.query('end_date');
  return {
    start: start || null,
    end: end ? `${end}T23:59:59.999Z` : null
  };
}

/**
 * Parse pagination query params with sensible defaults and max limits.
 * @param {import('hono').Context} c
 * @param {object} [defaults]
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(c, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const requestedLimit = parseInt(c.req.query('limit') || String(defaultLimit), 10);
  const limit = Math.min(Math.max(1, requestedLimit), maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build a partial UPDATE statement from an allow-list of fields and an input object.
 * Only fields present in `allowed` AND in `input` are included.
 *
 * @param {string} table
 * @param {string[]} allowed - permitted column names
 * @param {object} input
 * @param {object} [where] - e.g. { id: 123, user_id: 1 }
 * @returns {{ sql: string, params: Array } | null} - null if nothing to update
 */
export function buildPartialUpdate(table, allowed, input, where = {}) {
  const updates = [];
  const params = [];

  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      updates.push(`${field} = ?`);
      params.push(input[field]);
    }
  }

  if (updates.length === 0) return null;

  const whereKeys = Object.keys(where);
  if (whereKeys.length === 0) {
    throw new Error('buildPartialUpdate requires at least one WHERE condition');
  }

  const whereClauses = whereKeys.map((k) => `${k} = ?`).join(' AND ');
  const whereParams = whereKeys.map((k) => where[k]);

  const sql = `UPDATE ${table} SET ${updates.join(', ')} WHERE ${whereClauses} RETURNING *`;
  return { sql, params: [...params, ...whereParams] };
}
