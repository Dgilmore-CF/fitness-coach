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
 * PUSH vs PULL Exercise Definitions - Critical for proper program generation
 * PUSH exercises: Chest, Shoulders (front/side), Triceps - movements that push weight AWAY from body
 * PULL exercises: Back, Biceps, Rear Delts - movements that pull weight TOWARD body
 * LEGS: Quads, Hamstrings, Glutes, Calves - lower body movements
 * CARDIO: Heart rate zone based training - NO sets/reps, only duration and intensity
 */
const PUSH_MUSCLES = ['Chest', 'Shoulders', 'Triceps'];
const PULL_MUSCLES = ['Back', 'Biceps'];
const LEG_MUSCLES = ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'];

/**
 * Cardio day structure - completely different from strength training
 * Based on heart rate zones for effective cardiovascular training
 */
const CARDIO_DAY_TEMPLATE = {
  name: "Cardio & Conditioning",
  focus: "Cardiovascular fitness and endurance",
  muscle_groups: ["Cardio"],
  is_cardio_day: true,
  cardio_sessions: [
    {
      name: "Warm-up",
      duration_minutes: 5,
      heart_rate_zone: 1,
      zone_description: "50-60% max HR - Light activity, easy conversation",
      activity_type: "Light walking or cycling"
    },
    {
      name: "Main Cardio Session",
      duration_minutes: 20,
      heart_rate_zone: 3,
      zone_description: "70-80% max HR - Moderate intensity, can speak in short sentences",
      activity_type: "Rowing, cycling, elliptical, or treadmill"
    },
    {
      name: "Cool-down",
      duration_minutes: 5,
      heart_rate_zone: 1,
      zone_description: "50-60% max HR - Recovery pace",
      activity_type: "Light walking"
    }
  ]
};

/**
 * Heart rate zone reference
 * Zone 1: 50-60% max HR - Recovery/warm-up
 * Zone 2: 60-70% max HR - Fat burning, aerobic base
 * Zone 3: 70-80% max HR - Aerobic endurance
 * Zone 4: 80-90% max HR - Anaerobic threshold
 * Zone 5: 90-100% max HR - Maximum effort (intervals only)
 */
const HEART_RATE_ZONES = {
  1: { min: 50, max: 60, name: "Recovery", description: "Very light, can hold full conversation" },
  2: { min: 60, max: 70, name: "Fat Burn", description: "Light effort, comfortable pace" },
  3: { min: 70, max: 80, name: "Aerobic", description: "Moderate, can speak in sentences" },
  4: { min: 80, max: 90, name: "Threshold", description: "Hard, can only say a few words" },
  5: { min: 90, max: 100, name: "Maximum", description: "All-out effort, cannot speak" }
};

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
 * Define functionally equivalent exercises that should not appear together on the same day
 * Each array contains exercises that are essentially the same movement with different equipment
 */
const EQUIVALENT_EXERCISES = [
  ['Barbell Squat', 'Smith Machine Squat'],
  ['Barbell Bench Press', 'Smith Machine Bench Press'],
  ['Barbell Incline Press', 'Smith Machine Incline Press'],
  ['Barbell Overhead Press', 'Smith Machine Overhead Press'],
  ['Barbell Romanian Deadlift', 'Smith Machine Romanian Deadlift'],
  ['Barbell Deadlift', 'Smith Machine Deadlift'],
  ['Barbell Lunge', 'Smith Machine Lunge'],
  ['Barbell Hip Thrust', 'Smith Machine Hip Thrust'],
  ['Barbell Calf Raise', 'Smith Machine Calf Raise'],
  ['Barbell Row', 'Smith Machine Row'],
];

/**
 * Check if two exercises are functionally equivalent
 */
function areExercisesEquivalent(exercise1, exercise2) {
  for (const group of EQUIVALENT_EXERCISES) {
    if (group.includes(exercise1) && group.includes(exercise2)) {
      return true;
    }
  }
  return false;
}

/**
 * Remove duplicate/equivalent exercises from a day's exercise list
 * Keeps the first occurrence and removes equivalents
 */
function removeDuplicateExercises(dayExercises) {
  const result = [];
  for (const exercise of dayExercises) {
    const hasDuplicate = result.some(existing => 
      areExercisesEquivalent(existing.name, exercise.name)
    );
    if (!hasDuplicate) {
      result.push(exercise);
    }
  }
  return result;
}

/**
 * Generate workout program using hybrid AI approach:
 * 1. Few-shot learning with perfect examples
 * 2. Prompt chaining (structure first, then exercises)
 * 3. Validation at each step
 */
export async function generateProgram(ai, { user, days_per_week, goal, custom_instructions = '', exercises, available_equipment = [] }) {
  console.log(`\n🔧 Starting hybrid AI program generation (${days_per_week} days, ${goal})...`);
  if (custom_instructions) {
    console.log(`📝 Custom instructions: ${custom_instructions}`);
  }
  if (available_equipment.length > 0) {
    console.log(`🏋️ Available equipment: ${available_equipment.join(', ')}`);
  }
  
  // Track used exercises across all days to ensure variety
  const usedExerciseIds = new Set();
  
  // Filter and prioritize exercises based on available equipment
  let filteredExercises = exercises;
  if (available_equipment.length > 0) {
    // Prioritize exercises that use selected equipment
    // Sort: equipment-based first, then bodyweight
    filteredExercises = exercises.sort((a, b) => {
      const aHasEquipment = available_equipment.includes(a.equipment);
      const bHasEquipment = available_equipment.includes(b.equipment);
      const aIsBodyweight = a.equipment === 'Bodyweight';
      const bIsBodyweight = b.equipment === 'Bodyweight';
      
      if (aHasEquipment && !bHasEquipment) return -1;
      if (!aHasEquipment && bHasEquipment) return 1;
      if (aIsBodyweight && !bIsBodyweight) return 1; // Bodyweight last
      if (!aIsBodyweight && bIsBodyweight) return -1;
      return 0;
    });
    
    // Filter to only include exercises with available equipment OR bodyweight
    filteredExercises = filteredExercises.filter(ex => 
      available_equipment.includes(ex.equipment) || ex.equipment === 'Bodyweight'
    );
    console.log(`   Filtered to ${filteredExercises.length} exercises based on equipment`);
  }
  
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
      ai, days_per_week, goal, user, custom_instructions
    );
    
    if (!programData || !programData.days) {
      throw new Error('Failed to generate program structure');
    }
    
    console.log(`✅ Structure generated: ${programData.days.length} days`);
    
    // STEP 2: For each day, generate exercises with prompt chaining
    for (let i = 0; i < programData.days.length; i++) {
      const day = programData.days[i];
      console.log(`\n💪 Step 2.${i+1}: Generating content for ${day.name}...`);
      
      // Determine day type and filter exercises
      const dayType = determineDayType(day);
      console.log(`   Day type: ${dayType}`);
      
      // CARDIO DAYS: Use heart rate zone template instead of exercises
      if (dayType === 'CARDIO') {
        console.log(`   🏃 Cardio day detected - using heart rate zone template`);
        day.is_cardio_day = true;
        day.exercises = []; // No strength exercises
        day.cardio_sessions = generateCardioDaySessions(custom_instructions);
        console.log(`   ✅ ${day.name}: ${day.cardio_sessions.length} cardio sessions configured`);
        continue;
      }
      
      // Use filtered exercises (based on equipment) for this day type
      let validExercises = filterExercisesByDayType(
        dayType, filteredExercises, upperBodyMuscles, lowerBodyMuscles, day.include_core || false
      );
      
      // Remove already-used exercises to ensure variety across days
      const unusedExercises = validExercises.filter(ex => !usedExerciseIds.has(ex.id));
      console.log(`   Available exercises: ${validExercises.length}, Unused: ${unusedExercises.length} (include_core: ${day.include_core || false})`);
      
      // Prefer unused exercises, but fall back to all valid if needed
      if (unusedExercises.length >= 5) {
        validExercises = unusedExercises;
      }
      
      // If no exercises found for this day type, use broader set
      if (validExercises.length === 0) {
        console.log(`   ⚠️  No exercises for ${dayType}, using all exercises`);
        validExercises = filteredExercises.filter(ex => ex.muscle_group !== 'Cardio');
      }
      
      // Generate exercises for this specific day
      let dayExercises = [];
      try {
        dayExercises = await generateExercisesForDay(
          ai, day, validExercises, formatExerciseList, custom_instructions, usedExerciseIds
        );
        console.log(`   AI returned ${dayExercises ? dayExercises.length : 0} exercises`);
      } catch (aiError) {
        console.log(`   ⚠️  AI exercise generation failed: ${aiError.message}`);
        dayExercises = [];
      }
      
      // STEP 3: Validate and map exercises
      let validatedExercises = validateAndMapExercises(
        dayExercises || [], validExercises, day.name, dayType, usedExerciseIds
      );
      
      console.log(`   Validated ${validatedExercises.length} exercises`);
      
      // STEP 4: Remove duplicate/equivalent exercises (e.g., Barbell Squat + Smith Machine Squat)
      const beforeCount = validatedExercises.length;
      validatedExercises = removeDuplicateExercises(validatedExercises);
      if (validatedExercises.length < beforeCount) {
        console.log(`   🔄 Removed ${beforeCount - validatedExercises.length} duplicate/equivalent exercises`);
      }
      
      // Ensure we have 4-5 exercises - ALWAYS add fallbacks if needed
      if (validatedExercises.length < 4) {
        console.log(`   ⚠️  Only ${validatedExercises.length} exercises, adding fallbacks...`);
        addFallbackExercises(validatedExercises, validExercises, day.muscle_groups, usedExerciseIds);
        // Remove duplicates again after adding fallbacks
        validatedExercises = removeDuplicateExercises(validatedExercises);
      }
      
      // Track used exercises for variety across days
      validatedExercises.forEach(ex => usedExerciseIds.add(ex.exercise_id));
      
      // Final safety check - if still no exercises, force add from valid exercises
      if (validatedExercises.length === 0 && validExercises.length > 0) {
        console.log(`   🚨 Emergency fallback - adding exercises directly`);
        for (let i = 0; i < Math.min(5, validExercises.length); i++) {
          const ex = validExercises[i];
          if (!usedExerciseIds.has(ex.id)) {
            validatedExercises.push({
              name: ex.name,
              exercise_id: ex.id,
              sets: 3,
              reps: '10-12',
              rest_seconds: 90
            });
            usedExerciseIds.add(ex.id);
          }
        }
      }
      
      day.exercises = validatedExercises;
      console.log(`   ✅ ${day.name}: ${validatedExercises.length} exercises finalized`);
    }
    
    console.log('\n🎉 Program generation complete!\n');
    return programData;
    
  } catch (error) {
    console.error('❌ AI program generation failed:', error);
    console.log('   Falling back to template program...');
    return generateTemplateProgram(days_per_week, exercises);
  }
}

/**
 * Step 1: Generate program structure using AI with few-shot examples
 * The AI interprets user instructions directly - no regex parsing
 */
async function generateProgramStructureWithFewShot(ai, days_per_week, goal, user, custom_instructions = '') {
  console.log('🤖 AI generating program structure...');
  console.log(`   Days: ${days_per_week}, Goal: ${goal}`);
  console.log(`   User instructions: ${custom_instructions || '(none)'}`);
  
  const structurePrompt = `You are an expert fitness coach creating a workout program. Follow the user's instructions EXACTLY.

USER REQUEST:
- Days per week: ${days_per_week}
- Goal: ${goal}
${custom_instructions ? `- Special instructions: ${custom_instructions}` : ''}

DAY TYPE DEFINITIONS (use these muscle_groups exactly):
- PUSH DAY: muscle_groups: ["Chest", "Shoulders", "Triceps"]
- PULL DAY: muscle_groups: ["Back", "Biceps"]
- LEG DAY: muscle_groups: ["Legs", "Glutes", "Calves"]
- CARDIO DAY: muscle_groups: ["Cardio"], is_cardio_day: true

EXAMPLE 1 - User asks for "2 push, 2 pull, 1 leg day with cardio":
{
  "name": "2/2/1 Push/Pull/Legs + Cardio Program",
  "description": "A 6-day program with 2 push days, 2 pull days, 1 leg day, and cardio",
  "days": [
    {"day_number": 1, "name": "Push Day A", "focus": "Chest emphasis", "muscle_groups": ["Chest", "Shoulders", "Triceps"], "include_core": true},
    {"day_number": 2, "name": "Pull Day A", "focus": "Back width", "muscle_groups": ["Back", "Biceps"], "include_core": true},
    {"day_number": 3, "name": "Leg Day", "focus": "Quads and Hamstrings", "muscle_groups": ["Legs", "Glutes", "Calves"], "include_core": true},
    {"day_number": 4, "name": "Push Day B", "focus": "Shoulder emphasis", "muscle_groups": ["Chest", "Shoulders", "Triceps"], "include_core": true},
    {"day_number": 5, "name": "Pull Day B", "focus": "Back thickness", "muscle_groups": ["Back", "Biceps"], "include_core": true},
    {"day_number": 6, "name": "Cardio Day", "focus": "Conditioning", "muscle_groups": ["Cardio"], "is_cardio_day": true}
  ]
}

EXAMPLE 2 - User asks for "4 day upper/lower split":
{
  "name": "4-Day Upper/Lower Split",
  "description": "A 4-day program alternating upper and lower body",
  "days": [
    {"day_number": 1, "name": "Upper Body A", "focus": "Push emphasis", "muscle_groups": ["Chest", "Shoulders", "Triceps", "Back", "Biceps"]},
    {"day_number": 2, "name": "Lower Body A", "focus": "Quad emphasis", "muscle_groups": ["Legs", "Glutes", "Calves"]},
    {"day_number": 3, "name": "Upper Body B", "focus": "Pull emphasis", "muscle_groups": ["Back", "Biceps", "Chest", "Shoulders", "Triceps"]},
    {"day_number": 4, "name": "Lower Body B", "focus": "Hamstring emphasis", "muscle_groups": ["Legs", "Glutes", "Calves"]}
  ]
}

CRITICAL RULES:
1. Follow the user's day count and split EXACTLY as requested
2. If user says "2 push, 2 pull, 1 leg" - create exactly 2 push days, 2 pull days, 1 leg day
3. If user mentions "core" - set include_core: true on lifting days
4. If user mentions "cardio" - add a cardio day with is_cardio_day: true
5. Name the program to reflect the split (e.g., "2/2/1 Push/Pull/Legs")
6. Order days to alternate muscle groups when possible (push, pull, legs, push, pull)

Now create the program. Return ONLY valid JSON, no other text:`;
  
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt: structurePrompt,
    max_tokens: 2048,
    temperature: 0.3
  });
  
  console.log('📥 AI response received');
  
  const jsonMatch = response.response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`✅ Generated: ${parsed.name} with ${parsed.days?.length || 0} days`);
      parsed.days?.forEach(d => console.log(`   Day ${d.day_number}: ${d.name}`));
      return parsed;
    } catch (e) {
      console.error('❌ JSON parse error:', e);
    }
  }
  
  console.error('❌ Could not parse AI response');
  return null;
}

/**
 * Step 2: Generate exercises for a specific day
 * Implements evidence-based hypertrophy training principles:
 * - Movement pattern variety (no duplicate patterns)
 * - Optimal stimulus-to-fatigue ratio
 * - Mix of compound and isolation exercises
 * - Multiple angles for complete muscle development
 */
async function generateExercisesForDay(ai, day, validExercises, formatExerciseList, custom_instructions = '', usedExerciseIds = new Set()) {
  // Build day-specific exercise structure requirements
  const dayName = day.name.toLowerCase();
  let exerciseStructure = '';
  
  if (dayName.includes('push')) {
    exerciseStructure = `REQUIRED MOVEMENT PATTERN VARIETY (select ONE exercise per category):
1. HORIZONTAL PRESS (chest primary): Bench Press, Incline Press, or Dumbbell Press variation
2. VERTICAL PRESS (shoulders primary): Overhead Press or Arnold Press variation  
3. CHEST ISOLATION: Fly variation (Cable Fly, Pec Deck) - different angle than compound
4. LATERAL DELT: Lateral Raise variation (targets side delts specifically)
5. TRICEP ISOLATION: Pushdown, Extension, or Dip variation

FORBIDDEN: Do NOT select multiple exercises from the same movement pattern (e.g., no 2 bench variations)`;
  } else if (dayName.includes('pull')) {
    exerciseStructure = `REQUIRED MOVEMENT PATTERN VARIETY (select ONE exercise per category):
1. VERTICAL PULL (lat width): Pulldown, Pull-up, or Pullover variation
2. HORIZONTAL PULL (back thickness): Row variation (cable, barbell, or machine)
3. REAR DELT: Face Pull, Reverse Fly, or Rear Delt Row
4. BICEP ISOLATION (long head): Incline Curl or Drag Curl variation
5. BICEP ISOLATION (short head): Preacher Curl or Concentration Curl variation

FORBIDDEN: Do NOT select multiple row variations (e.g., no Cable Row AND Barbell Row AND Landmine Row)`;
  } else if (dayName.includes('leg')) {
    exerciseStructure = `REQUIRED MOVEMENT PATTERN VARIETY (select ONE exercise per category):
1. KNEE DOMINANT COMPOUND (quads): Squat, Leg Press, or Hack Squat variation
2. HIP DOMINANT COMPOUND (posterior chain): Deadlift, RDL, or Hip Hinge variation
3. SINGLE-LEG WORK: Lunge, Split Squat, or Step-up variation
4. QUAD ISOLATION: Leg Extension variation
5. HAMSTRING ISOLATION: Leg Curl variation (lying, seated, or standing)

OPTIONAL 6th: Calf Raise or Glute isolation if needed

FORBIDDEN: Do NOT select multiple squat variations or multiple deadlift variations`;
  } else {
    exerciseStructure = `REQUIRED: Select exercises that target different movement patterns and muscle angles.
FORBIDDEN: Do NOT select multiple exercises that work the exact same movement (e.g., no 3 row variations)`;
  }

  // Filter out already-used exercises
  const unusedExercises = validExercises.filter(ex => !usedExerciseIds.has(ex.id));
  const exerciseListToShow = unusedExercises.length >= 10 ? unusedExercises : validExercises;

  const exercisePrompt = `You are an expert hypertrophy coach creating a scientifically-optimized workout.

DAY: ${day.name}
FOCUS: ${day.focus}
TARGET MUSCLES: ${day.muscle_groups.join(', ')}

=== HYPERTROPHY TRAINING PRINCIPLES ===
Based on Schoenfeld's research and RP Strength methodology:
- Optimal rep range: 6-12 reps for compounds, 10-15 for isolation
- Volume: 10-20 sets per muscle group per week (split across sessions)
- Stimulus-to-Fatigue Ratio: Choose exercises that maximize growth with minimal fatigue
- Movement variety: Train muscles from MULTIPLE ANGLES for complete development
- Exercise order: Compounds first, isolation last

=== ${exerciseStructure} ===

AVAILABLE EXERCISES (use names EXACTLY as written):
${formatExerciseList(exerciseListToShow)}

${day.include_core ? 'Include 1 core exercise (Cable Woodchop, Hanging Leg Raise, Ab Wheel, etc. - NOT just Plank every time)' : ''}

Return ONLY a JSON array with 5-6 exercises following the movement pattern requirements above:
[{"name": "Exact Exercise Name", "sets": 4, "reps": "8-10", "rest_seconds": 120}]

SET/REP SCHEME:
- Primary compound: 4 sets, 6-8 reps, 150-180s rest
- Secondary compound: 3-4 sets, 8-10 reps, 120s rest
- Isolation: 3 sets, 10-15 reps, 60-90s rest`;
  
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt: exercisePrompt,
    max_tokens: 1024,
    temperature: 0.4  // Lower for more consistent adherence to rules
  });
  
  // Parse JSON array from response
  const jsonMatch = response.response.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const exercises = JSON.parse(jsonMatch[0]);
      console.log(`   📋 AI selected ${exercises.length} exercises for ${day.name}`);
      return exercises;
    } catch (e) {
      console.error('   ❌ Failed to parse exercise JSON');
    }
  }
  
  return [];
}

/**
 * Determine day type: PUSH, PULL, LEGS, CARDIO, or FULL
 */
function determineDayType(day) {
  const dayName = day.name.toLowerCase();
  const dayFocus = day.focus.toLowerCase();
  
  // Check for cardio first
  if (day.is_cardio_day || dayName.includes('cardio') || dayFocus.includes('cardio')) {
    return 'CARDIO';
  }
  
  // Check for specific push/pull/legs
  const isPush = dayName.includes('push') || 
    (dayFocus.includes('chest') && dayFocus.includes('tricep')) ||
    (day.muscle_groups && day.muscle_groups.some(mg => ['Chest', 'Triceps'].includes(mg)) && 
     !day.muscle_groups.some(mg => ['Back', 'Biceps'].includes(mg)));
  
  const isPull = dayName.includes('pull') || 
    (dayFocus.includes('back') && dayFocus.includes('bicep')) ||
    (day.muscle_groups && day.muscle_groups.some(mg => ['Back', 'Biceps'].includes(mg)) && 
     !day.muscle_groups.some(mg => ['Chest', 'Triceps'].includes(mg)));
  
  const isLegs = dayName.includes('leg') || dayName.includes('lower') ||
    (day.muscle_groups && day.muscle_groups.some(mg => 
      ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(mg)));
  
  if (isPush && !isPull && !isLegs) return 'PUSH';
  if (isPull && !isPush && !isLegs) return 'PULL';
  if (isLegs && !isPush && !isPull) return 'LEGS';
  
  // Fallback to general upper/lower
  const upperKeywords = ['upper', 'chest', 'back', 'shoulder', 'arm', 'bicep', 'tricep'];
  const lowerKeywords = ['lower', 'leg', 'quad', 'hamstring', 'glute', 'calf'];
  
  const hasUpper = upperKeywords.some(kw => dayName.includes(kw) || dayFocus.includes(kw));
  const hasLower = lowerKeywords.some(kw => dayName.includes(kw) || dayFocus.includes(kw));
  
  if (hasUpper && !hasLower) return 'UPPER';
  if (hasLower && !hasUpper) return 'LEGS';
  return 'FULL';
}

/**
 * Filter exercises based on day type - enforces strict push/pull/legs separation
 * includeCore parameter adds core exercises to the available pool
 */
function filterExercisesByDayType(dayType, exercises, upperBodyMuscles, lowerBodyMuscles, includeCore = false) {
  let filtered = [];
  
  // Strict push/pull/legs filtering
  if (dayType === 'PUSH') {
    filtered = exercises.filter(ex => PUSH_MUSCLES.includes(ex.muscle_group));
  } else if (dayType === 'PULL') {
    filtered = exercises.filter(ex => PULL_MUSCLES.includes(ex.muscle_group));
  } else if (dayType === 'LEGS') {
    filtered = exercises.filter(ex => LEG_MUSCLES.includes(ex.muscle_group));
  } else if (dayType === 'CARDIO') {
    return exercises.filter(ex => ex.muscle_group === 'Cardio');
  } else if (dayType === 'UPPER') {
    filtered = exercises.filter(ex => upperBodyMuscles.includes(ex.muscle_group));
  } else if (dayType === 'LOWER') {
    filtered = exercises.filter(ex => lowerBodyMuscles.includes(ex.muscle_group));
  } else {
    filtered = exercises; // Full body - all exercises allowed
  }
  
  // Add core exercises to the pool if requested
  if (includeCore) {
    const coreExercises = exercises.filter(ex => ex.muscle_group === 'Core');
    filtered = [...filtered, ...coreExercises];
  }
  
  return filtered;
}

/**
 * Validate and map AI-generated exercises to database
 * Considers already-used exercises across program for variety
 */
function validateAndMapExercises(aiExercises, validExercises, dayName, dayType, usedExerciseIds = new Set()) {
  const validated = [];
  const seenIds = new Set();
  
  for (const ex of aiExercises) {
    const matched = findExerciseByName(ex.name, validExercises);
    
    if (!matched) {
      console.log(`   ⚠️  Could not find: ${ex.name}`);
      continue;
    }
    
    if (seenIds.has(matched.id)) {
      console.log(`   ⚠️  Skipping duplicate in day: ${matched.name}`);
      continue;
    }
    
    // Check if already used in another day (warn but allow for muscle-specific exercises)
    if (usedExerciseIds.has(matched.id)) {
      console.log(`   ℹ️  Already used in program: ${matched.name} - allowing if needed`);
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
 * Considers already-used exercises across program for variety
 */
function addFallbackExercises(currentExercises, validExercises, muscleGroups, usedExerciseIds = new Set()) {
  if (!validExercises || validExercises.length === 0) {
    console.log(`   ⚠️  No valid exercises available for fallback`);
    return;
  }
  
  const seenIds = new Set(currentExercises.map(ex => ex.exercise_id));
  
  // Prefer exercises matching muscle groups that haven't been used in the program
  const preferred = muscleGroups && muscleGroups.length > 0 
    ? validExercises.filter(ex => 
        !seenIds.has(ex.id) &&
        !usedExerciseIds.has(ex.id) &&
        muscleGroups.some(mg => ex.muscle_group.toLowerCase().includes(mg.toLowerCase()))
      )
    : [];
  
  // Fall back to any unused exercises, then any exercises
  let candidates = preferred.length > 0 ? preferred : 
    validExercises.filter(ex => !seenIds.has(ex.id) && !usedExerciseIds.has(ex.id));
  
  if (candidates.length === 0) {
    candidates = validExercises.filter(ex => !seenIds.has(ex.id));
  }
  
  const needed = Math.min(5 - currentExercises.length, candidates.length);
  
  console.log(`   📋 Fallback: ${preferred.length} preferred, ${candidates.length} candidates, need ${needed}`);
  
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
 * Generate cardio day sessions based on user preferences
 * Returns heart rate zone-based cardio programming
 */
function generateCardioDaySessions(custom_instructions = '') {
  const instructions = custom_instructions.toLowerCase();
  
  // Determine cardio style from instructions
  const wantsHIIT = instructions.includes('hiit') || instructions.includes('interval');
  const wantsLISS = instructions.includes('liss') || instructions.includes('steady') || instructions.includes('low intensity');
  const wantsShort = instructions.includes('short') || instructions.includes('quick') || instructions.includes('15 min');
  const wantsLong = instructions.includes('long') || instructions.includes('45 min') || instructions.includes('60 min');
  
  // Base session configuration
  const sessions = [];
  
  // Always start with warm-up
  sessions.push({
    name: "Warm-up",
    duration_minutes: 5,
    heart_rate_zone: 1,
    zone_name: "Recovery",
    zone_description: "50-60% max HR - Light activity, can hold full conversation",
    activity_suggestions: "Light walking, slow cycling, or elliptical at easy pace"
  });
  
  if (wantsHIIT) {
    // High Intensity Interval Training
    sessions.push({
      name: "HIIT Intervals",
      duration_minutes: wantsShort ? 15 : 20,
      heart_rate_zone: 4,
      zone_name: "Threshold",
      zone_description: "80-90% max HR during work intervals, 60-70% during rest",
      activity_suggestions: "30 sec sprint / 30 sec rest intervals on rower, bike, or treadmill",
      interval_structure: "30s work / 30s rest for 15-20 rounds"
    });
  } else if (wantsLISS) {
    // Low Intensity Steady State
    sessions.push({
      name: "Steady State Cardio",
      duration_minutes: wantsLong ? 45 : 30,
      heart_rate_zone: 2,
      zone_name: "Fat Burn",
      zone_description: "60-70% max HR - Comfortable pace, can speak in sentences",
      activity_suggestions: "Brisk walking, light cycling, swimming, or elliptical"
    });
  } else {
    // Default: Moderate steady state
    sessions.push({
      name: "Main Cardio Session",
      duration_minutes: wantsShort ? 15 : (wantsLong ? 35 : 25),
      heart_rate_zone: 3,
      zone_name: "Aerobic",
      zone_description: "70-80% max HR - Moderate effort, can speak in short sentences",
      activity_suggestions: "Rowing, cycling, elliptical, stair climber, or treadmill jogging"
    });
  }
  
  // Always end with cool-down
  sessions.push({
    name: "Cool-down",
    duration_minutes: 5,
    heart_rate_zone: 1,
    zone_name: "Recovery",
    zone_description: "50-60% max HR - Gradually lower heart rate",
    activity_suggestions: "Slow walking, light stretching"
  });
  
  // Calculate total duration
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  sessions.total_duration_minutes = totalMinutes;
  
  return sessions;
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
 * Maps exercise names to database IDs
 */
function generateTemplateProgram(days_per_week, allExercises = []) {
  console.log(`📋 Generating template program for ${days_per_week} days with ${allExercises.length} exercises available`);
  
  // Helper to map exercise name to database exercise with ID
  const mapExerciseToDb = (exerciseName) => {
    if (!allExercises || allExercises.length === 0) return null;
    
    const normalized = exerciseName.toLowerCase().trim();
    
    // Try exact match first
    let match = allExercises.find(ex => ex.name.toLowerCase() === normalized);
    if (match) {
      return { name: match.name, exercise_id: match.id, sets: 3, reps: '10-12', rest_seconds: 90 };
    }
    
    // Try partial match
    match = allExercises.find(ex => 
      ex.name.toLowerCase().includes(normalized) || 
      normalized.includes(ex.name.toLowerCase())
    );
    if (match) {
      return { name: match.name, exercise_id: match.id, sets: 3, reps: '10-12', rest_seconds: 90 };
    }
    
    // Try word-based match
    const words = normalized.split(' ');
    match = allExercises.find(ex => {
      const exWords = ex.name.toLowerCase().split(' ');
      return words.some(w => w.length > 3 && exWords.some(ew => ew.includes(w) || w.includes(ew)));
    });
    if (match) {
      return { name: match.name, exercise_id: match.id, sets: 3, reps: '10-12', rest_seconds: 90 };
    }
    
    return null;
  };
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

  // Select appropriate template
  let selectedTemplate;
  if (templates[days_per_week]) {
    selectedTemplate = templates[days_per_week];
  } else if (days_per_week <= 3) {
    selectedTemplate = templates[3];
  } else if (days_per_week <= 4) {
    selectedTemplate = templates[4];
  } else {
    selectedTemplate = templates[5];
  }
  
  // Map all exercises to database IDs
  if (allExercises && allExercises.length > 0) {
    for (const day of selectedTemplate.days) {
      const mappedExercises = [];
      for (const ex of day.exercises) {
        const mapped = mapExerciseToDb(ex.name);
        if (mapped) {
          mapped.sets = ex.sets || 3;
          mapped.reps = ex.reps || '10-12';
          mapped.rest_seconds = ex.rest_seconds || 90;
          mappedExercises.push(mapped);
          console.log(`   ✅ Template mapped: ${ex.name} -> ${mapped.name} (id: ${mapped.exercise_id})`);
        } else {
          console.log(`   ⚠️  Template couldn't map: ${ex.name}`);
        }
      }
      
      // If we couldn't map any exercises, add fallbacks by muscle group
      if (mappedExercises.length === 0 && day.muscle_groups) {
        console.log(`   🔄 No exercises mapped for ${day.name}, adding fallbacks...`);
        const muscleExercises = allExercises.filter(ex => 
          day.muscle_groups.some(mg => ex.muscle_group.toLowerCase().includes(mg.toLowerCase()))
        );
        for (let i = 0; i < Math.min(5, muscleExercises.length); i++) {
          const ex = muscleExercises[i];
          mappedExercises.push({
            name: ex.name,
            exercise_id: ex.id,
            sets: 3,
            reps: '10-12',
            rest_seconds: 90
          });
          console.log(`   ✅ Fallback added: ${ex.name} (id: ${ex.id})`);
        }
      }
      
      day.exercises = mappedExercises;
    }
  }
  
  return selectedTemplate;
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
