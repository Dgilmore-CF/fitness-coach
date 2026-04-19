/**
 * Live AI Coach Overlay — a collapsible bottom sheet that surfaces
 * contextual tips during an active workout.
 *
 * Call `initLiveCoach()` once when a workout starts. Then after each set
 * is logged, call `liveCoach.analyzeSet({ currentSets, targetReps, targetSets })`
 * to evaluate whether to surface a new tip.
 *
 * The overlay stays mounted for the duration of the workout so scroll
 * position and animation state aren't lost between renders.
 */

import { html, htmlToElement, raw } from '@core/html';
import { api } from '@core/api';
import { toast } from '@ui/Toast';
import { events } from '@core/events';

let overlayEl = null;
let collapsed = false;
let currentTip = null;
let onActionCallback = null;

const TIP_ICONS = {
  progression: { icon: 'fa-arrow-up', color: 'var(--color-secondary)', title: 'Great progress!' },
  on_track: { icon: 'fa-check-circle', color: 'var(--color-primary)', title: 'On target' },
  complete: { icon: 'fa-trophy', color: 'var(--color-gold)', title: 'Crushed it!' },
  form_warning: { icon: 'fa-exclamation-triangle', color: 'var(--color-warning)', title: 'Form watch' },
  load_warning: { icon: 'fa-weight-hanging', color: 'var(--color-warning)', title: 'Weight watch' }
};

function renderOverlay() {
  if (!currentTip) {
    return html`
      <div class="live-coach-overlay ${collapsed ? 'is-collapsed' : ''}" role="status">
        <button class="live-coach-toggle" data-action="toggle" aria-label="${collapsed ? 'Expand' : 'Collapse'} AI coach">
          <div class="live-coach-avatar">
            <i class="fas fa-robot"></i>
          </div>
          ${collapsed
            ? ''
            : html`
                <div class="live-coach-body">
                  <div class="live-coach-title">AI Coach</div>
                  <div class="live-coach-subtitle text-muted">Watching your workout…</div>
                </div>
              `}
          <i class="fas ${collapsed ? 'fa-chevron-up' : 'fa-chevron-down'} live-coach-chevron"></i>
        </button>
      </div>
    `;
  }

  const meta = TIP_ICONS[currentTip.type] || TIP_ICONS.on_track;

  return html`
    <div class="live-coach-overlay has-tip ${collapsed ? 'is-collapsed' : ''}" role="status">
      <button class="live-coach-toggle" data-action="toggle">
        <div class="live-coach-avatar" style="color: ${meta.color};">
          <i class="fas ${meta.icon}"></i>
          <span class="live-coach-pulse"></span>
        </div>
        ${collapsed
          ? html`<div class="live-coach-subtitle">${meta.title}</div>`
          : html`
              <div class="live-coach-body">
                <div class="live-coach-title">${meta.title}</div>
                <div class="live-coach-subtitle">${currentTip.message}</div>
              </div>
            `}
        <i class="fas ${collapsed ? 'fa-chevron-up' : 'fa-chevron-down'} live-coach-chevron"></i>
      </button>
      ${!collapsed && currentTip.action
        ? html`
            <div class="live-coach-actions">
              <button class="btn btn-sm btn-outline" data-action="apply-tip">
                ${currentTip.action.label}
              </button>
              <button class="btn btn-sm btn-ghost" data-action="dismiss-tip">
                Dismiss
              </button>
            </div>
          `
        : ''}
    </div>
  `;
}

function updateOverlay() {
  if (!overlayEl) return;
  const replacement = htmlToElement(renderOverlay());
  overlayEl.replaceWith(replacement);
  overlayEl = replacement;
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');

  switch (action) {
    case 'toggle':
      collapsed = !collapsed;
      updateOverlay();
      break;
    case 'apply-tip':
      if (onActionCallback && currentTip?.action) {
        onActionCallback(currentTip.action);
      }
      currentTip = null;
      updateOverlay();
      break;
    case 'dismiss-tip':
      currentTip = null;
      updateOverlay();
      break;
  }
}

/**
 * Mount the live coach overlay. Safe to call repeatedly — it's a no-op
 * if already mounted.
 * @param {object} [opts]
 * @param {(action: {label: string, value: number}) => void} [opts.onAction]
 *   Called when user clicks the tip's primary action button (e.g. "+30s rest").
 */
export function initLiveCoach(opts = {}) {
  if (overlayEl && document.body.contains(overlayEl)) return;

  onActionCallback = opts.onAction;
  overlayEl = htmlToElement(renderOverlay());
  overlayEl.addEventListener('click', handleClick);
  document.body.appendChild(overlayEl);
}

/**
 * Remove the overlay (call when workout ends).
 */
export function destroyLiveCoach() {
  if (overlayEl) {
    overlayEl.removeEventListener('click', handleClick);
    overlayEl.remove();
    overlayEl = null;
  }
  currentTip = null;
  collapsed = false;
  onActionCallback = null;
}

/**
 * Analyze a set that was just logged and surface a tip if applicable.
 *
 * @param {object} params
 * @param {Array<{weight_kg:number, reps:number}>} params.currentSets
 * @param {number} params.targetReps
 * @param {number} params.targetSets
 */
export async function analyzeSet(params) {
  if (!overlayEl) return;

  try {
    const response = await api.post('/ai/realtime/analyze', {
      current_sets: params.currentSets,
      target_reps: params.targetReps,
      target_sets: params.targetSets
    });

    if (response.insight) {
      currentTip = response.insight;
      collapsed = false; // auto-expand for new tips
      updateOverlay();

      // Auto-hide routine-status tips after 8s; keep warnings
      if (!response.insight.action && response.insight.type !== 'form_warning' && response.insight.type !== 'load_warning') {
        setTimeout(() => {
          if (currentTip === response.insight) {
            currentTip = null;
            updateOverlay();
          }
        }, 8000);
      }

      events.emit('aiCoach:tip', response.insight);
    }
  } catch (err) {
    // Silent failure — the AI coach is nice-to-have, not critical
    console.warn('AI coach analysis failed:', err);
  }
}

export const liveCoach = {
  init: initLiveCoach,
  destroy: destroyLiveCoach,
  analyzeSet
};

export default liveCoach;
