/**
 * Log Past Workout flow — modal-driven.
 *
 * Migrated from legacy showLogPastWorkout and ~15 related functions
 * (loadProgramDays, loadPastWorkoutTemplate, showPastWorkoutWithSets,
 * add/collect template values, saveTemplateWorkout, showAddExerciseToPastWorkout,
 * selectExerciseForPastWorkout, addSetToPastExercise, renumberPastSets,
 * confirmAddExerciseToPastWorkout, renderPastWorkoutUI,
 * removeExerciseFromPastWorkout, savePastWorkout).
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { toast } from '@ui/Toast';
import { todayLocal } from '@utils/date';
import { openModal } from '@ui/Modal';
import {
  isImperialSystem,
  lbsToKg,
  toDisplayWeight,
  getWeightUnit
} from '@utils/conversions';

// Module-local state for the in-progress past workout
let flowState = {
  date: null,
  programId: null,
  programDayId: null,
  duration: 60,
  notes: '',
  exercises: [],
  availableExercises: []
};

function resetState() {
  flowState = {
    date: null,
    programId: null,
    programDayId: null,
    duration: 60,
    notes: '',
    exercises: [],
    availableExercises: []
  };
}

/**
 * Open the Log Past Workout modal.
 * @param {string} [preselectedDate]
 */
export async function showLogPastWorkout(preselectedDate = null) {
  if (!flowState.availableExercises.length) {
    try {
      const res = await api.get('/exercises');
      flowState.availableExercises = res.exercises || [];
    } catch (err) {
      toast.error(`Error loading exercises: ${err.message}`);
      return;
    }
  }

  flowState.date = preselectedDate || todayLocal();

  renderMainModal();
}

function renderMainModal() {
  const isEmpty = flowState.exercises.length === 0;

  const api_ = openModal({
    title: 'Log Past Workout',
    size: 'wide',
    dismissable: true,
    content: String(html`
      <div class="stack stack-md">
        <div class="grid grid-cols-2" style="gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" id="past-date" class="input" value="${flowState.date}" max="${todayLocal()}" />
          </div>
          <div class="form-group">
            <label class="form-label">Duration (minutes)</label>
            <input type="number" id="past-duration" class="input" value="${flowState.duration}" min="5" max="300" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Load from program (optional)</label>
          <div class="grid grid-cols-2" style="gap: var(--space-3);">
            <select id="past-program" class="select">
              <option value="">— Choose program —</option>
            </select>
            <select id="past-program-day" class="select" disabled>
              <option value="">— Choose day —</option>
            </select>
          </div>
          <div class="form-hint">
            Loading a program day will pre-fill the exercises. Edit freely after.
          </div>
        </div>

        <div>
          <div class="cluster cluster-between" style="margin-bottom: var(--space-3);">
            <h3 class="section-title">
              <i class="fas fa-dumbbell"></i> Exercises (${flowState.exercises.length})
            </h3>
            <button class="btn btn-outline btn-sm" data-action="add-exercise">
              <i class="fas fa-plus"></i> Add Exercise
            </button>
          </div>
          <div id="past-exercises-list">
            ${renderExercisesList()}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notes (optional)</label>
          <textarea id="past-notes" class="textarea" rows="2" placeholder="How did this session go?">${flowState.notes}</textarea>
        </div>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Save Workout',
        primary: true,
        onClick: (modal) => saveWorkout(modal)
      }
    ],
    onOpen: ({ element }) => {
      // Populate programs dropdown
      loadPrograms(element);

      element.querySelector('#past-date').addEventListener('change', (e) => {
        flowState.date = e.target.value;
      });
      element.querySelector('#past-duration').addEventListener('change', (e) => {
        flowState.duration = parseInt(e.target.value, 10) || 60;
      });
      element.querySelector('#past-notes').addEventListener('input', (e) => {
        flowState.notes = e.target.value;
      });

      element.querySelector('#past-program').addEventListener('change', async (e) => {
        flowState.programId = e.target.value ? parseInt(e.target.value, 10) : null;
        await loadProgramDays(element, flowState.programId);
      });

      element.querySelector('#past-program-day').addEventListener('change', async (e) => {
        flowState.programDayId = e.target.value ? parseInt(e.target.value, 10) : null;
        if (flowState.programDayId) {
          await loadTemplate(flowState.programDayId);
        }
      });

      element.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const action = target.getAttribute('data-action');

        if (action === 'add-exercise') {
          showAddExerciseModal();
        } else if (action === 'remove-exercise') {
          const idx = parseInt(target.getAttribute('data-index'), 10);
          flowState.exercises.splice(idx, 1);
          rerenderExercises(element);
        } else if (action === 'add-set') {
          const idx = parseInt(target.getAttribute('data-index'), 10);
          flowState.exercises[idx].sets.push({ weight_kg: 0, reps: 0 });
          rerenderExercises(element);
        } else if (action === 'remove-set') {
          const exIdx = parseInt(target.getAttribute('data-ex-index'), 10);
          const setIdx = parseInt(target.getAttribute('data-set-index'), 10);
          flowState.exercises[exIdx].sets.splice(setIdx, 1);
          rerenderExercises(element);
        }
      });

      element.addEventListener('input', (event) => {
        const input = event.target;
        const setCell = input.closest('[data-set-input]');
        if (!setCell) return;
        const field = setCell.getAttribute('data-set-input');
        const exIdx = parseInt(setCell.getAttribute('data-ex-index'), 10);
        const setIdx = parseInt(setCell.getAttribute('data-set-index'), 10);
        const value = parseFloat(input.value) || 0;
        if (field === 'reps') {
          flowState.exercises[exIdx].sets[setIdx].reps = Math.round(value);
        } else {
          // Weight comes in user's unit system
          flowState.exercises[exIdx].sets[setIdx].weight_kg =
            isImperialSystem() ? lbsToKg(value) : value;
        }
      });
    }
  });

  api_.promise.finally(() => resetState());
}

function renderExercisesList() {
  if (flowState.exercises.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-icon">🏋️</div>
        <div class="empty-state-title">No exercises yet</div>
        <div class="empty-state-description">
          Load a program day or add exercises manually.
        </div>
      </div>
    `;
  }

  const unit = getWeightUnit();
  return html`
    <div class="stack stack-sm">
      ${flowState.exercises.map((ex, idx) => html`
        <div class="past-workout-exercise">
          <div class="past-workout-exercise-header">
            <strong>${ex.name}</strong>
            <div class="cluster" style="gap: var(--space-2);">
              <button class="btn btn-ghost btn-sm" data-action="add-set" data-index="${idx}" title="Add set">
                <i class="fas fa-plus"></i> Set
              </button>
              <button class="btn btn-ghost btn-sm text-danger" data-action="remove-exercise" data-index="${idx}" title="Remove exercise">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="past-workout-sets">
            <div class="past-workout-set-header">
              <span>Set</span>
              <span>Weight (${unit})</span>
              <span>Reps</span>
              <span></span>
            </div>
            ${ex.sets.map((set, setIdx) => html`
              <div class="past-workout-set-row">
                <span class="past-workout-set-num">${setIdx + 1}</span>
                <input type="number"
                  class="input"
                  value="${isImperialSystem() ? (toDisplayWeight(set.weight_kg) || '') : (set.weight_kg || '')}"
                  min="0" step="2.5"
                  data-set-input="weight"
                  data-ex-index="${idx}"
                  data-set-index="${setIdx}"
                  placeholder="0"
                />
                <input type="number"
                  class="input"
                  value="${set.reps || ''}"
                  min="0" step="1"
                  data-set-input="reps"
                  data-ex-index="${idx}"
                  data-set-index="${setIdx}"
                  placeholder="0"
                />
                <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="remove-set" data-ex-index="${idx}" data-set-index="${setIdx}">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            `)}
          </div>
        </div>
      `)}
    </div>
  `;
}

function rerenderExercises(modalEl) {
  const list = modalEl.querySelector('#past-exercises-list');
  if (list) list.innerHTML = String(renderExercisesList());

  // Update the "Exercises (N)" count
  const heading = modalEl.querySelector('.section-title');
  if (heading) {
    heading.innerHTML = String(html`<i class="fas fa-dumbbell"></i> Exercises (${flowState.exercises.length})`);
  }
}

async function loadPrograms(modalEl) {
  try {
    const data = await api.get('/programs');
    const select = modalEl.querySelector('#past-program');
    const options = (data.programs || []).map((p) => `<option value="${p.id}">${p.name}${p.active ? ' (active)' : ''}</option>`);
    select.innerHTML = '<option value="">— Choose program —</option>' + options.join('');
  } catch (err) {
    console.warn('Could not load programs:', err);
  }
}

async function loadProgramDays(modalEl, programId) {
  const daySelect = modalEl.querySelector('#past-program-day');
  daySelect.innerHTML = '<option value="">— Choose day —</option>';

  if (!programId) {
    daySelect.disabled = true;
    return;
  }

  try {
    const data = await api.get(`/programs/${programId}`);
    const days = data.program?.days || [];
    daySelect.innerHTML =
      '<option value="">— Choose day —</option>' +
      days.map((d) => `<option value="${d.id}">Day ${d.day_number}: ${d.name || ''}</option>`).join('');
    daySelect.disabled = false;
  } catch (err) {
    toast.error(`Could not load program days: ${err.message}`);
  }
}

async function loadTemplate(programDayId) {
  try {
    const data = await api.get(`/programs/days/${programDayId}/template`);
    const template = data.day;
    if (!template?.exercises) return;

    flowState.exercises = template.exercises.map((ex) => ({
      exercise_id: ex.exercise_id,
      name: ex.name,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
      sets: Array.from({ length: ex.target_sets || 3 }, () => ({ weight_kg: 0, reps: 0 }))
    }));

    // Re-render modal with exercises populated
    const modalEl = document.querySelector('.modal');
    if (modalEl) rerenderExercises(modalEl);

    toast.success(`Loaded "${template.name}" template`);
  } catch (err) {
    // Endpoint may not exist; fall back to program details
    try {
      const programData = await api.get(`/programs/${flowState.programId}`);
      const day = (programData.program?.days || []).find((d) => d.id === programDayId);
      if (day?.exercises) {
        flowState.exercises = day.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          name: ex.name,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          sets: Array.from({ length: ex.target_sets || 3 }, () => ({ weight_kg: 0, reps: 0 }))
        }));
        const modalEl = document.querySelector('.modal');
        if (modalEl) rerenderExercises(modalEl);
        toast.success(`Loaded "${day.name || 'Day'}" template`);
      }
    } catch (innerErr) {
      toast.error(`Could not load template: ${innerErr.message}`);
    }
  }
}

function showAddExerciseModal() {
  const byMuscle = {};
  for (const ex of flowState.availableExercises) {
    const key = ex.muscle_group || 'Other';
    if (!byMuscle[key]) byMuscle[key] = [];
    byMuscle[key].push(ex);
  }

  openModal({
    title: 'Add Exercise',
    size: 'default',
    content: String(html`
      <div class="form-group">
        <label class="form-label">Search</label>
        <input type="text" id="past-add-search" class="input" placeholder="Filter exercises…" autofocus />
      </div>
      <div id="past-add-list" class="past-add-exercise-list">
        ${Object.keys(byMuscle).sort().map((muscle) => html`
          <div class="past-add-group" data-muscle="${muscle}">
            <h4 class="past-add-group-title">${muscle}</h4>
            ${byMuscle[muscle].map((ex) => html`
              <button class="past-add-item" data-exercise-id="${ex.id}" data-exercise-name="${ex.name}" data-name="${ex.name.toLowerCase()}">
                <strong>${ex.name}</strong>
                <span class="text-muted" style="font-size: var(--text-xs);">${ex.equipment || '—'}</span>
              </button>
            `)}
          </div>
        `)}
      </div>
    `),
    actions: [
      { label: 'Close', variant: 'btn-outline' }
    ],
    onOpen: ({ element, close }) => {
      const search = element.querySelector('#past-add-search');
      search.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        element.querySelectorAll('.past-add-item').forEach((item) => {
          const match = item.dataset.name.includes(q);
          item.style.display = match ? '' : 'none';
        });
        element.querySelectorAll('.past-add-group').forEach((group) => {
          const visible = group.querySelectorAll('.past-add-item:not([style*="display: none"])');
          group.style.display = visible.length > 0 ? '' : 'none';
        });
      });

      element.addEventListener('click', (event) => {
        const target = event.target.closest('.past-add-item');
        if (!target) return;
        const id = parseInt(target.dataset.exerciseId, 10);
        const name = target.dataset.exerciseName;
        flowState.exercises.push({
          exercise_id: id,
          name,
          target_sets: 3,
          sets: [
            { weight_kg: 0, reps: 0 },
            { weight_kg: 0, reps: 0 },
            { weight_kg: 0, reps: 0 }
          ]
        });
        // Update the parent modal
        const parentModal = document.querySelectorAll('.modal')[0];
        if (parentModal) rerenderExercises(parentModal);
        toast.success(`Added ${name}`);
        close();
      });
    }
  });
}

async function saveWorkout(modal) {
  // Validate: at least one exercise with at least one set that has reps
  const validExercises = flowState.exercises
    .map((ex) => ({
      exercise_id: ex.exercise_id,
      name: ex.name,
      sets: ex.sets.filter((s) => s.reps > 0)
    }))
    .filter((ex) => ex.sets.length > 0);

  if (validExercises.length === 0) {
    toast.warning('Please add at least one exercise with reps');
    return;
  }

  if (!flowState.date) {
    toast.warning('Please pick a date');
    return;
  }

  try {
    await api.post('/workouts/retroactive', {
      date: flowState.date,
      duration_minutes: flowState.duration,
      program_id: flowState.programId || undefined,
      program_day_id: flowState.programDayId || undefined,
      exercises: validExercises,
      notes: flowState.notes
    });
    toast.success('Past workout logged!');
    modal.close('saved');

    // Refresh dashboard if visible
    if (typeof window.loadDashboard === 'function') window.loadDashboard();
  } catch (err) {
    toast.error(`Error saving workout: ${err.message}`);
  }
}

export const pastWorkout = {
  show: showLogPastWorkout
};

export default pastWorkout;
