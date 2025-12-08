import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

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

export default analytics;
