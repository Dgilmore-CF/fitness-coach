/**
 * Advanced Analytics — ML predictions, recovery, consistency, muscle balance.
 * Migrated from legacy loadAdvancedAnalytics (~235 lines) + generateRecommendations,
 * applyRecommendation, dismissRecommendation, viewRecommendationDetails,
 * toggleAutoApply, toggleWeeklyAnalysis, toggleRealtimeSuggestions.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { toast } from '@ui/Toast';
import { confirmDialog, openModal } from '@ui/Modal';
import { formatWeight } from '@utils/formatters';

const RECOVERY_COLORS = {
  well_rested: 'var(--color-secondary)',
  moderate: 'var(--color-warning)',
  fatigued: 'var(--color-danger)',
  needs_rest: 'var(--color-danger)'
};

const TREND_ICONS = {
  increasing: raw('<i class="fas fa-arrow-up text-success"></i>'),
  decreasing: raw('<i class="fas fa-arrow-down text-danger"></i>'),
  stable: raw('<i class="fas fa-minus text-warning"></i>')
};

function renderRecoveryCard(recovery = {}) {
  const color = RECOVERY_COLORS[recovery.status] || 'var(--color-text-muted)';
  return html`
    <div class="card advanced-metric-card">
      <div class="advanced-metric-ring" style="background: ${color}20;">
        <span style="color: ${color}; font-weight: var(--font-bold);">${recovery.score || 0}</span>
      </div>
      <div>Recovery Score</div>
      <div class="text-muted" style="font-size: var(--text-sm); text-transform: capitalize;">
        ${(recovery.status || 'unknown').replace('_', ' ')}
      </div>
      <p class="text-muted" style="font-size: var(--text-xs);">${recovery.recommendation || ''}</p>
    </div>
  `;
}

function renderConsistencyCard(consistency = {}) {
  const pct = consistency.consistency || 0;
  const color = pct >= 70 ? 'var(--color-secondary)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
  return html`
    <div class="card advanced-metric-card">
      <div class="advanced-metric-ring" style="background: ${color}20;">
        <span style="color: ${color}; font-weight: var(--font-bold);">${pct}%</span>
      </div>
      <div>Consistency</div>
      <div class="text-muted" style="font-size: var(--text-sm);">
        <i class="fas fa-fire text-warning"></i> ${consistency.currentStreak || 0} workout streak
      </div>
      <p class="text-muted" style="font-size: var(--text-xs);">Best day: ${consistency.bestDay || 'N/A'}</p>
    </div>
  `;
}

function renderBalanceCard(balance = {}) {
  const pct = balance.balance || 0;
  const color = pct >= 70 ? 'var(--color-secondary)' : 'var(--color-warning)';
  return html`
    <div class="card advanced-metric-card">
      <div class="advanced-metric-ring" style="background: ${color}20;">
        <span style="color: ${color}; font-weight: var(--font-bold);">${pct}%</span>
      </div>
      <div>Muscle Balance</div>
      <div class="text-muted" style="font-size: var(--text-sm);">
        ${balance.imbalances?.length || 0} imbalances detected
      </div>
    </div>
  `;
}

function renderTrendCard(volume = {}) {
  return html`
    <div class="card advanced-metric-card">
      <div class="advanced-metric-ring" style="background: var(--color-primary-subtle);">
        ${TREND_ICONS[volume.trend] || TREND_ICONS.stable}
      </div>
      <div>Volume Trend</div>
      <div class="text-muted" style="font-size: var(--text-sm); text-transform: capitalize;">
        ${volume.trend || 'stable'}
      </div>
      <p class="text-muted" style="font-size: var(--text-xs);">${volume.confidence || 0}% confidence</p>
    </div>
  `;
}

function renderInsights(insights) {
  if (!insights?.insights?.length) return '';
  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <i class="fas fa-lightbulb text-warning"></i> AI-Powered Insights
        </h3>
      </div>
      ${insights.overall_assessment
        ? html`<p class="text-muted" style="margin-bottom: var(--space-4);">${insights.overall_assessment}</p>`
        : ''}
      <div class="stack stack-sm">
        ${insights.insights.map((insight) => html`
          <div class="insight-card insight-${insight.priority || 'low'}">
            <div class="cluster cluster-between">
              <strong>${insight.title}</strong>
              <span class="badge badge-${insight.priority === 'high' ? 'danger' : insight.priority === 'medium' ? 'warning' : 'success'}">${insight.priority}</span>
            </div>
            <p class="text-muted" style="font-size: var(--text-sm); margin-top: var(--space-2);">${insight.insight}</p>
            <p class="text-primary" style="font-size: var(--text-sm); margin-top: var(--space-2);">
              <i class="fas fa-check-circle"></i> ${insight.action}
            </p>
          </div>
        `)}
      </div>
    </div>
  `;
}

function renderStrengthPredictions(preds) {
  if (!preds?.length) return '';
  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <i class="fas fa-chart-line text-primary"></i> Strength Predictions
        </h3>
      </div>
      <p class="text-muted" style="margin-bottom: var(--space-3); font-size: var(--text-sm);">
        Predicted 1RM in 4 weeks based on your progression rate.
      </p>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Current</th>
              <th>Predicted (4w)</th>
              <th>Trend</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${preds.slice(0, 8).map((pred) => html`
              <tr>
                <td>
                  <strong>${pred.exercise_name}</strong>
                  <div class="text-muted" style="font-size: var(--text-xs);">${pred.data_points} data points</div>
                </td>
                <td>${formatWeight(pred.current_max)}</td>
                <td class="text-primary" style="font-weight: var(--font-bold);">${formatWeight(pred.predicted_max_4_weeks)}</td>
                <td>${TREND_ICONS[pred.trend] || TREND_ICONS.stable}</td>
                <td>
                  <span class="badge ${pred.confidence >= 70 ? 'badge-success' : pred.confidence >= 40 ? 'badge-warning' : ''}">${pred.confidence}%</span>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderVolumeForecast(predictions) {
  if (!predictions?.predictions?.length) return '';
  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <i class="fas fa-weight text-success"></i> Volume Forecast
        </h3>
      </div>
      <p class="text-muted" style="margin-bottom: var(--space-3); font-size: var(--text-sm);">
        ${predictions.recommendation || ''}
      </p>
      <div class="volume-forecast-grid">
        ${predictions.predictions.map((p) => html`
          <div class="volume-forecast-cell">
            <div class="text-muted" style="font-size: var(--text-xs);">${p.week}</div>
            <div class="text-primary" style="font-size: var(--text-lg); font-weight: var(--font-bold);">
              ${formatWeight(p.predicted_volume)}
            </div>
          </div>
        `)}
      </div>
      <div class="volume-forecast-current">
        <span>Current Weekly Volume</span>
        <strong>${formatWeight(predictions.current_weekly_volume || 0)}</strong>
      </div>
    </div>
  `;
}

function renderImbalances(balance) {
  if (!balance?.imbalances?.length) return '';
  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <i class="fas fa-balance-scale text-warning"></i> Muscle Imbalances
        </h3>
      </div>
      <p class="text-muted" style="margin-bottom: var(--space-3); font-size: var(--text-sm);">
        Areas that need attention based on your training volume distribution.
      </p>
      <div class="stack stack-sm">
        ${balance.imbalances.map((imb) => html`
          <div class="imbalance-row imbalance-${imb.status}">
            <div>
              <strong>${imb.muscle}</strong>
              <span class="text-muted" style="margin-left: var(--space-2); font-size: var(--text-xs); text-transform: capitalize;">
                ${imb.status}
              </span>
            </div>
            <span class="${imb.deviation < 0 ? 'text-danger' : 'text-warning'}">
              ${imb.deviation > 0 ? '+' : ''}${imb.deviation}%
            </span>
          </div>
        `)}
      </div>
      ${balance.recommendations?.length
        ? html`
            <div class="advanced-recommendations-box">
              <strong><i class="fas fa-lightbulb"></i> Recommendations:</strong>
              <ul>${balance.recommendations.map((r) => html`<li>${r}</li>`)}</ul>
            </div>
          `
        : ''}
    </div>
  `;
}

/**
 * Advanced Analytics modal — opens the full ML-powered dashboard
 * (recovery, consistency, muscle balance, strength predictions, volume
 * forecast, imbalances, AI insights) in a wide modal.
 *
 * Previously this rendered into a DOM element `#advancedAnalyticsSection`
 * that the migrated Insights screen never actually creates, so the button
 * appeared to do nothing. Using a modal makes it work regardless of what
 * tab the user is on and matches the "Full Analysis" button pattern.
 */
export async function loadAdvancedAnalytics() {
  let data;
  try {
    data = await api.get('/analytics/advanced');
  } catch (err) {
    console.error('Error loading advanced analytics:', err);
    toast.error(`Couldn't load advanced analytics: ${err.message}`);
    return;
  }

  if (!data || typeof data !== 'object') {
    toast.info('No advanced analytics data available yet.');
    return;
  }

  const totalWorkouts = data.summary?.total_workouts_analyzed || 0;

  openModal({
    title: 'Advanced Analytics',
    size: 'wide',
    content: String(html`
      <div class="stack stack-lg">
        <div class="card advanced-hero">
          <h2 style="margin: 0;"><i class="fas fa-brain"></i> ML-Powered Insights</h2>
          <p class="text-muted" style="margin-top: var(--space-2);">
            Predictions and analysis based on
            ${totalWorkouts === 1 ? '1 workout' : `${totalWorkouts} workouts`}.
          </p>
        </div>

        ${totalWorkouts === 0
          ? html`
              <div class="empty-state" style="padding: var(--space-6) var(--space-4);">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-title">Not enough data yet</div>
                <div class="empty-state-description">
                  Log a few workouts and advanced analytics will unlock.
                </div>
              </div>
            `
          : html`
              <div class="grid grid-cols-auto">
                ${renderRecoveryCard(data.recovery)}
                ${renderConsistencyCard(data.consistency)}
                ${renderBalanceCard(data.muscle_balance)}
                ${renderTrendCard(data.volume_predictions)}
              </div>

              ${renderInsights(data.ai_insights)}
              ${renderStrengthPredictions(data.strength_predictions)}
              ${renderVolumeForecast(data.volume_predictions)}
              ${renderImbalances(data.muscle_balance)}
            `}
      </div>
    `),
    actions: [{ label: 'Close', primary: true, variant: 'btn-primary' }]
  });
}

// ============================================================================
// Recommendations actions
// ============================================================================

export async function generateRecommendations() {
  toast.info('Analyzing your training data…');
  try {
    await api.post('/ai/recommendations/generate');
    toast.success('Recommendations generated!');
    if (typeof window.loadInsights === 'function') window.loadInsights();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export async function applyRecommendation(recId) {
  const ok = await confirmDialog(
    'This will automatically modify your training program based on this recommendation. Continue?',
    { title: 'Apply recommendation?', confirmLabel: 'Apply' }
  );
  if (!ok) return;
  try {
    await api.post(`/ai/recommendations/${recId}/apply`);
    toast.success('Recommendation applied!');
    if (typeof window.loadInsights === 'function') window.loadInsights();
    if (typeof window.loadPrograms === 'function') window.loadPrograms();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export async function dismissRecommendation(recId) {
  try {
    await api.post(`/ai/recommendations/${recId}/dismiss`);
    toast.success('Recommendation dismissed');
    if (typeof window.loadInsights === 'function') window.loadInsights();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export async function viewRecommendationDetails(recId) {
  try {
    const data = await api.get(`/ai/recommendations/${recId}`);
    const rec = data.recommendation;

    openModal({
      title: rec.title,
      size: 'default',
      content: String(html`
        <div class="stack stack-sm">
          <div class="cluster">
            <span class="badge badge-${rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'success'}">
              ${String(rec.priority || 'low').toUpperCase()} PRIORITY
            </span>
            <span class="badge">${rec.category}</span>
          </div>
          <p>${rec.description}</p>
          ${rec.reasoning
            ? html`
                <div class="rec-reasoning">
                  <strong><i class="fas fa-brain"></i> AI Analysis:</strong>
                  <p>${rec.reasoning}</p>
                </div>
              `
            : ''}
          ${rec.action_items?.length
            ? html`
                <div>
                  <strong>Action Items:</strong>
                  <ul style="margin-top: var(--space-2); margin-left: var(--space-5);">
                    ${rec.action_items.map((item) => html`<li>${item}</li>`)}
                  </ul>
                </div>
              `
            : ''}
        </div>
      `),
      actions: [
        { label: 'Dismiss', variant: 'btn-outline', onClick: async (modal) => {
            await dismissRecommendation(recId);
            modal.close();
          } },
        { label: 'Apply Now', primary: true, variant: 'btn-primary', onClick: async (modal) => {
            await applyRecommendation(recId);
            modal.close();
          } }
      ]
    });
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

// ============================================================================
// Preference toggles
// ============================================================================

async function togglePref(key, enabled) {
  try {
    await api.patch('/ai/recommendations/settings', { [key]: enabled });
    toast.success('Preference saved');
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export const toggleAutoApply = (enabled) => togglePref('auto_apply_enabled', enabled);
export const toggleWeeklyAnalysis = (enabled) => togglePref('weekly_analysis_enabled', enabled);
export const toggleRealtimeSuggestions = (enabled) => togglePref('realtime_suggestions_enabled', enabled);
