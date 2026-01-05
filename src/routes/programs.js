import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { generateProgram } from '../services/ai';

const programs = new Hono();

// Generate AI workout program
programs.post('/generate', async (c) => {
  const user = requireAuth(c);
  
  try {
    const body = await c.req.json();
    const { days_per_week, goal = 'hypertrophy', custom_instructions = '', available_equipment = [] } = body;

    if (!days_per_week || days_per_week < 1 || days_per_week > 7) {
      return c.json({ error: 'Invalid days_per_week' }, 400);
    }

    const db = c.env.DB;
    const ai = c.env.AI;

    // Get all available exercises
    const exercises = await db.prepare(
      'SELECT * FROM exercises'
    ).all();

    if (!exercises.results || exercises.results.length === 0) {
      return c.json({ error: 'No exercises found in database' }, 500);
    }

    // Generate program using AI with timeout protection
    let programData;
    try {
      programData = await generateProgram(ai, {
        user,
        days_per_week,
        goal,
        custom_instructions,
        exercises: exercises.results,
        available_equipment
      });
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return c.json({ error: 'AI program generation failed. Please try again.' }, 500);
    }

    if (!programData || !programData.days || programData.days.length === 0) {
      return c.json({ error: 'Failed to generate program structure. Please try again.' }, 500);
    }

    // Debug logging - check what we got from AI
    console.log('=== PROGRAM DATA FROM AI ===');
    console.log(`Program name: ${programData.name}`);
    console.log(`Days count: ${programData.days.length}`);
    for (const day of programData.days) {
      console.log(`Day ${day.day_number}: ${day.name}`);
      console.log(`  - is_cardio_day: ${day.is_cardio_day}`);
      console.log(`  - exercises: ${day.exercises ? day.exercises.length : 'undefined'}`);
      if (day.exercises && day.exercises.length > 0) {
        day.exercises.forEach((ex, i) => {
          console.log(`    ${i+1}. ${ex.name} (id: ${ex.exercise_id})`);
        });
      }
    }
    console.log('=== END PROGRAM DATA ===');

    // Create program in database with custom_instructions
    const program = await db.prepare(
      `INSERT INTO programs (user_id, name, description, days_per_week, goal, equipment, ai_generated, active, custom_instructions)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
       RETURNING *`
    ).bind(
      user.id,
      programData.name,
      programData.description || `AI-generated ${days_per_week}-day ${goal} training program designed for your fitness goals.`,
      days_per_week,
      goal,
      'Smith Machine, Olympic Bar, Cable Trainer, Leg Extension/Curl, Rower',
      custom_instructions || ''
    ).first();

    if (!program) {
      return c.json({ error: 'Failed to save program to database' }, 500);
    }

    // Deactivate other programs
    await db.prepare(
      'UPDATE programs SET active = 0 WHERE user_id = ? AND id != ?'
    ).bind(user.id, program.id).run();

    // Create program days and exercises/cardio sessions
    for (const day of programData.days) {
      const isCardioDay = day.is_cardio_day || false;
      
      const programDay = await db.prepare(
        `INSERT INTO program_days (program_id, day_number, name, focus, is_cardio_day)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *`
      ).bind(program.id, day.day_number, day.name, day.focus, isCardioDay ? 1 : 0).first();

      // Handle cardio days differently - add cardio sessions instead of exercises
      if (isCardioDay && day.cardio_sessions && day.cardio_sessions.length > 0) {
        for (let i = 0; i < day.cardio_sessions.length; i++) {
          const session = day.cardio_sessions[i];
          await db.prepare(
            `INSERT INTO program_day_cardio_sessions 
             (program_day_id, order_index, name, duration_minutes, heart_rate_zone, zone_name, zone_description, activity_suggestions, interval_structure)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            programDay.id,
            i,
            session.name,
            session.duration_minutes,
            session.heart_rate_zone,
            session.zone_name || null,
            session.zone_description || null,
            session.activity_suggestions || null,
            session.interval_structure || null
          ).run();
        }
      } else {
        // Add exercises to program day (strength training days)
        if (day.exercises && day.exercises.length > 0) {
          for (let i = 0; i < day.exercises.length; i++) {
            const exercise = day.exercises[i];
            if (exercise.exercise_id) {
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
          }
        }

        // Add stretches to program day (only for strength training days)
        // Use broader search to ensure adequate stretches for all day types
        if (day.muscle_groups && day.muscle_groups.length > 0 && !day.muscle_groups.includes('Cardio')) {
          // Expand muscle groups to related areas for better stretch coverage
          let stretchMuscleGroups = [...day.muscle_groups];
          
          // Add related muscle groups for better stretch coverage
          if (day.muscle_groups.includes('Back') || day.muscle_groups.includes('Biceps')) {
            stretchMuscleGroups.push('Shoulders', 'Core', 'Back', 'Biceps');
          }
          if (day.muscle_groups.includes('Chest') || day.muscle_groups.includes('Triceps')) {
            stretchMuscleGroups.push('Shoulders', 'Chest', 'Triceps');
          }
          if (day.muscle_groups.some(mg => ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(mg))) {
            stretchMuscleGroups.push('Hip Flexors', 'Hips', 'Glutes', 'Hamstrings', 'Quads', 'Calves');
          }
          
          // Remove duplicates
          stretchMuscleGroups = [...new Set(stretchMuscleGroups)];
          
          const stretches = await db.prepare(
            `SELECT DISTINCT * FROM stretches WHERE muscle_group IN (${stretchMuscleGroups.map(() => '?').join(',')})
             LIMIT 5`
          ).bind(...stretchMuscleGroups).all();

          for (let i = 0; i < stretches.results.length; i++) {
            await db.prepare(
              `INSERT INTO program_day_stretches (program_day_id, stretch_id, order_index)
               VALUES (?, ?, ?)`
            ).bind(programDay.id, stretches.results[i].id, i).run();
          }
        }
      }
    }

    return c.json({ program, message: 'Program generated successfully' });
  } catch (error) {
    console.error('Program generation error:', error);
    return c.json({ error: 'An unexpected error occurred while generating the program. Please try again.' }, 500);
  }
});

// Create manual program
programs.post('/manual', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { name, description, days_per_week, goal, days } = body;

  if (!name || !days_per_week || !days || days.length === 0) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const db = c.env.DB;

  // Create program in database
  const program = await db.prepare(
    `INSERT INTO programs (user_id, name, description, days_per_week, goal, equipment, ai_generated, active)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0)
     RETURNING *`
  ).bind(
    user.id,
    name,
    description || `Custom ${days_per_week}-day training program.`,
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

// Rename/update program
programs.patch('/:id', async (c) => {
  const user = requireAuth(c);
  const programId = c.req.param('id');
  const db = c.env.DB;
  
  const body = await c.req.json();
  const { name } = body;
  
  if (!name || name.trim().length === 0) {
    return c.json({ error: 'Program name is required' }, 400);
  }
  
  // Verify ownership
  const existing = await db.prepare(
    'SELECT id FROM programs WHERE id = ? AND user_id = ?'
  ).bind(programId, user.id).first();
  
  if (!existing) {
    return c.json({ error: 'Program not found' }, 404);
  }
  
  // Update program name
  await db.prepare(
    'UPDATE programs SET name = ? WHERE id = ?'
  ).bind(name.trim(), programId).run();
  
  return c.json({ success: true, message: 'Program renamed successfully' });
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

  // Get exercises, stretches, and cardio sessions for each day
  for (const day of days.results) {
    // Check if this is a cardio day
    if (day.is_cardio_day) {
      // Get cardio sessions for cardio days
      const cardioSessions = await db.prepare(
        `SELECT * FROM program_day_cardio_sessions
         WHERE program_day_id = ?
         ORDER BY order_index`
      ).bind(day.id).all();
      
      day.cardio_sessions = cardioSessions.results;
      day.exercises = [];
      day.stretches = [];
    } else {
      // Get exercises for strength training days
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
      day.cardio_sessions = [];
    }
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

// Reorder exercises within a program day
programs.patch('/days/:dayId/reorder', async (c) => {
  const user = requireAuth(c);
  const dayId = c.req.param('dayId');
  const db = c.env.DB;

  try {
    const body = await c.req.json();
    const { exercise_order } = body; // Array of exercise IDs in new order

    if (!Array.isArray(exercise_order) || exercise_order.length === 0) {
      return c.json({ error: 'exercise_order must be a non-empty array' }, 400);
    }

    // Verify the program day belongs to the user
    const day = await db.prepare(
      `SELECT pd.* FROM program_days pd
       JOIN programs p ON pd.program_id = p.id
       WHERE pd.id = ? AND p.user_id = ?`
    ).bind(dayId, user.id).first();

    if (!day) {
      return c.json({ error: 'Program day not found' }, 404);
    }

    // Update order_index for each exercise
    for (let i = 0; i < exercise_order.length; i++) {
      await db.prepare(
        'UPDATE program_exercises SET order_index = ? WHERE id = ? AND program_day_id = ?'
      ).bind(i, exercise_order[i], dayId).run();
    }

    return c.json({ success: true, message: 'Exercises reordered successfully' });
  } catch (error) {
    console.error('Error reordering exercises:', error);
    return c.json({ error: 'Failed to reorder exercises' }, 500);
  }
});

export default programs;
