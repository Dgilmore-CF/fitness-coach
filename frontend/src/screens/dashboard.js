/**
 * Dashboard screen — 30-day stats overview, quick actions, recent workouts.
 *
 * Migrated from legacy loadDashboard() (144 lines). Preserves the
 * expandable workout cards; delegates the expand/collapse and action
 * buttons to legacy globals that haven't been migrated yet.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { delegate } from '@core/delegate';
import { formatWeight, formatDuration, formatDate, getExertionEmoji } from '@utils/formatters';

function renderStatsOverview(overview) {
  return html`
    <div class="grid grid-cols-auto">
      <div class="stat-card">
        <div class="stat-label">Workouts</div>
        <div class="stat-value">${overview.total_workouts || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Weight Lifted</div>
        <div class="stat-value">${formatWeight(overview.total_volume_kg || 0)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Time</div>
        <div class="stat-value">${formatDuration(overview.total_time_seconds || 0)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Workout</div>
        <div class="stat-value">${formatDuration(overview.average_workout_time || 0)}</div>
      </div>
    </div>
  `;
}

function renderQuickActions() {
  return html`
    <div class="cluster">
      <button class="btn btn-primary" data-legacy-call="showGenerateProgram">
        <i class="fas fa-magic"></i> Generate New Program
      </button>
      <button class="btn btn-secondary" data-legacy-call="startWorkout">
        <i class="fas fa-play"></i> Start Workout
      </button>
      <button class="btn btn-outline" data-tab="analytics">
        <i class="fas fa-chart-bar"></i> View Analytics
      </button>
    </div>
  `;
}

function renderWorkoutCard(workout) {
  const isComplete = !!workout.completed;
  const statusLabel = isComplete ? '✓ Complete' : 'In Progress';
  const statusClass = isComplete ? 'badge-success' : 'badge-warning';

  const dateLabel = formatDate(workout.start_time, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const volumeLabel = workout.total_weight_kg ? formatWeight(workout.total_weight_kg) : 'N/A';

  return html`
    <div class="workout-card" id="workout-card-${workout.id}">
      <div class="workout-card-header" data-action="toggle-details" data-workout-id="${workout.id}">
        <div class="workout-card-header-main">
          <div class="workout-card-status">
            <div class="workout-card-status-icon ${isComplete ? 'complete' : 'in-progress'}">
              <i class="fas fa-${isComplete ? 'check' : 'clock'}"></i>
            </div>
            <div>
              <strong>${workout.day_name || 'Custom Workout'}</strong>
              <div class="text-muted" style="font-size: var(--text-xs);">${dateLabel}</div>
            </div>
          </div>
          <div class="workout-card-metrics">
            <span class="text-muted">
              <i class="fas fa-clock"></i> ${formatDuration(workout.total_duration_seconds)}
            </span>
            <span class="text-muted">
              <i class="fas fa-weight-hanging"></i> ${volumeLabel}
            </span>
          </div>
        </div>
        <div class="workout-card-chevron">
          <span class="badge ${statusClass}">${statusLabel}</span>
          <i class="fas fa-chevron-down" id="workout-chevron-${workout.id}"></i>
        </div>
      </div>

      <div class="workout-card-details" id="workout-details-${workout.id}" hidden>
        <div class="grid grid-cols-auto" style="gap: var(--space-3);">
          ${renderMiniStat('Training Time', formatDuration(workout.total_duration_seconds))}
          ${renderMiniStat('Exercises', workout.exercise_count || 0)}
          ${renderMiniStat('Total Sets', workout.total_sets || 0)}
          ${renderMiniStat('Total Volume', volumeLabel)}
          ${renderMiniStat(
            'Effort Level',
            workout.perceived_exertion
              ? `${workout.perceived_exertion}/10 ${getExertionEmoji(workout.perceived_exertion)}`
              : 'Not rated'
          )}
        </div>

        ${workout.notes
          ? html`
              <div class="workout-notes">
                <div class="stat-label">Session Notes</div>
                <p>${workout.notes}</p>
              </div>
            `
          : ''}

        <div class="cluster" style="margin-top: var(--space-3);">
          ${isComplete
            ? html`
                <button class="btn btn-outline flex-1" data-action="view-workout" data-workout-id="${workout.id}">
                  <i class="fas fa-eye"></i> View Details
                </button>
              `
            : html`
                <button class="btn btn-primary flex-1" data-action="view-workout" data-workout-id="${workout.id}">
                  <i class="fas fa-play"></i> Continue Workout
                </button>
              `}
          <button class="btn btn-danger" data-action="delete-workout" data-workout-id="${workout.id}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderMiniStat(label, value) {
  return html`
    <div class="mini-stat">
      <div class="stat-label">${label}</div>
      <div class="mini-stat-value">${value}</div>
    </div>
  `;
}

function renderRecentWorkouts(workouts) {
  if (!workouts || workouts.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-icon">🏋️</div>
        <div class="empty-state-title">No workouts yet</div>
        <div class="empty-state-description">Start your first workout or log a past session to see it here.</div>
      </div>
    `;
  }
  return html`
    <div class="stack stack-sm">
      ${workouts.map((w) => renderWorkoutCard(w))}
    </div>
  `;
}

function renderLoadingState() {
  return html`
    <div class="stack stack-lg">
      <div class="card">
        <div class="grid grid-cols-auto">
          ${[1, 2, 3, 4].map(() => html`<div class="skeleton skeleton-card"></div>`)}
        </div>
      </div>
    </div>
  `;
}

function renderErrorState(message) {
  return html`
    <div class="card">
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Couldn't load dashboard</div>
        <div class="empty-state-description">${message}</div>
      </div>
    </div>
  `;
}

/**
 * Attach delegated event handling for the dashboard.
 */
function attachDashboardHandlers(container) {
  delegate(container, 'click', (event) => {
    // Quick action buttons that call legacy globals directly
    const legacyBtn = event.target.closest('[data-legacy-call]');
    if (legacyBtn) {
      const fnName = legacyBtn.getAttribute('data-legacy-call');
      const fn = window[fnName];
      if (typeof fn === 'function') fn();
      return;
    }

    // Switch to another tab
    const tabBtn = event.target.closest('[data-tab]');
    if (tabBtn) {
      const tab = tabBtn.getAttribute('data-tab');
      if (typeof window.switchTab === 'function') window.switchTab(tab);
      return;
    }

    // Expand/collapse workout details
    const toggleTarget = event.target.closest('[data-action="toggle-details"]');
    if (toggleTarget) {
      const workoutId = toggleTarget.getAttribute('data-workout-id');
      const details = document.getElementById(`workout-details-${workoutId}`);
      const chevron = document.getElementById(`workout-chevron-${workoutId}`);
      if (details) {
        const isHidden = details.hasAttribute('hidden');
        if (isHidden) {
          details.removeAttribute('hidden');
          chevron?.style.setProperty('transform', 'rotate(180deg)');
        } else {
          details.setAttribute('hidden', '');
          chevron?.style.removeProperty('transform');
        }
      }
      return;
    }

    // View workout (delegates to legacy viewWorkout for now)
    const viewBtn = event.target.closest('[data-action="view-workout"]');
    if (viewBtn) {
      event.stopPropagation();
      const id = parseInt(viewBtn.getAttribute('data-workout-id'), 10);
      if (typeof window.viewWorkout === 'function') window.viewWorkout(id);
      return;
    }

    // Delete workout
    const deleteBtn = event.target.closest('[data-action="delete-workout"]');
    if (deleteBtn) {
      event.stopPropagation();
      const id = parseInt(deleteBtn.getAttribute('data-workout-id'), 10);
      if (typeof window.deleteDashboardWorkout === 'function') window.deleteDashboardWorkout(id);
      return;
    }
  });
}

/**
 * Main entry — fetches data and renders the dashboard.
 */
export async function loadDashboard() {
  const container = document.getElementById('dashboard');
  if (!container) return;

  container.innerHTML = String(renderLoadingState());

  try {
    const [progress, , recent] = await Promise.all([
      api.get('/analytics/progress?days=30'),
      api.get('/programs'),
      api.get('/workouts?limit=5')
    ]);

    const overview = progress.overview || {};
    const workouts = recent.workouts || [];

    container.innerHTML = String(html`
      <div class="stack stack-lg">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-chart-line"></i> 30-Day Progress</h2>
          </div>
          ${renderStatsOverview(overview)}
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-dumbbell"></i> Quick Actions</h2>
          </div>
          ${renderQuickActions()}
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-history"></i> Recent Workouts</h2>
            <button class="btn btn-outline btn-sm" data-legacy-call="showLogPastWorkout">
              <i class="fas fa-calendar-plus"></i> Log Past Workout
            </button>
          </div>
          ${renderRecentWorkouts(workouts)}
        </div>
      </div>
    `);

    attachDashboardHandlers(container);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    container.innerHTML = String(renderErrorState(error.message));
  }
}
