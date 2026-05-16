/**
 * Inline coaching card for the active workout view.
 *
 * Replaces the previous floating LiveCoachOverlay. Renders into the
 * pre-existing `#aw-set-flag-card` slot inside `.aw-exercise-content`, so it
 * lives inside the scrollable area and can never obscure the Log Set button.
 *
 * The card is driven entirely by `Insight` objects returned from
 * `set-analyzer.js`. When the analyzer returns null, we hide the card.
 *
 * No `position: fixed`, no z-index battles, no auto-dismiss timers — the card
 * is replaced by the next analyzer call (or manually dismissed via the × in
 * the corner).
 */

import { html } from '@core/html';

const SEVERITY_META = {
  success: { icon: 'fa-trophy', accent: 'text-success' },
  warning: { icon: 'fa-triangle-exclamation', accent: 'text-warning' },
  info: { icon: 'fa-circle-info', accent: 'text-primary' }
};

function getContainer() {
  return document.getElementById('aw-set-flag-card');
}

/**
 * Render an `Insight` (from set-analyzer.js) into the flag-card slot. Pass
 * `null` to hide the card. The slot is replaced wholesale — no animation —
 * so successive insights swap atomically.
 *
 * Action buttons are surfaced as `data-action` attributes that
 * `controller.js` listens for via existing event delegation:
 *   - extend_rest  → "+30s rest" → controller calls `adjustRestTimer(value)`
 *   - drop_weight  → "Drop to X" → pre-fills #aw-new-set-weight in user units
 *   - ask_coach    → "Ask coach" → opens the coach chat sheet (Phase 5)
 */
export function showFlagCard(insight) {
  const el = getContainer();
  if (!el) return;
  if (!insight) {
    hideFlagCard();
    return;
  }

  const meta = SEVERITY_META[insight.severity] || SEVERITY_META.info;
  const actionBtn = insight.action ? renderActionButton(insight.action) : '';

  el.innerHTML = String(html`
    <div class="aw-flag-card aw-flag-${insight.severity}">
      <div class="aw-flag-card-header">
        <div class="aw-flag-card-title">
          <i class="fas ${meta.icon} ${meta.accent}"></i>
          <strong>${insight.title}</strong>
        </div>
        <button type="button"
                class="btn btn-ghost btn-icon btn-sm"
                data-action="dismiss-flag"
                aria-label="Dismiss">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="aw-flag-card-body">${insight.message}</div>
      ${actionBtn ? html`<div class="aw-flag-card-actions">${actionBtn}</div>` : ''}
    </div>
  `);
  el.hidden = false;
  // Stash the action payload AND the full insight on the container so the
  // controller can read them back when buttons are tapped (avoids
  // stringifying objects into data-* attributes).
  el.__flagAction = insight.action || null;
  el.__flagInsight = insight;
}

export function hideFlagCard() {
  const el = getContainer();
  if (!el) return;
  el.innerHTML = '';
  el.hidden = true;
  el.__flagAction = null;
  el.__flagInsight = null;
}

/**
 * Read the action payload currently attached to the card. Useful for the
 * controller's click handler when it needs the action's `value` (e.g. the
 * weight to pre-fill) without re-running the analyzer.
 */
export function getActiveFlagAction() {
  const el = getContainer();
  return el?.__flagAction || null;
}

/**
 * Read the full insight object currently shown by the card. Returned by the
 * controller when building the "Ask coach about this" chat prefill.
 */
export function getActiveFlagInsight() {
  const el = getContainer();
  return el?.__flagInsight || null;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function renderActionButton(action) {
  // Map `action.type` to the data-action the controller already listens for,
  // OR to a flag-specific one we wire below in controller.js. Keeping these
  // names verbose (data-flag-action) avoids colliding with the workout's
  // existing data-action vocabulary.
  return html`
    <button type="button"
            class="btn btn-sm btn-primary"
            data-flag-action="${action.type}">
      ${action.label}
    </button>
  `;
}
