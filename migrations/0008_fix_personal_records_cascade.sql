-- Fix personal_records foreign key to allow workout deletion
-- SQLite doesn't support ALTER FOREIGN KEY, so we need to recreate the table

-- Step 1: Create new table with correct foreign key
CREATE TABLE IF NOT EXISTS personal_records_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  record_type TEXT NOT NULL, -- '1rm', 'volume', 'reps', 'weight'
  record_value REAL NOT NULL,
  achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  workout_id INTEGER,
  previous_value REAL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL
);

-- Step 2: Copy data from old table
INSERT INTO personal_records_new (id, user_id, exercise_id, record_type, record_value, achieved_at, workout_id, previous_value)
SELECT id, user_id, exercise_id, record_type, record_value, achieved_at, workout_id, previous_value
FROM personal_records;

-- Step 3: Drop old table
DROP TABLE personal_records;

-- Step 4: Rename new table
ALTER TABLE personal_records_new RENAME TO personal_records;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_personal_records_user ON personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON personal_records(user_id, exercise_id);
