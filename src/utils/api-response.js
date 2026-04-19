/**
 * Consistent API response shape for all Hono handlers.
 *
 * Replaces the ad-hoc `c.json({ error: '...' })` / `c.json({ workout, message })`
 * patterns scattered across the legacy routes with one canonical envelope:
 *
 *   Success: { success: true,  data: <payload>, meta?: {...} }
 *   Error:   { success: false, error: <message>, code?: <string>, details?: <any> }
 *
 * Legacy callers expect flat responses (e.g. `{ workout: ... }`), so helpers
 * include a `.legacy()` variant that returns the old flat shape during the
 * transition period. All new endpoints should use the standardized shape.
 */

export const ApiResponse = {
  success(data, meta) {
    return meta ? { success: true, data, meta } : { success: true, data };
  },

  paginated(items, { page = 1, limit = 20, total = items.length } = {}) {
    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    };
  },

  error(message, { status = 400, code, details } = {}) {
    const body = { success: false, error: message };
    if (code) body.code = code;
    if (details != null) body.details = details;
    return { body, status };
  },

  /**
   * Legacy flat-response shape for backward compatibility during migration.
   * Prefer `success()` for new endpoints.
   */
  legacy(obj) {
    return obj;
  }
};

/**
 * Express-style response helper bound to a Hono context.
 * @param {import('hono').Context} c
 */
export function reply(c) {
  return {
    ok: (data, meta) => c.json(ApiResponse.success(data, meta)),
    created: (data) => c.json(ApiResponse.success(data), 201),
    paginated: (items, meta) => c.json(ApiResponse.paginated(items, meta)),
    error: (message, opts = {}) => {
      const { body, status } = ApiResponse.error(message, opts);
      return c.json(body, status);
    },
    notFound: (what = 'Resource') => {
      const { body, status } = ApiResponse.error(`${what} not found`, { status: 404, code: 'NOT_FOUND' });
      return c.json(body, status);
    },
    badRequest: (message = 'Invalid request', details) => {
      const { body, status } = ApiResponse.error(message, { status: 400, code: 'BAD_REQUEST', details });
      return c.json(body, status);
    },
    unauthorized: (message = 'Unauthorized') => {
      const { body, status } = ApiResponse.error(message, { status: 401, code: 'UNAUTHORIZED' });
      return c.json(body, status);
    },
    forbidden: (message = 'Forbidden') => {
      const { body, status } = ApiResponse.error(message, { status: 403, code: 'FORBIDDEN' });
      return c.json(body, status);
    },
    conflict: (message = 'Conflict') => {
      const { body, status } = ApiResponse.error(message, { status: 409, code: 'CONFLICT' });
      return c.json(body, status);
    },
    serverError: (message = 'Internal server error', details) => {
      const { body, status } = ApiResponse.error(message, { status: 500, code: 'INTERNAL', details });
      return c.json(body, status);
    }
  };
}

export default ApiResponse;
