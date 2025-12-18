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
    `SELECT w.*, p.name as program_name, pd.name as day_name,
       (SELECT COUNT(DISTINCT we.id) FROM workout_exercises we 
        JOIN sets s ON s.workout_exercise_id = we.id 
        WHERE we.workout_id = w.id) as exercise_count,
       (SELECT COUNT(*) FROM sets s 
        JOIN workout_exercises we ON s.workout_exercise_id = we.id 
        WHERE we.workout_id = w.id) as total_sets
     FROM workouts w
     LEFT JOIN programs p ON w.program_id = p.id
     LEFT JOIN program_days pd ON w.program_day_id = pd.id
     WHERE w.user_id = ?
     ORDER BY w.start_time DESC
     LIMIT ? OFFSET ?`
  ).bind(user.id, limit, offset).all();

  return c.json({ workouts: workoutsList.results });
});

// Get last recorded set for an exercise from previous workouts
// NOTE: This route must be before /:id to avoid route conflicts
workouts.get('/exercises/:exerciseId/last-set', async (c) => {
  const user = requireAuth(c);
  const exerciseId = c.req.param('exerciseId');
  const currentWorkoutId = c.req.query('currentWorkoutId');
  const db = c.env.DB;

  // Find the most recent set for this exercise from a completed workout (not the current one)
  const lastSet = await db.prepare(
    `SELECT s.weight_kg, s.reps, s.set_number, w.start_time
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.exercise_id = ? 
       AND w.user_id = ?
       AND w.id != ?
       AND w.end_time IS NOT NULL
     ORDER BY w.start_time DESC, s.set_number DESC
     LIMIT 1`
  ).bind(exerciseId, user.id, currentWorkoutId || 0).first();

  return c.json({ lastSet });
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

  // Get workout exercises with program exercise details
  const exercises = await db.prepare(
    `SELECT we.*, e.name, e.muscle_group, e.equipment, e.description, e.tips, e.is_unilateral,
            pe.target_sets, pe.target_reps
     FROM workout_exercises we
     JOIN exercises e ON we.exercise_id = e.id
     LEFT JOIN program_exercises pe ON we.program_exercise_id = pe.id
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
  
  // Get optional perceived exertion from body
  let perceivedExertion = null;
  try {
    const body = await c.req.json();
    if (body.perceived_exertion && body.perceived_exertion >= 1 && body.perceived_exertion <= 10) {
      perceivedExertion = body.perceived_exertion;
    }
  } catch (e) {
    // No body or invalid JSON - that's fine, perceived_exertion is optional
  }

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
         completed = 1,
         perceived_exertion = ?
     WHERE id = ? AND user_id = ?
     RETURNING *`
  ).bind(stats.total_weight || 0, perceivedExertion, workoutId, user.id).first();

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

// Update perceived exertion for a completed workout
workouts.patch('/:id/perceived-exertion', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json();
  const { perceived_exertion } = body;
  
  if (!perceived_exertion || perceived_exertion < 1 || perceived_exertion > 10) {
    return c.json({ error: 'Perceived exertion must be between 1 and 10' }, 400);
  }
  
  const workout = await db.prepare(
    `UPDATE workouts 
     SET perceived_exertion = ?
     WHERE id = ? AND user_id = ?
     RETURNING *`
  ).bind(perceived_exertion, workoutId, user.id).first();
  
  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }
  
  return c.json({ workout, message: 'Perceived exertion updated' });
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

// Record set (supports both strength and cardio)
workouts.post('/:workoutId/exercises/:exerciseId/sets', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('workoutId');
  const exerciseId = c.req.param('exerciseId');
  const body = await c.req.json();
  const { weight_kg, reps, rest_seconds, duration_seconds, calories_burned, distance_meters, avg_heart_rate } = body;
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Get workout exercise with exercise details
  const workoutExercise = await db.prepare(
    `SELECT we.*, e.muscle_group FROM workout_exercises we
     JOIN exercises e ON we.exercise_id = e.id
     WHERE we.id = ? AND we.workout_id = ?`
  ).bind(exerciseId, workoutId).first();

  if (!workoutExercise) {
    return c.json({ error: 'Exercise not found in workout' }, 404);
  }

  // Get current set count
  const setCount = await db.prepare(
    'SELECT COUNT(*) as count FROM sets WHERE workout_exercise_id = ?'
  ).bind(exerciseId).first();

  // Check if this is a cardio exercise
  const isCardio = workoutExercise.muscle_group === 'Cardio';

  let set;
  if (isCardio) {
    // For cardio, store duration and calories instead of weight/reps
    set = await db.prepare(
      `INSERT INTO sets (workout_exercise_id, set_number, weight_kg, reps, duration_seconds, calories_burned, distance_meters, avg_heart_rate, rest_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(exerciseId, setCount.count + 1, weight_kg || 0, reps || 1, duration_seconds, calories_burned, distance_meters, avg_heart_rate, rest_seconds || 0).first();
  } else {
    // For strength exercises, calculate 1RM
    const oneRepMax = calculateOneRepMax(weight_kg, reps);
    set = await db.prepare(
      `INSERT INTO sets (workout_exercise_id, set_number, weight_kg, reps, one_rep_max_kg, rest_seconds)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(exerciseId, setCount.count + 1, weight_kg, reps, oneRepMax, rest_seconds).first();
  }

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
  try {
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
  } catch (error) {
    console.error('Error updating target sets:', error);
    return c.json({ error: 'Failed to update target sets: ' + error.message }, 500);
  }
});

// Delete exercise from workout
workouts.delete('/:workoutId/exercises/:exerciseId', async (c) => {
  const user = requireAuth(c);
  const workoutId = c.req.param('workoutId');
  const exerciseId = c.req.param('exerciseId');
  const db = c.env.DB;

  // Verify workout belongs to user
  const workout = await db.prepare(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
  ).bind(workoutId, user.id).first();

  if (!workout) {
    return c.json({ error: 'Workout not found' }, 404);
  }

  // Delete all sets for this exercise first
  await db.prepare(
    'DELETE FROM sets WHERE workout_exercise_id = ?'
  ).bind(exerciseId).run();

  // Delete the workout exercise
  const result = await db.prepare(
    'DELETE FROM workout_exercises WHERE id = ? AND workout_id = ?'
  ).bind(exerciseId, workoutId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Exercise not found in workout' }, 404);
  }

  return c.json({ message: 'Exercise removed from workout' });
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

// Add exercises to an active workout
workouts.post('/:workoutId/add-exercises', async (c) => {
  try {
    const user = requireAuth(c);
    const workoutId = c.req.param('workoutId');
    const { exercise_ids } = await c.req.json();
    const db = c.env.DB;

    // Verify workout belongs to user and is not completed
    const workout = await db.prepare(
      'SELECT * FROM workouts WHERE id = ? AND user_id = ? AND completed = 0'
    ).bind(workoutId, user.id).first();

    if (!workout) {
      return c.json({ error: 'Workout not found or already completed' }, 404);
    }

    if (!exercise_ids || !Array.isArray(exercise_ids) || exercise_ids.length === 0) {
      return c.json({ error: 'No exercises provided' }, 400);
    }

    // Get current max order_index
    const maxOrder = await db.prepare(
      'SELECT MAX(order_index) as max_idx FROM workout_exercises WHERE workout_id = ?'
    ).bind(workoutId).first();
    
    let orderIndex = (maxOrder?.max_idx ?? -1) + 1;
    const addedExercises = [];

    // Add each exercise to the workout
    for (const exerciseId of exercise_ids) {
      // Verify exercise exists
      const exercise = await db.prepare(
        'SELECT * FROM exercises WHERE id = ?'
      ).bind(exerciseId).first();

      if (exercise) {
        const result = await db.prepare(
          `INSERT INTO workout_exercises (workout_id, exercise_id, order_index, target_sets)
           VALUES (?, ?, ?, 3)
           RETURNING *`
        ).bind(workoutId, exerciseId, orderIndex).first();
        
        addedExercises.push({ ...result, name: exercise.name });
        orderIndex++;
      }
    }

    return c.json({ 
      message: `Added ${addedExercises.length} exercise(s) to workout`,
      exercises: addedExercises
    });
  } catch (error) {
    console.error('Error adding exercises to workout:', error);
    return c.json({ error: 'Failed to add exercises: ' + error.message }, 500);
  }
});

// Save workout exercises to program day (persist changes)
workouts.post('/:workoutId/save-to-program', async (c) => {
  try {
    const user = requireAuth(c);
    const workoutId = c.req.param('workoutId');
    const db = c.env.DB;

    // Get workout with program day info
    const workout = await db.prepare(
      'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
    ).bind(workoutId, user.id).first();

    if (!workout) {
      return c.json({ error: 'Workout not found' }, 404);
    }

    if (!workout.program_day_id) {
      return c.json({ error: 'This workout is not associated with a program day' }, 400);
    }

    // Verify program day belongs to user's program
    const programDay = await db.prepare(
      `SELECT pd.* FROM program_days pd
       JOIN programs p ON pd.program_id = p.id
       WHERE pd.id = ? AND p.user_id = ?`
    ).bind(workout.program_day_id, user.id).first();

    if (!programDay) {
      return c.json({ error: 'Program day not found' }, 404);
    }

    // Get current workout exercises
    const workoutExercises = await db.prepare(
      `SELECT we.exercise_id, we.order_index, we.target_sets
       FROM workout_exercises we
       WHERE we.workout_id = ?
       ORDER BY we.order_index`
    ).bind(workoutId).all();

    // Delete existing program exercises for this day
    await db.prepare(
      'DELETE FROM program_exercises WHERE program_day_id = ?'
    ).bind(workout.program_day_id).run();

    // Insert new program exercises based on workout
    for (const we of workoutExercises.results) {
      await db.prepare(
        `INSERT INTO program_exercises (program_day_id, exercise_id, order_index, target_sets, target_reps, rest_seconds)
         VALUES (?, ?, ?, ?, '8-12', 90)`
      ).bind(workout.program_day_id, we.exercise_id, we.order_index, we.target_sets || 3).run();
    }

    return c.json({ 
      message: 'Program day updated with current workout exercises',
      exercises_count: workoutExercises.results.length
    });
  } catch (error) {
    console.error('Error saving to program:', error);
    return c.json({ error: 'Failed to save to program: ' + error.message }, 500);
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
