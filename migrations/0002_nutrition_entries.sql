-- Individual nutrition entries with timestamps
CREATE TABLE IF NOT EXISTS nutrition_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('protein', 'water', 'creatine')),
    amount REAL NOT NULL,
    unit TEXT NOT NULL,
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Try to add creatine_grams column to nutrition_log (will fail silently if already exists)
-- This is handled in the application code for backward compatibility

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_id ON nutrition_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_logged_at ON nutrition_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_type_date ON nutrition_entries(user_id, entry_type, date(logged_at));
