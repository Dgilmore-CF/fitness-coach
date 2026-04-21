import { describe, it, expect, vi } from 'vitest';
import { analyzeSetWithContext } from '../../src/services/ai-realtime.js';

/**
 * Minimal D1-style mock that routes SQL patterns to canned results.
 */
function mockDb({ exercise, history = [], prs, load }) {
  return {
    prepare(sql) {
      return {
        bind() {
          return {
            first: async () => {
              if (sql.includes('FROM exercises')) return exercise;
              if (sql.includes('MAX(weight_kg) AS max_weight')) return prs;
              if (sql.includes('FROM workouts') && sql.includes("'-7 days'")) return load;
              return null;
            },
            all: async () => {
              if (sql.includes('FROM sets s') && sql.includes('JOIN workouts w')) {
                // Flatten history into rows
                const rows = [];
                for (const wk of history) {
                  for (const s of wk.sets) {
                    rows.push({
                      workout_id: wk.workout_id,
                      start_time: wk.date,
                      perceived_exertion: wk.perceived_exertion,
                      set_number: s.set_number,
                      weight_kg: s.weight_kg,
                      reps: s.reps,
                      one_rep_max_kg: s.one_rep_max_kg || 0
                    });
                  }
                }
                return { results: rows };
              }
              return { results: [] };
            }
          };
        }
      };
    }
  };
}

describe('analyzeSetWithContext', () => {
  it('returns rule-based insight when DB lookup fails gracefully', async () => {
    const result = await analyzeSetWithContext({
      ai: null,
      db: null,
      user: null,
      exerciseId: 1,
      workoutId: 1,
      currentSets: [{ weight_kg: 80, reps: 12 }],
      targetReps: 10,
      targetSets: 3
    });

    // Should fall back to pure rule-based
    expect(result).toBeTruthy();
    expect(result.source).toBe('rules');
  });

  it('pulls history and computes a progression trend', async () => {
    const db = mockDb({
      exercise: { id: 1, name: 'Bench Press', muscle_group: 'Chest', is_unilateral: 0 },
      history: [
        { workout_id: 10, date: '2026-04-15T10:00:00Z', perceived_exertion: 7, sets: [{ set_number: 1, weight_kg: 80, reps: 10 }, { set_number: 2, weight_kg: 80, reps: 9 }] },
        { workout_id: 9,  date: '2026-04-12T10:00:00Z', perceived_exertion: 7, sets: [{ set_number: 1, weight_kg: 77.5, reps: 10 }] }
      ],
      prs: { max_weight: 80, max_1rm: 106, max_reps: 10 },
      load: { session_count: 4, avg_rpe: 7.2, total_volume: 8500, last_session: '2026-04-15T10:00:00Z' }
    });

    const result = await analyzeSetWithContext({
      ai: null, // No AI => rule + context only
      db,
      user: { id: 1 },
      exerciseId: 1,
      workoutId: 11,
      currentSets: [{ weight_kg: 82.5, reps: 8 }],
      targetReps: 10,
      targetSets: 3
    });

    expect(result.context.exercise.name).toBe('Bench Press');
    expect(result.context.recent_history).toHaveLength(2);
    expect(result.context.personal_records.max_weight_kg).toBe(80);
    expect(result.context.trend.state).toBe('progressing');
    expect(result.context.is_attempting_pr).toBe(true); // 82.5 > 80
  });

  it('flags a stalled trend when max weight has not moved', async () => {
    const db = mockDb({
      exercise: { id: 2, name: 'Squat', muscle_group: 'Quads', is_unilateral: 0 },
      history: [
        { workout_id: 20, date: '2026-04-15T10:00:00Z', sets: [{ set_number: 1, weight_kg: 100, reps: 5 }] },
        { workout_id: 19, date: '2026-04-12T10:00:00Z', sets: [{ set_number: 1, weight_kg: 100, reps: 5 }] }
      ],
      prs: { max_weight: 100, max_1rm: 116, max_reps: 5 },
      load: { session_count: 3, avg_rpe: 8, total_volume: 3000, last_session: '2026-04-15T10:00:00Z' }
    });

    const result = await analyzeSetWithContext({
      ai: null,
      db,
      user: { id: 1 },
      exerciseId: 2,
      workoutId: 21,
      currentSets: [{ weight_kg: 100, reps: 5 }],
      targetReps: 5,
      targetSets: 3
    });

    expect(result.context.trend.state).toBe('stalled');
    expect(result.context.trend.detail).toContain('100');
  });

  it('calls the AI and uses its response as the visible message', async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({
        response: '"Strong third set at 80kg. Rep count held steady — try 82.5kg next week for progression."'
      })
    };

    const db = mockDb({
      exercise: { id: 3, name: 'OHP', muscle_group: 'Shoulders', is_unilateral: 0 },
      history: [
        { workout_id: 30, date: '2026-04-12T10:00:00Z', sets: [{ set_number: 1, weight_kg: 80, reps: 10 }] }
      ],
      prs: { max_weight: 80, max_1rm: 106, max_reps: 10 },
      load: { session_count: 2, avg_rpe: 7 }
    });

    const result = await analyzeSetWithContext({
      ai: mockAi,
      db,
      user: { id: 1 },
      exerciseId: 3,
      workoutId: 31,
      currentSets: [{ weight_kg: 80, reps: 10 }],
      targetReps: 10,
      targetSets: 3
    });

    expect(mockAi.run).toHaveBeenCalled();
    expect(result.source).toBe('ai');
    // Quote-stripping: leading/trailing quotes should be removed
    expect(result.message.startsWith('"')).toBe(false);
    expect(result.message).toContain('80kg');
    expect(result.context).toBeTruthy();
  });

  it('falls back to rule-based message when AI returns empty', async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({ response: '' })
    };

    const db = mockDb({
      exercise: { id: 4, name: 'Deadlift', muscle_group: 'Back', is_unilateral: 0 },
      history: [],
      prs: { max_weight: 150, max_1rm: 175, max_reps: 5 },
      load: { session_count: 1, avg_rpe: 7 }
    });

    const result = await analyzeSetWithContext({
      ai: mockAi,
      db,
      user: { id: 1 },
      exerciseId: 4,
      workoutId: 41,
      // Large rep dropoff should trigger a form_warning rule
      currentSets: [
        { weight_kg: 140, reps: 10 },
        { weight_kg: 140, reps: 8 },
        { weight_kg: 140, reps: 3 }
      ],
      targetReps: 10,
      targetSets: 3
    });

    expect(result.type).toBe('form_warning');
    expect(result.source).toBe('rules');
    expect(result.message).toBeTruthy();
  });
});
