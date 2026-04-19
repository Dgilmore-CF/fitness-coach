/**
 * Saved meals — CRUD modals for user-saved meal templates.
 * Quick macro entry, protein/water/creatine logging helpers.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { delegate } from '@core/delegate';
import { openModal, confirmDialog, closeTopModal } from '@ui/Modal';
import { toast } from '@ui/Toast';

// ============================================================================
// Saved meals list (preview in Nutrition tab)
// ============================================================================

export async function loadSavedMealsList() {
  const container = document.getElementById('saved-meals-list');
  if (!container) return;

  try {
    const data = await api.get('/nutrition/saved-meals');
    const meals = data.saved_meals || [];

    if (meals.length === 0) {
      container.innerHTML = String(html`
        <div class="empty-state" style="padding: var(--space-4);">
          <div class="empty-state-description">No saved meals yet. Save meals you eat often for quick logging.</div>
        </div>
      `);
      return;
    }

    container.innerHTML = String(html`
      <div class="stack stack-sm">
        ${meals.slice(0, 5).map((meal) => html`
          <div class="saved-meal-row">
            <div style="flex: 1; min-width: 0;">
              <strong>${meal.name}</strong>
              <div class="text-muted" style="font-size: var(--text-xs);">
                ${Math.round(meal.calories || 0)} cal ·
                ${(meal.protein_g || 0).toFixed(1)}g P ·
                ${(meal.carbs_g || 0).toFixed(1)}g C ·
                ${(meal.fat_g || 0).toFixed(1)}g F
              </div>
            </div>
            <button class="btn btn-primary btn-sm" data-log-meal="${meal.id}">
              <i class="fas fa-plus"></i> Log
            </button>
          </div>
        `)}
      </div>
    `);

    delegate(container, 'click', async (event) => {
      const btn = event.target.closest('[data-log-meal]');
      if (btn) {
        await logSavedMeal(parseInt(btn.getAttribute('data-log-meal'), 10));
      }
    });
  } catch (err) {
    console.warn('Could not load saved meals:', err);
  }
}

// ============================================================================
// Saved meals: show, create, edit, delete
// ============================================================================

export async function showSavedMeals() {
  try {
    const data = await api.get('/nutrition/saved-meals');
    const meals = data.saved_meals || [];

    openModal({
      title: 'Saved Meals',
      size: 'default',
      content: String(html`
        <div class="stack stack-sm" style="max-height: 500px; overflow-y: auto;">
          ${meals.length === 0
            ? html`<div class="empty-state"><div class="empty-state-description">No saved meals yet.</div></div>`
            : meals.map((meal) => html`
                <div class="saved-meal-row">
                  <div style="flex: 1; min-width: 0;">
                    <strong>${meal.name}</strong>
                    ${meal.description ? html`<div class="text-muted" style="font-size: var(--text-xs);">${meal.description}</div>` : ''}
                    <div class="text-muted" style="font-size: var(--text-xs);">
                      ${Math.round(meal.calories || 0)} cal · ${(meal.protein_g || 0).toFixed(1)}g P · ${(meal.carbs_g || 0).toFixed(1)}g C · ${(meal.fat_g || 0).toFixed(1)}g F
                    </div>
                  </div>
                  <div class="cluster">
                    <button class="btn btn-primary btn-sm" data-log-saved="${meal.id}">
                      <i class="fas fa-plus"></i> Log
                    </button>
                    <button class="btn btn-outline btn-icon btn-sm" data-edit-saved="${meal.id}">
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-outline btn-icon btn-sm text-danger" data-delete-saved="${meal.id}">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              `)}
        </div>
      `),
      actions: [
        { label: 'Close', variant: 'btn-outline' },
        { label: 'Create New', primary: true, onClick: (m) => { m.close(); showCreateSavedMeal(); } }
      ],
      onOpen: ({ element }) => {
        element.addEventListener('click', async (event) => {
          const logBtn = event.target.closest('[data-log-saved]');
          if (logBtn) {
            await logSavedMeal(parseInt(logBtn.getAttribute('data-log-saved'), 10));
            return;
          }
          const editBtn = event.target.closest('[data-edit-saved]');
          if (editBtn) {
            await editSavedMeal(parseInt(editBtn.getAttribute('data-edit-saved'), 10));
            return;
          }
          const delBtn = event.target.closest('[data-delete-saved]');
          if (delBtn) {
            await deleteSavedMeal(parseInt(delBtn.getAttribute('data-delete-saved'), 10));
          }
        });
      }
    });
  } catch (err) {
    toast.error(`Could not load saved meals: ${err.message}`);
  }
}

export function showCreateSavedMeal() {
  renderSavedMealForm({ mode: 'create' });
}

export async function editSavedMeal(mealId) {
  try {
    const data = await api.get(`/nutrition/saved-meals/${mealId}`);
    renderSavedMealForm({ mode: 'edit', mealId, meal: data.meal });
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

function renderSavedMealForm({ mode, mealId, meal = {} }) {
  openModal({
    title: mode === 'create' ? 'Create Saved Meal' : 'Edit Saved Meal',
    size: 'default',
    content: String(html`
      <div class="stack stack-sm">
        <div class="form-group">
          <label class="form-label">Name <span class="text-danger">*</span></label>
          <input type="text" id="sm-name" class="input" value="${meal.name || ''}" placeholder="e.g., Morning Oats" />
        </div>
        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <input type="text" id="sm-description" class="input" value="${meal.description || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Recipe URL (optional — we'll try to parse macros)</label>
          <div class="cluster">
            <input type="url" id="sm-recipe-url" class="input" value="${meal.recipe_url || ''}" placeholder="https://…" style="flex: 1;" />
            <button class="btn btn-outline btn-sm" id="sm-parse-url">
              <i class="fas fa-magic"></i> Parse
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2" style="gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label">Calories</label>
            <input type="number" id="sm-calories" class="input" value="${meal.calories || ''}" min="0" step="1" />
          </div>
          <div class="form-group">
            <label class="form-label">Protein (g)</label>
            <input type="number" id="sm-protein" class="input" value="${meal.protein_g || ''}" min="0" step="0.1" />
          </div>
          <div class="form-group">
            <label class="form-label">Carbs (g)</label>
            <input type="number" id="sm-carbs" class="input" value="${meal.carbs_g || ''}" min="0" step="0.1" />
          </div>
          <div class="form-group">
            <label class="form-label">Fat (g)</label>
            <input type="number" id="sm-fat" class="input" value="${meal.fat_g || ''}" min="0" step="0.1" />
          </div>
        </div>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: mode === 'create' ? 'Create' : 'Save',
        primary: true,
        onClick: async (modalApi) => {
          const payload = {
            name: modalApi.element.querySelector('#sm-name').value.trim(),
            description: modalApi.element.querySelector('#sm-description').value.trim(),
            recipe_url: modalApi.element.querySelector('#sm-recipe-url').value.trim(),
            calories: parseFloat(modalApi.element.querySelector('#sm-calories').value) || 0,
            protein_g: parseFloat(modalApi.element.querySelector('#sm-protein').value) || 0,
            carbs_g: parseFloat(modalApi.element.querySelector('#sm-carbs').value) || 0,
            fat_g: parseFloat(modalApi.element.querySelector('#sm-fat').value) || 0
          };

          if (!payload.name) {
            toast.warning('Please enter a name');
            return;
          }

          try {
            if (mode === 'create') {
              await api.post('/nutrition/saved-meals', payload);
            } else {
              await api.patch(`/nutrition/saved-meals/${mealId}`, payload);
            }
            toast.success(mode === 'create' ? 'Saved meal created!' : 'Saved meal updated!');
            modalApi.close();
            if (typeof window.loadNutrition === 'function') window.loadNutrition();
          } catch (err) {
            toast.error(`Error: ${err.message}`);
          }
        }
      }
    ],
    onOpen: ({ element }) => {
      element.querySelector('#sm-parse-url')?.addEventListener('click', async () => {
        const url = element.querySelector('#sm-recipe-url').value;
        if (!url) {
          toast.warning('Enter a URL first');
          return;
        }
        try {
          toast.info('Parsing recipe…');
          const data = await api.post('/nutrition/parse-recipe', { url });
          if (data.recipe) {
            if (data.recipe.name) element.querySelector('#sm-name').value = data.recipe.name;
            if (data.recipe.calories) element.querySelector('#sm-calories').value = Math.round(data.recipe.calories);
            if (data.recipe.protein_g) element.querySelector('#sm-protein').value = data.recipe.protein_g.toFixed(1);
            if (data.recipe.carbs_g) element.querySelector('#sm-carbs').value = data.recipe.carbs_g.toFixed(1);
            if (data.recipe.fat_g) element.querySelector('#sm-fat').value = data.recipe.fat_g.toFixed(1);
            toast.success(data.recipe.parsed ? 'Parsed!' : 'Partial parse — please fill remaining fields');
          }
        } catch (err) {
          toast.error(`Parse failed: ${err.message}`);
        }
      });
    }
  });
}

// Legacy alias
export const parseRecipeUrl = async () => {
  // No-op export for legacy compat; actual logic is inline in the form
};

export const createSavedMeal = async () => {
  // Handled inline in the form
};

export const updateSavedMeal = async (mealId) => {
  // Handled inline in the form
};

export async function logSavedMeal(mealId) {
  try {
    await api.post(`/nutrition/saved-meals/${mealId}/log`);
    toast.success('Meal logged!');
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export async function deleteSavedMeal(mealId) {
  const ok = await confirmDialog('Delete this saved meal?', {
    title: 'Delete saved meal?',
    confirmLabel: 'Delete',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;
  try {
    await api.delete(`/nutrition/saved-meals/${mealId}`);
    toast.success('Deleted');
    showSavedMeals();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

// ============================================================================
// Quick macro entry
// ============================================================================

const MACRO_PRESETS = [
  { name: 'Small snack', calories: 150, protein: 10, carbs: 20, fat: 3 },
  { name: 'Light meal', calories: 400, protein: 25, carbs: 45, fat: 12 },
  { name: 'Regular meal', calories: 600, protein: 35, carbs: 65, fat: 18 },
  { name: 'Large meal', calories: 900, protein: 50, carbs: 90, fat: 30 }
];

export function showQuickMacroEntry() {
  openModal({
    title: 'Quick Macro Entry',
    size: 'default',
    content: String(html`
      <div class="stack stack-md">
        <div>
          <div class="section-label">Presets</div>
          <div class="grid grid-cols-2" style="gap: var(--space-2);">
            ${MACRO_PRESETS.map((p) => html`
              <button class="macro-preset" data-preset="${p.calories},${p.protein},${p.carbs},${p.fat}">
                <strong>${p.name}</strong>
                <div class="text-muted" style="font-size: var(--text-xs);">
                  ${p.calories} cal · ${p.protein}g P
                </div>
              </button>
            `)}
          </div>
        </div>

        <div class="grid grid-cols-2" style="gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label">Calories</label>
            <input type="number" id="qm-calories" class="input" min="0" placeholder="400" />
          </div>
          <div class="form-group">
            <label class="form-label">Protein (g)</label>
            <input type="number" id="qm-protein" class="input" min="0" step="0.1" placeholder="25" />
          </div>
          <div class="form-group">
            <label class="form-label">Carbs (g)</label>
            <input type="number" id="qm-carbs" class="input" min="0" step="0.1" placeholder="45" />
          </div>
          <div class="form-group">
            <label class="form-label">Fat (g)</label>
            <input type="number" id="qm-fat" class="input" min="0" step="0.1" placeholder="12" />
          </div>
        </div>

        <label class="cluster" style="gap: var(--space-2); cursor: pointer;">
          <input type="checkbox" id="qm-save-too" />
          <span>Also save as a reusable meal</span>
        </label>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Log Meal',
        primary: true,
        onClick: async (modalApi) => {
          await logQuickMacros(modalApi);
        }
      }
    ],
    onOpen: ({ element }) => {
      element.addEventListener('click', (event) => {
        const preset = event.target.closest('[data-preset]');
        if (!preset) return;
        const [cal, p, c, f] = preset.getAttribute('data-preset').split(',');
        element.querySelector('#qm-calories').value = cal;
        element.querySelector('#qm-protein').value = p;
        element.querySelector('#qm-carbs').value = c;
        element.querySelector('#qm-fat').value = f;
      });
    }
  });
}

async function logQuickMacros(modalApi) {
  const el = modalApi.element;
  const calories = parseFloat(el.querySelector('#qm-calories').value) || 0;
  const protein = parseFloat(el.querySelector('#qm-protein').value) || 0;
  const carbs = parseFloat(el.querySelector('#qm-carbs').value) || 0;
  const fat = parseFloat(el.querySelector('#qm-fat').value) || 0;
  const saveToo = el.querySelector('#qm-save-too').checked;

  if (!calories && !protein && !carbs && !fat) {
    toast.warning('Enter at least one value');
    return;
  }

  try {
    // Log as a custom meal (no foods, just macros)
    await api.post('/nutrition/meals', {
      date: new Date().toISOString().split('T')[0],
      meal_type: 'snack',
      custom_macros: { calories, protein_g: protein, carbs_g: carbs, fat_g: fat }
    });

    if (saveToo) {
      const name = prompt('Name this meal for future use:');
      if (name) {
        await api.post('/nutrition/saved-meals', {
          name,
          calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat
        });
      }
    }

    toast.success('Meal logged!');
    modalApi.close();
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export function applyMacroPreset(calories, protein, carbs, fat) {
  document.getElementById('qm-calories')?.setAttribute('value', String(calories));
  document.getElementById('qm-protein')?.setAttribute('value', String(protein));
  document.getElementById('qm-carbs')?.setAttribute('value', String(carbs));
  document.getElementById('qm-fat')?.setAttribute('value', String(fat));
}

// ============================================================================
// Simple logging helpers
// ============================================================================

async function logMacro(entryType, amount, unit) {
  try {
    await api.post('/nutrition/entries', { entry_type: entryType, amount, unit });
    toast.success('Logged!');
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export const logProtein = (g) => logMacro('protein', g, 'g');
export const logWater = (ml) => logMacro('water', ml, 'ml');
export const logCreatine = (g) => logMacro('creatine', g, 'g');
export const addQuickProtein = (amount) => logProtein(amount);

export async function logAllQuick() {
  // Matches the modular nutrition screen's behavior
  const protein = parseFloat(document.getElementById('nq-protein')?.value) || 0;
  const water = parseFloat(document.getElementById('nq-water')?.value) || 0;
  const creatine = parseFloat(document.getElementById('nq-creatine')?.value) || 0;

  if (!protein && !water && !creatine) {
    toast.warning('Enter at least one value');
    return;
  }

  try {
    const ops = [];
    if (protein > 0) ops.push(api.post('/nutrition/entries', { entry_type: 'protein', amount: protein, unit: 'g' }));
    if (water > 0) ops.push(api.post('/nutrition/entries', { entry_type: 'water', amount: water, unit: 'ml' }));
    if (creatine > 0) ops.push(api.post('/nutrition/entries', { entry_type: 'creatine', amount: creatine, unit: 'g' }));
    await Promise.all(ops);

    ['nq-protein', 'nq-water', 'nq-creatine'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    toast.success('Logged!');
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

// ============================================================================
// Nutrition entries list (edit/delete individual entries)
// ============================================================================

export async function loadNutritionEntries() {
  try {
    const data = await api.get('/nutrition/entries/today');
    const entries = data.entries || [];

    openModal({
      title: "Today's Entries",
      size: 'default',
      content: String(html`
        <div class="stack stack-sm" style="max-height: 500px; overflow-y: auto;">
          ${entries.length === 0
            ? html`<div class="empty-state"><div class="empty-state-description">No entries today.</div></div>`
            : entries.map((e) => html`
                <div class="saved-meal-row">
                  <div>
                    <strong>${e.entry_type}</strong>
                    <div class="text-muted" style="font-size: var(--text-xs);">
                      ${Math.round(e.amount)}${e.unit} · ${new Date(e.logged_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-icon btn-sm text-danger" data-delete-entry="${e.id}">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `)}
        </div>
      `),
      actions: [{ label: 'Close', variant: 'btn-outline' }],
      onOpen: ({ element }) => {
        element.addEventListener('click', async (event) => {
          const btn = event.target.closest('[data-delete-entry]');
          if (!btn) return;
          await deleteNutritionEntry(parseInt(btn.getAttribute('data-delete-entry'), 10));
          closeTopModal();
          loadNutritionEntries();
        });
      }
    });
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export function editNutritionEntry(id, type, currentAmount) {
  // Simple inline prompt-based edit to keep code small
  const newAmount = prompt(`Edit ${type} amount:`, currentAmount);
  if (!newAmount) return;
  const parsed = parseFloat(newAmount);
  if (Number.isNaN(parsed)) {
    toast.warning('Invalid number');
    return;
  }
  saveNutritionEntryEdit(id, parsed);
}

export async function saveNutritionEntryEdit(id, newAmount) {
  try {
    await api.patch(`/nutrition/entries/${id}`, { amount: newAmount });
    toast.success('Updated');
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export async function deleteNutritionEntry(id) {
  try {
    await api.delete(`/nutrition/entries/${id}`);
    toast.success('Deleted');
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

// ============================================================================
// Daily nutrition log (edit/delete, export, trends filter/sort)
// ============================================================================

export function editNutritionLog(date, protein, water, creatine) {
  openModal({
    title: `Edit ${date}`,
    size: 'default',
    content: String(html`
      <div class="stack stack-sm">
        <div class="form-group">
          <label class="form-label">Protein (g)</label>
          <input type="number" id="nl-protein" class="input" value="${protein || 0}" min="0" step="1" />
        </div>
        <div class="form-group">
          <label class="form-label">Water (ml)</label>
          <input type="number" id="nl-water" class="input" value="${water || 0}" min="0" step="50" />
        </div>
        <div class="form-group">
          <label class="form-label">Creatine (g)</label>
          <input type="number" id="nl-creatine" class="input" value="${creatine || 0}" min="0" step="0.1" />
        </div>
      </div>
    `),
    actions: [
      { label: 'Delete', variant: 'btn-danger-outline',
        onClick: async (modalApi) => {
          await deleteNutritionLog(date);
          modalApi.close();
        } },
      { label: 'Cancel', variant: 'btn-outline' },
      { label: 'Save', primary: true,
        onClick: async (modalApi) => {
          const el = modalApi.element;
          const payload = {
            protein_grams: parseFloat(el.querySelector('#nl-protein').value) || 0,
            water_ml: parseFloat(el.querySelector('#nl-water').value) || 0,
            creatine_grams: parseFloat(el.querySelector('#nl-creatine').value) || 0
          };
          try {
            await api.patch(`/nutrition/logs/${date}`, payload);
            toast.success('Updated');
            modalApi.close();
            if (typeof window.loadNutrition === 'function') window.loadNutrition();
          } catch (err) {
            toast.error(`Error: ${err.message}`);
          }
        } }
    ]
  });
}

export async function saveNutritionEdit() {
  // Handled inline via the modal above
}

export async function deleteNutritionLog(date) {
  const ok = await confirmDialog(`Delete nutrition log for ${date}?`, {
    title: 'Delete log?',
    confirmLabel: 'Delete',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;
  try {
    await api.delete(`/nutrition/logs/${date}`);
    toast.success('Deleted');
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

export function exportNutritionCSV(type, days) {
  window.location.href = `/api/nutrition/export/csv?type=${type}&days=${days}`;
}

export function exportNutritionReport(days) {
  window.location.href = `/api/nutrition/export/report?days=${days}`;
}

// Weekly trends filter/sort — operate on DOM table rows if present
export function filterWeeklyTrends() {
  const filter = document.getElementById('trends-filter')?.value?.toLowerCase() || '';
  document.querySelectorAll('[data-week-start]').forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(filter) ? '' : 'none';
  });
}

export function sortWeeklyTrends() {
  const sortBy = document.getElementById('trends-sort')?.value;
  if (!sortBy) return;
  sortWeeklyTrendsByColumn(sortBy.split('-')[0], sortBy.endsWith('-asc'));
}

export function sortWeeklyTrendsByColumn(column, ascending = true) {
  const tbody = document.querySelector('[data-week-start]')?.parentElement;
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('[data-week-start]'));
  rows.sort((a, b) => {
    const av = parseFloat(a.getAttribute(`data-${column}`)) || 0;
    const bv = parseFloat(b.getAttribute(`data-${column}`)) || 0;
    return ascending ? av - bv : bv - av;
  });
  rows.forEach((r) => tbody.appendChild(r));
}
