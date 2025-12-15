-- Add perceived_exertion column to workouts table
-- Stores the user's self-reported exertion level (1-10 scale) after completing a workout

ALTER TABLE workouts ADD COLUMN perceived_exertion INTEGER;
