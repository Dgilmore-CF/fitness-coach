/**
 * Rule-based in-workout coaching analyzer.
 *
 * Replaces the previous LLM-per-set overlay (`/api/ai/realtime/analyze`) with a
 * fast, deterministic, unit-aware decision tree that flags only **notable**
 * events. Routine sets return `null` — the UI stays quiet.
 *
 * Design constraints
 * ------------------
 * - **Pure function** — no DOM, no fetch, no store access. Pass everything in.
 * - **Unit-agnostic at the analyzer layer** — all numeric reasoning is in kg
 *   (DB convention). Display strings are built via the injected
 *   `formatWeight(kg)` callback so imperial users see lbs and metric users see
 *   kg.
 * - **Strict filter** — fires only on PR, form breakdown, load warning, target
 *   miss, or multi-session stall. "On track" is intentionally silent.
 * - **First match wins** — rules are evaluated top-down in priority order.
 *
 * Insight shape (returned to the UI):
 *   {
 *     flag: 'pr_weight' | 'pr_one_rep_max' | 'form_breakdown'
 *         | 'load_warning' | 'target_miss' | 'stalled',
 *     severity: 'success' | 'warning' | 'info',
 *     title: string,
 *     message: string,
 *     action?: { type: 'extend_rest' | 'drop_weight' | 'ask_coach',
 *                value?: number,   // numeric payload (seconds, kg, etc.)
 *                label: string }
 *   }
 */

// Epley formula — the lighter end of the popular 1RM estimators; used only as
// a fallback when the backend hasn't computed one_rep_max_kg for the set yet.
function estimateOneRepMaxKg(weightKg, reps) {
  if (!weightKg || !reps || reps < 1) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// `target_reps` can be a number, a single string ("8"), or a range
// ("8-10" / "8–10"). Returns { low, high } in reps; both default to 10 when
// parsing fails so we never throw.
function parseRepTarget(targetReps) {
  if (typeof targetReps === 'number' && Number.isFinite(targetReps)) {
    return { low: targetReps, high: targetReps };
  }
  const s = String(targetReps || '').trim();
  if (!s) return { low: 10, high: 10 };
  const parts = s.split(/[-–—]/).map((p) => parseInt(p.trim(), 10)).filter(Number.isFinite);
  if (parts.length === 0) return { low: 10, high: 10 };
  if (parts.length === 1) return { low: parts[0], high: parts[0] };
  const [a, b] = parts;
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

// Top working weight from a list of sets (kg). Ignores warmup-style zero
// values defensively.
function topWeightKg(sets) {
  let top = 0;
  for (const s of sets || []) {
    if ((s.weight_kg || 0) > top) top = s.weight_kg;
  }
  return top;
}

// Did the user attempt a new top weight this session vs. their lifetime PR?
function isNewWeightPR(lastSet, pr) {
  if (!lastSet || !lastSet.weight_kg || !lastSet.reps) return false;
  if (!pr || !pr.max_weight_kg) return lastSet.weight_kg > 0;
  // Tolerance: 0.05 kg avoids floating-point misses on equality.
  return lastSet.weight_kg >= pr.max_weight_kg + 0.05;
}

// New 1RM PR (Epley-equivalent, computed from the just-logged set).
function isNewOneRepMaxPR(lastSet, pr) {
  const est = lastSet?.one_rep_max_kg
    || estimateOneRepMaxKg(lastSet?.weight_kg, lastSet?.reps);
  if (!est) return false;
  if (!pr || !pr.max_one_rep_max_kg) return est > 0;
  return est >= pr.max_one_rep_max_kg + 0.5;
}

// Same top weight across the most recent N sessions, with reps not improving.
// History is newest-first.
function isStalled(recentHistory, sessionsRequired = 3) {
  const hist = (recentHistory || []).slice(0, sessionsRequired);
  if (hist.length < sessionsRequired) return null;
  const tops = hist.map((w) => topWeightKg(w.sets));
  if (tops.some((t) => t === 0)) return null;
  const first = tops[0];
  const allSame = tops.every((t) => Math.abs(t - first) < 0.05);
  if (!allSame) return null;
  // Compare best rep count at the top weight in newest vs oldest session.
  const repsAtTop = hist.map((w) => {
    const setsAtTop = (w.sets || []).filter((s) => Math.abs(s.weight_kg - first) < 0.05);
    return setsAtTop.reduce((m, s) => Math.max(m, s.reps || 0), 0);
  });
  if (repsAtTop[0] > repsAtTop[repsAtTop.length - 1]) return null; // improving — not stalled
  return { weight_kg: first, sessions: hist.length };
}

/**
 * @param {Object}   input
 * @param {Object}   input.exercise         — { id, name, target_reps, target_sets, ... }
 * @param {Array}    input.currentSets      — sets logged today (post-log)
 * @param {Object}   input.lastSet          — the set just logged
 * @param {Object}   input.exerciseContext  — server snapshot from /workouts/exercises/:id/context
 * @param {Function} input.formatWeight     — (kg) => "100 lbs" or "45 kg"
 * @returns {Object | null}
 */
export function analyzePostSet({
  exercise,
  currentSets,
  lastSet,
  exerciseContext,
  formatWeight
}) {
  if (!lastSet || !lastSet.weight_kg || !lastSet.reps) return null;
  const fmt = typeof formatWeight === 'function'
    ? formatWeight
    : (kg) => `${kg} kg`;

  const pr = exerciseContext?.personal_records || {};
  const history = exerciseContext?.recent_history || [];
  const targetSets = Number(exercise?.target_sets) || 3;
  const { low: repsLow, high: repsHigh } = parseRepTarget(exercise?.target_reps);
  const setsDoneToday = (currentSets || []).length;
  const setsRemaining = Math.max(0, targetSets - setsDoneToday);

  // ----- Rule 1: Weight PR (highest priority — celebrate the win) ----------
  if (isNewWeightPR(lastSet, pr)) {
    const priorTxt = pr.max_weight_kg
      ? ` Previous best: ${fmt(pr.max_weight_kg)}.`
      : '';
    return {
      flag: 'pr_weight',
      severity: 'success',
      title: 'New weight PR',
      message: `${fmt(lastSet.weight_kg)} × ${lastSet.reps} — your heaviest lift on this exercise.${priorTxt}`,
      action: null
    };
  }

  // ----- Rule 2: Estimated 1RM PR -------------------------------------------
  if (isNewOneRepMaxPR(lastSet, pr)) {
    const est = lastSet.one_rep_max_kg
      || estimateOneRepMaxKg(lastSet.weight_kg, lastSet.reps);
    const priorTxt = pr.max_one_rep_max_kg
      ? ` Previous best: ${fmt(pr.max_one_rep_max_kg)}.`
      : '';
    return {
      flag: 'pr_one_rep_max',
      severity: 'success',
      title: 'New estimated 1RM',
      message: `${fmt(lastSet.weight_kg)} × ${lastSet.reps} projects to ${fmt(est)} one-rep max.${priorTxt}`,
      action: null
    };
  }

  // ----- Rule 3: Form breakdown (reps fell off vs prior set this session) --
  // Look at the second-to-last set on the same exercise. If reps dropped by
  // 3+ at the same-or-heavier weight, form is likely degrading.
  if (currentSets && currentSets.length >= 2) {
    const sorted = [...currentSets].sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
    const prev = sorted[sorted.length - 2];
    const repDrop = (prev?.reps || 0) - (lastSet.reps || 0);
    const sameOrHeavier = (lastSet.weight_kg || 0) >= (prev?.weight_kg || 0) - 0.05;
    if (repDrop >= 3 && sameOrHeavier && setsRemaining > 0) {
      return {
        flag: 'form_breakdown',
        severity: 'warning',
        title: 'Reps dropped sharply',
        message: `Set ${prev.set_number || sorted.length - 1}: ${prev.reps} reps → set ${lastSet.set_number || sorted.length}: ${lastSet.reps} reps. Consider a longer rest before the next set.`,
        action: { type: 'extend_rest', value: 30, label: '+30s rest' }
      };
    }
  }

  // ----- Rule 4: Load warning (RPE ≥ 9 with more sets to go) ---------------
  if (lastSet.rpe && lastSet.rpe >= 9 && setsRemaining > 0) {
    const dropTarget = Math.round((lastSet.weight_kg * 0.95) * 4) / 4; // round to 0.25 kg
    return {
      flag: 'load_warning',
      severity: 'warning',
      title: 'Working at the redline',
      message: `RPE ${lastSet.rpe} with ${setsRemaining} ${setsRemaining === 1 ? 'set' : 'sets'} to go. Try ${fmt(dropTarget)} to preserve reps.`,
      action: { type: 'drop_weight', value: dropTarget, label: `Drop to ${fmt(dropTarget)}` }
    };
  }

  // ----- Rule 5: Target miss (reps well below the low end of the range) ---
  // Only fires when there are remaining sets — at the end of the exercise it's
  // information without a next action, so we stay quiet.
  if (lastSet.reps <= repsLow - 2 && setsRemaining > 0) {
    return {
      flag: 'target_miss',
      severity: 'warning',
      title: 'Below target reps',
      message: `Got ${lastSet.reps} reps (target ${repsLow}${repsLow === repsHigh ? '' : `-${repsHigh}`}). Extend rest or drop the weight slightly for the next set.`,
      action: { type: 'extend_rest', value: 30, label: '+30s rest' }
    };
  }

  // ----- Rule 6: Stalled progression (same top weight 3+ sessions) ---------
  // Only flag on the FIRST set of the exercise today, so we don't repeat the
  // notice after every set.
  if (setsDoneToday === 1) {
    const stall = isStalled(history, 3);
    if (stall) {
      return {
        flag: 'stalled',
        severity: 'info',
        title: 'Weight has plateaued',
        message: `${fmt(stall.weight_kg)} for ${stall.sessions} sessions running. A deload week or a rep-scheme change often breaks the plateau.`,
        action: { type: 'ask_coach', label: 'Ask coach' }
      };
    }
  }

  return null;
}

// Exported for unit tests — the smaller helpers are tested independently
// from the orchestrator.
export const __test__ = {
  estimateOneRepMaxKg,
  parseRepTarget,
  topWeightKg,
  isNewWeightPR,
  isNewOneRepMaxPR,
  isStalled
};
