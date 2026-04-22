/**
 * Local-timezone date helpers.
 *
 * The rest of the app used to compute "today" as
 * `new Date().toISOString().split('T')[0]`, which returns the UTC date.
 * That means on a Western-Hemisphere clock in the evening, UTC has
 * already rolled past midnight while the user is still on the previous
 * calendar day — so the app would display "today" as tomorrow, and
 * freshly-logged meals/entries would be filed under the wrong date.
 *
 * These helpers always work in the user's local timezone (the browser's
 * `Date` object), giving a consistent YYYY-MM-DD day key that matches
 * what the user sees on their wall clock / phone lock screen.
 */

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * YYYY-MM-DD in local time for the given Date (defaults to now).
 */
export function dateLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Today as YYYY-MM-DD in the user's local timezone.
 */
export function todayLocal() {
  return dateLocal(new Date());
}

/**
 * YYYY-MM-DD for (today + dayOffset) in local time. Use negative numbers
 * for past days (e.g. -1 for yesterday, -13 for the start of a 14-day
 * inclusive window).
 */
export function daysAgoLocal(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return dateLocal(d);
}

/**
 * Now as a "naive" ISO-8601 timestamp in the user's local timezone,
 * WITHOUT a Z or numeric offset suffix.
 * Example: "2026-04-21T22:13:00.000"
 *
 * Use this for fields like `logged_at` on a nutrition entry. SQLite's
 * date() / datetime() functions treat a naive string as local time, so
 * `date(logged_at)` returns the local day the user was actually on — not
 * the UTC day, which would drift across midnight.
 *
 * (A naive timestamp is semantically "a wall-clock moment"; perfect for
 * a single-user fitness log, where we care about the day the user was
 * living in when they pressed the button, not a cross-timezone moment.)
 */
export function nowLocalISO() {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` +
    `.${String(d.getMilliseconds()).padStart(3, '0')}`
  );
}

/**
 * Compare two YYYY-MM-DD strings safely (lexicographic compare works).
 */
export function isSameDay(a, b) {
  return a && b && a.slice(0, 10) === b.slice(0, 10);
}
