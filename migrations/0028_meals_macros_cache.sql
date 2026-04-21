-- Migration 0028: Cache per-meal macro totals on the `meals` row.
--
-- Prior architecture: macros lived only on child `meal_foods` rows, so
-- reading a meal's totals required SUM over the join. That also meant
-- "macro-only" meals (saved-meal logs where saved_meal_foods was empty,
-- or /meals POSTs that sent `custom_macros` instead of a foods[] list)
-- had NO macro source at all — the meal existed on the Nutrition
-- screen as a row but the /activity feed showed "0 cal, 0g P, 0g C, 0g F".
--
-- After this migration:
--  - `meals.calories`, `meals.protein_g`, `meals.carbs_g`, `meals.fat_g`,
--    `meals.fiber_g` are the single source of truth for a meal's totals.
--  - Every endpoint that creates or mutates a meal maintains these columns.
--  - DELETE /meals/:id reads them to subtract from nutrition_log.
--  - GET /activity reads them directly (no N+1 rollup).
--
-- Backfill strategy: any meal whose totals aren't yet set gets the
-- SUM from its `meal_foods` children. Meals with no children stay at 0
-- (they were already 0 under the old rollup — this preserves that
-- behavior until a future write path populates them).

ALTER TABLE meals ADD COLUMN calories  REAL NOT NULL DEFAULT 0;
ALTER TABLE meals ADD COLUMN protein_g REAL NOT NULL DEFAULT 0;
ALTER TABLE meals ADD COLUMN carbs_g   REAL NOT NULL DEFAULT 0;
ALTER TABLE meals ADD COLUMN fat_g     REAL NOT NULL DEFAULT 0;
ALTER TABLE meals ADD COLUMN fiber_g   REAL NOT NULL DEFAULT 0;

-- Backfill from meal_foods. COALESCE handles meals with no food rows.
UPDATE meals SET
  calories  = COALESCE((SELECT SUM(mf.calories)  FROM meal_foods mf WHERE mf.meal_id = meals.id), 0),
  protein_g = COALESCE((SELECT SUM(mf.protein_g) FROM meal_foods mf WHERE mf.meal_id = meals.id), 0),
  carbs_g   = COALESCE((SELECT SUM(mf.carbs_g)   FROM meal_foods mf WHERE mf.meal_id = meals.id), 0),
  fat_g     = COALESCE((SELECT SUM(mf.fat_g)     FROM meal_foods mf WHERE mf.meal_id = meals.id), 0);
-- fiber is not tracked on meal_foods (by design), so leave at 0.

-- Helpful index for the /activity feed which filters by (user_id, date) and
-- orders by created_at. The existing (user_id, date, meal_type) index at
-- migration 0026 doesn't cover date-range scans with created_at ordering.
CREATE INDEX IF NOT EXISTS idx_meals_user_date_created
  ON meals(user_id, date, created_at DESC);
