import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { getUserAchievements, getRecentPRs, getWorkoutStreak } from '../services/achievements';

const achievements = new Hono();

// Get all user achievements and stats
achievements.get('/', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  const data = await getUserAchievements(db, user.id);
  
  return c.json(data);
});

// Get recent personal records
achievements.get('/prs', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '20');

  const prs = await getRecentPRs(db, user.id, limit);
  
  return c.json({ prs });
});

// Get workout streak info
achievements.get('/streak', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  const streak = await getWorkoutStreak(db, user.id);
  
  return c.json({ streak });
});

// Get all achievement definitions (for display)
achievements.get('/definitions', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  const definitions = await db.prepare(`
    SELECT * FROM achievement_definitions 
    ORDER BY category, requirement_value
  `).all();
  
  return c.json({ definitions: definitions.results });
});

// Get leaderboard (top streaks/workouts/PRs)
achievements.get('/leaderboard', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  // Top streaks
  const topStreaks = await db.prepare(`
    SELECT 
      u.name,
      ws.current_streak,
      ws.longest_streak
    FROM workout_streaks ws
    JOIN users u ON ws.user_id = u.id
    ORDER BY ws.current_streak DESC
    LIMIT 10
  `).all();

  // Most workouts
  const topWorkouts = await db.prepare(`
    SELECT 
      u.name,
      COUNT(*) as total_workouts
    FROM workouts w
    JOIN users u ON w.user_id = u.id
    WHERE w.status = 'completed'
    GROUP BY u.id
    ORDER BY total_workouts DESC
    LIMIT 10
  `).all();

  // Most achievements
  const topAchievements = await db.prepare(`
    SELECT 
      u.name,
      COUNT(*) as achievement_count
    FROM user_achievements ua
    JOIN users u ON ua.user_id = u.id
    GROUP BY u.id
    ORDER BY achievement_count DESC
    LIMIT 10
  `).all();

  return c.json({
    topStreaks: topStreaks.results || [],
    topWorkouts: topWorkouts.results || [],
    topAchievements: topAchievements.results || []
  });
});

export default achievements;
