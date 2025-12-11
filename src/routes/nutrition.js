import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const nutrition = new Hono();

// Log protein intake
nutrition.post('/protein', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { grams, date } = body;
  const db = c.env.DB;

  const logDate = date || new Date().toISOString().split('T')[0];

  // Upsert nutrition log
  const log = await db.prepare(
    `INSERT INTO nutrition_log (user_id, date, protein_grams, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) 
     DO UPDATE SET 
       protein_grams = protein_grams + excluded.protein_grams,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`
  ).bind(user.id, logDate, grams).first();

  return c.json({ log, message: 'Protein logged' });
});

// Log water intake
nutrition.post('/water', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { ml, date } = body;
  const db = c.env.DB;

  const logDate = date || new Date().toISOString().split('T')[0];

  // Upsert nutrition log
  const log = await db.prepare(
    `INSERT INTO nutrition_log (user_id, date, water_ml, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) 
     DO UPDATE SET 
       water_ml = water_ml + excluded.water_ml,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`
  ).bind(user.id, logDate, ml).first();

  return c.json({ log, message: 'Water logged' });
});

// Log creatine intake
nutrition.post('/creatine', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { grams, date } = body;
  const db = c.env.DB;

  const logDate = date || new Date().toISOString().split('T')[0];

  // Upsert nutrition log
  const log = await db.prepare(
    `INSERT INTO nutrition_log (user_id, date, creatine_grams, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) 
     DO UPDATE SET 
       creatine_grams = creatine_grams + excluded.creatine_grams,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`
  ).bind(user.id, logDate, grams).first();

  return c.json({ log, message: 'Creatine logged' });
});

// Get daily nutrition stats
nutrition.get('/daily', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];

  const log = await db.prepare(
    'SELECT * FROM nutrition_log WHERE user_id = ? AND date = ?'
  ).bind(user.id, date).first();

  // Calculate recommended protein based on weight (2g per kg for hypertrophy)
  const recommendedProtein = user.weight_kg ? user.weight_kg * 2 : 150;
  
  // Recommended water (35ml per kg body weight)
  const recommendedWater = user.weight_kg ? user.weight_kg * 35 : 2500;

  // Recommended creatine (5g per day standard, 0.03g per kg for loading phase)
  // Standard maintenance dose is 5g regardless of weight
  const recommendedCreatine = 5;

  return c.json({
    date,
    protein_grams: log?.protein_grams || 0,
    water_ml: log?.water_ml || 0,
    creatine_grams: log?.creatine_grams || 0,
    protein_goal: recommendedProtein,
    water_goal: recommendedWater,
    creatine_goal: recommendedCreatine,
    protein_percentage: log?.protein_grams ? (log.protein_grams / recommendedProtein) * 100 : 0,
    water_percentage: log?.water_ml ? (log.water_ml / recommendedWater) * 100 : 0,
    creatine_percentage: log?.creatine_grams ? (log.creatine_grams / recommendedCreatine) * 100 : 0
  });
});

// Get nutrition history
nutrition.get('/history', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const days = c.req.query('days') || 30;

  const history = await db.prepare(
    `SELECT * FROM nutrition_log 
     WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
     ORDER BY date DESC`
  ).bind(user.id, days).all();

  // Calculate recommended values
  const recommendedProtein = user.weight_kg ? user.weight_kg * 2 : 150;
  const recommendedWater = user.weight_kg ? user.weight_kg * 35 : 2500;
  const recommendedCreatine = 5;

  const enriched = history.results.map(log => ({
    ...log,
    protein_goal: recommendedProtein,
    water_goal: recommendedWater,
    creatine_goal: recommendedCreatine,
    protein_percentage: (log.protein_grams / recommendedProtein) * 100,
    water_percentage: (log.water_ml / recommendedWater) * 100,
    creatine_percentage: (log.creatine_grams / recommendedCreatine) * 100
  }));

  return c.json({ history: enriched });
});

// Get nutrition analytics and trends
nutrition.get('/analytics', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const days = parseInt(c.req.query('days') || '90');

  // Get historical data
  const history = await db.prepare(
    `SELECT * FROM nutrition_log 
     WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
     ORDER BY date ASC`
  ).bind(user.id, days).all();

  const logs = history.results || [];
  
  // Calculate goals
  const proteinGoal = user.weight_kg ? user.weight_kg * 2 : 150;
  const waterGoal = user.weight_kg ? user.weight_kg * 35 : 2500;
  const creatineGoal = 5;

  // Calculate averages
  const avgProtein = logs.length > 0 
    ? logs.reduce((sum, log) => sum + (log.protein_grams || 0), 0) / logs.length 
    : 0;
  const avgWater = logs.length > 0 
    ? logs.reduce((sum, log) => sum + (log.water_ml || 0), 0) / logs.length 
    : 0;
  const avgCreatine = logs.length > 0 
    ? logs.reduce((sum, log) => sum + (log.creatine_grams || 0), 0) / logs.length 
    : 0;

  // Count days hitting goals
  const proteinGoalDays = logs.filter(log => log.protein_grams >= proteinGoal).length;
  const waterGoalDays = logs.filter(log => log.water_ml >= waterGoal).length;
  const creatineGoalDays = logs.filter(log => log.creatine_grams >= creatineGoal).length;
  const allGoalsDays = logs.filter(log => 
    log.protein_grams >= proteinGoal && 
    log.water_ml >= waterGoal && 
    log.creatine_grams >= creatineGoal
  ).length;

  // Calculate current streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < days; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const log = logs.find(l => l.date === dateStr);
    const hitGoals = log && 
      log.protein_grams >= proteinGoal && 
      log.water_ml >= waterGoal &&
      log.creatine_grams >= creatineGoal;
    
    if (hitGoals) {
      tempStreak++;
      if (i === 0 || currentStreak > 0) {
        currentStreak++;
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      if (i === 0) {
        currentStreak = 0;
      }
      tempStreak = 0;
    }
  }

  // Weekly aggregation
  const weeklyData = [];
  const weeksCount = Math.ceil(logs.length / 7);
  
  for (let week = 0; week < weeksCount; week++) {
    const weekLogs = logs.slice(week * 7, (week + 1) * 7);
    if (weekLogs.length === 0) continue;
    
    const weekStart = weekLogs[0].date;
    const weekEnd = weekLogs[weekLogs.length - 1].date;
    
    weeklyData.push({
      week_start: weekStart,
      week_end: weekEnd,
      avg_protein: weekLogs.reduce((sum, l) => sum + (l.protein_grams || 0), 0) / weekLogs.length,
      avg_water: weekLogs.reduce((sum, l) => sum + (l.water_ml || 0), 0) / weekLogs.length,
      avg_creatine: weekLogs.reduce((sum, l) => sum + (l.creatine_grams || 0), 0) / weekLogs.length,
      days_logged: weekLogs.length,
      days_hit_goals: weekLogs.filter(l => 
        l.protein_grams >= proteinGoal && 
        l.water_ml >= waterGoal &&
        l.creatine_grams >= creatineGoal
      ).length
    });
  }

  return c.json({
    summary: {
      total_days_logged: logs.length,
      avg_protein_daily: Math.round(avgProtein),
      avg_water_daily: Math.round(avgWater),
      avg_creatine_daily: avgCreatine.toFixed(1),
      protein_goal_days: proteinGoalDays,
      water_goal_days: waterGoalDays,
      creatine_goal_days: creatineGoalDays,
      all_goals_days: allGoalsDays,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      protein_goal: proteinGoal,
      water_goal: waterGoal,
      creatine_goal: creatineGoal,
      adherence_rate: logs.length > 0 ? Math.round((allGoalsDays / logs.length) * 100) : 0
    },
    weekly_trends: weeklyData.reverse(),
    daily_data: logs.map(log => ({
      date: log.date,
      protein: log.protein_grams || 0,
      water: log.water_ml || 0,
      creatine: log.creatine_grams || 0,
      protein_goal: proteinGoal,
      water_goal: waterGoal,
      creatine_goal: creatineGoal,
      hit_protein: log.protein_grams >= proteinGoal,
      hit_water: log.water_ml >= waterGoal,
      hit_creatine: log.creatine_grams >= creatineGoal,
      hit_all: log.protein_grams >= proteinGoal && log.water_ml >= waterGoal && log.creatine_grams >= creatineGoal
    }))
  });
});

// Get nutrition streaks
nutrition.get('/streaks', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  // Get last 90 days
  const history = await db.prepare(
    `SELECT * FROM nutrition_log 
     WHERE user_id = ? AND date >= date('now', '-90 days')
     ORDER BY date DESC`
  ).bind(user.id).all();

  const logs = history.results || [];
  const proteinGoal = user.weight_kg ? user.weight_kg * 2 : 150;
  const waterGoal = user.weight_kg ? user.weight_kg * 35 : 2500;
  const creatineGoal = 5;

  // Calculate different streak types
  const streaks = {
    protein: { current: 0, longest: 0 },
    water: { current: 0, longest: 0 },
    creatine: { current: 0, longest: 0 },
    all: { current: 0, longest: 0 }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check each type of streak
  ['protein', 'water', 'creatine', 'all'].forEach(type => {
    let current = 0;
    let longest = 0;
    let temp = 0;

    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const log = logs.find(l => l.date === dateStr);
      let hit = false;

      if (type === 'protein') hit = log && log.protein_grams >= proteinGoal;
      else if (type === 'water') hit = log && log.water_ml >= waterGoal;
      else if (type === 'creatine') hit = log && log.creatine_grams >= creatineGoal;
      else if (type === 'all') hit = log && log.protein_grams >= proteinGoal && log.water_ml >= waterGoal && log.creatine_grams >= creatineGoal;

      if (hit) {
        temp++;
        if (i === 0 || current > 0) current++;
        if (temp > longest) longest = temp;
      } else {
        if (i === 0) current = 0;
        temp = 0;
      }
    }

    streaks[type].current = current;
    streaks[type].longest = longest;
  });

  return c.json({ streaks });
});

// Update nutrition log
nutrition.put('/daily', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { date, protein_grams, water_ml, creatine_grams } = body;
  const db = c.env.DB;

  const logDate = date || new Date().toISOString().split('T')[0];

  const log = await db.prepare(
    `INSERT INTO nutrition_log (user_id, date, protein_grams, water_ml, creatine_grams, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) 
     DO UPDATE SET 
       protein_grams = excluded.protein_grams,
       water_ml = excluded.water_ml,
       creatine_grams = excluded.creatine_grams,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`
  ).bind(user.id, logDate, protein_grams || 0, water_ml || 0, creatine_grams || 0).first();

  return c.json({ log });
});

// Export nutrition data as CSV
nutrition.get('/export/csv', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const days = parseInt(c.req.query('days') || '30');
  const type = c.req.query('type') || 'daily'; // 'daily', 'weekly', 'analytics'

  if (type === 'daily') {
    const history = await db.prepare(
      `SELECT * FROM nutrition_log 
       WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
       ORDER BY date DESC`
    ).bind(user.id, days).all();

    const proteinGoal = user.weight_kg ? user.weight_kg * 2 : 150;
    const waterGoal = user.weight_kg ? user.weight_kg * 35 : 2500;
    const creatineGoal = 5;

    let csv = 'Date,Protein (g),Protein Goal (g),Water (ml),Water Goal (ml),Creatine (g),Creatine Goal (g),All Goals Hit\n';
    
    history.results.forEach(log => {
      const hitAll = log.protein_grams >= proteinGoal && log.water_ml >= waterGoal && log.creatine_grams >= creatineGoal;
      csv += `${log.date},${log.protein_grams || 0},${proteinGoal},${log.water_ml || 0},${waterGoal},${log.creatine_grams || 0},${creatineGoal},${hitAll ? 'Yes' : 'No'}\n`;
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="nutrition-daily-${days}days.csv"`
      }
    });
  } else if (type === 'weekly') {
    // Get analytics data
    const history = await db.prepare(
      `SELECT * FROM nutrition_log 
       WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
       ORDER BY date ASC`
    ).bind(user.id, days).all();

    const logs = history.results || [];
    const proteinGoal = user.weight_kg ? user.weight_kg * 2 : 150;
    const waterGoal = user.weight_kg ? user.weight_kg * 35 : 2500;
    const creatineGoal = 5;

    // Weekly aggregation
    const weeklyData = [];
    const weeksCount = Math.ceil(logs.length / 7);
    
    for (let week = 0; week < weeksCount; week++) {
      const weekLogs = logs.slice(week * 7, (week + 1) * 7);
      if (weekLogs.length === 0) continue;
      
      weeklyData.push({
        week_start: weekLogs[0].date,
        week_end: weekLogs[weekLogs.length - 1].date,
        avg_protein: weekLogs.reduce((sum, l) => sum + (l.protein_grams || 0), 0) / weekLogs.length,
        avg_water: weekLogs.reduce((sum, l) => sum + (l.water_ml || 0), 0) / weekLogs.length,
        avg_creatine: weekLogs.reduce((sum, l) => sum + (l.creatine_grams || 0), 0) / weekLogs.length,
        days_logged: weekLogs.length,
        days_hit_goals: weekLogs.filter(l => 
          l.protein_grams >= proteinGoal && 
          l.water_ml >= waterGoal &&
          l.creatine_grams >= creatineGoal
        ).length
      });
    }

    let csv = 'Week Start,Week End,Avg Protein (g),Avg Water (ml),Avg Creatine (g),Days Logged,Days Hit Goals\n';
    
    weeklyData.reverse().forEach(week => {
      csv += `${week.week_start},${week.week_end},${Math.round(week.avg_protein)},${Math.round(week.avg_water)},${week.avg_creatine.toFixed(1)},${week.days_logged},${week.days_hit_goals}\n`;
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="nutrition-weekly-${days}days.csv"`
      }
    });
  }

  return c.json({ error: 'Invalid export type' }, 400);
});

// Export nutrition data as text-based report (PDF alternative for Workers)
nutrition.get('/export/report', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const days = parseInt(c.req.query('days') || '30');

  // Get analytics data
  const history = await db.prepare(
    `SELECT * FROM nutrition_log 
     WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
     ORDER BY date ASC`
  ).bind(user.id, days).all();

  const logs = history.results || [];
  const proteinGoal = user.weight_kg ? user.weight_kg * 2 : 150;
  const waterGoal = user.weight_kg ? user.weight_kg * 35 : 2500;
  const creatineGoal = 5;

  // Calculate statistics
  const avgProtein = logs.length > 0 ? logs.reduce((sum, log) => sum + (log.protein_grams || 0), 0) / logs.length : 0;
  const avgWater = logs.length > 0 ? logs.reduce((sum, log) => sum + (log.water_ml || 0), 0) / logs.length : 0;
  const avgCreatine = logs.length > 0 ? logs.reduce((sum, log) => sum + (log.creatine_grams || 0), 0) / logs.length : 0;
  const allGoalsDays = logs.filter(log => 
    log.protein_grams >= proteinGoal && 
    log.water_ml >= waterGoal && 
    log.creatine_grams >= creatineGoal
  ).length;
  const adherenceRate = logs.length > 0 ? Math.round((allGoalsDays / logs.length) * 100) : 0;

  // Generate text report
  let report = `═══════════════════════════════════════════════════\n`;
  report += `         NUTRITION ANALYTICS REPORT\n`;
  report += `═══════════════════════════════════════════════════\n\n`;
  report += `Report Period: ${days} days\n`;
  report += `Generated: ${new Date().toLocaleString()}\n`;
  report += `User: ${user.name || user.email}\n\n`;
  
  report += `─────────────────────────────────────────────────────\n`;
  report += `SUMMARY STATISTICS\n`;
  report += `─────────────────────────────────────────────────────\n`;
  report += `Total Days Logged:     ${logs.length}\n`;
  report += `Days Hit All Goals:    ${allGoalsDays}\n`;
  report += `Adherence Rate:        ${adherenceRate}%\n\n`;
  report += `Average Daily Protein: ${Math.round(avgProtein)}g (Goal: ${proteinGoal}g)\n`;
  report += `Average Daily Water:   ${Math.round(avgWater)}ml (Goal: ${waterGoal}ml)\n`;
  report += `Average Daily Creatine:${avgCreatine.toFixed(1)}g (Goal: ${creatineGoal}g)\n\n`;
  
  report += `─────────────────────────────────────────────────────\n`;
  report += `DAILY LOG\n`;
  report += `─────────────────────────────────────────────────────\n`;
  report += `Date       | Protein | Water  | Creatine | Goals\n`;
  report += `-----------|---------|--------|----------|------\n`;
  
  logs.slice().reverse().forEach(log => {
    const hitAll = log.protein_grams >= proteinGoal && log.water_ml >= waterGoal && log.creatine_grams >= creatineGoal;
    report += `${log.date} | ${String(log.protein_grams || 0).padEnd(7)} | ${String(log.water_ml || 0).padEnd(6)} | ${String((log.creatine_grams || 0).toFixed(1)).padEnd(8)} | ${hitAll ? '✓' : '✗'}\n`;
  });
  
  report += `\n═══════════════════════════════════════════════════\n`;
  report += `End of Report\n`;
  report += `═══════════════════════════════════════════════════\n`;

  return new Response(report, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="nutrition-report-${days}days.txt"`
    }
  });
});

// Delete a nutrition log entry
nutrition.delete('/daily/:date', async (c) => {
  const user = requireAuth(c);
  const date = c.req.param('date');
  const db = c.env.DB;

  await db.prepare(
    'DELETE FROM nutrition_log WHERE user_id = ? AND date = ?'
  ).bind(user.id, date).run();

  return c.json({ message: 'Nutrition log deleted' });
});

// ========== INDIVIDUAL NUTRITION ENTRIES (Timestamped) ==========

// Add individual nutrition entry
nutrition.post('/entries', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { entry_type, amount, unit, notes, logged_at } = body;
  const db = c.env.DB;

  if (!['protein', 'water', 'creatine'].includes(entry_type)) {
    return c.json({ error: 'Invalid entry_type' }, 400);
  }

  const timestamp = logged_at || new Date().toISOString();

  const result = await db.prepare(
    `INSERT INTO nutrition_entries (user_id, entry_type, amount, unit, notes, logged_at)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(user.id, entry_type, amount, unit, notes || null, timestamp).first();

  // Also update the daily summary for backward compatibility
  const logDate = timestamp.split('T')[0];
  const column = entry_type === 'protein' ? 'protein_grams' : entry_type === 'water' ? 'water_ml' : 'creatine_grams';
  
  await db.prepare(
    `INSERT INTO nutrition_log (user_id, date, ${column}, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) 
     DO UPDATE SET 
       ${column} = ${column} + excluded.${column},
       updated_at = CURRENT_TIMESTAMP`
  ).bind(user.id, logDate, amount).run();

  return c.json({ entry: result, message: 'Entry added' });
});

// Get nutrition entries
nutrition.get('/entries', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const startDate = c.req.query('start_date') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
  const entryType = c.req.query('entry_type'); // optional filter

  let query = `
    SELECT * FROM nutrition_entries 
    WHERE user_id = ? 
    AND date(logged_at) >= ? 
    AND date(logged_at) <= ?
  `;
  const params = [user.id, startDate, endDate];

  if (entryType) {
    query += ' AND entry_type = ?';
    params.push(entryType);
  }

  query += ' ORDER BY logged_at DESC';

  const entries = await db.prepare(query).bind(...params).all();

  return c.json({ entries: entries.results || [] });
});

// Update nutrition entry
nutrition.put('/entries/:id', async (c) => {
  const user = requireAuth(c);
  const entryId = c.req.param('id');
  const body = await c.req.json();
  const { amount, notes, logged_at } = body;
  const db = c.env.DB;

  // Verify ownership
  const existing = await db.prepare(
    'SELECT * FROM nutrition_entries WHERE id = ? AND user_id = ?'
  ).bind(entryId, user.id).first();

  if (!existing) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  const oldAmount = existing.amount;
  const newAmount = amount !== undefined ? amount : existing.amount;
  const newNotes = notes !== undefined ? notes : existing.notes;
  const newLoggedAt = logged_at || existing.logged_at;

  // Update entry
  const updated = await db.prepare(
    `UPDATE nutrition_entries 
     SET amount = ?, notes = ?, logged_at = ?
     WHERE id = ? AND user_id = ?
     RETURNING *`
  ).bind(newAmount, newNotes, newLoggedAt, entryId, user.id).first();

  // Update daily summary (adjust the difference)
  const logDate = newLoggedAt.split('T')[0];
  const column = existing.entry_type === 'protein' ? 'protein_grams' : existing.entry_type === 'water' ? 'water_ml' : 'creatine_grams';
  const amountDiff = newAmount - oldAmount;

  if (amountDiff !== 0) {
    await db.prepare(
      `UPDATE nutrition_log 
       SET ${column} = MAX(0, ${column} + ?),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND date = ?`
    ).bind(amountDiff, user.id, logDate).run();
  }

  return c.json({ entry: updated, message: 'Entry updated' });
});

// Delete nutrition entry
nutrition.delete('/entries/:id', async (c) => {
  const user = requireAuth(c);
  const entryId = c.req.param('id');
  const db = c.env.DB;

  // Get entry to adjust daily summary
  const entry = await db.prepare(
    'SELECT * FROM nutrition_entries WHERE id = ? AND user_id = ?'
  ).bind(entryId, user.id).first();

  if (!entry) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  // Delete entry
  await db.prepare(
    'DELETE FROM nutrition_entries WHERE id = ? AND user_id = ?'
  ).bind(entryId, user.id).run();

  // Update daily summary (subtract the amount)
  const logDate = entry.logged_at.split('T')[0];
  const column = entry.entry_type === 'protein' ? 'protein_grams' : entry.entry_type === 'water' ? 'water_ml' : 'creatine_grams';

  await db.prepare(
    `UPDATE nutrition_log 
     SET ${column} = MAX(0, ${column} - ?),
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND date = ?`
  ).bind(entry.amount, user.id, logDate).run();

  return c.json({ message: 'Entry deleted' });
});

export default nutrition;
