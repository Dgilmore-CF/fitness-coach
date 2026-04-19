/**
 * Lightweight event bus for cross-component communication.
 *
 * Use for events that don't map cleanly to state changes, e.g.:
 *   - 'workout:completed'
 *   - 'pr:achieved'
 *   - 'toast:show'
 *   - 'modal:open'
 *
 * For simple state observation, prefer `store.subscribe()` in state.js.
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register a listener for an event.
   * @param {string} event
   * @param {(payload: *) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Register a one-shot listener.
   * @param {string} event
   * @param {(payload: *) => void} handler
   */
  once(event, handler) {
    const wrapped = (payload) => {
      this.off(event, wrapped);
      handler(payload);
    };
    return this.on(event, wrapped);
  }

  /**
   * Remove a specific listener, or all listeners for an event.
   * @param {string} event
   * @param {Function} [handler]
   */
  off(event, handler) {
    if (!handler) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Emit an event synchronously to all registered listeners.
   * Errors in listeners are caught and logged so one bad handler doesn't
   * break the whole chain.
   * @param {string} event
   * @param {*} payload
   */
  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const h of handlers) {
      try {
        h(payload);
      } catch (err) {
        console.error(`Event handler error for "${event}":`, err);
      }
    }
  }
}

export const events = new EventBus();
export default events;
