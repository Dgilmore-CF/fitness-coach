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

/**
 * Rebuild `nutrition_log` for a single (user, date) from the ground-truth
 * source rows: sum of `meals` macros + sum of `nutrition_entries` amounts
 * by type. Overwrites whatever was in `nutrition_log` for that date.
 *
 * Use when the log has drifted from the underlying rows (e.g. due to a
 * historical bug in the add/subtract path) or when you want a "recompute
 * from scratch" guarantee after a batch operation.
 *
 * Returns the freshly-computed totals.
 */
export async function reconcileNutritionLog(db, userId, date) {
  // Sum cached meal totals for the date.
  const meals = await db.prepare(
    `SELECT COALESCE(SUM(calories),  0) AS calories,
            COALESCE(SUM(protein_g), 0) AS protein_g,
            COALESCE(SUM(carbs_g),   0) AS carbs_g,
            COALESCE(SUM(fat_g),     0) AS fat_g,
            COALESCE(SUM(fiber_g),   0) AS fiber_g
       FROM meals
      WHERE user_id = ? AND date = ?`
  ).bind(userId, date).first();

  // Sum scalar entries by type for the date.
  const entries = await db.prepare(
    `SELECT entry_type, COALESCE(SUM(amount), 0) AS total
       FROM nutrition_entries
      WHERE user_id = ?
        AND date(logged_at) = ?
      GROUP BY entry_type`
  ).bind(userId, date).all();

  let proteinFromEntries = 0;
  let waterFromEntries = 0;
  let creatineFromEntries = 0;
  for (const row of (entries.results || [])) {
    if (row.entry_type === 'protein')  proteinFromEntries  = Number(row.total) || 0;
    if (row.entry_type === 'water')    waterFromEntries    = Number(row.total) || 0;
    if (row.entry_type === 'creatine') creatineFromEntries = Number(row.total) || 0;
  }

  const mealMacros = normalizeMacros({
    calories:  meals?.calories,
    protein_g: meals?.protein_g,
    carbs_g:   meals?.carbs_g,
    fat_g:     meals?.fat_g,
    fiber_g:   meals?.fiber_g
  });

  const totals = {
    calories:      mealMacros.calories,
    protein_grams: Math.round((mealMacros.protein_g + proteinFromEntries) * 10) / 10,
    carbs_grams:   mealMacros.carbs_g,
    fat_grams:     mealMacros.fat_g,
    fiber_grams:   mealMacros.fiber_g,
    water_ml:      Math.round(waterFromEntries),
    creatine_grams: Math.round(creatineFromEntries * 10) / 10
  };

  // UPSERT the reconciled row. If none exists yet, this creates it.
  await db.prepare(
    `INSERT INTO nutrition_log
       (user_id, date, calories, protein_grams, carbs_grams, fat_grams,
        fiber_grams, water_ml, creatine_grams, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) DO UPDATE SET
       calories        = excluded.calories,
       protein_grams   = excluded.protein_grams,
       carbs_grams     = excluded.carbs_grams,
       fat_grams       = excluded.fat_grams,
       fiber_grams     = excluded.fiber_grams,
       water_ml        = excluded.water_ml,
       creatine_grams  = excluded.creatine_grams,
       updated_at      = CURRENT_TIMESTAMP`
  ).bind(
    userId, date,
    totals.calories, totals.protein_grams, totals.carbs_grams,
    totals.fat_grams, totals.fiber_grams,
    totals.water_ml, totals.creatine_grams
  ).run();

  return totals;
}

/**
 * Reconcile nutrition_log for every date in a window (inclusive). Iterates
 * in JS so each date is fully independent — one bad row doesn't taint
 * the others. Returns an object keyed by date with the reconciled totals.
 */
export async function reconcileNutritionLogRange(db, userId, startDate, endDate) {
  // Enumerate candidate dates from the union of meals.date + entries.logged_at
  // (falling back to the raw range if the user asked for a specific window).
  const datesResult = await db.prepare(
    `SELECT DISTINCT date FROM (
       SELECT date AS date          FROM meals
        WHERE user_id = ? AND date >= ? AND date <= ?
       UNION
       SELECT date(logged_at) AS date FROM nutrition_entries
        WHERE user_id = ? AND date(logged_at) >= ? AND date(logged_at) <= ?
       UNION
       SELECT date AS date          FROM nutrition_log
        WHERE user_id = ? AND date >= ? AND date <= ?
     )
     ORDER BY date ASC`
  ).bind(
    userId, startDate, endDate,
    userId, startDate, endDate,
    userId, startDate, endDate
  ).all();

  const reconciled = {};
  for (const row of (datesResult.results || [])) {
    if (!row.date) continue;
    reconciled[row.date] = await reconcileNutritionLog(db, userId, row.date);
  }
  return reconciled;
}
