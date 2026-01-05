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

// Recalculate all PRs from actual set data (fixes corrupted PR data)
achievements.post('/prs/recalculate', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  try {
    // Delete all existing PRs for this user
    await db.prepare('DELETE FROM personal_records WHERE user_id = ?').bind(user.id).run();

    // Get all sets with their exercise info, grouped by exercise
    const allSets = await db.prepare(`
      SELECT 
        s.weight_kg,
        s.reps,
        s.one_rep_max_kg,
        we.exercise_id,
        e.name as exercise_name,
        w.id as workout_id,
        w.start_time
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN exercises e ON we.exercise_id = e.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ? AND w.completed = 1 AND s.weight_kg > 0
      ORDER BY we.exercise_id, w.start_time
    `).bind(user.id).all();

    // Group by exercise and find best 1RM for each
    const exerciseBests = {};
    for (const set of allSets.results || []) {
      // Calculate 1RM using Epley formula
      const oneRM = set.reps === 1 ? set.weight_kg : set.weight_kg * (1 + set.reps / 30);
      
      if (!exerciseBests[set.exercise_id] || oneRM > exerciseBests[set.exercise_id].best1RM) {
        exerciseBests[set.exercise_id] = {
          best1RM: oneRM,
          exerciseName: set.exercise_name,
          workoutId: set.workout_id,
          achievedAt: set.start_time
        };
      }
    }

    // Insert new PRs
    let prCount = 0;
    for (const [exerciseId, data] of Object.entries(exerciseBests)) {
      await db.prepare(`
        INSERT INTO personal_records (user_id, exercise_id, record_type, record_value, workout_id, previous_value, achieved_at)
        VALUES (?, ?, '1rm', ?, ?, 0, ?)
      `).bind(user.id, exerciseId, data.best1RM, data.workoutId, data.achievedAt).run();
      prCount++;
    }

    return c.json({ 
      success: true, 
      message: `Recalculated ${prCount} personal records from your workout history`,
      prs_updated: prCount
    });
  } catch (error) {
    console.error('Error recalculating PRs:', error);
    return c.json({ error: 'Failed to recalculate PRs: ' + error.message }, 500);
  }
});

export default achievements;
