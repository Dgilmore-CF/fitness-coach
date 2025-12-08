import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { calculateOneRepMax, getAIRecommendations } from '../services/ai';

const workouts = new Hono();

// Get user workouts
workouts.get('/', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const limit = c.req.query('limit') || 50;
  const offset = c.req.query('offset') || 0;

  const workoutsList = await db.prepare(
    `SELECT w.*, p.name as program_name, pd.name as day_name
     FROM workouts w
     LEFT JOIN programs p ON w.program_id = p.id
     LEFT JOIN program_days pd ON w.program_day_id = pd.id
     WHERE w.user_id = ?
     ORDER BY w.start_time DESC
     LIMIT ? OFFSET ?`
  ).bind(user.id, limit, offset).all();

  return c.json({ workouts: workoutsList.results });
});

// Get specific workout
workouts.get('/:id', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('id');
  const db = c.env.DB;

  const workout = await db.prepare(
    `SELECT w.*, p.name as program_name, pd.name as day_name
     FROM workouts w
     LEFT JOIN programs p ON w.program_id = p.id
     LEFT JOIN program_days pd ON w.program_day_id = pd.id
     WHERE w.id = ? AND w.user_id = ?`
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Get workout exercises
  const exercises = await db.prepare(
    `SELECT we.*, e.name, e.muscle_group, e.equipment, e.description, e.tips, e.is_unilateral
     FROM workout_exercises we
     JOIN exercises e ON we.exercise_id = e.id
     WHERE we.workout_id = ?
     ORDER BY we.order_index`
  ).bind(workoutId).all();

  // Get sets for each exercise
  for (const exercise of exercises.results) {
    const sets = await db.prepare(
      'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number'
    ).bind(exercise.id).all();

    exercise.sets = sets.results;
  }

  workout.exercises = exercises.results;

  return c.json({ workout });
});

// Start new workout
workouts.post('/', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { program_id, program_day_id } = body;
  const db = c.env.DB;

  // Create workout
  const workout = await db.prepare(
    `INSERT INTO workouts (user_id, program_id, program_day_id, start_time)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     RETURNING *`
  ).bind(user.id, program_id, program_day_id).first();

  // If program day specified, copy exercises from program
  if (program_day_id) {
    const programExercises = await db.prepare(
      `SELECT pe.*, e.id as exercise_id
       FROM program_exercises pe
       JOIN exercises e ON pe.exercise_id = e.id
       WHERE pe.program_day_id = ?
       ORDER BY pe.order_index`
    ).bind(program_day_id).all();

    for (let i = 0; i < programExercises.results.length; i++) {
      const pe = programExercises.results[i];
      await db.prepare(
        `INSERT INTO workout_exercises (workout_id, exercise_id, program_exercise_id, order_index)
         VALUES (?, ?, ?, ?)`
      ).bind(workout.id, pe.exercise_id, pe.id, i).run();
    }
  }

  return c.json({ workout, message: 'Workout started' });
});

// Update workout
workouts.put('/:id', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('id');
  const body = await c.req.json();
  const { notes } = body;
  const db = c.env.DB;

  const workout = await db.prepare(
    'UPDATE workouts SET notes = ? WHERE id = ? AND user_id = ? RETURNING *'
  ).bind(notes, workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  return c.json({ workout });
});

// Complete workout
workouts.post('/:id/complete', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('id');
  const db = c.env.DB;

  // Calculate total weight and duration
  const stats = await db.prepare(
    `SELECT 
       SUM(CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END) as total_weight
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN exercises e ON we.exercise_id = e.id
     WHERE we.workout_id = ?`
  ).bind(workoutId).first();

  const workout = await db.prepare(
    `UPDATE workouts 
     SET end_time = CURRENT_TIMESTAMP,
         total_duration_seconds = (strftime('%s', 'now') - strftime('%s', start_time)),
         total_weight_kg = ?,
         completed = 1
     WHERE id = ? AND user_id = ?
     RETURNING *`
  ).bind(stats.total_weight || 0, workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Generate AI recommendations
  const ai = c.env.AI;
  await getAIRecommendations(db, ai, user.id, workoutId);

  return c.json({ workout, message: 'Workout completed' });
});

// Add exercise to workout
workouts.post('/:id/exercises', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('id');
  const body = await c.req.json();
  const { exercise_id, program_exercise_id } = body;
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Get current max order index
  const maxOrder = await db.prepare(
    'SELECT COALESCE(MAX(order_index), -1) as max_order FROM workout_exercises WHERE workout_id = ?'
  ).bind(workoutId).first();

  const workoutExercise = await db.prepare(
    `INSERT INTO workout_exercises (workout_id, exercise_id, program_exercise_id, order_index)
     VALUES (?, ?, ?, ?)
     RETURNING *`
  ).bind(workoutId, exercise_id, program_exercise_id, maxOrder.max_order + 1).first();

  return c.json({ workout_exercise: workoutExercise });
});

// Record set
workouts.post('/:workoutId/exercises/:exerciseId/sets', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('workoutId');
  const exerciseId = c.req.param('exerciseId');
  const body = await c.req.json();
  const { weight_kg, reps, rest_seconds } = body;
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Get workout exercise
  const workoutExercise = await db.prepare(
    'SELECT * FROM workout_exercises WHERE id = ? AND workout_id = ?'
  ).bind(exerciseId, workoutId).first();

  if (!workoutExercise) {
    return c.json({ error: 'Exercise not found in workout' }, 404);
  }

  // Get current set count
  const setCount = await db.prepare(
    'SELECT COUNT(*) as count FROM sets WHERE workout_exercise_id = ?'
  ).bind(exerciseId).first();

  // Calculate 1RM
  const oneRepMax = calculateOneRepMax(weight_kg, reps);

  const set = await db.prepare(
    `INSERT INTO sets (workout_exercise_id, set_number, weight_kg, reps, one_rep_max_kg, rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(exerciseId, setCount.count + 1, weight_kg, reps, oneRepMax, rest_seconds).first();

  return c.json({ set });
});

// Update set
workouts.put('/:workoutId/exercises/:exerciseId/sets/:setId', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('workoutId');
  const setId = c.req.param('setId');
  const body = await c.req.json();
  const { weight_kg, reps, rest_seconds } = body;
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Calculate 1RM
  const oneRepMax = calculateOneRepMax(weight_kg, reps);

  const set = await db.prepare(
    `UPDATE sets 
     SET weight_kg = ?, reps = ?, one_rep_max_kg = ?, rest_seconds = ?
     WHERE id = ?
     RETURNING *`
  ).bind(weight_kg, reps, oneRepMax, rest_seconds, setId).first();

  if (!set) {
    return c.json({ error: 'Set not found' }, 404);
  }

  return c.json({ set });
});

// Delete set
workouts.delete('/:workoutId/exercises/:exerciseId/sets/:setId', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('workoutId');
  const setId = c.req.param('setId');
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  const result = await db.prepare(
    'DELETE FROM sets WHERE id = ?'
  ).bind(setId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Set not found' }, 404);
  }

  return c.json({ message: 'Set deleted' });
});

// Update exercise notes
workouts.put('/:workoutId/exercises/:exerciseId/notes', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('workoutId');
  const exerciseId = c.req.param('exerciseId');
  const body = await c.req.json();
  const { notes } = body;
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  const workoutExercise = await db.prepare(
    'UPDATE workout_exercises SET notes = ? WHERE id = ? AND workout_id = ? RETURNING *'
  ).bind(notes, exerciseId, workoutId).first();

  if (!workoutExercise) {
    return c.json({ error: 'Exercise not found' }, 404);
  }

  return c.json({ workout_exercise: workoutExercise });
});

export default workouts;
