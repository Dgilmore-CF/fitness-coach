import { describe, it, expect } from 'vitest';
import {
  calculateReadinessScore,
  predictNextSet,
  analyzePostSet
} from '../../src/services/ai-realtime.js';

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

describe('calculateReadinessScore', () => {
  it('returns high score when well rested', () => {
    const { score, status } = calculateReadinessScore({
      recentWorkouts: [{ start_time: hoursAgo(48), perceived_exertion: 5 }],
      targetMusclesOverlap: 0
    });
    expect(score).toBeGreaterThanOrEqual(70);
    expect(['primed', 'ready']).toContain(status);
  });

  it('penalizes for recent training of same muscles', () => {
    const { score, rationale } = calculateReadinessScore({
      recentWorkouts: [{ start_time: hoursAgo(36), perceived_exertion: 6 }],
      targetMusclesOverlap: 0.75
    });
    expect(score).toBeLessThan(95);
    expect(rationale.some((r) => r.includes('Target muscles'))).toBe(true);
  });

  it('penalizes for high weekly frequency', () => {
    const workouts = Array.from({ length: 6 }, (_, i) => ({
      start_time: hoursAgo(24 * (i + 1)),
      perceived_exertion: 7
    }));
    const { score } = calculateReadinessScore({ recentWorkouts: workouts, targetMusclesOverlap: 0 });
    // -15 for 6+ weekly sessions; may pick up other small deductions
    expect(score).toBeLessThanOrEqual(85);
  });

  it('returns needs_rest when score is very low', () => {
    const workouts = Array.from({ length: 6 }, (_, i) => ({
      start_time: hoursAgo(6 + i * 12),
      perceived_exertion: 9
    }));
    const { status } = calculateReadinessScore({ recentWorkouts: workouts, targetMusclesOverlap: 1 });
    expect(['fatigued', 'needs_rest']).toContain(status);
  });
});

describe('predictNextSet', () => {
  it('returns low confidence with no history', () => {
    const result = predictNextSet({ recentSets: [] });
    expect(result.suggestedWeight).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('recommends progression when reps exceed target', () => {
    const result = predictNextSet({
      recentSets: [{ weight_kg: 100, reps: 12 }, { weight_kg: 100, reps: 12 }],
      targetReps: 10
    });
    expect(result.suggestedWeight).toBe(102.5);
    expect(result.confidence).toBe('high');
    expect(result.rationale).toContain('progression');
  });

  it('holds weight when reps fell short', () => {
    const result = predictNextSet({
      recentSets: [{ weight_kg: 80, reps: 6 }],
      targetReps: 10
    });
    expect(result.suggestedWeight).toBe(80);
    expect(result.rationale).toContain('6 reps');
  });

  it('reduces weight for later sets in the same workout', () => {
    const result = predictNextSet({
      recentSets: [{ weight_kg: 80, reps: 8 }],
      targetReps: 8,
      completedSetsToday: 3
    });
    expect(result.suggestedWeight).toBeLessThan(80);
    expect(result.rationale).toContain('fatigue');
  });
});

describe('analyzePostSet', () => {
  it('returns null for empty input', () => {
    expect(analyzePostSet({ currentSets: [] })).toBeNull();
  });

  it('suggests progression after smashing reps on first set', () => {
    const insight = analyzePostSet({
      currentSets: [{ weight_kg: 80, reps: 14 }],
      targetReps: 10
    });
    expect(insight?.type).toBe('progression');
  });

  it('warns about form breakdown on big rep dropoff', () => {
    const insight = analyzePostSet({
      currentSets: [
        { weight_kg: 80, reps: 10 },
        { weight_kg: 80, reps: 9 },
        { weight_kg: 80, reps: 4 }
      ],
      targetReps: 10
    });
    expect(insight?.type).toBe('form_warning');
    expect(insight?.action).toBeDefined();
  });

  it('warns on load too heavy (very low reps)', () => {
    const insight = analyzePostSet({
      currentSets: [{ weight_kg: 150, reps: 3 }],
      targetReps: 10
    });
    expect(insight?.type).toBe('load_warning');
  });

  it('celebrates completion of all target sets', () => {
    const insight = analyzePostSet({
      currentSets: [
        { weight_kg: 80, reps: 10 },
        { weight_kg: 80, reps: 10 },
        { weight_kg: 80, reps: 10 }
      ],
      targetReps: 10,
      targetSets: 3
    });
    expect(insight?.type).toBe('complete');
  });
});
