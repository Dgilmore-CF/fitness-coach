-- Add creatine tracking to nutrition log
ALTER TABLE nutrition_log ADD COLUMN creatine_grams REAL DEFAULT 0;
