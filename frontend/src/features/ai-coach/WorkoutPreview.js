/**
 * Pre-workout AI briefing modal.
 *
 * Opens BEFORE the user starts a workout to show:
 *   - Readiness score (0-100 circle)
 *   - Recovery rationale (why this score)
 *   - Per-exercise AI-suggested weights
 *   - Target muscles focus
 *   - Any warnings (overtraining, undertrained groups)
 *
 * Public API:
 *   await showWorkoutPreview(programDayId)
 *     → resolves when user clicks "Start Workout" or dismisses
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { openModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { progressRing } from '@ui/ProgressRing';
import { toDisplayWeight, getWeightUnit } from '@utils/conversions';
import { formatWeight } from '@utils/formatters';

const READINESS_MESSAGES = {
  primed: { label: 'Primed to Go', emoji: '🔥', color: 'var(--color-secondary)' },
  ready: { label: 'Ready', emoji: '✅', color: 'var(--color-primary)' },
  fatigued: { label: 'Fatigued', emoji: '😮‍💨', color: 'var(--color-warning)' },
  needs_rest: { label: 'Needs Rest', emoji: '😴', color: 'var(--color-danger)' }
};

function renderReadinessCard(readiness) {
  const meta = READINESS_MESSAGES[readiness.status] || READINESS_MESSAGES.ready;
  return html`
    <div class="preview-readiness">
      <div class="preview-readiness-ring">
        ${raw(progressRing({
          value: readiness.score,
          max: 100,
          size: 140,
          unit: '',
          label: 'Readiness',
          color: meta.color
        }))}
      </div>
      <div class="preview-readiness-body">
        <div class="preview-readiness-status">
          <span class="preview-readiness-emoji">${meta.emoji}</span>
          ${meta.label}
        </div>
        <ul class="preview-readiness-reasons">
          ${readiness.rationale.map((r) => html`<li>${r}</li>`)}
        </ul>
      </div>
    </div>
  `;
}

function renderExercise(ex) {
  const unit = getWeightUnit();
  const weight = ex.suggested_weight_kg != null
    ? `${Math.round(toDisplayWeight(ex.suggested_weight_kg) * 10) / 10} ${unit}`
    : 'No data yet';

  const confidenceClass =
    ex.confidence === 'high' ? 'confidence-high' :
    ex.confidence === 'medium' ? 'confidence-medium' : 'confidence-low';

  return html`
    <div class="preview-exercise">
      <div class="preview-exercise-main">
        <strong>${ex.exercise_name}</strong>
        <div class="text-muted" style="font-size: var(--text-xs);">
          ${ex.muscle_group} · ${ex.target_sets} × ${ex.target_reps}
        </div>
      </div>
      <div class="preview-exercise-suggestion">
        <div class="preview-suggested-weight">${weight}</div>
        <div class="preview-confidence ${confidenceClass}" title="${ex.rationale}">
          <i class="fas fa-magic"></i> ${ex.confidence}
        </div>
      </div>
    </div>
  `;
}

function renderExerciseList(exercises) {
  if (!exercises || exercises.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-description">No exercises on this day.</div>
      </div>
    `;
  }

  return html`
    <div class="stack stack-sm">
      ${exercises.map(renderExercise)}
    </div>
  `;
}

/**
 * Open the pre-workout briefing modal.
 * @param {number} programDayId
 * @param {object} [options]
 * @param {() => void} [options.onStart] - called when user confirms "Start Workout"
 * @returns {Promise<'start' | 'cancel'>}
 */
export async function showWorkoutPreview(programDayId, options = {}) {
  const loadingToast = toast.info('Preparing your AI briefing…', { duration: 2000 });

  try {
    const response = await api.get(`/ai/realtime/preview/${programDayId}`);
    const data = response.data;

    return await new Promise((resolve) => {
      openModal({
        title: 'Today\'s Workout Preview',
        size: 'wide',
        content: String(html`
          <div class="stack stack-lg">
            <div class="preview-hero">
              <div class="preview-hero-label">
                <i class="fas fa-magic"></i> AI-optimized for you
              </div>
              <p class="text-muted">
                Based on your last 14 days of training, here's what your AI coach recommends for today.
              </p>
            </div>

            ${renderReadinessCard(data.readiness)}

            ${data.target_muscles && data.target_muscles.length > 0
              ? html`
                  <div>
                    <div class="section-label">Target muscles</div>
                    <div class="cluster">
                      ${data.target_muscles.map((m) => html`<span class="badge badge-primary">${m}</span>`)}
                    </div>
                  </div>
                `
              : ''}

            <div>
              <div class="section-label">
                <i class="fas fa-dumbbell"></i> Exercises with suggested weights
              </div>
              ${renderExerciseList(data.exercises)}
            </div>
          </div>
        `),
        actions: [
          {
            label: 'Skip Briefing',
            variant: 'btn-outline',
            onClick: (modal) => {
              modal.close('cancel');
              resolve('cancel');
            }
          },
          {
            label: 'Start Workout',
            primary: true,
            variant: 'btn-primary',
            onClick: (modal) => {
              modal.close('start');
              options.onStart?.();
              resolve('start');
            }
          }
        ]
      });
    });
  } catch (err) {
    console.error('Workout preview error:', err);
    toast.error(`Couldn't load briefing: ${err.message}`);
    return 'cancel';
  }
}
