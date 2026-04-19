/**
 * API client with consistent error handling, request/response interceptors,
 * and in-memory caching for idempotent GETs.
 *
 * Replaces the legacy `api()` function scattered throughout app.js.
 */

const API_BASE = '/api';
const DEFAULT_TIMEOUT_MS = 30_000;
const CACHE_TTL_MS = 60_000;

/** In-memory GET response cache */
const cache = new Map();

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Low-level fetch wrapper. Prefer `api.get/post/put/patch/delete` over calling this.
 * @param {string} endpoint - e.g. '/workouts/123' (leading slash required, no /api prefix)
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object|FormData|string} [options.body]
 * @param {object} [options.headers]
 * @param {boolean} [options.cache] - allow cached response for GETs
 * @param {number} [options.timeout]
 * @param {AbortSignal} [options.signal]
 */
export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    cache: useCache = false,
    timeout = DEFAULT_TIMEOUT_MS,
    signal: externalSignal
  } = options;

  const url = `${API_BASE}${endpoint}`;
  const cacheKey = `${method} ${url}`;

  // Serve from cache for repeat GETs within TTL
  if (method === 'GET' && useCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    signal: controller.signal
  };

  if (body != null) {
    if (body instanceof FormData) {
      delete fetchOptions.headers['Content-Type'];
      fetchOptions.body = body;
    } else if (typeof body === 'string') {
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out', { code: 'TIMEOUT' });
    }
    throw new ApiError('Network error', { code: 'NETWORK', details: err.message });
  }
  clearTimeout(timeoutId);

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok) {
    const message = (isJson && payload?.error) || `Request failed (${response.status})`;
    throw new ApiError(message, {
      status: response.status,
      code: payload?.code,
      details: payload?.details
    });
  }

  if (method === 'GET' && useCache) {
    cache.set(cacheKey, { data: payload, at: Date.now() });
  }

  return payload;
}

/**
 * Invalidate cached GETs matching the given path prefix.
 * Call after mutations (POST/PUT/PATCH/DELETE) to force fresh reads.
 * @param {string} [prefix='']
 */
export function invalidateCache(prefix = '') {
  const target = `GET ${API_BASE}${prefix}`;
  for (const key of cache.keys()) {
    if (key.startsWith(target)) cache.delete(key);
  }
}

// Convenience verbs
export const api = {
  get: (endpoint, opts) => request(endpoint, { ...opts, method: 'GET' }),
  post: (endpoint, body, opts) => request(endpoint, { ...opts, method: 'POST', body }),
  put: (endpoint, body, opts) => request(endpoint, { ...opts, method: 'PUT', body }),
  patch: (endpoint, body, opts) => request(endpoint, { ...opts, method: 'PATCH', body }),
  delete: (endpoint, opts) => request(endpoint, { ...opts, method: 'DELETE' }),
  request,
  invalidateCache
};

export default api;
