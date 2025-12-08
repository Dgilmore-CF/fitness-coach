/**
 * AI service for program generation and recommendations using Cloudflare Workers AI
 */

/**
 * Calculate one rep max using Epley formula
 */
export function calculateOneRepMax(weight, reps) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Generate workout program using AI
 */
export async function generateProgram(ai, { user, days_per_week, goal, exercises }) {
  const equipmentList = 'Smith Machine, Olympic Bar and Plates, Functional Cable Trainer, Leg Extension/Curl Machine, Rower';
  
  const prompt = `You are a professional strength and conditioning coach specializing in hypertrophy training.

User Profile:
- Age: ${user.age || 'Not specified'}
- Height: ${user.height_cm ? user.height_cm + ' cm' : 'Not specified'}
- Weight: ${user.weight_kg ? user.weight_kg + ' kg' : 'Not specified'}
- Days per week: ${days_per_week}
- Goal: ${goal}

Available Equipment: ${equipmentList}

Create a ${days_per_week}-day hypertrophy-focused workout program. For each day, include:
1. Day name (e.g., "Upper Body Push")
2. Muscle groups targeted
3. EXACTLY 5 UNIQUE exercises from the available equipment - NO DUPLICATES ALLOWED
4. Each exercise should be DIFFERENT - do NOT use the same exercise twice in one day
5. Sets and reps (focus on hypertrophy range: 3-4 sets of 8-12 reps)
6. Rest periods (60-120 seconds for hypertrophy)

IMPORTANT RULES:
- Each day must have 5 different exercises
- Never repeat the same exercise within a single day
- Use variety in movement patterns (push/pull, compound/isolation)

Respond in valid JSON format only:
{
  "name": "Program name",
  "days": [
    {
      "day_number": 1,
      "name": "Day name",
      "focus": "Primary muscle groups",
      "muscle_groups": ["Chest", "Shoulders"],
      "exercises": [
        {
          "name": "Exercise name (must match available exercises)",
          "sets": 4,
          "reps": "8-12",
          "rest_seconds": 90
        }
      ]
    }
  ]
}`;

  try {
    const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
      prompt,
      max_tokens: 2048
    });

    let programData;
    
    // Parse AI response
    if (response.response) {
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        programData = JSON.parse(jsonMatch[0]);
      }
    }

    // Fallback to template if AI fails
    if (!programData) {
      programData = generateTemplateProgram(days_per_week);
    }

    // Map exercise names to IDs
    const exerciseMap = {};
    exercises.forEach(ex => {
      exerciseMap[ex.name.toLowerCase()] = ex;
    });

    // Match exercises to database and remove duplicates
    for (const day of programData.days) {
      const seenExerciseIds = new Set();
      const uniqueExercises = [];
      
      for (const ex of day.exercises) {
        const matchedExercise = findExerciseByName(ex.name, exercises);
        
        // Skip if we've already added this exercise to this day
        if (seenExerciseIds.has(matchedExercise.id)) {
          console.log(`Skipping duplicate exercise: ${matchedExercise.name}`);
          continue;
        }
        
        seenExerciseIds.add(matchedExercise.id);
        uniqueExercises.push({
          ...ex,
          exercise_id: matchedExercise.id,
          rest_seconds: ex.rest_seconds || 90
        });
      }
      
      // If we have fewer than 4 exercises after deduplication, add more
      if (uniqueExercises.length < 4) {
        const muscleGroups = day.muscle_groups || [];
        const additionalExercises = exercises.filter(e => 
          !seenExerciseIds.has(e.id) && 
          muscleGroups.some(mg => e.muscle_group.toLowerCase().includes(mg.toLowerCase()))
        ).slice(0, 5 - uniqueExercises.length);
        
        for (const addEx of additionalExercises) {
          uniqueExercises.push({
            name: addEx.name,
            sets: 3,
            reps: '10-12',
            exercise_id: addEx.id,
            rest_seconds: 90
          });
        }
      }
      
      day.exercises = uniqueExercises;
    }

    return programData;
  } catch (error) {
    console.error('AI program generation failed:', error);
    return generateTemplateProgram(days_per_week);
  }
}

/**
 * Find exercise by name (fuzzy matching)
 */
function findExerciseByName(name, exercises) {
  const normalized = name.toLowerCase().trim();
  
  // Exact match
  let match = exercises.find(ex => ex.name.toLowerCase() === normalized);
  if (match) return match;

  // Partial match
  match = exercises.find(ex => 
    ex.name.toLowerCase().includes(normalized) || 
    normalized.includes(ex.name.toLowerCase())
  );
  if (match) return match;

  // Default to first exercise
  return exercises[0];
}

/**
 * Generate template program (fallback)
 */
function generateTemplateProgram(days_per_week) {
  const templates = {
    3: {
      name: "3-Day Full Body Hypertrophy",
      days: [
        {
          day_number: 1,
          name: "Full Body A",
          focus: "Chest, Back, Legs",
          muscle_groups: ["Chest", "Back", "Legs"],
          exercises: [
            { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Barbell Bent Over Row", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Barbell Squat", sets: 4, reps: "8-12", rest_seconds: 120 },
            { name: "Cable Lat Pulldown", sets: 3, reps: "10-12", rest_seconds: 90 },
            { name: "Leg Extension", sets: 3, reps: "12-15", rest_seconds: 60 }
          ]
        },
        {
          day_number: 2,
          name: "Full Body B",
          focus: "Shoulders, Arms, Legs",
          muscle_groups: ["Shoulders", "Arms", "Legs"],
          exercises: [
            { name: "Smith Machine Overhead Press", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Smith Machine Romanian Deadlift", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Cable Tricep Pushdown", sets: 3, reps: "10-12", rest_seconds: 90 },
            { name: "Cable Bicep Curl", sets: 3, reps: "10-12", rest_seconds: 90 },
            { name: "Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 }
          ]
        },
        {
          day_number: 3,
          name: "Full Body C",
          focus: "Chest, Back, Legs",
          muscle_groups: ["Chest", "Back", "Legs"],
          exercises: [
            { name: "Smith Machine Incline Press", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Cable Seated Row", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Smith Machine Lunges", sets: 3, reps: "10-12", rest_seconds: 90 },
            { name: "Cable Face Pull", sets: 3, reps: "12-15", rest_seconds: 60 },
            { name: "Smith Machine Calf Raise", sets: 3, reps: "15-20", rest_seconds: 60 }
          ]
        }
      ]
    },
    4: {
      name: "4-Day Upper/Lower Hypertrophy",
      days: [
        {
          day_number: 1,
          name: "Upper Body Push",
          focus: "Chest, Shoulders, Triceps",
          muscle_groups: ["Chest", "Shoulders", "Triceps"],
          exercises: [
            { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Smith Machine Incline Press", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Smith Machine Overhead Press", sets: 3, reps: "8-12", rest_seconds: 90 },
            { name: "Cable Lateral Raise", sets: 3, reps: "12-15", rest_seconds: 60 },
            { name: "Cable Tricep Pushdown", sets: 3, reps: "10-12", rest_seconds: 60 }
          ]
        },
        {
          day_number: 2,
          name: "Lower Body",
          focus: "Quads, Hamstrings, Glutes",
          muscle_groups: ["Legs", "Glutes"],
          exercises: [
            { name: "Barbell Squat", sets: 4, reps: "8-10", rest_seconds: 180 },
            { name: "Smith Machine Romanian Deadlift", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Leg Extension", sets: 3, reps: "12-15", rest_seconds: 60 },
            { name: "Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 },
            { name: "Smith Machine Calf Raise", sets: 4, reps: "15-20", rest_seconds: 60 }
          ]
        },
        {
          day_number: 3,
          name: "Upper Body Pull",
          focus: "Back, Biceps",
          muscle_groups: ["Back", "Biceps"],
          exercises: [
            { name: "Barbell Deadlift", sets: 4, reps: "6-8", rest_seconds: 180 },
            { name: "Cable Lat Pulldown", sets: 4, reps: "8-10", rest_seconds: 90 },
            { name: "Cable Seated Row", sets: 4, reps: "8-10", rest_seconds: 90 },
            { name: "Cable Face Pull", sets: 3, reps: "12-15", rest_seconds: 60 },
            { name: "Barbell Bicep Curl", sets: 3, reps: "10-12", rest_seconds: 60 }
          ]
        },
        {
          day_number: 4,
          name: "Lower Body & Core",
          focus: "Legs, Glutes, Core",
          muscle_groups: ["Legs", "Glutes", "Core"],
          exercises: [
            { name: "Barbell Front Squat", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Smith Machine Lunges", sets: 3, reps: "10-12", rest_seconds: 90 },
            { name: "Single Leg Extension", sets: 3, reps: "12-15", rest_seconds: 60 },
            { name: "Single Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 },
            { name: "Cable Woodchop", sets: 3, reps: "12-15", rest_seconds: 60 }
          ]
        }
      ]
    },
    5: {
      name: "5-Day Body Part Split",
      days: [
        {
          day_number: 1,
          name: "Chest & Triceps",
          focus: "Chest, Triceps",
          muscle_groups: ["Chest", "Triceps"],
          exercises: [
            { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Smith Machine Incline Press", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Cable Chest Fly", sets: 3, reps: "12-15", rest_seconds: 60 },
            { name: "Cable Tricep Pushdown", sets: 3, reps: "10-12", rest_seconds: 60 },
            { name: "Cable Overhead Tricep Extension", sets: 3, reps: "10-12", rest_seconds: 60 }
          ]
        },
        {
          day_number: 2,
          name: "Back & Biceps",
          focus: "Back, Biceps",
          muscle_groups: ["Back", "Biceps"],
          exercises: [
            { name: "Barbell Deadlift", sets: 4, reps: "6-8", rest_seconds: 180 },
            { name: "Cable Lat Pulldown", sets: 4, reps: "8-10", rest_seconds: 90 },
            { name: "Cable Seated Row", sets: 4, reps: "8-10", rest_seconds: 90 },
            { name: "Barbell Bicep Curl", sets: 3, reps: "10-12", rest_seconds: 60 },
            { name: "Cable Bicep Curl", sets: 3, reps: "10-12", rest_seconds: 60 }
          ]
        },
        {
          day_number: 3,
          name: "Legs - Quads Focus",
          focus: "Quads, Calves",
          muscle_groups: ["Quads", "Calves"],
          exercises: [
            { name: "Barbell Squat", sets: 4, reps: "8-10", rest_seconds: 180 },
            { name: "Barbell Front Squat", sets: 3, reps: "8-12", rest_seconds: 120 },
            { name: "Leg Extension", sets: 4, reps: "12-15", rest_seconds: 60 },
            { name: "Smith Machine Lunges", sets: 3, reps: "10-12", rest_seconds: 90 },
            { name: "Smith Machine Calf Raise", sets: 4, reps: "15-20", rest_seconds: 60 }
          ]
        },
        {
          day_number: 4,
          name: "Shoulders",
          focus: "Shoulders, Traps",
          muscle_groups: ["Shoulders"],
          exercises: [
            { name: "Smith Machine Overhead Press", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Cable Lateral Raise", sets: 4, reps: "12-15", rest_seconds: 60 },
            { name: "Cable Face Pull", sets: 4, reps: "12-15", rest_seconds: 60 },
            { name: "Barbell Overhead Press", sets: 3, reps: "8-12", rest_seconds: 90 }
          ]
        },
        {
          day_number: 5,
          name: "Legs - Hamstrings Focus",
          focus: "Hamstrings, Glutes",
          muscle_groups: ["Hamstrings", "Glutes"],
          exercises: [
            { name: "Smith Machine Romanian Deadlift", sets: 4, reps: "8-10", rest_seconds: 120 },
            { name: "Leg Curl", sets: 4, reps: "12-15", rest_seconds: 60 },
            { name: "Barbell Hip Thrust", sets: 4, reps: "10-12", rest_seconds: 90 },
            { name: "Single Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 }
          ]
        }
      ]
    }
  };

  // Default to closest template
  if (templates[days_per_week]) {
    return templates[days_per_week];
  } else if (days_per_week <= 3) {
    return templates[3];
  } else if (days_per_week <= 4) {
    return templates[4];
  } else {
    return templates[5];
  }
}

/**
 * Generate AI recommendations for weight progression
 */
export async function getAIRecommendations(db, ai, userId, workoutId) {
  // Get workout data
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, userId).first();

  if (!workout || !workout.completed) {
    return [];
  }

  // Get exercises from this workout
  const exercises = await db.prepare(
    `SELECT we.*, e.name, e.is_unilateral
     FROM workout_exercises we
     JOIN exercises e ON we.exercise_id = e.id
     WHERE we.workout_id = ?`
  ).bind(workoutId).all();

  for (const exercise of exercises.results) {
    // Get sets for this exercise
    const sets = await db.prepare(
      'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number'
    ).bind(exercise.id).all();

    if (sets.results.length === 0) continue;

    // Get historical data for this exercise
    const history = await db.prepare(
      `SELECT s.weight_kg, s.reps, w.start_time
       FROM sets s
       JOIN workout_exercises we ON s.workout_exercise_id = we.id
       JOIN workouts w ON we.workout_id = w.id
       WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
       ORDER BY w.start_time DESC
       LIMIT 20`
    ).bind(exercise.exercise_id, userId).all();

    // Analyze progression
    const currentMaxWeight = Math.max(...sets.results.map(s => s.weight_kg));
    const currentAvgReps = sets.results.reduce((sum, s) => sum + s.reps, 0) / sets.results.length;

    // Check if user consistently hit high reps
    const allSetsAbove10Reps = sets.results.every(s => s.reps >= 10);
    const allSetsCompleted = sets.results.length >= 3;

    let recommendation = null;

    if (allSetsAbove10Reps && allSetsCompleted && currentAvgReps >= 12) {
      // Suggest weight increase
      const suggestedWeight = currentMaxWeight * 1.05; // 5% increase
      recommendation = {
        type: 'increase_weight',
        message: `Great work! You're consistently hitting 12+ reps. Time to increase the weight.`,
        current_weight: currentMaxWeight,
        suggested_weight: Math.round(suggestedWeight * 2) / 2, // Round to nearest 0.5kg
        reasoning: `Completing ${sets.results.length} sets with an average of ${Math.round(currentAvgReps)} reps indicates you're ready for more resistance.`
      };
    } else if (currentAvgReps < 6 && history.results.length > 0) {
      // Suggest weight decrease
      const suggestedWeight = currentMaxWeight * 0.90; // 10% decrease
      recommendation = {
        type: 'decrease_weight',
        message: `Consider reducing the weight to stay in the hypertrophy range (8-12 reps).`,
        current_weight: currentMaxWeight,
        suggested_weight: Math.round(suggestedWeight * 2) / 2,
        reasoning: `Average of ${Math.round(currentAvgReps)} reps is below the optimal hypertrophy range.`
      };
    } else if (sets.results.length < 3) {
      // Suggest more volume
      recommendation = {
        type: 'increase_volume',
        message: `Try adding more sets to maximize muscle growth.`,
        current_weight: currentMaxWeight,
        suggested_weight: currentMaxWeight,
        reasoning: `Only ${sets.results.length} sets performed. Aim for 3-4 sets for optimal hypertrophy.`
      };
    }

    if (recommendation) {
      // Save recommendation
      await db.prepare(
        `INSERT INTO ai_recommendations 
         (user_id, exercise_id, recommendation_type, recommendation, current_weight_kg, suggested_weight_kg, reasoning)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        userId,
        exercise.exercise_id,
        recommendation.type,
        recommendation.message,
        recommendation.current_weight,
        recommendation.suggested_weight,
        recommendation.reasoning
      ).run();
    }
  }
}
