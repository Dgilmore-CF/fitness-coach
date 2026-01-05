// Advanced Analytics Service with ML Predictions

// Calculate linear regression for trend prediction
function linearRegression(data) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
    sumY2 += data[i] * data[i];
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const yMean = sumY / n;
  let ssTotal = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += Math.pow(data[i] - predicted, 2);
    ssTotal += Math.pow(data[i] - yMean, 2);
  }
  const r2 = ssTotal > 0 ? 1 - (ssRes / ssTotal) : 0;
  
  return { slope, intercept, r2 };
}

// Calculate moving average
function movingAverage(data, window = 3) {
  if (data.length < window) return data;
  
  const result = [];
  for (let i = 0; i <= data.length - window; i++) {
    const sum = data.slice(i, i + window).reduce((a, b) => a + b, 0);
    result.push(sum / window);
  }
  return result;
}

// Predict future values using linear regression
function predictFuture(data, periods = 4) {
  const { slope, intercept, r2 } = linearRegression(data);
  const predictions = [];
  const lastIndex = data.length - 1;
  
  for (let i = 1; i <= periods; i++) {
    predictions.push({
      period: lastIndex + i,
      predicted: Math.max(0, intercept + slope * (lastIndex + i)),
      confidence: Math.max(0, Math.min(1, r2))
    });
  }
  
  return { predictions, trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable', r2 };
}

// Analyze workout consistency patterns
export function analyzeConsistency(workoutDates) {
  if (workoutDates.length < 2) {
    return { 
      averageGap: 0, 
      consistency: 0, 
      longestStreak: workoutDates.length,
      currentStreak: workoutDates.length,
      bestDay: null,
      pattern: 'insufficient_data'
    };
  }
  
  // Calculate gaps between workouts
  const gaps = [];
  const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  for (let i = 1; i < workoutDates.length; i++) {
    const gap = (new Date(workoutDates[i]) - new Date(workoutDates[i-1])) / (1000 * 60 * 60 * 24);
    gaps.push(gap);
  }
  
  // Count workouts by day of week
  for (const date of workoutDates) {
    const day = new Date(date).getDay();
    dayCount[day]++;
  }
  
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);
  
  // Consistency score: lower variance = higher consistency
  const consistency = Math.max(0, Math.min(100, 100 - (stdDev * 10)));
  
  // Find best day
  const bestDayIndex = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0][0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Calculate streaks
  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;
  
  for (let i = 1; i < workoutDates.length; i++) {
    const gap = (new Date(workoutDates[i]) - new Date(workoutDates[i-1])) / (1000 * 60 * 60 * 24);
    if (gap <= 3) { // Within 3 days counts as maintaining streak
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  
  // Check if latest workout is recent enough to count current streak
  const daysSinceLast = (new Date() - new Date(workoutDates[workoutDates.length - 1])) / (1000 * 60 * 60 * 24);
  currentStreak = daysSinceLast <= 3 ? tempStreak : 0;
  
  // Determine pattern
  let pattern = 'irregular';
  if (consistency > 80) pattern = 'very_consistent';
  else if (consistency > 60) pattern = 'consistent';
  else if (consistency > 40) pattern = 'moderate';
  
  return {
    averageGap: Math.round(avgGap * 10) / 10,
    consistency: Math.round(consistency),
    longestStreak,
    currentStreak,
    bestDay: dayNames[bestDayIndex],
    dayDistribution: Object.fromEntries(Object.entries(dayCount).map(([k, v]) => [dayNames[k], v])),
    pattern
  };
}

// Analyze muscle group balance
export function analyzeMuscleBalance(volumeByMuscle) {
  if (!volumeByMuscle || volumeByMuscle.length === 0) {
    return { balance: 100, imbalances: [], recommendations: [] };
  }
  
  const totalVolume = volumeByMuscle.reduce((sum, m) => sum + (m.volume || 0), 0);
  if (totalVolume === 0) return { balance: 100, imbalances: [], recommendations: [] };
  
  // Ideal ratios (approximate)
  const idealRatios = {
    'Chest': 0.15,
    'Back': 0.18,
    'Shoulders': 0.12,
    'Biceps': 0.08,
    'Triceps': 0.08,
    'Quads': 0.14,
    'Hamstrings': 0.10,
    'Glutes': 0.08,
    'Core': 0.05,
    'Calves': 0.02
  };
  
  const imbalances = [];
  const recommendations = [];
  
  for (const muscle of volumeByMuscle) {
    const actualRatio = muscle.volume / totalVolume;
    const idealRatio = idealRatios[muscle.muscle_group] || 0.08;
    const deviation = (actualRatio - idealRatio) / idealRatio;
    
    if (deviation < -0.3) {
      imbalances.push({
        muscle: muscle.muscle_group,
        status: 'undertrained',
        deviation: Math.round(deviation * 100)
      });
      recommendations.push(`Consider adding more ${muscle.muscle_group.toLowerCase()} exercises`);
    } else if (deviation > 0.5) {
      imbalances.push({
        muscle: muscle.muscle_group,
        status: 'overtrained',
        deviation: Math.round(deviation * 100)
      });
    }
  }
  
  // Check for missing muscle groups
  for (const [muscle, ratio] of Object.entries(idealRatios)) {
    if (!volumeByMuscle.find(m => m.muscle_group === muscle) && ratio > 0.05) {
      recommendations.push(`${muscle} is not being trained - consider adding exercises`);
    }
  }
  
  const balance = Math.max(0, 100 - (imbalances.length * 15));
  
  return { balance, imbalances, recommendations };
}

// Calculate recovery score based on workout frequency and intensity
export function calculateRecoveryScore(workouts, muscleVolumeByDay) {
  if (!workouts || workouts.length === 0) return { score: 100, status: 'well_rested', recommendation: '' };
  
  const now = new Date();
  const last7Days = workouts.filter(w => {
    const workoutDate = new Date(w.start_time);
    return (now - workoutDate) / (1000 * 60 * 60 * 24) <= 7;
  });
  
  const last48Hours = workouts.filter(w => {
    const workoutDate = new Date(w.start_time);
    return (now - workoutDate) / (1000 * 60 * 60) <= 48;
  });
  
  // Factors affecting recovery
  let recoveryScore = 100;
  
  // Deduct for recent workouts
  recoveryScore -= last48Hours.length * 15;
  
  // Deduct for high weekly volume
  if (last7Days.length > 5) recoveryScore -= 20;
  else if (last7Days.length > 3) recoveryScore -= 10;
  
  // Deduct for high perceived exertion
  const avgExertion = last7Days.reduce((sum, w) => sum + (w.perceived_exertion || 5), 0) / (last7Days.length || 1);
  if (avgExertion > 8) recoveryScore -= 15;
  else if (avgExertion > 6) recoveryScore -= 5;
  
  recoveryScore = Math.max(0, Math.min(100, recoveryScore));
  
  let status, recommendation;
  if (recoveryScore >= 80) {
    status = 'well_rested';
    recommendation = 'You are well recovered. Good time for a challenging workout!';
  } else if (recoveryScore >= 60) {
    status = 'moderate';
    recommendation = 'Moderate recovery. A normal workout is appropriate.';
  } else if (recoveryScore >= 40) {
    status = 'fatigued';
    recommendation = 'Consider a lighter workout or active recovery today.';
  } else {
    status = 'needs_rest';
    recommendation = 'Your body needs rest. Consider taking a recovery day.';
  }
  
  return { score: recoveryScore, status, recommendation, workoutsLast7Days: last7Days.length };
}

// Generate strength predictions for specific exercises
export async function generateStrengthPredictions(db, userId, exerciseId = null) {
  let query = `
    SELECT 
      e.id as exercise_id,
      e.name as exercise_name,
      MAX(s.weight_kg) as max_weight,
      MAX(s.one_rep_max_kg) as max_1rm,
      date(w.start_time) as workout_date
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN exercises e ON we.exercise_id = e.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND w.completed = 1
  `;
  
  const params = [userId];
  if (exerciseId) {
    query += ' AND e.id = ?';
    params.push(exerciseId);
  }
  
  query += ' GROUP BY e.id, date(w.start_time) ORDER BY e.id, workout_date';
  
  const result = await db.prepare(query).bind(...params).all();
  const data = result.results || [];
  
  // Group by exercise
  const byExercise = {};
  for (const row of data) {
    if (!byExercise[row.exercise_id]) {
      byExercise[row.exercise_id] = {
        name: row.exercise_name,
        weights: [],
        oneRepMaxes: [],
        dates: []
      };
    }
    byExercise[row.exercise_id].weights.push(row.max_weight);
    byExercise[row.exercise_id].oneRepMaxes.push(row.max_1rm || row.max_weight);
    byExercise[row.exercise_id].dates.push(row.workout_date);
  }
  
  // Generate predictions for each exercise
  const predictions = [];
  for (const [id, exercise] of Object.entries(byExercise)) {
    if (exercise.oneRepMaxes.length < 3) continue; // Need at least 3 data points
    
    const prediction = predictFuture(exercise.oneRepMaxes, 4);
    const currentMax = exercise.oneRepMaxes[exercise.oneRepMaxes.length - 1];
    const predictedMax = prediction.predictions[3]?.predicted || currentMax;
    
    predictions.push({
      exercise_id: parseInt(id),
      exercise_name: exercise.name,
      current_max: Math.round(currentMax * 10) / 10,
      predicted_max_4_weeks: Math.round(predictedMax * 10) / 10,
      trend: prediction.trend,
      confidence: Math.round(prediction.r2 * 100),
      weekly_increase: Math.round(prediction.predictions[0]?.predicted - currentMax * 10) / 10,
      data_points: exercise.oneRepMaxes.length
    });
  }
  
  return predictions.sort((a, b) => b.confidence - a.confidence);
}

// Generate volume predictions
export async function generateVolumePredictions(db, userId) {
  const volumeResult = await db.prepare(`
    SELECT 
      strftime('%Y-W%W', start_time) as week,
      SUM(total_weight_kg) as volume
    FROM workouts
    WHERE user_id = ? AND completed = 1 AND start_time >= datetime('now', '-90 days')
    GROUP BY week
    ORDER BY week
  `).bind(userId).all();
  
  const volumes = (volumeResult.results || []).map(r => r.volume || 0);
  
  if (volumes.length < 4) {
    return { 
      trend: 'insufficient_data',
      predictions: [],
      recommendation: 'Complete more workouts to generate volume predictions'
    };
  }
  
  const prediction = predictFuture(volumes, 4);
  const currentVolume = volumes[volumes.length - 1];
  
  let recommendation = '';
  if (prediction.trend === 'increasing' && prediction.r2 > 0.5) {
    recommendation = 'Your training volume is progressively increasing - great for muscle growth!';
  } else if (prediction.trend === 'decreasing') {
    recommendation = 'Volume is trending down. Consider if this is intentional (deload) or needs attention.';
  } else {
    recommendation = 'Volume is stable. Consider progressive overload to continue making gains.';
  }
  
  return {
    trend: prediction.trend,
    confidence: Math.round(prediction.r2 * 100),
    current_weekly_volume: Math.round(currentVolume),
    predicted_4_week_volume: Math.round(prediction.predictions[3]?.predicted || currentVolume),
    predictions: prediction.predictions.map((p, i) => ({
      week: `Week ${i + 1}`,
      predicted_volume: Math.round(p.predicted)
    })),
    recommendation
  };
}

// Get AI-powered workout insights using Cloudflare AI
export async function getAIWorkoutInsights(ai, userData) {
  const prompt = `As a fitness coach, analyze this training data and provide 3 specific, actionable insights:

Training Summary (Last 30 Days):
- Total Workouts: ${userData.totalWorkouts}
- Weekly Average: ${userData.weeklyAverage} workouts
- Total Volume: ${userData.totalVolume} kg
- Most Trained: ${userData.topMuscles.join(', ')}
- Least Trained: ${userData.bottomMuscles.join(', ')}
- Consistency Score: ${userData.consistency}%
- Recovery Status: ${userData.recoveryStatus}
- Current Streak: ${userData.currentStreak} workouts

Provide insights in this JSON format:
{
  "insights": [
    {
      "title": "Brief title",
      "insight": "Detailed observation",
      "action": "Specific recommendation",
      "priority": "high|medium|low",
      "category": "volume|frequency|balance|recovery|progression"
    }
  ],
  "overall_assessment": "One sentence summary of their training"
}`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are an expert strength coach providing data-driven insights. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ]
    });
    
    const responseText = response.response || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI insights error:', error);
  }
  
  // Fallback insights if AI fails
  return {
    insights: [
      {
        title: 'Training Consistency',
        insight: `You've completed ${userData.totalWorkouts} workouts with ${userData.consistency}% consistency.`,
        action: userData.consistency < 70 ? 'Try to maintain a more regular schedule' : 'Keep up the great consistency!',
        priority: userData.consistency < 70 ? 'high' : 'low',
        category: 'frequency'
      }
    ],
    overall_assessment: 'Continue your training with focus on progressive overload and balanced muscle development.'
  };
}

// Calculate estimated time to reach a strength goal
export function estimateTimeToGoal(currentMax, goalWeight, weeklyIncrease) {
  if (weeklyIncrease <= 0) {
    return { weeks: null, achievable: false, recommendation: 'Current progress rate is not sufficient. Focus on progressive overload.' };
  }
  
  const difference = goalWeight - currentMax;
  if (difference <= 0) {
    return { weeks: 0, achievable: true, recommendation: 'You have already reached this goal!' };
  }
  
  const weeks = Math.ceil(difference / weeklyIncrease);
  
  return {
    weeks,
    months: Math.round(weeks / 4.3),
    achievable: weeks < 52,
    recommendation: weeks < 12 
      ? `At your current rate, you could reach ${goalWeight}kg in about ${weeks} weeks!`
      : `This is a long-term goal. Focus on consistent training and proper nutrition.`
  };
}
