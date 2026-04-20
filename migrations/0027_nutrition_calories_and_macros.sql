-- Add full macro tracking to nutrition_log (daily aggregates).
--
-- Previously nutrition_log only tracked protein_grams, water_ml, and
-- creatine_grams. With the new AI-powered nutrition coach + meal logger,
-- we need daily totals for calories, carbs, fat, and fiber too.
--
-- All columns default to 0 so existing rows stay valid without backfill.

ALTER TABLE nutrition_log ADD COLUMN calories REAL DEFAULT 0;
ALTER TABLE nutrition_log ADD COLUMN carbs_grams REAL DEFAULT 0;
ALTER TABLE nutrition_log ADD COLUMN fat_grams REAL DEFAULT 0;
ALTER TABLE nutrition_log ADD COLUMN fiber_grams REAL DEFAULT 0;

-- Add an index for quick daily lookups if not already present
CREATE INDEX IF NOT EXISTS idx_nutrition_log_user_date_desc
  ON nutrition_log(user_id, date DESC);
