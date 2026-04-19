/**
 * Workout Calendar — month grid with click-through to view workouts or log past sessions.
 * Migrated from loadWorkoutHistory, renderWorkoutCalendar, changeCalendarMonth, showCalendarWorkouts.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { confirmDialog } from '@ui/Modal';
import { toast } from '@ui/Toast';
import {
  formatWeight,
  formatDuration,
  formatDate,
  getExertionEmoji
} from '@utils/formatters';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let calendarState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  workoutsByDate: {},
  hostEl: null
};

function renderGrid() {
  const { year, month, workoutsByDate } = calendarState;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];

  const cells = [];

  // Day headers
  for (const d of DAY_NAMES) {
    cells.push(html`<div class="cal-weekday">${d}</div>`);
  }

  // Padding before month
  for (let i = 0; i < startPadding; i++) {
    cells.push(html`<div class="cal-cell cal-cell-empty"></div>`);
  }

  for (let day = 1; day <= totalDays; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const workouts = workoutsByDate[key] || [];
    const hasWorkout = workouts.length > 0;
    const isToday = key === todayKey;
    const isFuture = new Date(key) > today;

    const action = hasWorkout
      ? `view-day`
      : (!isFuture ? `log-past` : null);

    cells.push(html`
      <div class="cal-cell ${hasWorkout ? 'has-workout' : ''} ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}"
           ${action ? `data-action="${action}" data-date="${key}"` : ''}
           title="${hasWorkout ? 'View workouts' : (!isFuture ? 'Click to log a workout' : '')}">
        <div class="cal-day-num">${day}</div>
        ${hasWorkout
          ? html`<div class="cal-workout-marker">${workouts.length > 1 ? workouts.length : raw('<i class="fas fa-dumbbell"></i>')}</div>`
          : (!isFuture ? html`<div class="cal-add-hint"><i class="fas fa-plus"></i></div>` : '')}
      </div>
    `);
  }

  return html`
    <div class="cal-grid">
      ${cells}
    </div>
    <div class="cal-legend">
      <div><span class="cal-legend-dot workout"></span> Workout completed</div>
      <div><span class="cal-legend-dot today"></span> Today</div>
    </div>
  `;
}

function renderDayDetail(dateKey) {
  const workouts = calendarState.workoutsByDate[dateKey] || [];
  if (workouts.length === 0) return '';

  const dateLabel = formatDate(dateKey, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return html`
    <div class="cal-day-detail">
      <div class="cal-day-detail-header">
        <h3 class="section-title">
          <i class="fas fa-calendar-day"></i> ${dateLabel}
        </h3>
      </div>
      <div class="stack stack-sm">
        ${workouts.map((w) => html`
          <div class="cal-workout-item ${w.completed ? 'is-complete' : 'is-progress'}">
            <div style="flex: 1; min-width: 0;">
              <strong>${w.day_name || 'Custom Workout'}</strong>
              <div class="cluster" style="gap: var(--space-3); margin-top: var(--space-1); font-size: var(--text-xs); color: var(--color-text-muted);">
                <span><i class="fas fa-clock"></i> ${formatDuration(w.total_duration_seconds)}</span>
                <span><i class="fas fa-weight-hanging"></i> ${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}</span>
                <span><i class="fas fa-layer-group"></i> ${w.total_sets || 0} sets</span>
                ${w.perceived_exertion
                  ? html`<span><i class="fas fa-fire"></i> ${w.perceived_exertion}/10 ${getExertionEmoji(w.perceived_exertion)}</span>`
                  : ''}
              </div>
            </div>
            <div class="cluster">
              <button class="btn btn-primary btn-sm" data-action="view-workout" data-workout-id="${w.id}">
                <i class="fas fa-eye"></i> View
              </button>
              <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete-workout" data-workout-id="${w.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}

function renderCalendar() {
  const { year, month } = calendarState;
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return html`
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">
          <i class="fas fa-calendar-alt"></i> Workout Calendar
        </h2>
        <div class="cluster">
          <button class="btn btn-outline btn-icon btn-sm" data-action="cal-prev">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="cal-month-label">${monthLabel}</span>
          <button class="btn btn-outline btn-icon btn-sm" data-action="cal-next">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
      <div id="cal-calendar-grid">${renderGrid()}</div>
      <div id="cal-day-detail"></div>
    </div>
  `;
}

function attachHandlers(container) {
  container.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    event.stopPropagation();

    switch (action) {
      case 'cal-prev':
        shiftMonth(-1);
        break;
      case 'cal-next':
        shiftMonth(1);
        break;
      case 'view-day':
        showDayDetail(target.getAttribute('data-date'));
        break;
      case 'log-past':
        if (typeof window.showLogPastWorkout === 'function') {
          window.showLogPastWorkout(target.getAttribute('data-date'));
        }
        break;
      case 'view-workout':
        if (typeof window.viewWorkout === 'function') {
          window.viewWorkout(parseInt(target.getAttribute('data-workout-id'), 10));
        }
        break;
      case 'delete-workout':
        await deleteWorkout(parseInt(target.getAttribute('data-workout-id'), 10));
        break;
    }
  });
}

function shiftMonth(delta) {
  calendarState.month += delta;
  if (calendarState.month > 11) {
    calendarState.month = 0;
    calendarState.year++;
  } else if (calendarState.month < 0) {
    calendarState.month = 11;
    calendarState.year--;
  }
  rerender();
}

function rerender() {
  if (!calendarState.hostEl) return;
  calendarState.hostEl.innerHTML = String(renderCalendar());
  attachHandlers(calendarState.hostEl);
}

function showDayDetail(dateKey) {
  const detailEl = document.getElementById('cal-day-detail');
  if (detailEl) detailEl.innerHTML = String(renderDayDetail(dateKey));
}

async function deleteWorkout(workoutId) {
  const ok = await confirmDialog('Delete this workout permanently?', {
    title: 'Delete workout?',
    confirmLabel: 'Delete',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;
  try {
    await api.delete(`/workouts/${workoutId}`);
    toast.success('Workout deleted');
    await loadWorkoutCalendar(calendarState.hostEl);
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

/**
 * Render the workout calendar into a host element.
 * @param {HTMLElement} hostEl - the container to inject into (usually #workoutCalendarContainer)
 */
export async function loadWorkoutCalendar(hostEl) {
  if (!hostEl) return;
  calendarState.hostEl = hostEl;

  try {
    const data = await api.get('/workouts?limit=100');
    const workouts = data.workouts || [];

    const byDate = {};
    for (const w of workouts) {
      const key = new Date(w.start_time).toISOString().split('T')[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(w);
    }
    calendarState.workoutsByDate = byDate;

    rerender();
  } catch (err) {
    console.error('Error loading workout calendar:', err);
    hostEl.innerHTML = String(html`
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-description">Couldn't load calendar: ${err.message}</div>
        </div>
      </div>
    `);
  }
}

// Legacy compat: function originally named loadWorkoutHistory(container)
export const loadWorkoutHistory = loadWorkoutCalendar;
