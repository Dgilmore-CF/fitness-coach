/**
 * Quick / custom workout — start an ad-hoc workout by hand-picking exercises,
 * with no program required.
 *
 * Backend already supports an empty workout (POST /workouts with a null
 * program_day_id) plus live exercise-adding; this module supplies the missing
 * frontend entry point: an exercise picker that creates the workout, attaches
 * the chosen exercises, and drops the user into the normal active-workout UI.
 *
 * A finished ad-hoc workout can be promoted to a reusable program day from the
 * summary screen (see active-workout controller `saveAsDay`).
 */

import { html } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { openModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { withLoading } from '@ui/LoadingOverlay';

let _starting = false;

/**
 * Open the exercise picker and, on confirm, start an empty workout seeded with
 * the selected exercises.
 */
export async function startQuickWorkout() {
  let exercises;
  try {
    const data = await api.get('/exercises', { cache: true });
    exercises = data.exercises || data || [];
  } catch (err) {
    toast.error(`Could not load exercises: ${err.message}`);
    return;
  }
  if (!exercises.length) {
    toast.warning('No exercises available');
    return;
  }

  // Group by muscle group for a scannable list.
  const byMuscle = {};
  for (const ex of exercises) {
    const m = ex.muscle_group || 'Other';
    (byMuscle[m] ||= []).push(ex);
  }
  const muscles = Object.keys(byMuscle).sort();

  const content = html`
    <div class="qw-picker">
      <input type="text" id="qw-search" class="input" placeholder="Search exercises…" autocomplete="off" />
      <div class="qw-selected-bar">
        <span id="qw-selected-count">0</span> selected
      </div>
      <div class="qw-list" id="qw-list">
        ${muscles.map((m) => html`
          <div class="qw-group" data-muscle="${m}">
            <h4 class="qw-group-title">${m}</h4>
            ${byMuscle[m].map((ex) => html`
              <label class="qw-item" data-name="${ex.name.toLowerCase()}">
                <input type="checkbox" value="${ex.id}" data-name="${ex.name}" />
                <div class="qw-item-body">
                  <strong>${ex.name}</strong>
                  <span class="text-muted">${ex.equipment || ''}</span>
                </div>
              </label>
            `)}
          </div>
        `)}
      </div>
    </div>
  `;

  openModal({
    title: 'Build a Workout',
    size: 'wide',
    content: String(content),
    actions: [
      { label: 'Cancel', variant: 'btn-outline', onClick: (api) => api.close(false) },
      {
        label: 'Start Workout',
        variant: 'btn-primary',
        primary: true,
        onClick: async (modal) => {
          const checked = Array.from(
            modal.element.querySelectorAll('#qw-list input[type="checkbox"]:checked')
          );
          if (!checked.length) {
            toast.warning('Pick at least one exercise');
            return;
          }
          const ids = checked.map((cb) => parseInt(cb.value, 10));
          modal.close(true);
          await launchQuickWorkout(ids);
        }
      }
    ],
    onOpen: ({ element }) => {
      const search = element.querySelector('#qw-search');
      const countEl = element.querySelector('#qw-selected-count');

      const updateCount = () => {
        const n = element.querySelectorAll('#qw-list input:checked').length;
        if (countEl) countEl.textContent = String(n);
      };

      element.querySelector('#qw-list')?.addEventListener('change', updateCount);

      search?.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        element.querySelectorAll('.qw-item').forEach((item) => {
          const match = !q || item.dataset.name.includes(q);
          item.style.display = match ? '' : 'none';
        });
        element.querySelectorAll('.qw-group').forEach((group) => {
          const anyVisible = group.querySelector('.qw-item:not([style*="display: none"])');
          group.style.display = anyVisible ? '' : 'none';
        });
      });
    }
  });
}

async function launchQuickWorkout(exerciseIds) {
  if (_starting) return;
  _starting = true;
  try {
    const workout = await withLoading('Building your workout…', async () => {
      const created = await api.post('/workouts', { program_id: null, program_day_id: null });
      const id = created.workout.id;
      // Add exercises sequentially to preserve the picked order.
      for (const exId of exerciseIds) {
        await api.post(`/workouts/${id}/exercises`, { exercise_id: exId });
      }
      const full = await api.get(`/workouts/${id}`);
      return full.workout;
    });

    store.set('currentWorkout', workout);
    if (window.activeWorkout?.showWarmup) {
      // No AI preview for ad-hoc workouts (no program day) — the warm-up
      // screen renders the exercise list + generic warm-up without it.
      window.activeWorkout.showWarmup(workout, null);
    }
  } catch (err) {
    toast.error(`Could not start workout: ${err.message}`);
  } finally {
    _starting = false;
  }
}
