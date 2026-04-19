/**
 * Workout tab — active program overview with day cards, muscle targeting,
 * and start-workout entry points.
 *
 * Migrated from legacy loadWorkout + renderWorkoutTab + renderWorkoutOverview +
 * renderWorkoutDayDetails. The 330-line hand-coded muscle map SVG has been
 * replaced with a cleaner badge-based display of targeted muscle groups.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { delegate } from '@core/delegate';
import { toast } from '@ui/Toast';
import { confirmDialog } from '@ui/Modal';
import { formatDate, formatDuration } from '@utils/formatters';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Workout tab local state (sub-tab + selected day)
let localState = {
  subTab: 'overview',
  selectedDay: null
};

function estimateDuration(day) {
  const exerciseCount = (day?.exercises || []).length || 0;
  const cardioMinutes = (day?.cardio_sessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  // Rough: 5 min per exercise + cardio + 5 min warmup
  return Math.max(15, exerciseCount * 5 + cardioMinutes + 5);
}

function renderHero(program) {
  return html`
    <div class="workout-hero">
      <div class="workout-hero-backdrop">
        <i class="fas fa-dumbbell"></i>
      </div>
      <div class="workout-hero-content">
        <div class="cluster cluster-between" style="gap: var(--space-5);">
          <div>
            <div class="workout-hero-label">Active Training Program</div>
            <h1 class="workout-hero-title">${program.name}</h1>
            <div class="cluster">
              <span class="workout-hero-chip">
                <i class="fas fa-calendar"></i> ${(program.days || []).length} Days
              </span>
              <span class="workout-hero-chip">
                <i class="fas fa-bullseye"></i> ${program.goal || 'Fitness'}
              </span>
              <span class="workout-hero-chip">
                <i class="fas fa-signal"></i> ${program.days_per_week || 0}×/week
              </span>
            </div>
          </div>
          <button class="btn btn-lg workout-hero-start" data-action="start-workout">
            <i class="fas fa-play"></i> Start Workout
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSubTabs(program) {
  return html`
    <div class="workout-subtabs">
      <button class="workout-subtab ${localState.subTab === 'overview' ? 'is-active' : ''}" data-action="sub-tab" data-tab="overview">
        <i class="fas fa-th-large"></i> Overview
      </button>
      <button class="workout-subtab ${localState.subTab === 'details' ? 'is-active' : ''}" data-action="sub-tab" data-tab="details">
        <i class="fas fa-list"></i> Day Details
      </button>
    </div>
  `;
}

function renderDayCard(day, idx, program) {
  const isSelected = localState.selectedDay === idx;
  const dayOfWeek = DAYS_OF_WEEK[(new Date().getDay() + idx) % 7];
  const exerciseCount = (day.exercises || []).length;
  const isCardio = !!day.is_cardio_day;

  return html`
    <div class="workout-day-card ${isSelected ? 'is-selected' : ''}" data-action="select-day" data-day-index="${idx}">
      <div class="workout-day-num ${isCardio ? 'is-cardio' : ''}">${day.day_number || idx + 1}</div>
      <div class="workout-day-info">
        <strong>${day.name || `Day ${day.day_number || idx + 1}`}</strong>
        <div class="workout-day-meta">
          <span><i class="fas fa-calendar"></i> Suggested: ${dayOfWeek}</span>
        </div>
        <div class="cluster" style="gap: var(--space-3); margin-top: var(--space-2);">
          ${isCardio
            ? html`
                <span class="badge badge-danger">
                  <i class="fas fa-heartbeat"></i> Cardio
                </span>
                <span class="text-muted" style="font-size: var(--text-xs);">
                  <i class="fas fa-clock"></i> ~${estimateDuration(day)} min
                </span>
              `
            : html`
                <span class="text-muted" style="font-size: var(--text-xs);">
                  <i class="fas fa-dumbbell"></i> ${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}
                </span>
                <span class="text-muted" style="font-size: var(--text-xs);">
                  <i class="fas fa-clock"></i> ~${estimateDuration(day)} min
                </span>
              `}
        </div>
        ${day.focus
          ? html`<div class="workout-day-focus"><i class="fas fa-bullseye"></i> ${day.focus}</div>`
          : ''}
      </div>
      <button class="btn btn-primary btn-icon" data-action="start-day" data-day-id="${day.id}" data-program-id="${program.id}">
        <i class="fas fa-play"></i>
      </button>
    </div>
  `;
}

function renderMuscleTargeting(program, selectedDayIndex) {
  const days = program.days || [];
  const selectedDay = selectedDayIndex != null ? days[selectedDayIndex] : null;

  // Tally muscle groups across program or selected day
  const muscles = {};
  const sources = selectedDay ? [selectedDay] : days;
  for (const day of sources) {
    for (const ex of (day.exercises || [])) {
      if (!ex.muscle_group) continue;
      muscles[ex.muscle_group] = (muscles[ex.muscle_group] || 0) + 1;
    }
  }

  const entries = Object.entries(muscles).sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return html`
      <div class="empty-state" style="padding: var(--space-4);">
        <div class="empty-state-description">
          ${selectedDayIndex != null ? 'No exercises on this day.' : 'No exercises in this program yet.'}
        </div>
      </div>
    `;
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const label = selectedDayIndex != null ? `Day ${(days[selectedDayIndex].day_number || selectedDayIndex + 1)}` : 'Full program';

  return html`
    <div class="muscle-targeting">
      <div class="text-muted" style="font-size: var(--text-xs); margin-bottom: var(--space-3);">
        ${label} — ${total} exercise${total === 1 ? '' : 's'} across ${entries.length} muscle group${entries.length === 1 ? '' : 's'}
      </div>
      <div class="stack stack-sm">
        ${entries.map(([muscle, count]) => {
          const pct = Math.round((count / total) * 100);
          return html`
            <div class="muscle-row">
              <div class="muscle-row-header">
                <strong>${muscle}</strong>
                <span class="text-muted" style="font-size: var(--text-xs);">${count} exercise${count === 1 ? '' : 's'}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${pct}%; background: var(--color-primary);"></div>
              </div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

function renderOverview(program) {
  return html`
    <div class="workout-overview-grid">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            <i class="fas fa-calendar-week"></i> Training Schedule
          </h3>
        </div>
        <div class="stack stack-sm">
          ${program.days && program.days.length > 0
            ? program.days.map((day, idx) => renderDayCard(day, idx, program))
            : html`<div class="empty-state"><div class="empty-state-description">No days in this program.</div></div>`}
        </div>
      </div>

      <div class="stack stack-md">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <i class="fas fa-user-alt"></i> Targeted Muscles
            </h3>
          </div>
          ${renderMuscleTargeting(program, localState.selectedDay)}
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <i class="fas fa-info-circle"></i> Program Info
            </h3>
          </div>
          <p class="text-muted">${program.description || 'No description available.'}</p>
          ${program.custom_instructions
            ? html`
                <div class="custom-instructions-box" style="margin-top: var(--space-3);">
                  <div class="custom-instructions-label">
                    <i class="fas fa-magic"></i> Custom Instructions
                  </div>
                  <div>${program.custom_instructions}</div>
                </div>
              `
            : ''}
        </div>
      </div>
    </div>
  `;
}

function renderDetailedExercise(ex) {
  return html`
    <div class="workout-detail-exercise">
      <div>
        <strong>${ex.name}</strong>
        <div class="text-muted" style="font-size: var(--text-xs);">
          ${ex.muscle_group} · ${ex.equipment || '—'}
        </div>
      </div>
      <div class="text-muted" style="font-size: var(--text-sm); white-space: nowrap;">
        ${ex.target_sets} × ${ex.target_reps} · ${ex.rest_seconds}s rest
      </div>
    </div>
  `;
}

function renderDetails(program) {
  if (!program.days?.length) {
    return html`
      <div class="empty-state">
        <div class="empty-state-description">No days in this program.</div>
      </div>
    `;
  }

  return html`
    <div class="stack stack-md">
      ${program.days.map((day, idx) => html`
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              Day ${day.day_number || idx + 1}: ${day.name}
              ${day.is_cardio_day ? html`<span class="badge badge-danger"><i class="fas fa-heartbeat"></i> Cardio</span>` : ''}
            </h3>
            <button class="btn btn-primary btn-sm" data-action="start-day" data-day-id="${day.id}" data-program-id="${program.id}">
              <i class="fas fa-play"></i> Start
            </button>
          </div>
          ${day.focus ? html`<p class="text-muted">${day.focus}</p>` : ''}
          ${day.is_cardio_day
            ? html`
                <div class="stack stack-sm">
                  ${(day.cardio_sessions || []).map((s) => html`
                    <div class="workout-detail-exercise">
                      <strong>${s.name}</strong>
                      <span>${s.duration_minutes} min · Zone ${s.heart_rate_zone}</span>
                    </div>
                  `)}
                </div>
              `
            : html`
                <div class="stack stack-sm">
                  ${(day.exercises || []).map(renderDetailedExercise)}
                </div>
              `}
        </div>
      `)}
    </div>
  `;
}

function renderNoProgram() {
  return html`
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">
          <i class="fas fa-dumbbell"></i> No Active Program
        </h2>
      </div>
      <p class="text-muted">Create or activate a program to start training.</p>
      <div class="cluster" style="margin-top: var(--space-3);">
        <button class="btn btn-primary" data-action="generate-program">
          <i class="fas fa-magic"></i> Generate New Program
        </button>
        <button class="btn btn-secondary" data-action="go-programs">
          <i class="fas fa-list"></i> View Programs
        </button>
      </div>
    </div>
  `;
}

function attachHandlers(container, program) {
  delegate(container, 'click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    event.stopPropagation();

    switch (action) {
      case 'start-workout':
        if (typeof window.startWorkout === 'function') await window.startWorkout();
        break;
      case 'start-day': {
        const programId = parseInt(target.dataset.programId, 10);
        const dayId = parseInt(target.dataset.dayId, 10);
        if (typeof window.startWorkoutDay === 'function') {
          await window.startWorkoutDay(programId, dayId);
        }
        break;
      }
      case 'sub-tab':
        localState.subTab = target.dataset.tab;
        renderTab(program);
        break;
      case 'select-day':
        localState.selectedDay = parseInt(target.dataset.dayIndex, 10);
        renderTab(program);
        break;
      case 'generate-program':
        if (typeof window.showGenerateProgram === 'function') window.showGenerateProgram();
        break;
      case 'go-programs':
        if (typeof window.switchTab === 'function') window.switchTab('program');
        break;
    }
  });
}

function renderTab(program) {
  const container = document.getElementById('workout');
  if (!container) return;

  container.innerHTML = String(html`
    <div class="stack stack-lg">
      ${renderHero(program)}
      ${renderSubTabs(program)}
      <div id="workout-subtab-content">
        ${localState.subTab === 'overview' ? renderOverview(program) : renderDetails(program)}
      </div>
    </div>
  `);

  attachHandlers(container, program);
}

export async function loadWorkout() {
  const container = document.getElementById('workout');
  if (!container) return;

  // If there's an active workout, resume it via the modal
  const legacyCurrent = store.get('currentWorkout');
  if (legacyCurrent && !legacyCurrent.completed) {
    if (window.activeWorkout?.resume) {
      window.activeWorkout.resume(legacyCurrent);
      return;
    }
  }

  container.innerHTML = String(html`
    <div class="stack stack-lg">
      <div class="card"><div class="skeleton skeleton-card"></div></div>
    </div>
  `);

  try {
    // Check server for active workout
    const workoutsResponse = await api.get('/workouts?limit=1');
    const active = (workoutsResponse.workouts || []).find((w) => !w.completed);
    if (active) {
      store.set('currentWorkout', active);
      if (window.activeWorkout?.resume) {
        window.activeWorkout.resume(active);
      }
      return;
    }

    const programs = await api.get('/programs');
    const activeProgram = (programs.programs || []).find((p) => p.active);

    if (!activeProgram) {
      container.innerHTML = String(renderNoProgram());
      attachHandlers(container, null);
      return;
    }

    const detail = await api.get(`/programs/${activeProgram.id}`);
    renderTab(detail.program);
  } catch (err) {
    console.error('Error loading workout tab:', err);
    container.innerHTML = String(html`
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Couldn't load workout tab</div>
          <div class="empty-state-description">${err.message}</div>
        </div>
      </div>
    `);
  }
}
