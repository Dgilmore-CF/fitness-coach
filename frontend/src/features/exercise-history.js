/**
 * Exercise History modal — progression chart, PRs, recent workouts table.
 * Migrated from legacy showExerciseHistory (~200 lines).
 * Uses the new Chart component instead of hand-rolled SVG.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { openModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { lineChart } from '@ui/Chart';
import { formatWeight, formatDate } from '@utils/formatters';
import { toDisplayWeight, getWeightUnit } from '@utils/conversions';

export async function showExerciseHistory(exerciseId, exerciseName) {
  try {
    const data = await api.get(`/analytics/exercise-history/${exerciseId}`);
    const progression = data.progression || [];
    const history = data.history || [];
    const prs = data.personal_records || {};

    const chartData = progression.slice(-20).map((d) => ({
      x: d.workout_date,
      y: toDisplayWeight(d.max_weight || 0)
    }));

    const unit = getWeightUnit();

    openModal({
      title: exerciseName,
      size: 'wide',
      content: String(html`
        <div class="stack stack-md">
          <div class="exercise-history-meta text-muted">
            <i class="fas fa-bullseye"></i> ${data.exercise?.muscle_group || 'N/A'} ·
            <i class="fas fa-dumbbell"></i> ${data.exercise?.equipment || 'N/A'}
          </div>

          <div>
            <div class="section-label">
              <i class="fas fa-trophy text-warning"></i> Personal Records
            </div>
            <div class="grid grid-cols-3">
              <div class="stat-card">
                <div class="stat-label">Max Weight</div>
                <div class="stat-value text-primary">${formatWeight(prs.max_weight)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Est. 1RM</div>
                <div class="stat-value text-success">${formatWeight(prs.max_1rm)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Max Reps</div>
                <div class="stat-value text-warning">${prs.max_reps || 0}</div>
              </div>
            </div>
          </div>

          ${chartData.length > 1
            ? html`
                <div>
                  <div class="section-label">
                    <i class="fas fa-chart-line"></i> Weight Progression (${unit})
                  </div>
                  <div class="card card-sunken">
                    ${raw(lineChart({
                      data: chartData,
                      height: 200,
                      formatX: (d) => formatDate(d, { month: 'short', day: 'numeric' }),
                      formatY: (v) => `${v.toFixed(1)} ${unit}`
                    }))}
                  </div>
                </div>
              `
            : ''}

          <div>
            <div class="section-label">
              <i class="fas fa-history"></i> Workout History
            </div>
            ${history.length === 0
              ? html`<div class="empty-state"><div class="empty-state-description">No previous sessions.</div></div>`
              : html`
                  <div class="stack stack-sm">
                    ${history.slice(0, 10).map((workout) => html`
                      <div class="exercise-history-item">
                        <div class="exercise-history-item-header">
                          <i class="fas fa-calendar"></i> ${formatDate(workout.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <table class="exercise-history-table">
                          <thead>
                            <tr>
                              <th>Set</th>
                              <th>Weight</th>
                              <th>Reps</th>
                              <th>Est. 1RM</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${(workout.sets || []).map((set) => html`
                              <tr>
                                <td>${set.set_number}</td>
                                <td>${formatWeight(set.weight_kg)}</td>
                                <td>${set.reps}</td>
                                <td class="text-primary">${formatWeight(set.one_rep_max_kg)}</td>
                              </tr>
                            `)}
                          </tbody>
                        </table>
                      </div>
                    `)}
                  </div>
                `}
          </div>
        </div>
      `),
      actions: [
        { label: 'Close', primary: true, variant: 'btn-primary' }
      ]
    });
  } catch (err) {
    toast.error(`Error loading history: ${err.message}`);
  }
}
