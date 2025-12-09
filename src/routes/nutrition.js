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

export default nutrition;
