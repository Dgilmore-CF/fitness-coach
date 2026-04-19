/**
 * Entry point for the refactored frontend.
 *
 * NOTE: During the refactor this module is NOT yet the primary app UI.
 * The legacy `public/app.js` is still the primary entry served by the
 * Worker. This Vite-built module is progressively absorbing screens from
 * the legacy code until the migration is complete.
 *
 * The dev-server mode of this entry shows a scaffolding status page so we
 * can verify the tooling works end-to-end.
 */

import { html } from '@core/html';
import { store } from '@core/state';
import { api } from '@core/api';
import { toast } from '@ui/Toast';
import { openModal, confirmDialog } from '@ui/Modal';
import { progressRing } from '@ui/ProgressRing';

// Expose for debugging & for the eventual legacy-code bridge
window.__fitnessApp = {
  store,
  api,
  toast,
  openModal,
  confirmDialog
};

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
              The v2 foundation is installed. Core, UI, and utilities are in place.
              Refactor screens will be added progressively in Phase 3.
            </p>
          </div>

          <div class="grid grid-cols-auto">
            ${['core', 'utils', 'ui', 'screens', 'features', 'services'].map((dir) => html`
              <div class="card card-compact">
                <div class="stat-label">frontend/src/${dir}</div>
                <div class="stat-value" style="font-size: var(--text-xl);">Ready</div>
              </div>
            `)}
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
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  // Wire up test actions
  appEl.addEventListener('click', (e) => {
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
      case 'test-confirm':
        confirmDialog('Delete this workout? This cannot be undone.', {
          title: 'Delete workout?',
          confirmLabel: 'Delete',
          confirmVariant: 'btn-danger'
        }).then((confirmed) => {
          toast.show(confirmed ? 'Confirmed!' : 'Cancelled', {
            type: confirmed ? 'success' : 'info'
          });
        });
        break;
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
    }
  });
}

// Only mount the scaffolding UI when running under the Vite dev server.
// In production, the legacy `public/app.js` still owns the DOM at #app.
if (import.meta.env && import.meta.env.DEV) {
  document.addEventListener('DOMContentLoaded', mountScaffoldingStatus);
}

export { store, api, toast, openModal, confirmDialog };
