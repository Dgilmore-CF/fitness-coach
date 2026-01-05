-- Email report preferences table
CREATE TABLE IF NOT EXISTS email_report_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  weekly_report BOOLEAN DEFAULT 0,
  monthly_report BOOLEAN DEFAULT 0,
  yearly_report BOOLEAN DEFAULT 0,
  last_weekly_sent DATETIME,
  last_monthly_sent DATETIME,
  last_yearly_sent DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_report_prefs_user ON email_report_preferences(user_id);
