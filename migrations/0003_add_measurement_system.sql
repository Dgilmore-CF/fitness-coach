-- Migration number: 0003 	 2025-12-08T21:58:50.732Z
-- Add measurement system preference to users table

ALTER TABLE users ADD COLUMN measurement_system TEXT DEFAULT 'metric' CHECK(measurement_system IN ('metric', 'imperial'));
