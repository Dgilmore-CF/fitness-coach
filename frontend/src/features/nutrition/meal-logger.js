/**
 * Meal Logger — full meal entry flow with food search, USDA, barcode.
 * Migrated from showLogMealModal + food search/barcode/meal-save functions.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { openModal, closeTopModal } from '@ui/Modal';
import { toast } from '@ui/Toast';

let state = {
  mealType: 'snack',
  selectedFoods: [],
  tempFood: null,
  scannedFood: null,
  scannerStream: null,
  scannerActive: false,
  searchDebounce: null
};

function resetState() {
  state = {
    mealType: 'snack',
    selectedFoods: [],
    tempFood: null,
    scannedFood: null,
    scannerStream: null,
    scannerActive: false,
    searchDebounce: null
  };
}

export async function showLogMealModal(mealType = 'snack', preserveFoods = false) {
  if (!preserveFoods) {
    state.selectedFoods = [];
  }
  state.mealType = mealType;

  const modal = openModal({
    title: `Log ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
    size: 'wide',
    content: String(html`
      <div class="stack stack-md">
        <div class="meal-type-selector">
          ${['breakfast', 'lunch', 'dinner', 'snack'].map((t) => html`
            <label class="meal-type-label ${t === mealType ? 'is-selected' : ''}">
              <input type="radio" name="meal-type-radio" value="${t}" ${t === mealType ? 'checked' : ''} />
              ${t.charAt(0).toUpperCase() + t.slice(1)}
            </label>
          `)}
        </div>

        <div class="form-group">
          <label class="form-label">Search foods</label>
          <input type="text" id="meal-food-search" class="input" placeholder="e.g., chicken breast, greek yogurt…" />
        </div>

        <div class="cluster">
          <button class="btn btn-outline btn-sm" data-action="search-usda">
            <i class="fas fa-database"></i> Search USDA
          </button>
          <button class="btn btn-outline btn-sm" data-action="show-favorites">
            <i class="fas fa-star"></i> Favorites
          </button>
          <button class="btn btn-outline btn-sm" data-action="show-barcode">
            <i class="fas fa-barcode"></i> Scan Barcode
          </button>
        </div>

        <div id="meal-search-results"></div>

        <div class="card" id="meal-totals-card" ${state.selectedFoods.length === 0 ? 'hidden' : ''}>
          <div class="card-header">
            <h3 class="card-title">Selected Foods</h3>
          </div>
          <div id="meal-selected-foods"></div>
          <div id="meal-totals-row" class="meal-totals-row"></div>
        </div>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Save Meal',
        primary: true,
        onClick: async (modalApi) => {
          await saveMeal();
          modalApi.close();
          resetState();
          if (typeof window.loadNutrition === 'function') window.loadNutrition();
        }
      }
    ],
    onOpen: ({ element }) => {
      attachHandlers(element);
      updateSelectedFoodsDisplay();
      // Load favorites initially
      loadFavoriteFoods();
    },
    onClose: resetState
  });
}

function attachHandlers(modalEl) {
  // Search with debounce
  const searchInput = modalEl.querySelector('#meal-food-search');
  searchInput?.addEventListener('input', (e) => {
    if (state.searchDebounce) clearTimeout(state.searchDebounce);
    const query = e.target.value;
    state.searchDebounce = setTimeout(() => searchFoods(query), 300);
  });

  modalEl.addEventListener('change', (event) => {
    if (event.target.name === 'meal-type-radio') {
      state.mealType = event.target.value;
      modalEl.querySelectorAll('.meal-type-label').forEach((l) => {
        l.classList.toggle('is-selected', l.querySelector('input').checked);
      });
    }
  });

  modalEl.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');

    if (action === 'search-usda') {
      await searchFoodsUSDA();
    } else if (action === 'show-favorites') {
      await loadFavoriteFoods();
    } else if (action === 'show-barcode') {
      showBarcodeScanner();
    } else if (action === 'select-food') {
      const foodId = parseInt(target.getAttribute('data-food-id'), 10);
      const foodJson = target.getAttribute('data-food-json');
      if (foodJson) {
        try {
          selectFood(JSON.parse(foodJson));
        } catch (err) {
          console.error('Failed to parse food:', err);
        }
      }
    } else if (action === 'remove-food') {
      const idx = parseInt(target.getAttribute('data-index'), 10);
      state.selectedFoods.splice(idx, 1);
      updateSelectedFoodsDisplay();
    }
  });
}

async function searchFoods(query) {
  if (!query || query.length < 2) {
    const results = document.getElementById('meal-search-results');
    if (results) results.innerHTML = '';
    return;
  }

  try {
    const data = await api.get(`/nutrition/foods/search?q=${encodeURIComponent(query)}`);
    if (data.error) {
      console.warn('Local food search returned error:', data.error);
    }
    renderResults(data.foods || [], 'local');
  } catch (err) {
    console.warn('Food search failed:', err);
  }
}

async function searchFoodsUSDA() {
  const input = document.getElementById('meal-food-search');
  const query = input?.value?.trim();
  if (!query || query.length < 2) {
    toast.warning('Enter at least 2 characters to search USDA');
    return;
  }

  const resultsEl = document.getElementById('meal-search-results');
  if (resultsEl) {
    resultsEl.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching USDA…</div>';
  }

  try {
    const data = await api.get(`/nutrition/foods/search/usda?q=${encodeURIComponent(query)}`);

    // Backend returns 200 with `{ foods: [], error, source }` for recoverable
    // failures (rate limits, network blips, etc.). Surface that to the user.
    if (data.error) {
      toast.error(data.error);
    }

    if (!data.foods || data.foods.length === 0) {
      if (resultsEl) {
        const msg = data.error || `No USDA results found for "${query}".`;
        resultsEl.innerHTML = String(html`
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-description">${msg}</div>
          </div>
        `);
      }
      return;
    }

    renderResults(data.foods, 'USDA');
  } catch (err) {
    // Uncaught failures (network, auth, unexpected 500) bubble here
    console.error('USDA search failed:', err);
    toast.error(`USDA search failed: ${err.message}`);
    if (resultsEl) {
      resultsEl.innerHTML = String(html`
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-description">${err.message}</div>
        </div>
      `);
    }
  }
}

async function loadFavoriteFoods() {
  try {
    const data = await api.get('/nutrition/foods/favorites');
    renderResults(data.foods || [], 'favorites');
  } catch (err) {
    console.warn('Could not load favorites:', err);
  }
}

function renderResults(foods, source) {
  const container = document.getElementById('meal-search-results');
  if (!container) return;

  if (foods.length === 0) {
    container.innerHTML = String(html`
      <div class="empty-state">
        <div class="empty-state-description">No foods found.</div>
      </div>
    `);
    return;
  }

  container.innerHTML = String(html`
    <div class="stack stack-sm">
      ${foods.map((food) => html`
        <button class="food-result" data-action="select-food" data-food-id="${food.id || ''}" data-food-json='${JSON.stringify(food).replace(/'/g, '&apos;')}'>
          <div style="flex: 1; min-width: 0;">
            <strong>${food.name}</strong>
            ${food.brand ? html`<span class="text-muted" style="font-size: var(--text-xs); margin-left: var(--space-2);">${food.brand}</span>` : ''}
            <div class="text-muted" style="font-size: var(--text-xs);">
              ${Math.round(food.calories || 0)} cal ·
              ${(food.protein_g || 0).toFixed(1)}g P ·
              ${(food.carbs_g || 0).toFixed(1)}g C ·
              ${(food.fat_g || 0).toFixed(1)}g F
              · <span style="opacity: 0.6;">${food.serving_description || `${food.serving_size || 100}${food.serving_unit || 'g'}`}</span>
            </div>
          </div>
          <i class="fas fa-plus-circle text-primary"></i>
        </button>
      `)}
    </div>
  `);
}

function selectFood(food) {
  const quantity = 1;
  const unit = 'serving';
  state.selectedFoods.push({
    food_id: food.id,
    food,
    quantity,
    unit
  });
  updateSelectedFoodsDisplay();
  toast.success(`Added ${food.name}`);
}

function updateSelectedFoodsDisplay() {
  const listEl = document.getElementById('meal-selected-foods');
  const totalsCard = document.getElementById('meal-totals-card');
  const totalsRow = document.getElementById('meal-totals-row');
  if (!listEl) return;

  if (state.selectedFoods.length === 0) {
    totalsCard?.setAttribute('hidden', '');
    listEl.innerHTML = '';
    return;
  }

  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  listEl.innerHTML = String(html`
    ${state.selectedFoods.map((item, idx) => {
      const mult = item.unit === 'serving' ? item.quantity : item.quantity / (item.food.serving_size || 100);
      const cals = (item.food.calories || 0) * mult;
      const protein = (item.food.protein_g || 0) * mult;
      const carbs = (item.food.carbs_g || 0) * mult;
      const fat = (item.food.fat_g || 0) * mult;
      totals.calories += cals;
      totals.protein += protein;
      totals.carbs += carbs;
      totals.fat += fat;

      return html`
        <div class="meal-selected-food">
          <div>
            <strong>${item.food.name}</strong>
            <div class="text-muted" style="font-size: var(--text-xs);">
              ${item.quantity} ${item.unit} · ${Math.round(cals)} cal
            </div>
          </div>
          <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="remove-food" data-index="${idx}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    })}
  `);

  totalsRow.innerHTML = String(html`
    <span class="meal-total-cal">
      <strong>${Math.round(totals.calories)}</strong> cal
    </span>
    <span class="text-success">
      <strong>${totals.protein.toFixed(1)}</strong>g P
    </span>
    <span class="text-primary">
      <strong>${totals.carbs.toFixed(1)}</strong>g C
    </span>
    <span class="text-warning">
      <strong>${totals.fat.toFixed(1)}</strong>g F
    </span>
  `);

  totalsCard.removeAttribute('hidden');
}

async function saveMeal() {
  if (state.selectedFoods.length === 0) {
    toast.warning('Add at least one food');
    return;
  }

  try {
    await api.post('/nutrition/meals', {
      date: new Date().toISOString().split('T')[0],
      meal_type: state.mealType,
      foods: state.selectedFoods.map((item) => {
        const payload = {
          quantity: item.quantity,
          unit: item.unit
        };
        // For local-DB foods (already saved), send the id.
        // For USDA / Open Food Facts results (id: null), send the full food
        // object so the backend can persist it before linking to the meal.
        if (item.food_id) {
          payload.food_id = item.food_id;
        } else if (item.food) {
          payload.food = item.food;
        }
        return payload;
      })
    });
    toast.success('Meal logged!');
  } catch (err) {
    toast.error(`Error: ${err.message}`);
  }
}

// ============================================================================
// Barcode scanner
// ============================================================================

export function showBarcodeScanner() {
  openModal({
    title: 'Scan Barcode',
    size: 'default',
    content: String(html`
      <div style="text-align: center;">
        <div id="barcode-scanner-container" style="position: relative; width: 100%; max-width: 400px; margin: 0 auto;">
          <video id="barcode-video" style="width: 100%; border-radius: var(--radius-md); background: #000;"></video>
          <div class="barcode-frame"></div>
        </div>

        <p class="text-muted" style="margin: var(--space-4) 0;">Position the barcode within the frame.</p>

        <div class="form-group">
          <label class="form-label">Or enter barcode manually:</label>
          <div class="cluster">
            <input type="text" id="manual-barcode" class="input" placeholder="UPC/EAN code" style="flex: 1;" />
            <button class="btn btn-primary" data-action="lookup-barcode">
              <i class="fas fa-search"></i> Lookup
            </button>
          </div>
        </div>

        <div id="barcode-result" style="margin-top: var(--space-4);"></div>
      </div>
    `),
    actions: [{ label: 'Close', variant: 'btn-outline' }],
    onOpen: ({ element }) => {
      startBarcodeScanner();
      element.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action="lookup-barcode"]');
        if (target) lookupBarcode();
      });
    },
    onClose: () => {
      stopBarcodeScanner();
    }
  });
}

async function startBarcodeScanner() {
  const video = document.getElementById('barcode-video');
  if (!video || !navigator.mediaDevices?.getUserMedia) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    video.srcObject = stream;
    await video.play();
    state.scannerStream = stream;
    state.scannerActive = true;

    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      detectLoop(video, detector);
    }
  } catch (err) {
    const container = document.getElementById('barcode-scanner-container');
    if (container) {
      container.innerHTML = String(html`
        <div class="empty-state">
          <div class="empty-state-icon">📷</div>
          <div class="empty-state-description">Camera unavailable — use manual entry below.</div>
        </div>
      `);
    }
  }
}

async function detectLoop(video, detector) {
  if (!state.scannerActive || !video.srcObject || !document.body.contains(video)) return;
  if (video.readyState < 2 || !video.videoWidth) {
    setTimeout(() => detectLoop(video, detector), 100);
    return;
  }
  try {
    const codes = await detector.detect(video);
    if (codes.length > 0) {
      const barcode = codes[0].rawValue;
      stopBarcodeScanner();
      const input = document.getElementById('manual-barcode');
      if (input) input.value = barcode;
      await lookupBarcode();
      return;
    }
  } catch {
    // ignore
  }
  if (state.scannerActive) setTimeout(() => detectLoop(video, detector), 100);
}

function stopBarcodeScanner() {
  state.scannerActive = false;
  state.scannerStream?.getTracks().forEach((t) => t.stop());
  state.scannerStream = null;
}

async function lookupBarcode() {
  const input = document.getElementById('manual-barcode');
  const barcode = input?.value?.trim();
  if (!barcode) {
    toast.warning('Enter a barcode');
    return;
  }
  const resultEl = document.getElementById('barcode-result');
  if (resultEl) resultEl.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Looking up…</div>';

  try {
    const data = await api.get(`/nutrition/foods/barcode/${encodeURIComponent(barcode)}`);
    const food = data.food;
    if (!food) {
      if (resultEl) resultEl.innerHTML = String(html`<div class="empty-state"><div class="empty-state-description">Product not found.</div></div>`);
      return;
    }

    if (resultEl) {
      resultEl.innerHTML = String(html`
        <div class="card card-sunken">
          <h3>${food.name}</h3>
          ${food.brand ? html`<p class="text-muted" style="font-size: var(--text-sm);">${food.brand}</p>` : ''}
          <div class="barcode-macros">
            <div><strong>${Math.round(food.calories || 0)}</strong><br><span class="text-muted">cal</span></div>
            <div class="text-success"><strong>${(food.protein_g || 0).toFixed(1)}g</strong><br><span class="text-muted">P</span></div>
            <div class="text-primary"><strong>${(food.carbs_g || 0).toFixed(1)}g</strong><br><span class="text-muted">C</span></div>
            <div class="text-warning"><strong>${(food.fat_g || 0).toFixed(1)}g</strong><br><span class="text-muted">F</span></div>
          </div>
          <button class="btn btn-primary btn-block" id="add-scanned-food">
            <i class="fas fa-plus"></i> Add to Meal
          </button>
        </div>
      `);

      document.getElementById('add-scanned-food')?.addEventListener('click', async () => {
        let toAdd = food;
        if (!toAdd.id && toAdd.source) {
          try {
            const saved = await api.post('/nutrition/foods', toAdd);
            toAdd = saved.food;
          } catch (err) {
            toast.error(`Error saving food: ${err.message}`);
            return;
          }
        }
        state.selectedFoods.push({ food_id: toAdd.id, food: toAdd, quantity: 1, unit: 'serving' });
        closeTopModal();
        updateSelectedFoodsDisplay();
        toast.success(`Added ${toAdd.name}`);
      });
    }
  } catch (err) {
    if (resultEl) resultEl.innerHTML = `<div class="empty-state"><div class="empty-state-description text-danger">${err.message}</div></div>`;
  }
}

// Legacy compat exports
export function selectMealType(type) {
  state.mealType = type;
}

export function quickAddFood(foodId, mealType = 'snack') {
  return api.post('/nutrition/quick-add', {
    food_id: foodId,
    quantity: 1,
    unit: 'serving',
    meal_type: mealType
  }).then(() => {
    toast.success('Food added!');
    if (typeof window.loadNutrition === 'function') window.loadNutrition();
  }).catch((err) => toast.error(`Error: ${err.message}`));
}
