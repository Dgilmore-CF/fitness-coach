/**
 * Nutrition screen — daily macros (progress rings), quick log, streaks,
 * analytics, saved meals.
 *
 * Professionally redesigned using the new ProgressRing component in place
 * of the legacy stat cards. Complex sub-modals (meal logger, barcode scanner,
 * food search, saved meal editor) still live in legacy and are called via
 * window globals — they will be migrated in a follow-up pass.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { delegate } from '@core/delegate';
import { toast } from '@ui/Toast';
import { progressRing } from '@ui/ProgressRing';
import { formatDate, formatNumber } from '@utils/formatters';
import { todayLocal } from '@utils/date';
import { autoMealTypeByTime } from '@features/nutrition/meal-logger';

// =============================================================================
// Rendering helpers
// =============================================================================

function renderMacroRings(daily) {
  return html`
    <div class="macro-rings">
      <div class="macro-ring-wrapper">
        ${raw(progressRing({
          value: Math.round(daily.calories || 0),
          max: Math.round(daily.calorie_goal || 2200),
          size: 120,
          unit: 'kcal',
          label: 'Calories',
          color: 'var(--color-warning)'
        }))}
        <div class="macro-ring-meta">
          Goal: ${Math.round(daily.calorie_goal || 2200)} kcal
          <span class="text-muted">(${Math.round(daily.calorie_percentage || 0)}%)</span>
        </div>
      </div>
      <div class="macro-ring-wrapper">
        ${raw(progressRing({
          value: Math.round(daily.protein_grams || 0),
          max: Math.round(daily.protein_goal || 150),
          size: 120,
          unit: 'g',
          label: 'Protein',
          color: 'var(--color-secondary)'
        }))}
        <div class="macro-ring-meta">
          Goal: ${Math.round(daily.protein_goal || 150)}g
          <span class="text-muted">(${Math.round(daily.protein_percentage || 0)}%)</span>
        </div>
      </div>
      <div class="macro-ring-wrapper">
        ${raw(progressRing({
          value: Math.round(daily.water_ml || 0),
          max: Math.round(daily.water_goal || 2500),
          size: 120,
          unit: 'ml',
          label: 'Water',
          color: 'var(--color-primary)'
        }))}
        <div class="macro-ring-meta">
          Goal: ${Math.round(daily.water_goal || 2500)}ml
          <span class="text-muted">(${Math.round(daily.water_percentage || 0)}%)</span>
        </div>
      </div>
      <div class="macro-ring-wrapper">
        ${raw(progressRing({
          value: Math.round((daily.creatine_grams || 0) * 10) / 10,
          max: daily.creatine_goal || 5,
          size: 120,
          unit: 'g',
          label: 'Creatine',
          color: '#8b5cf6'
        }))}
        <div class="macro-ring-meta">
          Goal: ${daily.creatine_goal || 5}g
          <span class="text-muted">(${Math.round(daily.creatine_percentage || 0)}%)</span>
        </div>
      </div>
    </div>
    <div class="macro-secondary-stats">
      <div class="macro-stat">
        <span class="text-muted">Carbs</span>
        <strong>${Math.round(daily.carbs_grams || 0)}g</strong>
        <span class="text-muted" style="font-size: var(--text-xs);">/ ${Math.round(daily.carbs_goal || 0)}g</span>
      </div>
      <div class="macro-stat">
        <span class="text-muted">Fat</span>
        <strong>${Math.round(daily.fat_grams || 0)}g</strong>
        <span class="text-muted" style="font-size: var(--text-xs);">/ ${Math.round(daily.fat_goal || 0)}g</span>
      </div>
      <div class="macro-stat">
        <span class="text-muted">Fiber</span>
        <strong>${Math.round(daily.fiber_grams || 0)}g</strong>
        <span class="text-muted" style="font-size: var(--text-xs);">/ ${Math.round(daily.fiber_goal || 30)}g</span>
      </div>
    </div>
  `;
}

// Unified "Add to Today" card. Every way of getting food/macros in is a single
// method chip; all of them funnel into the shared Review & Log panel (or their
// native picker), so the experience is consistent regardless of method. The AI
// coach actions (suggest / analyze) are folded in here too.
const ADD_METHODS = [
  { action: 'log-meal', icon: 'fa-magnifying-glass', label: 'Search foods', sub: 'Database & USDA' },
  { action: 'scan-barcode', icon: 'fa-barcode', label: 'Scan barcode', sub: 'Packaged foods' },
  { action: 'parse-meal', icon: 'fa-wand-magic-sparkles', label: 'Describe it', sub: 'AI estimate' },
  { action: 'quick-macros', icon: 'fa-calculator', label: 'Quick macros', sub: 'Enter numbers' },
  { action: 'ai-suggest-meal', icon: 'fa-utensils', label: 'Suggest a meal', sub: 'AI for your goals' },
  { action: 'saved-meals', icon: 'fa-bookmark', label: 'Saved meals', sub: 'Reuse & manage' },
  { action: 'quick-supplements', icon: 'fa-bolt', label: 'Protein · Water · Creatine', sub: 'Quick add', wide: true }
];

function renderAddCard() {
  return html`
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-plus-circle"></i> Add to Today</h2>
        <button class="btn btn-ghost btn-sm" data-action="ai-analyze" title="AI insights on today's intake">
          <i class="fas fa-robot"></i> Analyze my day
        </button>
      </div>
      <div class="nut-add-grid">
        ${ADD_METHODS.map((m) => html`
          <button class="nut-method ${m.wide ? 'is-wide' : ''}" data-action="${m.action}">
            <span class="nut-method-icon"><i class="fas ${m.icon}"></i></span>
            <span class="nut-method-text">
              <strong>${m.label}</strong>
              <span class="text-muted">${m.sub}</span>
            </span>
          </button>
        `)}
      </div>
    </div>
  `;
}

function renderStreaks(streaks) {
  if (!streaks) return '';
  return html`
    <div class="grid grid-cols-auto">
      ${[
        { key: 'all', icon: '🔥', label: 'All Goals Streak', color: 'stat-card-gradient-2' },
        { key: 'protein', icon: '💪', label: 'Protein Streak', color: 'stat-card-gradient-1' },
        { key: 'water', icon: '💧', label: 'Water Streak', color: 'stat-card-gradient-3' },
        { key: 'creatine', icon: '⚡', label: 'Creatine Streak', color: 'stat-card-gradient-4' }
      ].map((item) => {
        const streak = streaks[item.key] || { current: 0, longest: 0 };
        return html`
          <div class="stat-card ${item.color}">
            <div class="stat-icon">${item.icon}</div>
            <div class="stat-value">${streak.current}</div>
            <div class="stat-label">${item.label}</div>
            <div class="stat-meta">Best: ${streak.longest} days</div>
          </div>
        `;
      })}
    </div>
  `;
}

function renderAnalyticsSummary(summary) {
  if (!summary) return '';
  return html`
    <div class="grid grid-cols-auto">
      <div class="stat-card">
        <div class="stat-label">Avg Daily Protein</div>
        <div class="stat-value" style="color: var(--color-secondary);">${summary.avg_protein_daily}g</div>
        <div class="stat-meta">Goal: ${summary.protein_goal}g</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Daily Water</div>
        <div class="stat-value" style="color: var(--color-primary);">${summary.avg_water_daily}ml</div>
        <div class="stat-meta">Goal: ${summary.water_goal}ml</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Daily Creatine</div>
        <div class="stat-value" style="color: #8b5cf6;">${summary.avg_creatine_daily}g</div>
        <div class="stat-meta">Goal: ${summary.creatine_goal}g</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Adherence Rate</div>
        <div class="stat-value text-success">${summary.adherence_rate}%</div>
        <div class="stat-meta">${summary.all_goals_days}/${summary.total_days_logged} days</div>
      </div>
    </div>
  `;
}

function renderRecentDays(dailyData, summary) {
  if (!dailyData || dailyData.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-description">No nutrition history yet. Start logging to see trends.</div>
      </div>
    `;
  }

  const recent = dailyData.slice(-14).reverse();
  return html`
    <div class="nutrition-bar-chart">
      ${recent.map((day) => {
        const proteinPct = Math.min((day.protein / day.protein_goal) * 100, 100);
        const waterPct = Math.min((day.water / day.water_goal) * 100, 100);
        const isToday = day.date === todayLocal();
        return html`
          <div class="nutrition-bar-day ${isToday ? 'is-today' : ''}">
            <div class="nutrition-bar-label">${formatDate(day.date, { month: 'short', day: 'numeric' })}</div>
            <div class="nutrition-bars">
              <div class="nutrition-bar-track" title="Protein">
                <div class="nutrition-bar-fill ${day.hit_protein ? 'hit' : ''}" style="height: ${proteinPct}%; background: var(--color-secondary);"></div>
              </div>
              <div class="nutrition-bar-track" title="Water">
                <div class="nutrition-bar-fill ${day.hit_water ? 'hit' : ''}" style="height: ${waterPct}%; background: var(--color-primary);"></div>
              </div>
            </div>
            <div class="nutrition-bar-status">
              ${day.hit_all ? '✓' : ''}
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

// =============================================================================
// Action handlers
// =============================================================================

function delegateToLegacy(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn === 'function') {
    try {
      return fn(...args);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  } else {
    toast.warning('This feature is not yet available.');
  }
}

/**
 * Rebuild the daily nutrition_log totals from the ground-truth rows
 * (meals + nutrition_entries) for the last 30 days, then refresh the
 * screen. Used when the progress rings have drifted from the actual
 * logged data (e.g. accumulated historical drift from older code paths).
 */
async function reconcileLog(btn) {
  const original = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recalculating…';
  }
  try {
    const res = await api.post('/nutrition/reconcile');
    const days = res?.count || Object.keys(res?.reconciled || {}).length || 0;
    toast.success(`Totals recalculated for ${days} day${days === 1 ? '' : 's'}`);
    loadNutrition();
  } catch (err) {
    toast.error(`Couldn't recalculate: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }
}

function attachNutritionHandlers(container) {
  delegate(container, 'click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');

    switch (action) {
      case 'log-meal':
        // Default to the time-appropriate meal; the logger still has its own
        // meal-type radio for overrides.
        delegateToLegacy('showLogMealModal', target.getAttribute('data-meal-type') || autoMealTypeByTime());
        break;
      case 'scan-barcode':
        delegateToLegacy('showBarcodeScanner');
        break;
      case 'quick-macros':
        delegateToLegacy('showQuickMacroEntry');
        break;
      case 'quick-supplements':
        delegateToLegacy('showQuickAddSupplements');
        break;
      case 'saved-meals':
        delegateToLegacy('showSavedMeals');
        break;
      case 'view-entries':
        delegateToLegacy('loadNutritionEntries');
        break;
      case 'reconcile-log':
        reconcileLog(target);
        break;
      case 'create-saved':
        delegateToLegacy('showCreateSavedMeal');
        break;
      case 'ai-analyze':
        delegateToLegacy('showNutritionAnalysis');
        break;
      case 'ai-suggest-meal':
        delegateToLegacy('showMealSuggestion');
        break;
      case 'parse-meal':
        delegateToLegacy('showParseMeal');
        break;
    }
  });
}

function renderLoadingState() {
  return html`
    <div class="stack stack-lg">
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
        <div class="empty-state-title">Couldn't load nutrition</div>
        <div class="empty-state-description">${message}</div>
      </div>
    </div>
  `;
}

// =============================================================================
// Main
// =============================================================================

export async function loadNutrition() {
  const container = document.getElementById('nutrition');
  if (!container) return;

  container.innerHTML = String(renderLoadingState());

  try {
    const today = todayLocal();
    const [daily, analytics, streaks] = await Promise.all([
      api.get(`/nutrition/daily?date=${today}`),
      api.get('/nutrition/analytics?days=30'),
      api.get('/nutrition/streaks')
    ]);

    const summary = analytics.summary;
    const dailyData = analytics.daily_data || [];

    container.innerHTML = String(html`
      <div class="stack stack-lg">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-apple-alt"></i> Today's Nutrition</h2>
          </div>
          ${renderMacroRings(daily)}
        </div>

        ${renderAddCard()}

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-fire"></i> Streaks</h2>
          </div>
          ${renderStreaks(streaks.streaks)}
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-chart-bar"></i> 30-Day Summary</h2>
          </div>
          ${renderAnalyticsSummary(summary)}
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-calendar-alt"></i> Last 14 Days</h2>
            <div class="cluster" style="gap: var(--space-2);">
              <button class="btn btn-ghost btn-sm" data-action="reconcile-log"
                      title="If the progress rings ever disagree with your logged entries, this rebuilds the daily totals from the source.">
                <i class="fas fa-sync-alt"></i> Recalculate
              </button>
              <button class="btn btn-outline btn-sm" data-action="view-entries">
                <i class="fas fa-list"></i> View all entries
              </button>
            </div>
          </div>
          ${renderRecentDays(dailyData, summary)}
        </div>
      </div>
    `);

    attachNutritionHandlers(container);
  } catch (err) {
    console.error('Error loading nutrition:', err);
    container.innerHTML = String(renderErrorState(err.message));
  }
}
