/**
 * AI Coach Service - Comprehensive fitness coaching with deep data analysis
 * Provides intelligent, personalized recommendations based on complete workout history
 */

/**
 * Aggregate comprehensive user training data for AI analysis
 */
export async function aggregateTrainingData(db, userId, options = {}) {
  const { days = 90, includeExerciseDetails = true } = options;
  
  // Get user profile (only columns that exist in the schema)
  const user = await db.prepare(`
    SELECT id, name, age, height_cm, weight_kg, measurement_system, created_at
    FROM users WHERE id = ?
  `).bind(userId).first();

  // Get all completed workouts in period
  const workouts = await db.prepare(`
    SELECT w.id, w.program_day_id, w.start_time, w.end_time, 
           w.total_duration_seconds, w.total_weight_kg, w.perceived_exertion,
           pd.name as day_name, pd.focus as day_focus
    FROM workouts w
    LEFT JOIN program_days pd ON w.program_day_id = pd.id
    WHERE w.user_id = ? AND w.completed = 1 
      AND w.start_time >= datetime('now', '-' || ? || ' days')
    ORDER BY w.start_time DESC
  `).bind(userId, days).all();

  // Get workout frequency by week
  const weeklyFrequency = await db.prepare(`
    SELECT 
      strftime('%Y-%W', start_time) as week,
      COUNT(*) as workout_count,
      SUM(total_weight_kg) as total_volume,
      AVG(perceived_exertion) as avg_exertion,
      SUM(total_duration_seconds) as total_duration
    FROM workouts
    WHERE user_id = ? AND completed = 1 
      AND start_time >= datetime('now', '-' || ? || ' days')
    GROUP BY strftime('%Y-%W', start_time)
    ORDER BY week DESC
  `).bind(userId, days).all();

  // Get volume by muscle group
  const muscleGroupVolume = await db.prepare(`
    SELECT 
      e.muscle_group,
      COUNT(DISTINCT we.workout_id) as workout_count,
      COUNT(DISTINCT s.id) as total_sets,
      SUM(CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as total_volume,
      AVG(s.reps) as avg_reps
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN exercises e ON we.exercise_id = e.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND w.completed = 1
      AND w.start_time >= datetime('now', '-' || ? || ' days')
    GROUP BY e.muscle_group
    ORDER BY total_volume DESC
  `).bind(userId, days).all();

  // Get exercise progression data (for progressive overload analysis)
  const exerciseProgression = await db.prepare(`
    SELECT 
      e.id as exercise_id,
      e.name as exercise_name,
      e.muscle_group,
      e.is_unilateral,
      strftime('%Y-%W', w.start_time) as week,
      MAX(s.weight_kg) as max_weight,
      AVG(s.weight_kg) as avg_weight,
      MAX(s.one_rep_max_kg) as estimated_1rm,
      COUNT(s.id) as set_count,
      AVG(s.reps) as avg_reps,
      SUM(CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as volume
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN exercises e ON we.exercise_id = e.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND w.completed = 1
      AND w.start_time >= datetime('now', '-' || ? || ' days')
    GROUP BY e.id, strftime('%Y-%W', w.start_time)
    ORDER BY e.name, week
  `).bind(userId, days).all();

  // Get recent personal records
  const personalRecords = await db.prepare(`
    SELECT 
      e.name as exercise_name,
      e.muscle_group,
      MAX(s.weight_kg) as max_weight,
      MAX(s.one_rep_max_kg) as estimated_1rm,
      MAX(s.reps) as max_reps_at_weight
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN exercises e ON we.exercise_id = e.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND w.completed = 1
    GROUP BY e.id
    ORDER BY estimated_1rm DESC
    LIMIT 20
  `).bind(userId).all();

  // Get rest day patterns
  const restDayAnalysis = await db.prepare(`
    WITH workout_dates AS (
      SELECT DISTINCT date(start_time) as workout_date
      FROM workouts
      WHERE user_id = ? AND completed = 1
        AND start_time >= datetime('now', '-30 days')
    ),
    date_diffs AS (
      SELECT 
        workout_date,
        julianday(workout_date) - julianday(LAG(workout_date) OVER (ORDER BY workout_date)) as days_since_last
      FROM workout_dates
    )
    SELECT 
      AVG(days_since_last) as avg_rest_days,
      MIN(days_since_last) as min_rest_days,
      MAX(days_since_last) as max_rest_days
    FROM date_diffs
    WHERE days_since_last IS NOT NULL
  `).bind(userId).first();

  // Get perceived exertion trends
  const exertionTrend = await db.prepare(`
    SELECT 
      date(start_time) as date,
      perceived_exertion,
      total_weight_kg as volume
    FROM workouts
    WHERE user_id = ? AND completed = 1 
      AND perceived_exertion IS NOT NULL
      AND start_time >= datetime('now', '-30 days')
    ORDER BY start_time
  `).bind(userId).all();

  // Calculate training consistency
  const daysInPeriod = Math.min(days, 90);
  const totalWorkouts = workouts.results?.length || 0;
  const workoutsPerWeek = totalWorkouts > 0 ? totalWorkouts / (daysInPeriod / 7) : 0;

  // Detect plateaus (exercises with no weight increase in 3+ weeks)
  const plateauExercises = [];
  const exercisesByName = {};
  const progressionResults = exerciseProgression.results || [];
  
  for (const row of progressionResults) {
    if (!exercisesByName[row.exercise_name]) {
      exercisesByName[row.exercise_name] = [];
    }
    exercisesByName[row.exercise_name].push(row);
  }

  for (const [exerciseName, weeks] of Object.entries(exercisesByName)) {
    if (weeks.length >= 3) {
      const sortedWeeks = weeks.sort((a, b) => a.week.localeCompare(b.week));
      const recentWeeks = sortedWeeks.slice(-4);
      
      if (recentWeeks.length >= 3) {
        const firstWeight = recentWeeks[0].max_weight;
        const lastWeight = recentWeeks[recentWeeks.length - 1].max_weight;
        const weightChange = ((lastWeight - firstWeight) / firstWeight) * 100;
        
        if (Math.abs(weightChange) < 2.5) { // Less than 2.5% change = plateau
          plateauExercises.push({
            exercise_name: exerciseName,
            weeks_at_plateau: recentWeeks.length,
            current_weight: lastWeight,
            muscle_group: recentWeeks[0].muscle_group
          });
        }
      }
    }
  }

  // Calculate summary stats with null safety
  const workoutResults = workouts.results || [];
  const totalVolume = workoutResults.reduce((sum, w) => sum + (w.total_weight_kg || 0), 0);
  const totalDuration = workoutResults.reduce((sum, w) => sum + (w.total_duration_seconds || 0), 0);
  const workoutsWithExertion = workoutResults.filter(w => w.perceived_exertion);
  const avgExertion = workoutsWithExertion.length > 0 
    ? Math.round(workoutsWithExertion.reduce((sum, w) => sum + w.perceived_exertion, 0) / workoutsWithExertion.length * 10) / 10 
    : null;

  return {
    user: {
      id: user?.id,
      name: user?.name,
      age: user?.age,
      height_cm: user?.height_cm,
      weight_kg: user?.weight_kg,
      measurement_system: user?.measurement_system,
      member_since: user?.created_at
    },
    summary: {
      period_days: daysInPeriod,
      total_workouts: totalWorkouts,
      workouts_per_week: Math.round(workoutsPerWeek * 10) / 10,
      total_volume_kg: totalVolume,
      total_duration_minutes: Math.round(totalDuration / 60),
      avg_workout_duration_minutes: totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts / 60) : 0,
      avg_perceived_exertion: avgExertion
    },
    weeklyTrends: weeklyFrequency.results || [],
    muscleGroupVolume: muscleGroupVolume.results || [],
    exerciseProgression: exerciseProgression.results || [],
    personalRecords: personalRecords.results || [],
    restPatterns: restDayAnalysis || {},
    exertionTrend: exertionTrend.results || [],
    plateauExercises,
    recentWorkouts: workoutResults.slice(0, 10)
  };
}

/**
 * Build a rich context prompt for AI analysis
 */
export function buildCoachingPrompt(trainingData, analysisType = 'comprehensive') {
  const { user, summary, weeklyTrends, muscleGroupVolume, exerciseProgression, 
          personalRecords, restPatterns, plateauExercises } = trainingData;

  const goalDescriptions = {
    'muscle_gain': 'building muscle mass and size (hypertrophy)',
    'strength': 'increasing maximal strength and power',
    'weight_loss': 'losing fat while preserving muscle',
    'general_fitness': 'overall fitness and health',
    'endurance': 'muscular endurance and cardiovascular fitness'
  };

  const experienceDescriptions = {
    'beginner': 'beginner (less than 1 year of consistent training)',
    'intermediate': 'intermediate (1-3 years of consistent training)',
    'advanced': 'advanced (3+ years of consistent training)'
  };

  // Build muscle group analysis
  const muscleGroupAnalysis = muscleGroupVolume.map(mg => {
    return `  - ${mg.muscle_group}: ${mg.total_sets} sets, ${Math.round(mg.total_volume)} kg volume, ${mg.workout_count} workouts`;
  }).join('\n');

  // Build exercise progression analysis
  const exercisesByMuscle = {};
  for (const ex of exerciseProgression) {
    if (!exercisesByMuscle[ex.muscle_group]) {
      exercisesByMuscle[ex.muscle_group] = {};
    }
    if (!exercisesByMuscle[ex.muscle_group][ex.exercise_name]) {
      exercisesByMuscle[ex.muscle_group][ex.exercise_name] = [];
    }
    exercisesByMuscle[ex.muscle_group][ex.exercise_name].push(ex);
  }

  let progressionSummary = '';
  for (const [muscle, exercises] of Object.entries(exercisesByMuscle)) {
    progressionSummary += `\n${muscle}:\n`;
    for (const [exerciseName, weeks] of Object.entries(exercises)) {
      const sortedWeeks = weeks.sort((a, b) => a.week.localeCompare(b.week));
      if (sortedWeeks.length >= 2) {
        const first = sortedWeeks[0];
        const last = sortedWeeks[sortedWeeks.length - 1];
        const weightChange = last.max_weight - first.max_weight;
        const changePercent = ((weightChange / first.max_weight) * 100).toFixed(1);
        progressionSummary += `  - ${exerciseName}: ${first.max_weight}kg → ${last.max_weight}kg (${weightChange >= 0 ? '+' : ''}${changePercent}%) over ${sortedWeeks.length} weeks\n`;
      }
    }
  }

  // Build plateau warning
  let plateauWarning = '';
  if (plateauExercises.length > 0) {
    plateauWarning = `\n⚠️ PLATEAU DETECTED on these exercises (no progress in 3+ weeks):\n`;
    plateauExercises.forEach(p => {
      plateauWarning += `  - ${p.exercise_name} (${p.muscle_group}): stuck at ${p.current_weight}kg for ${p.weeks_at_plateau} weeks\n`;
    });
  }

  // Build top PRs
  const topPRs = personalRecords.slice(0, 10).map(pr => 
    `  - ${pr.exercise_name}: ${pr.max_weight}kg (Est. 1RM: ${Math.round(pr.estimated_1rm)}kg)`
  ).join('\n');

  // Weekly trend analysis
  let weeklyTrendAnalysis = '';
  if (weeklyTrends.length >= 2) {
    const recent = weeklyTrends[0];
    const previous = weeklyTrends[1];
    const volumeChange = ((recent.total_volume - previous.total_volume) / previous.total_volume * 100).toFixed(1);
    weeklyTrendAnalysis = `
Weekly Trend (Last Week vs Previous):
  - Workouts: ${recent.workout_count} vs ${previous.workout_count}
  - Volume: ${Math.round(recent.total_volume)}kg vs ${Math.round(previous.total_volume)}kg (${volumeChange >= 0 ? '+' : ''}${volumeChange}%)
  - Avg Exertion: ${recent.avg_exertion?.toFixed(1) || 'N/A'} vs ${previous.avg_exertion?.toFixed(1) || 'N/A'}`;
  }

  const systemPrompt = `You are an expert strength and conditioning coach with deep knowledge of exercise science, progressive overload, periodization, and injury prevention. You provide personalized, actionable advice based on data analysis.

Your coaching style:
- Be direct and specific, not generic
- Give exact numbers when recommending weight changes
- Explain the reasoning behind recommendations
- Prioritize safety and sustainable progress
- Consider the user's stated goals and experience level
- Use the data to identify patterns and opportunities`;

  const userPrompt = `# CLIENT PROFILE
Name: ${user.name || 'User'}
Age: ${user.age || 'Not specified'}
Body Weight: ${user.weight_kg ? `${user.weight_kg}kg` : 'Not specified'}
Height: ${user.height_cm ? `${user.height_cm}cm` : 'Not specified'}

# TRAINING SUMMARY (Last ${summary.period_days} Days)
- Total Workouts: ${summary.total_workouts}
- Training Frequency: ${summary.workouts_per_week} workouts/week
- Total Volume: ${Math.round(summary.total_volume_kg).toLocaleString()}kg lifted
- Avg Workout Duration: ${summary.avg_workout_duration_minutes} minutes
- Avg Perceived Exertion: ${summary.avg_perceived_exertion || 'Not tracked'}/10
- Avg Rest Between Workouts: ${restPatterns?.avg_rest_days?.toFixed(1) || 'N/A'} days
${weeklyTrendAnalysis}

# MUSCLE GROUP VOLUME DISTRIBUTION
${muscleGroupAnalysis}

# EXERCISE PROGRESSION (Weight Changes Over Time)
${progressionSummary}
${plateauWarning}

# CURRENT PERSONAL RECORDS (Top 10)
${topPRs}

Based on this comprehensive training data, provide your expert coaching analysis and recommendations.`;

  return { systemPrompt, userPrompt };
}

/**
 * Generate AI coaching analysis
 */
export async function generateCoachingAnalysis(db, ai, userId, analysisType = 'comprehensive') {
  // Aggregate all training data
  const trainingData = await aggregateTrainingData(db, userId, { days: 90 });
  
  if (trainingData.summary.total_workouts < 3) {
    return {
      success: false,
      message: 'Need at least 3 completed workouts for meaningful analysis',
      recommendations: []
    };
  }

  // Build the coaching prompt
  const { systemPrompt, userPrompt } = buildCoachingPrompt(trainingData, analysisType);

  // Define what we want from the AI based on analysis type
  let responseFormat = '';
  
  if (analysisType === 'comprehensive') {
    responseFormat = `
Provide your analysis in the following JSON format:
{
  "overall_assessment": "2-3 sentence summary of their training status",
  "strengths": ["What they're doing well - be specific"],
  "areas_for_improvement": ["What needs work - be specific"],
  "recommendations": [
    {
      "title": "Specific, actionable title",
      "category": "progressive_overload|volume|recovery|muscle_balance|technique|nutrition|plateau_breaking",
      "priority": "high|medium|low",
      "description": "Detailed explanation with specific numbers",
      "action_steps": ["Step 1 with exact details", "Step 2 with exact details"],
      "expected_outcome": "What will improve and by how much",
      "timeframe": "When they should see results"
    }
  ],
  "next_workout_tips": ["Specific tip for their next session"],
  "weekly_focus": "One thing to focus on this week"
}

IMPORTANT: 
- Be SPECIFIC with numbers (e.g., "increase bench press from 75kg to 77.5kg" not "increase weight")
- Reference their ACTUAL exercises and weights from the data
- Limit to 3-5 high-quality recommendations
- Prioritize based on building strength and muscle while staying healthy`;
  } else if (analysisType === 'plateau_breaking') {
    responseFormat = `
Focus specifically on breaking through the plateaus identified. Provide analysis in JSON format:
{
  "plateau_analysis": "Why these plateaus are occurring",
  "recommendations": [
    {
      "exercise": "Exercise name",
      "current_weight": 0,
      "strategy": "deload|intensity_technique|volume_change|exercise_variation",
      "specific_plan": "Exact protocol to follow",
      "duration": "How long to try this",
      "expected_breakthrough": "Target weight after protocol"
    }
  ]
}`;
  } else if (analysisType === 'workout_preview') {
    responseFormat = `
Based on their recent training, provide pre-workout guidance in JSON format:
{
  "readiness_assessment": "How recovered they likely are",
  "today_focus": "What to prioritize today",
  "weight_suggestions": [
    {
      "exercise": "Exercise name",
      "suggested_weight": 0,
      "sets": 0,
      "reps": "8-10",
      "reasoning": "Why this weight/rep scheme"
    }
  ],
  "warnings": ["Any cautions based on recent training load"]
}`;
  }

  const fullPrompt = userPrompt + '\n\n' + responseFormat;

  try {
    // Call AI model
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt }
      ],
      max_tokens: 2000
    });

    // Parse response
    let analysis = null;
    try {
      const responseText = response.response || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return raw response if parsing fails
      return {
        success: true,
        raw_response: response.response,
        parsing_failed: true,
        training_data: trainingData
      };
    }

    return {
      success: true,
      analysis,
      training_data: trainingData,
      generated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('AI coaching analysis error:', error);
    return {
      success: false,
      error: error.message,
      training_data: trainingData
    };
  }
}

/**
 * Generate exercise-specific coaching
 */
export async function getExerciseCoaching(db, ai, userId, exerciseId) {
  // Get exercise details
  const exercise = await db.prepare(`
    SELECT * FROM exercises WHERE id = ?
  `).bind(exerciseId).first();

  if (!exercise) {
    return { success: false, error: 'Exercise not found' };
  }

  // Get all history for this exercise
  const history = await db.prepare(`
    SELECT 
      w.start_time,
      s.weight_kg,
      s.reps,
      s.one_rep_max_kg,
      s.set_number
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
    ORDER BY w.start_time DESC, s.set_number
    LIMIT 100
  `).bind(exerciseId, userId).all();

  if (history.results.length < 3) {
    return {
      success: false,
      message: 'Need more workout history for this exercise'
    };
  }

  // Organize by workout
  const workoutsByDate = {};
  for (const set of history.results) {
    const date = set.start_time.split('T')[0];
    if (!workoutsByDate[date]) {
      workoutsByDate[date] = [];
    }
    workoutsByDate[date].push(set);
  }

  const workoutSummaries = Object.entries(workoutsByDate).map(([date, sets]) => {
    const maxWeight = Math.max(...sets.map(s => s.weight_kg));
    const avgReps = Math.round(sets.reduce((sum, s) => sum + s.reps, 0) / sets.length);
    const maxRM = Math.max(...sets.map(s => s.one_rep_max_kg || 0));
    return `${date}: ${sets.length} sets, max ${maxWeight}kg × ${avgReps} reps (Est 1RM: ${Math.round(maxRM)}kg)`;
  }).slice(0, 10).join('\n');

  const prompt = `You are an expert strength coach. Analyze this exercise history and provide specific coaching.

Exercise: ${exercise.name}
Muscle Group: ${exercise.muscle_group}

Recent Performance (last 10 sessions):
${workoutSummaries}

Provide coaching in JSON format:
{
  "progress_assessment": "How they're progressing on this exercise",
  "current_estimated_1rm": 0,
  "next_session_recommendation": {
    "weight_kg": 0,
    "sets": 0,
    "reps": "8-10",
    "rest_seconds": 90,
    "notes": "Any technique or execution tips"
  },
  "progression_plan": {
    "week_1": "Weight and rep target",
    "week_2": "Weight and rep target",
    "week_3": "Weight and rep target",
    "week_4": "Deload or test week"
  },
  "technique_tips": ["Specific tips for this exercise"],
  "common_mistakes_to_avoid": ["Based on this exercise"]
}`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are an expert strength coach specializing in exercise programming and technique.' },
        { role: 'user', content: prompt }
      ]
    });

    let coaching = null;
    try {
      const jsonMatch = (response.response || '').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        coaching = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      return { success: true, raw_response: response.response };
    }

    return {
      success: true,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        muscle_group: exercise.muscle_group
      },
      coaching,
      history_summary: workoutSummaries
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * AI Chat - Ask the coach anything
 */
export async function chatWithCoach(db, ai, userId, message, conversationHistory = []) {
  // Get comprehensive user context (90 days for better analysis)
  const trainingData = await aggregateTrainingData(db, userId, { days: 90 });
  
  // Get user's measurement preference
  const isImperial = trainingData.user.measurement_system === 'imperial';
  const weightUnit = isImperial ? 'lbs' : 'kg';
  const convertWeight = (kg) => isImperial ? Math.round(kg * 2.205 * 10) / 10 : kg;
  
  // Build detailed muscle group breakdown with correct units
  const muscleBreakdown = trainingData.muscleGroupVolume.map(mg => 
    `${mg.muscle_group}: ${mg.total_sets} sets, ${Math.round(convertWeight(mg.total_volume))}${weightUnit} volume`
  ).join('\n');
  
  // Build exercise progression summary
  const exerciseProgress = {};
  for (const ep of trainingData.exerciseProgression) {
    if (!exerciseProgress[ep.exercise_name]) {
      exerciseProgress[ep.exercise_name] = { weights: [], muscle: ep.muscle_group };
    }
    exerciseProgress[ep.exercise_name].weights.push(ep.max_weight);
  }
  
  const progressSummary = Object.entries(exerciseProgress).slice(0, 10).map(([name, data]) => {
    const weights = data.weights;
    const latestWeight = convertWeight(weights[weights.length-1]);
    const trend = weights.length > 1 ? 
      (weights[weights.length-1] > weights[0] ? '↑ improving' : weights[weights.length-1] < weights[0] ? '↓ declining' : '→ stable') : 
      'new';
    return `${name} (${data.muscle}): ${latestWeight}${weightUnit} ${trend}`;
  }).join('\n');
  
  // Plateau exercises with correct units
  const plateauInfo = trainingData.plateauExercises.length > 0 ?
    `\nPLATEAUS DETECTED:\n${trainingData.plateauExercises.map(p => `- ${p.exercise_name}: stuck at ${convertWeight(p.current_weight)}${weightUnit} for ${p.weeks_at_plateau}+ weeks`).join('\n')}` : '';
  
  // Weekly volume trend with correct units
  const weeklyTrend = trainingData.weeklyTrends.slice(0, 4).map(w => 
    `Week ${w.week}: ${w.workout_count} workouts, ${Math.round(convertWeight(w.total_volume))}${weightUnit} volume`
  ).join('\n');

  const systemPrompt = `You are an expert strength and conditioning coach with deep knowledge of exercise science, hypertrophy training, powerlifting, and sports nutrition. You provide personalized, evidence-based coaching.

IMPORTANT: This user uses ${isImperial ? 'IMPERIAL (pounds/lbs)' : 'METRIC (kilograms/kg)'} units. ALL weights in your responses MUST be in ${weightUnit}.

COMPLETE TRAINING DATA FOR THIS USER (Last 90 days):

TRAINING OVERVIEW:
- Total Workouts: ${trainingData.summary.total_workouts}
- Training Frequency: ${trainingData.summary.workouts_per_week} workouts/week
- Total Volume Lifted: ${Math.round(convertWeight(trainingData.summary.total_volume_kg))}${weightUnit}
- Avg Workout Duration: ${trainingData.summary.avg_workout_duration_minutes} minutes
- Avg Perceived Exertion: ${trainingData.summary.avg_perceived_exertion || 'Not tracked'}/10
- Rest Between Workouts: ${trainingData.restPatterns?.avg_rest_days?.toFixed(1) || 'N/A'} days average

VOLUME BY MUSCLE GROUP:
${muscleBreakdown}

EXERCISE PROGRESSION (Recent weights & trends):
${progressSummary}
${plateauInfo}

WEEKLY TRAINING TREND:
${weeklyTrend}

PERSONAL RECORDS:
${trainingData.personalRecords.slice(0, 5).map(pr => `- ${pr.exercise_name}: ${convertWeight(pr.max_weight)}${weightUnit} (Est 1RM: ${Math.round(convertWeight(pr.estimated_1rm))}${weightUnit})`).join('\n')}

YOUR COACHING GUIDELINES:
1. ALWAYS reference specific data from above when giving advice
2. Use exact exercise names and weights from their history
3. ALWAYS use ${weightUnit} for all weight recommendations - NEVER use ${isImperial ? 'kg' : 'lbs'}
4. Apply evidence-based principles:
   - Progressive overload: increase weight/reps/sets over time
   - Volume: 10-20 sets per muscle group per week for hypertrophy
   - Frequency: each muscle 2-3x per week optimal
   - Recovery: 48-72 hours between training same muscle
   - RPE management: avoid chronic high RPE (8+)
5. Be specific with numbers (e.g., "increase bench from ${isImperial ? '185lbs to 190lbs' : '80kg to 82.5kg'} next session")
6. Identify imbalances (e.g., if chest volume >> back volume, flag it)
7. For plateaus, suggest: deload weeks, rep range changes, exercise variations, or technique focus
8. Keep responses focused and actionable - no fluff`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: 'user', content: message }
  ];

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 1500
    });

    return {
      success: true,
      response: response.response,
      context_used: {
        workouts_analyzed: trainingData.summary.total_workouts,
        period_days: trainingData.summary.period_days,
        exercises_tracked: Object.keys(exerciseProgress).length
      }
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}
