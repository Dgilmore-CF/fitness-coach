import { describe, it, expect, vi } from 'vitest';
import {
  analyzeNutrition,
  suggestNextMeal,
  parseMealFromText
} from '../../src/services/ai-nutrition.js';

// Minimal mock D1 database
function mockDb({ todayLog = {}, recentLogs = [], targets = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            first: async () => {
              if (sql.includes('FROM macro_targets')) return targets;
              if (sql.includes('FROM nutrition_log')) return todayLog;
              return null;
            },
            all: async () => ({ results: recentLogs }),
            run: async () => ({ success: true })
          };
        }
      };
    }
  };
}

describe('analyzeNutrition', () => {
  it('builds insights from rule-based logic when AI is unavailable', async () => {
    const db = mockDb({
      todayLog: {
        calories: 500,
        protein_grams: 40,
        carbs_grams: 50,
        fat_grams: 20,
        fiber_grams: 10,
        water_ml: 500,
        creatine_grams: 0
      },
      recentLogs: []
    });

    const result = await analyzeNutrition({
      ai: null,
      db,
      user: { id: 1, weight_kg: 75 },
      date: '2026-04-19'
    });

    expect(result.today.calories).toBe(500);
    expect(result.targets.protein_g).toBe(150);
    expect(result.remaining.protein_g).toBe(110);
    expect(Array.isArray(result.insights)).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);
    // Should flag low protein (40g / 150g = 27% < 50%)
    expect(result.insights.some((i) => i.category === 'protein' && i.priority === 'high')).toBe(true);
    // Should flag low water (500ml / 2625ml < 50%)
    expect(result.insights.some((i) => i.category === 'water')).toBe(true);
    // No AI narrative since ai is null
    expect(result.narrative).toBeNull();
  });

  it('flags empty state when no nutrition logged', async () => {
    const db = mockDb({
      todayLog: {
        calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0,
        fiber_grams: 0, water_ml: 0, creatine_grams: 0
      }
    });

    const result = await analyzeNutrition({
      ai: null,
      db,
      user: { id: 1, weight_kg: 75 }
    });

    expect(result.insights[0].category).toBe('empty');
  });

  it('celebrates when protein target is hit', async () => {
    const db = mockDb({
      todayLog: {
        calories: 2200, protein_grams: 160, carbs_grams: 220,
        fat_grams: 73, fiber_grams: 30, water_ml: 2500, creatine_grams: 5
      }
    });

    const result = await analyzeNutrition({
      ai: null,
      db,
      user: { id: 1, weight_kg: 75 }
    });

    expect(result.insights.some((i) =>
      i.category === 'protein' && i.title.toLowerCase().includes('target hit')
    )).toBe(true);
  });
});

describe('suggestNextMeal', () => {
  it('returns a rule-based fallback when AI is unavailable', async () => {
    const db = mockDb({
      todayLog: {
        calories: 800, protein_grams: 50, carbs_grams: 90,
        fat_grams: 25, water_ml: 1000, creatine_grams: 0
      }
    });

    const result = await suggestNextMeal({
      ai: null,
      db,
      user: { id: 1, weight_kg: 75 }
    });

    expect(result.source).toBe('fallback');
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].name).toBeTruthy();
    expect(result.suggestions[0].macros).toBeDefined();
    expect(result.remaining.calories).toBeGreaterThan(0);
  });
});

describe('parseMealFromText', () => {
  it('returns an error when AI is unavailable', async () => {
    const result = await parseMealFromText({ ai: null, text: '2 eggs and toast' });
    expect(result.foods).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it('returns an error on empty input', async () => {
    const result = await parseMealFromText({ ai: null, text: '' });
    expect(result.foods).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it('sanitizes AI output and computes totals', async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          foods: [
            { name: 'Eggs', quantity: 2, unit: 'large', calories: 72, protein_g: 6, carbs_g: 0.5, fat_g: 5, fiber_g: 0, confidence: 'high' },
            { name: 'Toast', quantity: 1, unit: 'slice', calories: 80, protein_g: 3, carbs_g: 15, fat_g: 1, fiber_g: 2, confidence: 'medium' },
            { name: '', quantity: 0, unit: '', calories: 0 } // should be dropped
          ]
        })
      })
    };

    const result = await parseMealFromText({ ai: mockAi, text: '2 eggs and toast' });

    expect(result.source).toBe('ai');
    expect(result.foods).toHaveLength(2);
    expect(result.foods[0].name).toBe('Eggs');
    expect(result.totals.calories).toBe(224); // 72*2 + 80*1 = 224
    expect(result.totals.protein_g).toBe(15); // 6*2 + 3*1 = 15
  });

  it('gracefully handles invalid AI JSON', async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({ response: 'I am not valid JSON' })
    };

    const result = await parseMealFromText({ ai: mockAi, text: 'something' });
    expect(result.foods).toEqual([]);
  });
});
