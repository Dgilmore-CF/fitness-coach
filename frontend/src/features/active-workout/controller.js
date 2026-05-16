/**
 * Active Workout controller — owns the full-screen modal lifecycle.
 *
 * Replaces:
 *   - showWorkoutWarmupScreen, setupWorkoutModalEventDelegation
 *   - startWorkoutExercises, fetchHistoricalExerciseData
 *   - renderWorkoutExerciseTabs, renderExerciseContent
 *   - addExerciseSet, adjustTargetSets, deleteExerciseSet, editSet/saveEditedSet
 *   - switchToExercise, nextExercise, previousExercise, moveWorkoutExercise
 *   - showExtraSetInput, endWorkoutEarly, minimizeWorkout
 *   - showAddExercisesModal, addSelectedExercises, filterExerciseList
 *   - showWorkoutSummary, finishWorkoutSummary, deleteCompletedWorkout, saveWorkoutToProgram
 *   - Rest timer controls
 */

import { html, htmlToElement, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { toast } from '@ui/Toast';
import { confirmDialog, openModal } from '@ui/Modal';
import { formatDuration, formatWeight } from '@utils/formatters';
import {
  isImperialSystem,
  lbsToKg,
  toDisplayWeight
} from '@utils/conversions';
import { playPRCelebration } from '@utils/audio';
import {
  renderWarmupScreen,
  renderExerciseTabs,
  renderExerciseContent,
  renderAddExercisesModal,
  renderWorkoutSummary
} from './views.js';
import { analyzePostSet } from './set-analyzer.js';
import {
  showFlagCard,
  hideFlagCard,
  getActiveFlagAction,
  getActiveFlagInsight
} from './flag-card.js';
import {
  openCoachSheet,
  buildPrefillFromFlag,
  buildPrefillFromWorkout
} from './coach-sheet.js';
import {
  getWorkout,
  setWorkout,
  refreshWorkout,
  getActiveIndex,
  setActiveIndex,
  getActiveExercise,
  getExerciseHistory,
  setExerciseHistory,
  fetchExerciseHistory,
  getModifications,
  resetModifications,
  trackModification,
  getPerceivedExertion,
  setPerceivedExertion,
  resetSession
} from './session.js';
import {
  startRestTimer,
  stopRestTimer,
  skipRestTimer,
  adjustRestTimer,
  getRestRemaining,
  getRestDuration,
  isRestActive,
  resumeRestTimer,
  startWorkoutTimer,
  stopWorkoutTimer
} from './timer.js';

// =========================================================================
// Lifecycle: open / close the full-screen modal
// =========================================================================

let modalEl = null;
let isAddingSet = false;
let minimizedState = null;

// In-workout exercise-context cache. Keyed by exercise_id (NOT
// workout_exercise.id). Values are the JSON returned from
// GET /api/workouts/exercises/:id/context. Populated lazily on first
// view of each exercise tab and cleared on workout close.
const exerciseContextCache = new Map();
// Tracks in-flight requests so we don't double-fetch when the user
// rapidly logs sets before the first fetch resolves.
const exerciseContextPending = new Map();

/**
 * Resolve the canonical exercise_id from a workout-exercise row. Programs
 * carry `exercise_id`; ad-hoc adds may only have `id`. Falls back to `id`.
 */
function resolveExerciseId(workoutExercise) {
  if (!workoutExercise) return null;
  return workoutExercise.exercise_id || workoutExercise.id || null;
}

/**
 * Fetch (and cache) the exercise context snapshot used by the in-workout
 * analyzer. Fire-and-forget — callers should not await this on a hot path.
 * Returns the cached value immediately when available so callers like
 * `logSet()` can run the analyzer synchronously.
 */
async function prefetchExerciseContext(exerciseId, workoutId) {
  if (!exerciseId) return null;
  if (exerciseContextCache.has(exerciseId)) {
    return exerciseContextCache.get(exerciseId);
  }
  if (exerciseContextPending.has(exerciseId)) {
    return exerciseContextPending.get(exerciseId);
  }

  const wq = workoutId ? `?workoutId=${workoutId}` : '';
  const promise = api.get(`/workouts/exercises/${exerciseId}/context${wq}`)
    .then((ctx) => {
      exerciseContextCache.set(exerciseId, ctx);
      return ctx;
    })
    .catch((err) => {
      // Network/auth/etc. — the analyzer still runs with a blank context
      // and simply returns null for most rules. We swallow the error so
      // it doesn't surface as a toast during set logging.
      console.warn('Exercise context fetch failed:', err);
      return null;
    })
    .finally(() => {
      exerciseContextPending.delete(exerciseId);
    });

  exerciseContextPending.set(exerciseId, promise);
  return promise;
}

/**
 * Run the rule analyzer against the most recently logged set and either
 * surface a flag card or hide whatever was there before.
 */
function runSetAnalyzer({ exercise, refreshedSets, lastSet }) {
  const exerciseId = resolveExerciseId(exercise);
  if (!exerciseId) {
    hideFlagCard();
    return;
  }
  const ctx = exerciseContextCache.get(exerciseId);
  // No context cached yet (e.g. very first set of the very first exercise
  // before prefetch resolved). The analyzer only needs context for PR /
  // stall rules; for routine sets it would have returned null anyway, so
  // we just hide.
  if (!ctx) {
    hideFlagCard();
    return;
  }
  const insight = analyzePostSet({
    exercise,
    currentSets: refreshedSets || [],
    lastSet,
    exerciseContext: ctx,
    formatWeight
  });
  showFlagCard(insight);
}

function lockBodyScroll() {
  document.body.dataset.scrollY = String(window.scrollY);
  // Signal to Modal.js that body scroll is externally managed — nested
  // confirm dialogs (e.g. when ending the workout) won't unlock on close.
  document.body.dataset.externalScrollLock = 'active-workout';
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = `-${window.scrollY}px`;
}

function unlockBodyScroll() {
  const scrollY = document.body.dataset.scrollY;
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  delete document.body.dataset.scrollY;
  delete document.body.dataset.externalScrollLock;
  if (scrollY) window.scrollTo(0, parseInt(scrollY, 10));
}

function createModal() {
  if (modalEl) return modalEl;
  modalEl = document.createElement('div');
  modalEl.id = 'aw-modal';
  modalEl.className = 'aw-modal';
  document.body.appendChild(modalEl);
  lockBodyScroll();
  attachDelegate();
  return modalEl;
}

function destroyModal() {
  if (modalEl) {
    modalEl.remove();
    modalEl = null;
  }
  unlockBodyScroll();
  stopWorkoutTimer();
  stopRestTimer();
  // Discard per-workout cached exercise contexts so the next workout
  // re-fetches fresh history (PRs may have changed, etc.).
  exerciseContextCache.clear();
  exerciseContextPending.clear();
}

function setModalContent(content) {
  if (!modalEl) createModal();
  modalEl.innerHTML = String(content);
}

// =========================================================================
// Public entry points
// =========================================================================

export function showWarmup(workout) {
  if (!workout?.exercises?.length) {
    toast.error('Workout has no exercises');
    return;
  }
  setWorkout(workout);
  createModal();
  setModalContent(renderWarmupScreen(workout));
}

export async function startExercises() {
  try {
    const workout = await refreshWorkout();
    if (!workout) return;

    resetModifications();
    await fetchExerciseHistory();

    // Start the workout timer
    startWorkoutTimer(workout.start_time, (elapsed) => {
      const el = document.getElementById('aw-workout-timer');
      if (el) el.textContent = formatDuration(elapsed);
    });

    // Prefetch context for the first exercise so the analyzer has data ready
    // by the time the user logs their first set. Fire-and-forget.
    const firstExercise = workout.exercises?.[getActiveIndex()];
    if (firstExercise) {
      prefetchExerciseContext(resolveExerciseId(firstExercise), workout.id);
    }

    renderTabs();
  } catch (err) {
    toast.error(`Error loading workout: ${err.message}`);
  }
}

export async function resume(workout) {
  if (!workout) return;
  setWorkout(workout);
  if (!modalEl) createModal();
  resetModifications();
  await fetchExerciseHistory();

  startWorkoutTimer(workout.start_time, (elapsed) => {
    const el = document.getElementById('aw-workout-timer');
    if (el) el.textContent = formatDuration(elapsed);
  });

  // Prefetch context for the active exercise on resume.
  const activeOnResume = workout.exercises?.[getActiveIndex()];
  if (activeOnResume) {
    prefetchExerciseContext(resolveExerciseId(activeOnResume), workout.id);
  }

  renderTabs();

  if (minimizedState?.restEndTime && Date.now() < minimizedState.restEndTime) {
    resumeRestTimer({
      onTick: updateRestTimerDisplay,
      onComplete: () => hideRestTimer()
    });
    showRestTimer();
  }
  minimizedState = null;

  toast.success('Workout resumed');
}

function renderTabs() {
  const workout = getWorkout();
  if (!workout) return;

  const idx = getActiveIndex();
  const exercise = workout.exercises?.[idx];
  if (!exercise) {
    showSummary();
    return;
  }

  setModalContent(renderExerciseTabs(workout, idx));
  renderActiveExerciseContent();

  // Prefetch context for the now-active exercise. Cached fetches no-op.
  // Done after the DOM is rendered so the flag card slot exists.
  prefetchExerciseContext(resolveExerciseId(exercise), workout.id);

  // Resume visible rest timer if still active
  if (isRestActive()) {
    showRestTimer();
    resumeRestTimer({
      onTick: updateRestTimerDisplay,
      onComplete: () => hideRestTimer()
    });
  }

  // Focus weight input
  setTimeout(() => {
    document.getElementById('aw-new-set-weight')?.focus();
  }, 50);
}

function renderActiveExerciseContent() {
  const workout = getWorkout();
  const exercise = getActiveExercise();
  const contentHost = modalEl?.querySelector('.aw-exercise-content .container');
  if (!contentHost || !exercise) return;

  const history = store.get('workout.exerciseHistory') || {};
  contentHost.innerHTML = String(renderExerciseContent(exercise, getActiveIndex(), history));
}

// =========================================================================
// Event delegation
// =========================================================================

function attachDelegate() {
  if (!modalEl) return;
  modalEl.addEventListener('click', handleClick);
  modalEl.addEventListener('keydown', handleKeydown);
}

function handleKeydown(event) {
  if (event.key !== 'Enter') return;
  if (event.target.matches('#aw-new-set-weight')) {
    event.preventDefault();
    document.getElementById('aw-new-set-reps')?.focus();
  } else if (event.target.matches('#aw-new-set-reps')) {
    event.preventDefault();
    const btn = document.getElementById('aw-log-set-btn');
    btn?.click();
  }
}

async function handleClick(event) {
  // Flag-card action buttons — checked before the generic data-action
  // dispatcher because the flag card uses a distinct `data-flag-action`
  // attribute to avoid colliding with the workout's data-action vocabulary.
  const flagTarget = event.target.closest('[data-flag-action]');
  if (flagTarget) {
    event.stopPropagation();
    try {
      handleFlagAction(flagTarget.getAttribute('data-flag-action'));
    } catch (err) {
      console.error('Flag-action handler error:', err);
    }
    return;
  }

  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  // Temporary diagnostic so we can see in the browser console whether the
  // click is reaching the dispatcher. Safe to remove once stable.
  console.log('[active-workout] action:', action);
  event.stopPropagation();

  if (action === 'dismiss-flag') {
    hideFlagCard();
    return;
  }

  // Wrap the entire dispatcher so a single failing handler can't break the
  // event listener (an uncaught throw from any await would leave the click
  // listener intact, but logging makes future debugging much easier).
  try {

  switch (action) {
    case 'cancel-workout':
      await cancelWorkout();
      break;
    case 'start-exercises':
      await startExercises();
      break;
    case 'switch-exercise':
      setActiveIndex(parseInt(target.dataset.index, 10));
      renderTabs();
      break;
    case 'prev-exercise':
      if (getActiveIndex() > 0) {
        setActiveIndex(getActiveIndex() - 1);
        renderTabs();
      }
      break;
    case 'next-exercise':
      await goNext();
      break;
    case 'move-exercise':
      await moveExercise(
        parseInt(target.dataset.index, 10),
        parseInt(target.dataset.direction, 10)
      );
      break;
    case 'log-set':
      await logSet(parseInt(target.dataset.exerciseId, 10));
      break;
    case 'adjust-target-sets':
      await adjustTargetSets(
        parseInt(target.dataset.exerciseId, 10),
        parseInt(target.dataset.adjust, 10)
      );
      break;
    case 'edit-set':
      await openEditSet({
        exerciseId: parseInt(target.dataset.exerciseId, 10),
        setId: parseInt(target.dataset.setId, 10),
        weight: parseFloat(target.dataset.weight),
        reps: parseInt(target.dataset.reps, 10)
      });
      break;
    case 'delete-set':
      await deleteSet(
        parseInt(target.dataset.exerciseId, 10),
        parseInt(target.dataset.setId, 10)
      );
      break;
    case 'remove-exercise':
      await removeExercise(
        parseInt(target.dataset.exerciseId, 10),
        target.dataset.exerciseName
      );
      break;
    case 'show-history':
      // Delegates to migrated exercise-history modal if present
      if (typeof window.showExerciseHistory === 'function') {
        window.showExerciseHistory(
          parseInt(target.dataset.exerciseId, 10),
          target.dataset.exerciseName
        );
      }
      break;
    case 'show-notes':
      openNotesModal();
      break;
    case 'add-exercises':
      await openAddExercises();
      break;
    case 'close-add-exercises':
      document.getElementById('aw-add-exercises-overlay')?.remove();
      break;
    case 'add-selected-exercises':
      await addSelectedExercises();
      break;
    case 'minimize':
      minimize();
      break;
    case 'end-workout':
      await endWorkoutEarly();
      break;
    case 'ask-coach':
      openCoachSheetFromFooter();
      break;
    case 'show-extra-set-input':
      addExtraSet();
      break;
    case 'rest-adjust':
      adjustRestTimer(parseInt(target.dataset.delta, 10));
      break;
    case 'rest-skip':
      skipRestTimer();
      hideRestTimer();
      break;
    case 'set-exertion':
      handleExertionSelect(parseInt(target.dataset.level, 10));
      break;
    case 'finish-summary':
      await finishSummary();
      break;
    case 'delete-workout':
      await deleteCompletedWorkout();
      break;
    case 'save-to-program':
      await saveWorkoutToProgram();
      break;
    case 'skip-save-program':
      document.querySelector('.aw-summary-save-program')?.remove();
      break;
  }

  } catch (err) {
    console.error(`Workout action handler "${action}" threw:`, err);
    toast.error(`Action failed: ${err.message || 'unknown error'}`);
  }
}

// =========================================================================
// Actions
// =========================================================================

/**
 * Handle a tap on a flag-card action button. The button itself carries only
 * the action type; the numeric payload (rest seconds, drop-target weight) is
 * stashed on the card element by flag-card.js so we can read it back here.
 */
function handleFlagAction(actionType) {
  const action = getActiveFlagAction();
  switch (actionType) {
    case 'extend_rest': {
      const seconds = typeof action?.value === 'number' ? action.value : 30;
      adjustRestTimer(seconds);
      toast.info(`Rest extended by ${seconds}s`);
      // The card has done its job — collapse so it doesn't clutter the view.
      hideFlagCard();
      break;
    }
    case 'drop_weight': {
      // Pre-fill the weight input with the dropped target in user units.
      // Don't auto-submit — the user confirms by tapping Log Set themselves.
      const targetKg = typeof action?.value === 'number' ? action.value : null;
      if (targetKg == null) break;
      const weightEl = document.getElementById('aw-new-set-weight');
      if (weightEl) {
        weightEl.value = String(toDisplayWeight(targetKg));
        weightEl.focus();
        weightEl.select?.();
      }
      hideFlagCard();
      break;
    }
    case 'ask_coach': {
      // Open the chat sheet with a question pre-seeded from the flag's
      // context. Read insight BEFORE hiding the card (hide clears it).
      const insightForPrefill = getActiveFlagInsight();
      const exercise = getActiveExercise();
      const prefill = buildPrefillFromFlag(insightForPrefill, exercise);
      hideFlagCard();
      openCoachSheet({ prefillMessage: prefill });
      break;
    }
    default:
      hideFlagCard();
  }
}

/**
 * Footer "Ask Coach" button entry. Builds a prefill from the active exercise
 * + the user's most recent sets in this workout, then opens the chat sheet.
 */
function openCoachSheetFromFooter() {
  const exercise = getActiveExercise();
  const currentSets = exercise?.sets || [];
  const prefill = buildPrefillFromWorkout({ exercise, currentSets });
  openCoachSheet({ prefillMessage: prefill });
}

async function cancelWorkout() {
  const workout = getWorkout();
  if (workout?.id) {
    try {
      await api.delete(`/workouts/${workout.id}`);
    } catch (err) {
      console.warn('Failed to delete cancelled workout:', err);
    }
  }
  destroyModal();
  resetSession();
}

async function goNext() {
  const workout = getWorkout();
  if (!workout) return;
  const idx = getActiveIndex();
  if (idx < workout.exercises.length - 1) {
    setActiveIndex(idx + 1);
    renderTabs();
  } else {
    await showSummary();
  }
}

async function moveExercise(index, direction) {
  const workout = getWorkout();
  if (!workout) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= workout.exercises.length) return;

  const exercises = [...workout.exercises];
  [exercises[index], exercises[newIndex]] = [exercises[newIndex], exercises[index]];
  setWorkout({ ...workout, exercises });
  setActiveIndex(newIndex);

  try {
    // Backend expects `exerciseOrders: [{ id, order_index }, ...]`,
    // not a flat array of ids.
    await api.patch(`/workouts/${workout.id}/reorder`, {
      exerciseOrders: exercises.map((e, i) => ({ id: e.id, order_index: i }))
    });
  } catch (err) {
    toast.error(`Could not reorder: ${err.message}`);
    await refreshWorkout();
  }
  renderTabs();
}

async function logSet(exerciseId) {
  if (isAddingSet) return;
  isAddingSet = true;

  const weightInput = document.getElementById('aw-new-set-weight');
  const repsInput = document.getElementById('aw-new-set-reps');
  const logBtn = document.getElementById('aw-log-set-btn');

  if (!weightInput || !repsInput) {
    isAddingSet = false;
    return;
  }

  const isBodyweightOnly = weightInput.getAttribute('data-bodyweight-only') === 'true';
  const isBodyweightOptional = weightInput.getAttribute('data-bodyweight-optional') === 'true';

  let weight = parseFloat(weightInput.value) || 0;
  const reps = parseInt(repsInput.value, 10);

  if (!reps || Number.isNaN(reps)) {
    toast.warning('Please enter valid reps');
    isAddingSet = false;
    return;
  }

  if (!isBodyweightOnly && !isBodyweightOptional && !weight) {
    toast.warning('Please enter valid weight');
    isAddingSet = false;
    return;
  }

  if (weight > 0 && isImperialSystem()) {
    weight = lbsToKg(weight);
  }

  if (logBtn) {
    logBtn.disabled = true;
    logBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging…';
  }

  const workout = getWorkout();
  const currentExercise = workout.exercises.find((e) => e.id === exerciseId);
  const previousMax = Math.max(...(currentExercise?.sets || []).map((s) => s.weight_kg || 0), 0);

  try {
    await api.post(`/workouts/${workout.id}/exercises/${exerciseId}/sets`, {
      weight_kg: weight,
      reps,
      rest_seconds: 90
    });

    await refreshWorkout();
    const refreshedExercise = getWorkout().exercises.find((e) => e.id === exerciseId);

    const isPR = weight > 0 && weight > previousMax && previousMax > 0;
    if (isPR) {
      showPRCelebration(refreshedExercise?.name || 'Exercise', weight);
    } else {
      toast.success('Set logged!');
    }

    // Start rest timer
    startRestTimer(90, {
      onTick: updateRestTimerDisplay,
      onComplete: () => hideRestTimer()
    });
    showRestTimer();

    isAddingSet = false;
    renderTabs();

    // In-workout coaching: run the rule-based analyzer against the just-
    // logged set. Must run AFTER renderTabs() since that re-renders the
    // modal innerHTML (including the #aw-set-flag-card slot). Surfaces an
    // inline flag card only when something notable is detected (PR, form/
    // load warning, plateau). Routine sets stay silent. No network call,
    // no LLM, no per-set wait.
    if (refreshedExercise) {
      const refreshedSets = refreshedExercise.sets || [];
      // The newest set is the one we just added — the last set_number wins,
      // falling back to array tail if set_numbers aren't sequential.
      const sortedSets = [...refreshedSets].sort(
        (a, b) => (a.set_number || 0) - (b.set_number || 0)
      );
      const lastSet = sortedSets[sortedSets.length - 1];
      runSetAnalyzer({
        exercise: refreshedExercise,
        refreshedSets,
        lastSet
      });
    }

    // Auto-advance prompt
    const completed = (refreshedExercise.sets || []).length;
    const target = refreshedExercise.target_sets || 3;
    if (completed >= target) {
      setTimeout(async () => {
        const isLast = getActiveIndex() === getWorkout().exercises.length - 1;
        const msg = isLast
          ? 'Target sets complete! Finish workout?'
          : 'Target sets complete! Move to next exercise?';
        const ok = await confirmDialog(msg, {
          title: 'Complete',
          confirmLabel: isLast ? 'Finish' : 'Next'
        });
        if (ok) await goNext();
      }, 400);
    }
  } catch (err) {
    toast.error(`Error logging set: ${err.message}`);
    isAddingSet = false;
    if (logBtn) {
      logBtn.disabled = false;
      logBtn.innerHTML = '<i class="fas fa-plus"></i> Log Set';
    }
  }
}

async function adjustTargetSets(exerciseId, adjustment) {
  const workout = getWorkout();
  const exercise = workout.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return;

  const newTarget = Math.max(1, Math.min(10, (exercise.target_sets || 3) + adjustment));
  try {
    await api.patch(`/workouts/${workout.id}/exercises/${exerciseId}`, {
      target_sets: newTarget
    });
    exercise.target_sets = newTarget;
    setWorkout(workout);
    renderTabs();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

async function deleteSet(exerciseId, setId) {
  const ok = await confirmDialog('Delete this set?', {
    title: 'Delete set?',
    confirmLabel: 'Delete',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;

  const workout = getWorkout();
  try {
    await api.delete(`/workouts/${workout.id}/exercises/${exerciseId}/sets/${setId}`);
    await refreshWorkout();
    renderTabs();
    toast.success('Set deleted');
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

async function openEditSet({ exerciseId, setId, weight, reps }) {
  const displayWeight = toDisplayWeight(weight);

  openModal({
    title: 'Edit Set',
    size: 'default',
    content: String(html`
      <div class="form-group">
        <label class="form-label">Weight</label>
        <input type="number" id="edit-set-weight" class="input" value="${displayWeight}" step="0.5" />
      </div>
      <div class="form-group">
        <label class="form-label">Reps</label>
        <input type="number" id="edit-set-reps" class="input" value="${reps}" min="1" />
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Save',
        primary: true,
        onClick: async (modal) => {
          let w = parseFloat(modal.element.querySelector('#edit-set-weight').value) || 0;
          const r = parseInt(modal.element.querySelector('#edit-set-reps').value, 10);
          if (!r) {
            toast.warning('Please enter valid reps');
            return;
          }
          if (w > 0 && isImperialSystem()) w = lbsToKg(w);
          try {
            await api.put(
              `/workouts/${getWorkout().id}/exercises/${exerciseId}/sets/${setId}`,
              { weight_kg: w, reps: r }
            );
            await refreshWorkout();
            renderTabs();
            modal.close();
            toast.success('Set updated');
          } catch (err) {
            toast.error(`Error: ${err.message}`);
          }
        }
      }
    ]
  });
}

async function removeExercise(exerciseId, exerciseName) {
  const ok = await confirmDialog(`Remove "${exerciseName}" from this workout?`, {
    title: 'Remove exercise?',
    confirmLabel: 'Remove',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;

  const workout = getWorkout();
  try {
    await api.delete(`/workouts/${workout.id}/exercises/${exerciseId}`);
    trackModification('deleted', exerciseId, exerciseName);
    await refreshWorkout();
    const newLen = getWorkout().exercises.length;
    if (getActiveIndex() >= newLen) setActiveIndex(Math.max(0, newLen - 1));
    renderTabs();
    toast.success('Exercise removed');
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

async function openAddExercises() {
  try {
    const data = await api.get('/exercises');
    const exercises = data.exercises || [];
    const byMuscle = {};
    for (const ex of exercises) {
      const key = ex.muscle_group || 'Other';
      if (!byMuscle[key]) byMuscle[key] = [];
      byMuscle[key].push(ex);
    }

    modalEl.insertAdjacentHTML('beforeend', String(renderAddExercisesModal(byMuscle)));

    const searchInput = document.getElementById('aw-add-exercises-search');
    searchInput?.addEventListener('input', (e) => filterAddExercises(e.target.value));
    searchInput?.focus();

    const list = document.getElementById('aw-add-exercises-list');
    list?.addEventListener('change', updateAddSelectedCount);
  } catch (err) {
    toast.error(`Error loading exercises: ${err.message}`);
  }
}

function filterAddExercises(query) {
  const q = (query || '').toLowerCase();
  document.querySelectorAll('.aw-add-exercise-item').forEach((item) => {
    const name = item.dataset.name || '';
    item.style.display = name.includes(q) ? '' : 'none';
  });
  // Hide empty groups
  document.querySelectorAll('.aw-exercise-group').forEach((group) => {
    const visible = group.querySelectorAll('.aw-add-exercise-item:not([style*="display: none"])');
    group.style.display = visible.length > 0 ? '' : 'none';
  });
}

function updateAddSelectedCount() {
  const checked = document.querySelectorAll('[data-add-exercise]:checked');
  const btn = document.getElementById('aw-add-selected-btn');
  const countEl = document.getElementById('aw-add-selected-count');
  if (btn) btn.disabled = checked.length === 0;
  if (countEl) countEl.textContent = String(checked.length);
}

async function addSelectedExercises() {
  const checked = Array.from(document.querySelectorAll('[data-add-exercise]:checked'));
  if (checked.length === 0) return;

  const workout = getWorkout();
  try {
    for (const cb of checked) {
      const exerciseId = parseInt(cb.getAttribute('data-add-exercise'), 10);
      await api.post(`/workouts/${workout.id}/exercises`, { exercise_id: exerciseId });
      trackModification('added', exerciseId, cb.closest('.aw-add-exercise-item')?.querySelector('strong')?.textContent || '');
    }
    await refreshWorkout();
    document.getElementById('aw-add-exercises-overlay')?.remove();
    renderTabs();
    toast.success(`Added ${checked.length} exercise${checked.length === 1 ? '' : 's'}`);
  } catch (err) {
    toast.error(`Error adding exercises: ${err.message}`);
  }
}

function minimize() {
  minimizedState = {
    restEndTime: isRestActive() ? Date.now() + getRestRemaining() * 1000 : null
  };
  if (modalEl) {
    modalEl.remove();
    modalEl = null;
  }
  unlockBodyScroll();
  stopWorkoutTimer();
  toast.info('Workout minimized — resume from the dashboard');
}

async function endWorkoutEarly() {
  const ok = await confirmDialog('End this workout early? You can still review what you logged.', {
    title: 'End workout?',
    confirmLabel: 'End workout',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;
  await showSummary();
}

function addExtraSet() {
  // Scroll to the new set input (the "Add Another Set" button reveals the input row)
  const workout = getWorkout();
  const exercise = getActiveExercise();
  if (!exercise) return;
  // Increase target by 1 locally to reveal the new set row
  exercise.target_sets = (exercise.target_sets || 3) + 1;
  setWorkout(workout);
  renderTabs();
}

// =========================================================================
// Rest timer UI sync
// =========================================================================

function showRestTimer() {
  const el = document.getElementById('aw-inline-rest-timer');
  if (el) el.removeAttribute('hidden');
  updateRestTimerDisplay();
}

function hideRestTimer() {
  const el = document.getElementById('aw-inline-rest-timer');
  if (el) el.setAttribute('hidden', '');
}

function updateRestTimerDisplay() {
  const remaining = getRestRemaining();
  const display = document.getElementById('aw-rest-timer-display');
  const progressEl = document.getElementById('aw-rest-progress');
  if (display) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    display.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  }
  if (progressEl) {
    const duration = getRestDuration();
    const pct = duration > 0 ? (remaining / duration) * 100 : 0;
    progressEl.style.width = `${pct}%`;
  }
  if (remaining <= 0) hideRestTimer();
}

// =========================================================================
// PR celebration
// =========================================================================

function showPRCelebration(exerciseName, weightKg) {
  playPRCelebration();
  const display = toDisplayWeight(weightKg).toFixed(1);
  const el = htmlToElement(html`
    <div class="aw-pr-celebration">
      <div class="aw-pr-card">
        <i class="fas fa-trophy"></i>
        <h2>NEW PR!</h2>
        <p>${exerciseName}</p>
        <div class="aw-pr-weight">${display} ${isImperialSystem() ? 'lbs' : 'kg'}</div>
      </div>
    </div>
  `);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// =========================================================================
// Notes modal
// =========================================================================

function openNotesModal() {
  const workout = getWorkout();
  openModal({
    title: 'Workout Notes',
    size: 'default',
    content: String(html`
      <div class="form-group">
        <label class="form-label">Add notes for this workout</label>
        <textarea id="aw-notes-input" class="textarea" rows="5" placeholder="How did this session feel? Any adjustments?">${workout?.notes || ''}</textarea>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Save Notes',
        primary: true,
        onClick: async (modal) => {
          const notes = modal.element.querySelector('#aw-notes-input').value;
          try {
            await api.patch(`/workouts/${getWorkout().id}`, { notes });
            modal.close();
            toast.success('Notes saved');
          } catch (err) {
            toast.error(`Error: ${err.message}`);
          }
        }
      }
    ]
  });
}

// =========================================================================
// Summary flow
// =========================================================================

async function showSummary() {
  const workout = getWorkout();
  if (!workout) return;

  try {
    // Mark complete (the complete endpoint returns only the updated workout
    // row — no exercises). Then immediately GET the full workout (which
    // joins in exercises + sets) so the summary shows what was actually done.
    const result = await api.post(`/workouts/${workout.id}/complete`);
    const completedRow = result.workout || workout;

    let completed = completedRow;
    try {
      const fullData = await api.get(`/workouts/${workout.id}`);
      // Merge: use freshly-fetched exercises/sets but keep the completion
      // totals from the complete endpoint.
      completed = {
        ...fullData.workout,
        total_weight_kg: completedRow.total_weight_kg,
        total_duration_seconds: completedRow.total_duration_seconds,
        end_time: completedRow.end_time,
        completed: completedRow.completed,
        perceived_exertion: completedRow.perceived_exertion ?? fullData.workout?.perceived_exertion
      };
    } catch (fetchErr) {
      console.warn('Could not re-fetch workout after complete:', fetchErr);
    }

    setWorkout(completed);

    const hasMods = getModifications().added.length > 0 || getModifications().deleted.length > 0;
    setModalContent(renderWorkoutSummary(completed, completed, hasMods));

    stopRestTimer();
    stopWorkoutTimer();
  } catch (err) {
    toast.error(`Error completing workout: ${err.message}`);
  }
}

function handleExertionSelect(level) {
  setPerceivedExertion(level);
  document.querySelectorAll('.aw-exertion-btn').forEach((btn) => {
    btn.classList.toggle('is-selected', parseInt(btn.dataset.level, 10) === level);
  });
}

async function finishSummary() {
  const exertion = getPerceivedExertion();
  const workout = getWorkout();
  if (exertion && workout) {
    try {
      await api.patch(`/workouts/${workout.id}/perceived-exertion`, {
        perceived_exertion: exertion
      });
    } catch (err) {
      console.warn('Could not save exertion:', err);
    }
  }
  destroyModal();
  resetSession();
  toast.success('Great workout! 💪');
  if (typeof window.switchTab === 'function') window.switchTab('dashboard');
}

async function deleteCompletedWorkout() {
  const ok = await confirmDialog('Delete this workout permanently?', {
    title: 'Delete workout?',
    confirmLabel: 'Delete',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;
  try {
    await api.delete(`/workouts/${getWorkout().id}`);
    destroyModal();
    resetSession();
    toast.success('Workout deleted');
    if (typeof window.switchTab === 'function') window.switchTab('dashboard');
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

async function saveWorkoutToProgram() {
  const workout = getWorkout();
  if (!workout?.program_day_id) {
    toast.error('No program day associated with this workout');
    return;
  }
  try {
    const mods = getModifications();
    await api.post(`/programs/${workout.program_id}/days/${workout.program_day_id}/sync`, mods);
    toast.success('Program updated with your changes');
    document.querySelector('.aw-summary-save-program')?.remove();
  } catch (err) {
    toast.error(`Error saving: ${err.message}`);
  }
}

// Public API for legacy integration
export const activeWorkout = {
  showWarmup,
  resume,
  startExercises,
  destroy: destroyModal,
  isOpen: () => !!modalEl,
  hasMinimized: () => !!minimizedState
};

export default activeWorkout;
