/**
 * Analytics screen — progress comparison, 90-day overview, volume by muscle,
 * body map, top exercises, personal records, export hub.
 *
 * Migrated from legacy loadAnalytics() (237 lines). The complex PDF/CSV
 * export flows (openUnifiedExporter, openReportBuilder, generatePDFReport)
 * remain in legacy for now — they rely on jsPDF/html2canvas CDN libraries
 * and will be migrated in a later pass.
 *
 * The workout calendar (loadWorkoutHistory, renderWorkoutCalendar) is
 * delegated to its existing legacy implementation until we decide whether
 * to replace it with a simpler screen or a standalone component.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { delegate } from '@core/delegate';
import { toast } from '@ui/Toast';
import { confirmDialog } from '@ui/Modal';
import {
  formatWeight,
  formatDuration,
  formatDate,
  formatPercentChange
} from '@utils/formatters';

function renderChangeIndicator(change) {
  if (change === 0 || change == null) {
    return html`<span class="text-muted">—</span>`;
  }
  const isPositive = change > 0;
  const className = isPositive ? 'text-success' : 'text-danger';
  return html`<span class="${className}" style="font-weight: var(--font-semibold);">${formatPercentChange(change)}</span>`;
}

function formatShortDateRange(start, end) {
  const fmt = (d) => formatDate(d, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function renderComparisonBlock(title, icon, data) {
  if (!data) return '';
  const { current, previous, changes } = data;
  return html`
    <div style="margin-bottom: var(--space-5);">
      <h3 class="comparison-title">
        <i class="fas ${icon}"></i> ${title}
      </h3>
      <div class="comparison-date-row">
        <span class="text-primary" style="font-weight: var(--font-medium);">
          ${formatShortDateRange(current.start_date, current.end_date)}
        </span>
        <span class="text-muted">vs</span>
        <span>${formatShortDateRange(previous.start_date, previous.end_date)}</span>
      </div>
      <div class="progress-comparison-grid">
        <div class="progress-comparison-card">
          <div class="progress-comparison-label">Total Volume</div>
          <div class="progress-comparison-values">
            <span class="progress-comparison-current">${formatWeight(current.total_volume)}</span>
            <span class="progress-comparison-previous">vs ${formatWeight(previous.total_volume)}</span>
          </div>
          <div class="progress-comparison-change">${renderChangeIndicator(changes.total_volume)}</div>
        </div>
        <div class="progress-comparison-card">
          <div class="progress-comparison-label">Workout Time</div>
          <div class="progress-comparison-values">
            <span class="progress-comparison-current">${formatDuration(current.total_time)}</span>
            <span class="progress-comparison-previous">vs ${formatDuration(previous.total_time)}</span>
          </div>
          <div class="progress-comparison-change">${renderChangeIndicator(changes.total_time)}</div>
        </div>
        <div class="progress-comparison-card">
          <div class="progress-comparison-label">Workouts</div>
          <div class="progress-comparison-values">
            <span class="progress-comparison-current">${current.workout_count}</span>
            <span class="progress-comparison-previous">vs ${previous.workout_count}</span>
          </div>
          <div class="progress-comparison-change">${renderChangeIndicator(changes.workout_count)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderOverviewStats(overview) {
  return html`
    <div class="grid grid-cols-auto">
      <div class="stat-card">
        <div class="stat-label">Total Workouts</div>
        <div class="stat-value">${overview.total_workouts || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Volume</div>
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

function renderVolumeByMuscle(muscles) {
  if (!muscles || muscles.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-description">No volume data yet.</div>
      </div>
    `;
  }
  return html`
    <div class="volume-by-muscle">
      ${muscles.map((m) => html`
        <div class="muscle-volume-row">
          <strong>${m.muscle_group}</strong>
          <span>${formatWeight(m.volume)}</span>
        </div>
      `)}
    </div>
  `;
}

function renderBodyMap(muscles) {
  if (!muscles || muscles.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-description">No workout data in the last 7 days.</div>
      </div>
    `;
  }
  return html`
    <div class="body-map-grid">
      ${muscles.map((m) => html`
        <div class="body-map-tile" style="--intensity: ${(m.intensity || 0) / 100};">
          <div class="body-map-muscle">${m.muscle_group}</div>
          <div class="body-map-meta">${m.set_count} sets</div>
          <div class="body-map-meta">${formatWeight(m.volume)}</div>
        </div>
      `)}
    </div>
  `;
}

function renderTopExercises(exercises) {
  if (!exercises || exercises.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-description">No exercise data yet.</div>
      </div>
    `;
  }
  return html`
    <div class="stack stack-sm">
      ${exercises.map((ex, idx) => html`
        <div class="top-exercise-row">
          <div>
            <strong>${idx + 1}. ${ex.name}</strong>
            <div class="text-muted" style="font-size: var(--text-xs);">${ex.muscle_group}</div>
          </div>
          <div style="text-align: right;">
            <div>${formatWeight(ex.volume)} total</div>
            <div class="text-muted" style="font-size: var(--text-xs);">${ex.workout_count} workouts</div>
          </div>
        </div>
      `)}
    </div>
  `;
}

function renderPRGrid(prs) {
  if (!prs || prs.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-description">No personal records yet. Complete workouts to set new PRs!</div>
      </div>
    `;
  }
  return html`
    <div class="grid grid-cols-auto">
      ${prs.map((pr) => {
        const improvement = pr.previous_value
          ? ((pr.record_value - pr.previous_value) / pr.previous_value) * 100
          : null;
        return html`
          <div class="pr-row">
            <div>
              <strong style="display: block; font-size: var(--text-base);">${pr.exercise_name}</strong>
              <span class="text-muted" style="font-size: var(--text-xs);">
                ${String(pr.record_type || '').toUpperCase()} · ${formatDate(pr.achieved_at)}
              </span>
            </div>
            <div style="text-align: right;">
              <div class="pr-value">${formatWeight(pr.record_value)}</div>
              ${improvement != null
                ? html`<div class="text-success" style="font-size: var(--text-xs);">+${improvement.toFixed(1)}%</div>`
                : ''}
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

function renderLoadingState() {
  return html`
    <div class="stack stack-lg">
      <div class="card"><div class="skeleton skeleton-card"></div></div>
      <div class="card"><div class="skeleton skeleton-card"></div></div>
      <div class="card"><div class="skeleton skeleton-card"></div></div>
    </div>
  `;
}

function renderErrorState(message) {
  return html`
    <div class="card">
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Couldn't load analytics</div>
        <div class="empty-state-description">${message}</div>
      </div>
    </div>
  `;
}

async function recalculatePRs() {
  const ok = await confirmDialog(
    'This will recalculate all your Personal Records from your workout history. Continue?',
    {
      title: 'Recalculate PRs?',
      confirmLabel: 'Recalculate',
      confirmVariant: 'btn-primary'
    }
  );
  if (!ok) return;

  try {
    const result = await api.post('/achievements/prs/recalculate');
    toast.success(result.message || 'PRs recalculated');
    loadAnalytics();
  } catch (err) {
    toast.error(`Failed to recalculate PRs: ${err.message}`);
  }
}

function attachAnalyticsHandlers(container) {
  delegate(container, 'click', (event) => {
    const recalcBtn = event.target.closest('[data-action="recalc-prs"]');
    if (recalcBtn) {
      recalculatePRs();
      return;
    }
    const exporterBtn = event.target.closest('[data-action="open-exporter"]');
    if (exporterBtn) {
      if (typeof window.openUnifiedExporter === 'function') {
        window.openUnifiedExporter();
      } else {
        toast.info('Export center is not yet available');
      }
    }
  });
}

/**
 * Main entry — fetches all analytics data and renders the page.
 */
export async function loadAnalytics() {
  const container = document.getElementById('analytics');
  if (!container) return;

  container.innerHTML = String(renderLoadingState());

  try {
    const [progress, volumeData, bodyMap, prsData, progressComparison] = await Promise.all([
      api.get('/analytics/progress?days=90'),
      api.get('/analytics/volume?days=90&group_by=week'),
      api.get('/analytics/bodymap?days=7'),
      api.get('/achievements/prs?limit=10'),
      api.get('/analytics/progress-comparison')
    ]);

    const prs = prsData.prs || [];
    const overview = progress.overview || {};
    const volumeByMuscle = volumeData.volume_by_muscle || [];
    const bodyMapData = bodyMap.body_map || [];
    const topExercises = progress.top_exercises || [];

    container.innerHTML = String(html`
      <div class="stack stack-lg">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-chart-line"></i> Progress Comparison</h2>
          </div>
          ${renderComparisonBlock('This Week vs Last Week', 'fa-calendar-week', progressComparison.weekly)}
          ${renderComparisonBlock('This Month vs Last Month', 'fa-calendar-alt', progressComparison.monthly)}
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-chart-bar"></i> 90-Day Overview</h2>
          </div>
          ${renderOverviewStats(overview)}
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-weight"></i> Volume by Muscle Group (90 days)</h2>
          </div>
          ${renderVolumeByMuscle(volumeByMuscle)}
        </div>

        <!-- Calendar — rendered by legacy loadWorkoutHistory until migrated -->
        <div id="workoutCalendarContainer"></div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-running"></i> Body Map (Last 7 Days)</h2>
          </div>
          ${renderBodyMap(bodyMapData)}
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-trophy"></i> Top Exercises</h2>
          </div>
          ${renderTopExercises(topExercises)}
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-medal text-warning"></i> Personal Records</h2>
            <button class="btn btn-outline btn-sm" data-action="recalc-prs">
              <i class="fas fa-sync"></i> Recalculate PRs
            </button>
          </div>
          ${renderPRGrid(prs)}
        </div>

        <div class="card" id="export-section">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-download"></i> Export &amp; Reports</h2>
          </div>
          <p class="text-muted" style="margin-bottom: var(--space-4);">
            Export your fitness data or generate professional PDF reports.
          </p>
          <button class="btn btn-block btn-lg export-button" data-action="open-exporter">
            <i class="fas fa-file-export"></i> Open Export Center
          </button>
        </div>
      </div>
    `);

    attachAnalyticsHandlers(container);

    // Delegate to legacy loadWorkoutHistory for the calendar section.
    const legacyLoadWorkoutHistory = window.loadWorkoutHistory;
    if (typeof legacyLoadWorkoutHistory === 'function') {
      try {
        await legacyLoadWorkoutHistory(container);
      } catch (err) {
        console.warn('Legacy loadWorkoutHistory failed:', err);
      }
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
    container.innerHTML = String(renderErrorState(error.message));
  }
}
