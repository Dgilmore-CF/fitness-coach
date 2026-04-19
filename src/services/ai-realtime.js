/**
 * Real-time AI coaching service — fast, workout-flow-aware helpers.
 *
 * These helpers are separate from services/ai-coach.js because they target
 * low-latency scenarios (mid-workout, pre-workout) where we need sub-second
 * responses. They use rule-based logic as the primary path with AI as an
 * optional enhancement layer — if the AI call fails or is slow, the user
 * still gets useful guidance.
 */

import { calculateOneRepMax, unilateralVolumeSQL } from '../utils/volume.js';
import { callAI } from '../utils/ai-parser.js';

const EPSILON = 0.001;

/**
 * Generate a readiness score (0-100) based on recent training load.
 * Pure rule-based — runs in < 5ms.
 *
 * @param {object} opts
 * @param {Array} opts.recentWorkouts - last 14 days of workouts, newest first
 * @param {number} opts.targetMusclesOverlap - 0..1, how much today's target
 *   overlaps with recently-trained muscles
 * @returns {{ score: number, status: string, rationale: string[] }}
 */
export function calculateReadinessScore({ recentWorkouts = [], targetMusclesOverlap = 0 }) {
  const now = Date.now();
  const rationale = [];
  let score = 100;

  // Days since last workout
  const lastWorkout = recentWorkouts[0];
  if (lastWorkout) {
    const hoursSince = (now - new Date(lastWorkout.start_time).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 12) {
      score -= 25;
      rationale.push(`Less than 12h since your last session (${Math.round(hoursSince)}h).`);
    } else if (hoursSince < 24) {
      score -= 10;
      rationale.push(`About ${Math.round(hoursSince)}h since your last workout — warmed up.`);
    } else if (hoursSince > 96) {
      score -= 5;
      rationale.push(`It's been ${Math.round(hoursSince / 24)} days — consider easing back in.`);
    } else {
      rationale.push(`${Math.round(hoursSince / 24)} day${Math.round(hoursSince / 24) === 1 ? '' : 's'} of rest since your last session.`);
    }
  } else {
    rationale.push('No recent workouts on record — treat today as a baseline session.');
  }

  // Weekly frequency
  const last7Days = recentWorkouts.filter((w) => (now - new Date(w.start_time).getTime()) / (1000 * 60 * 60 * 24) <= 7);
  if (last7Days.length >= 6) {
    score -= 15;
    rationale.push(`${last7Days.length} sessions in the last 7 days — consider a lighter day.`);
  } else if (last7Days.length === 0) {
    score -= 5;
    rationale.push('No sessions in the last 7 days — take it easy today.');
  }

  // Exertion trend
  const recentExertion = recentWorkouts
    .slice(0, 5)
    .map((w) => w.perceived_exertion)
    .filter(Boolean);
  if (recentExertion.length >= 3) {
    const avg = recentExertion.reduce((a, b) => a + b, 0) / recentExertion.length;
    if (avg >= 8.5) {
      score -= 10;
      rationale.push(`Recent sessions have averaged ${avg.toFixed(1)}/10 exertion — high.`);
    } else if (avg <= 4) {
      score += 5;
      rationale.push(`Recent exertion has been moderate (${avg.toFixed(1)}/10) — you have capacity.`);
    }
  }

  // Muscle group overlap
  if (targetMusclesOverlap >= 0.5) {
    score -= 12;
    rationale.push('Target muscles were heavily trained in the last 48 hours.');
  } else if (targetMusclesOverlap >= 0.25) {
    score -= 6;
    rationale.push('Some target muscles were trained recently.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status;
  if (score >= 80) status = 'primed';
  else if (score >= 60) status = 'ready';
  else if (score >= 40) status = 'fatigued';
  else status = 'needs_rest';

  return { score, status, rationale };
}

/**
 * Predict optimal weight/reps for the next set based on recent performance.
 * Uses a simple linear-progression heuristic.
 *
 * @param {object} opts
 * @param {Array<{weight_kg:number,reps:number,one_rep_max_kg:number}>} opts.recentSets - last 10 sets for this exercise
 * @param {number} [opts.targetReps] - target reps for this set (from program)
 * @param {number} [opts.completedSetsToday=0] - how many sets already done in the current workout
 * @returns {{
 *   suggestedWeight: number, suggestedReps: number, confidence: string,
 *   rationale: string
 * }}
 */
export function predictNextSet({ recentSets = [], targetReps = 10, completedSetsToday = 0 }) {
  if (recentSets.length === 0) {
    return {
      suggestedWeight: null,
      suggestedReps: targetReps,
      confidence: 'low',
      rationale: 'No previous data for this exercise.'
    };
  }

  const mostRecent = recentSets[0];

  // Intra-workout set: reduce weight slightly for later sets
  if (completedSetsToday > 0) {
    const fatigueCut = completedSetsToday >= 3 ? 0.92 : 0.96;
    return {
      suggestedWeight: Math.round(mostRecent.weight_kg * fatigueCut * 2) / 2,
      suggestedReps: targetReps,
      confidence: 'high',
      rationale: `Adjusted ${Math.round((1 - fatigueCut) * 100)}% down for accumulated fatigue.`
    };
  }

  // First set of this exercise: check if last session hit target reps
  const lastSessionSets = recentSets.filter((s) =>
    Math.abs(s.weight_kg - mostRecent.weight_kg) < EPSILON
  );
  const maxReps = Math.max(...lastSessionSets.map((s) => s.reps || 0));

  // If last session smashed the target reps, progress
  if (maxReps >= targetReps + 2) {
    return {
      suggestedWeight: Math.round((mostRecent.weight_kg + 2.5) * 2) / 2,
      suggestedReps: targetReps,
      confidence: 'high',
      rationale: `Hit ${maxReps} reps last time — time for +2.5kg progression.`
    };
  }

  // If they fell short, stay at same weight
  if (maxReps > 0 && maxReps < targetReps) {
    return {
      suggestedWeight: mostRecent.weight_kg,
      suggestedReps: targetReps,
      confidence: 'medium',
      rationale: `Last session hit ${maxReps} reps — stay at this weight until you clear ${targetReps}.`
    };
  }

  return {
    suggestedWeight: mostRecent.weight_kg,
    suggestedReps: targetReps,
    confidence: 'medium',
    rationale: 'Match last session to build consistency.'
  };
}

/**
 * Analyze the just-completed set and surface a short coaching tip.
 * Returns null when no notable pattern is detected (don't show noise).
 *
 * @param {object} opts
 * @param {Array<{weight_kg:number,reps:number}>} opts.currentSets - sets logged so far in this workout
 * @param {number} [opts.targetReps]
 * @param {number} [opts.targetSets]
 * @returns {{ type: string, message: string, action?: { label: string, value: number } } | null}
 */
export function analyzePostSet({ currentSets = [], targetReps = 10, targetSets = 3 }) {
  if (currentSets.length === 0) return null;

  const last = currentSets[currentSets.length - 1];
  const lastWeight = last.weight_kg || 0;
  const lastReps = last.reps || 0;

  // Smashed target reps — suggest progression next session
  if (lastReps >= targetReps + 3 && currentSets.length === 1) {
    return {
      type: 'progression',
      message: `${lastReps} reps — strong opener. Consider adding ${lastWeight >= 40 ? '2.5' : '1.25'}kg next session.`,
    };
  }

  // Large rep dropoff across sets (form breakdown)
  if (currentSets.length >= 3) {
    const firstReps = currentSets[0].reps || 0;
    const dropoff = firstReps - lastReps;
    if (dropoff >= 4) {
      return {
        type: 'form_warning',
        message: `Rep count dropped from ${firstReps} to ${lastReps}. Consider a longer rest or reducing weight.`,
        action: { label: '+30s rest', value: 30 }
      };
    }
  }

  // Failure set — under 5 reps when target is 8+
  if (lastReps > 0 && lastReps < 5 && targetReps >= 8) {
    return {
      type: 'load_warning',
      message: `Only ${lastReps} reps — this weight might be too heavy today. Consider dropping weight.`,
      action: { label: 'Drop 5%', value: -0.05 }
    };
  }

  // On track at final set
  if (currentSets.length === targetSets && lastReps >= targetReps) {
    return {
      type: 'complete',
      message: `Nailed all ${targetSets} sets at target reps. Add weight next session!`
    };
  }

  // First set, met target — give neutral encouragement
  if (currentSets.length === 1 && lastReps >= targetReps) {
    return {
      type: 'on_track',
      message: 'On target. Keep this weight for remaining sets.'
    };
  }

  return null;
}

/**
 * Aggregate pre-workout context for a specific program day.
 * @param {*} db
 * @param {number} userId
 * @param {number} programDayId
 */
export async function buildPreWorkoutContext(db, userId, programDayId) {
  // Recent workouts
  const workoutsResult = await db.prepare(`
    SELECT id, start_time, total_weight_kg, perceived_exertion, program_day_id
    FROM workouts
    WHERE user_id = ? AND completed = 1
      AND start_time >= datetime('now', '-14 days')
    ORDER BY start_time DESC
    LIMIT 20
  `).bind(userId).all();

  const recentWorkouts = workoutsResult.results || [];

  // Today's target muscles
  const muscleResult = await db.prepare(`
    SELECT DISTINCT e.muscle_group
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.program_day_id = ?
  `).bind(programDayId).all();

  const targetMuscles = (muscleResult.results || []).map((r) => r.muscle_group);

  // How much do target muscles overlap with recently-trained muscles (last 48h)?
  let targetMusclesOverlap = 0;
  if (targetMuscles.length > 0) {
    const recentMuscleResult = await db.prepare(`
      SELECT DISTINCT e.muscle_group
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN exercises e ON we.exercise_id = e.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ? AND w.completed = 1
        AND w.start_time >= datetime('now', '-48 hours')
    `).bind(userId).all();
    const recentMuscles = new Set((recentMuscleResult.results || []).map((r) => r.muscle_group));
    const overlap = targetMuscles.filter((m) => recentMuscles.has(m)).length;
    targetMusclesOverlap = overlap / targetMuscles.length;
  }

  // Per-exercise weight predictions
  const exerciseResult = await db.prepare(`
    SELECT pe.id AS program_exercise_id, pe.exercise_id, pe.target_sets, pe.target_reps,
           e.name, e.muscle_group, e.is_unilateral
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.program_day_id = ?
    ORDER BY pe.order_index
  `).bind(programDayId).all();

  const exercises = exerciseResult.results || [];

  const suggestions = await Promise.all(
    exercises.map(async (ex) => {
      const historyResult = await db.prepare(`
        SELECT s.weight_kg, s.reps, s.one_rep_max_kg
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.exercise_id = ? AND w.user_id = ? AND w.completed = 1
        ORDER BY w.start_time DESC, s.set_number ASC
        LIMIT 10
      `).bind(ex.exercise_id, userId).all();

      const parsedTargetReps = parseInt(String(ex.target_reps || '8-12').split(/[-–]/)[0], 10) || 10;
      const prediction = predictNextSet({
        recentSets: historyResult.results || [],
        targetReps: parsedTargetReps
      });

      return {
        exercise_id: ex.exercise_id,
        exercise_name: ex.name,
        muscle_group: ex.muscle_group,
        target_sets: ex.target_sets || 3,
        target_reps: ex.target_reps || '8-12',
        suggested_weight_kg: prediction.suggestedWeight,
        confidence: prediction.confidence,
        rationale: prediction.rationale
      };
    })
  );

  const readiness = calculateReadinessScore({ recentWorkouts, targetMusclesOverlap });

  return {
    readiness,
    target_muscles: targetMuscles,
    exercises: suggestions,
    last_workout: recentWorkouts[0] || null
  };
}
