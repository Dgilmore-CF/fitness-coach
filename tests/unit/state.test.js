import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide a minimal localStorage for the store module under node
beforeEach(() => {
  const storage = new Map();
  global.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear()
  };
});

describe('store', () => {
  it('supports dot-path get and set', async () => {
    const { store } = await import('../../frontend/src/core/state.js?test=1');
    store.set('user', { name: 'Dan', email: 'dan@example.com' });
    expect(store.get('user.name')).toBe('Dan');
    expect(store.get('user')).toEqual({ name: 'Dan', email: 'dan@example.com' });
  });

  it('notifies subscribers on change', async () => {
    const { store } = await import('../../frontend/src/core/state.js?test=2');
    const callback = vi.fn();
    const unsubscribe = store.subscribe('currentTab', callback);

    store.set('currentTab', 'workout');
    expect(callback).toHaveBeenCalledWith('workout', expect.anything());

    unsubscribe();
    store.set('currentTab', 'dashboard');
    // Should not fire again after unsubscribe
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('bubbles notifications to ancestor keys', async () => {
    const { store } = await import('../../frontend/src/core/state.js?test=3');
    const uiCallback = vi.fn();
    store.subscribe('ui', uiCallback);

    store.set('ui.theme', 'dark');
    expect(uiCallback).toHaveBeenCalled();
  });

  it('merges partial objects', async () => {
    const { store } = await import('../../frontend/src/core/state.js?test=4');
    store.set('user', { name: 'Dan', age: 30 });
    store.merge('user', { email: 'dan@example.com' });
    expect(store.get('user')).toEqual({ name: 'Dan', age: 30, email: 'dan@example.com' });
  });
});
