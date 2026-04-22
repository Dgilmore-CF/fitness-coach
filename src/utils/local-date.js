/**
 * Local-timezone date helpers for the Cloudflare Worker backend.
 *
 * When an endpoint defaults to "today", we want the user's local today
 * (e.g. "April 21" for a Pacific user at 10pm), not UTC today ("April 22").
 * The request's `cf.timezone` field, populated by Cloudflare from the
 * edge's geolocation of the client, gives us the IANA zone we need.
 *
 * Clients that pass an explicit `date=YYYY-MM-DD` still override this —
 * the preferred pattern is frontend-sends-local-date, with this helper
 * as a correctness backstop.
 */

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Derive a YYYY-MM-DD string in the user's local timezone from the Hono
 * request context. Falls back to UTC if no timezone hint is available.
 *
 * @param {import('hono').Context} c
 * @returns {string} YYYY-MM-DD
 */
export function todayForRequest(c) {
  const tz = c?.req?.raw?.cf?.timezone || null;
  return todayInTimezone(tz);
}

/**
 * YYYY-MM-DD today in the given IANA timezone. Falls back to UTC if the
 * zone is missing or unrecognized by the runtime's Intl DateTimeFormat.
 */
export function todayInTimezone(tz) {
  const now = new Date();
  if (!tz) {
    return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch (_) {
    // fall through to UTC
  }
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
}

/**
 * YYYY-MM-DD today minus (dayOffset) days in the user's local timezone.
 * Negative offsets go into the past (e.g. -13 for the start of a 14-day
 * inclusive window anchored on today).
 */
export function daysAgoForRequest(c, dayOffset) {
  const todayStr = todayForRequest(c);
  // Parse as local noon to avoid DST edge cases when subtracting days.
  const [y, m, d] = todayStr.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + dayOffset);
  return `${anchor.getUTCFullYear()}-${pad2(anchor.getUTCMonth() + 1)}-${pad2(anchor.getUTCDate())}`;
}

/**
 * Normalize any input to YYYY-MM-DD:
 *   - "2026-04-21"                         → "2026-04-21"
 *   - "2026-04-21T22:00:00.000-07:00"      → "2026-04-21"
 *   - "2026-04-21T22:00:00.000Z"           → "2026-04-21" (UTC date)
 *   - Date instance                         → local date of that Date
 *   - falsy                                 → null
 */
export function toDateKey(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  const s = String(value);
  // Grab everything before a T or space (safe for local or UTC ISO forms)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return null;
}
