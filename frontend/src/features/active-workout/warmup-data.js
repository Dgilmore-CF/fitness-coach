/**
 * Warmup exercise database keyed by muscle group.
 * Migrated from legacy warmupDatabase const.
 */

export const WARMUP_DATABASE = {
  Chest: ['Arm Circles', 'Wall Chest Stretch', 'Dynamic Push-ups'],
  Back: ['Cat-Cow Stretch', 'Scapular Pull-ups', 'Thoracic Rotations'],
  Shoulders: ['Shoulder Circles', 'Band Pull-Aparts', 'Cross-Body Stretch'],
  Legs: ['Leg Swings', 'Walking Lunges', 'Bodyweight Squats'],
  Quads: ['Standing Quad Stretch', 'Light Leg Extensions', 'High Knees'],
  Hamstrings: ['Standing Hamstring Stretch', 'Light Leg Curls', 'Inchworms'],
  Glutes: ['Glute Bridges', 'Fire Hydrants', 'Donkey Kicks'],
  Biceps: ['Arm Swings', 'Wall Bicep Stretch', 'Light Band Curls'],
  Triceps: ['Overhead Tricep Stretch', 'Light Bench Dips', 'Arm Extensions'],
  Abs: ['Standing Torso Twists', 'Dead Bug', 'Plank Hold'],
  Core: ['Bird Dogs', 'Side Plank Hold', 'Mountain Climbers'],
  Calves: ['Calf Raises', 'Ankle Circles', 'Wall Calf Stretch']
};

const GENERIC_WARMUPS = [
  { name: 'Jumping Jacks', muscle: 'Full Body' },
  { name: 'Dynamic Stretching', muscle: 'Full Body' },
  { name: 'Light Cardio', muscle: 'Full Body' }
];

/**
 * Resolve warmups for a list of muscle groups (deduped, with fallback).
 * @param {string[]} muscleGroups
 * @returns {Array<{ name: string, muscle: string }>}
 */
export function getWarmups(muscleGroups) {
  const warmups = [];
  for (const muscle of muscleGroups) {
    const list = WARMUP_DATABASE[muscle] || [];
    warmups.push(...list.map((name) => ({ name, muscle })));
  }
  return warmups.length > 0 ? warmups : GENERIC_WARMUPS;
}

/**
 * Detect exercise type config for UI (bodyweight only, bodyweight optional, or regular).
 */
const NO_WEIGHT_EXERCISES = [
  'sit-up', 'situp', 'crunch', 'plank', 'dead bug', 'bird dog', 'mountain climber',
  'leg raise', 'flutter kick', 'bicycle', 'v-up', 'hollow hold', 'superman',
  'reverse crunch', 'toe touch', 'russian twist', 'side plank', 'windshield wiper',
  'jumping jack', 'high knee', 'butt kick', 'burpee'
];

const BODYWEIGHT_OPTIONAL_EXERCISES = [
  'push-up', 'push up', 'pushup', 'pull-up', 'pull up', 'pullup',
  'chin-up', 'chin up', 'chinup', 'dip', 'inverted row', 'muscle-up',
  'pistol squat', 'lunge', 'squat', 'glute bridge', 'hip thrust',
  'nordic curl', 'calf raise', 'step-up', 'step up'
];

export function getBodyweightExerciseConfig(exerciseName = '', muscleGroup = '') {
  const name = String(exerciseName).toLowerCase();
  for (const pattern of NO_WEIGHT_EXERCISES) {
    if (name.includes(pattern)) {
      return { showWeight: false, useBodyweight: false, weightOptional: true };
    }
  }
  for (const pattern of BODYWEIGHT_OPTIONAL_EXERCISES) {
    if (name.includes(pattern)) {
      return { showWeight: true, useBodyweight: true, weightOptional: true };
    }
  }
  return { showWeight: true, useBodyweight: false, weightOptional: false };
}
