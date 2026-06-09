/**
 * Unified meal review/confirm panel.
 *
 * Every way of producing macros — AI parse, AI suggestion, quick macros,
 * barcode scan(s), manual food search — funnels into this single panel so the
 * experience is identical regardless of source. It always offers the same
 * controls:
 *   • editable meal name
 *   • meal type (breakfast / lunch / dinner / snack)
 *   • date
 *   • a macro summary
 *   • "save as a reusable meal" toggle
 *   • Log
 *
 * Draft shape:
 *   {
 *     title?: string,                 // modal title
 *     sourceLabel?: string,           // small badge, e.g. "AI estimate"
 *     name?: string,                  // suggested meal name
 *     mealType?: 'breakfast'|'lunch'|'dinner'|'snack',
 *     date?: 'YYYY-MM-DD',
 *     foods?: Array<{ name, quantity, unit, calories, protein_g, carbs_g,
 *                     fat_g, fiber_g, source?, source_id? }>,  // per-UNIT macros
 *     customMacros?: { calories, protein_g, carbs_g, fat_g, fiber_g }, // absolute
 *     defaultSaveAsMeal?: boolean
 *   }
 */

import { html } from '@core/html';
import { api } from '@core/api';
import { openModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { todayLocal } from '@utils/date';
import { autoMealTypeByTime } from '@features/nutrition/meal-logger';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function rid(prefix = 'src') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Absolute totals for the draft (foods are per-unit × quantity). */
function computeTotals(draft) {
  if (draft.customMacros) {
    const m = draft.customMacros;
    return {
      calories: Number(m.calories) || 0,
      protein_g: Number(m.protein_g) || 0,
      carbs_g: Number(m.carbs_g) || 0,
      fat_g: Number(m.fat_g) || 0,
      fiber_g: Number(m.fiber_g) || 0
    };
  }
  const foods = draft.foods || [];
  const sum = (k) => foods.reduce((s, f) => s + (Number(f[k]) || 0) * (Number(f.quantity) || 1), 0);
  return {
    calories: sum('calories'),
    protein_g: sum('protein_g'),
    carbs_g: sum('carbs_g'),
    fat_g: sum('fat_g'),
    fiber_g: sum('fiber_g')
  };
}

/** Map a draft food (per-unit macros) to the POST /nutrition/meals food shape. */
function toMealFood(f) {
  const unit = f.unit || 'serving';
  // Already-persisted local foods (manual search, barcode) carry a food_id —
  // link to the existing row (backend computes macros) instead of inlining a
  // duplicate food.
  if (f.food_id) {
    return { food_id: f.food_id, quantity: Number(f.quantity) || 1, unit };
  }
  return {
    quantity: Number(f.quantity) || 1,
    unit,
    food: {
      name: f.name,
      source: f.source || 'ai',
      source_id: f.source_id || rid(f.source || 'ai'),
      serving_size: f.serving_size || 1,
      serving_unit: unit,
      serving_description: `1 ${unit}`,
      calories: Number(f.calories) || 0,
      protein_g: Number(f.protein_g) || 0,
      carbs_g: Number(f.carbs_g) || 0,
      fat_g: Number(f.fat_g) || 0,
      fiber_g: Number(f.fiber_g) || 0
    }
  };
}

function renderFoodList(foods) {
  if (!foods || !foods.length) return '';
  return html`
    <div class="mc-foods">
      <div class="section-label">Items</div>
      <div class="stack stack-sm">
        ${foods.map((f) => html`
          <div class="mc-food-row">
            <span class="mc-food-name">${f.name}</span>
            <span class="text-muted">${f.quantity || 1} ${f.unit || 'serving'} · ${Math.round((Number(f.calories) || 0) * (Number(f.quantity) || 1))} kcal</span>
          </div>
        `)}
      </div>
    </div>
  `;
}

/**
 * Open the unified confirm panel.
 * @param {object} draft
 * @returns the modal handle
 */
export function openMealConfirm(draft = {}) {
  const totals = computeTotals(draft);
  const defaultMealType = MEAL_TYPES.includes(draft.mealType) ? draft.mealType : autoMealTypeByTime();
  const defaultName = (draft.name || '').trim();
  const defaultDate = draft.date || todayLocal();

  return openModal({
    title: draft.title || 'Review & Log Meal',
    size: 'default',
    content: String(html`
      <div class="stack stack-md mc-panel">
        ${draft.sourceLabel
          ? html`<div class="mc-source"><i class="fas fa-wand-magic-sparkles"></i> ${draft.sourceLabel}</div>`
          : ''}

        <div class="form-group">
          <label class="form-label" for="mc-name">Meal name</label>
          <input type="text" id="mc-name" class="input" value="${defaultName}" placeholder="e.g., Chicken & rice" />
        </div>

        <div class="grid grid-cols-2" style="gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" for="mc-meal-type">Meal</label>
            <select id="mc-meal-type" class="select">
              ${MEAL_TYPES.map((mt) => html`
                <option value="${mt}" ${mt === defaultMealType ? 'selected' : ''}>
                  ${mt.charAt(0).toUpperCase() + mt.slice(1)}
                </option>
              `)}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="mc-date">Date</label>
            <input type="date" id="mc-date" class="input" value="${defaultDate}" />
          </div>
        </div>

        <div class="mc-macros">
          <div class="mc-macro"><div class="mc-macro-val">${Math.round(totals.calories)}</div><div class="mc-macro-lbl">kcal</div></div>
          <div class="mc-macro"><div class="mc-macro-val">${totals.protein_g.toFixed(0)}g</div><div class="mc-macro-lbl">protein</div></div>
          <div class="mc-macro"><div class="mc-macro-val">${totals.carbs_g.toFixed(0)}g</div><div class="mc-macro-lbl">carbs</div></div>
          <div class="mc-macro"><div class="mc-macro-val">${totals.fat_g.toFixed(0)}g</div><div class="mc-macro-lbl">fat</div></div>
        </div>

        ${renderFoodList(draft.foods)}

        <label class="cluster mc-save-toggle" style="gap: var(--space-2); cursor: pointer;">
          <input type="checkbox" id="mc-save-too" ${draft.defaultSaveAsMeal ? 'checked' : ''} />
          <span><i class="fas fa-bookmark"></i> Also save as a reusable meal</span>
        </label>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline', onClick: (m) => m.close(false) },
      {
        label: 'Log Meal',
        variant: 'btn-primary',
        primary: true,
        onClick: async (m) => {
          const el = m.element;
          const name = el.querySelector('#mc-name').value.trim() || defaultName || 'Meal';
          const mtEl = el.querySelector('#mc-meal-type');
          const mealType = MEAL_TYPES.includes(mtEl?.value) ? mtEl.value : defaultMealType;
          const date = el.querySelector('#mc-date').value || defaultDate;
          const saveToo = el.querySelector('#mc-save-too').checked;

          const payload = { date, meal_type: mealType, name };
          if (draft.customMacros) {
            payload.custom_macros = {
              calories: totals.calories, protein_g: totals.protein_g,
              carbs_g: totals.carbs_g, fat_g: totals.fat_g, fiber_g: totals.fiber_g
            };
          } else {
            payload.foods = (draft.foods || []).map(toMealFood);
          }

          try {
            await api.post('/nutrition/meals', payload);
            // Uniform "save as reusable meal" — stores totals + meal type so it
            // can be re-logged later (and filed under the right meal slot).
            if (saveToo) {
              await api.post('/nutrition/saved-meals', {
                name,
                meal_type: mealType,
                calories: totals.calories,
                protein_g: totals.protein_g,
                carbs_g: totals.carbs_g,
                fat_g: totals.fat_g,
                fiber_g: totals.fiber_g
              });
            }
            toast.success(saveToo ? `Logged & saved: ${name}` : `Logged ${mealType}: ${name}`);
            m.close(true);
            if (typeof window.loadNutrition === 'function') window.loadNutrition();
          } catch (err) {
            toast.error(`Error logging meal: ${err.message}`);
          }
        }
      }
    ]
  });
}

export default openMealConfirm;
