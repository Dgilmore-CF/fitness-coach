-- AI Coach Conversations table to store chat history
CREATE TABLE IF NOT EXISTS ai_coach_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_conversations_user ON ai_coach_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_conversations_created ON ai_coach_conversations(user_id, created_at DESC);
