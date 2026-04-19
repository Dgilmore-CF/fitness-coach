/**
 * Unified workout volume calculations.
 *
 * Replaces the inconsistent unilateral handling scattered across the legacy
 * code (exercises.js, email-reports.js, achievements.js all disagreed).
 *
 * Volume = weight × reps, doubled for unilateral exercises (performed per side).
 */

/**
 * Calculate total volume for a single set.
 * @param {{ weight_kg?: number, reps?: number }} set
 * @param {boolean} isUnilateral
 * @returns {number}
 */
export function setVolume(set, isUnilateral = false) {
  const w = set?.weight_kg || 0;
  const r = set?.reps || 0;
  const multiplier = isUnilateral ? 2 : 1;
  return w * r * multiplier;
}

/**
 * Sum volume across all sets of an exercise.
 * @param {{ sets?: Array, is_unilateral?: boolean }} exercise
 * @returns {number}
 */
export function exerciseVolume(exercise) {
  if (!exercise || !Array.isArray(exercise.sets)) return 0;
  return exercise.sets.reduce(
    (sum, set) => sum + setVolume(set, exercise.is_unilateral),
    0
  );
}

/**
 * Sum volume across all exercises in a workout.
 * @param {{ exercises?: Array }} workout
 * @returns {number}
 */
export function workoutVolume(workout) {
  if (!workout || !Array.isArray(workout.exercises)) return 0;
  return workout.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

/**
 * Estimated one-rep max using Epley's formula.
 * Single-rep sets just return their weight (no extrapolation).
 * @param {number} weightKg
 * @param {number} reps
 * @returns {number}
 */
export function calculateOneRepMax(weightKg, reps) {
  if (!weightKg || !reps) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/**
 * Total rep count across all sets of an exercise.
 * @param {{ sets?: Array }} exercise
 * @returns {number}
 */
export function exerciseReps(exercise) {
  if (!exercise?.sets) return 0;
  return exercise.sets.reduce((sum, s) => sum + (s.reps || 0), 0);
}
