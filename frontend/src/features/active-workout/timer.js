/**
 * Active-workout timer system (rest timer + workout stopwatch).
 * Consolidates the two parallel rest timer implementations from legacy.
 */

import { playRestComplete, playPRCelebration } from '@utils/audio';
import { events } from '@core/events';

let restEndTime = null;
let restInterval = null;
let restDuration = 0;
let workoutStartTime = null;
let workoutInterval = null;
let onRestTickCallback = null;
let onRestCompleteCallback = null;
let onWorkoutTickCallback = null;

// ============================================================================
// Rest timer
// ============================================================================

export function startRestTimer(seconds = 90, { onTick, onComplete } = {}) {
  if (restInterval) clearInterval(restInterval);
  restEndTime = Date.now() + seconds * 1000;
  restDuration = seconds;
  onRestTickCallback = onTick;
  onRestCompleteCallback = onComplete;
  runRestLoop();
}

export function resumeRestTimer({ onTick, onComplete } = {}) {
  if (!restEndTime || Date.now() >= restEndTime) return false;
  if (restInterval) clearInterval(restInterval);
  if (onTick) onRestTickCallback = onTick;
  if (onComplete) onRestCompleteCallback = onComplete;
  runRestLoop();
  return true;
}

function runRestLoop() {
  tickRest();
  restInterval = setInterval(tickRest, 100);
}

function tickRest() {
  const remaining = getRestRemaining();
  onRestTickCallback?.(remaining, restDuration);
  if (remaining <= 0) {
    stopRestTimer();
    playRestComplete();
    onRestCompleteCallback?.();
    events.emit('rest:complete');
  }
}

export function stopRestTimer() {
  if (restInterval) clearInterval(restInterval);
  restInterval = null;
  restEndTime = null;
}

export function adjustRestTimer(deltaSeconds) {
  if (!restEndTime) return;
  restEndTime += deltaSeconds * 1000;
  restDuration += deltaSeconds;
  tickRest();
}

export function skipRestTimer() {
  stopRestTimer();
  onRestCompleteCallback?.();
  events.emit('rest:skipped');
}

export function getRestRemaining() {
  if (!restEndTime) return 0;
  return Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
}

export function getRestDuration() {
  return restDuration;
}

export function isRestActive() {
  return restEndTime != null && Date.now() < restEndTime;
}

export function getRestEndTime() {
  return restEndTime;
}

// ============================================================================
// Workout stopwatch
// ============================================================================

/**
 * SQLite's CURRENT_TIMESTAMP stores UTC time as "YYYY-MM-DD HH:MM:SS" with
 * no timezone suffix. Safari and some mobile browsers interpret that as
 * LOCAL time, producing a wildly incorrect elapsed-time calculation
 * (e.g. "5 hours ago" when you just started the workout).
 * Normalize to an ISO UTC string before handing to Date.
 */
function parseDbTimestamp(input) {
  if (!input) return Date.now();
  if (input instanceof Date) return input.getTime();
  if (typeof input === 'number') return input;

  let str = String(input).trim();
  // Already ISO with timezone? Use as-is.
  if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(str)) {
    const t = new Date(str).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }
  // "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SSZ"
  str = str.replace(' ', 'T');
  if (!/Z$/.test(str)) str = str + 'Z';
  const t = new Date(str).getTime();
  // Safety: if parsing fails, or the value is in the future / absurdly far
  // in the past (>24h), fall back to "now".
  if (!Number.isFinite(t)) return Date.now();
  const now = Date.now();
  if (t > now + 60_000 || now - t > 86_400_000) return now;
  return t;
}

export function startWorkoutTimer(startTime, onTick) {
  if (workoutInterval) clearInterval(workoutInterval);
  workoutStartTime = parseDbTimestamp(startTime);
  onWorkoutTickCallback = onTick;
  tickWorkout();
  workoutInterval = setInterval(tickWorkout, 1000);
}

function tickWorkout() {
  const elapsed = Math.floor((Date.now() - workoutStartTime) / 1000);
  onWorkoutTickCallback?.(elapsed);
}

export function stopWorkoutTimer() {
  if (workoutInterval) clearInterval(workoutInterval);
  workoutInterval = null;
  workoutStartTime = null;
}

export function getWorkoutElapsed() {
  if (!workoutStartTime) return 0;
  return Math.floor((Date.now() - workoutStartTime) / 1000);
}

export { playPRCelebration };
