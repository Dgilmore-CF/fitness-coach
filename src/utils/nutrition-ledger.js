/**
 * Nutrition ledger — single source of truth for maintaining consistency
 * between meal / entry rows and the daily `nutrition_log` aggregate that
 * feeds the progress rings on the Nutrition screen.
 *
 * Architectural rules this module enforces:
 *
 *   1. Every write that creates or increases a meal / entry must call
 *      `addToNutritionLog` with the same macros that were stored on the
 *      child row(s).
 *   2. Every delete / decrement must call `subtractFromNutritionLog`
 *      with the exact same macros, before the row is removed.
 *   3. `nutrition_log` columns are clamped at >= 0 by the subtract path
 *      (D1 has no native CHECK, so we do MAX(0, x - delta) in SQL).
 *   4. The `meals.calories / protein_g / carbs_g / fat_g / fiber_g`
 *      columns (added in migration 0028) are the canonical per-meal
 *      totals. Read them; don't re-SUM meal_foods on every read.
 *
 * Callers never need to touch `nutrition_log` directly — always go
 * through these helpers so nothing drifts.
 */

/**
 * Normalize an arbitrary macros-shaped object to the 5-field canonical
 * shape with numeric zeros where fields are missing/NaN. Rounds to 1
 * decimal for macros and whole numbers for calories so the display in
 * the rings and activity feed never shows 0.7293 g.
 */
export function normalizeMacros(m = {}) {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return {
    calories: Math.round(num(m.calories)),
    protein_g: Math.round(num(m.protein_g ?? m.protein_grams ?? m.protein) * 10) / 10,
    carbs_g: Math.round(num(m.carbs_g ?? m.carbs_grams ?? m.carbs) * 10) / 10,
    fat_g: Math.round(num(m.fat_g ?? m.fat_grams ?? m.fat) * 10) / 10,
    fiber_g: Math.round(num(m.fiber_g ?? m.fiber_grams ?? m.fiber) * 10) / 10
  };
}

/**
 * Sum a list of meal_foods (or any array of per-item macro objects) into
 * a single totals object.
 */
export function sumMacros(items = []) {
  const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const it of items) {
    if (!it) continue;
    totals.calories += Number(it.calories) || 0;
    totals.protein_g += Number(it.protein_g) || 0;
    totals.carbs_g += Number(it.carbs_g) || 0;
    totals.fat_g += Number(it.fat_g) || 0;
    totals.fiber_g += Number(it.fiber_g) || 0;
  }
  return normalizeMacros(totals);
}

/**
 * Overwrite the cached totals on a `meals` row. Pass any partial macros
 * object — missing fields are treated as 0.
 */
export async function setMealTotals(db, mealId, macros) {
  const m = normalizeMacros(macros);
  await db.prepare(
    `UPDATE meals
        SET calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, fiber_g = ?
      WHERE id = ?`
  ).bind(m.calories, m.protein_g, m.carbs_g, m.fat_g, m.fiber_g, mealId).run();
  return m;
}

/**
 * Recompute a meal's cached totals by summing its `meal_foods` rows.
 * Used after adding/removing ingredients when we don't have the delta
 * already computed in JS.
 */
export async function recomputeMealTotals(db, mealId) {
  const result = await db.prepare(
    `SELECT COALESCE(SUM(calories),  0) AS calories,
            COALESCE(SUM(protein_g), 0) AS protein_g,
            COALESCE(SUM(carbs_g),   0) AS carbs_g,
            COALESCE(SUM(fat_g),     0) AS fat_g
       FROM meal_foods
      WHERE meal_id = ?`
  ).bind(mealId).first();
  // fiber isn't tracked on meal_foods by design; preserve whatever is
  // already on the row so macro-only / recipe-URL meals don't lose fiber.
  const existing = await db.prepare(
    `SELECT fiber_g FROM meals WHERE id = ?`
  ).bind(mealId).first();
  const macros = {
    ...result,
    fiber_g: existing?.fiber_g || 0
  };
  return setMealTotals(db, mealId, macros);
}

/**
 * Add the given macros to `nutrition_log` for a user/date, creating the
 * row if it doesn't exist. Caller is expected to pass normalized macros
 * (use `normalizeMacros()` if in doubt).
 */
export async function addToNutritionLog(db, userId, date, macros) {
  const m = normalizeMacros(macros);
  if (!m.calories && !m.protein_g && !m.carbs_g && !m.fat_g && !m.fiber_g) {
    return m; // nothing to do; skip a pointless UPDATE
  }
  await db.prepare(
    `INSERT INTO nutrition_log
       (user_id, date, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) DO UPDATE SET
       calories      = COALESCE(calories,      0) + excluded.calories,
       protein_grams = COALESCE(protein_grams, 0) + excluded.protein_grams,
       carbs_grams   = COALESCE(carbs_grams,   0) + excluded.carbs_grams,
       fat_grams     = COALESCE(fat_grams,     0) + excluded.fat_grams,
       fiber_grams   = COALESCE(fiber_grams,   0) + excluded.fiber_grams,
       updated_at    = CURRENT_TIMESTAMP`
  ).bind(userId, date, m.calories, m.protein_g, m.carbs_g, m.fat_g, m.fiber_g).run();
  return m;
}

/**
 * Subtract macros from `nutrition_log` for a user/date, clamping at 0.
 * Safe to call even if the row doesn't exist (no-op).
 */
export async function subtractFromNutritionLog(db, userId, date, macros) {
  const m = normalizeMacros(macros);
  if (!m.calories && !m.protein_g && !m.carbs_g && !m.fat_g && !m.fiber_g) {
    return m;
  }
  await db.prepare(
    `UPDATE nutrition_log
        SET calories      = MAX(0, COALESCE(calories,      0) - ?),
            protein_grams = MAX(0, COALESCE(protein_grams, 0) - ?),
            carbs_grams   = MAX(0, COALESCE(carbs_grams,   0) - ?),
            fat_grams     = MAX(0, COALESCE(fat_grams,     0) - ?),
            fiber_grams   = MAX(0, COALESCE(fiber_grams,   0) - ?),
            updated_at    = CURRENT_TIMESTAMP
      WHERE user_id = ? AND date = ?`
  ).bind(m.calories, m.protein_g, m.carbs_g, m.fat_g, m.fiber_g, userId, date).run();
  return m;
}

/**
 * Map a nutrition_entries `entry_type` to the scalar nutrition_log column
 * the `amount` contributes to. Useful for single-column adjust/delete.
 */
export function entryColumnFor(entryType) {
  switch (entryType) {
    case 'protein':  return 'protein_grams';
    case 'water':    return 'water_ml';
    case 'creatine': return 'creatine_grams';
    default:         return null;
  }
}

/**
 * Add a scalar entry (protein/water/creatine) to nutrition_log.
 */
export async function addEntryToLog(db, userId, date, entryType, amount) {
  const column = entryColumnFor(entryType);
  if (!column) return;
  const n = Math.max(0, Number(amount) || 0);
  if (!n) return;
  await db.prepare(
    `INSERT INTO nutrition_log (user_id, date, ${column}, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) DO UPDATE SET
       ${column} = COALESCE(${column}, 0) + excluded.${column},
       updated_at = CURRENT_TIMESTAMP`
  ).bind(userId, date, n).run();
}

/**
 * Subtract a scalar entry from nutrition_log, clamping at 0.
 */
export async function subtractEntryFromLog(db, userId, date, entryType, amount) {
  const column = entryColumnFor(entryType);
  if (!column) return;
  const n = Math.max(0, Number(amount) || 0);
  if (!n) return;
  await db.prepare(
    `UPDATE nutrition_log
        SET ${column} = MAX(0, COALESCE(${column}, 0) - ?),
            updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND date = ?`
  ).bind(n, userId, date).run();
}
