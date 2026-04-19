import { htmlToElement } from './html.js';

/**
 * Lightweight component base class.
 *
 * Design goals:
 *   - Zero runtime dependencies (stays within the "vanilla JS" brief)
 *   - Explicit lifecycle: init → render → mount → update → unmount
 *   - Safe HTML via tagged-template helper (no direct innerHTML with user data)
 *   - Event delegation via data-action attributes (no inline onclick strings)
 *
 * Subclasses implement:
 *   - template() → string (returns HTML via the `html` tagged template)
 *   - onMount()  → called after element is in the DOM
 *   - onUnmount() → cleanup (timers, subscriptions, etc.)
 *   - actions    → { actionName: (event, target) => void }
 *
 * Example:
 *
 *   class Counter extends Component {
 *     state = { count: 0 };
 *     actions = {
 *       inc: () => this.setState({ count: this.state.count + 1 })
 *     };
 *     template() {
 *       return html`<button data-action="inc">${this.state.count}</button>`;
 *     }
 *   }
 *
 *   new Counter().mount(document.body);
 */
export class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = this.state || {};
    this.element = null;
    this.children = new Set();
    this.subscriptions = new Set();
    this.actions = this.actions || {};
    this._destroyed = false;
    this._boundHandler = this._handleDelegatedEvent.bind(this);
  }

  /**
   * Subclasses override this to return the component's HTML string.
   * Use the `html` tagged template from `@core/html` for safety.
   * @returns {string}
   */
  template() {
    return '';
  }

  /**
   * Subclasses override for post-mount side effects (fetch data, start
   * timers, etc.). Timers/subscriptions should be registered via
   * `this.track()` so they are cleaned up automatically.
   */
  onMount() {}

  /**
   * Subclasses override for cleanup beyond what `track()` handles.
   */
  onUnmount() {}

  /**
   * Render and append this component to a container. If the component is
   * already mounted elsewhere, it will be moved.
   * @param {Element} container
   * @returns {this}
   */
  mount(container) {
    if (!container) throw new Error('Component.mount: container is required');
    this._renderIntoDOM();
    container.appendChild(this.element);
    this.onMount();
    return this;
  }

  /**
   * Replace the currently mounted element with a fresh render.
   * Preserves focus on the active input if its `id` or `name` matches a
   * re-rendered element.
   */
  update() {
    if (!this.element || this._destroyed) return;
    const activeId = document.activeElement?.id;
    const parent = this.element.parentNode;
    const oldElement = this.element;

    this._renderIntoDOM();

    if (parent) {
      parent.replaceChild(this.element, oldElement);
      if (activeId) {
        this.element.querySelector(`#${CSS.escape(activeId)}`)?.focus();
      }
    }
  }

  /**
   * Merge partial state and trigger an update.
   * @param {object} partial
   */
  setState(partial) {
    this.state = { ...this.state, ...partial };
    this.update();
  }

  /**
   * Track a cleanup function (timer id, subscription, AbortController, etc.).
   * All tracked resources are cleaned up on unmount.
   *
   * Usage:
   *   this.track(() => clearInterval(id));
   *   this.track(store.subscribe('user', cb));
   */
  track(disposer) {
    if (typeof disposer === 'function') this.subscriptions.add(disposer);
    return disposer;
  }

  /**
   * Register a child component for automatic cleanup.
   * @param {Component} child
   * @returns {Component} the child
   */
  addChild(child) {
    this.children.add(child);
    return child;
  }

  /**
   * Tear down: run onUnmount, clean tracked resources, remove from DOM.
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    for (const child of this.children) child.destroy();
    this.children.clear();

    for (const disposer of this.subscriptions) {
      try {
        disposer();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
    this.subscriptions.clear();

    try {
      this.onUnmount();
    } catch (err) {
      console.error('onUnmount error:', err);
    }

    if (this.element) {
      this.element.removeEventListener('click', this._boundHandler);
      this.element.removeEventListener('submit', this._boundHandler);
      this.element.removeEventListener('change', this._boundHandler);
      this.element.removeEventListener('input', this._boundHandler);
      this.element.remove();
      this.element = null;
    }
  }

  // -------- internal --------

  _renderIntoDOM() {
    const markup = this.template();
    if (markup == null || (typeof markup !== 'string' && typeof markup?.toString !== 'function')) {
      throw new Error(`${this.constructor.name}.template() must return a string or TrustedHtml`);
    }

    const rendered = htmlToElement(markup);
    if (!rendered) {
      throw new Error(`${this.constructor.name}.template() produced no root element`);
    }

    this.element = rendered;
    this._attachDelegation();
  }

  _attachDelegation() {
    // A single delegated listener per event type, covering every descendant
    // with a `data-action` attribute. This replaces the ubiquitous inline
    // onclick="funcName()" pattern from the legacy code.
    this.element.addEventListener('click', this._boundHandler);
    this.element.addEventListener('submit', this._boundHandler);
    this.element.addEventListener('change', this._boundHandler);
    this.element.addEventListener('input', this._boundHandler);
  }

  _handleDelegatedEvent(event) {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl || !this.element.contains(actionEl)) return;

    // Match `data-action="name"` or `data-action-<eventType>="name"`
    const eventType = event.type;
    const typedAction = actionEl.getAttribute(`data-action-${eventType}`);
    const genericAction = actionEl.getAttribute('data-action');
    const actionName = typedAction || (eventType === 'click' || eventType === 'submit' ? genericAction : null);

    if (!actionName) return;
    const handler = this.actions[actionName];
    if (typeof handler !== 'function') return;

    handler.call(this, event, actionEl);
  }
}

export default Component;
