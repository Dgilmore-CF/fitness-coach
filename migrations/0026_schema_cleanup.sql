-- Phase 2 Schema Cleanup (v2 refactor)
--
-- This migration addresses several accumulated schema issues from earlier
-- migrations without breaking existing production data:
--
--   1. Missing indexes (common query patterns were doing full table scans)
--   2. UNIQUE constraint on exercises to prevent future duplicates
--   3. FK cascade fixes for user_achievements and workout_streaks (so that
--      deleting a user no longer fails on orphaned rows)
--   4. Drop the useless idx_programs_description index (indexing free-text
--      with equality/prefix is rarely useful)
--
-- Everything uses IF NOT EXISTS / IF EXISTS guards so it's idempotent.

-- =============================================================================
-- 1. Missing indexes
-- =============================================================================

-- Most common query: "give me this user's workouts sorted by date"
CREATE INDEX IF NOT EXISTS idx_workouts_user_start
  ON workouts(user_id, start_time DESC);

-- Filter completed workouts per user
CREATE INDEX IF NOT EXISTS idx_workouts_completed
  ON workouts(user_id, completed);

-- Reverse lookup: "which workouts used this exercise?" (used by dedup passes
-- in 0021/0022 and exercise-history queries)
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise
  ON workout_exercises(exercise_id);

-- Set ordering within an exercise
CREATE INDEX IF NOT EXISTS idx_sets_we_number
  ON sets(workout_exercise_id, set_number);

-- Exercise lookup by name (used by deduplication and search)
CREATE INDEX IF NOT EXISTS idx_exercises_name
  ON exercises(name);

-- Exercise filtering by muscle group (used by program builder, analytics)
CREATE INDEX IF NOT EXISTS idx_exercises_muscle
  ON exercises(muscle_group);

-- Exercise filtering by equipment
CREATE INDEX IF NOT EXISTS idx_exercises_equipment
  ON exercises(equipment);

-- Program day ordering
CREATE INDEX IF NOT EXISTS idx_program_days_program_num
  ON program_days(program_id, day_number);

-- Reverse lookup on program exercises
CREATE INDEX IF NOT EXISTS idx_program_exercises_exercise
  ON program_exercises(exercise_id);

-- Personal records by date (for "recent PRs" queries)
CREATE INDEX IF NOT EXISTS idx_prs_user_achieved
  ON personal_records(user_id, achieved_at DESC);

-- Nutrition log lookup by date
CREATE INDEX IF NOT EXISTS idx_nutrition_log_user_date
  ON nutrition_log(user_id, date DESC);

-- Nutrition entries by logged_at
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_logged
  ON nutrition_entries(user_id, logged_at DESC);

-- Meal lookup by date and type
CREATE INDEX IF NOT EXISTS idx_meals_user_date_type
  ON meals(user_id, date DESC, meal_type);

-- Reverse food lookup
CREATE INDEX IF NOT EXISTS idx_meal_foods_food
  ON meal_foods(food_id);

-- AI recommendations status lookups
CREATE INDEX IF NOT EXISTS idx_ai_recs_user_status
  ON ai_recommendations(user_id, status, created_at DESC);

-- AI coach conversations by user and recency
CREATE INDEX IF NOT EXISTS idx_ai_coach_user_created
  ON ai_coach_conversations(user_id, created_at DESC);

-- =============================================================================
-- 2. Drop unused / bad indexes
-- =============================================================================

-- idx_programs_description indexes a TEXT column for equality matches that
-- never happen (queries use LIKE on description, which wouldn't use this index)
DROP INDEX IF EXISTS idx_programs_description;

-- =============================================================================
-- 3. UNIQUE constraint on exercises(name, equipment)
-- =============================================================================
--
-- This prevents future duplicate exercises (migrations 0021 and 0022 had to
-- clean up duplicates that accumulated because there was no constraint).
-- Uses a unique INDEX (same effect, can be added without table recreation).
--
-- IMPORTANT: migrations 0021/0022 were supposed to clean up dupes but 0022
-- silently failed in CI (bad column ref). Remote DB still has ~114 duplicate
-- rows. Dedupe first, then add the unique index.

-- Step A: remap any references on duplicate rows to point at the canonical
-- (lowest-id) row for each (name, equipment) pair
UPDATE workout_exercises
SET exercise_id = (
  SELECT MIN(e2.id) FROM exercises e2
  WHERE e2.name = (SELECT name FROM exercises WHERE id = workout_exercises.exercise_id)
    AND IFNULL(e2.equipment,'') = IFNULL((SELECT equipment FROM exercises WHERE id = workout_exercises.exercise_id),'')
)
WHERE exercise_id IN (
  SELECT e.id FROM exercises e
  WHERE e.id != (SELECT MIN(id) FROM exercises WHERE name = e.name AND IFNULL(equipment,'') = IFNULL(e.equipment,''))
);

UPDATE program_exercises
SET exercise_id = (
  SELECT MIN(e2.id) FROM exercises e2
  WHERE e2.name = (SELECT name FROM exercises WHERE id = program_exercises.exercise_id)
    AND IFNULL(e2.equipment,'') = IFNULL((SELECT equipment FROM exercises WHERE id = program_exercises.exercise_id),'')
)
WHERE exercise_id IN (
  SELECT e.id FROM exercises e
  WHERE e.id != (SELECT MIN(id) FROM exercises WHERE name = e.name AND IFNULL(equipment,'') = IFNULL(e.equipment,''))
);

UPDATE personal_records
SET exercise_id = (
  SELECT MIN(e2.id) FROM exercises e2
  WHERE e2.name = (SELECT name FROM exercises WHERE id = personal_records.exercise_id)
    AND IFNULL(e2.equipment,'') = IFNULL((SELECT equipment FROM exercises WHERE id = personal_records.exercise_id),'')
)
WHERE exercise_id IN (
  SELECT e.id FROM exercises e
  WHERE e.id != (SELECT MIN(id) FROM exercises WHERE name = e.name AND IFNULL(equipment,'') = IFNULL(e.equipment,''))
);

-- Step B: delete duplicates (keeping the lowest id for each (name, equipment))
DELETE FROM exercises
WHERE id NOT IN (
  SELECT MIN(id) FROM exercises GROUP BY name, IFNULL(equipment,'')
);

-- Step C: add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS uniq_exercises_name_equipment
  ON exercises(name, equipment);

-- =============================================================================
-- 4. Fix FK cascades for user_achievements and workout_streaks
-- =============================================================================
--
-- The original 0005 migration created these tables without ON DELETE CASCADE
-- on their user_id FKs. This means deleting a user would fail if they had
-- achievements or streak records (or leave orphan rows, depending on the
-- FK enforcement setting).
--
-- SQLite doesn't support ALTER TABLE ... DROP CONSTRAINT, so we use the
-- standard recreate-and-copy pattern.

-- --- user_achievements --- (safe: drops any leftover _new from prior attempts)

DROP TABLE IF EXISTS user_achievements_new;

CREATE TABLE user_achievements_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_key TEXT NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  progress_value INTEGER DEFAULT 0,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_key) REFERENCES achievement_definitions(key) ON DELETE CASCADE,
  UNIQUE(user_id, achievement_key)
);

INSERT OR IGNORE INTO user_achievements_new
  (id, user_id, achievement_key, earned_at, progress_value, metadata)
  SELECT id, user_id, achievement_key, earned_at, progress_value, metadata
  FROM user_achievements;

DROP TABLE user_achievements;
ALTER TABLE user_achievements_new RENAME TO user_achievements;

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- --- workout_streaks ---

DROP TABLE IF EXISTS workout_streaks_new;

CREATE TABLE workout_streaks_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_workout_date DATE,
  streak_start_date DATE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

INSERT OR IGNORE INTO workout_streaks_new
  (id, user_id, current_streak, longest_streak, last_workout_date, streak_start_date, updated_at)
  SELECT id, user_id, current_streak, longest_streak, last_workout_date, streak_start_date, updated_at
  FROM workout_streaks;

DROP TABLE workout_streaks;
ALTER TABLE workout_streaks_new RENAME TO workout_streaks;

CREATE INDEX IF NOT EXISTS idx_workout_streaks_user ON workout_streaks(user_id);
