/**
 * Global error handler for Hono routes.
 *
 * Catches thrown errors, normalizes them into the standard response shape,
 * and logs them for debugging. Use with `app.onError()`.
 */

import { ApiResponse } from '../utils/api-response.js';

export class HttpError extends Error {
  constructor(message, status = 500, { code, details } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(message, details) {
    super(message, 400, { code: 'VALIDATION_ERROR', details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends HttpError {
  constructor(what = 'Resource') {
    super(`${what} not found`, 404, { code: 'NOT_FOUND' });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(message, 401, { code: 'UNAUTHORIZED' });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(message, 403, { code: 'FORBIDDEN' });
    this.name = 'ForbiddenError';
  }
}

/**
 * Hono onError handler. Attach via `app.onError(errorHandler)`.
 * @param {Error} err
 * @param {import('hono').Context} c
 */
export function errorHandler(err, c) {
  // Log with request context for easier debugging
  const path = c.req.path;
  const method = c.req.method;

  if (err instanceof HttpError) {
    const { body, status } = ApiResponse.error(err.message, {
      status: err.status,
      code: err.code,
      details: err.details
    });
    return c.json(body, status);
  }

  // SQLite constraint violations → 409
  if (err.message?.includes('SQLITE_CONSTRAINT')) {
    const { body, status } = ApiResponse.error('Data constraint violation', {
      status: 409,
      code: 'CONSTRAINT_VIOLATION',
      details: err.message
    });
    return c.json(body, status);
  }

  console.error(`[${method} ${path}] Unhandled error:`, err);

  const { body, status } = ApiResponse.error('Internal server error', {
    status: 500,
    code: 'INTERNAL',
    // Only expose details in dev to avoid leaking internals
    details: c.env?.ENVIRONMENT === 'development' ? err.message : undefined
  });
  return c.json(body, status);
}
