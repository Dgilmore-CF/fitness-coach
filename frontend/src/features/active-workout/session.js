/**
 * Active workout session state.
 * Replaces scattered state.currentWorkout / state.workoutExercise / state.exerciseHistory mutations.
 */

import { store } from '@core/state';
import { api } from '@core/api';

/**
 * Current workout cached object (exercises, sets, metadata).
 * Backed by store.workout.* for persistence across minimize/restore.
 */
let workoutCache = null;
let activeIndex = 0;
let exerciseHistory = {};
let modifications = { added: [], deleted: [] };
let perceivedExertion = null;

export function getWorkout() {
  return workoutCache;
}

export function setWorkout(workout) {
  workoutCache = workout;
  store.set('currentWorkout', workout);
}

export async function refreshWorkout() {
  if (!workoutCache) return null;
  const data = await api.get(`/workouts/${workoutCache.id}`);
  setWorkout(data.workout);
  return data.workout;
}

export function getActiveIndex() {
  return activeIndex;
}

export function setActiveIndex(index) {
  activeIndex = index;
  store.set('workout.activeExerciseIndex', index);
}

export function getActiveExercise() {
  if (!workoutCache?.exercises) return null;
  return workoutCache.exercises[activeIndex] || null;
}

export function getExerciseHistory(exerciseId) {
  return exerciseHistory[exerciseId] || null;
}

export function setExerciseHistory(map) {
  exerciseHistory = map || {};
  store.set('workout.exerciseHistory', exerciseHistory);
}

export async function fetchExerciseHistory() {
  if (!workoutCache?.exercises) return;
  const history = {};
  await Promise.all(
    workoutCache.exercises.map(async (ex) => {
      try {
        const data = await api.get(
          `/workouts/exercises/${ex.exercise_id}/last-set?currentWorkoutId=${workoutCache.id}`
        );
        if (data.lastSet) history[ex.exercise_id] = data.lastSet;
      } catch (err) {
        // Expected: no previous history for this exercise
      }
    })
  );
  setExerciseHistory(history);
}

export function getModifications() {
  return modifications;
}

export function resetModifications() {
  modifications = { added: [], deleted: [] };
}

export function trackModification(type, exerciseId, exerciseName) {
  if (!modifications[type]) modifications[type] = [];
  modifications[type].push({ exercise_id: exerciseId, name: exerciseName });
}

export function getPerceivedExertion() {
  return perceivedExertion;
}

export function setPerceivedExertion(value) {
  perceivedExertion = value;
  store.set('workout.perceivedExertion', value);
}

export function resetSession() {
  workoutCache = null;
  activeIndex = 0;
  exerciseHistory = {};
  modifications = { added: [], deleted: [] };
  perceivedExertion = null;
  store.reset('currentWorkout');
  store.reset('workout');
}
