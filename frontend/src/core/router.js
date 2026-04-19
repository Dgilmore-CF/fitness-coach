/**
 * Simple tab-based router.
 *
 * Not a full SPA router — the app is fundamentally tabbed (dashboard, program,
 * workout, analytics, insights, achievements, nutrition, learn) so we just
 * need a tiny switching mechanism that:
 *   - Syncs the URL hash with the active tab
 *   - Restores the last tab on page load
 *   - Notifies subscribers on tab change
 */

import { store } from './state.js';
import { events } from './events.js';

const VALID_TABS = new Set([
  'dashboard',
  'program',
  'workout',
  'analytics',
  'insights',
  'achievements',
  'nutrition',
  'learn',
  'profile'
]);

class Router {
  constructor() {
    this.handlers = new Map();
    this._boundHashChange = this._handleHashChange.bind(this);
  }

  /**
   * Start the router. Reads the initial hash and dispatches.
   */
  start(defaultTab = 'dashboard') {
    this.defaultTab = defaultTab;
    window.addEventListener('hashchange', this._boundHashChange);
    this._handleHashChange();
  }

  stop() {
    window.removeEventListener('hashchange', this._boundHashChange);
  }

  /**
   * Register a handler for a tab.
   * @param {string} tab
   * @param {(params?: object) => void | Promise<void>} handler
   */
  register(tab, handler) {
    if (!VALID_TABS.has(tab)) {
      console.warn(`Router: registering unknown tab "${tab}"`);
    }
    this.handlers.set(tab, handler);
  }

  /**
   * Navigate to a tab (updates URL hash, triggers handler).
   * @param {string} tab
   * @param {object} [params]
   */
  navigate(tab, params = {}) {
    if (!VALID_TABS.has(tab)) {
      console.warn(`Router: navigate to unknown tab "${tab}"`);
      tab = this.defaultTab;
    }

    const hash = this._buildHash(tab, params);
    if (window.location.hash === hash) {
      // Hash unchanged — manually fire handler
      this._dispatch(tab, params);
    } else {
      window.location.hash = hash;
    }
  }

  current() {
    return store.get('currentTab') || this.defaultTab;
  }

  // -------- internal --------

  _buildHash(tab, params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return qs ? `#${tab}?${qs}` : `#${tab}`;
  }

  _parseHash() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return { tab: this.defaultTab, params: {} };

    const [tab, qs] = hash.split('?');
    const params = {};
    if (qs) {
      for (const pair of qs.split('&')) {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
      }
    }
    return {
      tab: VALID_TABS.has(tab) ? tab : this.defaultTab,
      params
    };
  }

  _handleHashChange() {
    const { tab, params } = this._parseHash();
    this._dispatch(tab, params);
  }

  _dispatch(tab, params) {
    const previousTab = store.get('currentTab');
    store.set('currentTab', tab);

    events.emit('router:change', { tab, params, previousTab });

    const handler = this.handlers.get(tab);
    if (handler) {
      Promise.resolve()
        .then(() => handler(params))
        .catch((err) => console.error(`Router handler for "${tab}" failed:`, err));
    }
  }
}

export const router = new Router();
export default router;
