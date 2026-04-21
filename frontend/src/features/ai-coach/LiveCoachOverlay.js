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
  thinking: { icon: 'fa-brain fa-beat', color: 'var(--color-primary)', title: 'Coach analyzing…' },
  progression: { icon: 'fa-arrow-up', color: 'var(--color-secondary)', title: 'Great progress!' },
  on_track: { icon: 'fa-check-circle', color: 'var(--color-primary)', title: 'On target' },
  complete: { icon: 'fa-trophy', color: 'var(--color-gold)', title: 'Crushed it!' },
  form_warning: { icon: 'fa-exclamation-triangle', color: 'var(--color-warning)', title: 'Form watch' },
  load_warning: { icon: 'fa-weight-hanging', color: 'var(--color-warning)', title: 'Weight watch' },
  pr_attempt: { icon: 'fa-medal', color: 'var(--color-gold)', title: 'New PR attempt' },
  context: { icon: 'fa-robot', color: 'var(--color-primary)', title: 'AI Coach' },
  context_only: { icon: 'fa-robot', color: 'var(--color-primary)', title: 'AI Coach' }
};

function renderContextPanel(context) {
  if (!context) return '';

  const parts = [];
  if (context.trend?.state && context.trend.state !== 'insufficient data') {
    const trendColor =
      context.trend.state === 'progressing' ? 'var(--color-secondary)' :
      context.trend.state === 'regressing' || context.trend.state === 'stalled' ? 'var(--color-warning)' :
      'var(--color-text-muted)';
    parts.push(html`
      <span class="live-coach-context-chip" style="color: ${trendColor};">
        <i class="fas fa-chart-line"></i>
        ${context.trend.state}${context.trend.detail ? ` · ${context.trend.detail}` : ''}
      </span>
    `);
  }
  if (context.personal_records?.max_weight_kg > 0) {
    parts.push(html`
      <span class="live-coach-context-chip">
        <i class="fas fa-trophy"></i>
        PR ${context.personal_records.max_weight_kg}kg
      </span>
    `);
  }
  if (context.is_attempting_pr) {
    parts.push(html`
      <span class="live-coach-context-chip" style="color: var(--color-gold);">
        <i class="fas fa-star"></i> PR attempt!
      </span>
    `);
  }

  if (parts.length === 0) return '';
  return html`<div class="live-coach-context">${parts}</div>`;
}

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

  const meta = TIP_ICONS[currentTip.type] || TIP_ICONS.context;
  const isThinking = currentTip.type === 'thinking';
  const sourceLabel = currentTip.source === 'ai'
    ? html`<span class="live-coach-source">AI · tailored</span>`
    : currentTip.source === 'rules'
    ? html`<span class="live-coach-source">rules</span>`
    : '';

  return html`
    <div class="live-coach-overlay has-tip ${collapsed ? 'is-collapsed' : ''}" role="status">
      <button class="live-coach-toggle" data-action="toggle">
        <div class="live-coach-avatar" style="color: ${meta.color};">
          <i class="fas ${meta.icon}"></i>
          ${!isThinking ? html`<span class="live-coach-pulse"></span>` : ''}
        </div>
        ${collapsed
          ? html`<div class="live-coach-subtitle">${meta.title}</div>`
          : html`
              <div class="live-coach-body">
                <div class="live-coach-title">
                  ${meta.title}${sourceLabel}
                </div>
                <div class="live-coach-subtitle">${currentTip.message}</div>
              </div>
            `}
        <i class="fas ${collapsed ? 'fa-chevron-up' : 'fa-chevron-down'} live-coach-chevron"></i>
      </button>
      ${!collapsed && !isThinking ? renderContextPanel(currentTip.context) : ''}
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
 * @param {number} [params.exerciseId] - enables tailored (history-aware) coaching
 * @param {number} [params.workoutId]  - current workout id (excluded from history lookup)
 * @param {Array<{weight_kg:number, reps:number}>} params.currentSets
 * @param {number} params.targetReps
 * @param {number} params.targetSets
 */
export async function analyzeSet(params) {
  if (!overlayEl) return;

  // Show "thinking" state so the user knows something is happening during
  // the AI round-trip (can be 1-3s for the 8B model)
  currentTip = { type: 'thinking', message: 'Coach is analyzing your set…' };
  collapsed = false;
  updateOverlay();

  try {
    const response = await api.post('/ai/realtime/analyze', {
      exercise_id: params.exerciseId || null,
      workout_id: params.workoutId || null,
      current_sets: params.currentSets,
      target_reps: params.targetReps,
      target_sets: params.targetSets
    });

    if (response.insight) {
      currentTip = response.insight;
      updateOverlay();

      // Auto-hide routine-status tips after 10s; keep warnings and PR
      // attempts visible until user dismisses.
      const sticky = ['form_warning', 'load_warning', 'pr_attempt'];
      const hasAction = !!response.insight.action;
      if (!hasAction && !sticky.includes(response.insight.type)) {
        setTimeout(() => {
          if (currentTip === response.insight) {
            currentTip = null;
            updateOverlay();
          }
        }, 10000);
      }

      events.emit('aiCoach:tip', response.insight);
    } else {
      // No insight to show — clear the thinking bubble
      currentTip = null;
      updateOverlay();
    }
  } catch (err) {
    // Silent failure — the AI coach is nice-to-have, not critical
    console.warn('AI coach analysis failed:', err);
    currentTip = null;
    updateOverlay();
  }
}

export const liveCoach = {
  init: initLiveCoach,
  destroy: destroyLiveCoach,
  analyzeSet
};

export default liveCoach;
