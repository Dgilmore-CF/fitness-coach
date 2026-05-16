import { describe, it, expect } from 'vitest';
import {
  analyzePostSet,
  __test__
} from '../../frontend/src/features/active-workout/set-analyzer.js';

const {
  estimateOneRepMaxKg,
  parseRepTarget,
  topWeightKg,
  isNewWeightPR,
  isNewOneRepMaxPR,
  isStalled
} = __test__;

// Deterministic formatters for testing. The analyzer accepts a formatter
// callback so we can verify both metric and imperial output without touching
// the store.
const fmtKg = (kg) => `${kg} kg`;
const fmtLbs = (kg) => `${Math.round(kg * 2.20462 * 10) / 10} lbs`;

describe('set-analyzer helpers', () => {
  describe('estimateOneRepMaxKg', () => {
    it('returns the weight itself for a single rep', () => {
      expect(estimateOneRepMaxKg(100, 1)).toBe(100);
    });

    it('estimates ~115 kg for 100kg × 5 (Epley)', () => {
      expect(estimateOneRepMaxKg(100, 5)).toBeCloseTo(116.7, 1);
    });

    it('returns 0 for missing inputs', () => {
      expect(estimateOneRepMaxKg(0, 5)).toBe(0);
      expect(estimateOneRepMaxKg(100, 0)).toBe(0);
      expect(estimateOneRepMaxKg(null, null)).toBe(0);
    });
  });

  describe('parseRepTarget', () => {
    it('handles numeric input', () => {
      expect(parseRepTarget(8)).toEqual({ low: 8, high: 8 });
    });

    it('handles single-number string', () => {
      expect(parseRepTarget('10')).toEqual({ low: 10, high: 10 });
    });

    it('handles hyphen range', () => {
      expect(parseRepTarget('8-10')).toEqual({ low: 8, high: 10 });
    });

    it('handles en-dash and em-dash ranges', () => {
      expect(parseRepTarget('8–10')).toEqual({ low: 8, high: 10 });
      expect(parseRepTarget('8—10')).toEqual({ low: 8, high: 10 });
    });

    it('defaults to {10,10} on garbage input', () => {
      expect(parseRepTarget('')).toEqual({ low: 10, high: 10 });
      expect(parseRepTarget(null)).toEqual({ low: 10, high: 10 });
      expect(parseRepTarget('AMRAP')).toEqual({ low: 10, high: 10 });
    });
  });

  describe('topWeightKg', () => {
    it('returns the heaviest weight from a set list', () => {
      expect(topWeightKg([
        { weight_kg: 80, reps: 8 },
        { weight_kg: 100, reps: 5 },
        { weight_kg: 90, reps: 6 }
      ])).toBe(100);
    });

    it('returns 0 for an empty list', () => {
      expect(topWeightKg([])).toBe(0);
      expect(topWeightKg(null)).toBe(0);
    });
  });

  describe('isNewWeightPR', () => {
    it('returns true when weight exceeds prior PR', () => {
      expect(isNewWeightPR({ weight_kg: 105, reps: 3 }, { max_weight_kg: 100 })).toBe(true);
    });

    it('returns false on a tie with the prior PR (must beat it)', () => {
      expect(isNewWeightPR({ weight_kg: 100, reps: 3 }, { max_weight_kg: 100 })).toBe(false);
    });

    it('returns false when under prior PR', () => {
      expect(isNewWeightPR({ weight_kg: 95, reps: 5 }, { max_weight_kg: 100 })).toBe(false);
    });

    it('returns false when the rep count is zero', () => {
      expect(isNewWeightPR({ weight_kg: 200, reps: 0 }, { max_weight_kg: 100 })).toBe(false);
    });
  });

  describe('isStalled', () => {
    const session = (date, top, reps) => ({
      workout_id: date,
      date,
      sets: [{ weight_kg: top, reps, set_number: 1 }]
    });

    it('flags 3 sessions at same weight with flat reps', () => {
      const history = [
        session('2026-05-08', 100, 5),
        session('2026-05-01', 100, 5),
        session('2026-04-24', 100, 5)
      ];
      expect(isStalled(history, 3)).toEqual({ weight_kg: 100, sessions: 3 });
    });

    it('does NOT flag when reps are improving across sessions', () => {
      const history = [
        session('2026-05-08', 100, 7), // newest, more reps
        session('2026-05-01', 100, 6),
        session('2026-04-24', 100, 5)
      ];
      expect(isStalled(history, 3)).toBeNull();
    });

    it('does NOT flag when weight is changing', () => {
      const history = [
        session('2026-05-08', 105, 5),
        session('2026-05-01', 100, 5),
        session('2026-04-24', 100, 5)
      ];
      expect(isStalled(history, 3)).toBeNull();
    });

    it('returns null when there are fewer than N sessions', () => {
      expect(isStalled([], 3)).toBeNull();
      expect(isStalled([session('a', 100, 5)], 3)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Analyzer integration tests
// ---------------------------------------------------------------------------

const exercise = { id: 1, name: 'Bench Press', target_reps: '8-10', target_sets: 3 };

const blankContext = {
  personal_records: { max_weight_kg: 0, max_one_rep_max_kg: 0, max_reps: 0 },
  recent_history: [],
  recent_load_7d: { session_count: 0, avg_rpe: null, total_volume_kg: 0 }
};

describe('analyzePostSet — null cases (no flag)', () => {
  it('returns null when lastSet is missing', () => {
    expect(analyzePostSet({
      exercise,
      currentSets: [],
      lastSet: null,
      exerciseContext: blankContext,
      formatWeight: fmtKg
    })).toBeNull();
  });

  it('returns null for a routine set hitting target', () => {
    const ctx = {
      ...blankContext,
      personal_records: { max_weight_kg: 200, max_one_rep_max_kg: 240, max_reps: 15 }
    };
    const result = analyzePostSet({
      exercise,
      currentSets: [{ weight_kg: 80, reps: 9, set_number: 1 }],
      lastSet: { weight_kg: 80, reps: 9, set_number: 1 },
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    expect(result).toBeNull();
  });
});

describe('analyzePostSet — PR detection', () => {
  it('flags a new weight PR', () => {
    const ctx = {
      ...blankContext,
      personal_records: { max_weight_kg: 100, max_one_rep_max_kg: 117, max_reps: 8 }
    };
    const result = analyzePostSet({
      exercise,
      currentSets: [{ weight_kg: 105, reps: 5, set_number: 1 }],
      lastSet: { weight_kg: 105, reps: 5, set_number: 1 },
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    expect(result?.flag).toBe('pr_weight');
    expect(result?.severity).toBe('success');
    expect(result?.message).toContain('105 kg');
    expect(result?.message).toContain('100 kg'); // previous best
  });

  it('formats PR message in lbs when imperial formatter is injected', () => {
    const ctx = {
      ...blankContext,
      personal_records: { max_weight_kg: 100, max_one_rep_max_kg: 117, max_reps: 8 }
    };
    const result = analyzePostSet({
      exercise,
      currentSets: [{ weight_kg: 102.5, reps: 5, set_number: 1 }],
      lastSet: { weight_kg: 102.5, reps: 5, set_number: 1 },
      exerciseContext: ctx,
      formatWeight: fmtLbs
    });
    expect(result?.flag).toBe('pr_weight');
    expect(result?.message).toContain('lbs');
    expect(result?.message).not.toContain('kg');
  });

  it('flags a 1RM PR when weight PR is not hit', () => {
    const ctx = {
      ...blankContext,
      // weight PR is 100kg; 1RM PR is 110kg
      personal_records: { max_weight_kg: 100, max_one_rep_max_kg: 110, max_reps: 12 }
    };
    // 95kg × 8 → Epley ~120kg (beats the 110 1RM PR but stays under the 100kg weight PR)
    const result = analyzePostSet({
      exercise,
      currentSets: [{ weight_kg: 95, reps: 8, set_number: 1 }],
      lastSet: { weight_kg: 95, reps: 8, set_number: 1 },
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    expect(result?.flag).toBe('pr_one_rep_max');
    expect(result?.severity).toBe('success');
  });

  it('PR weight rule wins over 1RM rule when both apply', () => {
    const ctx = {
      ...blankContext,
      personal_records: { max_weight_kg: 100, max_one_rep_max_kg: 110, max_reps: 12 }
    };
    const result = analyzePostSet({
      exercise,
      currentSets: [{ weight_kg: 110, reps: 5, set_number: 1 }],
      lastSet: { weight_kg: 110, reps: 5, set_number: 1 },
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    expect(result?.flag).toBe('pr_weight');
  });
});

describe('analyzePostSet — warnings', () => {
  it('flags form breakdown when reps drop 3+ at same weight', () => {
    const ctx = {
      ...blankContext,
      personal_records: { max_weight_kg: 200, max_one_rep_max_kg: 240, max_reps: 15 }
    };
    const sets = [
      { weight_kg: 80, reps: 9, set_number: 1 },
      { weight_kg: 80, reps: 5, set_number: 2 } // dropped 4 reps
    ];
    const result = analyzePostSet({
      exercise,
      currentSets: sets,
      lastSet: sets[1],
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    expect(result?.flag).toBe('form_breakdown');
    expect(result?.action?.type).toBe('extend_rest');
    expect(result?.action?.value).toBe(30);
  });

  it('flags load warning when RPE >= 9 with sets remaining', () => {
    const ctx = {
      ...blankContext,
      personal_records: { max_weight_kg: 200, max_one_rep_max_kg: 240, max_reps: 15 }
    };
    const result = analyzePostSet({
      exercise,
      currentSets: [{ weight_kg: 100, reps: 8, rpe: 9.5, set_number: 1 }],
      lastSet: { weight_kg: 100, reps: 8, rpe: 9.5, set_number: 1 },
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    expect(result?.flag).toBe('load_warning');
    expect(result?.action?.type).toBe('drop_weight');
    expect(result?.action?.value).toBeLessThan(100);
  });

  it('flags target miss when reps fall well below the range low', () => {
    const ctx = {
      ...blankContext,
      personal_records: { max_weight_kg: 200, max_one_rep_max_kg: 240, max_reps: 15 }
    };
    const result = analyzePostSet({
      exercise, // target 8-10
      currentSets: [{ weight_kg: 100, reps: 5, set_number: 1 }],
      lastSet: { weight_kg: 100, reps: 5, set_number: 1 },
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    expect(result?.flag).toBe('target_miss');
    expect(result?.severity).toBe('warning');
  });

  it('does NOT flag target miss on the final set of the exercise', () => {
    const ctx = {
      ...blankContext,
      personal_records: { max_weight_kg: 200, max_one_rep_max_kg: 240, max_reps: 15 }
    };
    const sets = [
      { weight_kg: 100, reps: 9, set_number: 1 },
      { weight_kg: 100, reps: 8, set_number: 2 },
      { weight_kg: 100, reps: 5, set_number: 3 } // last set — silent
    ];
    const result = analyzePostSet({
      exercise: { ...exercise, target_sets: 3 },
      currentSets: sets,
      lastSet: sets[2],
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    // Reps below target but last set — analyzer stays quiet
    expect(result).toBeNull();
  });
});

describe('analyzePostSet — stall detection', () => {
  // The exercise's target reps must match the stalled rep count so we don't
  // also trip target_miss (a higher-priority rule).
  const stalledExercise = { id: 1, name: 'Squat', target_reps: '5', target_sets: 3 };

  it('flags stall on the first set of the exercise today', () => {
    const session = (date, weight, reps) => ({
      workout_id: date,
      date,
      sets: [{ weight_kg: weight, reps, set_number: 1 }]
    });
    const ctx = {
      personal_records: { max_weight_kg: 100, max_one_rep_max_kg: 117, max_reps: 5 },
      recent_history: [
        session('2026-05-08', 100, 5),
        session('2026-05-01', 100, 5),
        session('2026-04-24', 100, 5)
      ],
      recent_load_7d: { session_count: 4, avg_rpe: 7.8, total_volume_kg: 4250 }
    };
    const result = analyzePostSet({
      exercise: stalledExercise,
      currentSets: [{ weight_kg: 100, reps: 5, set_number: 1 }],
      lastSet: { weight_kg: 100, reps: 5, set_number: 1 },
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    expect(result?.flag).toBe('stalled');
    expect(result?.severity).toBe('info');
  });

  it('does NOT flag stall on the second set of the day (already shown earlier)', () => {
    const session = (date, weight, reps) => ({
      workout_id: date,
      date,
      sets: [{ weight_kg: weight, reps, set_number: 1 }]
    });
    const ctx = {
      personal_records: { max_weight_kg: 100, max_one_rep_max_kg: 117, max_reps: 5 },
      recent_history: [
        session('2026-05-08', 100, 5),
        session('2026-05-01', 100, 5),
        session('2026-04-24', 100, 5)
      ],
      recent_load_7d: { session_count: 4, avg_rpe: 7.8, total_volume_kg: 4250 }
    };
    const sets = [
      { weight_kg: 100, reps: 5, set_number: 1 },
      { weight_kg: 100, reps: 5, set_number: 2 }
    ];
    const result = analyzePostSet({
      exercise: stalledExercise,
      currentSets: sets,
      lastSet: sets[1],
      exerciseContext: ctx,
      formatWeight: fmtKg
    });
    // Second set — no stall notice (would have already shown on set 1)
    // and no other rule trips (matching reps, no RPE, hitting target low)
    expect(result).toBeNull();
  });
});
