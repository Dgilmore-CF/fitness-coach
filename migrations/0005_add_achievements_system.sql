-- Achievements and Challenges System

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'consistency', 'strength', 'volume', 'milestone'
  tier TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
  requirement_value INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User earned achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_key TEXT NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  progress_value INTEGER DEFAULT 0,
  metadata TEXT, -- JSON for additional data
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_key) REFERENCES achievement_definitions(key),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON user_achievements(earned_at);

-- Workout streaks tracking
CREATE TABLE IF NOT EXISTS workout_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_workout_date DATE,
  streak_start_date DATE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_streaks_user ON workout_streaks(user_id);

-- Personal records tracking
CREATE TABLE IF NOT EXISTS personal_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  record_type TEXT NOT NULL, -- '1rm', 'volume', 'reps', 'weight'
  record_value REAL NOT NULL,
  achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  workout_id INTEGER,
  previous_value REAL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id),
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

CREATE INDEX IF NOT EXISTS idx_personal_records_user ON personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON personal_records(user_id, exercise_id);

-- Seed achievement definitions
INSERT OR IGNORE INTO achievement_definitions (key, name, description, icon, category, tier, requirement_value) VALUES
-- Consistency Achievements
('first_workout', 'Getting Started', 'Complete your first workout', '🎯', 'consistency', 'bronze', 1),
('week_streak_1', 'Week Warrior', 'Complete workouts for 1 consecutive week', '🔥', 'consistency', 'bronze', 1),
('week_streak_4', 'Monthly Momentum', 'Complete workouts for 4 consecutive weeks', '💪', 'consistency', 'silver', 4),
('week_streak_12', 'Quarter Champion', 'Complete workouts for 12 consecutive weeks', '⭐', 'consistency', 'gold', 12),
('week_streak_26', 'Half Year Hero', 'Complete workouts for 26 consecutive weeks', '👑', 'consistency', 'platinum', 26),
('week_streak_52', 'Year-Long Legend', 'Complete workouts for 52 consecutive weeks', '🏆', 'consistency', 'platinum', 52),
('workouts_10', 'Double Digits', 'Complete 10 total workouts', '💯', 'consistency', 'bronze', 10),
('workouts_50', 'Half Century', 'Complete 50 total workouts', '🎖️', 'consistency', 'silver', 50),
('workouts_100', 'Century Club', 'Complete 100 total workouts', '🥇', 'consistency', 'gold', 100),
('workouts_250', 'Elite Performer', 'Complete 250 total workouts', '👑', 'consistency', 'platinum', 250),

-- Strength Achievements (1RM Milestones)
('bench_press_100kg', 'Bench Press Beast', 'Hit 100kg (220lbs) 1RM on bench press', '🏋️', 'strength', 'bronze', 100),
('bench_press_140kg', 'Bench Press Master', 'Hit 140kg (308lbs) 1RM on bench press', '💪', 'strength', 'gold', 140),
('squat_140kg', 'Squat Strength', 'Hit 140kg (308lbs) 1RM on squat', '🦵', 'strength', 'bronze', 140),
('squat_180kg', 'Squat Master', 'Hit 180kg (396lbs) 1RM on squat', '👑', 'strength', 'gold', 180),
('deadlift_180kg', 'Deadlift Demon', 'Hit 180kg (396lbs) 1RM on deadlift', '🔥', 'strength', 'bronze', 180),
('deadlift_220kg', 'Deadlift Master', 'Hit 220kg (485lbs) 1RM on deadlift', '⚡', 'strength', 'gold', 220),

-- Personal Record Achievements
('first_pr', 'Record Breaker', 'Set your first personal record', '📈', 'milestone', 'bronze', 1),
('pr_10', 'PR Machine', 'Set 10 personal records', '🚀', 'milestone', 'silver', 10),
('pr_25', 'Progress Master', 'Set 25 personal records', '💫', 'milestone', 'gold', 25),
('pr_50', 'Unstoppable', 'Set 50 personal records', '⚡', 'milestone', 'platinum', 50),

-- Volume Achievements
('total_reps_1000', 'Thousand Reps', 'Complete 1,000 total reps', '💪', 'volume', 'bronze', 1000),
('total_reps_5000', 'Five Thousand Club', 'Complete 5,000 total reps', '🔥', 'volume', 'silver', 5000),
('total_reps_10000', 'Ten Thousand Legend', 'Complete 10,000 total reps', '👑', 'volume', 'gold', 10000),
('total_volume_50000kg', 'Volume Beast', 'Lift 50,000kg total volume', '🏋️', 'volume', 'silver', 50000),
('total_volume_100000kg', 'Volume Master', 'Lift 100,000kg total volume', '⚡', 'volume', 'gold', 100000),

-- Milestone Achievements
('program_complete', 'Program Graduate', 'Complete an entire workout program', '🎓', 'milestone', 'silver', 1),
('all_muscle_groups', 'Full Body Focus', 'Work all major muscle groups in a week', '💯', 'milestone', 'bronze', 1),
('perfect_week', 'Perfect Week', 'Complete all scheduled workouts in a week', '⭐', 'milestone', 'silver', 1);
