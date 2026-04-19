/**
 * Entry point for the refactored frontend.
 *
 * Two modes:
 *   1. Vite dev server (`npm run dev:frontend`) — shows a scaffolding status
 *      page so we can verify tooling. The legacy `public/app.js` is NOT
 *      served here because the Vite dev server serves `frontend/index.html`.
 *
 *   2. Production (served from the Worker) — runs alongside the legacy
 *      `public/app.js`. The bridge installs modular screen handlers on top
 *      of legacy globals so individual tabs can be migrated one at a time
 *      without breaking the others.
 */

import { html } from '@core/html';
import { store } from '@core/state';
import { api } from '@core/api';
import { toast } from '@ui/Toast';
import { openModal, confirmDialog } from '@ui/Modal';
import { progressRing } from '@ui/ProgressRing';

import { initBridge, registerScreen } from './bridge.js';
import { loadLearn } from './screens/learn.js';

// Expose for debugging and for legacy-code bridging
window.__fitnessApp = {
  store,
  api,
  toast,
  openModal,
  confirmDialog
};

// -----------------------------------------------------------------------------
// Register modular screens that replace legacy `load*` functions.
// Each registered screen takes over its tab; unregistered tabs fall back
// to the legacy implementation.
// -----------------------------------------------------------------------------
registerScreen('learn', 'loadLearn', loadLearn);

// Install overrides once legacy globals are defined.
// (In Vite dev mode there are no legacy globals, so this is a no-op.)
initBridge();

// -----------------------------------------------------------------------------
// Dev-only scaffolding status page (runs under `vite dev` on :3000 only)
// -----------------------------------------------------------------------------
function mountScaffoldingStatus() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = html`
    <div class="app-shell">
      <header class="app-header">
        <div class="cluster cluster-between">
          <div class="cluster gap-2">
            <i class="fas fa-dumbbell text-primary" style="font-size: 24px;"></i>
            <div>
              <div class="card-title" style="font-size: var(--text-lg);">AI Fitness Coach</div>
              <div class="text-muted" style="font-size: var(--text-xs);">v2 Refactor Scaffolding</div>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" data-action="toggle-theme">
            <i class="fas fa-circle-half-stroke"></i> Theme
          </button>
        </div>
      </header>

      <main class="app-main">
        <div class="stack stack-lg container container-narrow">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title"><i class="fas fa-check-circle"></i> Foundation Ready</h2>
            </div>
            <p class="text-secondary">
              The v2 foundation is installed. Migrated screens:
              <strong>${['Learn'].join(', ')}</strong>.
            </p>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title"><i class="fas fa-vial"></i> Component Smoke Tests</h2>
            </div>
            <div class="cluster">
              <button class="btn btn-primary" data-action="test-toast">
                <i class="fas fa-bell"></i> Test Toast
              </button>
              <button class="btn btn-outline" data-action="test-modal">
                <i class="fas fa-layer-group"></i> Test Modal
              </button>
              <button class="btn btn-outline" data-action="test-confirm">
                <i class="fas fa-question-circle"></i> Test Confirm
              </button>
              <button class="btn btn-outline" data-action="test-ring">
                <i class="fas fa-circle-notch"></i> Test Progress Ring
              </button>
              <button class="btn btn-outline" data-action="test-learn">
                <i class="fas fa-graduation-cap"></i> Test Learn Screen
              </button>
            </div>
          </div>

          <div id="learn-preview" class="card" style="display: none;">
            <div class="card-header">
              <h2 class="card-title">Learn screen preview</h2>
              <button class="btn btn-ghost btn-sm" data-action="hide-learn">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div id="learn"></div>
          </div>
        </div>
      </main>
    </div>
  `;

  appEl.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.getAttribute('data-action');
    if (!action) return;

    switch (action) {
      case 'toggle-theme': {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        store.set('ui.theme', next);
        toast.success(`Switched to ${next} mode`);
        break;
      }
      case 'test-toast':
        toast.success('Toast notifications are working!');
        setTimeout(() => toast.info('Stacking works too'), 300);
        break;
      case 'test-modal':
        openModal({
          title: 'Modal Test',
          content: html`
            <p>This modal includes:</p>
            <ul style="padding-left: var(--space-5); color: var(--color-text-secondary); margin-top: var(--space-2);">
              <li>Focus trap</li>
              <li>ESC to dismiss</li>
              <li>Click-outside to dismiss</li>
              <li>Bottom-sheet on mobile</li>
            </ul>
          `,
          actions: [
            { label: 'Cancel', variant: 'btn-outline' },
            { label: 'OK', primary: true, onClick: (api) => api.close('ok') }
          ]
        });
        break;
      case 'test-confirm': {
        const confirmed = await confirmDialog('Delete this workout? This cannot be undone.', {
          title: 'Delete workout?',
          confirmLabel: 'Delete',
          confirmVariant: 'btn-danger'
        });
        toast.show(confirmed ? 'Confirmed!' : 'Cancelled', {
          type: confirmed ? 'success' : 'info'
        });
        break;
      }
      case 'test-ring':
        openModal({
          title: 'Progress Rings',
          content: html`
            <div class="cluster" style="justify-content: center; gap: var(--space-6);">
              <div style="text-align: center;">
                ${progressRing({ value: 85, max: 160, size: 120, unit: 'g', color: 'var(--color-secondary)' })}
                <div class="stat-label" style="margin-top: var(--space-2);">Protein</div>
              </div>
              <div style="text-align: center;">
                ${progressRing({ value: 1800, max: 2500, size: 120, unit: 'ml', color: 'var(--color-primary)' })}
                <div class="stat-label" style="margin-top: var(--space-2);">Water</div>
              </div>
              <div style="text-align: center;">
                ${progressRing({ value: 5, max: 5, size: 120, unit: 'g', color: 'var(--color-warning)' })}
                <div class="stat-label" style="margin-top: var(--space-2);">Creatine</div>
              </div>
            </div>
          `
        });
        break;
      case 'test-learn':
        document.getElementById('learn-preview').style.display = '';
        loadLearn();
        break;
      case 'hide-learn':
        document.getElementById('learn-preview').style.display = 'none';
        break;
    }
  });
}

// Only mount the scaffolding UI when running under the Vite dev server.
// In production, the legacy `public/app.js` still owns #app.
if (import.meta.env && import.meta.env.DEV) {
  document.addEventListener('DOMContentLoaded', mountScaffoldingStatus);
}

export { store, api, toast, openModal, confirmDialog };
