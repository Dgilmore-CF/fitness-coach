/**
 * Meal Logger — full meal entry flow with food search, USDA, barcode.
 * Migrated from showLogMealModal + food search/barcode/meal-save functions.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { openModal, closeTopModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { playBarcodeDetected } from '@utils/audio';
import { createDecoder, hasCameraSupport, mapPointsToDisplay } from './barcode-decoder.js';

let state = {
  mealType: 'snack',
  selectedFoods: [],
  tempFood: null,
  scannedFood: null,
  scannerStream: null,
  scannerActive: false,
  scannerDecoder: null,
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
    scannerDecoder: null,
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
  const hasCamera = hasCameraSupport();

  openModal({
    title: 'Scan Barcode',
    size: 'default',
    content: String(html`
      <div class="barcode-scanner-layout">
        ${hasCamera
          ? html`
              <div id="barcode-scanner-container" class="barcode-scanner-container">
                <video id="barcode-video" playsinline muted autoplay></video>
                <div class="barcode-frame"></div>
                <svg id="barcode-highlight-svg" class="barcode-highlight-svg"
                     xmlns="http://www.w3.org/2000/svg"
                     preserveAspectRatio="none"></svg>
                <div id="barcode-scanner-status" class="barcode-scanner-status">
                  <i class="fas fa-circle-notch fa-spin"></i> Starting camera…
                </div>
                <div class="barcode-scanner-controls">
                  <button id="barcode-torch-btn" type="button"
                          class="barcode-control-btn"
                          hidden aria-pressed="false" title="Toggle flashlight">
                    <i class="fas fa-bolt"></i>
                  </button>
                </div>
                <div id="barcode-zoom-wrap" class="barcode-zoom-wrap" hidden>
                  <i class="fas fa-search-minus"></i>
                  <input type="range" id="barcode-zoom-slider"
                         class="barcode-zoom-slider"
                         min="1" max="5" step="0.1" value="1" aria-label="Zoom" />
                  <i class="fas fa-search-plus"></i>
                </div>
              </div>
              <p class="text-muted" style="font-size: var(--text-sm); text-align: center; margin: 0;">
                Point your camera at a UPC / EAN barcode. Pinch or use the slider to zoom.
              </p>
            `
          : html`
              <div class="card card-sunken" style="text-align: center; padding: var(--space-5);">
                <div style="font-size: 40px; margin-bottom: var(--space-2);">📷</div>
                <strong>Camera not available</strong>
                <p class="text-muted" style="font-size: var(--text-sm); margin-top: var(--space-2);">
                  This browser does not support camera access. Use manual entry below.
                </p>
              </div>
            `}

        <div class="form-group" style="margin: 0;">
          <label class="form-label">Enter barcode manually</label>
          <div class="cluster" style="gap: var(--space-2);">
            <input type="text" id="manual-barcode" class="input"
                   placeholder="UPC / EAN code (e.g. 012345678905)"
                   inputmode="numeric" autocomplete="off" style="flex: 1;" />
            <button class="btn btn-primary" data-action="lookup-barcode">
              <i class="fas fa-search"></i> Look up
            </button>
          </div>
        </div>

        <div id="barcode-result"></div>
      </div>
    `),
    actions: [{ label: 'Close', variant: 'btn-outline' }],
    onOpen: ({ element }) => {
      if (hasCamera) startBarcodeScanner();

      const input = element.querySelector('#manual-barcode');
      // On mobile we don't want to steal focus (pops up the keyboard over
      // the camera view). On desktop, focusing the input is fine.
      if (!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        input?.focus();
      }
      input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          lookupBarcode();
        }
      });

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

function setScannerStatus(text, spinner = false) {
  const statusEl = document.getElementById('barcode-scanner-status');
  if (!statusEl) return;
  statusEl.innerHTML = `${spinner ? '<i class="fas fa-circle-notch fa-spin"></i> ' : ''}${text}`;
}

// ============================================================================
// Success-detected visual highlight
//
// We draw a green polygon over the video using an <svg> overlay. Points
// come from ZXing and are in video-pixel coordinates; mapPointsToDisplay()
// converts them into CSS pixel coordinates matching the displayed frame.
// ============================================================================

let highlightTimer = null;

function drawHighlight(points) {
  const svg = document.getElementById('barcode-highlight-svg');
  const video = document.getElementById('barcode-video');
  if (!svg || !video) return;

  const rect = video.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  // Size the SVG viewport to match the displayed video
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  svg.setAttribute('width', rect.width);
  svg.setAttribute('height', rect.height);

  const mapped = mapPointsToDisplay(points, video);
  if (!mapped || mapped.length === 0) {
    svg.innerHTML = '';
    return;
  }

  const pointsAttr = mapped.map((p) => `${p.x},${p.y}`).join(' ');
  svg.innerHTML =
    `<polygon class="barcode-highlight-poly" points="${pointsAttr}" ` +
    `fill="rgba(34,197,94,0.25)" stroke="#22c55e" stroke-width="3" stroke-linejoin="round" />`;

  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    if (svg) svg.innerHTML = '';
  }, 600);
}

function clearHighlight() {
  const svg = document.getElementById('barcode-highlight-svg');
  if (svg) svg.innerHTML = '';
  if (highlightTimer) {
    clearTimeout(highlightTimer);
    highlightTimer = null;
  }
}

// ============================================================================
// Camera controls: torch, zoom (slider + pinch + double-tap)
// ============================================================================

function wireCameraControls(camera) {
  const torchBtn = document.getElementById('barcode-torch-btn');
  const zoomWrap = document.getElementById('barcode-zoom-wrap');
  const zoomSlider = document.getElementById('barcode-zoom-slider');
  const video = document.getElementById('barcode-video');

  // --- Torch toggle ---
  if (camera?.capabilities?.torch && torchBtn) {
    let torchOn = false;
    torchBtn.hidden = false;
    torchBtn.addEventListener('click', async () => {
      torchOn = !torchOn;
      const applied = await camera.setTorch(torchOn);
      if (applied) {
        torchBtn.classList.toggle('is-active', torchOn);
        torchBtn.setAttribute('aria-pressed', String(torchOn));
      } else {
        torchOn = !torchOn; // revert state on failure
        toast.info('Flashlight not available on this camera');
      }
    });
  }

  // --- Zoom (slider + pinch + double-tap) ---
  if (camera?.capabilities?.zoom && zoomWrap && zoomSlider && video) {
    const { min, max, step } = camera.capabilities.zoom;
    zoomSlider.min = String(min);
    zoomSlider.max = String(max);
    zoomSlider.step = String(step);
    zoomSlider.value = String(min);
    zoomWrap.hidden = false;

    let currentZoom = min;

    const applyZoom = (next) => {
      const clamped = Math.min(max, Math.max(min, next));
      if (Math.abs(clamped - currentZoom) < step / 2) return; // throttle
      currentZoom = clamped;
      zoomSlider.value = String(clamped);
      camera.setZoom(clamped);
    };

    zoomSlider.addEventListener('input', (e) => {
      applyZoom(parseFloat(e.target.value));
    });

    // Pinch: track two-touch distance and map ratio to zoom
    let pinchStart = null;
    video.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinchStart = {
          dist: pinchDistance(e.touches),
          zoom: currentZoom
        };
        e.preventDefault();
      }
    }, { passive: false });

    video.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinchStart) {
        const dist = pinchDistance(e.touches);
        const ratio = dist / pinchStart.dist;
        applyZoom(pinchStart.zoom * ratio);
        e.preventDefault();
      }
    }, { passive: false });

    video.addEventListener('touchend', () => {
      pinchStart = null;
    });

    // Double-tap: toggle 2× zoom
    let lastTap = 0;
    video.addEventListener('touchend', (e) => {
      if (e.changedTouches.length !== 1) return;
      const now = Date.now();
      if (now - lastTap < 350) {
        const midpoint = (min + max) / 2;
        applyZoom(currentZoom > midpoint ? min : midpoint);
        e.preventDefault();
      }
      lastTap = now;
    });
  }
}

function pinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

async function startBarcodeScanner() {
  const video = document.getElementById('barcode-video');
  const container = document.getElementById('barcode-scanner-container');
  if (!video) return;

  setScannerStatus('Starting camera…', true);

  // Dispose any prior decoder instance (e.g. if the modal was reopened quickly)
  if (state.scannerDecoder) {
    try { state.scannerDecoder.stop(); } catch {}
  }

  const decoder = createDecoder();
  state.scannerDecoder = decoder;
  state.scannerActive = true;

  const handleResult = async (barcode, result) => {
    if (!state.scannerActive) return;

    // Draw the highlight overlay on EVERY detected frame so the user gets
    // immediate visual feedback. This can fire multiple times in quick
    // succession — state.scannerActive gates the actual lookup below.
    if (result?.points) drawHighlight(result.points);

    // First successful detection "wins" — freeze, beep, vibrate, look up.
    state.scannerActive = false;
    decoder.stop();
    state.scannerDecoder = null;

    // Sensory feedback
    try { playBarcodeDetected(); } catch {}
    try { if (navigator.vibrate) navigator.vibrate(80); } catch {}

    setScannerStatus(`Found: ${barcode}`, false);

    const input = document.getElementById('manual-barcode');
    if (input) input.value = barcode;

    // Short delay so the highlight + beep register before modal changes
    await new Promise((r) => setTimeout(r, 250));
    await lookupBarcode();
  };

  const handleError = (err) => {
    console.warn('Scanner error:', err);
    state.scannerActive = false;
    if (!container) return;

    const code = err?.name || err?.message;
    let message = 'Camera unavailable — use manual entry below.';
    if (code === 'NotAllowedError' || code === 'PermissionDeniedError') {
      message = 'Camera access was denied. Enable permissions or use manual entry below.';
    } else if (code === 'NotFoundError' || code === 'DevicesNotFoundError') {
      message = 'No camera found on this device. Use manual entry below.';
    } else if (code === 'camera-unsupported') {
      message = 'This browser does not expose the camera API. Use manual entry below.';
    }

    container.innerHTML = String(html`
      <div style="text-align: center; padding: var(--space-5);">
        <div style="font-size: 40px;">📷</div>
        <strong>Camera blocked</strong>
        <p class="text-muted" style="font-size: var(--text-sm); margin-top: var(--space-2);">${message}</p>
      </div>
    `);
  };

  const { camera } = await decoder.start(video, handleResult, handleError);

  if (state.scannerActive) {
    setScannerStatus('Looking for a barcode…', true);
  }
  if (camera) {
    wireCameraControls(camera);
  }
}

function stopBarcodeScanner() {
  state.scannerActive = false;
  clearHighlight();
  if (state.scannerDecoder) {
    try { state.scannerDecoder.stop(); } catch {}
    state.scannerDecoder = null;
  }
  // Legacy stream cleanup for backward compat
  if (state.scannerStream) {
    state.scannerStream.getTracks?.().forEach((t) => t.stop());
    state.scannerStream = null;
  }
}

// Auto-detect a reasonable meal type based on local time of day.
// Used as the default when the barcode scanner is opened standalone
// (no parent meal-logger modal carrying an explicit meal type).
function autoMealTypeByTime(date = new Date()) {
  const h = date.getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 21) return 'dinner';
  return 'snack';
}

// Ensure a scanned food has an id in our `foods` table. The barcode
// endpoint already UPSERTs, so `food.id` is almost always set — but
// fall back to POST /nutrition/foods if a caller somehow loses it.
async function ensureFoodPersisted(food) {
  if (food && food.id) return food;
  if (!food) throw new Error('No food data to save');
  const saved = await api.post('/nutrition/foods', food);
  return saved.food;
}

async function lookupBarcode() {
  const input = document.getElementById('manual-barcode');
  const barcode = input?.value?.trim();
  if (!barcode) {
    toast.warning('Enter a barcode');
    return;
  }
  // Basic barcode validation: UPC-A (12), EAN-13 (13), EAN-8 (8), UPC-E (8)
  if (!/^\d{8,14}$/.test(barcode)) {
    toast.warning('Barcode should be 8–14 digits');
    return;
  }

  const resultEl = document.getElementById('barcode-result');
  if (resultEl) {
    resultEl.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Looking up…</div>';
  }

  try {
    const data = await api.get(`/nutrition/foods/barcode/${encodeURIComponent(barcode)}`);
    const food = data.food;

    if (!food) {
      if (resultEl) {
        resultEl.innerHTML = String(html`
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">Not found</div>
            <div class="empty-state-description">
              ${data.error || `No product matches barcode ${barcode} in Open Food Facts. Try searching the name instead.`}
            </div>
          </div>
        `);
      }
      return;
    }

    // Detect whether the scanner was opened from inside the meal-logger
    // modal (Path A) or standalone from the Nutrition screen (Path B).
    // Path B used to silently do nothing after a scan — now it lets the
    // user log the food immediately, save it to favorites, or promote
    // the scan into a full meal builder.
    const isInMealLogger = !!document.getElementById('meal-selected-foods');
    const defaultMealType = isInMealLogger ? state.mealType : autoMealTypeByTime();

    if (!resultEl) return;

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

        ${isInMealLogger
          ? html`
              <button class="btn btn-primary btn-block" id="add-scanned-food">
                <i class="fas fa-plus"></i> Add to Meal
              </button>
            `
          : html`
              <div class="barcode-log-controls">
                <label class="form-label" style="margin: 0;">Quantity</label>
                <input type="number" id="scan-qty" class="input"
                       min="0.25" step="0.25" value="1"
                       style="max-width: 6rem;" />
                <label class="form-label" style="margin: 0;">Meal</label>
                <select id="scan-meal-type" class="input" style="flex: 1; min-width: 8rem;">
                  <option value="breakfast" ${defaultMealType === 'breakfast' ? 'selected' : ''}>Breakfast</option>
                  <option value="lunch" ${defaultMealType === 'lunch' ? 'selected' : ''}>Lunch</option>
                  <option value="dinner" ${defaultMealType === 'dinner' ? 'selected' : ''}>Dinner</option>
                  <option value="snack" ${defaultMealType === 'snack' ? 'selected' : ''}>Snack</option>
                </select>
              </div>
              <div class="cluster" style="margin-top: var(--space-3);">
                <button class="btn btn-primary" id="scan-log-now" style="flex: 1;">
                  <i class="fas fa-check"></i> Log It
                </button>
                <button class="btn btn-outline" id="scan-save-favorite" title="Save this food to your Favorites">
                  <i class="far fa-star"></i> Save
                </button>
              </div>
              <button class="btn btn-ghost btn-sm btn-block" id="scan-build-meal"
                      style="margin-top: var(--space-2);">
                <i class="fas fa-utensils"></i> Build a full meal with this
              </button>
            `}
      </div>
    `);

    if (isInMealLogger) {
      // Legacy path: add to the open meal-logger's selection buffer.
      document.getElementById('add-scanned-food')?.addEventListener('click', async () => {
        try {
          const toAdd = await ensureFoodPersisted(food);
          state.selectedFoods.push({ food_id: toAdd.id, food: toAdd, quantity: 1, unit: 'serving' });
          closeTopModal();
          updateSelectedFoodsDisplay();
          toast.success(`Added ${toAdd.name}`);
        } catch (err) {
          toast.error(`Error: ${err.message}`);
        }
      });
      return;
    }

    // Standalone path: three actions.

    // 1) Log It — quick-add a single-food meal to today in the chosen meal slot.
    document.getElementById('scan-log-now')?.addEventListener('click', async () => {
      const qty = parseFloat(document.getElementById('scan-qty')?.value) || 1;
      const mealType = document.getElementById('scan-meal-type')?.value || defaultMealType;
      try {
        const toAdd = await ensureFoodPersisted(food);
        await api.post('/nutrition/quick-add', {
          food_id: toAdd.id,
          quantity: qty,
          unit: 'serving',
          meal_type: mealType
        });
        closeTopModal();
        toast.success(`Logged ${toAdd.name}`);
        if (typeof window.loadNutrition === 'function') window.loadNutrition();
      } catch (err) {
        toast.error(`Error logging food: ${err.message}`);
      }
    });

    // 2) Save — toggle the food as a user favorite so it shows up in the
    //    Favorites list on future meal logs, without creating a meal entry.
    document.getElementById('scan-save-favorite')?.addEventListener('click', async () => {
      try {
        const toAdd = await ensureFoodPersisted(food);
        const res = await api.post(`/nutrition/foods/${toAdd.id}/favorite`);
        toast.success(res?.is_favorite ? 'Saved to Favorites' : 'Removed from Favorites');
      } catch (err) {
        toast.error(`Error: ${err.message}`);
      }
    });

    // 3) Build a full meal — close the scanner, open the meal logger with
    //    this food pre-loaded so the user can keep adding items and save
    //    one combined meal.
    document.getElementById('scan-build-meal')?.addEventListener('click', async () => {
      try {
        const toAdd = await ensureFoodPersisted(food);
        const mealType = document.getElementById('scan-meal-type')?.value || defaultMealType;
        state.selectedFoods.push({ food_id: toAdd.id, food: toAdd, quantity: 1, unit: 'serving' });
        closeTopModal();
        await showLogMealModal(mealType, /* preserveFoods */ true);
      } catch (err) {
        toast.error(`Error: ${err.message}`);
      }
    });
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
