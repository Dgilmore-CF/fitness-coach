/**
 * Toast notification system.
 *
 * Replaces the legacy `showNotification()` function which only supported a
 * single notification element. This version supports stacking, auto-dismiss,
 * and action buttons.
 *
 * Usage:
 *   import { toast } from '@ui/Toast';
 *   toast.success('Set logged!');
 *   toast.error('Could not save', { duration: 5000 });
 *   toast.show('Workout complete', { icon: 'trophy', action: { label: 'View', onClick: ... } });
 */

import { html, htmlToElement, escapeAttr } from '@core/html';

const ICONS = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle'
};

const DEFAULT_DURATION = 3000;
let container = null;

function getContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {object} [opts]
 * @param {'success'|'error'|'warning'|'info'} [opts.type='info']
 * @param {number} [opts.duration=3000] - ms; use `0` for manual dismiss
 * @param {string} [opts.icon] - Font Awesome icon name (without `fa-` prefix)
 * @param {{ label: string, onClick: () => void }} [opts.action]
 * @returns {() => void} dismiss function
 */
export function showToast(message, opts = {}) {
  const {
    type = 'info',
    duration = DEFAULT_DURATION,
    icon,
    action
  } = opts;

  const iconClass = icon ? `fa-${icon}` : ICONS[type] || ICONS.info;

  const toastEl = htmlToElement(html`
    <div class="toast toast-${escapeAttr(type)}" role="alert">
      <i class="fas ${iconClass} toast-icon" aria-hidden="true"></i>
      <div class="toast-message">${message}</div>
      ${action
        ? html`<button class="btn btn-sm btn-ghost toast-action">${action.label}</button>`
        : ''}
    </div>
  `);

  getContainer().appendChild(toastEl);

  // Wire the action button if present
  if (action?.onClick) {
    toastEl.querySelector('.toast-action')?.addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
  }

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toastEl.style.animation = 'slide-out-right var(--transition-base) forwards';
    toastEl.addEventListener('animationend', () => toastEl.remove(), { once: true });
  };

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return dismiss;
}

export const toast = {
  show: (message, opts) => showToast(message, opts),
  success: (message, opts) => showToast(message, { ...opts, type: 'success' }),
  error: (message, opts) => showToast(message, { ...opts, type: 'error', duration: opts?.duration ?? 5000 }),
  warning: (message, opts) => showToast(message, { ...opts, type: 'warning' }),
  info: (message, opts) => showToast(message, { ...opts, type: 'info' })
};

export default toast;
