/**
 * Centralized reactive state store.
 *
 * Replaces the ad-hoc mutations of the legacy `state` object (which was
 * extended in ~30 different places with no reactivity).
 *
 * Features:
 *   - Dot-path get/set (e.g. `store.get('user.name')`, `store.set('ui.theme', 'dark')`)
 *   - Per-key subscriptions (bubbled to parent keys)
 *   - LocalStorage-backed persistence for declared keys
 *   - JSON-serializable state only (no DOM nodes, functions, etc.)
 *
 * Usage:
 *   import { store } from '@core/state';
 *
 *   store.subscribe('user', (user) => console.log('User changed:', user));
 *   store.set('user.name', 'Daniel');
 *   const name = store.get('user.name');
 */

const PERSIST_KEY = 'fitness-coach:state';

const INITIAL_STATE = {
  user: null,
  currentWorkout: null,
  currentProgram: null,
  currentTab: 'dashboard',

  // UI state (persisted)
  ui: {
    theme: 'system',
    activeModal: null,
    lastVisitedTab: null
  },

  // Workout session state (ephemeral)
  workout: {
    activeExerciseIndex: 0,
    restTimerEndTime: null,
    workoutStartTime: null,
    exerciseHistory: {},
    modifications: { added: [], deleted: [] },
    pendingNotes: ''
  },

  // Meal tracking (ephemeral)
  mealTracking: {
    searchResults: [],
    selectedFoods: [],
    currentMealType: null,
    scannerActive: false
  },

  // Past workout flow (ephemeral)
  pastWorkout: {
    date: null,
    programId: null,
    programDayId: null,
    exercises: []
  },

  // Analytics cache (ephemeral, refreshed on load)
  analytics: {
    lastFetch: null,
    data: null
  },

  // AI coach state (ephemeral)
  aiCoach: {
    conversationHistory: [],
    lastInsight: null
  }
};

// Keys whose sub-trees should be persisted to localStorage.
const PERSIST_PATHS = ['ui'];

function getPath(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function setPath(obj, path, value) {
  if (!path) return value;
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (acc[key] == null || typeof acc[key] !== 'object') acc[key] = {};
    return acc[key];
  }, obj);
  target[last] = value;
  return obj;
}

function deepClone(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePersisted(state) {
  try {
    const toSave = {};
    for (const path of PERSIST_PATHS) {
      const value = getPath(state, path);
      if (value !== undefined) setPath(toSave, path, value);
    }
    localStorage.setItem(PERSIST_KEY, JSON.stringify(toSave));
  } catch {
    // Storage quota exceeded or blocked — non-fatal
  }
}

class Store {
  constructor(initial) {
    this.data = deepClone(initial);
    this.subscribers = new Map();

    // Hydrate persisted state
    const persisted = loadPersisted();
    for (const [key, value] of Object.entries(persisted)) {
      this.data[key] = { ...this.data[key], ...value };
    }
  }

  /**
   * Read a value by dot-path.
   * @param {string} [path] — omit or empty to get the full state snapshot.
   * @returns {*}
   */
  get(path) {
    return getPath(this.data, path);
  }

  /**
   * Write a value by dot-path. Notifies subscribers at this key and every
   * ancestor key.
   * @param {string} path
   * @param {*} value
   */
  set(path, value) {
    const oldValue = this.get(path);
    if (oldValue === value) return; // no-op for reference equality

    setPath(this.data, path, value);

    // Persist if under a persisted path
    if (PERSIST_PATHS.some((p) => path === p || path.startsWith(`${p}.`))) {
      savePersisted(this.data);
    }

    // Notify this key
    this.notify(path, value, oldValue);

    // Notify ancestor keys (e.g. setting `ui.theme` notifies `ui` subscribers)
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      this.notify(parentPath, this.get(parentPath), null);
    }
  }

  /**
   * Merge a partial object into an existing branch.
   * @param {string} path
   * @param {object} partial
   */
  merge(path, partial) {
    const current = this.get(path) || {};
    this.set(path, { ...current, ...partial });
  }

  /**
   * Reset a branch to its initial value.
   * @param {string} path
   */
  reset(path) {
    const initial = getPath(INITIAL_STATE, path);
    this.set(path, deepClone(initial));
  }

  /**
   * Subscribe to changes at a specific path.
   * Returns an unsubscribe function.
   * @param {string} path
   * @param {(value: *, oldValue: *) => void} callback
   * @returns {() => void}
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) this.subscribers.set(path, new Set());
    const set = this.subscribers.get(path);
    set.add(callback);
    return () => set.delete(callback);
  }

  notify(path, value, oldValue) {
    const subs = this.subscribers.get(path);
    if (!subs) return;
    for (const cb of subs) {
      try {
        cb(value, oldValue);
      } catch (err) {
        console.error(`Subscriber error for "${path}":`, err);
      }
    }
  }
}

export const store = new Store(INITIAL_STATE);

// Expose for debugging in dev
if (typeof window !== 'undefined') {
  window.__store = store;
}
