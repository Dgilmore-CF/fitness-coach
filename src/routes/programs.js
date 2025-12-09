import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { generateProgram } from '../services/ai';

const programs = new Hono();

// Generate AI workout program
programs.post('/generate', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { days_per_week, goal = 'hypertrophy' } = body;

  if (!days_per_week || days_per_week < 1 || days_per_week > 7) {
    return c.json({ error: 'Invalid days_per_week' }, 400);
  }

  const db = c.env.DB;
  const ai = c.env.AI;

  // Get all available exercises
  const exercises = await db.prepare(
    'SELECT * FROM exercises'
  ).all();

  // Generate program using AI
  const programData = await generateProgram(ai, {
    user,
    days_per_week,
    goal,
    exercises: exercises.results
  });

  // Create program in database
  const program = await db.prepare(
    `INSERT INTO programs (user_id, name, days_per_week, goal, equipment, ai_generated, active)
     VALUES (?, ?, ?, ?, ?, 1, 1)
     RETURNING *`
  ).bind(
    user.id,
    programData.name,
    days_per_week,
    goal,
    'Smith Machine, Olympic Bar, Cable Trainer, Leg Extension/Curl, Rower'
  ).first();

  // Deactivate other programs
  await db.prepare(
    'UPDATE programs SET active = 0 WHERE user_id = ? AND id != ?'
  ).bind(user.id, program.id).run();

  // Create program days and exercises
  for (const day of programData.days) {
    const programDay = await db.prepare(
      `INSERT INTO program_days (program_id, day_number, name, focus)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    ).bind(program.id, day.day_number, day.name, day.focus).first();

    // Add exercises to program day
    for (let i = 0; i < day.exercises.length; i++) {
      const exercise = day.exercises[i];
      await db.prepare(
        `INSERT INTO program_exercises (program_day_id, exercise_id, order_index, target_sets, target_reps, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        programDay.id,
        exercise.exercise_id,
        i,
        exercise.sets,
        exercise.reps,
        exercise.rest_seconds
      ).run();
    }

    // Add stretches to program day
    const stretches = await db.prepare(
      `SELECT * FROM stretches WHERE muscle_group IN (${day.muscle_groups.map(() => '?').join(',')})
       LIMIT 5`
    ).bind(...day.muscle_groups).all();

    for (let i = 0; i < stretches.results.length; i++) {
      await db.prepare(
        `INSERT INTO program_day_stretches (program_day_id, stretch_id, order_index)
         VALUES (?, ?, ?)`
      ).bind(programDay.id, stretches.results[i].id, i).run();
    }
  }

  return c.json({ program, message: 'Program generated successfully' });
});

// Create manual program
programs.post('/manual', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { name, days_per_week, goal, days } = body;

  if (!name || !days_per_week || !days || days.length === 0) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const db = c.env.DB;

  // Create program in database
  const program = await db.prepare(
    `INSERT INTO programs (user_id, name, days_per_week, goal, equipment, ai_generated, active)
     VALUES (?, ?, ?, ?, ?, 0, 0)
     RETURNING *`
  ).bind(
    user.id,
    name,
    days_per_week,
    goal || 'hypertrophy',
    'Custom Selection'
  ).first();

  // Create program days and exercises
  for (const day of days) {
    const programDay = await db.prepare(
      `INSERT INTO program_days (program_id, day_number, name, focus)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    ).bind(program.id, day.day_number, day.name, day.focus || 'Custom workout').first();

    // Add exercises to program day
    for (let i = 0; i < day.exercises.length; i++) {
      const exercise = day.exercises[i];
      await db.prepare(
        `INSERT INTO program_exercises (program_day_id, exercise_id, order_index, target_sets, target_reps, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        programDay.id,
        exercise.exercise_id,
        i,
        exercise.sets || 3,
        exercise.reps || '8-12',
        exercise.rest_seconds || 90
      ).run();
    }

    // Add stretches if provided
    if (day.stretch_ids && day.stretch_ids.length > 0) {
      for (let i = 0; i < day.stretch_ids.length; i++) {
        await db.prepare(
          `INSERT INTO program_day_stretches (program_day_id, stretch_id, order_index)
           VALUES (?, ?, ?)`
        ).bind(programDay.id, day.stretch_ids[i], i).run();
      }
    }
  }

  return c.json({ program, message: 'Custom program created successfully' });
});

// Get user programs
programs.get('/', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  const programsList = await db.prepare(
    'SELECT * FROM programs WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all();

  return c.json({ programs: programsList.results });
});

// Get specific program with details
programs.get('/:id', async (c) => {
  const user = requireAuth(c);
  const programId = c.req.param('id');
  const db = c.env.DB;

  const program = await db.prepare(
    'SELECT * FROM programs WHERE id = ? AND user_id = ?'
  ).bind(programId, user.id).first();

  if (!program) {
    return c.json({ error: 'Program not found' }, 404);
  }

  // Get program days
  const days = await db.prepare(
    'SELECT * FROM program_days WHERE program_id = ? ORDER BY day_number'
  ).bind(programId).all();

  // Get exercises and stretches for each day
  for (const day of days.results) {
    // Get exercises
    const exercises = await db.prepare(
      `SELECT pe.*, e.name, e.muscle_group, e.equipment, e.description, e.tips, e.is_unilateral
       FROM program_exercises pe
       JOIN exercises e ON pe.exercise_id = e.id
       WHERE pe.program_day_id = ?
       ORDER BY pe.order_index`
    ).bind(day.id).all();

    day.exercises = exercises.results;

    // Get stretches
    const stretches = await db.prepare(
      `SELECT pds.*, s.name, s.muscle_group, s.description, s.duration_seconds
       FROM program_day_stretches pds
       JOIN stretches s ON pds.stretch_id = s.id
       WHERE pds.program_day_id = ?
       ORDER BY pds.order_index`
    ).bind(day.id).all();

    day.stretches = stretches.results;
  }

  program.days = days.results;

  return c.json({ program });
});

// Activate program
programs.post('/:id/activate', async (c) => {
  const user = requireAuth(c);
  const programId = c.req.param('id');
  const db = c.env.DB;

  // Deactivate all programs
  await db.prepare(
    'UPDATE programs SET active = 0 WHERE user_id = ?'
  ).bind(user.id).run();

  // Activate selected program
  const program = await db.prepare(
    'UPDATE programs SET active = 1 WHERE id = ? AND user_id = ? RETURNING *'
  ).bind(programId, user.id).first();

  if (!program) {
    return c.json({ error: 'Program not found' }, 404);
  }

  return c.json({ program, message: 'Program activated' });
});

// Delete program
programs.delete('/:id', async (c) => {
  const user = requireAuth(c);
  const programId = c.req.param('id');
  const db = c.env.DB;

  const result = await db.prepare(
    'DELETE FROM programs WHERE id = ? AND user_id = ?'
  ).bind(programId, user.id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Program not found' }, 404);
  }

  return c.json({ message: 'Program deleted successfully' });
});

export default programs;
