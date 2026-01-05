import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const exports = new Hono();

// Export workouts data
exports.get('/workouts', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const format = c.req.query('format') || 'csv';
  const startDate = c.req.query('start');
  const endDate = c.req.query('end');

  try {
    let query = `
      SELECT 
        w.id as workout_id,
        w.start_time,
        w.end_time,
        w.total_duration_seconds,
        w.perceived_exertion,
        w.notes as workout_notes,
        p.name as program_name,
        pd.name as day_name,
        e.name as exercise_name,
        e.muscle_group,
        e.equipment,
        we.target_sets,
        we.notes as exercise_notes,
        s.set_number,
        s.weight_kg,
        s.reps,
        s.rest_seconds,
        s.one_rep_max_kg,
        s.is_warmup,
        s.recorded_at
      FROM workouts w
      LEFT JOIN programs p ON w.program_id = p.id
      LEFT JOIN program_days pd ON w.program_day_id = pd.id
      LEFT JOIN workout_exercises we ON we.workout_id = w.id
      LEFT JOIN exercises e ON we.exercise_id = e.id
      LEFT JOIN sets s ON s.workout_exercise_id = we.id
      WHERE w.user_id = ? AND w.completed = 1
    `;
    
    const params = [user.id];
    
    if (startDate) {
      query += ` AND w.start_time >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND w.start_time <= ?`;
      params.push(endDate + 'T23:59:59');
    }
    
    query += ` ORDER BY w.start_time DESC, we.order_index, s.set_number`;
    
    const result = await db.prepare(query).bind(...params).all();
    const data = result.results || [];

    if (format === 'json') {
      return c.json({ 
        export_type: 'workouts',
        exported_at: new Date().toISOString(),
        record_count: data.length,
        data 
      });
    }

    // CSV format
    const headers = [
      'Workout ID', 'Date', 'End Time', 'Duration (min)', 'Exertion (1-10)',
      'Program', 'Day', 'Exercise', 'Muscle Group', 'Equipment',
      'Set #', 'Weight (kg)', 'Reps', 'Rest (sec)', '1RM (kg)', 'Warmup', 'Notes'
    ];
    
    let csv = headers.join(',') + '\n';
    
    for (const row of data) {
      const values = [
        row.workout_id,
        row.start_time ? new Date(row.start_time).toLocaleDateString() : '',
        row.end_time ? new Date(row.end_time).toLocaleTimeString() : '',
        row.total_duration_seconds ? Math.round(row.total_duration_seconds / 60) : '',
        row.perceived_exertion || '',
        escapeCsv(row.program_name || ''),
        escapeCsv(row.day_name || ''),
        escapeCsv(row.exercise_name || ''),
        escapeCsv(row.muscle_group || ''),
        escapeCsv(row.equipment || ''),
        row.set_number || '',
        row.weight_kg || '',
        row.reps || '',
        row.rest_seconds || '',
        row.one_rep_max_kg ? row.one_rep_max_kg.toFixed(1) : '',
        row.is_warmup ? 'Yes' : 'No',
        escapeCsv(row.exercise_notes || row.workout_notes || '')
      ];
      csv += values.join(',') + '\n';
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="workouts_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting workouts:', error);
    return c.json({ error: 'Failed to export workouts' }, 500);
  }
});

// Export nutrition data
exports.get('/nutrition', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const format = c.req.query('format') || 'csv';
  const startDate = c.req.query('start');
  const endDate = c.req.query('end');

  try {
    let query = `
      SELECT 
        date,
        protein_grams,
        water_ml,
        notes,
        created_at,
        updated_at
      FROM nutrition_log
      WHERE user_id = ?
    `;
    
    const params = [user.id];
    
    if (startDate) {
      query += ` AND date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND date <= ?`;
      params.push(endDate);
    }
    
    query += ` ORDER BY date DESC`;
    
    const result = await db.prepare(query).bind(...params).all();
    const data = result.results || [];

    if (format === 'json') {
      return c.json({ 
        export_type: 'nutrition',
        exported_at: new Date().toISOString(),
        record_count: data.length,
        data 
      });
    }

    // CSV format
    const headers = ['Date', 'Protein (g)', 'Water (ml)', 'Notes'];
    let csv = headers.join(',') + '\n';
    
    for (const row of data) {
      const values = [
        row.date,
        row.protein_grams || 0,
        row.water_ml || 0,
        escapeCsv(row.notes || '')
      ];
      csv += values.join(',') + '\n';
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="nutrition_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting nutrition:', error);
    return c.json({ error: 'Failed to export nutrition data' }, 500);
  }
});

// Export personal records
exports.get('/records', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const format = c.req.query('format') || 'csv';

  try {
    const result = await db.prepare(`
      SELECT 
        e.name as exercise_name,
        e.muscle_group,
        e.equipment,
        MAX(s.weight_kg) as max_weight_kg,
        MAX(s.one_rep_max_kg) as max_1rm_kg,
        MAX(s.reps) as max_reps,
        COUNT(DISTINCT w.id) as total_workouts,
        SUM(s.weight_kg * s.reps) as total_volume_kg
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN exercises e ON we.exercise_id = e.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ? AND w.completed = 1
      GROUP BY e.id
      ORDER BY total_volume_kg DESC
    `).bind(user.id).all();
    
    const data = result.results || [];

    if (format === 'json') {
      return c.json({ 
        export_type: 'personal_records',
        exported_at: new Date().toISOString(),
        record_count: data.length,
        data 
      });
    }

    // CSV format
    const headers = ['Exercise', 'Muscle Group', 'Equipment', 'Max Weight (kg)', 'Max 1RM (kg)', 'Max Reps', 'Total Workouts', 'Total Volume (kg)'];
    let csv = headers.join(',') + '\n';
    
    for (const row of data) {
      const values = [
        escapeCsv(row.exercise_name),
        escapeCsv(row.muscle_group || ''),
        escapeCsv(row.equipment || ''),
        row.max_weight_kg ? row.max_weight_kg.toFixed(1) : '',
        row.max_1rm_kg ? row.max_1rm_kg.toFixed(1) : '',
        row.max_reps || '',
        row.total_workouts || 0,
        row.total_volume_kg ? Math.round(row.total_volume_kg) : 0
      ];
      csv += values.join(',') + '\n';
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="personal_records_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting records:', error);
    return c.json({ error: 'Failed to export personal records' }, 500);
  }
});

// Export body measurements / health data
exports.get('/measurements', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const format = c.req.query('format') || 'csv';
  const startDate = c.req.query('start');
  const endDate = c.req.query('end');

  try {
    let query = `
      SELECT 
        data_type,
        value,
        unit,
        recorded_at,
        source
      FROM health_data
      WHERE user_id = ?
    `;
    
    const params = [user.id];
    
    if (startDate) {
      query += ` AND recorded_at >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND recorded_at <= ?`;
      params.push(endDate + 'T23:59:59');
    }
    
    query += ` ORDER BY recorded_at DESC`;
    
    const result = await db.prepare(query).bind(...params).all();
    const data = result.results || [];

    if (format === 'json') {
      return c.json({ 
        export_type: 'measurements',
        exported_at: new Date().toISOString(),
        record_count: data.length,
        data 
      });
    }

    // CSV format
    const headers = ['Date', 'Type', 'Value', 'Unit', 'Source'];
    let csv = headers.join(',') + '\n';
    
    for (const row of data) {
      const values = [
        row.recorded_at ? new Date(row.recorded_at).toLocaleDateString() : '',
        escapeCsv(row.data_type || ''),
        row.value || '',
        escapeCsv(row.unit || ''),
        escapeCsv(row.source || '')
      ];
      csv += values.join(',') + '\n';
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="measurements_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting measurements:', error);
    return c.json({ error: 'Failed to export measurements' }, 500);
  }
});

// Export all data (comprehensive)
exports.get('/all', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const startDate = c.req.query('start');
  const endDate = c.req.query('end');

  try {
    // Get user profile
    const profile = await db.prepare(
      'SELECT name, email, age, height_cm, weight_kg, measurement_system, created_at FROM users WHERE id = ?'
    ).bind(user.id).first();

    // Build workout query with proper parameter binding
    let workoutQuery = `
      SELECT 
        w.id, w.start_time, w.end_time, w.total_duration_seconds, w.perceived_exertion, w.notes,
        p.name as program_name, pd.name as day_name
      FROM workouts w
      LEFT JOIN programs p ON w.program_id = p.id
      LEFT JOIN program_days pd ON w.program_day_id = pd.id
      WHERE w.user_id = ? AND w.completed = 1
    `;
    const workoutParams = [user.id];
    
    if (startDate) {
      workoutQuery += ` AND w.start_time >= ?`;
      workoutParams.push(startDate);
    }
    if (endDate) {
      workoutQuery += ` AND w.start_time <= ?`;
      workoutParams.push(endDate + 'T23:59:59');
    }
    workoutQuery += ` ORDER BY w.start_time DESC`;

    const workoutsResult = await db.prepare(workoutQuery).bind(...workoutParams).all();

    const workouts = [];
    for (const workout of workoutsResult.results || []) {
      const exercisesResult = await db.prepare(`
        SELECT we.id, we.target_sets, we.notes, e.name, e.muscle_group, e.equipment
        FROM workout_exercises we
        JOIN exercises e ON we.exercise_id = e.id
        WHERE we.workout_id = ?
        ORDER BY we.order_index
      `).bind(workout.id).all();

      const exercises = [];
      for (const ex of exercisesResult.results || []) {
        const setsResult = await db.prepare(`
          SELECT set_number, weight_kg, reps, rest_seconds, one_rep_max_kg, is_warmup, recorded_at
          FROM sets WHERE workout_exercise_id = ? ORDER BY set_number
        `).bind(ex.id).all();
        
        exercises.push({
          ...ex,
          sets: setsResult.results || []
        });
      }

      workouts.push({
        ...workout,
        exercises
      });
    }

    // Build nutrition query with proper parameter binding
    let nutritionQuery = `SELECT date, protein_grams, water_ml, notes FROM nutrition_log WHERE user_id = ?`;
    const nutritionParams = [user.id];
    
    if (startDate) {
      nutritionQuery += ` AND date >= ?`;
      nutritionParams.push(startDate);
    }
    if (endDate) {
      nutritionQuery += ` AND date <= ?`;
      nutritionParams.push(endDate);
    }
    nutritionQuery += ` ORDER BY date DESC`;
    
    const nutritionResult = await db.prepare(nutritionQuery).bind(...nutritionParams).all();

    // Build health query with proper parameter binding
    let healthQuery = `SELECT data_type, value, unit, recorded_at, source FROM health_data WHERE user_id = ?`;
    const healthParams = [user.id];
    
    if (startDate) {
      healthQuery += ` AND recorded_at >= ?`;
      healthParams.push(startDate);
    }
    if (endDate) {
      healthQuery += ` AND recorded_at <= ?`;
      healthParams.push(endDate + 'T23:59:59');
    }
    healthQuery += ` ORDER BY recorded_at DESC`;
    
    const healthResult = await db.prepare(healthQuery).bind(...healthParams).all();

    // Get programs
    const programsResult = await db.prepare(`
      SELECT id, name, days_per_week, goal, is_active, created_at
      FROM programs WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(user.id).all();

    // Get personal records
    const recordsResult = await db.prepare(`
      SELECT 
        e.name as exercise_name,
        e.muscle_group,
        MAX(s.weight_kg) as max_weight_kg,
        MAX(s.one_rep_max_kg) as max_1rm_kg
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN exercises e ON we.exercise_id = e.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ? AND w.completed = 1
      GROUP BY e.id
    `).bind(user.id).all();

    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        date_range: {
          start: startDate || 'all time',
          end: endDate || 'present'
        },
        app: 'AI Fitness Coach',
        version: '1.0'
      },
      profile: {
        name: profile?.name,
        email: profile?.email,
        age: profile?.age,
        height_cm: profile?.height_cm,
        weight_kg: profile?.weight_kg,
        measurement_system: profile?.measurement_system,
        member_since: profile?.created_at
      },
      summary: {
        total_workouts: workouts.length,
        total_nutrition_days: (nutritionResult.results || []).length,
        total_programs: (programsResult.results || []).length,
        exercises_tracked: (recordsResult.results || []).length
      },
      workouts,
      nutrition: nutritionResult.results || [],
      health_data: healthResult.results || [],
      programs: programsResult.results || [],
      personal_records: recordsResult.results || []
    };

    return c.json(exportData);
  } catch (error) {
    console.error('Error exporting all data:', error);
    return c.json({ error: 'Failed to export data: ' + error.message }, 500);
  }
});

// Helper function to escape CSV values
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default exports;
