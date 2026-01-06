-- Remove duplicate exercises from the database
-- Keep the exercise with the lowest ID and update any references

-- First, update workout_exercises to point to the original (lowest ID) exercise
-- Then delete the duplicates

-- For each duplicate exercise name, we need to:
-- 1. Find all IDs with that name
-- 2. Update workout_exercises to use the minimum ID
-- 3. Delete all but the minimum ID

-- Update references for Bird Dog duplicates
UPDATE workout_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Bird Dog')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Bird Dog')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Bird Dog');

-- Update references for Mountain Climbers duplicates
UPDATE workout_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Mountain Climbers')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Mountain Climbers')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Mountain Climbers');

-- Update references for Jump Rope duplicates
UPDATE workout_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Jump Rope')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Jump Rope')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Jump Rope');

-- Update references for Chin-Up duplicates
UPDATE workout_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Chin-Up')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Chin-Up')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Chin-Up');

-- Update references for Pike Push-Up duplicates
UPDATE workout_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Pike Push-Up')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Pike Push-Up')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Pike Push-Up');

-- Update program_exercises references as well
UPDATE program_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Bird Dog')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Bird Dog')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Bird Dog');

UPDATE program_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Mountain Climbers')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Mountain Climbers')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Mountain Climbers');

UPDATE program_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Jump Rope')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Jump Rope')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Jump Rope');

UPDATE program_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Chin-Up')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Chin-Up')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Chin-Up');

UPDATE program_exercises 
SET exercise_id = (SELECT MIN(id) FROM exercises WHERE name = 'Pike Push-Up')
WHERE exercise_id IN (SELECT id FROM exercises WHERE name = 'Pike Push-Up')
AND exercise_id != (SELECT MIN(id) FROM exercises WHERE name = 'Pike Push-Up');

-- Now delete the duplicate exercises (keeping lowest ID)
DELETE FROM exercises WHERE name = 'Bird Dog' AND id != (SELECT MIN(id) FROM exercises WHERE name = 'Bird Dog');
DELETE FROM exercises WHERE name = 'Mountain Climbers' AND id != (SELECT MIN(id) FROM exercises WHERE name = 'Mountain Climbers');
DELETE FROM exercises WHERE name = 'Jump Rope' AND id != (SELECT MIN(id) FROM exercises WHERE name = 'Jump Rope');
DELETE FROM exercises WHERE name = 'Chin-Up' AND id != (SELECT MIN(id) FROM exercises WHERE name = 'Chin-Up');
DELETE FROM exercises WHERE name = 'Pike Push-Up' AND id != (SELECT MIN(id) FROM exercises WHERE name = 'Pike Push-Up');

-- Generic cleanup: Delete any other duplicates that might exist
-- This keeps the exercise with the lowest ID for each duplicate name
DELETE FROM exercises 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM exercises 
    GROUP BY name
);
