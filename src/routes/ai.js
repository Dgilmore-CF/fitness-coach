import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';

const ai = new Hono();

// Get all recommendations for user
ai.get('/recommendations', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;

  try {
    // Get active recommendations
    const recommendations = await db.prepare(`
      SELECT * FROM ai_recommendations 
      WHERE user_id = ? AND status = 'active'
      ORDER BY priority DESC, created_at DESC
    `).bind(user.id).all();

    // Get recommendation stats
    const stats = await db.prepare(`
      SELECT 
        SUM(CASE WHEN category = 'volume' THEN 1 ELSE 0 END) as volume,
        SUM(CASE WHEN category = 'recovery' THEN 1 ELSE 0 END) as recovery,
        SUM(CASE WHEN category = 'balance' THEN 1 ELSE 0 END) as balance,
        SUM(CASE WHEN category = 'injury_prevention' THEN 1 ELSE 0 END) as warnings
      FROM ai_recommendations
      WHERE user_id = ? AND status = 'active'
    `).bind(user.id).first();

    // Get user settings
    const settings = await db.prepare(`
      SELECT ai_auto_apply, ai_weekly_analysis, ai_realtime_suggestions
      FROM users WHERE id = ?
    `).bind(user.id).first();

    // Parse action_items JSON for each recommendation
    const parsedRecommendations = recommendations.results.map(rec => ({
      ...rec,
      action_items: rec.action_items ? JSON.parse(rec.action_items) : []
    }));

    return c.json({
      recommendations: parsedRecommendations,
      stats: stats || { volume: 0, recovery: 0, balance: 0, warnings: 0 },
      settings: {
        auto_apply: settings?.ai_auto_apply === 1,
        weekly_analysis: settings?.ai_weekly_analysis !== 0,
        realtime_suggestions: settings?.ai_realtime_suggestions !== 0
      }
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return c.json({ error: 'Failed to fetch recommendations' }, 500);
  }
});

// Get single recommendation
ai.get('/recommendations/:id', async (c) => {
  const user = requireAuth(c);
  const recId = c.req.param('id');
  const db = c.env.DB;

  const recommendation = await db.prepare(`
    SELECT * FROM ai_recommendations WHERE id = ? AND user_id = ?
  `).bind(recId, user.id).first();

  if (!recommendation) {
    return c.json({ error: 'Recommendation not found' }, 404);
  }

  // Parse action_items JSON
  recommendation.action_items = recommendation.action_items ? 
    JSON.parse(recommendation.action_items) : [];

  return c.json({ recommendation });
});

// Generate new recommendations
ai.post('/recommendations/generate', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const aiModel = c.env.AI;

  try {
    // Get user's workout history
    const workouts = await db.prepare(`
      SELECT w.*, 
        (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id) as exercise_count,
        (SELECT SUM(weight_kg * reps) FROM sets s 
         JOIN workout_exercises we ON s.workout_exercise_id = we.id 
         WHERE we.workout_id = w.id) as total_volume
      FROM workouts w
      WHERE w.user_id = ? AND w.completed = 1
      ORDER BY w.start_time DESC
      LIMIT 20
    `).bind(user.id).all();

    if (workouts.results.length < 3) {
      return c.json({ 
        message: 'Need at least 3 completed workouts to generate recommendations',
        recommendations: []
      });
    }

    // Get muscle group distribution
    const muscleGroups = await db.prepare(`
      SELECT e.muscle_group, COUNT(*) as exercise_count,
        SUM(we.target_sets * 10) as estimated_volume
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ? AND w.completed = 1
        AND w.start_time > datetime('now', '-30 days')
      GROUP BY e.muscle_group
    `).bind(user.id).all();

    // Build analysis prompt
    const analysisPrompt = `Analyze this training data and provide 2-3 specific recommendations:

Recent Workouts: ${workouts.results.length} completed in last 30 days
Muscle Group Distribution:
${muscleGroups.results.map(mg => `- ${mg.muscle_group}: ${mg.exercise_count} exercises, ~${mg.estimated_volume} volume`).join('\n')}

Average workout frequency: ${(workouts.results.length / 4).toFixed(1)} per week

Provide recommendations in this JSON format:
{
  "recommendations": [
    {
      "title": "Brief title",
      "description": "Detailed explanation",
      "category": "volume|recovery|balance|injury_prevention",
      "priority": "high|medium|low",
      "action_items": ["Step 1", "Step 2"],
      "reasoning": "Why this matters",
      "expected_outcome": "What will improve",
      "auto_apply": true
    }
  ]
}

Focus on: volume optimization, muscle balance, recovery needs, injury prevention.`;

    // Call AI model
    const aiResponse = await aiModel.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are an expert strength coach analyzing training data.' },
        { role: 'user', content: analysisPrompt }
      ]
    });

    // Parse AI response
    let aiRecommendations = [];
    try {
      const responseText = aiResponse.response || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiRecommendations = parsed.recommendations || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: Create generic recommendations
      aiRecommendations = [{
        title: 'Maintain Training Consistency',
        description: 'Continue your current training frequency and volume',
        category: 'volume',
        priority: 'low',
        action_items: ['Track your workouts regularly', 'Monitor recovery between sessions'],
        reasoning: 'Your training is progressing well',
        expected_outcome: 'Continued steady progress',
        auto_apply: false
      }];
    }

    // Insert recommendations into database
    const insertedIds = [];
    for (const rec of aiRecommendations) {
      const result = await db.prepare(`
        INSERT INTO ai_recommendations 
        (user_id, title, description, category, priority, action_items, reasoning, expected_outcome, auto_apply, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).bind(
        user.id,
        rec.title,
        rec.description,
        rec.category,
        rec.priority,
        JSON.stringify(rec.action_items || []),
        rec.reasoning || '',
        rec.expected_outcome || '',
        rec.auto_apply ? 1 : 0
      ).run();

      if (result.meta.last_row_id) {
        insertedIds.push(result.meta.last_row_id);
      }
    }

    return c.json({ 
      message: 'Recommendations generated successfully',
      count: insertedIds.length,
      recommendation_ids: insertedIds
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return c.json({ error: 'Failed to generate recommendations' }, 500);
  }
});

// Apply recommendation (modify program)
ai.post('/recommendations/:id/apply', async (c) => {
  const user = requireAuth(c);
  const recId = c.req.param('id');
  const db = c.env.DB;

  try {
    // Get recommendation
    const rec = await db.prepare(`
      SELECT * FROM ai_recommendations WHERE id = ? AND user_id = ?
    `).bind(recId, user.id).first();

    if (!rec) {
      return c.json({ error: 'Recommendation not found' }, 404);
    }

    // Mark as applied
    await db.prepare(`
      UPDATE ai_recommendations SET status = 'applied', applied_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(recId).run();

    // TODO: Implement program modification logic based on recommendation category
    // For now, just mark it as applied

    return c.json({ 
      message: 'Recommendation applied successfully',
      recommendation_id: recId
    });
  } catch (error) {
    console.error('Error applying recommendation:', error);
    return c.json({ error: 'Failed to apply recommendation' }, 500);
  }
});

// Dismiss recommendation
ai.post('/recommendations/:id/dismiss', async (c) => {
  const user = requireAuth(c);
  const recId = c.req.param('id');
  const db = c.env.DB;

  const result = await db.prepare(`
    UPDATE ai_recommendations SET status = 'dismissed', applied_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(recId, user.id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Recommendation not found' }, 404);
  }

  return c.json({ message: 'Recommendation dismissed' });
});

// Update AI settings
ai.patch('/recommendations/settings', async (c) => {
  const user = requireAuth(c);
  const db = c.env.DB;
  const settings = await c.req.json();

  const updates = [];
  const bindings = [];

  if (settings.auto_apply !== undefined) {
    updates.push('ai_auto_apply = ?');
    bindings.push(settings.auto_apply ? 1 : 0);
  }
  if (settings.weekly_analysis !== undefined) {
    updates.push('ai_weekly_analysis = ?');
    bindings.push(settings.weekly_analysis ? 1 : 0);
  }
  if (settings.realtime_suggestions !== undefined) {
    updates.push('ai_realtime_suggestions = ?');
    bindings.push(settings.realtime_suggestions ? 1 : 0);
  }

  if (updates.length > 0) {
    bindings.push(user.id);
    await db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).bind(...bindings).run();
  }

  return c.json({ message: 'Settings updated successfully' });
});

export default ai;
