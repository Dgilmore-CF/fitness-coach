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
 * Perfect example programs for few-shot learning
 */
const EXAMPLE_PROGRAMS = {
  3: {
    name: "3-Day Full Body Split",
    days: [
      {
        day_number: 1,
        name: "Full Body A",
        focus: "Compound Movements - Chest, Back, Legs",
        muscle_groups: ["Chest", "Back", "Legs"],
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "8-10", rest_seconds: 120 },
          { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest_seconds: 120 },
          { name: "Barbell Deadlift", sets: 3, reps: "6-8", rest_seconds: 180 },
          { name: "Cable Lat Pulldown", sets: 3, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Lateral Raise", sets: 3, reps: "12-15", rest_seconds: 60 }
        ]
      },
      {
        day_number: 2,
        name: "Full Body B",
        focus: "Upper Focus - Push & Pull",
        muscle_groups: ["Shoulders", "Back", "Arms"],
        exercises: [
          { name: "Smith Machine Overhead Press", sets: 4, reps: "8-10", rest_seconds: 120 },
          { name: "Cable Seated Row", sets: 4, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Tricep Pushdown", sets: 3, reps: "10-12", rest_seconds: 60 },
          { name: "Cable Bicep Curl", sets: 3, reps: "10-12", rest_seconds: 60 },
          { name: "Cable Face Pull", sets: 3, reps: "12-15", rest_seconds: 60 }
        ]
      },
      {
        day_number: 3,
        name: "Full Body C",
        focus: "Lower Focus - Legs & Glutes",
        muscle_groups: ["Legs", "Glutes", "Hamstrings"],
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "8-12", rest_seconds: 120 },
          { name: "Smith Machine Romanian Deadlift", sets: 4, reps: "8-10", rest_seconds: 120 },
          { name: "Leg Extension", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Smith Machine Calf Raise", sets: 3, reps: "15-20", rest_seconds: 60 }
        ]
      }
    ]
  },
  4: {
    name: "4-Day Upper/Lower Split",
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
        focus: "Quads, Hamstrings, Glutes, Calves",
        muscle_groups: ["Legs", "Quads", "Hamstrings", "Glutes"],
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "8-10", rest_seconds: 120 },
          { name: "Smith Machine Romanian Deadlift", sets: 4, reps: "8-10", rest_seconds: 120 },
          { name: "Leg Extension", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Smith Machine Calf Raise", sets: 3, reps: "15-20", rest_seconds: 60 }
        ]
      },
      {
        day_number: 3,
        name: "Upper Body Pull",
        focus: "Back, Biceps, Rear Delts",
        muscle_groups: ["Back", "Biceps"],
        exercises: [
          { name: "Barbell Deadlift", sets: 4, reps: "6-8", rest_seconds: 180 },
          { name: "Cable Lat Pulldown", sets: 4, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Seated Row", sets: 3, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Face Pull", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Cable Bicep Curl", sets: 3, reps: "10-12", rest_seconds: 60 }
        ]
      },
      {
        day_number: 4,
        name: "Lower Body",
        focus: "Hamstrings, Glutes, Quads",
        muscle_groups: ["Hamstrings", "Glutes", "Legs"],
        exercises: [
          { name: "Smith Machine Squat", sets: 4, reps: "8-12", rest_seconds: 120 },
          { name: "Barbell Hip Thrust", sets: 4, reps: "10-12", rest_seconds: 90 },
          { name: "Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Single Leg Extension", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Smith Machine Calf Raise", sets: 3, reps: "15-20", rest_seconds: 60 }
        ]
      }
    ]
  },
  5: {
    name: "5-Day Push/Pull/Legs Split",
    days: [
      {
        day_number: 1,
        name: "Push (Chest, Shoulders, Triceps)",
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
        name: "Pull (Back, Biceps)",
        focus: "Back, Biceps, Rear Delts",
        muscle_groups: ["Back", "Biceps"],
        exercises: [
          { name: "Barbell Deadlift", sets: 4, reps: "6-8", rest_seconds: 180 },
          { name: "Cable Lat Pulldown", sets: 4, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Seated Row", sets: 3, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Face Pull", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Cable Bicep Curl", sets: 3, reps: "10-12", rest_seconds: 60 }
        ]
      },
      {
        day_number: 3,
        name: "Legs (Quads, Hamstrings, Glutes)",
        focus: "Quads, Hamstrings, Glutes, Calves",
        muscle_groups: ["Legs", "Quads", "Hamstrings", "Glutes"],
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "8-10", rest_seconds: 120 },
          { name: "Smith Machine Romanian Deadlift", sets: 4, reps: "8-10", rest_seconds: 120 },
          { name: "Leg Extension", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Smith Machine Calf Raise", sets: 3, reps: "15-20", rest_seconds: 60 }
        ]
      },
      {
        day_number: 4,
        name: "Upper Body (Volume)",
        focus: "Chest, Back, Shoulders",
        muscle_groups: ["Chest", "Back", "Shoulders"],
        exercises: [
          { name: "Smith Machine Bench Press", sets: 3, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Seated Row", sets: 3, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Chest Fly", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Cable Lat Pulldown", sets: 3, reps: "10-12", rest_seconds: 90 },
          { name: "Cable Lateral Raise", sets: 3, reps: "12-15", rest_seconds: 60 }
        ]
      },
      {
        day_number: 5,
        name: "Lower Body (Volume)",
        focus: "Legs, Glutes",
        muscle_groups: ["Legs", "Glutes", "Hamstrings"],
        exercises: [
          { name: "Smith Machine Squat", sets: 3, reps: "10-12", rest_seconds: 90 },
          { name: "Barbell Hip Thrust", sets: 4, reps: "10-12", rest_seconds: 90 },
          { name: "Single Leg Extension", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Single Leg Curl", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Smith Machine Calf Raise", sets: 3, reps: "15-20", rest_seconds: 60 }
        ]
      }
    ]
  }
};

/**
 * Generate workout program using hybrid AI approach:
 * 1. Few-shot learning with perfect examples
 * 2. Prompt chaining (structure first, then exercises)
 * 3. Validation at each step
 */
export async function generateProgram(ai, { user, days_per_week, goal, exercises }) {
  console.log(`\n🔧 Starting hybrid AI program generation (${days_per_week} days, ${goal})...`);
  
  // Categorize exercises by muscle group for validation
  const upperBodyMuscles = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'];
  const lowerBodyMuscles = ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'];
  
  const upperBodyExercises = exercises.filter(ex => 
    upperBodyMuscles.includes(ex.muscle_group)
  );
  const lowerBodyExercises = exercises.filter(ex => 
    lowerBodyMuscles.includes(ex.muscle_group)
  );
  
  // Format exercise list for AI
  const formatExerciseList = (exList) => {
    const grouped = {};
    exList.forEach(ex => {
      if (!grouped[ex.muscle_group]) grouped[ex.muscle_group] = [];
      grouped[ex.muscle_group].push(ex.name);
    });
    return Object.entries(grouped).map(([muscle, exs]) => 
      `${muscle}: ${exs.join(', ')}`
    ).join('\n');
  };
  
  try {
    // STEP 1: Generate program structure with few-shot learning
    console.log('📋 Step 1: Generating program structure with few-shot learning...');
    const programData = await generateProgramStructureWithFewShot(
      ai, days_per_week, goal, user
    );
    
    if (!programData || !programData.days) {
      throw new Error('Failed to generate program structure');
    }
    
    console.log(`✅ Structure generated: ${programData.days.length} days`);
    
    // STEP 2: For each day, generate exercises with prompt chaining
    for (let i = 0; i < programData.days.length; i++) {
      const day = programData.days[i];
      console.log(`\n💪 Step 2.${i+1}: Generating exercises for ${day.name}...`);
      
      // Determine day type and filter exercises
      const dayType = determineDayType(day);
      const validExercises = filterExercisesByDayType(
        dayType, exercises, upperBodyMuscles, lowerBodyMuscles
      );
      
      console.log(`   Day type: ${dayType}, Available exercises: ${validExercises.length}`);
      
      // Generate exercises for this specific day
      const dayExercises = await generateExercisesForDay(
        ai, day, validExercises, formatExerciseList
      );
      
      // STEP 3: Validate and map exercises
      const validatedExercises = validateAndMapExercises(
        dayExercises, validExercises, day.name, dayType
      );
      
      // Ensure we have 4-5 exercises
      if (validatedExercises.length < 4) {
        console.log(`   ⚠️  Only ${validatedExercises.length} exercises, adding fallbacks...`);
        addFallbackExercises(validatedExercises, validExercises, day.muscle_groups);
      }
      
      day.exercises = validatedExercises;
      console.log(`   ✅ ${day.name}: ${validatedExercises.length} exercises finalized`);
    }
    
    console.log('\n🎉 Program generation complete!\n');
    return programData;
    
  } catch (error) {
    console.error('❌ AI program generation failed:', error);
    console.log('   Falling back to template program...');
    return generateTemplateProgram(days_per_week);
  }
}

/**
 * Step 1: Generate program structure using few-shot learning
 */
async function generateProgramStructureWithFewShot(ai, days_per_week, goal, user) {
  // Get example program for few-shot learning
  const exampleProgram = EXAMPLE_PROGRAMS[days_per_week] || EXAMPLE_PROGRAMS[4];
  
  const structurePrompt = `You are an expert strength and conditioning coach. Study this perfect example of a ${days_per_week}-day program:

PERFECT EXAMPLE:
${JSON.stringify(exampleProgram, null, 2)}

Now create a similar ${days_per_week}-day ${goal} program structure for this user:
- Age: ${user.age || 'Not specified'}
- Gender: ${user.gender === 'male' ? 'Male' : user.gender === 'female' ? 'Female' : 'Not specified'}
- Weight: ${user.weight_kg ? user.weight_kg + ' kg' : 'Not specified'}
- Goal: ${goal}

${user.gender === 'female' ? 'Note: Consider typical female training preferences - may benefit from higher rep ranges, emphasis on glutes/legs, and appropriate exercise selection.' : user.gender === 'male' ? 'Note: Consider typical male training preferences - balanced upper/lower split, compound movements, progressive overload focus.' : ''}

IMPORTANT: Return ONLY the structure with name, description, and days array (WITHOUT exercises). Follow this exact format:
{
  "name": "Program name",
  "description": "A 2-3 sentence description explaining the program's approach, target audience, and expected outcomes. Be specific about training style and benefits.",
  "days": [
    {
      "day_number": 1,
      "name": "Day name (e.g., Upper Push, Lower Body, Full Body A)",
      "focus": "Primary muscle groups targeted",
      "muscle_groups": ["Muscle1", "Muscle2"]
    }
  ]
}

For ${days_per_week} days, use this split:
- 3 days: Full Body A, Full Body B, Full Body C
- 4 days: Upper Push, Lower, Upper Pull, Lower
- 5 days: Push, Pull, Legs, Upper, Lower
- 6 days: Push, Pull, Legs, Push, Pull, Legs

Return valid JSON only:`;
  
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt: structurePrompt,
    max_tokens: 1024,
    temperature: 0.3  // Lower temperature for consistency
  });
  
  // Parse JSON from response
  const jsonMatch = response.response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return null;
}

/**
 * Step 2: Generate exercises for a specific day
 */
async function generateExercisesForDay(ai, day, validExercises, formatExerciseList) {
  const exercisePrompt = `You are selecting exercises for: ${day.name}
Focus: ${day.focus}
Muscle Groups: ${day.muscle_groups.join(', ')}

AVAILABLE EXERCISES (you MUST choose from this list):
${formatExerciseList(validExercises)}

Select EXACTLY 5 exercises that:
1. Match the day's focus and muscle groups
2. Include 2-3 compound exercises (lower reps, longer rest)
3. Include 2-3 isolation exercises (higher reps, shorter rest)
4. Provide variety in movement patterns
5. Use exercise names EXACTLY as listed above

Return valid JSON array only:
[
  {"name": "Exercise name", "sets": 4, "reps": "8-10", "rest_seconds": 120},
  {"name": "Exercise name", "sets": 3, "reps": "10-12", "rest_seconds": 90}
]

Guidelines:
- Compound: 3-4 sets, 6-10 reps, 120-180s rest
- Isolation: 3 sets, 10-15 reps, 60-90s rest

Your selection:`;
  
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt: exercisePrompt,
    max_tokens: 512,
    temperature: 0.4
  });
  
  // Parse JSON array from response
  const jsonMatch = response.response.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return [];
}

/**
 * Determine if day is upper, lower, or full body
 */
function determineDayType(day) {
  const dayName = day.name.toLowerCase();
  const dayFocus = day.focus.toLowerCase();
  
  const upperKeywords = ['upper', 'push', 'pull', 'chest', 'back', 'shoulder', 'arm', 'bicep', 'tricep'];
  const lowerKeywords = ['lower', 'leg', 'quad', 'hamstring', 'glute', 'calf'];
  
  const hasUpper = upperKeywords.some(kw => dayName.includes(kw) || dayFocus.includes(kw));
  const hasLower = lowerKeywords.some(kw => dayName.includes(kw) || dayFocus.includes(kw));
  
  if (hasUpper && !hasLower) return 'UPPER';
  if (hasLower && !hasUpper) return 'LOWER';
  return 'FULL';
}

/**
 * Filter exercises based on day type
 */
function filterExercisesByDayType(dayType, exercises, upperBodyMuscles, lowerBodyMuscles) {
  if (dayType === 'UPPER') {
    return exercises.filter(ex => upperBodyMuscles.includes(ex.muscle_group));
  } else if (dayType === 'LOWER') {
    return exercises.filter(ex => lowerBodyMuscles.includes(ex.muscle_group));
  }
  return exercises; // Full body - all exercises allowed
}

/**
 * Validate and map AI-generated exercises to database
 */
function validateAndMapExercises(aiExercises, validExercises, dayName, dayType) {
  const validated = [];
  const seenIds = new Set();
  
  for (const ex of aiExercises) {
    const matched = findExerciseByName(ex.name, validExercises);
    
    if (!matched) {
      console.log(`   ⚠️  Could not find: ${ex.name}`);
      continue;
    }
    
    if (seenIds.has(matched.id)) {
      console.log(`   ⚠️  Skipping duplicate: ${matched.name}`);
      continue;
    }
    
    seenIds.add(matched.id);
    validated.push({
      name: matched.name,
      exercise_id: matched.id,
      sets: ex.sets || 3,
      reps: ex.reps || '10-12',
      rest_seconds: ex.rest_seconds || 90
    });
    
    console.log(`   ✅ Validated: ${matched.name} (${matched.muscle_group})`);
  }
  
  return validated;
}

/**
 * Add fallback exercises if needed
 */
function addFallbackExercises(currentExercises, validExercises, muscleGroups) {
  const seenIds = new Set(currentExercises.map(ex => ex.exercise_id));
  
  // Prefer exercises matching muscle groups
  const preferred = validExercises.filter(ex => 
    !seenIds.has(ex.id) &&
    muscleGroups.some(mg => ex.muscle_group.toLowerCase().includes(mg.toLowerCase()))
  );
  
  const candidates = preferred.length > 0 ? preferred : 
    validExercises.filter(ex => !seenIds.has(ex.id));
  
  const needed = Math.min(5 - currentExercises.length, candidates.length);
  
  for (let i = 0; i < needed; i++) {
    const ex = candidates[i];
    currentExercises.push({
      name: ex.name,
      exercise_id: ex.id,
      sets: 3,
      reps: '10-12',
      rest_seconds: 90
    });
    console.log(`   ✅ Added fallback: ${ex.name} (${ex.muscle_group})`);
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
