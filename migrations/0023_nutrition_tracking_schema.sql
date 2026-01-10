-- Comprehensive nutrition tracking schema
-- Addresses: unit conversions, serving size variations, caching for offline/rate limiting

-- Foods table - cached from APIs and user-created
CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT,
  source TEXT NOT NULL DEFAULT 'user', -- 'usda', 'openfoodfacts', 'user'
  source_id TEXT, -- Original ID from the source API
  
  -- Base serving information (normalized to grams where possible)
  serving_size REAL NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  serving_description TEXT, -- "1 cup", "1 medium", etc.
  
  -- Macros per serving
  calories REAL DEFAULT 0,
  protein_g REAL DEFAULT 0,
  carbs_g REAL DEFAULT 0,
  fat_g REAL DEFAULT 0,
  fiber_g REAL DEFAULT 0,
  sugar_g REAL DEFAULT 0,
  
  -- Additional nutrients (optional)
  saturated_fat_g REAL,
  trans_fat_g REAL,
  cholesterol_mg REAL,
  sodium_mg REAL,
  potassium_mg REAL,
  vitamin_a_mcg REAL,
  vitamin_c_mg REAL,
  calcium_mg REAL,
  iron_mg REAL,
  
  -- Metadata
  verified INTEGER DEFAULT 0, -- 1 if from trusted source
  popularity_score INTEGER DEFAULT 0, -- For sorting search results
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(source, source_id)
);

-- Index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_source ON foods(source, source_id);

-- Unit conversions table - comprehensive measurement conversions
CREATE TABLE IF NOT EXISTS unit_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  food_category TEXT, -- NULL for generic, or specific category like 'meat', 'dairy', 'produce'
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  multiplier REAL NOT NULL, -- multiply from_unit value by this to get to_unit value
  notes TEXT
);

-- Common food density table (for volume to weight conversions)
CREATE TABLE IF NOT EXISTS food_densities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  food_name TEXT NOT NULL,
  food_category TEXT,
  grams_per_cup REAL, -- density reference
  grams_per_tbsp REAL,
  grams_per_oz REAL DEFAULT 28.35,
  notes TEXT
);

-- User's meals (logged food entries)
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'snack', -- 'breakfast', 'lunch', 'dinner', 'snack'
  name TEXT, -- Optional custom meal name
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

-- Individual food items within a meal
CREATE TABLE IF NOT EXISTS meal_foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  food_id INTEGER NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'serving', -- 'serving', 'g', 'oz', 'cup', 'tbsp', 'tsp', 'ml'
  
  -- Cached calculated values (for quick totals without joins)
  calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meal_foods_meal ON meal_foods(meal_id);

-- Meal plan templates
CREATE TABLE IF NOT EXISTS meal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meal plan items (template entries)
CREATE TABLE IF NOT EXISTS meal_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_plan_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
  meal_type TEXT NOT NULL,
  food_id INTEGER NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'serving',
  
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- User macro targets
CREATE TABLE IF NOT EXISTS macro_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  fiber_g INTEGER,
  sugar_g INTEGER,
  sodium_mg INTEGER,
  water_ml INTEGER,
  effective_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_macro_targets_user ON macro_targets(user_id, effective_date DESC);

-- Favorite/frequent foods for quick access
CREATE TABLE IF NOT EXISTS user_favorite_foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  food_id INTEGER NOT NULL,
  use_count INTEGER DEFAULT 1,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_favorite INTEGER DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
  UNIQUE(user_id, food_id)
);

-- Recent food searches cache (for offline and rate limiting)
CREATE TABLE IF NOT EXISTS food_search_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  results_json TEXT NOT NULL, -- JSON array of food objects
  source TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_food_search_cache_query ON food_search_cache(query, source);

-- Barcode lookup cache
CREATE TABLE IF NOT EXISTS barcode_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT NOT NULL UNIQUE,
  food_json TEXT, -- NULL if not found
  source TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_barcode_cache ON barcode_cache(barcode);
