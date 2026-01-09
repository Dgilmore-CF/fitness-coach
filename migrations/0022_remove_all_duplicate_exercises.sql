-- Comprehensive duplicate exercise removal
-- This migration finds ALL exercises with duplicate names and removes them,
-- keeping only the one with the lowest ID

-- Step 1: Update workout_exercises references to point to the minimum ID for each exercise name
UPDATE workout_exercises 
SET exercise_id = (
    SELECT MIN(e2.id) 
    FROM exercises e2 
    WHERE e2.name = (SELECT name FROM exercises WHERE id = workout_exercises.exercise_id)
)
WHERE exercise_id IN (
    SELECT e.id 
    FROM exercises e
    WHERE e.name IN (
        SELECT name FROM exercises GROUP BY name HAVING COUNT(*) > 1
    )
    AND e.id != (SELECT MIN(id) FROM exercises WHERE name = e.name)
);

-- Step 2: Update program_exercises references to point to the minimum ID for each exercise name
UPDATE program_exercises 
SET exercise_id = (
    SELECT MIN(e2.id) 
    FROM exercises e2 
    WHERE e2.name = (SELECT name FROM exercises WHERE id = program_exercises.exercise_id)
)
WHERE exercise_id IN (
    SELECT e.id 
    FROM exercises e
    WHERE e.name IN (
        SELECT name FROM exercises GROUP BY name HAVING COUNT(*) > 1
    )
    AND e.id != (SELECT MIN(id) FROM exercises WHERE name = e.name)
);

-- Step 3: Update ai_recommendations references
UPDATE ai_recommendations 
SET exercise_id = (
    SELECT MIN(e2.id) 
    FROM exercises e2 
    WHERE e2.name = (SELECT name FROM exercises WHERE id = ai_recommendations.exercise_id)
)
WHERE exercise_id IN (
    SELECT e.id 
    FROM exercises e
    WHERE e.name IN (
        SELECT name FROM exercises GROUP BY name HAVING COUNT(*) > 1
    )
    AND e.id != (SELECT MIN(id) FROM exercises WHERE name = e.name)
);

-- Step 4: Delete all duplicate exercises, keeping only the one with the lowest ID
DELETE FROM exercises 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM exercises 
    GROUP BY name
);
