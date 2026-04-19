/**
 * Legacy bridge.
 *
 * During the v2 refactor, the codebase contains two parallel implementations:
 *   - Legacy: monolithic `public/app.js` (12,732 lines, shrinking)
 *   - Modular: Vite-bundled code in `frontend/src/` (growing)
 *
 * This bridge lets new modular screens take over from legacy `load*` globals.
 * It works like this:
 *
 *   1. Vite bundle runs first → defines screen handlers and registers them
 *      with the bridge, but doesn't override anything yet (legacy globals
 *      don't exist at this point).
 *   2. Legacy `public/app.js` runs next → defines global functions like
 *      `loadDashboard`, `loadLearn`, etc.
 *   3. On DOMContentLoaded, the bridge installs its overrides so the legacy
 *      `switchTab()` routes to our new handlers.
 *
 * Screens can register themselves one at a time — any tab without a
 * registered handler keeps using the legacy implementation.
 */

import { store } from '@core/state';

const registry = new Map();

/**
 * Register a new modular handler to replace a legacy `load*` function.
 *
 * @param {string} tab - matches the tab id (e.g. 'learn', 'dashboard')
 * @param {string} legacyGlobal - name of the legacy function to override
 *   (e.g. 'loadLearn', 'loadDashboard')
 * @param {(container?: HTMLElement) => void} handler
 */
export function registerScreen(tab, legacyGlobal, handler) {
  registry.set(tab, { legacyGlobal, handler });
}

/**
 * Install overrides after DOMContentLoaded, once legacy globals exist.
 */
function installOverrides() {
  for (const [tab, { legacyGlobal, handler }] of registry) {
    const legacyFn = window[legacyGlobal];
    window[legacyGlobal] = function overriddenScreenHandler(...args) {
      try {
        return handler(...args);
      } catch (err) {
        console.error(`[bridge] "${legacyGlobal}" handler failed, falling back to legacy:`, err);
        if (typeof legacyFn === 'function') {
          return legacyFn.apply(this, args);
        }
        throw err;
      }
    };
    // Keep the legacy reference accessible for debugging
    window[legacyGlobal].__legacy = legacyFn;
    window[legacyGlobal].__modular = true;
  }

  // Also keep the store's `currentTab` in sync when the legacy switchTab runs
  const legacySwitchTab = window.switchTab;
  if (typeof legacySwitchTab === 'function' && !legacySwitchTab.__bridged) {
    window.switchTab = function switchTabBridged(tab, ...rest) {
      store.set('currentTab', tab);
      return legacySwitchTab.call(this, tab, ...rest);
    };
    window.switchTab.__bridged = true;
    window.switchTab.__legacy = legacySwitchTab;
  }

  console.info(
    `[bridge] Installed ${registry.size} modular screen handler(s):`,
    Array.from(registry.keys()).join(', ')
  );
}

/**
 * Initialize the bridge. Safe to call multiple times.
 */
export function initBridge() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installOverrides, { once: true });
  } else {
    // DOM already ready — install immediately
    installOverrides();
  }
}

export default { registerScreen, initBridge };
