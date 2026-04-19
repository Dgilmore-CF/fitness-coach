/**
 * Delegated event handler registry.
 *
 * Screen modules call `delegate(container, 'click', handler)` on every
 * render. Without this helper, each render would add another listener to
 * the container (its innerHTML gets replaced but the container element
 * itself persists), and over time clicks would fire N handlers producing
 * N duplicate side effects (multiple modals, multiple API calls, etc.).
 *
 * This utility stores the current handler in a WeakMap keyed by the
 * container + event type, removes the previous listener before attaching
 * the new one, and is safe to call any number of times.
 */

const registry = new WeakMap();

function getKey(element, type) {
  let byType = registry.get(element);
  if (!byType) {
    byType = new Map();
    registry.set(element, byType);
  }
  return byType;
}

/**
 * Attach a single delegated handler of `type` to `element`, replacing any
 * previously-attached handler for the same element/type combination.
 *
 * @param {EventTarget} element
 * @param {string} type       - e.g. 'click', 'submit', 'change'
 * @param {EventListener} handler
 */
export function delegate(element, type, handler) {
  if (!element || typeof handler !== 'function') return;
  const byType = getKey(element, type);
  const previous = byType.get(type);
  if (previous) element.removeEventListener(type, previous);
  element.addEventListener(type, handler);
  byType.set(type, handler);
}

/**
 * Remove the delegated handler for `type` from `element`.
 * @param {EventTarget} element
 * @param {string} type
 */
export function undelegate(element, type) {
  const byType = registry.get(element);
  if (!byType) return;
  const previous = byType.get(type);
  if (previous) {
    element.removeEventListener(type, previous);
    byType.delete(type);
  }
}
