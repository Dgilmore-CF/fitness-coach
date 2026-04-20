/**
 * Active workout view renderers — warmup, exercise tabs, exercise content,
 * add exercises modal, workout summary.
 *
 * These are pure template functions. Event wiring is in controller.js.
 */

import { html, raw, htmlToElement } from '@core/html';
import {
  formatWeight,
  formatDuration,
  getExertionEmoji
} from '@utils/formatters';
import {
  getWeightUnit,
  getWeightStep,
  isImperialSystem,
  toDisplayWeight
} from '@utils/conversions';
import { getBodyweightExerciseConfig, getWarmups } from './warmup-data.js';

// ============================================================================
// Warmup screen
// ============================================================================

export function renderWarmupScreen(workout) {
  const muscleGroups = [...new Set((workout.exercises || []).map((e) => e.muscle_group).filter(Boolean))];
  const warmups = getWarmups(muscleGroups);

  return html`
    <div class="aw-warmup-container">
      <div class="aw-warmup-header">
        <div class="aw-warmup-icon">
          <i class="fas fa-running"></i>
        </div>
        <h1>Warm-Up &amp; Stretch</h1>
        <p class="text-muted" style="font-size: var(--text-lg);">
          Prepare your body for ${workout.day_name || 'your workout'}
        </p>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            <i class="fas fa-list-check"></i> Recommended Warm-ups
          </h3>
        </div>
        <div class="stack stack-sm">
          ${warmups.slice(0, 6).map((w, idx) => html`
            <div class="aw-warmup-item">
              <div class="aw-warmup-num">${idx + 1}</div>
              <div class="aw-warmup-info">
                <strong>${w.name}</strong>
                <span class="text-muted" style="font-size: var(--text-xs);">
                  <i class="fas fa-bullseye"></i> ${w.muscle}
                </span>
              </div>
              <span class="text-muted" style="font-size: var(--text-xs);">30–60 sec</span>
            </div>
          `)}
        </div>
      </div>

      <div class="aw-warmup-tips">
        <strong>
          <i class="fas fa-lightbulb"></i> Pro Tips
        </strong>
        <ul>
          <li>Start with light cardio to raise your heart rate</li>
          <li>Focus on the muscles you'll be training today</li>
          <li>Perform dynamic stretches (movement-based)</li>
          <li>Take 5–10 minutes to properly warm up</li>
        </ul>
      </div>

      <div class="cluster" style="justify-content: center;">
        <button class="btn btn-outline" data-action="cancel-workout">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button class="btn btn-primary" data-action="start-exercises">
          <i class="fas fa-check"></i> Ready — Start Workout
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// Exercise tabs header + content
// ============================================================================

export function renderExerciseTabs(workout, activeIndex) {
  const exercises = workout.exercises || [];
  const current = exercises[activeIndex];
  if (!current) return html`<div></div>`;

  return html`
    <div class="aw-shell">
      <div class="aw-header">
        <div class="aw-header-inner">
          <div>
            <h2>${workout.day_name || 'Workout'}</h2>
            <div class="aw-header-meta">
              Exercise ${activeIndex + 1} of ${exercises.length}
            </div>
          </div>
          <div id="aw-workout-timer" class="aw-timer">00:00:00</div>
        </div>
      </div>

      <div class="aw-exercise-tabs-wrap">
        <div class="aw-exercise-tabs">
          ${exercises.map((ex, idx) => renderExerciseTab(ex, idx, activeIndex, exercises.length))}
        </div>
      </div>

      <div class="aw-exercise-content">
        <div class="container" style="max-width: 1200px;">
          ${renderExerciseContent(current, activeIndex)}
        </div>
      </div>

      <div class="aw-footer">
        <div class="aw-footer-inner">
          <div class="cluster cluster-between">
            <button class="btn btn-outline" data-action="prev-exercise" ${activeIndex === 0 ? 'disabled' : ''}>
              <i class="fas fa-arrow-left"></i> <span class="hide-mobile">Prev</span>
            </button>
            <button class="btn btn-primary" data-action="next-exercise">
              ${activeIndex === exercises.length - 1
                ? raw('<i class="fas fa-flag-checkered"></i> Finish Workout')
                : raw('<i class="fas fa-arrow-right"></i> Next Exercise')}
            </button>
          </div>
          <div class="cluster" style="justify-content: center;">
            <button class="btn btn-ghost btn-sm" data-action="show-notes" title="Add workout notes">
              <i class="fas fa-note-sticky"></i> <span class="hide-mobile">Notes</span>
            </button>
            <button class="btn btn-ghost btn-sm" data-action="add-exercises" title="Add exercises">
              <i class="fas fa-plus-circle"></i> <span class="hide-mobile">Add</span>
            </button>
            <button class="btn btn-ghost btn-sm" data-action="minimize" title="Return to dashboard">
              <i class="fas fa-compress"></i> <span class="hide-mobile">Minimize</span>
            </button>
            <button class="btn btn-ghost btn-sm text-danger" data-action="end-workout" title="End workout">
              <i class="fas fa-stop"></i> <span class="hide-mobile">End</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderExerciseTab(exercise, idx, activeIndex, total) {
  const completedSets = (exercise.sets || []).length;
  const targetSets = exercise.target_sets || 1;
  const isComplete = completedSets >= targetSets && completedSets > 0;
  const isCurrent = idx === activeIndex;
  const hasSets = completedSets > 0;

  let className = 'aw-tab';
  if (isCurrent) className += ' is-current';
  else if (isComplete) className += ' is-complete';
  else if (hasSets) className += ' is-partial';
  else if (idx > activeIndex) className += ' is-future';

  const label = exercise.name.length > 20 ? exercise.name.slice(0, 20) + '…' : exercise.name;

  return html`
    <div class="aw-tab-wrap">
      <button class="${className}" data-action="switch-exercise" data-index="${idx}">
        ${isComplete ? raw('<i class="fas fa-check"></i> ') : ''}${label}
      </button>
      ${isCurrent
        ? html`
            <div class="aw-tab-reorder">
              <button class="aw-tab-reorder-btn" data-action="move-exercise" data-index="${idx}" data-direction="-1" ${idx === 0 ? 'disabled' : ''} title="Move up">
                <i class="fas fa-chevron-up"></i>
              </button>
              <button class="aw-tab-reorder-btn" data-action="move-exercise" data-index="${idx}" data-direction="1" ${idx === total - 1 ? 'disabled' : ''} title="Move down">
                <i class="fas fa-chevron-down"></i>
              </button>
            </div>
          `
        : ''}
    </div>
  `;
}

export function renderExerciseContent(exercise, _index, history) {
  const weightUnit = getWeightUnit();
  const completedSets = (exercise.sets || []).length;
  const targetSets = exercise.target_sets || 3;
  const showNewSetRow = completedSets < targetSets && completedSets < 10;

  const bwConfig = getBodyweightExerciseConfig(exercise.name, exercise.muscle_group);
  const isBodyweightOnly = !bwConfig.showWeight;
  const isBodyweightOptional = bwConfig.weightOptional && bwConfig.showWeight;

  // Determine default values for new set input
  const currentLastSet = exercise.sets?.[exercise.sets.length - 1];
  const historicalSet = history?.[exercise.exercise_id];
  const sourceSet = currentLastSet || historicalSet;
  const isFirstSet = !currentLastSet;
  const hasHistoricalData = isFirstSet && historicalSet;

  let defaultWeight = '';
  let defaultReps = exercise.target_reps || '';
  if (sourceSet) {
    if (sourceSet.weight_kg) {
      const weightValue = toDisplayWeight(sourceSet.weight_kg);
      defaultWeight = weightValue % 1 === 0 ? String(weightValue) : weightValue.toFixed(1);
    }
    if (sourceSet.reps) defaultReps = sourceSet.reps;
  }

  const inputClassName = hasHistoricalData
    ? 'input aw-prefilled-historical'
    : currentLastSet
    ? 'input aw-prefilled-current'
    : 'input';

  const progressPct = Math.min((completedSets / targetSets) * 100, 100);

  return html`
    <div class="card aw-exercise-card">
      <div class="aw-exercise-header">
        <div style="flex: 1; min-width: 200px;">
          <div class="cluster" style="gap: var(--space-3); margin-bottom: var(--space-2);">
            <h2 style="margin: 0; font-size: clamp(18px, 4vw, 24px);">${exercise.name}</h2>
            ${exercise.is_added ? html`<span class="badge badge-warning">ADDED</span>` : ''}
            <button class="btn btn-ghost btn-sm text-danger" data-action="remove-exercise" data-exercise-id="${exercise.id}" data-exercise-name="${exercise.name}" title="Remove exercise" style="margin-left: auto;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div class="cluster" style="gap: var(--space-2);">
            <span class="badge badge-success">
              <i class="fas fa-bullseye"></i> ${exercise.muscle_group}
            </span>
            <span class="badge badge-primary">
              <i class="fas fa-dumbbell"></i> ${exercise.equipment}
            </span>
            ${exercise.is_unilateral ? html`<span class="badge badge-warning"><i class="fas fa-balance-scale"></i> Unilateral</span>` : ''}
            <button class="btn btn-outline btn-sm" data-action="show-history" data-exercise-id="${exercise.exercise_id || exercise.id}" data-exercise-name="${exercise.name}">
              <i class="fas fa-chart-line"></i> History
            </button>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="cluster" style="justify-content: flex-end; gap: var(--space-2); margin-bottom: var(--space-1);">
            <button class="btn btn-outline btn-icon btn-sm" data-action="adjust-target-sets" data-exercise-id="${exercise.id}" data-adjust="-1" title="Decrease target sets">
              <i class="fas fa-minus"></i>
            </button>
            <div class="aw-sets-count">${completedSets}/${targetSets}</div>
            <button class="btn btn-primary btn-icon btn-sm" data-action="adjust-target-sets" data-exercise-id="${exercise.id}" data-adjust="1" title="Increase target sets">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="stat-label">Sets Target</div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
      </div>
    </div>

    <div id="aw-inline-rest-timer" class="aw-rest-timer-card" hidden>
      <div class="aw-rest-timer-label">
        <i class="fas fa-clock"></i> Rest Timer
      </div>
      <div id="aw-rest-timer-display" class="aw-rest-timer-display">0:00</div>
      <div class="aw-rest-progress-bar">
        <div id="aw-rest-progress" class="aw-rest-progress-fill" style="width: 100%;"></div>
      </div>
      <div class="cluster" style="justify-content: center;">
        <button class="btn btn-ghost btn-sm aw-rest-btn" data-action="rest-adjust" data-delta="-15">-15s</button>
        <button class="btn aw-rest-skip-btn" data-action="rest-skip">Skip</button>
        <button class="btn btn-ghost btn-sm aw-rest-btn" data-action="rest-adjust" data-delta="15">+15s</button>
      </div>
    </div>

    ${exercise.tips
      ? html`
          <div class="card" style="margin-bottom: var(--space-4);">
            <details>
              <summary class="aw-tips-summary">
                <i class="fas fa-lightbulb"></i> Form &amp; Technique Tips
              </summary>
              <div class="aw-tips-content">${exercise.tips}</div>
            </details>
          </div>
        `
      : ''}

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <i class="fas fa-table"></i> Set Tracker
        </h3>
      </div>
      <div class="stack stack-sm">
        ${(exercise.sets || []).map((set) => renderLoggedSet(set, exercise))}
        ${showNewSetRow
          ? renderNewSetRow({
              exercise,
              completedSets,
              isBodyweightOnly,
              isBodyweightOptional,
              defaultWeight,
              defaultReps,
              inputClassName,
              hasHistoricalData,
              weightUnit
            })
          : ''}
      </div>
      ${completedSets >= targetSets
        ? html`
            <div class="aw-sets-complete">
              <i class="fas fa-check-circle"></i>
              <div>Target Sets Complete!</div>
              <div class="text-muted" style="font-size: var(--text-sm); margin-top: var(--space-1);">
                Ready to move on or add more sets
              </div>
              ${completedSets < 10
                ? html`
                    <button class="btn btn-outline" data-action="show-extra-set-input" data-exercise-id="${exercise.id}" style="margin-top: var(--space-3);">
                      <i class="fas fa-plus"></i> Add Another Set
                    </button>
                  `
                : ''}
            </div>
          `
        : ''}
    </div>
  `;
}

function renderLoggedSet(set, exercise) {
  return html`
    <div class="aw-logged-set">
      <div class="aw-set-num">${set.set_number}</div>
      <div class="aw-set-metrics">
        <div>
          <div class="stat-label">Weight</div>
          <div class="aw-set-metric-value">${formatWeight(set.weight_kg)}</div>
        </div>
        <div>
          <div class="stat-label">Reps</div>
          <div class="aw-set-metric-value">${set.reps}</div>
        </div>
        <div>
          <div class="stat-label">Est. 1RM</div>
          <div class="aw-set-metric-meta">${formatWeight(set.one_rep_max_kg)}</div>
        </div>
      </div>
      <div class="cluster">
        <button class="btn btn-outline btn-icon btn-sm" data-action="edit-set" data-exercise-id="${exercise.id}" data-set-id="${set.id}" data-weight="${set.weight_kg || 0}" data-reps="${set.reps || 0}">
          <i class="fas fa-pencil-alt"></i>
        </button>
        <button class="btn btn-outline btn-icon btn-sm text-danger" data-action="delete-set" data-exercise-id="${exercise.id}" data-set-id="${set.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function renderNewSetRow({
  exercise,
  completedSets,
  isBodyweightOnly,
  isBodyweightOptional,
  defaultWeight,
  defaultReps,
  inputClassName,
  hasHistoricalData,
  weightUnit
}) {
  return html`
    <div class="aw-new-set-card">
      <div class="aw-new-set-header">
        <div class="aw-new-set-num">${completedSets + 1}</div>
        <div style="font-weight: var(--font-semibold);">Log Next Set</div>
        ${isBodyweightOnly
          ? html`<span class="text-muted" style="font-size: var(--text-xs); margin-left: auto;"><i class="fas fa-feather"></i> Bodyweight</span>`
          : isBodyweightOptional
          ? html`<span class="text-muted" style="font-size: var(--text-xs); margin-left: auto;"><i class="fas fa-feather"></i> Weight optional</span>`
          : ''}
      </div>
      ${hasHistoricalData
        ? html`<div class="aw-prefill-note"><i class="fas fa-history"></i> Pre-filled from last workout</div>`
        : ''}
      <div class="aw-new-set-inputs ${isBodyweightOnly ? 'bodyweight' : ''}">
        ${!isBodyweightOnly
          ? html`
              <div>
                <label class="form-label" style="font-size: var(--text-xs);">Weight (${weightUnit})${isBodyweightOptional ? html`<span class="text-muted"> optional</span>` : ''}</label>
                <input type="number" id="aw-new-set-weight" class="${inputClassName}" value="${defaultWeight}" placeholder="${isBodyweightOptional ? 'BW' : '0'}" step="${getWeightStep()}" data-bodyweight-optional="${isBodyweightOptional}" />
              </div>
            `
          : html`<input type="hidden" id="aw-new-set-weight" value="0" data-bodyweight-only="true" />`}
        <div>
          <label class="form-label" style="font-size: var(--text-xs);">Reps</label>
          <input type="number" id="aw-new-set-reps" class="${inputClassName}" value="${defaultReps}" placeholder="0" min="1" />
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="aw-log-set-btn" data-action="log-set" data-exercise-id="${exercise.id}">
        <i class="fas fa-plus"></i> Log Set
      </button>
    </div>
  `;
}

// ============================================================================
// Add-exercises modal
// ============================================================================

export function renderAddExercisesModal(exercisesByMuscle) {
  return html`
    <div class="aw-add-exercises-overlay" id="aw-add-exercises-overlay">
      <div class="aw-add-exercises-panel">
        <div class="aw-add-exercises-header">
          <h2>Add Exercises</h2>
          <button class="btn btn-ghost btn-icon" data-action="close-add-exercises">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="aw-add-exercises-search">
          <input type="text" id="aw-add-exercises-search" class="input" placeholder="Search exercises..." />
        </div>
        <div class="aw-add-exercises-list" id="aw-add-exercises-list">
          ${Object.keys(exercisesByMuscle).sort().map((muscle) => html`
            <div class="aw-exercise-group" data-muscle="${muscle}">
              <h4 class="aw-exercise-group-title">${muscle}</h4>
              ${exercisesByMuscle[muscle].map((ex) => html`
                <div class="aw-add-exercise-item" data-name="${ex.name.toLowerCase()}">
                  <label>
                    <input type="checkbox" data-add-exercise="${ex.id}" />
                    <div>
                      <strong>${ex.name}</strong>
                      <div class="text-muted" style="font-size: var(--text-xs);">${ex.equipment}</div>
                    </div>
                  </label>
                </div>
              `)}
            </div>
          `)}
        </div>
        <div class="aw-add-exercises-footer">
          <button class="btn btn-outline" data-action="close-add-exercises">Cancel</button>
          <button class="btn btn-primary" data-action="add-selected-exercises" id="aw-add-selected-btn" disabled>
            <i class="fas fa-plus"></i> <span id="aw-add-selected-count">0</span> Selected
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Workout summary
// ============================================================================

const WEIGHT_FUN_COMPARISONS = [
  { threshold: 0, text: 'You lifted a hot air balloon\'s worth! 🎈' },
  { threshold: 100, text: 'That\'s heavier than a baby elephant! 🐘' },
  { threshold: 500, text: 'Like lifting a Smart Car! 🚗' },
  { threshold: 1000, text: 'A full-grown grizzly bear! 🐻' },
  { threshold: 5000, text: 'A blue whale heart! 🐋' },
  { threshold: 10000, text: 'A full-size helicopter! 🚁' }
];

function getFunWeightComparison(totalKg) {
  const match = WEIGHT_FUN_COMPARISONS
    .filter((c) => totalKg >= c.threshold)
    .pop();
  return match ? match.text : WEIGHT_FUN_COMPARISONS[0].text;
}

export function renderWorkoutSummary(workout, stats, hasModifications) {
  // Compute totals from exercises if the aggregate stats aren't populated
  // (e.g. legacy code paths that render summary before complete fires).
  const exercisesDone = (workout.exercises || []).filter((e) => (e.sets || []).length > 0);
  const computedVolume = exercisesDone.reduce((total, ex) => {
    const multiplier = ex.is_unilateral ? 2 : 1;
    return total + (ex.sets || []).reduce(
      (sum, set) => sum + (set.weight_kg || 0) * (set.reps || 0) * multiplier, 0
    );
  }, 0);
  const computedSets = exercisesDone.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
  const computedReps = exercisesDone.reduce(
    (sum, ex) => sum + (ex.sets || []).reduce((s, set) => s + (set.reps || 0), 0), 0
  );

  // Backend stores this as `total_weight_kg` but accept both names + fall back
  // to the computed total so users always see a real number.
  const totalVolume = stats.total_weight_kg || stats.total_volume_kg || computedVolume;
  const funComparison = getFunWeightComparison(totalVolume);
  const duration = stats.total_duration_seconds || 0;

  return html`
    <div class="aw-summary-container">
      <div class="aw-summary-success">
        <div class="aw-summary-icon">
          <i class="fas fa-trophy"></i>
        </div>
        <h1>Workout Complete!</h1>
        <p class="text-muted" style="font-size: var(--text-lg);">${funComparison}</p>
      </div>

      <div class="grid grid-cols-3">
        <div class="stat-card stat-card-primary">
          <div class="stat-label">Total Volume</div>
          <div class="stat-value">${formatWeight(totalVolume)}</div>
        </div>
        <div class="stat-card stat-card-success">
          <div class="stat-label">Duration</div>
          <div class="stat-value">${formatDuration(duration)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Sets / Reps</div>
          <div class="stat-value" style="font-size: var(--text-2xl);">${computedSets} · ${computedReps}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-list"></i> What You Did (${exercisesDone.length} exercise${exercisesDone.length === 1 ? '' : 's'})</h3>
        </div>
        ${exercisesDone.length === 0
          ? html`
              <div class="empty-state">
                <div class="empty-state-icon">💪</div>
                <div class="empty-state-description">No sets were logged.</div>
              </div>
            `
          : html`
              <div class="stack stack-sm">
                ${exercisesDone.map((ex) => {
                  const exVolume = (ex.sets || []).reduce(
                    (s, set) => s + (set.weight_kg || 0) * (set.reps || 0) * (ex.is_unilateral ? 2 : 1), 0
                  );
                  return html`
                    <div class="aw-summary-exercise">
                      <div class="aw-summary-exercise-header">
                        <div>
                          <strong>${ex.name}</strong>
                          <div class="text-muted" style="font-size: var(--text-xs);">
                            ${ex.muscle_group}${ex.is_unilateral ? ' · unilateral' : ''}
                          </div>
                        </div>
                        <div style="text-align: right;">
                          <div class="text-muted" style="font-size: var(--text-xs);">Volume</div>
                          <strong class="text-primary">${formatWeight(exVolume)}</strong>
                        </div>
                      </div>
                      <div class="aw-summary-sets">
                        ${(ex.sets || []).map((set, i) => html`
                          <div class="aw-summary-set">
                            <span class="aw-summary-set-num">Set ${i + 1}</span>
                            <span>${formatWeight(set.weight_kg || 0)}</span>
                            <span class="text-muted">×</span>
                            <span><strong>${set.reps || 0}</strong> reps</span>
                          </div>
                        `)}
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-heart"></i> How did that feel?</h3>
        </div>
        <div class="aw-exertion-selector">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => html`
            <button class="aw-exertion-btn" data-action="set-exertion" data-level="${level}">
              <div class="aw-exertion-emoji">${getExertionEmoji(level)}</div>
              <div>${level}</div>
            </button>
          `)}
        </div>
      </div>

      ${hasModifications
        ? html`
            <div class="card aw-summary-save-program">
              <div class="card-header">
                <h3 class="card-title"><i class="fas fa-bookmark"></i> Save changes to program?</h3>
              </div>
              <p class="text-muted" style="margin-bottom: var(--space-3);">
                You modified the exercises for this day. Save these changes to your program?
              </p>
              <div class="cluster">
                <button class="btn btn-primary" data-action="save-to-program">
                  <i class="fas fa-save"></i> Save to Program
                </button>
                <button class="btn btn-outline" data-action="skip-save-program">
                  Skip
                </button>
              </div>
            </div>
          `
        : ''}

      <div class="cluster" style="justify-content: center;">
        <button class="btn btn-outline text-danger" data-action="delete-workout">
          <i class="fas fa-trash"></i> Delete Workout
        </button>
        <button class="btn btn-primary btn-lg" data-action="finish-summary">
          <i class="fas fa-check"></i> Done
        </button>
      </div>
    </div>
  `;
}
