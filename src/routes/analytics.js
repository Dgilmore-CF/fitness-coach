import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { 
  analyzeConsistency, 
  analyzeMuscleBalance, 
  calculateRecoveryScore,
  generateStrengthPredictions,
  generateVolumePredictions,
  getAIWorkoutInsights,
  estimateTimeToGoal
} from '../services/advanced-analytics';

const analytics = new Hono();

// Get progress overview
analytics.get('/progress', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const days = c.req.query('days') || 30;

  // Total workouts
  const totalWorkouts = await db.prepare(
    `SELECT COUNT(*) as count 
     FROM workouts 
     WHERE user_id = ? AND completed = 1 AND start_time >= datetime('now', '-' || ? || ' days')`
  ).bind(user.id, days).first();

  // Total volume lifted
  const totalVolume = await db.prepare(
    `SELECT SUM(total_weight_kg) as total 
     FROM workouts 
     WHERE user_id = ? AND completed = 1 AND start_time >= datetime('now', '-' || ? || ' days')`
  ).bind(user.id, days).first();

  // Total time
  const totalTime = await db.prepare(
    `SELECT SUM(total_duration_seconds) as total 
     FROM workouts 
     WHERE user_id = ? AND completed = 1 AND start_time >= datetime('now', '-' || ? || ' days')`
  ).bind(user.id, days).first();

  // Workout frequency
  const frequency = await db.prepare(
    `SELECT 
       date(start_time) as date,
       COUNT(*) as count
     FROM workouts
     WHERE user_id = ? AND completed = 1 AND start_time >= datetime('now', '-' || ? || ' days')
     GROUP BY date(start_time)
     ORDER BY date`
  ).bind(user.id, days).all();

  // Top exercises by volume
  const topExercises = await db.prepare(
    `SELECT 
       e.name,
       e.muscle_group,
       SUM(CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as volume,
       COUNT(DISTINCT we.workout_id) as workout_count
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN exercises e ON we.exercise_id = e.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ? AND w.completed = 1 AND w.start_time >= datetime('now', '-' || ? || ' days')
     GROUP BY e.id
     ORDER BY volume DESC
     LIMIT 10`
  ).bind(user.id, days).all();

  return c.json({
    overview: {
      total_workouts: totalWorkouts.count,
      total_volume_kg: totalVolume.total || 0,
      total_time_seconds: totalTime.total || 0,
      average_workout_time: totalWorkouts.count > 0 ? (totalTime.total / totalWorkouts.count) : 0
    },
    frequency: frequency.results,
    top_exercises: topExercises.results
  });
});

// Get 1RM history for all exercises
analytics.get('/1rm', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const exerciseId = c.req.query('exercise_id');

  let query = `
    SELECT 
      e.id as exercise_id,
      e.name as exercise_name,
      MAX(s.one_rep_max_kg) as max_1rm,
      w.start_time
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN exercises e ON we.exercise_id = e.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND w.completed = 1
  `;

  const params = [user.id];

  if (exerciseId) {
    query += ' AND e.id = ?';
    params.push(exerciseId);
  }

  query += ' GROUP BY e.id, date(w.start_time) ORDER BY w.start_time';

  const history = await db.prepare(query).bind(...params).all();

  return c.json({ one_rep_max_history: history.results });
});

// Get exercise history with progression data for charts and history table
analytics.get('/exercise-history/:exerciseId', async (c) => {
  const user = requireAuth(c);
  const exerciseId = c.req.param('exerciseId');
  const db = c.env.DB;

  // Get exercise details
  const exercise = await db.prepare(
    'SELECT * FROM exercises WHERE id = ?'
  ).bind(exerciseId).first();

  if (!exercise) {
    return c.json({ error: 'Exercise not found' }, 404);
  }

  // Get all sets for this exercise grouped by workout date
  const setsHistory = await db.prepare(`
    SELECT 
      w.id as workout_id,
      date(w.start_time) as workout_date,
      w.start_time,
      s.set_number,
      s.weight_kg,
      s.reps,
      s.one_rep_max_kg,
      s.rpe
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
    ORDER BY w.start_time DESC, s.set_number ASC
    LIMIT 500
  `).bind(exerciseId, user.id).all();

  // Get progression data (best set per workout for charting)
  const progressionData = await db.prepare(`
    SELECT 
      date(w.start_time) as workout_date,
      MAX(s.weight_kg) as max_weight,
      MAX(s.one_rep_max_kg) as max_1rm,
      MAX(s.reps) as max_reps,
      SUM(s.weight_kg * s.reps) as total_volume,
      COUNT(s.id) as set_count
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
    GROUP BY date(w.start_time)
    ORDER BY workout_date ASC
  `).bind(exerciseId, user.id).all();

  // Get personal records
  const pr = await db.prepare(`
    SELECT 
      MAX(s.weight_kg) as max_weight,
      MAX(s.one_rep_max_kg) as max_1rm,
      MAX(s.reps) as max_reps
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
  `).bind(exerciseId, user.id).first();

  // Group sets by workout date for the history table
  const historyByDate = {};
  for (const set of setsHistory.results) {
    const date = set.workout_date;
    if (!historyByDate[date]) {
      historyByDate[date] = {
        date: date,
        start_time: set.start_time,
        sets: []
      };
    }
    historyByDate[date].sets.push({
      set_number: set.set_number,
      weight_kg: set.weight_kg,
      reps: set.reps,
      one_rep_max_kg: set.one_rep_max_kg,
      rpe: set.rpe
    });
  }

  return c.json({
    exercise: {
      id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      equipment: exercise.equipment
    },
    personal_records: pr,
    progression: progressionData.results,
    history: Object.values(historyByDate)
  });
});

// Get volume trends
analytics.get('/volume', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const days = c.req.query('days') || 90;
  const groupBy = c.req.query('group_by') || 'week'; // day, week, month

  let dateFormat = '';
  if (groupBy === 'day') {
    dateFormat = '%Y-%m-%d';
  } else if (groupBy === 'week') {
    dateFormat = '%Y-W%W';
  } else {
    dateFormat = '%Y-%m';
  }

  const volumeTrends = await db.prepare(
    `SELECT 
       strftime(?, w.start_time) as period,
       SUM(w.total_weight_kg) as total_volume,
       COUNT(*) as workout_count,
       AVG(w.total_duration_seconds) as avg_duration
     FROM workouts w
     WHERE w.user_id = ? AND w.completed = 1 AND w.start_time >= datetime('now', '-' || ? || ' days')
     GROUP BY period
     ORDER BY period`
  ).bind(dateFormat, user.id, days).all();

  // Volume by muscle group
  const volumeByMuscle = await db.prepare(
    `SELECT 
       e.muscle_group,
       SUM(CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as volume
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN exercises e ON we.exercise_id = e.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ? AND w.completed = 1 AND w.start_time >= datetime('now', '-' || ? || ' days')
     GROUP BY e.muscle_group
     ORDER BY volume DESC`
  ).bind(user.id, days).all();

  return c.json({
    volume_trends: volumeTrends.results,
    volume_by_muscle: volumeByMuscle.results
  });
});

// Get body map data (muscle group activation)
analytics.get('/bodymap', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const workoutId = c.req.query('workout_id');
  const days = c.req.query('days') || 7;

  let query = `
    SELECT 
      e.muscle_group,
      COUNT(DISTINCT we.id) as exercise_count,
      SUM(CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as volume,
      COUNT(s.id) as set_count
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN exercises e ON we.exercise_id = e.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND w.completed = 1
  `;

  const params = [user.id];

  if (workoutId) {
    query += ' AND w.id = ?';
    params.push(workoutId);
  } else {
    query += ' AND w.start_time >= datetime(\'now\', \'-\' || ? || \' days\')';
    params.push(days);
  }

  query += ' GROUP BY e.muscle_group ORDER BY volume DESC';

  const bodyMap = await db.prepare(query).bind(...params).all();

  // Calculate intensity percentages
  const maxVolume = bodyMap.results.length > 0 ? Math.max(...bodyMap.results.map(m => m.volume)) : 1;

  const normalized = bodyMap.results.map(m => ({
    muscle_group: m.muscle_group,
    exercise_count: m.exercise_count,
    volume: m.volume,
    set_count: m.set_count,
    intensity: (m.volume / maxVolume) * 100
  }));

  return c.json({ body_map: normalized });
});

// Get week-to-week and month-to-month progress comparison
analytics.get('/progress-comparison', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  // Calculate week boundaries in JavaScript (Monday-Sunday weeks)
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0 days ago
  
  const thisWeekStart = new Date(now);
  thisWeekStart.setUTCDate(now.getUTCDate() - daysSinceMonday);
  thisWeekStart.setUTCHours(0, 0, 0, 0);
  
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setUTCDate(thisWeekStart.getUTCDate() + 6);
  
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);
  
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setUTCDate(thisWeekStart.getUTCDate() - 1);
  
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thisMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  
  // Format dates for SQL and display
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  const dateRanges = {
    this_week_start: formatDate(thisWeekStart),
    this_week_end: formatDate(thisWeekEnd),
    last_week_start: formatDate(lastWeekStart),
    last_week_end: formatDate(lastWeekEnd),
    this_month_start: formatDate(thisMonthStart),
    this_month_end: formatDate(thisMonthEnd),
    last_month_start: formatDate(lastMonthStart),
    last_month_end: formatDate(lastMonthEnd)
  };

  // This week vs last week
  const thisWeek = await db.prepare(`
    SELECT 
      COUNT(*) as workout_count,
      COALESCE(SUM(total_weight_kg), 0) as total_volume,
      COALESCE(SUM(total_duration_seconds), 0) as total_time
    FROM workouts
    WHERE user_id = ? AND completed = 1 
      AND date(start_time) >= ?
  `).bind(user.id, dateRanges.this_week_start).first();

  const lastWeek = await db.prepare(`
    SELECT 
      COUNT(*) as workout_count,
      COALESCE(SUM(total_weight_kg), 0) as total_volume,
      COALESCE(SUM(total_duration_seconds), 0) as total_time
    FROM workouts
    WHERE user_id = ? AND completed = 1 
      AND date(start_time) >= ? AND date(start_time) <= ?
  `).bind(user.id, dateRanges.last_week_start, dateRanges.last_week_end).first();

  // This month vs last month
  const thisMonth = await db.prepare(`
    SELECT 
      COUNT(*) as workout_count,
      COALESCE(SUM(total_weight_kg), 0) as total_volume,
      COALESCE(SUM(total_duration_seconds), 0) as total_time
    FROM workouts
    WHERE user_id = ? AND completed = 1 
      AND date(start_time) >= ?
  `).bind(user.id, dateRanges.this_month_start).first();

  const lastMonth = await db.prepare(`
    SELECT 
      COUNT(*) as workout_count,
      COALESCE(SUM(total_weight_kg), 0) as total_volume,
      COALESCE(SUM(total_duration_seconds), 0) as total_time
    FROM workouts
    WHERE user_id = ? AND completed = 1 
      AND date(start_time) >= ? AND date(start_time) <= ?
  `).bind(user.id, dateRanges.last_month_start, dateRanges.last_month_end).first();

  // Calculate percentage changes
  const calcChange = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return c.json({
    weekly: {
      current: {
        workout_count: thisWeek.workout_count,
        total_volume: thisWeek.total_volume,
        total_time: thisWeek.total_time,
        start_date: dateRanges.this_week_start,
        end_date: dateRanges.this_week_end
      },
      previous: {
        workout_count: lastWeek.workout_count,
        total_volume: lastWeek.total_volume,
        total_time: lastWeek.total_time,
        start_date: dateRanges.last_week_start,
        end_date: dateRanges.last_week_end
      },
      changes: {
        workout_count: calcChange(thisWeek.workout_count, lastWeek.workout_count),
        total_volume: calcChange(thisWeek.total_volume, lastWeek.total_volume),
        total_time: calcChange(thisWeek.total_time, lastWeek.total_time)
      }
    },
    monthly: {
      current: {
        workout_count: thisMonth.workout_count,
        total_volume: thisMonth.total_volume,
        total_time: thisMonth.total_time,
        start_date: dateRanges.this_month_start,
        end_date: dateRanges.this_month_end
      },
      previous: {
        workout_count: lastMonth.workout_count,
        total_volume: lastMonth.total_volume,
        total_time: lastMonth.total_time,
        start_date: dateRanges.last_month_start,
        end_date: dateRanges.last_month_end
      },
      changes: {
        workout_count: calcChange(thisMonth.workout_count, lastMonth.workout_count),
        total_volume: calcChange(thisMonth.total_volume, lastMonth.total_volume),
        total_time: calcChange(thisMonth.total_time, lastMonth.total_time)
      }
    }
  });
});

// Get AI recommendations
analytics.get('/recommendations', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const limit = c.req.query('limit') || 10;

  const recommendations = await db.prepare(
    `SELECT r.*, e.name as exercise_name
     FROM ai_recommendations r
     JOIN exercises e ON r.exercise_id = e.id
     WHERE r.user_id = ? AND r.accepted IS NULL
     ORDER BY r.created_at DESC
     LIMIT ?`
  ).bind(user.id, limit).all();

  return c.json({ recommendations: recommendations.results });
});

// Accept/reject AI recommendation
analytics.post('/recommendations/:id/respond', async (c) => {
  const user = requireAuth(c);
  const recommendationId = c.req.param('id');
  const body = await c.req.json();
  const { accepted } = body;
  const db = c.env.DB;

  const recommendation = await db.prepare(
    'UPDATE ai_recommendations SET accepted = ? WHERE id = ? AND user_id = ? RETURNING *'
  ).bind(accepted, recommendationId, user.id).first();

  if (!recommendation) {
    return c.json({ error: 'Recommendation not found' }, 404);
  }

  return c.json({ recommendation });
});

// ============================================
// ADVANCED ANALYTICS ENDPOINTS
// ============================================

// Get comprehensive advanced analytics dashboard
analytics.get('/advanced', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const ai = c.env.AI;

  try {
    // Get workout dates for consistency analysis
    const workoutDatesResult = await db.prepare(`
      SELECT date(start_time) as workout_date
      FROM workouts
      WHERE user_id = ? AND completed = 1
      ORDER BY start_time DESC
      LIMIT 100
    `).bind(user.id).all();
    
    const workoutDates = (workoutDatesResult.results || []).map(w => w.workout_date).reverse();
    const consistency = analyzeConsistency(workoutDates);

    // Get volume by muscle for balance analysis
    const volumeResult = await db.prepare(`
      SELECT 
        e.muscle_group,
        SUM(CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as volume
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN exercises e ON we.exercise_id = e.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ? AND w.completed = 1 AND w.start_time >= datetime('now', '-30 days')
      GROUP BY e.muscle_group
      ORDER BY volume DESC
    `).bind(user.id).all();
    
    const muscleBalance = analyzeMuscleBalance(volumeResult.results || []);

    // Get recent workouts for recovery analysis
    const recentWorkoutsResult = await db.prepare(`
      SELECT start_time, perceived_exertion, total_weight_kg
      FROM workouts
      WHERE user_id = ? AND completed = 1
      ORDER BY start_time DESC
      LIMIT 20
    `).bind(user.id).all();
    
    const recovery = calculateRecoveryScore(recentWorkoutsResult.results || []);

    // Get strength predictions
    const strengthPredictions = await generateStrengthPredictions(db, user.id);

    // Get volume predictions
    const volumePredictions = await generateVolumePredictions(db, user.id);

    // Prepare data for AI insights
    const totalWorkouts = workoutDates.length;
    const totalVolume = (volumeResult.results || []).reduce((sum, m) => sum + (m.volume || 0), 0);
    const topMuscles = (volumeResult.results || []).slice(0, 3).map(m => m.muscle_group);
    const bottomMuscles = (volumeResult.results || []).slice(-3).map(m => m.muscle_group);

    // Get AI-powered insights
    const aiInsights = await getAIWorkoutInsights(ai, {
      totalWorkouts,
      weeklyAverage: Math.round(totalWorkouts / 4.3 * 10) / 10,
      totalVolume: Math.round(totalVolume),
      topMuscles,
      bottomMuscles,
      consistency: consistency.consistency,
      recoveryStatus: recovery.status,
      currentStreak: consistency.currentStreak
    });

    return c.json({
      consistency,
      muscle_balance: muscleBalance,
      recovery,
      strength_predictions: strengthPredictions.slice(0, 10),
      volume_predictions: volumePredictions,
      ai_insights: aiInsights,
      summary: {
        total_workouts_analyzed: totalWorkouts,
        total_volume_30_days: Math.round(totalVolume),
        training_age_days: workoutDates.length > 0 
          ? Math.round((new Date() - new Date(workoutDates[0])) / (1000 * 60 * 60 * 24))
          : 0
      }
    });
  } catch (error) {
    console.error('Advanced analytics error:', error);
    return c.json({ error: 'Failed to generate advanced analytics: ' + error.message }, 500);
  }
});

// Get strength predictions for specific exercise or all
analytics.get('/predictions/strength', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const exerciseId = c.req.query('exercise_id');

  try {
    const predictions = await generateStrengthPredictions(db, user.id, exerciseId);
    return c.json({ predictions });
  } catch (error) {
    console.error('Strength predictions error:', error);
    return c.json({ error: 'Failed to generate predictions' }, 500);
  }
});

// Get volume trend predictions
analytics.get('/predictions/volume', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  try {
    const predictions = await generateVolumePredictions(db, user.id);
    return c.json(predictions);
  } catch (error) {
    console.error('Volume predictions error:', error);
    return c.json({ error: 'Failed to generate volume predictions' }, 500);
  }
});

// Calculate time to reach a strength goal
analytics.get('/predictions/goal', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const exerciseId = c.req.query('exercise_id');
  const goalWeight = parseFloat(c.req.query('goal_weight') || '0');

  if (!exerciseId || !goalWeight) {
    return c.json({ error: 'exercise_id and goal_weight are required' }, 400);
  }

  try {
    const predictions = await generateStrengthPredictions(db, user.id, exerciseId);
    
    if (predictions.length === 0) {
      return c.json({ error: 'Not enough data for this exercise' }, 400);
    }

    const prediction = predictions[0];
    const weeklyIncrease = prediction.weekly_increase || 0;
    const estimate = estimateTimeToGoal(prediction.current_max, goalWeight, weeklyIncrease);

    return c.json({
      exercise: prediction.exercise_name,
      current_max: prediction.current_max,
      goal_weight: goalWeight,
      ...estimate
    });
  } catch (error) {
    console.error('Goal prediction error:', error);
    return c.json({ error: 'Failed to calculate goal prediction' }, 500);
  }
});

// Get workout consistency analysis
analytics.get('/consistency', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  try {
    const workoutDatesResult = await db.prepare(`
      SELECT date(start_time) as workout_date
      FROM workouts
      WHERE user_id = ? AND completed = 1
      ORDER BY start_time
    `).bind(user.id).all();
    
    const workoutDates = (workoutDatesResult.results || []).map(w => w.workout_date);
    const analysis = analyzeConsistency(workoutDates);

    return c.json(analysis);
  } catch (error) {
    console.error('Consistency analysis error:', error);
    return c.json({ error: 'Failed to analyze consistency' }, 500);
  }
});

// Get muscle balance analysis
analytics.get('/balance', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const days = c.req.query('days') || 30;

  try {
    const volumeResult = await db.prepare(`
      SELECT 
        e.muscle_group,
        SUM(CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as volume
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN exercises e ON we.exercise_id = e.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ? AND w.completed = 1 AND w.start_time >= datetime('now', '-' || ? || ' days')
      GROUP BY e.muscle_group
      ORDER BY volume DESC
    `).bind(user.id, days).all();
    
    const analysis = analyzeMuscleBalance(volumeResult.results || []);
    analysis.volume_distribution = volumeResult.results;

    return c.json(analysis);
  } catch (error) {
    console.error('Balance analysis error:', error);
    return c.json({ error: 'Failed to analyze muscle balance' }, 500);
  }
});

// Get recovery status
analytics.get('/recovery', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  try {
    const workoutsResult = await db.prepare(`
      SELECT start_time, perceived_exertion, total_weight_kg
      FROM workouts
      WHERE user_id = ? AND completed = 1
      ORDER BY start_time DESC
      LIMIT 20
    `).bind(user.id).all();
    
    const analysis = calculateRecoveryScore(workoutsResult.results || []);

    return c.json(analysis);
  } catch (error) {
    console.error('Recovery analysis error:', error);
    return c.json({ error: 'Failed to analyze recovery' }, 500);
  }
});

export default analytics;
