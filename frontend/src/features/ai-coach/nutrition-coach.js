/**
 * AI Nutrition Coach — three user-facing modals:
 *   1. showNutritionAnalysis() — today's intake insights + AI narrative
 *   2. showMealSuggestion()    — AI suggests meals to hit remaining macros
 *   3. showParseMeal()         — natural-language meal entry ("2 eggs and toast")
 *
 * Each modal degrades gracefully when the AI backend fails — the underlying
 * endpoints return rule-based results in that case.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { openModal, closeTopModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { withLoading } from '@ui/LoadingOverlay';

const PRIORITY_BADGE = {
  high: 'badge-danger',
  medium: 'badge-warning',
  low: 'badge-success'
};

// ============================================================================
// 1. Daily nutrition analysis
// ============================================================================

export async function showNutritionAnalysis() {
  let data;
  try {
    data = await withLoading('Analyzing your nutrition…', async () => {
      return await api.get('/ai/nutrition/analyze');
    });
  } catch (err) {
    toast.error(`Couldn't analyze nutrition: ${err.message}`);
    return;
  }

  if (data.error && (!data.insights || data.insights.length === 0)) {
    toast.warning(data.error);
    return;
  }

  const {
    today = {},
    targets = {},
    remaining = {},
    progress = {},
    insights = [],
    narrative
  } = data;

  openModal({
    title: 'AI Nutrition Insights',
    size: 'wide',
    content: String(html`
      <div class="stack stack-md">
        <div class="ai-nutrition-hero">
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; letter-spacing: var(--tracking-wider);">
              Today's progress
            </div>
            <h3 style="margin-top: var(--space-1);">
              ${Math.round(today.calories || 0)} / ${Math.round(targets.calories || 0)} kcal
            </h3>
          </div>
          <div class="ai-nutrition-hero-macros">
            <span><strong>${Math.round(today.protein_grams || 0)}</strong>g P</span>
            <span><strong>${Math.round(today.carbs_grams || 0)}</strong>g C</span>
            <span><strong>${Math.round(today.fat_grams || 0)}</strong>g F</span>
          </div>
        </div>

        ${narrative
          ? html`
              <div class="ai-nutrition-narrative">
                <div class="ai-nutrition-narrative-label">
                  <i class="fas fa-robot"></i> AI Coach
                </div>
                <p>${narrative}</p>
              </div>
            `
          : ''}

        <div>
          <div class="section-label">
            <i class="fas fa-compass"></i> Remaining for today
          </div>
          <div class="remaining-macros-grid">
            <div class="remaining-macro">
              <div class="text-muted" style="font-size: var(--text-xs);">Calories</div>
              <strong>${Math.round(remaining.calories || 0)} kcal</strong>
            </div>
            <div class="remaining-macro">
              <div class="text-muted" style="font-size: var(--text-xs);">Protein</div>
              <strong class="text-success">${Math.round(remaining.protein_g || 0)}g</strong>
            </div>
            <div class="remaining-macro">
              <div class="text-muted" style="font-size: var(--text-xs);">Carbs</div>
              <strong class="text-primary">${Math.round(remaining.carbs_g || 0)}g</strong>
            </div>
            <div class="remaining-macro">
              <div class="text-muted" style="font-size: var(--text-xs);">Fat</div>
              <strong class="text-warning">${Math.round(remaining.fat_g || 0)}g</strong>
            </div>
            <div class="remaining-macro">
              <div class="text-muted" style="font-size: var(--text-xs);">Water</div>
              <strong>${Math.round(remaining.water_ml || 0)}ml</strong>
            </div>
          </div>
        </div>

        ${insights.length > 0
          ? html`
              <div>
                <div class="section-label">
                  <i class="fas fa-lightbulb"></i> Insights
                </div>
                <div class="stack stack-sm">
                  ${insights.map((ins) => html`
                    <div class="insight-card insight-${ins.priority || 'low'}">
                      <div class="cluster cluster-between" style="margin-bottom: var(--space-2);">
                        <strong>${ins.title}</strong>
                        <span class="badge ${PRIORITY_BADGE[ins.priority] || 'badge-success'}">
                          ${(ins.priority || 'low').toUpperCase()}
                        </span>
                      </div>
                      <p style="margin: 0;">${ins.message}</p>
                    </div>
                  `)}
                </div>
              </div>
            `
          : html`
              <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-title">You're on track</div>
                <div class="empty-state-description">No coaching insights needed right now — keep going.</div>
              </div>
            `}
      </div>
    `),
    actions: [
      { label: 'Close', variant: 'btn-outline' },
      {
        label: 'Suggest a meal →',
        primary: true,
        onClick: (modal) => {
          modal.close();
          showMealSuggestion();
        }
      }
    ]
  });
}

// ============================================================================
// 2. Meal suggestion
// ============================================================================

export async function showMealSuggestion(mealType = 'next') {
  let data;
  try {
    data = await withLoading('Asking the coach for ideas…', async () => {
      return await api.post('/ai/nutrition/suggest-meal', { meal_type: mealType });
    });
  } catch (err) {
    toast.error(`Couldn't get suggestions: ${err.message}`);
    return;
  }

  const suggestions = data.suggestions || [];
  const remaining = data.remaining || {};

  if (suggestions.length === 0) {
    toast.info('No meal suggestions available right now.');
    return;
  }

  openModal({
    title: 'Meal Ideas for Your Remaining Macros',
    size: 'wide',
    content: String(html`
      <div class="stack stack-md">
        <div class="ai-nutrition-hero">
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase;">Remaining today</div>
            <h3 style="margin-top: var(--space-1);">${Math.round(remaining.calories || 0)} kcal to go</h3>
          </div>
          <div class="ai-nutrition-hero-macros">
            <span><strong>${Math.round(remaining.protein_g || 0)}</strong>g P</span>
            <span><strong>${Math.round(remaining.carbs_g || 0)}</strong>g C</span>
            <span><strong>${Math.round(remaining.fat_g || 0)}</strong>g F</span>
          </div>
        </div>

        ${data.source === 'fallback'
          ? html`
              <div class="text-muted" style="font-size: var(--text-xs); text-align: center;">
                <i class="fas fa-info-circle"></i> Using rule-based suggestions — AI coach unavailable
              </div>
            `
          : ''}

        <div class="stack stack-sm">
          ${suggestions.map((s, idx) => html`
            <div class="meal-suggestion">
              <div class="meal-suggestion-header">
                <strong>${s.name || `Option ${idx + 1}`}</strong>
                <div class="meal-suggestion-macros">
                  ${Math.round(s.macros?.calories || 0)} kcal ·
                  ${Math.round(s.macros?.protein_g || 0)}g P ·
                  ${Math.round(s.macros?.carbs_g || 0)}g C ·
                  ${Math.round(s.macros?.fat_g || 0)}g F
                </div>
              </div>
              ${s.description
                ? html`<p class="text-muted" style="font-size: var(--text-sm); margin: var(--space-2) 0;">${s.description}</p>`
                : ''}
              ${Array.isArray(s.ingredients) && s.ingredients.length > 0
                ? html`
                    <div class="meal-suggestion-ingredients">
                      <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">
                        Ingredients
                      </div>
                      <ul>
                        ${s.ingredients.map((ing) => html`<li>${ing}</li>`)}
                      </ul>
                    </div>
                  `
                : ''}
              <button class="btn btn-primary btn-sm" data-log-suggestion="${idx}">
                <i class="fas fa-plus"></i> Log this meal
              </button>
            </div>
          `)}
        </div>
      </div>
    `),
    actions: [
      { label: 'Close', variant: 'btn-outline' }
    ],
    onOpen: ({ element }) => {
      element.addEventListener('click', async (event) => {
        const btn = event.target.closest('[data-log-suggestion]');
        if (!btn) return;
        const idx = parseInt(btn.getAttribute('data-log-suggestion'), 10);
        const suggestion = suggestions[idx];
        if (!suggestion) return;

        await logSuggestionAsMeal(suggestion);
        closeTopModal();
      });
    }
  });
}

async function logSuggestionAsMeal(suggestion) {
  const macros = suggestion.macros || {};
  try {
    await api.post('/nutrition/meals', {
      date: new Date().toISOString().split('T')[0],
      meal_type: 'snack',
      name: suggestion.name,
      // Inline-save the AI suggestion as a food so the backend records the
      // macros into meal_foods + nutrition_log properly.
      foods: [{
        food: {
          name: suggestion.name || 'AI suggested meal',
          source: 'ai',
          source_id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          serving_size: 1,
          serving_unit: 'serving',
          serving_description: '1 serving',
          calories: Math.round(macros.calories || 0),
          protein_g: Math.round(macros.protein_g || 0),
          carbs_g: Math.round(macros.carbs_g || 0),
          fat_g: Math.round(macros.fat_g || 0)
        },
        quantity: 1,
        unit: 'serving'
      }]
    });
    toast.success(`Logged: ${suggestion.name}`);
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error logging meal: ${err.message}`);
  }
}

// ============================================================================
// 3. Parse natural-language meal
// ============================================================================

export function showParseMeal() {
  let parseResult = null;

  const modal = openModal({
    title: 'Describe Your Meal',
    size: 'default',
    content: String(html`
      <div class="stack stack-md">
        <div class="text-muted" style="font-size: var(--text-sm);">
          Type what you ate in plain language. The AI coach will estimate macros.
        </div>

        <div class="form-group">
          <label class="form-label">What did you eat?</label>
          <textarea
            id="parse-meal-input"
            class="textarea"
            rows="3"
            placeholder="e.g., 2 eggs, a slice of whole-wheat toast, and a banana"
            autofocus></textarea>
        </div>

        <div class="cluster">
          <button class="btn btn-primary" data-action="parse">
            <i class="fas fa-magic"></i> Parse with AI
          </button>
          <div class="text-muted" style="font-size: var(--text-xs);">
            <i class="fas fa-info-circle"></i> Review before logging — AI estimates vary
          </div>
        </div>

        <div id="parse-result"></div>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Log Meal',
        primary: true,
        onClick: async (m) => {
          if (!parseResult || parseResult.foods.length === 0) {
            toast.warning('Parse a meal first.');
            return;
          }
          await logParsedMeal(parseResult);
          m.close();
        }
      }
    ],
    onOpen: ({ element }) => {
      const input = element.querySelector('#parse-meal-input');
      const result = element.querySelector('#parse-result');

      element.addEventListener('click', async (event) => {
        const btn = event.target.closest('[data-action="parse"]');
        if (!btn) return;

        const text = input.value.trim();
        if (text.length < 2) {
          toast.warning('Tell me what you ate first.');
          return;
        }

        result.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Parsing…</div>';

        try {
          const data = await api.post('/ai/nutrition/parse-meal', { text });

          if (data.error) {
            result.innerHTML = String(html`
              <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-description">${data.error}</div>
              </div>
            `);
            parseResult = null;
            return;
          }

          parseResult = {
            foods: data.foods || [],
            totals: data.totals || {}
          };

          if (parseResult.foods.length === 0) {
            result.innerHTML = String(html`
              <div class="empty-state">
                <div class="empty-state-icon">🤔</div>
                <div class="empty-state-description">Couldn't parse any foods from that description. Try being more specific.</div>
              </div>
            `);
            return;
          }

          result.innerHTML = String(renderParseResults(parseResult));
        } catch (err) {
          result.innerHTML = String(html`
            <div class="empty-state">
              <div class="empty-state-icon">⚠️</div>
              <div class="empty-state-description">${err.message}</div>
            </div>
          `);
          parseResult = null;
        }
      });
    }
  });

  return modal;
}

function renderParseResults({ foods, totals }) {
  return html`
    <div class="parsed-meal">
      <div class="section-label">
        <i class="fas fa-check-circle text-success"></i> Parsed foods
      </div>
      <div class="stack stack-sm">
        ${foods.map((f) => html`
          <div class="parsed-food">
            <div>
              <strong>${f.name}</strong>
              <div class="text-muted" style="font-size: var(--text-xs);">
                ${f.quantity} ${f.unit} ·
                ${Math.round((f.calories || 0) * f.quantity)} kcal ·
                ${((f.protein_g || 0) * f.quantity).toFixed(1)}g P ·
                ${((f.carbs_g || 0) * f.quantity).toFixed(1)}g C ·
                ${((f.fat_g || 0) * f.quantity).toFixed(1)}g F
              </div>
            </div>
            <span class="badge badge-${f.confidence === 'high' ? 'success' : f.confidence === 'medium' ? 'warning' : ''}" style="font-size: 10px;">
              ${f.confidence.toUpperCase()}
            </span>
          </div>
        `)}
      </div>
      <div class="parsed-totals">
        <strong>Total:</strong>
        ${Math.round(totals.calories || 0)} kcal ·
        ${(totals.protein_g || 0).toFixed(1)}g P ·
        ${(totals.carbs_g || 0).toFixed(1)}g C ·
        ${(totals.fat_g || 0).toFixed(1)}g F
      </div>
    </div>
  `;
}

async function logParsedMeal(parseResult) {
  try {
    await api.post('/nutrition/meals', {
      date: new Date().toISOString().split('T')[0],
      meal_type: 'snack',
      name: 'Parsed meal',
      foods: parseResult.foods.map((f) => ({
        quantity: f.quantity,
        unit: f.unit,
        food: {
          name: f.name,
          source: 'ai',
          source_id: `ai_parsed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          serving_size: 1,
          serving_unit: f.unit,
          serving_description: `1 ${f.unit}`,
          calories: f.calories,
          protein_g: f.protein_g,
          carbs_g: f.carbs_g,
          fat_g: f.fat_g,
          fiber_g: f.fiber_g
        }
      }))
    });
    toast.success('Meal logged from text!');
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error logging meal: ${err.message}`);
  }
}
