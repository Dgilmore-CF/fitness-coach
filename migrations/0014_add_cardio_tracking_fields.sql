-- Add cardio tracking fields to sets table
ALTER TABLE sets ADD COLUMN duration_seconds INTEGER;
ALTER TABLE sets ADD COLUMN calories_burned INTEGER;
ALTER TABLE sets ADD COLUMN distance_meters REAL;
ALTER TABLE sets ADD COLUMN avg_heart_rate INTEGER;
