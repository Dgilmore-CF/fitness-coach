-- Drop old ai_recommendations table (from 0001) and recreate with new schema
-- The old table had: exercise_id, recommendation_type, current_weight_kg, suggested_weight_kg, accepted
-- The new table has: title, description, category, priority, status, action_items, etc.
DROP TABLE IF EXISTS ai_recommendations;

CREATE TABLE ai_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  action_items TEXT,
  reasoning TEXT,
  expected_outcome TEXT,
  auto_apply INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  applied_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority);
