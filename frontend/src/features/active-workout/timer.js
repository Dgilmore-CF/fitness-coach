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

export function startWorkoutTimer(startTime, onTick) {
  if (workoutInterval) clearInterval(workoutInterval);
  workoutStartTime = startTime ? new Date(startTime).getTime() : Date.now();
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
