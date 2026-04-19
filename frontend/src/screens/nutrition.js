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
import { toast } from '@ui/Toast';
import { progressRing } from '@ui/ProgressRing';
import { formatDate, formatNumber } from '@utils/formatters';

// =============================================================================
// Rendering helpers
// =============================================================================

function renderMacroRings(daily) {
  return html`
    <div class="macro-rings">
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
  `;
}

function renderQuickLog() {
  return html`
    <div class="stack stack-sm">
      <div class="meal-type-grid">
        ${[
          { type: 'breakfast', label: 'Breakfast', icon: 'fa-sun' },
          { type: 'lunch', label: 'Lunch', icon: 'fa-cloud-sun' },
          { type: 'dinner', label: 'Dinner', icon: 'fa-moon' },
          { type: 'snack', label: 'Snack', icon: 'fa-cookie' }
        ].map((m) => html`
          <button class="meal-type-btn" data-action="log-meal" data-meal-type="${m.type}">
            <i class="fas ${m.icon}"></i>
            <span>${m.label}</span>
          </button>
        `)}
      </div>
      <div class="quick-action-grid">
        <button class="btn btn-outline" data-action="scan-barcode">
          <i class="fas fa-barcode"></i> Scan
        </button>
        <button class="btn btn-outline" data-action="quick-macros">
          <i class="fas fa-calculator"></i> Quick Macros
        </button>
        <button class="btn btn-outline" data-action="saved-meals">
          <i class="fas fa-bookmark"></i> Saved
        </button>
      </div>
    </div>
  `;
}

function renderQuickAddForm() {
  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title" style="font-size: var(--text-base);">
          <i class="fas fa-bolt"></i> Quick Add
        </h3>
      </div>
      <div class="stack stack-sm">
        <div class="quick-add-row">
          <label>Protein</label>
          <div class="quick-add-input-group">
            <input type="number" class="input" id="nq-protein" placeholder="0" min="0" step="1" />
            <span class="quick-add-unit">g</span>
          </div>
        </div>
        <div class="quick-add-row">
          <label>Water</label>
          <div class="quick-add-input-group">
            <input type="number" class="input" id="nq-water" placeholder="0" min="0" step="100" />
            <span class="quick-add-unit">ml</span>
          </div>
        </div>
        <div class="quick-add-row">
          <label>Creatine</label>
          <div class="quick-add-input-group">
            <input type="number" class="input" id="nq-creatine" placeholder="0" min="0" step="0.5" />
            <span class="quick-add-unit">g</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" data-action="log-all-quick">
          <i class="fas fa-plus-circle"></i> Log All
        </button>
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
        const isToday = day.date === new Date().toISOString().split('T')[0];
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

async function logAllQuick() {
  const protein = parseFloat(document.getElementById('nq-protein').value) || 0;
  const water = parseFloat(document.getElementById('nq-water').value) || 0;
  const creatine = parseFloat(document.getElementById('nq-creatine').value) || 0;

  if (!protein && !water && !creatine) {
    toast.warning('Enter an amount in at least one field.');
    return;
  }

  try {
    const ops = [];
    if (protein > 0) {
      ops.push(api.post('/nutrition/entries', { entry_type: 'protein', amount: protein, unit: 'g' }));
    }
    if (water > 0) {
      ops.push(api.post('/nutrition/entries', { entry_type: 'water', amount: water, unit: 'ml' }));
    }
    if (creatine > 0) {
      ops.push(api.post('/nutrition/entries', { entry_type: 'creatine', amount: creatine, unit: 'g' }));
    }

    await Promise.all(ops);

    document.getElementById('nq-protein').value = '';
    document.getElementById('nq-water').value = '';
    document.getElementById('nq-creatine').value = '';

    toast.success('Nutrition logged!');
    loadNutrition();
  } catch (err) {
    toast.error(`Error logging nutrition: ${err.message}`);
  }
}

function attachNutritionHandlers(container) {
  container.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');

    switch (action) {
      case 'log-meal':
        delegateToLegacy('showLogMealModal', target.getAttribute('data-meal-type'));
        break;
      case 'scan-barcode':
        delegateToLegacy('showBarcodeScanner');
        break;
      case 'quick-macros':
        delegateToLegacy('showQuickMacroEntry');
        break;
      case 'saved-meals':
        delegateToLegacy('showSavedMeals');
        break;
      case 'log-all-quick':
        logAllQuick();
        break;
      case 'view-entries':
        delegateToLegacy('loadNutritionEntries');
        break;
      case 'create-saved':
        delegateToLegacy('showCreateSavedMeal');
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
    const [daily, analytics, streaks] = await Promise.all([
      api.get('/nutrition/daily'),
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

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title"><i class="fas fa-utensils"></i> Log Meal</h2>
            </div>
            ${renderQuickLog()}
          </div>
          ${renderQuickAddForm()}
        </div>

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
            <button class="btn btn-outline btn-sm" data-action="view-entries">
              <i class="fas fa-list"></i> View all entries
            </button>
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
