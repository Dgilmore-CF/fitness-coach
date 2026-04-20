/**
 * AI-powered nutrition coaching service.
 *
 * Provides three capabilities:
 *   1. analyzeNutrition()   – reviews today's + recent intake, returns
 *                              actionable insights and gaps (rule-based with
 *                              optional AI-enhanced narrative).
 *   2. suggestNextMeal()    – given current macros vs goals, suggests a
 *                              meal to hit the remaining targets (AI-
 *                              generated with structured fallback).
 *   3. parseMealFromText()  – parses natural-language meal descriptions
 *                              ("2 eggs and a slice of whole-wheat toast")
 *                              into structured food entries with estimated
 *                              macros.
 *
 * Each function gracefully degrades: rule-based output is always returned
 * even if the AI call fails, so the user gets something useful.
 */

import { callAI, parseAIJsonResponse, parseAIJsonArray } from '../utils/ai-parser.js';

// ============================================================================
// Shared helpers
// ============================================================================

async function getTargets(db, userId, weightKg) {
  const target = await db.prepare(
    `SELECT * FROM macro_targets WHERE user_id = ?
     ORDER BY effective_date DESC LIMIT 1`
  ).bind(userId).first().catch(() => null);

  const weight = weightKg || 75;
  return {
    calories: target?.calories || Math.round(weight * 30),
    protein_g: target?.protein_g || Math.round(weight * 2),
    carbs_g: target?.carbs_g || Math.round((weight * 30 * 0.40) / 4),
    fat_g: target?.fat_g || Math.round((weight * 30 * 0.30) / 9),
    fiber_g: target?.fiber_g || 30,
    water_ml: target?.water_ml || Math.round(weight * 35)
  };
}

async function getDailyLog(db, userId, date) {
  const log = await db.prepare(
    'SELECT * FROM nutrition_log WHERE user_id = ? AND date = ?'
  ).bind(userId, date).first();

  return {
    calories: log?.calories || 0,
    protein_grams: log?.protein_grams || 0,
    carbs_grams: log?.carbs_grams || 0,
    fat_grams: log?.fat_grams || 0,
    fiber_grams: log?.fiber_grams || 0,
    water_ml: log?.water_ml || 0,
    creatine_grams: log?.creatine_grams || 0
  };
}

async function getRecentLogs(db, userId, days = 7) {
  const result = await db.prepare(
    `SELECT * FROM nutrition_log
     WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
     ORDER BY date DESC`
  ).bind(userId, days).all();
  return result.results || [];
}

// ============================================================================
// 1. Daily nutrition analysis
// ============================================================================

/**
 * Build rule-based insights that are always available, then optionally
 * enhance with an AI-generated narrative summary.
 */
export async function analyzeNutrition({ ai, db, user, date }) {
  const today = date || new Date().toISOString().split('T')[0];
  const [todayLog, recentLogs, targets] = await Promise.all([
    getDailyLog(db, user.id, today),
    getRecentLogs(db, user.id, 7),
    getTargets(db, user.id, user.weight_kg)
  ]);

  // Compute remaining macros for today
  const remaining = {
    calories: Math.max(0, targets.calories - todayLog.calories),
    protein_g: Math.max(0, targets.protein_g - todayLog.protein_grams),
    carbs_g: Math.max(0, targets.carbs_g - todayLog.carbs_grams),
    fat_g: Math.max(0, targets.fat_g - todayLog.fat_grams),
    fiber_g: Math.max(0, targets.fiber_g - todayLog.fiber_grams),
    water_ml: Math.max(0, targets.water_ml - todayLog.water_ml)
  };

  const pct = (value, goal) => (goal > 0 ? Math.round((value / goal) * 100) : 0);
  const progress = {
    calorie_percentage: pct(todayLog.calories, targets.calories),
    protein_percentage: pct(todayLog.protein_grams, targets.protein_g),
    carbs_percentage: pct(todayLog.carbs_grams, targets.carbs_g),
    fat_percentage: pct(todayLog.fat_grams, targets.fat_g),
    fiber_percentage: pct(todayLog.fiber_grams, targets.fiber_g),
    water_percentage: pct(todayLog.water_ml, targets.water_ml)
  };

  // Rule-based insights
  const insights = [];

  // Protein-first insight (matters most for fitness goals)
  if (progress.protein_percentage < 50) {
    insights.push({
      priority: 'high',
      category: 'protein',
      title: 'Protein is running low',
      message: `You're at ${todayLog.protein_grams.toFixed(0)}g of ${targets.protein_g}g protein (${progress.protein_percentage}%). Add ${remaining.protein_g}g more to hit your target — try chicken, Greek yogurt, whey, or eggs.`
    });
  } else if (progress.protein_percentage >= 100) {
    insights.push({
      priority: 'low',
      category: 'protein',
      title: 'Protein target hit',
      message: `Nailed it — ${todayLog.protein_grams.toFixed(0)}g protein (${progress.protein_percentage}%). Consistency here drives recovery.`
    });
  }

  // Calories
  if (progress.calorie_percentage < 60 && todayLog.calories > 0) {
    insights.push({
      priority: 'medium',
      category: 'calories',
      title: 'Calories are low',
      message: `${todayLog.calories} / ${targets.calories} kcal. You have ${remaining.calories} kcal left — under-eating can stall recovery. Consider a balanced meal or calorie-dense snack.`
    });
  } else if (progress.calorie_percentage > 110) {
    insights.push({
      priority: 'medium',
      category: 'calories',
      title: 'Calories are over target',
      message: `${todayLog.calories} kcal logged, ${todayLog.calories - targets.calories} kcal over target. Not a problem once — watch the weekly trend.`
    });
  }

  // Water
  if (progress.water_percentage < 50) {
    insights.push({
      priority: 'medium',
      category: 'water',
      title: 'Hydration is behind',
      message: `${todayLog.water_ml}ml so far. Aim for ${remaining.water_ml}ml more by end of day. Drink a glass now.`
    });
  }

  // Fiber
  if (progress.fiber_percentage < 50 && progress.calorie_percentage > 40) {
    insights.push({
      priority: 'low',
      category: 'fiber',
      title: 'Low fiber so far',
      message: `Only ${todayLog.fiber_grams.toFixed(0)}g fiber. Add veggies, berries, or oats — supports digestion and satiety.`
    });
  }

  // Weekly pattern check
  if (recentLogs.length >= 5) {
    const proteinDays = recentLogs.filter((l) => (l.protein_grams || 0) >= targets.protein_g).length;
    const proteinHitRate = proteinDays / recentLogs.length;
    if (proteinHitRate < 0.5) {
      insights.push({
        priority: 'high',
        category: 'trend',
        title: 'Weekly protein hit-rate is low',
        message: `You hit protein target on ${proteinDays}/${recentLogs.length} of the last days. Set a reminder, or pre-plan 1 high-protein meal per day.`
      });
    }

    const avgCalories = recentLogs.reduce((s, l) => s + (l.calories || 0), 0) / recentLogs.length;
    if (avgCalories > 0 && Math.abs(avgCalories - targets.calories) / targets.calories > 0.20) {
      insights.push({
        priority: 'medium',
        category: 'trend',
        title: avgCalories > targets.calories ? 'Weekly calories trending high' : 'Weekly calories trending low',
        message: `7-day average: ${Math.round(avgCalories)} kcal vs ${targets.calories} goal. ${
          avgCalories > targets.calories
            ? 'Consider trimming portion sizes or adding a fasting window.'
            : 'Add a calorie-dense snack to stay in the target zone.'
        }`
      });
    }
  }

  // Empty state
  if (todayLog.calories === 0 && todayLog.protein_grams === 0 && todayLog.water_ml === 0) {
    insights.unshift({
      priority: 'medium',
      category: 'empty',
      title: "You haven't logged anything today",
      message: 'Quick-log a meal, scan a barcode, or use the Parse Meal feature to start tracking.'
    });
  }

  // AI-enhanced narrative (optional — never block the response on it)
  let narrative = null;
  if (ai) {
    const promptSummary = [
      `Today: ${todayLog.calories} kcal, ${todayLog.protein_grams}g protein, ${todayLog.carbs_grams}g carbs, ${todayLog.fat_grams}g fat, ${todayLog.water_ml}ml water.`,
      `Targets: ${targets.calories} kcal, ${targets.protein_g}g protein, ${targets.carbs_g}g carbs, ${targets.fat_g}g fat, ${targets.water_ml}ml water.`,
      recentLogs.length > 0
        ? `Past 7 days averages: ${Math.round(recentLogs.reduce((s, l) => s + (l.calories || 0), 0) / recentLogs.length)} kcal, ${Math.round(recentLogs.reduce((s, l) => s + (l.protein_grams || 0), 0) / recentLogs.length)}g protein.`
        : 'No recent history.'
    ].join('\n');

    const result = await callAI(ai, {
      systemPrompt:
        'You are a direct, evidence-based fitness nutrition coach. Reply in 2-3 sentences max. Focus on the most actionable thing the user can do right now. Never exceed 60 words.',
      userPrompt: `Nutrition data:\n${promptSummary}\n\nGive one specific, actionable coaching tip for the rest of today.`,
      maxTokens: 200
    });

    if (result.success && result.text) {
      narrative = result.text.trim();
    }
  }

  return {
    date: today,
    today: todayLog,
    targets,
    remaining,
    progress,
    insights,
    narrative
  };
}

// ============================================================================
// 2. Meal suggestion to hit remaining macros
// ============================================================================

/**
 * Suggest a meal that helps hit the user's remaining macros for the day.
 * Uses AI for variety; falls back to rule-based suggestions.
 */
export async function suggestNextMeal({ ai, db, user, mealType = 'next' }) {
  const today = new Date().toISOString().split('T')[0];
  const [todayLog, targets] = await Promise.all([
    getDailyLog(db, user.id, today),
    getTargets(db, user.id, user.weight_kg)
  ]);

  const remaining = {
    calories: Math.max(0, targets.calories - todayLog.calories),
    protein_g: Math.max(0, targets.protein_g - todayLog.protein_grams),
    carbs_g: Math.max(0, targets.carbs_g - todayLog.carbs_grams),
    fat_g: Math.max(0, targets.fat_g - todayLog.fat_grams)
  };

  // Rule-based fallback — simple rotating suggestions based on remaining macros
  const fallback = buildFallbackSuggestion(remaining, mealType);

  if (!ai) return { remaining, suggestions: [fallback], source: 'fallback' };

  const result = await callAI(ai, {
    systemPrompt:
      'You are a fitness nutrition coach. Suggest 3 realistic meals that hit the target macros closely. ' +
      'Return ONLY valid JSON with this exact shape:\n' +
      '{"suggestions":[{"name":"<meal name>","description":"<1-2 sentence summary>","ingredients":["<ingredient + quantity>"],"macros":{"calories":<number>,"protein_g":<number>,"carbs_g":<number>,"fat_g":<number>}}]}\n' +
      'No prose, no markdown, just JSON. Ingredients should be realistic (e.g. "6 oz grilled chicken breast").',
    userPrompt: `Suggest 3 meals totaling approximately:
- ${remaining.calories} kcal
- ${remaining.protein_g}g protein
- ${remaining.carbs_g}g carbs
- ${remaining.fat_g}g fat

Meal type hint: ${mealType}. Prefer whole foods. Portion sizes must be realistic.`,
    maxTokens: 800,
    parseJson: true,
    fallbackJson: { suggestions: [fallback] }
  });

  const parsed = result.parsed || { suggestions: [fallback] };
  const suggestions = Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
    ? parsed.suggestions
    : [fallback];

  return {
    remaining,
    suggestions,
    source: result.success ? 'ai' : 'fallback'
  };
}

function buildFallbackSuggestion(remaining, mealType) {
  const cal = remaining.calories || 500;
  const p = remaining.protein_g || 30;
  const c = remaining.carbs_g || 50;
  const f = remaining.fat_g || 15;

  const templates = [
    {
      name: 'Grilled chicken bowl',
      description: 'Classic high-protein meal that covers most common macro gaps.',
      ingredients: [
        `${Math.max(4, Math.round(p / 8))} oz grilled chicken breast`,
        `${Math.max(0.5, Math.round((c / 40) * 2) / 2)} cup cooked rice`,
        '1 cup mixed steamed vegetables',
        '1 tsp olive oil',
        'Salt, pepper, garlic'
      ],
      macros: { calories: cal, protein_g: p, carbs_g: c, fat_g: f }
    },
    {
      name: 'Greek yogurt parfait',
      description: 'Fast, high-protein, works for breakfast or a snack.',
      ingredients: [
        `${Math.max(1, Math.round(p / 20))} cup plain Greek yogurt (0-2% fat)`,
        '1/2 cup berries',
        '1 tbsp honey',
        '1/4 cup low-sugar granola'
      ],
      macros: { calories: cal, protein_g: p, carbs_g: c, fat_g: f }
    },
    {
      name: 'Egg & veggie scramble with toast',
      description: 'Rounded protein+carb meal, easy to prep.',
      ingredients: [
        `${Math.max(2, Math.round(p / 12))} whole eggs`,
        '1 cup spinach + 1/2 cup bell pepper',
        '1-2 slices whole-grain toast',
        '1/4 avocado'
      ],
      macros: { calories: cal, protein_g: p, carbs_g: c, fat_g: f }
    }
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

// ============================================================================
// 3. Natural-language meal parsing
// ============================================================================

/**
 * Parse natural-language meal descriptions into structured food entries.
 *
 * Uses the larger Llama 3.3 70B model for better accuracy on nutrition
 * data (the 8B model hallucinates macros). Prompt is few-shot with known
 * USDA values, and returned macros are validated against Atwater
 * coefficients (4·protein + 4·carbs + 9·fat ≈ calories) — entries that
 * fail the sanity check are recomputed from the macros and flagged as
 * lower confidence.
 *
 * Example input:  "2 eggs, a slice of whole-wheat toast, and a banana"
 */
export async function parseMealFromText({ ai, text }) {
  if (!text || text.trim().length < 2) {
    return { foods: [], error: 'Please describe what you ate.' };
  }

  if (!ai) {
    return {
      foods: [],
      error: 'AI not available — use the food search or barcode scanner instead.'
    };
  }

  // Few-shot prompt with USDA reference values the model can anchor on
  const systemPrompt = `You are a nutrition data extractor trained on USDA FoodData Central.

Parse natural-language meal descriptions into structured food items with PER-ITEM macros (not per meal totals).

REQUIREMENTS:
- Return ONLY valid JSON. No prose, no markdown, no code fences.
- Macros must be REALISTIC. Use USDA values for common foods.
- The field "calories" MUST roughly equal 4·protein_g + 4·carbs_g + 9·fat_g (±15%).
- "quantity" × per-unit macros = what the user ate. Per-unit macros go in the object.
- Units: serving | cup | tbsp | tsp | oz | g | ml | slice | medium | large | small | whole
- "confidence": high = common exact food, medium = reasonable estimate, low = guessing.
- If input is nonsense, return {"foods":[]}.

EXACT SHAPE:
{"foods":[{"name":"<food>","quantity":<num>,"unit":"<unit>","calories":<per unit>,"protein_g":<per unit>,"carbs_g":<per unit>,"fat_g":<per unit>,"fiber_g":<per unit>,"confidence":"<high|medium|low>"}]}

EXAMPLES:

Input: "2 eggs and a slice of whole-wheat toast"
Output: {"foods":[{"name":"Egg, whole, large","quantity":2,"unit":"large","calories":72,"protein_g":6,"carbs_g":0.4,"fat_g":5,"fiber_g":0,"confidence":"high"},{"name":"Whole-wheat toast","quantity":1,"unit":"slice","calories":80,"protein_g":4,"carbs_g":14,"fat_g":1.1,"fiber_g":2,"confidence":"high"}]}

Input: "a medium banana and 1 cup greek yogurt"
Output: {"foods":[{"name":"Banana","quantity":1,"unit":"medium","calories":105,"protein_g":1.3,"carbs_g":27,"fat_g":0.4,"fiber_g":3.1,"confidence":"high"},{"name":"Greek yogurt, plain, nonfat","quantity":1,"unit":"cup","calories":133,"protein_g":23,"carbs_g":8.7,"fat_g":0.7,"fiber_g":0,"confidence":"high"}]}

Input: "6oz grilled chicken breast and 1 cup white rice"
Output: {"foods":[{"name":"Chicken breast, grilled","quantity":6,"unit":"oz","calories":47,"protein_g":8.8,"carbs_g":0,"fat_g":1,"fiber_g":0,"confidence":"high"},{"name":"White rice, cooked","quantity":1,"unit":"cup","calories":205,"protein_g":4.3,"carbs_g":45,"fat_g":0.4,"fiber_g":0.6,"confidence":"high"}]}`;

  // Prefer the larger 70B model for accuracy; fall back to 8B if unavailable
  const models = [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/meta/llama-3.1-8b-instruct'
  ];

  let result = { success: false, parsed: { foods: [] } };
  for (const model of models) {
    result = await callAI(ai, {
      systemPrompt,
      userPrompt: `Input: "${text.trim()}"\nOutput:`,
      model,
      maxTokens: 1200,
      parseJson: true,
      fallbackJson: { foods: [] }
    });
    if (result.success && Array.isArray(result.parsed?.foods) && result.parsed.foods.length > 0) {
      break;
    }
  }

  const parsed = result.parsed || {};
  const rawFoods = Array.isArray(parsed.foods) ? parsed.foods : [];

  // Sanitize + validate each entry
  const clean = rawFoods
    .filter((f) => f && typeof f.name === 'string' && f.name.trim().length > 0)
    .map((f) => {
      const protein = Math.max(0, Number(f.protein_g) || 0);
      const carbs = Math.max(0, Number(f.carbs_g) || 0);
      const fat = Math.max(0, Number(f.fat_g) || 0);
      const fiber = Math.max(0, Number(f.fiber_g) || 0);
      let calories = Math.max(0, Number(f.calories) || 0);
      let confidence = ['high', 'medium', 'low'].includes(String(f.confidence).toLowerCase())
        ? String(f.confidence).toLowerCase()
        : 'medium';

      // Atwater sanity check: 4P + 4C + 9F should roughly equal calories.
      // If the model's calories disagree with the macros by >25%, recompute
      // from the macros (they're usually more reliable) and downgrade confidence.
      const computed = Math.round(protein * 4 + carbs * 4 + fat * 9);
      if (calories > 0 && computed > 0) {
        const ratio = calories / computed;
        if (ratio < 0.75 || ratio > 1.25) {
          calories = computed;
          confidence = confidence === 'high' ? 'medium' : 'low';
        }
      } else if (calories === 0 && computed > 0) {
        calories = computed;
        confidence = confidence === 'high' ? 'medium' : confidence;
      }

      return {
        name: String(f.name).trim(),
        quantity: Number(f.quantity) || 1,
        unit: String(f.unit || 'serving').toLowerCase(),
        calories: Math.round(calories),
        protein_g: Math.round(protein * 10) / 10,
        carbs_g: Math.round(carbs * 10) / 10,
        fat_g: Math.round(fat * 10) / 10,
        fiber_g: Math.round(fiber * 10) / 10,
        confidence
      };
    });

  // Compute totals for convenience
  const totals = clean.reduce(
    (t, f) => ({
      calories: t.calories + f.calories * f.quantity,
      protein_g: t.protein_g + f.protein_g * f.quantity,
      carbs_g: t.carbs_g + f.carbs_g * f.quantity,
      fat_g: t.fat_g + f.fat_g * f.quantity,
      fiber_g: t.fiber_g + f.fiber_g * f.quantity
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  );

  return {
    foods: clean,
    totals: {
      calories: Math.round(totals.calories),
      protein_g: Math.round(totals.protein_g * 10) / 10,
      carbs_g: Math.round(totals.carbs_g * 10) / 10,
      fat_g: Math.round(totals.fat_g * 10) / 10,
      fiber_g: Math.round(totals.fiber_g * 10) / 10
    },
    source: result.success ? 'ai' : 'error'
  };
}
