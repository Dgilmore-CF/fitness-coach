/**
 * Stats dashboard — a professional, sectioned analytics view.
 *
 * Layout:
 *   • Time-range selector (4W / 8W / 12W / 6M / 1Y)
 *   • KPI hero row with period-over-period deltas
 *   • Segmented sections: Overview · Strength · Volume · Recovery
 *
 * All charts are hand-rolled SVG (frontend/src/ui/Chart.js) — no external
 * charting dependency. Data comes from the consolidated GET /analytics/dashboard
 * endpoint, plus PRs (/achievements/prs) and the 7-day body map.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { delegate } from '@core/delegate';
import { toast } from '@ui/Toast';
import { confirmDialog } from '@ui/Modal';
import { lineChart, barChart } from '@ui/Chart';
import {
  formatWeight,
  formatVolume,
  formatDuration,
  formatDurationShort,
  formatDate,
  formatPercentChange
} from '@utils/formatters';
import { toDisplayWeight, getWeightUnit } from '@utils/conversions';

const RANGES = [
  { label: '4W', days: 28 },
  { label: '8W', days: 56 },
  { label: '12W', days: 84 },
  { label: '6M', days: 182 },
  { label: '1Y', days: 365 }
];

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'fa-gauge-high' },
  { id: 'strength', label: 'Strength', icon: 'fa-dumbbell' },
  { id: 'volume', label: 'Volume', icon: 'fa-weight-hanging' },
  { id: 'recovery', label: 'Recovery', icon: 'fa-heart-pulse' }
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const state = {
  days: 84,
  section: 'overview',
  data: null,
  prs: [],
  bodymap: [],
  loading: false
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Compact display-weight, e.g. 12,540 kg → "12.5k". */
function compactWeight(kg) {
  const v = toDisplayWeight(kg || 0);
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

function deltaBadge(pct) {
  if (pct == null || !isFinite(pct) || Math.round(pct) === 0) {
    return html`<span class="stat-delta is-flat">—</span>`;
  }
  const up = pct > 0;
  return html`<span class="stat-delta ${up ? 'is-up' : 'is-down'}">
    <i class="fas fa-arrow-${up ? 'up' : 'down'}"></i> ${formatPercentChange(pct).replace(/^[+-]/, '')}
  </span>`;
}

// ---------------------------------------------------------------------------
// Header: range selector + section tabs
// ---------------------------------------------------------------------------

function renderControls() {
  return html`
    <div class="stats-controls">
      <div class="stats-range" role="tablist" aria-label="Time range">
        ${RANGES.map((r) => html`
          <button class="stats-range-btn ${state.days === r.days ? 'is-active' : ''}"
                  data-action="set-range" data-days="${r.days}">${r.label}</button>
        `)}
      </div>
    </div>
    <div class="stats-sections" role="tablist" aria-label="Sections">
      ${SECTIONS.map((s) => html`
        <button class="stats-section-btn ${state.section === s.id ? 'is-active' : ''}"
                data-action="set-section" data-section="${s.id}">
          <i class="fas ${s.icon}"></i><span>${s.label}</span>
        </button>
      `)}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// KPI hero
// ---------------------------------------------------------------------------

function renderKpis() {
  const o = state.data.overview;
  const d = state.data.deltas;
  const unit = getWeightUnit();
  return html`
    <div class="stats-kpis">
      <div class="stats-kpi">
        <div class="stats-kpi-label">Workouts</div>
        <div class="stats-kpi-value">${o.workouts}</div>
        ${deltaBadge(d.workouts)}
      </div>
      <div class="stats-kpi">
        <div class="stats-kpi-label">Volume (${unit})</div>
        <div class="stats-kpi-value">${compactWeight(o.volume_kg)}</div>
        ${deltaBadge(d.volume_kg)}
      </div>
      <div class="stats-kpi">
        <div class="stats-kpi-label">Training Time</div>
        <div class="stats-kpi-value">${formatDurationShort(o.time_seconds)}</div>
        ${deltaBadge(d.time_seconds)}
      </div>
      <div class="stats-kpi">
        <div class="stats-kpi-label">Avg RPE</div>
        <div class="stats-kpi-value">${o.avg_rpe ? o.avg_rpe.toFixed(1) : '—'}</div>
        <span class="stat-delta is-flat">${o.total_sets} sets</span>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Section: Overview
// ---------------------------------------------------------------------------

function renderOverviewSection() {
  const trend = state.data.volume_trend || [];
  const unit = getWeightUnit();
  const volumeSeries = trend.map((t) => ({ x: t.week_start, y: toDisplayWeight(t.volume || 0) }));

  const dowCounts = DOW_LABELS.map((label, i) => {
    const row = (state.data.dow_distribution || []).find((r) => Number(r.dow) === i);
    return { x: label, y: row ? row.count : 0 };
  });

  const c = state.data.consistency;
  const wpw = c.workouts_per_week ? c.workouts_per_week.toFixed(1) : '0';

  return html`
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-chart-area"></i> Weekly Volume Trend (${unit})</h3></div>
      ${volumeSeries.length >= 2
        ? raw(lineChart({ data: volumeSeries, height: 240, formatX: (x) => formatDate(x, { month: 'short', day: 'numeric' }), formatY: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))) }))
        : renderEmpty('Log a couple of weeks of workouts to see your volume trend.')}
    </div>

    <div class="grid grid-cols-2 stats-grid-gap">
      <div class="card">
        <div class="card-header"><h3 class="card-title"><i class="fas fa-calendar-check"></i> Consistency</h3></div>
        <div class="stats-mini-kpis">
          <div><div class="stats-kpi-value">${wpw}</div><div class="stats-kpi-label">workouts / week</div></div>
          <div><div class="stats-kpi-value">${c.active_days}</div><div class="stats-kpi-label">active days</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title"><i class="fas fa-calendar-day"></i> Training Days</h3></div>
        ${raw(barChart({ data: dowCounts, height: 180, formatY: (v) => String(Math.round(v)) }))}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Section: Strength
// ---------------------------------------------------------------------------

function renderStrengthSection() {
  const top = state.data.top_exercises || [];
  const oneRm = state.data.top_exercise_1rm;
  const series = (oneRm?.series || []).map((p) => ({ x: p.date, y: toDisplayWeight(p.max_1rm || 0) }));

  return html`
    ${oneRm
      ? html`<div class="card">
          <div class="card-header"><h3 class="card-title"><i class="fas fa-arrow-trend-up"></i> Est. 1RM — ${oneRm.exercise_name}</h3></div>
          ${series.length >= 2
            ? raw(lineChart({ data: series, height: 220, color: 'var(--color-secondary)', formatX: (x) => formatDate(x, { month: 'short', day: 'numeric' }), formatY: (v) => String(Math.round(v)) }))
            : renderEmpty('Not enough sessions yet for a 1RM trend on your top lift.')}
        </div>`
      : ''}

    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-ranking-star"></i> Top Exercises by Volume</h3></div>
      ${top.length
        ? html`<div class="stack stack-sm">
            ${top.map((ex, i) => {
              const maxVol = top[0].volume || 1;
              const pct = Math.max(4, Math.round((ex.volume / maxVol) * 100));
              return html`
                <div class="stats-bar-row">
                  <div class="stats-bar-head">
                    <span><strong>${i + 1}. ${ex.name}</strong> <span class="text-muted">· ${ex.muscle_group}</span></span>
                    <span class="stats-bar-val">${formatVolume(ex.volume)}</span>
                  </div>
                  <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${pct}%"></div></div>
                  <div class="stats-bar-sub text-muted">
                    ${ex.workout_count} workouts${ex.max_1rm ? html` · best 1RM ${formatWeight(ex.max_1rm)}` : ''}
                  </div>
                </div>`;
            })}
          </div>`
        : renderEmpty('No strength data in this range.')}
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-medal text-warning"></i> Personal Records</h3>
        <button class="btn btn-outline btn-sm" data-action="recalc-prs"><i class="fas fa-sync"></i> Recalculate</button>
      </div>
      ${renderPRGrid(state.prs)}
    </div>
  `;
}

function renderPRGrid(prs) {
  if (!prs || !prs.length) {
    return renderEmpty('No personal records yet. Complete workouts to set new PRs!');
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
              <strong style="display:block;">${pr.exercise_name}</strong>
              <span class="text-muted" style="font-size: var(--text-xs);">
                ${String(pr.record_type || '').toUpperCase()} · ${formatDate(pr.achieved_at)}
              </span>
            </div>
            <div style="text-align:right;">
              <div class="pr-value">${formatWeight(pr.record_value)}</div>
              ${improvement != null ? html`<div class="text-success" style="font-size: var(--text-xs);">+${improvement.toFixed(1)}%</div>` : ''}
            </div>
          </div>`;
      })}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Section: Volume
// ---------------------------------------------------------------------------

function renderVolumeSection() {
  const muscles = state.data.volume_by_muscle || [];
  const total = muscles.reduce((s, m) => s + (m.volume || 0), 0) || 1;
  const bodymap = state.bodymap || [];

  return html`
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-chart-pie"></i> Volume by Muscle Group</h3></div>
      ${muscles.length
        ? html`<div class="stack stack-sm">
            ${muscles.map((m) => {
              const share = Math.round((m.volume / total) * 100);
              return html`
                <div class="stats-bar-row">
                  <div class="stats-bar-head">
                    <span><strong>${m.muscle_group}</strong></span>
                    <span class="stats-bar-val">${formatVolume(m.volume)} · ${share}%</span>
                  </div>
                  <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${Math.max(3, share)}%"></div></div>
                  <div class="stats-bar-sub text-muted">${m.sets} sets</div>
                </div>`;
            })}
          </div>`
        : renderEmpty('No volume logged in this range.')}
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-fire"></i> Muscle Activation (last 7 days)</h3></div>
      ${bodymap.length
        ? html`<div class="body-map-grid">
            ${bodymap.map((m) => html`
              <div class="body-map-tile" style="--intensity: ${(m.intensity || 0) / 100};">
                <div class="body-map-muscle">${m.muscle_group}</div>
                <div class="body-map-meta">${m.set_count} sets</div>
                <div class="body-map-meta">${formatVolume(m.volume)}</div>
              </div>`)}
          </div>`
        : renderEmpty('No workout data in the last 7 days.')}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Section: Recovery
// ---------------------------------------------------------------------------

function renderRecoverySection() {
  const trend = state.data.volume_trend || [];
  const rpeSeries = trend.filter((t) => t.avg_rpe != null).map((t) => ({ x: t.week_start, y: t.avg_rpe }));
  const o = state.data.overview;

  return html`
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-gauge"></i> Perceived Exertion (RPE) Trend</h3></div>
      ${rpeSeries.length >= 2
        ? raw(lineChart({ data: rpeSeries, height: 220, color: 'var(--color-warning)', formatX: (x) => formatDate(x, { month: 'short', day: 'numeric' }), formatY: (v) => v.toFixed(1) }))
        : renderEmpty('Rate your workouts (RPE) to track fatigue and recovery over time.')}
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-lightbulb"></i> Load Insight</h3></div>
      ${renderLoadInsight(o, rpeSeries)}
    </div>
  `;
}

function renderLoadInsight(overview, rpeSeries) {
  if (rpeSeries.length < 2) {
    return html`<p class="text-muted">Log RPE on more workouts to unlock recovery insights.</p>`;
  }
  const first = rpeSeries[0].y;
  const last = rpeSeries[rpeSeries.length - 1].y;
  const rising = last - first > 0.8;
  const falling = first - last > 0.8;
  let msg, cls, icon;
  if (rising) {
    msg = 'Your average RPE is climbing — sessions feel harder. Consider a lighter deload week if volume is also up.';
    cls = 'text-warning'; icon = 'fa-triangle-exclamation';
  } else if (falling) {
    msg = 'Your average RPE is dropping — workouts feel easier. You may have room to add load or volume.';
    cls = 'text-success'; icon = 'fa-arrow-up';
  } else {
    msg = 'Your perceived exertion is steady — training load looks well balanced.';
    cls = 'text-success'; icon = 'fa-check';
  }
  return html`<p class="${cls}" style="display:flex; gap: var(--space-2); align-items:flex-start;">
    <i class="fas ${icon}" style="margin-top:3px;"></i><span>${msg}</span>
  </p>`;
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function renderEmpty(msg) {
  return html`<div class="empty-state"><div class="empty-state-description">${msg}</div></div>`;
}

function renderSection() {
  switch (state.section) {
    case 'strength': return renderStrengthSection();
    case 'volume': return renderVolumeSection();
    case 'recovery': return renderRecoverySection();
    default: return renderOverviewSection();
  }
}

function renderExportCard() {
  return html`
    <div class="card" id="export-section">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-download"></i> Export &amp; Reports</h3></div>
      <button class="btn btn-block export-button" data-action="open-exporter">
        <i class="fas fa-file-export"></i> Open Export Center
      </button>
    </div>
  `;
}

function renderDashboard() {
  const container = document.getElementById('analytics');
  if (!container) return;
  container.innerHTML = String(html`
    <div class="stack stack-lg stats-dashboard">
      ${renderControls()}
      ${renderKpis()}
      <div id="stats-section-content" class="stack stack-lg">
        ${renderSection()}
      </div>
      ${renderExportCard()}
    </div>
  `);
  attachAnalyticsHandlers(container);
}

// ---------------------------------------------------------------------------
// Data + lifecycle
// ---------------------------------------------------------------------------

async function fetchData() {
  const [dashboard, prsData, bodyMap] = await Promise.all([
    api.get(`/analytics/dashboard?days=${state.days}`),
    api.get('/achievements/prs?limit=8').catch(() => ({ prs: [] })),
    api.get('/analytics/bodymap?days=7').catch(() => ({ body_map: [] }))
  ]);
  state.data = dashboard;
  state.prs = prsData.prs || [];
  state.bodymap = bodyMap.body_map || [];
}

async function recalculatePRs() {
  const ok = await confirmDialog(
    'Recalculate all Personal Records from your workout history?',
    { title: 'Recalculate PRs?', confirmLabel: 'Recalculate', confirmVariant: 'btn-primary' }
  );
  if (!ok) return;
  try {
    const result = await api.post('/achievements/prs/recalculate');
    toast.success(result.message || 'PRs recalculated');
    await fetchData();
    renderDashboard();
  } catch (err) {
    toast.error(`Failed to recalculate PRs: ${err.message}`);
  }
}

function attachAnalyticsHandlers(container) {
  delegate(container, 'click', async (event) => {
    const t = event.target.closest('[data-action]');
    if (!t) return;
    const action = t.getAttribute('data-action');

    if (action === 'set-range') {
      const days = parseInt(t.dataset.days, 10);
      if (days === state.days) return;
      state.days = days;
      await reloadData();
    } else if (action === 'set-section') {
      state.section = t.dataset.section;
      renderDashboard();
    } else if (action === 'recalc-prs') {
      await recalculatePRs();
    } else if (action === 'open-exporter') {
      if (typeof window.openUnifiedExporter === 'function') window.openUnifiedExporter();
      else toast.info('Export center is not yet available');
    }
  });
}

async function reloadData() {
  const content = document.getElementById('analytics');
  if (content) {
    // Keep controls; just show a light loading state in the body.
    renderDashboard();
    const body = document.getElementById('stats-section-content');
    if (body) body.innerHTML = String(html`<div class="card"><div class="skeleton skeleton-card"></div></div>`);
  }
  try {
    await fetchData();
    renderDashboard();
  } catch (err) {
    if (content) content.innerHTML = String(renderErrorState(err.message));
  }
}

function renderErrorState(message) {
  return html`
    <div class="card">
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Couldn't load stats</div>
        <div class="empty-state-description">${message}</div>
      </div>
    </div>
  `;
}

export async function loadAnalytics() {
  const container = document.getElementById('analytics');
  if (!container) return;
  container.innerHTML = String(html`
    <div class="stack stack-lg">
      <div class="card"><div class="skeleton skeleton-card"></div></div>
      <div class="card"><div class="skeleton skeleton-card"></div></div>
    </div>
  `);
  try {
    await fetchData();
    renderDashboard();
  } catch (error) {
    console.error('Error loading analytics:', error);
    container.innerHTML = String(renderErrorState(error.message));
  }
}
