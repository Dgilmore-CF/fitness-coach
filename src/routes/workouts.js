import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { calculateOneRepMax, getAIRecommendations } from '../services/ai';
import { checkAndAwardAchievements } from '../services/achievements';

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

  // Check and award achievements
  const newAchievements = await checkAndAwardAchievements(db, user.id, workoutId);

  return c.json({ 
    workout, 
    message: 'Workout completed',
    achievements: newAchievements
  });
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

// Update target sets for an exercise in workout
workouts.patch('/:workoutId/exercises/:exerciseId/target-sets', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('workoutId');
  const exerciseId = c.req.param('exerciseId');
  const db = c.env.DB;
  const { target_sets } = await c.req.json();

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Validate target_sets
  if (!target_sets || target_sets < 1 || target_sets > 10) {
    return c.json({ error: 'Target sets must be between 1 and 10' }, 400);
  }

  // Update target sets for this exercise in this workout
  await db.prepare(
    'UPDATE workout_exercises SET target_sets = ? WHERE workout_id = ? AND id = ?'
  ).bind(target_sets, workoutId, exerciseId).run();

  return c.json({ message: 'Target sets updated', target_sets });
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

// Delete workout
workouts.delete('/:id', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('id');
  const db = c.env.DB;

  try {
    // Verify workout belongs to user
    const workout = await db.prepare(
      'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
    ).bind(workoutId, user.id).first();

    if (!workout) {
      return c.json({ error: 'Workout not found' }, 404);
    }

    // Delete all related data that might not have CASCADE
    // Health data (ON DELETE SET NULL, but we'll clean it up)
    await db.prepare('DELETE FROM health_data WHERE workout_id = ?').bind(workoutId).run();
    
    // Personal records (will be SET NULL after migration, but delete explicitly for safety)
    await db.prepare('UPDATE personal_records SET workout_id = NULL WHERE workout_id = ?').bind(workoutId).run();
    
    // Delete the workout itself
    // CASCADE will handle: workout_exercises -> sets automatically
    await db.prepare('DELETE FROM workouts WHERE id = ?').bind(workoutId).run();

    return c.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return c.json({ 
      error: 'Failed to delete workout', 
      details: error.message 
    }, 500);
  }
});

// Mark workout as cardio
workouts.put('/:id/cardio', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('id');
  const body = await c.req.json();
  const { is_cardio, cardio_type, duration_minutes, distance, notes } = body;
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Update workout with cardio information
  const updated = await db.prepare(`
    UPDATE workouts 
    SET notes = ?, completed = 1, end_time = CURRENT_TIMESTAMP
    WHERE id = ? 
    RETURNING *
  `).bind(
    `CARDIO SESSION${cardio_type ? ` - ${cardio_type}` : ''}${duration_minutes ? ` - ${duration_minutes} min` : ''}${distance ? ` - ${distance}` : ''}${notes ? `\n\n${notes}` : ''}`,
    workoutId
  ).first();

  return c.json({ workout: updated });
});

export default workouts;
