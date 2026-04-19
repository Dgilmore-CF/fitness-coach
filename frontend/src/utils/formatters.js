/**
 * Display formatters for weights, durations, dates, and distances.
 *
 * Consolidates the ad-hoc formatting helpers from legacy app.js and ensures
 * consistent output across every screen.
 */

import {
  isImperialSystem,
  toDisplayWeight,
  getWeightUnit,
  cmToFeetInches,
  getMeasurementSystem
} from './conversions.js';

/**
 * Format a weight (stored as kg) for display in the user's unit system.
 * - `N/A` for null/undefined/zero-falsy
 * - Rounds large values (>=1000) to whole numbers with locale separators
 * - Drops trailing ".0" on whole numbers
 *
 * @param {number | null | undefined} kg
 * @param {{ unit?: boolean, precision?: number }} [opts]
 * @returns {string}
 */
export function formatWeight(kg, opts = {}) {
  const { unit = true, precision = 1 } = opts;
  if (kg == null) return 'N/A';

  const value = toDisplayWeight(kg);
  const u = getWeightUnit();

  let formatted;
  if (Math.abs(value) >= 1000) {
    formatted = Math.round(value).toLocaleString();
  } else if (value % 1 === 0) {
    formatted = String(value);
  } else {
    formatted = value.toFixed(precision);
  }

  return unit ? `${formatted} ${u}` : formatted;
}

/**
 * Format a volume total (sum of weight × reps) — same as formatWeight but
 * always rounds to whole numbers since volumes get large quickly.
 * @param {number} kg
 * @returns {string}
 */
export function formatVolume(kg) {
  return formatWeight(kg, { precision: 0 });
}

/**
 * Format a height (stored as cm) in the user's unit system.
 * @param {number} cm
 * @returns {string}
 */
export function formatHeight(cm) {
  if (cm == null) return 'N/A';
  if (getMeasurementSystem() === 'imperial') {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

/**
 * Format a duration in seconds as HH:MM:SS (or MM:SS if under an hour).
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return '00:00';
  const total = Math.abs(Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

/**
 * Short humanized duration ("1h 24m", "45m", "30s").
 * @param {number} seconds
 * @returns {string}
 */
export function formatDurationShort(seconds) {
  if (seconds == null || seconds < 0) return '0s';
  const total = Math.floor(seconds);
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

/**
 * Format a date string (YYYY-MM-DD) without timezone shifting.
 * @param {string} dateStr
 * @param {object} [options] - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', options);
}

/**
 * Relative time ("2 days ago", "just now", "3 weeks ago").
 * @param {string | Date} value
 * @returns {string}
 */
export function formatRelative(value) {
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const diffSec = Math.floor((Date.now() - then.getTime()) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 minute ago';
  const mins = Math.floor(diffSec / 60);
  if (mins < 45) return `${mins} minutes ago`;
  if (mins < 90) return '1 hour ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  if (hours < 48) return 'yesterday';
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 2) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Format a number with thousand separators.
 * @param {number} n
 * @returns {string}
 */
export function formatNumber(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString();
}

/**
 * Format a percentage change with sign and arrow.
 * @param {number} pct
 * @returns {string}
 */
export function formatPercentChange(pct) {
  if (pct == null || Number.isNaN(pct)) return '—';
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return '0%';
  const arrow = rounded > 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(rounded)}%`;
}

// -------- exertion helpers (from legacy getExertionEmoji) --------

export function getExertionEmoji(level) {
  if (level == null) return '';
  if (level <= 2) return '😴';
  if (level <= 4) return '🙂';
  if (level <= 6) return '💪';
  if (level <= 8) return '🔥';
  return '🥵';
}

export function getExertionLabel(level) {
  if (level == null) return 'Not rated';
  if (level <= 2) return 'Very easy';
  if (level <= 4) return 'Easy';
  if (level <= 6) return 'Moderate';
  if (level <= 8) return 'Hard';
  return 'Maximum effort';
}

// -------- compatibility re-exports (match legacy API surface) --------

export { isImperialSystem, toDisplayWeight, getWeightUnit } from './conversions.js';
