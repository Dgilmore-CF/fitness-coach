import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const exercises = new Hono();

// Get all exercises
exercises.get('/', async (c) => {
  const db = c.env.DB;
  const muscleGroup = c.req.query('muscle_group');
  const equipment = c.req.query('equipment');

  let query = 'SELECT * FROM exercises WHERE 1=1';
  const params = [];

  if (muscleGroup) {
    query += ' AND muscle_group = ?';
    params.push(muscleGroup);
  }

  if (equipment) {
    query += ' AND equipment = ?';
    params.push(equipment);
  }

  query += ' ORDER BY muscle_group, name';

  const result = await db.prepare(query).bind(...params).all();

  return c.json({ exercises: result.results });
});

// Get specific exercise
exercises.get('/:id', async (c) => {
  const exerciseId = c.req.param('id');
  const db = c.env.DB;

  const exercise = await db.prepare(
    'SELECT * FROM exercises WHERE id = ?'
  ).bind(exerciseId).first();

  if (!exercise) {
    return c.json({ error: 'Exercise not found' }, 404);
  }

  return c.json({ exercise });
});

// Get exercise history for user
exercises.get('/:id/history', async (c) => {
  const user = requireAuth(c);
  const exerciseId = c.req.param('id');
  const db = c.env.DB;
  const limit = c.req.query('limit') || 20;

  const history = await db.prepare(
    `SELECT 
       w.start_time,
       w.id as workout_id,
       s.weight_kg,
       s.reps,
       s.one_rep_max_kg,
       s.set_number
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
     ORDER BY w.start_time DESC, s.set_number ASC
     LIMIT ?`
  ).bind(exerciseId, user.id, limit).all();

  return c.json({ history: history.results });
});

// Get exercise personal records
exercises.get('/:id/records', async (c) => {
  const user = requireAuth(c);
  const exerciseId = c.req.param('id');
  const db = c.env.DB;

  // Get max weight
  const maxWeight = await db.prepare(
    `SELECT s.weight_kg, s.reps, w.start_time
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
     ORDER BY s.weight_kg DESC
     LIMIT 1`
  ).bind(exerciseId, user.id).first();

  // Get max reps
  const maxReps = await db.prepare(
    `SELECT s.weight_kg, s.reps, w.start_time
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
     ORDER BY s.reps DESC
     LIMIT 1`
  ).bind(exerciseId, user.id).first();

  // Get max 1RM
  const max1RM = await db.prepare(
    `SELECT s.weight_kg, s.reps, s.one_rep_max_kg, w.start_time
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
     ORDER BY s.one_rep_max_kg DESC
     LIMIT 1`
  ).bind(exerciseId, user.id).first();

  // Get total volume
  const exercise = await db.prepare(
    'SELECT is_unilateral FROM exercises WHERE id = ?'
  ).bind(exerciseId).first();

  const totalVolume = await db.prepare(
    `SELECT 
       SUM(CASE WHEN ? THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as total_volume,
       COUNT(*) as total_sets
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1`
  ).bind(exercise.is_unilateral, exerciseId, user.id).first();

  return c.json({
    records: {
      max_weight: maxWeight,
      max_reps: maxReps,
      max_one_rep_max: max1RM,
      total_volume: totalVolume?.total_volume || 0,
      total_sets: totalVolume?.total_sets || 0
    }
  });
});

// Get stretches
exercises.get('/stretches/all', async (c) => {
  const db = c.env.DB;
  const muscleGroup = c.req.query('muscle_group');

  let query = 'SELECT * FROM stretches WHERE 1=1';
  const params = [];

  if (muscleGroup) {
    query += ' AND muscle_group = ?';
    params.push(muscleGroup);
  }

  query += ' ORDER BY muscle_group, name';

  const result = await db.prepare(query).bind(...params).all();

  return c.json({ stretches: result.results });
});

export default exercises;
