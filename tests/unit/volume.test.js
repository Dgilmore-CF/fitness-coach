import { describe, it, expect } from 'vitest';

import {
  setVolume,
  exerciseVolume,
  workoutVolume,
  calculateOneRepMax,
  exerciseReps
} from '../../frontend/src/utils/volume.js';

describe('volume calculations', () => {
  describe('setVolume', () => {
    it('multiplies weight × reps for a single set', () => {
      expect(setVolume({ weight_kg: 80, reps: 10 })).toBe(800);
      expect(setVolume({ weight_kg: 100, reps: 5 })).toBe(500);
    });

    it('doubles volume for unilateral exercises', () => {
      expect(setVolume({ weight_kg: 20, reps: 12 }, true)).toBe(480);
      expect(setVolume({ weight_kg: 25, reps: 10 }, false)).toBe(250);
    });

    it('handles missing data', () => {
      expect(setVolume({})).toBe(0);
      expect(setVolume(null)).toBe(0);
      expect(setVolume({ weight_kg: 100 })).toBe(0); // missing reps
      expect(setVolume({ reps: 10 })).toBe(0); // missing weight
    });
  });

  describe('exerciseVolume', () => {
    it('sums volume across sets', () => {
      const exercise = {
        sets: [
          { weight_kg: 80, reps: 10 },
          { weight_kg: 80, reps: 8 },
          { weight_kg: 80, reps: 6 }
        ]
      };
      expect(exerciseVolume(exercise)).toBe(80 * 10 + 80 * 8 + 80 * 6);
    });

    it('doubles for unilateral', () => {
      const exercise = {
        is_unilateral: true,
        sets: [
          { weight_kg: 20, reps: 10 },
          { weight_kg: 20, reps: 10 }
        ]
      };
      expect(exerciseVolume(exercise)).toBe(20 * 10 * 2 + 20 * 10 * 2);
    });

    it('handles no sets', () => {
      expect(exerciseVolume({ sets: [] })).toBe(0);
      expect(exerciseVolume({})).toBe(0);
      expect(exerciseVolume(null)).toBe(0);
    });
  });

  describe('workoutVolume', () => {
    it('sums across all exercises with mixed unilateral', () => {
      const workout = {
        exercises: [
          { sets: [{ weight_kg: 100, reps: 5 }] },                         // 500
          { is_unilateral: true, sets: [{ weight_kg: 20, reps: 10 }] }     // 400
        ]
      };
      expect(workoutVolume(workout)).toBe(900);
    });

    it('handles empty workout', () => {
      expect(workoutVolume({})).toBe(0);
      expect(workoutVolume({ exercises: [] })).toBe(0);
    });
  });

  describe('calculateOneRepMax', () => {
    it('returns weight for single-rep sets', () => {
      expect(calculateOneRepMax(100, 1)).toBe(100);
    });

    it('uses Epley formula for multi-rep sets', () => {
      // 100 × (1 + 5/30) = 116.67
      expect(calculateOneRepMax(100, 5)).toBeCloseTo(116.67, 1);
      // 80 × (1 + 10/30) = 106.67
      expect(calculateOneRepMax(80, 10)).toBeCloseTo(106.67, 1);
    });

    it('returns 0 for missing inputs', () => {
      expect(calculateOneRepMax(0, 5)).toBe(0);
      expect(calculateOneRepMax(100, 0)).toBe(0);
      expect(calculateOneRepMax(null, 5)).toBe(0);
    });
  });

  describe('exerciseReps', () => {
    it('sums reps across sets', () => {
      expect(exerciseReps({ sets: [{ reps: 10 }, { reps: 8 }, { reps: 6 }] })).toBe(24);
    });

    it('handles missing data', () => {
      expect(exerciseReps({})).toBe(0);
      expect(exerciseReps(null)).toBe(0);
      expect(exerciseReps({ sets: [{}, { reps: 5 }] })).toBe(5);
    });
  });
});
