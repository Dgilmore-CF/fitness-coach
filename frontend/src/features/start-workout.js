/**
 * Start Workout flows — day selection modal + workout creation + cardio branch.
 * Migrated from startWorkout, startWorkoutFromProgram, startWorkoutDay,
 * and showCardioWorkoutInterface + cancelCardioWorkout + saveCardioWorkout.
 */

import { html, htmlToElement, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { openModal, closeTopModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { withLoading } from '@ui/LoadingOverlay';
import { formatDuration } from '@utils/formatters';

// ============================================================================
// Day selection modal
// ============================================================================

function showDaySelection(program) {
  if (!program.days?.length) {
    toast.warning('No workout days in this program');
    return;
  }

  openModal({
    title: 'Start Workout',
    size: 'default',
    content: String(html`
      <div class="stack stack-sm">
        ${program.days.map((day) => html`
          <button class="day-select-item" data-action="pick-day" data-program-id="${program.id}" data-day-id="${day.id}">
            <strong>Day ${day.day_number}: ${day.name || 'Workout Day'}</strong>
            <div class="text-muted" style="font-size: var(--text-sm); margin-top: 2px;">
              ${day.focus || 'Training'}
            </div>
            <div class="cluster" style="gap: var(--space-3); margin-top: var(--space-1); font-size: var(--text-xs); color: var(--color-text-muted);">
              ${day.is_cardio_day
                ? html`<span class="badge badge-danger"><i class="fas fa-heartbeat"></i> Cardio</span>`
                : html`<span><i class="fas fa-dumbbell"></i> ${(day.exercises || []).length} exercises</span>`}
            </div>
          </button>
        `)}
      </div>
    `),
    actions: [{ label: 'Cancel', variant: 'btn-outline' }],
    onOpen: ({ element }) => {
      element.addEventListener('click', async (event) => {
        const target = event.target.closest('[data-action="pick-day"]');
        if (!target) return;
        closeTopModal();
        const programId = parseInt(target.getAttribute('data-program-id'), 10);
        const dayId = parseInt(target.getAttribute('data-day-id'), 10);
        await startWorkoutDay(programId, dayId);
      });
    }
  });
}

export async function startWorkout() {
  try {
    const programsData = await api.get('/programs');
    const active = (programsData.programs || []).find((p) => p.active);
    if (!active) {
      toast.warning('Please activate a program first');
      if (typeof window.switchTab === 'function') window.switchTab('program');
      return;
    }
    const programData = await api.get(`/programs/${active.id}`);
    showDaySelection(programData.program);
  } catch (err) {
    toast.error(`Error starting workout: ${err.message}`);
  }
}

export async function startWorkoutFromProgram(programId) {
  try {
    const programData = await api.get(`/programs/${programId}`);
    showDaySelection(programData.program);
  } catch (err) {
    toast.error(`Error starting workout: ${err.message}`);
  }
}

export async function startWorkoutDay(programId, programDayId) {
  try {
    const programData = await withLoading('Starting your workout…', async () => {
      return await api.get(`/programs/${programId}`);
    });
    const day = programData.program.days.find((d) => d.id === programDayId);

    if (day?.is_cardio_day) {
      showCardioWorkout(day, programId);
      return;
    }

    // Phase 4: Pre-workout AI briefing
    if (window.aiCoach?.showPreview) {
      try {
        await window.aiCoach.showPreview(programDayId);
      } catch (err) {
        console.warn('AI briefing failed:', err);
      }
    }

    const fullWorkout = await withLoading('Starting your workout…', async () => {
      const created = await api.post('/workouts', {
        program_id: programId,
        program_day_id: programDayId
      });
      return await api.get(`/workouts/${created.workout.id}`);
    });

    store.set('currentWorkout', fullWorkout.workout);

    if (window.activeWorkout?.showWarmup) {
      window.activeWorkout.showWarmup(fullWorkout.workout);
    }
  } catch (err) {
    toast.error(`Error starting workout: ${err.message}`);
  }
}

// ============================================================================
// Cardio workout
// ============================================================================

let cardioTimerInterval = null;
let cardioStartTime = null;
let cardioModalEl = null;

const CARDIO_ACTIVITIES = [
  { value: 'running', label: '🏃 Running' },
  { value: 'cycling', label: '🚴 Cycling' },
  { value: 'rowing', label: '🚣 Rowing' },
  { value: 'elliptical', label: '⭕ Elliptical' },
  { value: 'stairmaster', label: '🪜 Stair Climber' },
  { value: 'swimming', label: '🏊 Swimming' },
  { value: 'walking', label: '🚶 Walking' },
  { value: 'hiit', label: '⚡ HIIT' },
  { value: 'jump_rope', label: '🪢 Jump Rope' },
  { value: 'other', label: '📋 Other' }
];

const CARDIO_INTENSITY = [
  { value: 'low', emoji: '😊', label: 'Low' },
  { value: 'moderate', emoji: '💪', label: 'Moderate' },
  { value: 'high', emoji: '🔥', label: 'High' }
];

function showCardioWorkout(programDay, programId) {
  const sessions = programDay.cardio_sessions || [];
  cardioStartTime = Date.now();

  cardioModalEl = htmlToElement(html`
    <div class="cardio-modal" id="cardio-workout-modal">
      <div class="cardio-container">
        <div class="cardio-header">
          <div class="cardio-header-icon">
            <i class="fas fa-heartbeat"></i>
          </div>
          <h1>${programDay.name}</h1>
          <p>${programDay.focus || ''}</p>
          <div id="cardio-timer" class="cardio-timer">00:00:00</div>
        </div>

        ${sessions.length > 0
          ? html`
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-list-check text-danger"></i> Planned Sessions
                  </h3>
                </div>
                <div class="stack stack-sm">
                  ${sessions.map((s) => html`
                    <div class="cardio-session-item">
                      <div>
                        <strong>${s.name}</strong>
                        <div class="text-muted" style="font-size: var(--text-xs);">
                          ${s.duration_minutes} min · Zone ${s.heart_rate_zone || 'N/A'}
                        </div>
                      </div>
                      <span class="badge ${(s.heart_rate_zone || 0) <= 2 ? 'badge-success' : (s.heart_rate_zone || 0) <= 3 ? 'badge-warning' : 'badge-danger'}">
                        ${s.intensity || 'Moderate'}
                      </span>
                    </div>
                  `)}
                </div>
              </div>
            `
          : ''}

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <i class="fas fa-edit text-primary"></i> Record Your Session
            </h3>
          </div>

          <div class="form-group">
            <label class="form-label">Activity Type</label>
            <select id="cardio-activity-type" class="select">
              ${CARDIO_ACTIVITIES.map((a) => html`<option value="${a.value}">${a.label}</option>`)}
            </select>
          </div>

          <div class="grid grid-cols-2" style="gap: var(--space-3);">
            <div class="form-group">
              <label class="form-label">Duration (min)</label>
              <input type="number" id="cardio-duration" class="input" placeholder="30" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">Distance</label>
              <input type="number" id="cardio-distance" class="input" placeholder="km or mi" step="0.1" min="0" />
            </div>
          </div>

          <div class="grid grid-cols-2" style="gap: var(--space-3);">
            <div class="form-group">
              <label class="form-label">Avg HR (bpm)</label>
              <input type="number" id="cardio-heart-rate" class="input" placeholder="140" min="40" max="220" />
            </div>
            <div class="form-group">
              <label class="form-label">Calories</label>
              <input type="number" id="cardio-calories" class="input" placeholder="300" min="0" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Intensity</label>
            <div class="cardio-intensity-grid">
              ${CARDIO_INTENSITY.map((i) => html`
                <label class="cardio-intensity-option">
                  <input type="radio" name="cardio-intensity" value="${i.value}" ${i.value === 'moderate' ? 'checked' : ''} />
                  <span class="cardio-intensity-emoji">${i.emoji}</span>
                  <span>${i.label}</span>
                </label>
              `)}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes (optional)</label>
            <textarea id="cardio-notes" class="textarea" rows="2" placeholder="How did the session feel?"></textarea>
          </div>
        </div>

        <div class="cluster">
          <button class="btn btn-outline" data-action="cancel-cardio" style="flex: 1;">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button class="btn btn-primary cardio-save-btn" data-action="save-cardio" data-program-id="${programId}" data-day-id="${programDay.id}" style="flex: 2;">
            <i class="fas fa-check"></i> Complete Cardio Session
          </button>
        </div>
      </div>
    </div>
  `);

  lockBodyScroll();
  document.body.appendChild(cardioModalEl);

  // Start the timer
  cardioTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - cardioStartTime) / 1000);
    const timerEl = document.getElementById('cardio-timer');
    if (timerEl) timerEl.textContent = formatDuration(elapsed);
  }, 1000);

  cardioModalEl.addEventListener('click', handleCardioClick);
  cardioModalEl.addEventListener('change', (event) => {
    // Visual feedback for intensity selection
    if (event.target.name === 'cardio-intensity') {
      cardioModalEl.querySelectorAll('.cardio-intensity-option').forEach((opt) => {
        opt.classList.toggle('is-selected', opt.querySelector('input').checked);
      });
    }
  });

  // Initial intensity highlight
  cardioModalEl.querySelectorAll('.cardio-intensity-option').forEach((opt) => {
    if (opt.querySelector('input').checked) opt.classList.add('is-selected');
  });
}

function handleCardioClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  if (action === 'cancel-cardio') cancelCardio();
  else if (action === 'save-cardio') {
    saveCardio(
      parseInt(target.getAttribute('data-program-id'), 10),
      parseInt(target.getAttribute('data-day-id'), 10)
    );
  }
}

function cancelCardio() {
  if (cardioTimerInterval) clearInterval(cardioTimerInterval);
  cardioTimerInterval = null;
  if (cardioModalEl) {
    cardioModalEl.remove();
    cardioModalEl = null;
  }
  unlockBodyScroll();
}

async function saveCardio(programId, programDayId) {
  const modal = cardioModalEl;
  if (!modal) return;

  const activityType = modal.querySelector('#cardio-activity-type').value;
  const duration = modal.querySelector('#cardio-duration').value;
  const distance = modal.querySelector('#cardio-distance').value;
  const heartRate = modal.querySelector('#cardio-heart-rate').value;
  const calories = modal.querySelector('#cardio-calories').value;
  const intensity = modal.querySelector('input[name="cardio-intensity"]:checked')?.value || 'moderate';
  const notes = modal.querySelector('#cardio-notes').value;

  const actualDuration = duration
    ? parseInt(duration, 10)
    : Math.round((Date.now() - cardioStartTime) / 60000);

  if (!actualDuration || actualDuration < 1) {
    toast.warning('Please enter a duration');
    return;
  }

  try {
    await api.post('/workouts/cardio', {
      program_id: programId,
      program_day_id: programDayId,
      activity_type: activityType,
      duration_minutes: actualDuration,
      distance_km: distance ? parseFloat(distance) : null,
      avg_heart_rate: heartRate ? parseInt(heartRate, 10) : null,
      calories_burned: calories ? parseInt(calories, 10) : null,
      intensity,
      notes: notes || null
    });

    cancelCardio();
    toast.success('Cardio session recorded!');
    if (typeof window.switchTab === 'function') window.switchTab('analytics');
  } catch (err) {
    toast.error(`Error saving cardio: ${err.message}`);
  }
}

function lockBodyScroll() {
  document.body.dataset.cardioScrollY = String(window.scrollY);
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = `-${window.scrollY}px`;
}

function unlockBodyScroll() {
  const y = document.body.dataset.cardioScrollY || '0';
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  delete document.body.dataset.cardioScrollY;
  window.scrollTo(0, parseInt(y, 10));
}
