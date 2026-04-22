import { describe, it, expect } from 'vitest';
import {
  todayForRequest,
  todayInTimezone,
  daysAgoForRequest,
  toDateKey
} from '../../src/utils/local-date.js';

/**
 * Mock Hono context factory — only the `.raw.cf.timezone` field is
 * actually read by our helpers, so that's all we stub.
 */
function mockCtx(timezone) {
  return {
    req: {
      raw: {
        cf: timezone === undefined ? undefined : { timezone }
      }
    }
  };
}

describe('todayInTimezone', () => {
  it('returns YYYY-MM-DD in the given IANA zone', () => {
    const pacific = todayInTimezone('America/Los_Angeles');
    expect(pacific).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('falls back to UTC when no timezone is given', () => {
    const utc = todayInTimezone(null);
    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    expect(utc).toBe(expected);
  });

  it('falls back to UTC on an invalid timezone name', () => {
    const fallback = todayInTimezone('Bogus/Not_A_Zone');
    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    expect(fallback).toBe(expected);
  });

  it('returns the correct local date at the UTC/local boundary', () => {
    // Not testing exact values (date-dependent) — just that Pacific and
    // UTC can disagree in the evening window. Verify by looking at the
    // Intl output directly.
    const utcNow = new Date();
    const pacificStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(utcNow);
    const helper = todayInTimezone('America/Los_Angeles');
    expect(helper).toBe(pacificStr);
  });
});

describe('todayForRequest', () => {
  it('reads timezone from req.raw.cf.timezone', () => {
    const c = mockCtx('America/Los_Angeles');
    expect(todayForRequest(c)).toBe(todayInTimezone('America/Los_Angeles'));
  });

  it('falls back to UTC when cf object is missing', () => {
    expect(todayForRequest(mockCtx(undefined))).toBe(todayInTimezone(null));
  });

  it('handles a null context without throwing', () => {
    expect(() => todayForRequest(null)).not.toThrow();
    expect(todayForRequest(null)).toBe(todayInTimezone(null));
  });
});

describe('daysAgoForRequest', () => {
  it('subtracts the given number of days from the local today', () => {
    const c = mockCtx('America/Los_Angeles');
    const today = todayForRequest(c);
    const yesterday = daysAgoForRequest(c, -1);

    const [y1, m1, d1] = today.split('-').map(Number);
    const [y2, m2, d2] = yesterday.split('-').map(Number);
    const t = new Date(Date.UTC(y1, m1 - 1, d1, 12));
    const y = new Date(Date.UTC(y2, m2 - 1, d2, 12));
    const diffDays = Math.round((t - y) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(1);
  });

  it('handles a 13-day window anchor (the activity feed default)', () => {
    const c = mockCtx('America/Los_Angeles');
    const today = todayForRequest(c);
    const start = daysAgoForRequest(c, -13);

    const [y1, m1, d1] = today.split('-').map(Number);
    const [y2, m2, d2] = start.split('-').map(Number);
    const t = new Date(Date.UTC(y1, m1 - 1, d1, 12));
    const y = new Date(Date.UTC(y2, m2 - 1, d2, 12));
    expect(Math.round((t - y) / (24 * 60 * 60 * 1000))).toBe(13);
  });
});

describe('toDateKey', () => {
  it('passes through YYYY-MM-DD strings unchanged', () => {
    expect(toDateKey('2026-04-21')).toBe('2026-04-21');
  });

  it('strips everything after the T from an ISO string', () => {
    expect(toDateKey('2026-04-21T22:30:00.000')).toBe('2026-04-21');
    expect(toDateKey('2026-04-21T22:30:00.000-07:00')).toBe('2026-04-21');
    expect(toDateKey('2026-04-21T22:30:00.000Z')).toBe('2026-04-21');
  });

  it('strips everything after a space (SQLite datetime form)', () => {
    expect(toDateKey('2026-04-21 22:30:00')).toBe('2026-04-21');
  });

  it('returns a local YYYY-MM-DD for a Date object', () => {
    const d = new Date(2026, 3, 21); // local April 21
    expect(toDateKey(d)).toBe('2026-04-21');
  });

  it('returns null for falsy / non-date inputs', () => {
    expect(toDateKey(null)).toBeNull();
    expect(toDateKey(undefined)).toBeNull();
    expect(toDateKey('')).toBeNull();
    expect(toDateKey('not a date')).toBeNull();
  });
});
