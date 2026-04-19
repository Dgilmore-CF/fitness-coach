/**
 * View completed workout modal.
 * Migrated from legacy viewWorkout(workoutId).
 * For non-completed workouts, delegates to activeWorkout.resume().
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { openModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import {
  formatWeight,
  formatDuration,
  formatDate,
  getExertionEmoji
} from '@utils/formatters';
import { workoutVolume, exerciseVolume, exerciseReps } from '@utils/volume';

function renderExerciseDetails(workout) {
  if (!workout.exercises?.length) {
    return html`<p class="text-muted">No exercises recorded.</p>`;
  }

  return html`
    <div class="stack stack-md">
      ${workout.exercises.map((ex, idx) => {
        const volume = exerciseVolume(ex);
        const sets = ex.sets?.length || 0;
        const totalReps = exerciseReps(ex);
        return html`
          <div class="view-workout-exercise">
            <div class="cluster cluster-between" style="margin-bottom: var(--space-3); flex-wrap: wrap;">
              <div>
                <strong>${idx + 1}. ${ex.name}</strong>
                <div class="text-muted" style="font-size: var(--text-xs); margin-top: 2px;">
                  <span><i class="fas fa-bullseye"></i> ${ex.muscle_group}</span>
                  ${ex.equipment ? html`<span style="margin-left: var(--space-3);"><i class="fas fa-tools"></i> ${ex.equipment}</span>` : ''}
                </div>
              </div>
              <div style="text-align: right;">
                <div class="text-muted" style="font-size: var(--text-xs);">Volume</div>
                <div class="text-primary" style="font-weight: var(--font-bold);">${formatWeight(volume)}</div>
              </div>
            </div>
            ${sets > 0
              ? html`
                  <div style="overflow-x: auto;">
                    <table class="exercise-history-table">
                      <thead>
                        <tr>
                          <th>Set</th>
                          <th>Weight</th>
                          <th>Reps</th>
                          <th>1RM Est.</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${ex.sets.map((set, i) => html`
                          <tr>
                            <td>${i + 1}</td>
                            <td>${formatWeight(set.weight_kg)}</td>
                            <td>${set.reps}</td>
                            <td class="text-primary">${set.one_rep_max_kg ? formatWeight(set.one_rep_max_kg) : '-'}</td>
                          </tr>
                        `)}
                        <tr style="font-weight: var(--font-semibold);">
                          <td>Total</td>
                          <td>—</td>
                          <td>${totalReps}</td>
                          <td>${sets} set${sets === 1 ? '' : 's'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                `
              : html`<p class="text-muted" style="font-style: italic;">No sets recorded.</p>`}
            ${ex.notes
              ? html`
                  <div class="view-workout-note">
                    <strong class="text-primary"><i class="fas fa-comment"></i> Notes:</strong>
                    <p>${ex.notes}</p>
                  </div>
                `
              : ''}
          </div>
        `;
      })}
    </div>
  `;
}

export async function viewWorkout(workoutId) {
  try {
    const data = await api.get(`/workouts/${workoutId}`);
    const workout = data.workout;

    // If not completed, resume in the active workout modal instead
    if (!workout.completed) {
      store.set('currentWorkout', workout);
      if (window.activeWorkout?.resume) {
        window.activeWorkout.resume(workout);
      }
      return;
    }

    const totalVolume = workoutVolume(workout);
    const totalSets = (workout.exercises || []).reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const totalReps = (workout.exercises || []).reduce((sum, ex) => sum + exerciseReps(ex), 0);
    const exerciseCount = (workout.exercises || []).filter((ex) => (ex.sets || []).length > 0).length;

    openModal({
      title: 'Workout Details',
      size: 'wide',
      content: String(html`
        <div class="stack stack-md">
          <div>
            <h3>${workout.program_day_name || 'Workout'}</h3>
            <div class="cluster" style="gap: var(--space-3); margin-top: var(--space-1); font-size: var(--text-sm); color: var(--color-text-muted);">
              <span><i class="fas fa-calendar"></i> ${formatDate(workout.start_time)}</span>
              <span><i class="fas fa-clock"></i> ${formatDuration(workout.total_duration_seconds)}</span>
              <span class="text-success"><i class="fas fa-check-circle"></i> Completed</span>
            </div>
          </div>

          <div class="grid grid-cols-auto">
            <div class="stat-card stat-card-gradient-3">
              <div class="stat-label">Total Volume</div>
              <div class="stat-value">${formatWeight(totalVolume)}</div>
            </div>
            <div class="stat-card stat-card-gradient-4">
              <div class="stat-label">Total Sets</div>
              <div class="stat-value">${totalSets}</div>
            </div>
            <div class="stat-card stat-card-gradient-2">
              <div class="stat-label">Total Reps</div>
              <div class="stat-value">${totalReps}</div>
            </div>
            <div class="stat-card stat-card-gradient-1">
              <div class="stat-label">Exercises</div>
              <div class="stat-value">${exerciseCount}</div>
            </div>
            ${workout.perceived_exertion
              ? html`
                  <div class="stat-card">
                    <div class="stat-label">Effort</div>
                    <div class="stat-value text-danger">
                      ${workout.perceived_exertion}/10
                      <span style="font-size: var(--text-lg);">${getExertionEmoji(workout.perceived_exertion)}</span>
                    </div>
                  </div>
                `
              : ''}
          </div>

          ${workout.notes
            ? html`
                <div class="view-workout-notes-box">
                  <strong class="text-primary">
                    <i class="fas fa-sticky-note"></i> Workout Notes
                  </strong>
                  <p>${workout.notes}</p>
                </div>
              `
            : ''}

          <div>
            <h4 class="section-title">
              <i class="fas fa-dumbbell"></i> Exercises Performed
            </h4>
            ${renderExerciseDetails(workout)}
          </div>
        </div>
      `),
      actions: [
        { label: 'Close', primary: true, variant: 'btn-primary' }
      ]
    });
  } catch (err) {
    toast.error(`Error loading workout: ${err.message}`);
  }
}
