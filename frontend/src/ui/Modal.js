/**
 * Unified modal component.
 *
 * Replaces six different modal patterns from the legacy app.js
 * (shared #modal element, document.createElement overlays, bottom-sheet
 * overlays, the workout modal, the history modal, etc.).
 *
 * Features:
 *   - Promise-based API: `await modal.show({ title, content })`
 *   - Stacks (multiple modals can be open; the top one handles ESC/click-outside)
 *   - Traps focus inside the modal while open
 *   - Restores focus to the previously focused element on close
 *   - Bottom-sheet styling on mobile (<640px)
 *   - ESC to close, click-outside to close (both configurable)
 */

import { html, htmlToElement, raw } from '@core/html';

const MODAL_STACK = [];

function ensureRoot() {
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

function trapFocus(modal) {
  const focusables = modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return null;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  const handler = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  modal.addEventListener('keydown', handler);
  first.focus();
  return () => modal.removeEventListener('keydown', handler);
}

/**
 * Open a modal. Returns a promise that resolves with the result passed to
 * `close()` (or `undefined` if dismissed).
 *
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string|HTMLElement} opts.content - HTML string or a DOM element
 * @param {Array<{ label: string, variant?: string, onClick?: (api) => void, primary?: boolean }>} [opts.actions]
 * @param {'default'|'wide'|'fullscreen'} [opts.size='default']
 * @param {boolean} [opts.dismissable=true] - allow ESC/click-outside to close
 * @param {() => void} [opts.onOpen]
 * @param {(result: any) => void} [opts.onClose]
 * @returns {{ element: HTMLElement, close: (result?: any) => void, promise: Promise<any> }}
 */
export function openModal(opts) {
  const {
    title,
    content,
    actions = [],
    size = 'default',
    dismissable = true,
    onOpen,
    onClose
  } = opts;

  const sizeClass =
    size === 'wide' ? 'modal-wide' :
    size === 'fullscreen' ? 'modal-fullscreen' :
    '';

  const actionsMarkup = actions.length
    ? html`
        <div class="modal-footer">
          ${actions.map((a, i) => html`
            <button
              class="btn ${a.variant || (a.primary ? 'btn-primary' : 'btn-outline')}"
              data-modal-action="${i}"
            >${a.label}</button>
          `)}
        </div>
      `
    : '';

  const titleMarkup = title
    ? html`
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" data-modal-close aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `
    : '';

  const backdrop = htmlToElement(html`
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal ${sizeClass}" role="document">
        ${raw(titleMarkup)}
        <div class="modal-body"></div>
        ${raw(actionsMarkup)}
      </div>
    </div>
  `);

  const modalEl = backdrop.querySelector('.modal');
  const body = backdrop.querySelector('.modal-body');

  // Content can be a string, TrustedHtml, or a live element
  if (content instanceof Node) {
    body.appendChild(content);
  } else if (content != null) {
    body.innerHTML = String(content);
  }

  const previouslyFocused = document.activeElement;
  let closed = false;
  let resolvePromise;
  const promise = new Promise((resolve) => (resolvePromise = resolve));

  const close = (result) => {
    if (closed) return;
    closed = true;

    const index = MODAL_STACK.indexOf(api);
    if (index >= 0) MODAL_STACK.splice(index, 1);

    releaseFocusTrap?.();

    backdrop.style.animation = 'fade-out var(--transition-fast) forwards';
    modalEl.style.animation = 'slide-up var(--transition-fast) reverse forwards';
    backdrop.addEventListener(
      'animationend',
      () => {
        backdrop.remove();
        previouslyFocused?.focus?.();
      },
      { once: true }
    );

    if (MODAL_STACK.length === 0) {
      document.body.style.overflow = '';
    }

    onClose?.(result);
    resolvePromise(result);
  };

  const api = { element: modalEl, backdrop, close, promise };

  // Wire action buttons
  backdrop.querySelectorAll('[data-modal-action]').forEach((btn) => {
    const index = parseInt(btn.getAttribute('data-modal-action'), 10);
    const action = actions[index];
    btn.addEventListener('click', async () => {
      if (action.onClick) {
        await action.onClick(api);
      } else {
        close(action.value ?? index);
      }
    });
  });

  // Close button
  backdrop.querySelector('[data-modal-close]')?.addEventListener('click', () => close());

  // Click outside
  if (dismissable) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }

  // ESC key (only if top of stack)
  const escHandler = (e) => {
    if (e.key === 'Escape' && dismissable && MODAL_STACK[MODAL_STACK.length - 1] === api) {
      close();
    }
  };
  document.addEventListener('keydown', escHandler);
  const originalClose = close;
  api.close = (result) => {
    document.removeEventListener('keydown', escHandler);
    originalClose(result);
  };

  // Mount
  ensureRoot().appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  MODAL_STACK.push(api);

  const releaseFocusTrap = trapFocus(modalEl);

  onOpen?.(api);

  return api;
}

/**
 * Confirm dialog helper.
 * @param {string} message
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.confirmLabel='Confirm']
 * @param {string} [opts.cancelLabel='Cancel']
 * @param {string} [opts.confirmVariant='btn-primary']
 * @returns {Promise<boolean>}
 */
export function confirmDialog(message, opts = {}) {
  const {
    title = 'Are you sure?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmVariant = 'btn-primary'
  } = opts;

  return new Promise((resolve) => {
    openModal({
      title,
      content: html`<p>${message}</p>`,
      actions: [
        {
          label: cancelLabel,
          variant: 'btn-outline',
          onClick: (api) => api.close(false)
        },
        {
          label: confirmLabel,
          variant: confirmVariant,
          primary: true,
          onClick: (api) => api.close(true)
        }
      ],
      onClose: (result) => resolve(result === true)
    });
  });
}

/**
 * Close the top-most modal (useful for global "close all" flows).
 */
export function closeTopModal(result) {
  const top = MODAL_STACK[MODAL_STACK.length - 1];
  top?.close(result);
}

export default { openModal, confirmDialog, closeTopModal };
