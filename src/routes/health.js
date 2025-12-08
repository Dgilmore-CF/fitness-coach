import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const health = new Hono();

// Sync heart rate data
health.post('/heartrate', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { workout_id, value, timestamp } = body;
  const db = c.env.DB;

  const data = await db.prepare(
    `INSERT INTO health_data (user_id, workout_id, data_type, value, timestamp, source)
     VALUES (?, ?, 'heart_rate', ?, ?, 'apple_health')
     RETURNING *`
  ).bind(user.id, workout_id, value, timestamp || new Date().toISOString()).first();

  return c.json({ data, message: 'Heart rate synced' });
});

// Sync heart rate data in bulk
health.post('/heartrate/bulk', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { workout_id, readings } = body; // readings is array of {value, timestamp}
  const db = c.env.DB;

  if (!Array.isArray(readings) || readings.length === 0) {
    return c.json({ error: 'readings must be a non-empty array' }, 400);
  }

  // Insert all readings
  for (const reading of readings) {
    await db.prepare(
      `INSERT INTO health_data (user_id, workout_id, data_type, value, timestamp, source)
       VALUES (?, ?, 'heart_rate', ?, ?, 'apple_health')`
    ).bind(user.id, workout_id, reading.value, reading.timestamp).run();
  }

  return c.json({ message: `${readings.length} heart rate readings synced` });
});

// Sync calories burned
health.post('/calories', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { workout_id, value, timestamp } = body;
  const db = c.env.DB;

  const data = await db.prepare(
    `INSERT INTO health_data (user_id, workout_id, data_type, value, timestamp, source)
     VALUES (?, ?, 'calories', ?, ?, 'apple_health')
     RETURNING *`
  ).bind(user.id, workout_id, value, timestamp || new Date().toISOString()).first();

  return c.json({ data, message: 'Calories synced' });
});

// Get health data for workout
health.get('/workout/:id', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('id');
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  const healthData = await db.prepare(
    `SELECT * FROM health_data 
     WHERE workout_id = ?
     ORDER BY timestamp`
  ).bind(workoutId).all();

  // Organize by data type
  const heartRateData = healthData.results.filter(d => d.data_type === 'heart_rate');
  const caloriesData = healthData.results.filter(d => d.data_type === 'calories');

  // Calculate statistics
  const heartRateStats = heartRateData.length > 0 ? {
    average: heartRateData.reduce((sum, d) => sum + d.value, 0) / heartRateData.length,
    min: Math.min(...heartRateData.map(d => d.value)),
    max: Math.max(...heartRateData.map(d => d.value)),
    count: heartRateData.length
  } : null;

  const totalCalories = caloriesData.reduce((sum, d) => sum + d.value, 0);

  return c.json({
    heart_rate: {
      data: heartRateData,
      stats: heartRateStats
    },
    calories: {
      data: caloriesData,
      total: totalCalories
    }
  });
});

// Get health data history
health.get('/history', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const dataType = c.req.query('data_type'); // heart_rate or calories
  const days = c.req.query('days') || 30;

  let query = `
    SELECT hd.*, w.start_time as workout_start
    FROM health_data hd
    LEFT JOIN workouts w ON hd.workout_id = w.id
    WHERE hd.user_id = ? AND hd.timestamp >= datetime('now', '-' || ? || ' days')
  `;

  const params = [user.id, days];

  if (dataType) {
    query += ' AND hd.data_type = ?';
    params.push(dataType);
  }

  query += ' ORDER BY hd.timestamp DESC LIMIT 1000';

  const history = await db.prepare(query).bind(...params).all();

  return c.json({ history: history.results });
});

// Get health stats summary
health.get('/stats', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const days = c.req.query('days') || 30;

  // Average heart rate
  const avgHeartRate = await db.prepare(
    `SELECT AVG(value) as avg_hr, MIN(value) as min_hr, MAX(value) as max_hr
     FROM health_data
     WHERE user_id = ? AND data_type = 'heart_rate' AND timestamp >= datetime('now', '-' || ? || ' days')`
  ).bind(user.id, days).first();

  // Total calories burned
  const totalCalories = await db.prepare(
    `SELECT SUM(value) as total
     FROM health_data
     WHERE user_id = ? AND data_type = 'calories' AND timestamp >= datetime('now', '-' || ? || ' days')`
  ).bind(user.id, days).first();

  // Calories by workout
  const caloriesByWorkout = await db.prepare(
    `SELECT 
       w.id,
       w.start_time,
       w.total_duration_seconds,
       SUM(hd.value) as calories
     FROM workouts w
     LEFT JOIN health_data hd ON w.id = hd.workout_id AND hd.data_type = 'calories'
     WHERE w.user_id = ? AND w.completed = 1 AND w.start_time >= datetime('now', '-' || ? || ' days')
     GROUP BY w.id
     ORDER BY w.start_time DESC`
  ).bind(user.id, days).all();

  return c.json({
    heart_rate: {
      average: avgHeartRate?.avg_hr || 0,
      min: avgHeartRate?.min_hr || 0,
      max: avgHeartRate?.max_hr || 0
    },
    calories: {
      total: totalCalories?.total || 0,
      by_workout: caloriesByWorkout.results
    }
  });
});

export default health;
