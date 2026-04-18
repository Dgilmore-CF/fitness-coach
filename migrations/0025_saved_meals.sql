-- Saved meals feature - users can save frequently used meals with their macros
-- This allows quick logging of common meals

CREATE TABLE IF NOT EXISTS saved_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  meal_type TEXT DEFAULT 'any', -- 'breakfast', 'lunch', 'dinner', 'snack', 'any'
  
  -- Total macros for the meal
  calories REAL DEFAULT 0,
  protein_g REAL DEFAULT 0,
  carbs_g REAL DEFAULT 0,
  fat_g REAL DEFAULT 0,
  fiber_g REAL DEFAULT 0,
  
  -- Recipe URL if from external source
  recipe_url TEXT,
  
  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used DATETIME,
  is_favorite INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_meals_user ON saved_meals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_meals_favorite ON saved_meals(user_id, is_favorite DESC, use_count DESC);

-- Foods within a saved meal
CREATE TABLE IF NOT EXISTS saved_meal_foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  saved_meal_id INTEGER NOT NULL,
  food_id INTEGER,
  
  -- Allow custom foods without food_id
  custom_name TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'serving',
  
  -- Macros for this item
  calories REAL DEFAULT 0,
  protein_g REAL DEFAULT 0,
  carbs_g REAL DEFAULT 0,
  fat_g REAL DEFAULT 0,
  
  FOREIGN KEY (saved_meal_id) REFERENCES saved_meals(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_meal_foods ON saved_meal_foods(saved_meal_id);
