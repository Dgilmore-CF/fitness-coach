/**
 * Tagged template literal for building HTML with automatic escaping.
 *
 * Usage:
 *   import { html, raw } from '@core/html';
 *
 *   const name = '<script>alert(1)</script>';
 *   html`<div>Hello ${name}</div>`
 *   // → '<div>Hello &lt;script&gt;alert(1)&lt;/script&gt;</div>'
 *
 *   // Opt-out for pre-escaped / trusted HTML:
 *   html`<div>${raw(trustedHtml)}</div>`
 *
 *   // Arrays are joined automatically, including nested html`` templates:
 *   html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`
 *
 *   // Falsey values render as empty strings (not "null"/"undefined"/"false"):
 *   html`<p>${maybeNull}</p>`
 *
 * Returns a TrustedHtml object (still has a `toString()` for innerHTML use).
 * When interpolated into another `html` template the output is not re-escaped.
 */

const RAW = Symbol('raw');
const TRUSTED = Symbol('trusted');

class TrustedHtml {
  constructor(value) {
    this[TRUSTED] = true;
    this.value = String(value);
  }
  toString() {
    return this.value;
  }
}

/**
 * Mark a string as pre-escaped HTML to skip automatic escaping.
 * @param {string} str
 */
export function raw(str) {
  if (str == null || str === false) return new TrustedHtml('');
  return new TrustedHtml(str);
}

/**
 * Check whether a value is trusted HTML (either from `raw()` or `html``).
 */
export function isTrustedHtml(value) {
  return value && typeof value === 'object' && (value[TRUSTED] || value[RAW] != null);
}

/**
 * Escape a string for safe HTML insertion.
 * @param {string} str
 */
export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a value for use inside an HTML attribute (double-quoted).
 * @param {string} str
 */
export function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function renderValue(value) {
  if (value == null || value === false) return '';
  if (value === true) return 'true';

  // Trusted (pre-escaped) HTML passes through unchanged
  if (value instanceof TrustedHtml) return value.value;
  if (value && typeof value === 'object' && RAW in value) {
    return value[RAW];
  }

  // Arrays: recursively render and concatenate
  if (Array.isArray(value)) {
    return value.map(renderValue).join('');
  }

  // Everything else gets escaped
  return escapeHTML(value);
}

/**
 * Tagged template for HTML generation with automatic escaping.
 * @param {TemplateStringsArray} strings
 * @param  {...any} values
 * @returns {TrustedHtml}
 */
export function html(strings, ...values) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += renderValue(values[i]) + strings[i + 1];
  }
  return new TrustedHtml(result);
}

/**
 * Create a DOM element from trusted HTML. Returns the first child element
 * of a wrapping template so we get a real Element (not a text node).
 * @param {TrustedHtml | string} str
 * @returns {Element}
 */
export function htmlToElement(str) {
  const source = str instanceof TrustedHtml ? str.value : String(str).trim();
  const tpl = document.createElement('template');
  tpl.innerHTML = source;
  return tpl.content.firstElementChild;
}

/**
 * Create a DocumentFragment from trusted HTML (useful for multiple roots).
 * @param {TrustedHtml | string} str
 * @returns {DocumentFragment}
 */
export function htmlToFragment(str) {
  const source = str instanceof TrustedHtml ? str.value : String(str);
  const tpl = document.createElement('template');
  tpl.innerHTML = source;
  return tpl.content;
}
