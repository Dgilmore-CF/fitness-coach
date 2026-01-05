-- Add cardio day support to program_days table
ALTER TABLE program_days ADD COLUMN is_cardio_day BOOLEAN DEFAULT 0;

-- Create table for cardio sessions (replaces exercises for cardio days)
CREATE TABLE IF NOT EXISTS program_day_cardio_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_day_id INTEGER NOT NULL,
    order_index INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    heart_rate_zone INTEGER DEFAULT 3,
    zone_name TEXT,
    zone_description TEXT,
    activity_suggestions TEXT,
    interval_structure TEXT,
    FOREIGN KEY (program_day_id) REFERENCES program_days(id) ON DELETE CASCADE
);
