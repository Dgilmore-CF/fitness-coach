/**
 * Circular progress indicator (SVG-based).
 *
 * Use for macro tracking (protein, water, creatine), readiness scores, etc.
 */

import { html, escapeAttr } from '@core/html';

/**
 * Generate progress ring markup.
 * @param {object} opts
 * @param {number} opts.value - current value
 * @param {number} opts.max - target value (100%)
 * @param {number} [opts.size=100]
 * @param {string} [opts.label]
 * @param {string} [opts.unit]
 * @param {string} [opts.color] - CSS variable or color; defaults to --color-primary
 * @returns {string} HTML string
 */
export function progressRing({ value, max, size = 100, label, unit, color }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const radius = (size - 16) / 2; // leave room for stroke
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const strokeStyle = color ? `stroke: ${escapeAttr(color)};` : '';

  return html`
    <div class="progress-ring" style="width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle
          class="track"
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
        ></circle>
        <circle
          class="fill"
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          style="${strokeStyle}"
        ></circle>
      </svg>
      <div class="progress-ring-content">
        <div class="progress-ring-value">${Math.round(value)}${unit ? html`<span class="progress-ring-unit">${unit}</span>` : ''}</div>
        ${label ? html`<div class="progress-ring-label">${label}</div>` : ''}
      </div>
    </div>
  `;
}

export default progressRing;
