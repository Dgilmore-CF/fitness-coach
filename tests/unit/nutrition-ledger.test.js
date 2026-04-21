import { describe, it, expect, vi } from 'vitest';
import {
  normalizeMacros,
  sumMacros,
  setMealTotals,
  recomputeMealTotals,
  addToNutritionLog,
  subtractFromNutritionLog,
  addEntryToLog,
  subtractEntryFromLog,
  entryColumnFor,
  reconcileNutritionLog,
  reconcileNutritionLogRange
} from '../../src/utils/nutrition-ledger.js';

/**
 * Tiny D1 mock that records every prepared SQL + bind invocation so tests
 * can assert both the query shape and the values bound. `first()` /
 * `all()` / `run()` default to harmless stubs; tests override as needed.
 */
function mockDb(resultMap = {}) {
  const calls = [];
  const db = {
    calls,
    prepare(sql) {
      const call = { sql, params: null, kind: null };
      calls.push(call);
      return {
        bind(...params) {
          call.params = params;
          return {
            first: async () => {
              call.kind = 'first';
              for (const [pattern, value] of Object.entries(resultMap)) {
                if (sql.includes(pattern)) return value;
              }
              return null;
            },
            all: async () => {
              call.kind = 'all';
              return { results: [] };
            },
            run: async () => {
              call.kind = 'run';
              return { success: true };
            }
          };
        }
      };
    }
  };
  return db;
}

describe('normalizeMacros', () => {
  it('returns a 5-field canonical shape with numeric zeros for missing fields', () => {
    expect(normalizeMacros({})).toEqual({
      calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0
    });
  });

  it('rounds calories to integers and macros to 1 decimal', () => {
    const m = normalizeMacros({
      calories: 423.7293,
      protein_g: 35.12345,
      carbs_g: 40.06,
      fat_g: 12.349,
      fiber_g: 5.55
    });
    expect(m.calories).toBe(424);
    expect(m.protein_g).toBe(35.1);
    expect(m.carbs_g).toBe(40.1);
    expect(m.fat_g).toBe(12.3);
    expect(m.fiber_g).toBe(5.6);
  });

  it('accepts legacy alias keys (protein_grams, protein)', () => {
    expect(normalizeMacros({ protein_grams: 20 }).protein_g).toBe(20);
    expect(normalizeMacros({ protein: 30 }).protein_g).toBe(30);
  });

  it('clamps negatives and non-finite numbers to zero', () => {
    const m = normalizeMacros({
      calories: -100,
      protein_g: NaN,
      carbs_g: null,
      fat_g: undefined,
      fiber_g: 'bogus'
    });
    expect(m).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });
  });

  it('coerces numeric strings', () => {
    expect(normalizeMacros({ calories: '500', protein_g: '30' })).toMatchObject({
      calories: 500,
      protein_g: 30
    });
  });
});

describe('sumMacros', () => {
  it('sums a list of meal_foods-shaped rows to normalized totals', () => {
    const totals = sumMacros([
      { calories: 200, protein_g: 20, carbs_g: 10, fat_g: 5, fiber_g: 2 },
      { calories: 150, protein_g: 10, carbs_g: 20, fat_g: 3, fiber_g: 1 },
      { calories: 50,  protein_g: 0,  carbs_g: 12, fat_g: 2 }
    ]);
    expect(totals).toEqual({
      calories: 400,
      protein_g: 30,
      carbs_g: 42,
      fat_g: 10,
      fiber_g: 3
    });
  });

  it('tolerates empty / null / undefined items', () => {
    expect(sumMacros([null, undefined, {}])).toEqual({
      calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0
    });
    expect(sumMacros()).toEqual({
      calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0
    });
  });
});

describe('setMealTotals', () => {
  it('issues an UPDATE meals SET … with normalized macros', async () => {
    const db = mockDb();
    await setMealTotals(db, 42, { calories: 500.7, protein_g: 30.12, carbs_g: 50, fat_g: 15 });
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toMatch(/UPDATE meals/);
    expect(db.calls[0].sql).toMatch(/calories = \?/);
    expect(db.calls[0].params).toEqual([501, 30.1, 50, 15, 0, 42]);
  });
});

describe('recomputeMealTotals', () => {
  it('SUMs meal_foods and preserves existing fiber_g on the meal row', async () => {
    const db = mockDb({
      'FROM meal_foods': { calories: 300, protein_g: 25, carbs_g: 40, fat_g: 10 },
      'FROM meals': { fiber_g: 7 }
    });
    await recomputeMealTotals(db, 7);
    // Three prepare() calls: SUM meal_foods, SELECT meals.fiber_g, UPDATE meals
    expect(db.calls.length).toBe(3);
    const update = db.calls[2];
    expect(update.sql).toMatch(/UPDATE meals/);
    expect(update.params[0]).toBe(300); // calories
    expect(update.params[4]).toBe(7);   // preserved fiber_g
    expect(update.params[5]).toBe(7);   // meal id
  });
});

describe('addToNutritionLog', () => {
  it('does an upsert INSERT ... ON CONFLICT adding macros to the day', async () => {
    const db = mockDb();
    await addToNutritionLog(db, 1, '2026-04-21', {
      calories: 500, protein_g: 30, carbs_g: 50, fat_g: 15, fiber_g: 4
    });
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toMatch(/INSERT INTO nutrition_log/);
    expect(db.calls[0].sql).toMatch(/ON CONFLICT/);
    expect(db.calls[0].sql).toMatch(/calories\s+=\s+COALESCE\(calories,\s+0\)\s+\+\s+excluded\.calories/);
    expect(db.calls[0].params).toEqual([1, '2026-04-21', 500, 30, 50, 15, 4]);
  });

  it('skips the DB round-trip when every macro is zero', async () => {
    const db = mockDb();
    await addToNutritionLog(db, 1, '2026-04-21', {});
    expect(db.calls).toHaveLength(0);
  });
});

describe('subtractFromNutritionLog', () => {
  it('clamps each column to >= 0 via MAX(0, col - ?)', async () => {
    const db = mockDb();
    await subtractFromNutritionLog(db, 1, '2026-04-21', {
      calories: 200, protein_g: 10, carbs_g: 20, fat_g: 5, fiber_g: 1
    });
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toMatch(/UPDATE nutrition_log/);
    expect(db.calls[0].sql).toMatch(/MAX\(0,\s+COALESCE\(calories,\s+0\)\s+-\s+\?\)/);
    expect(db.calls[0].params).toEqual([200, 10, 20, 5, 1, 1, '2026-04-21']);
  });

  it('no-ops when all macros are zero', async () => {
    const db = mockDb();
    await subtractFromNutritionLog(db, 1, '2026-04-21', { calories: 0 });
    expect(db.calls).toHaveLength(0);
  });
});

describe('entryColumnFor', () => {
  it('maps each known entry type to its nutrition_log column', () => {
    expect(entryColumnFor('protein')).toBe('protein_grams');
    expect(entryColumnFor('water')).toBe('water_ml');
    expect(entryColumnFor('creatine')).toBe('creatine_grams');
  });

  it('returns null for unknown entry types', () => {
    expect(entryColumnFor('fiber')).toBeNull();
    expect(entryColumnFor(undefined)).toBeNull();
  });
});

describe('addEntryToLog / subtractEntryFromLog', () => {
  it('addEntryToLog UPSERTs the column matching the entry_type', async () => {
    const db = mockDb();
    await addEntryToLog(db, 1, '2026-04-21', 'water', 500);
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toMatch(/INSERT INTO nutrition_log \(user_id, date, water_ml, updated_at\)/);
    expect(db.calls[0].sql).toMatch(/water_ml = COALESCE\(water_ml, 0\) \+ excluded\.water_ml/);
    expect(db.calls[0].params).toEqual([1, '2026-04-21', 500]);
  });

  it('subtractEntryFromLog updates only the matching column with MAX(0, ...)', async () => {
    const db = mockDb();
    await subtractEntryFromLog(db, 1, '2026-04-21', 'protein', 30);
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toMatch(/UPDATE nutrition_log/);
    expect(db.calls[0].sql).toMatch(/protein_grams = MAX\(0, COALESCE\(protein_grams, 0\) - \?\)/);
    expect(db.calls[0].params).toEqual([30, 1, '2026-04-21']);
  });

  it('skips unknown entry types with no DB call', async () => {
    const db = mockDb();
    await addEntryToLog(db, 1, '2026-04-21', 'bogus', 10);
    await subtractEntryFromLog(db, 1, '2026-04-21', 'bogus', 10);
    expect(db.calls).toHaveLength(0);
  });

  it('skips zero / negative amounts', async () => {
    const db = mockDb();
    await addEntryToLog(db, 1, '2026-04-21', 'protein', 0);
    await addEntryToLog(db, 1, '2026-04-21', 'protein', -5);
    expect(db.calls).toHaveLength(0);
  });
});

describe('reconcileNutritionLog', () => {
  /**
   * Specialized mock that returns different results for each prepared
   * statement based on which SQL fragment it contains. Lets us simulate
   * meals + entries + upsert in a single reconcile call.
   */
  function reconcileMock({ mealTotals, entryRows }) {
    const calls = [];
    return {
      calls,
      prepare(sql) {
        const call = { sql, params: null };
        calls.push(call);
        return {
          bind(...params) {
            call.params = params;
            return {
              first: async () => {
                if (sql.includes('FROM meals')) return mealTotals;
                return null;
              },
              all: async () => {
                if (sql.includes('FROM nutrition_entries')) {
                  return { results: entryRows };
                }
                if (sql.includes('FROM (')) {
                  // Range enumeration query
                  return { results: [] };
                }
                return { results: [] };
              },
              run: async () => ({ success: true })
            };
          }
        };
      }
    };
  }

  it('sums meals + per-type entries and UPSERTs the reconciled totals', async () => {
    const db = reconcileMock({
      mealTotals: { calories: 474, protein_g: 56.5, carbs_g: 10.8, fat_g: 22, fiber_g: 0 },
      entryRows: [
        { entry_type: 'protein',  total: 30 },
        { entry_type: 'water',    total: 500 },
        { entry_type: 'creatine', total: 5 }
      ]
    });

    const totals = await reconcileNutritionLog(db, 1, '2026-04-21');

    // Expect: 3 prepare()s — meals sum, entries group-by, upsert
    expect(db.calls.length).toBe(3);

    // Calories/carbs/fat/fiber come from meals only.
    expect(totals.calories).toBe(474);
    expect(totals.carbs_grams).toBe(10.8);
    expect(totals.fat_grams).toBe(22);
    expect(totals.fiber_grams).toBe(0);

    // Protein is sum of meals + protein entries (56.5 + 30 = 86.5).
    expect(totals.protein_grams).toBe(86.5);

    // Water and creatine come from entries only.
    expect(totals.water_ml).toBe(500);
    expect(totals.creatine_grams).toBe(5);

    // Verify the upsert uses excluded.* (overwrites, not adds).
    const upsert = db.calls[2];
    expect(upsert.sql).toMatch(/ON CONFLICT\(user_id, date\) DO UPDATE SET/);
    expect(upsert.sql).toMatch(/protein_grams\s+=\s+excluded\.protein_grams/);
    expect(upsert.params.slice(0, 2)).toEqual([1, '2026-04-21']);
  });

  it('handles days with meals only (no entries) correctly', async () => {
    const db = reconcileMock({
      mealTotals: { calories: 300, protein_g: 25, carbs_g: 40, fat_g: 10, fiber_g: 3 },
      entryRows: []
    });
    const totals = await reconcileNutritionLog(db, 1, '2026-04-21');
    expect(totals.protein_grams).toBe(25);
    expect(totals.water_ml).toBe(0);
    expect(totals.creatine_grams).toBe(0);
  });

  it('handles days with entries only (no meals) correctly', async () => {
    const db = reconcileMock({
      mealTotals: null, // no meals
      entryRows: [{ entry_type: 'protein', total: 40 }]
    });
    const totals = await reconcileNutritionLog(db, 1, '2026-04-21');
    expect(totals.calories).toBe(0);
    expect(totals.protein_grams).toBe(40);
    expect(totals.carbs_grams).toBe(0);
  });
});

describe('reconcileNutritionLogRange', () => {
  it('enumerates distinct dates from meals/entries/log then reconciles each', async () => {
    const dates = ['2026-04-20', '2026-04-21'];
    let enumerateCalled = false;
    const db = {
      calls: [],
      prepare(sql) {
        this.calls.push(sql);
        return {
          bind: () => ({
            first: async () => {
              if (sql.includes('FROM meals\n')) {
                // Per-date reconcile — return some macros
                return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
              }
              return null;
            },
            all: async () => {
              if (sql.includes('FROM (') && !enumerateCalled) {
                enumerateCalled = true;
                return { results: dates.map((d) => ({ date: d })) };
              }
              if (sql.includes('FROM nutrition_entries')) return { results: [] };
              return { results: [] };
            },
            run: async () => ({ success: true })
          })
        };
      }
    };

    const result = await reconcileNutritionLogRange(db, 1, '2026-04-15', '2026-04-21');
    expect(Object.keys(result)).toEqual(dates);
  });
});
