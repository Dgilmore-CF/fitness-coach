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

  // Pull the user's latest macro targets if they've set custom ones; otherwise
  // fall back to weight-based recommendations.
  const target = await db.prepare(
    `SELECT * FROM macro_targets
     WHERE user_id = ? AND effective_date <= ?
     ORDER BY effective_date DESC LIMIT 1`
  ).bind(user.id, date).first().catch(() => null);

  // Defaults: 2g protein/kg, 35ml water/kg, 5g creatine flat.
  // Calories: 30 kcal/kg maintenance is a reasonable default.
  // Macro split defaults: 40% carbs / 30% protein / 30% fat by calories.
  const weight = user.weight_kg || 75;
  const recommendedProtein = target?.protein_g || Math.round(weight * 2);
  const recommendedWater = target?.water_ml || Math.round(weight * 35);
  const recommendedCreatine = 5;
  const recommendedCalories = target?.calories || Math.round(weight * 30);
  const recommendedCarbs = target?.carbs_g || Math.round((recommendedCalories * 0.40) / 4);
  const recommendedFat = target?.fat_g || Math.round((recommendedCalories * 0.30) / 9);
  const recommendedFiber = target?.fiber_g || 30;

  const calories = log?.calories || 0;
  const protein = log?.protein_grams || 0;
  const water = log?.water_ml || 0;
  const creatine = log?.creatine_grams || 0;
  const carbs = log?.carbs_grams || 0;
  const fat = log?.fat_grams || 0;
  const fiber = log?.fiber_grams || 0;

  const pct = (value, goal) => (goal > 0 ? (value / goal) * 100 : 0);

  return c.json({
    date,
    // Actual intake
    calories,
    protein_grams: protein,
    water_ml: water,
    creatine_grams: creatine,
    carbs_grams: carbs,
    fat_grams: fat,
    fiber_grams: fiber,
    // Goals
    calorie_goal: recommendedCalories,
    protein_goal: recommendedProtein,
    water_goal: recommendedWater,
    creatine_goal: recommendedCreatine,
    carbs_goal: recommendedCarbs,
    fat_goal: recommendedFat,
    fiber_goal: recommendedFiber,
    // Percentages (capped at 100 in UI, but raw here)
    calorie_percentage: pct(calories, recommendedCalories),
    protein_percentage: pct(protein, recommendedProtein),
    water_percentage: pct(water, recommendedWater),
    creatine_percentage: pct(creatine, recommendedCreatine),
    carbs_percentage: pct(carbs, recommendedCarbs),
    fat_percentage: pct(fat, recommendedFat),
    fiber_percentage: pct(fiber, recommendedFiber)
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

  // Pull latest macro targets if set, else fall back to weight-based defaults
  const target = await db.prepare(
    `SELECT * FROM macro_targets WHERE user_id = ?
     ORDER BY effective_date DESC LIMIT 1`
  ).bind(user.id).first().catch(() => null);

  const weight = user.weight_kg || 75;
  const proteinGoal = target?.protein_g || Math.round(weight * 2);
  const waterGoal = target?.water_ml || Math.round(weight * 35);
  const creatineGoal = 5;
  const calorieGoal = target?.calories || Math.round(weight * 30);
  const carbsGoal = target?.carbs_g || Math.round((calorieGoal * 0.40) / 4);
  const fatGoal = target?.fat_g || Math.round((calorieGoal * 0.30) / 9);

  // Calculate averages
  const avg = (key) => (logs.length > 0
    ? logs.reduce((sum, log) => sum + (log[key] || 0), 0) / logs.length
    : 0);
  const avgProtein = avg('protein_grams');
  const avgWater = avg('water_ml');
  const avgCreatine = avg('creatine_grams');
  const avgCalories = avg('calories');
  const avgCarbs = avg('carbs_grams');
  const avgFat = avg('fat_grams');

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
      avg_calories_daily: Math.round(avgCalories),
      avg_protein_daily: Math.round(avgProtein),
      avg_water_daily: Math.round(avgWater),
      avg_creatine_daily: avgCreatine.toFixed(1),
      avg_carbs_daily: Math.round(avgCarbs),
      avg_fat_daily: Math.round(avgFat),
      protein_goal_days: proteinGoalDays,
      water_goal_days: waterGoalDays,
      creatine_goal_days: creatineGoalDays,
      all_goals_days: allGoalsDays,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      calorie_goal: calorieGoal,
      protein_goal: proteinGoal,
      water_goal: waterGoal,
      creatine_goal: creatineGoal,
      carbs_goal: carbsGoal,
      fat_goal: fatGoal,
      adherence_rate: logs.length > 0 ? Math.round((allGoalsDays / logs.length) * 100) : 0
    },
    weekly_trends: weeklyData.reverse(),
    daily_data: logs.map(log => ({
      date: log.date,
      calories: log.calories || 0,
      protein: log.protein_grams || 0,
      water: log.water_ml || 0,
      creatine: log.creatine_grams || 0,
      carbs: log.carbs_grams || 0,
      fat: log.fat_grams || 0,
      calorie_goal: calorieGoal,
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

// ========== MEAL TRACKING & FOOD DATABASE ==========

// Helper: Convert units to grams using density tables
async function convertToGrams(db, amount, unit, foodName = null) {
  // Direct weight conversions
  const weightConversions = {
    'g': 1,
    'kg': 1000,
    'oz': 28.3495,
    'lb': 453.592,
    'lbs': 453.592
  };
  
  if (weightConversions[unit.toLowerCase()]) {
    return amount * weightConversions[unit.toLowerCase()];
  }
  
  // Volume to weight requires density lookup
  const volumeToMl = {
    'cup': 236.588,
    'cups': 236.588,
    'tbsp': 14.787,
    'tsp': 4.929,
    'ml': 1,
    'l': 1000
  };
  
  if (volumeToMl[unit.toLowerCase()] && foodName) {
    const ml = amount * volumeToMl[unit.toLowerCase()];
    
    // Try to find food density
    const density = await db.prepare(
      `SELECT grams_per_cup FROM food_densities 
       WHERE ? LIKE '%' || food_name || '%'
       ORDER BY LENGTH(food_name) DESC LIMIT 1`
    ).bind(foodName.toLowerCase()).first();
    
    if (density && density.grams_per_cup) {
      // Convert ml to cups, then to grams
      const cups = ml / 236.588;
      return cups * density.grams_per_cup;
    }
    
    // Default: assume water density (1g = 1ml)
    return ml;
  }
  
  // 'serving' unit - return amount directly, will use food's serving_size
  if (unit.toLowerCase() === 'serving' || unit.toLowerCase() === 'servings') {
    return null; // Signal to use serving-based calculation
  }
  
  return amount; // Fallback
}

// Helper: Calculate macros for a quantity of food
function calculateMacros(food, quantity, unit) {
  const servingMultiplier = unit === 'serving' || unit === 'servings' 
    ? quantity 
    : (quantity / food.serving_size);
  
  return {
    calories: (food.calories || 0) * servingMultiplier,
    protein_g: (food.protein_g || 0) * servingMultiplier,
    carbs_g: (food.carbs_g || 0) * servingMultiplier,
    fat_g: (food.fat_g || 0) * servingMultiplier,
    fiber_g: (food.fiber_g || 0) * servingMultiplier
  };
}

// Search foods in local database
nutrition.get('/foods/search', async (c) => {
  try {
    const user = requireAuth(c);
    const db = c.env.DB;
    const query = c.req.query('q') || '';
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);

    if (query.length < 2) {
      return c.json({ foods: [], message: 'Query too short' });
    }

    // Check cache first (best-effort — never fail the request on cache issues)
    try {
      const cached = await db.prepare(
        `SELECT results_json FROM food_search_cache 
         WHERE query = ? AND source = 'local' AND expires_at > datetime('now')
         LIMIT 1`
      ).bind(query.toLowerCase()).first();

      if (cached?.results_json) {
        try {
          const parsed = JSON.parse(cached.results_json);
          return c.json({ foods: parsed, source: 'cache' });
        } catch {
          // Corrupt cache row — ignore and fall through to fresh search
        }
      }
    } catch (cacheErr) {
      console.warn('Food search cache read failed:', cacheErr.message);
    }

    // Search local database - prioritize user favorites and verified foods
    const foods = await db.prepare(
      `SELECT f.*, 
              COALESCE(uf.use_count, 0) as user_use_count,
              COALESCE(uf.is_favorite, 0) as is_user_favorite
       FROM foods f
       LEFT JOIN user_favorite_foods uf ON f.id = uf.food_id AND uf.user_id = ?
       WHERE f.name LIKE ? OR f.brand LIKE ?
       ORDER BY 
         is_user_favorite DESC,
         user_use_count DESC,
         f.verified DESC,
         f.popularity_score DESC,
         f.name ASC
       LIMIT ?`
    ).bind(user.id, `%${query}%`, `%${query}%`, limit).all();

    // Cache results for 1 hour (best-effort)
    try {
      await db.prepare(
        `INSERT OR REPLACE INTO food_search_cache (query, results_json, source, expires_at)
         VALUES (?, ?, 'local', datetime('now', '+1 hour'))`
      ).bind(query.toLowerCase(), JSON.stringify(foods.results || [])).run();
    } catch (cacheErr) {
      console.warn('Food search cache write failed:', cacheErr.message);
    }

    return c.json({ foods: foods.results || [], source: 'local' });
  } catch (error) {
    console.error('Local food search error:', error);
    return c.json({ foods: [], error: error.message, source: 'local_error' });
  }
});

// Search USDA FoodData Central API
nutrition.get('/foods/search/usda', async (c) => {
  // Wrap the entire handler so NO error path returns 500 — the frontend
  // relies on getting a structured { foods, error?, source } response to
  // show a useful message to the user.
  try {
    const user = requireAuth(c);
    const db = c.env.DB;
    const query = c.req.query('q') || '';
    const pageSize = Math.min(parseInt(c.req.query('limit') || '25'), 50);

    if (query.length < 2) {
      return c.json({ foods: [], message: 'Query too short' });
    }

    // Check cache first (24 hour expiry for external APIs). Best-effort —
    // never fail the request on cache issues.
    try {
      const cached = await db.prepare(
        `SELECT results_json FROM food_search_cache 
         WHERE query = ? AND source = 'usda' AND expires_at > datetime('now')
         LIMIT 1`
      ).bind(query.toLowerCase()).first();

      if (cached?.results_json) {
        try {
          const parsed = JSON.parse(cached.results_json);
          return c.json({ foods: parsed, source: 'usda_cache' });
        } catch {
          // Corrupt cache row — ignore and hit the API fresh
        }
      }
    } catch (cacheErr) {
      console.warn('USDA cache read failed:', cacheErr.message);
    }

    // USDA FoodData Central API requires an API key. Without USDA_API_KEY
    // set we fall back to DEMO_KEY, which has strict rate limits.
    const apiKey = c.env.USDA_API_KEY || 'DEMO_KEY';
    const usingDemoKey = !c.env.USDA_API_KEY;

    let response;
    try {
      response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (fetchErr) {
      console.error('USDA fetch failed:', fetchErr);
      return c.json({
        foods: [],
        error: 'Could not reach USDA (network error).',
        source: 'usda_error'
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('USDA API returned', response.status, errorText.slice(0, 500));

      let friendlyMessage;
      if (response.status === 403 || response.status === 401) {
        friendlyMessage = usingDemoKey
          ? 'USDA demo key rejected (daily quota may be exhausted). Ask the admin to set USDA_API_KEY.'
          : 'USDA API key rejected. Ask the admin to verify USDA_API_KEY.';
      } else if (response.status === 429) {
        friendlyMessage = usingDemoKey
          ? 'USDA rate limit reached with the demo key. Ask the admin to set USDA_API_KEY for higher limits.'
          : 'USDA rate limit reached — try again in a few minutes.';
      } else if (response.status >= 500) {
        friendlyMessage = 'USDA service is currently unavailable. Try again shortly.';
      } else {
        friendlyMessage = `USDA search failed (${response.status}).`;
      }

      return c.json({ foods: [], error: friendlyMessage, source: 'usda_error' });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error('USDA JSON parse failed:', parseErr);
      return c.json({
        foods: [],
        error: 'USDA returned an unexpected response format.',
        source: 'usda_error'
      });
    }

    // Transform USDA response to our format
    const foods = (data.foods || []).map((item) => {
      const getNutrient = (id) => {
        const nutrient = item.foodNutrients?.find((n) => n.nutrientId === id);
        return nutrient?.value || 0;
      };

      return {
        id: null,
        name: item.description,
        brand: item.brandOwner || null,
        source: 'usda',
        source_id: String(item.fdcId),
        serving_size: 100,
        serving_unit: 'g',
        serving_description: '100g',
        calories: getNutrient(1008),
        protein_g: getNutrient(1003),
        carbs_g: getNutrient(1005),
        fat_g: getNutrient(1004),
        fiber_g: getNutrient(1079),
        sugar_g: getNutrient(2000),
        sodium_mg: getNutrient(1093),
        verified: 1
      };
    });

    // Cache results for 24 hours (best-effort)
    try {
      await db.prepare(
        `INSERT OR REPLACE INTO food_search_cache (query, results_json, source, expires_at)
         VALUES (?, ?, 'usda', datetime('now', '+24 hours'))`
      ).bind(query.toLowerCase(), JSON.stringify(foods)).run();
    } catch (cacheErr) {
      console.warn('USDA cache write failed:', cacheErr.message);
    }

    return c.json({ foods, source: 'usda' });
  } catch (error) {
    console.error('USDA search handler crashed:', error);
    return c.json({
      foods: [],
      error: `Unexpected error: ${error.message}`,
      source: 'usda_error'
    });
  }
});

// Lookup barcode using Open Food Facts API
nutrition.get('/foods/barcode/:barcode', async (c) => {
  try {
    const user = requireAuth(c);
    const db = c.env.DB;
    const barcode = c.req.param('barcode');

    // Check local cache first (best-effort)
    try {
      const cached = await db.prepare(
        `SELECT food_json FROM barcode_cache 
         WHERE barcode = ? AND expires_at > datetime('now')
         LIMIT 1`
      ).bind(barcode).first();

      if (cached) {
        if (cached.food_json) {
          try {
            return c.json({ food: JSON.parse(cached.food_json), source: 'cache' });
          } catch {
            // Corrupt cache — fall through
          }
        } else {
          return c.json({ food: null, message: 'Product not found (cached)', source: 'cache' });
        }
      }
    } catch (cacheErr) {
      console.warn('Barcode cache read failed:', cacheErr.message);
    }

    // Check if we already have this in our foods table
    try {
      const existingFood = await db.prepare(
        'SELECT * FROM foods WHERE barcode = ? LIMIT 1'
      ).bind(barcode).first();

      if (existingFood) {
        return c.json({ food: existingFood, source: 'local' });
      }
    } catch (lookupErr) {
      console.warn('Existing food lookup failed:', lookupErr.message);
    }

    // Open-Food-Facts fallback inside an inner try — kept as-is below
    try {
    // Query Open Food Facts API
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'FitnessCoach/1.0 (contact@example.com)'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      // Cache the "not found" result
      await db.prepare(
        `INSERT OR REPLACE INTO barcode_cache (barcode, food_json, source, expires_at)
         VALUES (?, NULL, 'openfoodfacts', datetime('now', '+7 days'))`
      ).bind(barcode).run();
      
      return c.json({ food: null, message: 'Product not found' });
    }
    
    const product = data.product;
    const nutrients = product.nutriments || {};
    
    // Get serving size - prefer per-serving values if available
    const servingSize = parseFloat(product.serving_quantity) || 100;
    const hasPerServing = nutrients['energy-kcal_serving'] !== undefined;
    
    // Use per-serving values if available, otherwise calculate from per-100g
    const multiplier = hasPerServing ? 1 : (servingSize / 100);
    
    const food = {
      id: null,
      name: product.product_name || product.generic_name || 'Unknown Product',
      brand: product.brands || null,
      barcode: barcode,
      source: 'openfoodfacts',
      source_id: barcode,
      serving_size: servingSize,
      serving_unit: 'g',
      serving_description: product.serving_size || `${servingSize}g`,
      calories: hasPerServing 
        ? (nutrients['energy-kcal_serving'] || 0)
        : ((nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0) * multiplier),
      protein_g: hasPerServing
        ? (nutrients.proteins_serving || 0)
        : ((nutrients.proteins_100g || nutrients.proteins || 0) * multiplier),
      carbs_g: hasPerServing
        ? (nutrients.carbohydrates_serving || 0)
        : ((nutrients.carbohydrates_100g || nutrients.carbohydrates || 0) * multiplier),
      fat_g: hasPerServing
        ? (nutrients.fat_serving || 0)
        : ((nutrients.fat_100g || nutrients.fat || 0) * multiplier),
      fiber_g: hasPerServing
        ? (nutrients.fiber_serving || 0)
        : ((nutrients.fiber_100g || nutrients.fiber || 0) * multiplier),
      sugar_g: hasPerServing
        ? (nutrients.sugars_serving || 0)
        : ((nutrients.sugars_100g || nutrients.sugars || 0) * multiplier),
      sodium_mg: hasPerServing
        ? ((nutrients.sodium_serving || 0) * 1000)
        : ((nutrients.sodium_100g || 0) * 1000 * multiplier),
      saturated_fat_g: hasPerServing
        ? (nutrients['saturated-fat_serving'] || 0)
        : ((nutrients['saturated-fat_100g'] || 0) * multiplier),
      verified: 1,
      image_url: product.image_url || null
    };
    
    // Cache result for 30 days (best-effort)
    try {
      await db.prepare(
        `INSERT OR REPLACE INTO barcode_cache (barcode, food_json, source, expires_at)
         VALUES (?, ?, 'openfoodfacts', datetime('now', '+30 days'))`
      ).bind(barcode, JSON.stringify(food)).run();
    } catch (cacheErr) {
      console.warn('Barcode cache write failed:', cacheErr.message);
    }

    return c.json({ food, source: 'openfoodfacts' });
    } catch (error) {
      console.error('Open Food Facts API error:', error);
      return c.json({ food: null, error: error.message, source: 'error' });
    }
  } catch (outerError) {
    console.error('Barcode lookup handler crashed:', outerError);
    return c.json({
      food: null,
      error: `Unexpected error: ${outerError.message}`,
      source: 'error'
    });
  }
});

// Save a food to local database (from external source or custom)
nutrition.post('/foods', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const db = c.env.DB;
  
  const {
    name, brand, barcode, source, source_id,
    serving_size, serving_unit, serving_description,
    calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
    sodium_mg, saturated_fat_g
  } = body;
  
  if (!name) {
    return c.json({ error: 'Food name is required' }, 400);
  }
  
  const result = await db.prepare(
    `INSERT INTO foods (
       name, brand, barcode, source, source_id,
       serving_size, serving_unit, serving_description,
       calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
       sodium_mg, saturated_fat_g, verified
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(source, source_id) DO UPDATE SET
       name = excluded.name,
       brand = excluded.brand,
       barcode = excluded.barcode,
       serving_size = excluded.serving_size,
       serving_unit = excluded.serving_unit,
       serving_description = excluded.serving_description,
       calories = excluded.calories,
       protein_g = excluded.protein_g,
       carbs_g = excluded.carbs_g,
       fat_g = excluded.fat_g,
       fiber_g = excluded.fiber_g,
       sugar_g = excluded.sugar_g,
       sodium_mg = excluded.sodium_mg,
       saturated_fat_g = excluded.saturated_fat_g,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`
  ).bind(
    name, brand || null, barcode || null, source || 'user', source_id || `user_${Date.now()}`,
    serving_size || 100, serving_unit || 'g', serving_description || null,
    calories || 0, protein_g || 0, carbs_g || 0, fat_g || 0, fiber_g || 0, sugar_g || 0,
    sodium_mg || null, saturated_fat_g || null
  ).first();
  
  return c.json({ food: result, message: 'Food saved' });
});

// Log a meal
nutrition.post('/meals', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const db = c.env.DB;
  
  const { date, meal_type, name, foods, notes } = body;
  
  const mealDate = date || new Date().toISOString().split('T')[0];
  const mealType = meal_type || 'snack';
  
  // Create meal
  const meal = await db.prepare(
    `INSERT INTO meals (user_id, date, meal_type, name, notes)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(user.id, mealDate, mealType, name || null, notes || null).first();
  
  // Add foods to meal
  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;
  
  if (foods && foods.length > 0) {
    for (const item of foods) {
      // Get food details
      let food;
      if (item.food_id) {
        food = await db.prepare('SELECT * FROM foods WHERE id = ?').bind(item.food_id).first();
      } else if (item.food) {
        // Preserve the original source metadata (usda, openfoodfacts, user).
        // Using INSERT OR on the UNIQUE(source, source_id) constraint so the
        // same USDA/OFF food gets reused across meals instead of duplicated.
        const source = item.food.source || 'user';
        const sourceId = item.food.source_id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const savedFood = await db.prepare(
          `INSERT INTO foods (
             name, brand, source, source_id,
             serving_size, serving_unit, serving_description,
             calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg,
             verified
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(source, source_id) DO UPDATE SET
             name = excluded.name,
             brand = excluded.brand,
             calories = excluded.calories,
             protein_g = excluded.protein_g,
             carbs_g = excluded.carbs_g,
             fat_g = excluded.fat_g,
             updated_at = CURRENT_TIMESTAMP
           RETURNING *`
        ).bind(
          item.food.name,
          item.food.brand || null,
          source,
          sourceId,
          item.food.serving_size || 100,
          item.food.serving_unit || 'g',
          item.food.serving_description || null,
          item.food.calories || 0,
          item.food.protein_g || 0,
          item.food.carbs_g || 0,
          item.food.fat_g || 0,
          item.food.fiber_g || 0,
          item.food.sugar_g || 0,
          item.food.sodium_mg || null,
          item.food.verified ? 1 : 0
        ).first();
        food = savedFood;
      }

      if (!food) continue;
      
      const quantity = item.quantity || 1;
      const unit = item.unit || 'serving';
      
      // Calculate macros
      const macros = calculateMacros(food, quantity, unit);
      
      await db.prepare(
        `INSERT INTO meal_foods (meal_id, food_id, quantity, unit, calories, protein_g, carbs_g, fat_g, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        meal.id, food.id, quantity, unit,
        macros.calories, macros.protein_g, macros.carbs_g, macros.fat_g,
        item.notes || null
      ).run();
      
      totalCalories += macros.calories;
      totalProtein += macros.protein_g;
      totalCarbs += macros.carbs_g;
      totalFat += macros.fat_g;
      totalFiber += macros.fiber_g || 0;

      // Update user favorites/frequent foods
      await db.prepare(
        `INSERT INTO user_favorite_foods (user_id, food_id, use_count, last_used)
         VALUES (?, ?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, food_id) DO UPDATE SET
           use_count = use_count + 1,
           last_used = CURRENT_TIMESTAMP`
      ).bind(user.id, food.id).run();
    }
  }
  
  // Also update daily nutrition log with the full macro breakdown so the
  // Today's Nutrition rings + AI coach have a clean daily total to read.
  await db.prepare(
    `INSERT INTO nutrition_log
       (user_id, date, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) DO UPDATE SET
       calories = COALESCE(calories, 0) + excluded.calories,
       protein_grams = COALESCE(protein_grams, 0) + excluded.protein_grams,
       carbs_grams = COALESCE(carbs_grams, 0) + excluded.carbs_grams,
       fat_grams = COALESCE(fat_grams, 0) + excluded.fat_grams,
       fiber_grams = COALESCE(fiber_grams, 0) + excluded.fiber_grams,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(
    user.id,
    mealDate,
    Math.round(totalCalories),
    Math.round(totalProtein * 10) / 10,
    Math.round(totalCarbs * 10) / 10,
    Math.round(totalFat * 10) / 10,
    Math.round(totalFiber * 10) / 10
  ).run();
  
  return c.json({
    meal: {
      ...meal,
      totals: {
        calories: Math.round(totalCalories),
        protein_g: Math.round(totalProtein * 10) / 10,
        carbs_g: Math.round(totalCarbs * 10) / 10,
        fat_g: Math.round(totalFat * 10) / 10
      }
    },
    message: 'Meal logged'
  });
});

// Get meals for a date
nutrition.get('/meals', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];
  
  const meals = await db.prepare(
    `SELECT m.*, 
            GROUP_CONCAT(mf.id) as food_item_ids
     FROM meals m
     LEFT JOIN meal_foods mf ON m.id = mf.meal_id
     WHERE m.user_id = ? AND m.date = ?
     GROUP BY m.id
     ORDER BY 
       CASE m.meal_type 
         WHEN 'breakfast' THEN 1 
         WHEN 'lunch' THEN 2 
         WHEN 'dinner' THEN 3 
         WHEN 'snack' THEN 4 
         ELSE 5 
       END`
  ).bind(user.id, date).all();
  
  // Get foods for each meal
  const mealsWithFoods = await Promise.all((meals.results || []).map(async (meal) => {
    const foods = await db.prepare(
      `SELECT mf.*, f.name, f.brand, f.serving_description
       FROM meal_foods mf
       JOIN foods f ON mf.food_id = f.id
       WHERE mf.meal_id = ?`
    ).bind(meal.id).all();
    
    const totals = (foods.results || []).reduce((acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      protein_g: acc.protein_g + (f.protein_g || 0),
      carbs_g: acc.carbs_g + (f.carbs_g || 0),
      fat_g: acc.fat_g + (f.fat_g || 0)
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    
    return {
      ...meal,
      foods: foods.results || [],
      totals
    };
  }));
  
  // Calculate daily totals
  const dailyTotals = mealsWithFoods.reduce((acc, meal) => ({
    calories: acc.calories + meal.totals.calories,
    protein_g: acc.protein_g + meal.totals.protein_g,
    carbs_g: acc.carbs_g + meal.totals.carbs_g,
    fat_g: acc.fat_g + meal.totals.fat_g
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  
  return c.json({
    date,
    meals: mealsWithFoods,
    daily_totals: {
      calories: Math.round(dailyTotals.calories),
      protein_g: Math.round(dailyTotals.protein_g * 10) / 10,
      carbs_g: Math.round(dailyTotals.carbs_g * 10) / 10,
      fat_g: Math.round(dailyTotals.fat_g * 10) / 10
    }
  });
});

// Delete a meal
nutrition.delete('/meals/:id', async (c) => {
  const user = requireAuth(c);
  const mealId = c.req.param('id');
  const db = c.env.DB;
  
  // Verify ownership and get meal details for updating daily log
  const meal = await db.prepare(
    `SELECT m.*, SUM(mf.protein_g) as total_protein
     FROM meals m
     LEFT JOIN meal_foods mf ON m.id = mf.meal_id
     WHERE m.id = ? AND m.user_id = ?
     GROUP BY m.id`
  ).bind(mealId, user.id).first();
  
  if (!meal) {
    return c.json({ error: 'Meal not found' }, 404);
  }
  
  // Delete meal (cascade deletes meal_foods)
  await db.prepare('DELETE FROM meals WHERE id = ?').bind(mealId).run();
  
  // Update daily nutrition log
  if (meal.total_protein) {
    await db.prepare(
      `UPDATE nutrition_log 
       SET protein_grams = MAX(0, protein_grams - ?),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND date = ?`
    ).bind(Math.round(meal.total_protein), user.id, meal.date).run();
  }
  
  return c.json({ message: 'Meal deleted' });
});

// Get user's macro targets
nutrition.get('/macro-targets', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  
  const targets = await db.prepare(
    `SELECT * FROM macro_targets 
     WHERE user_id = ? AND effective_date <= date('now')
     ORDER BY effective_date DESC
     LIMIT 1`
  ).bind(user.id).first();
  
  if (targets) {
    return c.json({ targets });
  }
  
  // Calculate default targets based on user profile
  const defaultTargets = {
    calories: user.weight_kg ? Math.round(user.weight_kg * 30) : 2000, // Rough TDEE estimate
    protein_g: user.weight_kg ? Math.round(user.weight_kg * 2) : 150,
    carbs_g: user.weight_kg ? Math.round(user.weight_kg * 3) : 250,
    fat_g: user.weight_kg ? Math.round(user.weight_kg * 0.8) : 65,
    fiber_g: 30,
    water_ml: user.weight_kg ? Math.round(user.weight_kg * 35) : 2500
  };
  
  return c.json({ targets: defaultTargets, is_default: true });
});

// Set user's macro targets
nutrition.post('/macro-targets', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const db = c.env.DB;
  
  const { calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, effective_date } = body;
  
  const result = await db.prepare(
    `INSERT INTO macro_targets (user_id, calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, effective_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(
    user.id,
    calories || null,
    protein_g || null,
    carbs_g || null,
    fat_g || null,
    fiber_g || null,
    water_ml || null,
    effective_date || new Date().toISOString().split('T')[0]
  ).first();
  
  return c.json({ targets: result, message: 'Macro targets saved' });
});

// Get user's favorite/frequent foods
nutrition.get('/foods/favorites', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  
  const foods = await db.prepare(
    `SELECT f.*, uf.use_count, uf.is_favorite, uf.last_used
     FROM user_favorite_foods uf
     JOIN foods f ON uf.food_id = f.id
     WHERE uf.user_id = ?
     ORDER BY uf.is_favorite DESC, uf.use_count DESC, uf.last_used DESC
     LIMIT ?`
  ).bind(user.id, limit).all();
  
  return c.json({ foods: foods.results || [] });
});

// Toggle food as favorite
nutrition.post('/foods/:id/favorite', async (c) => {
  const user = requireAuth(c);
  const foodId = c.req.param('id');
  const db = c.env.DB;
  
  const existing = await db.prepare(
    'SELECT * FROM user_favorite_foods WHERE user_id = ? AND food_id = ?'
  ).bind(user.id, foodId).first();
  
  if (existing) {
    await db.prepare(
      'UPDATE user_favorite_foods SET is_favorite = ? WHERE user_id = ? AND food_id = ?'
    ).bind(existing.is_favorite ? 0 : 1, user.id, foodId).run();
  } else {
    await db.prepare(
      'INSERT INTO user_favorite_foods (user_id, food_id, is_favorite) VALUES (?, ?, 1)'
    ).bind(user.id, foodId).run();
  }
  
  return c.json({ is_favorite: existing ? !existing.is_favorite : true });
});

// Quick add food (simplified logging)
nutrition.post('/quick-add', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const db = c.env.DB;
  
  const { food_id, quantity, unit, meal_type, date } = body;
  
  if (!food_id) {
    return c.json({ error: 'food_id is required' }, 400);
  }
  
  const mealDate = date || new Date().toISOString().split('T')[0];
  const mealTypeValue = meal_type || 'snack';
  
  // Get or create meal for this date/type
  let meal = await db.prepare(
    `SELECT * FROM meals 
     WHERE user_id = ? AND date = ? AND meal_type = ? AND name IS NULL
     LIMIT 1`
  ).bind(user.id, mealDate, mealTypeValue).first();
  
  if (!meal) {
    meal = await db.prepare(
      `INSERT INTO meals (user_id, date, meal_type)
       VALUES (?, ?, ?)
       RETURNING *`
    ).bind(user.id, mealDate, mealTypeValue).first();
  }
  
  // Get food
  const food = await db.prepare('SELECT * FROM foods WHERE id = ?').bind(food_id).first();
  if (!food) {
    return c.json({ error: 'Food not found' }, 404);
  }
  
  const qty = quantity || 1;
  const unitValue = unit || 'serving';
  const macros = calculateMacros(food, qty, unitValue);
  
  // Add to meal
  await db.prepare(
    `INSERT INTO meal_foods (meal_id, food_id, quantity, unit, calories, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(meal.id, food_id, qty, unitValue, macros.calories, macros.protein_g, macros.carbs_g, macros.fat_g).run();
  
  // Update favorites
  await db.prepare(
    `INSERT INTO user_favorite_foods (user_id, food_id, use_count, last_used)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, food_id) DO UPDATE SET
       use_count = use_count + 1,
       last_used = CURRENT_TIMESTAMP`
  ).bind(user.id, food_id).run();
  
  // Update daily log
  await db.prepare(
    `INSERT INTO nutrition_log (user_id, date, protein_grams, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) DO UPDATE SET
       protein_grams = protein_grams + excluded.protein_grams,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(user.id, mealDate, Math.round(macros.protein_g)).run();
  
  return c.json({
    added: {
      food_name: food.name,
      quantity: qty,
      unit: unitValue,
      macros
    },
    message: 'Food added'
  });
});

// ========== SAVED MEALS ==========

// Get user's saved meals
nutrition.get('/saved-meals', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  
  const meals = await db.prepare(
    `SELECT * FROM saved_meals 
     WHERE user_id = ? 
     ORDER BY is_favorite DESC, use_count DESC, name ASC`
  ).bind(user.id).all();
  
  return c.json({ saved_meals: meals.results || [] });
});

// Create a saved meal
nutrition.post('/saved-meals', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const db = c.env.DB;
  
  const { name, description, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, recipe_url, foods } = body;
  
  if (!name) {
    return c.json({ error: 'Meal name is required' }, 400);
  }
  
  // Calculate totals if foods provided
  let totalCalories = calories || 0;
  let totalProtein = protein_g || 0;
  let totalCarbs = carbs_g || 0;
  let totalFat = fat_g || 0;
  let totalFiber = fiber_g || 0;
  
  if (foods && foods.length > 0) {
    totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
    totalProtein = foods.reduce((sum, f) => sum + (f.protein_g || 0), 0);
    totalCarbs = foods.reduce((sum, f) => sum + (f.carbs_g || 0), 0);
    totalFat = foods.reduce((sum, f) => sum + (f.fat_g || 0), 0);
    totalFiber = foods.reduce((sum, f) => sum + (f.fiber_g || 0), 0);
  }
  
  const meal = await db.prepare(
    `INSERT INTO saved_meals (user_id, name, description, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, recipe_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(user.id, name, description || null, meal_type || 'any', totalCalories, totalProtein, totalCarbs, totalFat, totalFiber, recipe_url || null).first();
  
  // Add foods if provided
  if (foods && foods.length > 0) {
    for (const food of foods) {
      await db.prepare(
        `INSERT INTO saved_meal_foods (saved_meal_id, food_id, custom_name, quantity, unit, calories, protein_g, carbs_g, fat_g)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(meal.id, food.food_id || null, food.custom_name || null, food.quantity || 1, food.unit || 'serving',
             food.calories || 0, food.protein_g || 0, food.carbs_g || 0, food.fat_g || 0).run();
    }
  }
  
  return c.json({ saved_meal: meal, message: 'Meal saved' });
});

// Update a saved meal
nutrition.put('/saved-meals/:id', async (c) => {
  const user = requireAuth(c);
  const mealId = c.req.param('id');
  const body = await c.req.json();
  const db = c.env.DB;
  
  const { name, description, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, recipe_url, is_favorite } = body;
  
  const meal = await db.prepare(
    `UPDATE saved_meals 
     SET name = COALESCE(?, name),
         description = COALESCE(?, description),
         meal_type = COALESCE(?, meal_type),
         calories = COALESCE(?, calories),
         protein_g = COALESCE(?, protein_g),
         carbs_g = COALESCE(?, carbs_g),
         fat_g = COALESCE(?, fat_g),
         fiber_g = COALESCE(?, fiber_g),
         recipe_url = COALESCE(?, recipe_url),
         is_favorite = COALESCE(?, is_favorite),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?
     RETURNING *`
  ).bind(name, description, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, recipe_url, is_favorite, mealId, user.id).first();
  
  if (!meal) {
    return c.json({ error: 'Meal not found' }, 404);
  }
  
  return c.json({ saved_meal: meal, message: 'Meal updated' });
});

// Delete a saved meal
nutrition.delete('/saved-meals/:id', async (c) => {
  const user = requireAuth(c);
  const mealId = c.req.param('id');
  const db = c.env.DB;
  
  await db.prepare('DELETE FROM saved_meals WHERE id = ? AND user_id = ?').bind(mealId, user.id).run();
  
  return c.json({ message: 'Meal deleted' });
});

// Log a saved meal (add to today's nutrition)
nutrition.post('/saved-meals/:id/log', async (c) => {
  const user = requireAuth(c);
  const mealId = c.req.param('id');
  const body = await c.req.json();
  const db = c.env.DB;
  
  const { date, meal_type } = body;
  const logDate = date || new Date().toISOString().split('T')[0];
  
  // Get the saved meal
  const savedMeal = await db.prepare(
    'SELECT * FROM saved_meals WHERE id = ? AND user_id = ?'
  ).bind(mealId, user.id).first();
  
  if (!savedMeal) {
    return c.json({ error: 'Saved meal not found' }, 404);
  }
  
  // Create or get today's meal entry
  let meal = await db.prepare(
    'SELECT * FROM meals WHERE user_id = ? AND date = ? AND meal_type = ?'
  ).bind(user.id, logDate, meal_type || savedMeal.meal_type || 'snack').first();
  
  if (!meal) {
    meal = await db.prepare(
      `INSERT INTO meals (user_id, date, meal_type, name) VALUES (?, ?, ?, ?) RETURNING *`
    ).bind(user.id, logDate, meal_type || savedMeal.meal_type || 'snack', savedMeal.name).first();
  }
  
  // Get saved meal foods and add them
  const savedFoods = await db.prepare(
    'SELECT * FROM saved_meal_foods WHERE saved_meal_id = ?'
  ).bind(mealId).all();
  
  for (const food of (savedFoods.results || [])) {
    await db.prepare(
      `INSERT INTO meal_foods (meal_id, food_id, quantity, unit, calories, protein_g, carbs_g, fat_g, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(meal.id, food.food_id, food.quantity, food.unit, food.calories, food.protein_g, food.carbs_g, food.fat_g, food.custom_name).run();
  }
  
  // Update nutrition log
  await db.prepare(
    `INSERT INTO nutrition_log (user_id, date, protein_grams, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date) DO UPDATE SET
       protein_grams = protein_grams + excluded.protein_grams,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(user.id, logDate, Math.round(savedMeal.protein_g)).run();
  
  // Update saved meal usage
  await db.prepare(
    `UPDATE saved_meals SET use_count = use_count + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(mealId).run();
  
  return c.json({ 
    logged: {
      meal_name: savedMeal.name,
      calories: savedMeal.calories,
      protein_g: savedMeal.protein_g,
      carbs_g: savedMeal.carbs_g,
      fat_g: savedMeal.fat_g
    },
    message: 'Meal logged' 
  });
});

// ========== RECIPE URL PARSING ==========

// Parse nutrition from a recipe URL
nutrition.post('/parse-recipe', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const { url } = body;
  
  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }
  
  try {
    // Fetch the recipe page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FitnessCoach/1.0; +https://example.com)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recipe: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Try to extract JSON-LD structured data (most recipe sites use this)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    let recipeData = null;
    
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonStr = match.replace(/<script type="application\/ld\+json">/i, '').replace(/<\/script>/i, '');
          const data = JSON.parse(jsonStr);
          
          // Handle array or single object
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'Recipe' || (item['@graph'] && item['@graph'].find(g => g['@type'] === 'Recipe'))) {
              recipeData = item['@type'] === 'Recipe' ? item : item['@graph'].find(g => g['@type'] === 'Recipe');
              break;
            }
          }
          if (recipeData) break;
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!recipeData) {
      // Fallback: try to extract from meta tags
      const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      const name = nameMatch ? nameMatch[1] : 'Recipe';
      
      return c.json({
        recipe: {
          name: name,
          url: url,
          calories: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          servings: null,
          parsed: false,
          message: 'Could not automatically parse nutrition. Please enter manually.'
        }
      });
    }
    
    // Extract nutrition from structured data
    const nutrition = recipeData.nutrition || {};
    
    const parseNutrientValue = (value) => {
      if (!value) return null;
      const numMatch = String(value).match(/[\d.]+/);
      return numMatch ? parseFloat(numMatch[0]) : null;
    };
    
    const recipe = {
      name: recipeData.name || 'Recipe',
      description: recipeData.description || null,
      url: url,
      servings: parseNutrientValue(recipeData.recipeYield) || 1,
      calories: parseNutrientValue(nutrition.calories),
      protein_g: parseNutrientValue(nutrition.proteinContent),
      carbs_g: parseNutrientValue(nutrition.carbohydrateContent),
      fat_g: parseNutrientValue(nutrition.fatContent),
      fiber_g: parseNutrientValue(nutrition.fiberContent),
      sugar_g: parseNutrientValue(nutrition.sugarContent),
      sodium_mg: parseNutrientValue(nutrition.sodiumContent),
      parsed: true
    };
    
    return c.json({ recipe });
    
  } catch (error) {
    console.error('Recipe parsing error:', error);
    return c.json({ error: error.message, recipe: null }, 500);
  }
});

export default nutrition;
