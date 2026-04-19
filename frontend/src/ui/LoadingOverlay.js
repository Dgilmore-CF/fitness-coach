/**
 * Full-screen loading overlay with optional message.
 * Stackable — multiple show() calls require matching hide() calls.
 */

import { html, htmlToElement } from '@core/html';

let overlayEl = null;
let showCount = 0;

function createOverlay(message) {
  return htmlToElement(html`
    <div class="loading-overlay" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <div class="loading-overlay-message">${message || 'Loading…'}</div>
    </div>
  `);
}

/**
 * Show the overlay. Returns a hide function (useful with `try/finally`).
 * @param {string} [message]
 * @returns {() => void}
 */
export function showLoadingOverlay(message) {
  showCount++;
  if (!overlayEl) {
    overlayEl = createOverlay(message);
    document.body.appendChild(overlayEl);
  } else if (message) {
    const msgEl = overlayEl.querySelector('.loading-overlay-message');
    if (msgEl) msgEl.textContent = message;
  }

  let hidden = false;
  return () => {
    if (hidden) return;
    hidden = true;
    hideLoadingOverlay();
  };
}

/**
 * Decrement the show counter and remove the overlay when it reaches zero.
 */
export function hideLoadingOverlay() {
  showCount = Math.max(0, showCount - 1);
  if (showCount === 0 && overlayEl) {
    overlayEl.style.animation = 'fade-out var(--transition-fast) forwards';
    const toRemove = overlayEl;
    overlayEl = null;
    toRemove.addEventListener('animationend', () => toRemove.remove(), { once: true });
  }
}

/**
 * Wrap an async operation with a loading overlay.
 * @param {string} message
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function withLoading(message, fn) {
  const hide = showLoadingOverlay(message);
  try {
    return await fn();
  } finally {
    hide();
  }
}

export default { showLoadingOverlay, hideLoadingOverlay, withLoading };
