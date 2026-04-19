/**
 * Reusable SVG chart component.
 *
 * Replaces the hand-rolled SVG generation in legacy showExerciseHistory()
 * and loadAnalytics(). Supports line, area, and bar charts with a common API.
 */

import { html, escapeAttr } from '@core/html';

const DEFAULT_PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

/**
 * Render a line chart.
 * @param {object} opts
 * @param {Array<{ x: string|number, y: number }>} opts.data
 * @param {number} [opts.width=700]
 * @param {number} [opts.height=220]
 * @param {object} [opts.padding]
 * @param {string} [opts.color]        - Line color
 * @param {boolean} [opts.area=true]   - Fill the area under the line
 * @param {boolean} [opts.points=true] - Show data points
 * @param {(v: number) => string} [opts.formatY]
 * @param {(v: string|number) => string} [opts.formatX]
 * @returns {string} SVG markup
 */
export function lineChart(opts) {
  const {
    data = [],
    width = 700,
    height = 220,
    padding: p = DEFAULT_PADDING,
    color = 'var(--color-primary)',
    area = true,
    points = true,
    formatY = (v) => String(Math.round(v * 10) / 10),
    formatX = (v) => String(v)
  } = opts;

  if (data.length < 2) {
    return html`
      <div class="empty-state">
        <div class="empty-state-description">Not enough data to display a trend.</div>
      </div>
    `;
  }

  const ys = data.map((d) => d.y || 0);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yRange = maxY - minY || 1;
  // Add 5% headroom so the top point isn't flush with the frame
  const yMin = minY - yRange * 0.05;
  const yMax = maxY + yRange * 0.05;
  const yActualRange = yMax - yMin;

  const graphWidth = width - p.left - p.right;
  const graphHeight = height - p.top - p.bottom;

  const pts = data.map((d, i) => ({
    x: p.left + (i / (data.length - 1)) * graphWidth,
    y: p.top + graphHeight - ((d.y - yMin) / yActualRange) * graphHeight,
    raw: d
  }));

  // Smooth cubic Bezier path
  const linePath = pts.reduce((path, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 3;
    const cp2x = prev.x + (2 * (pt.x - prev.x)) / 3;
    return `${path} C ${cp1x} ${prev.y}, ${cp2x} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = area
    ? `${linePath} L ${pts[pts.length - 1].x} ${p.top + graphHeight} L ${pts[0].x} ${p.top + graphHeight} Z`
    : null;

  const gridLines = [0, 1, 2, 3]
    .map((i) => {
      const y = p.top + (i / 3) * graphHeight;
      return `<line x1="${p.left}" y1="${y}" x2="${width - p.right}" y2="${y}" stroke="var(--color-border)" stroke-dasharray="4" />`;
    })
    .join('');

  const yLabels = [0, 1, 2]
    .map((i) => {
      const value = yMin + (i * yActualRange) / 2;
      const y = p.top + graphHeight - (i * graphHeight) / 2;
      return `<text x="${p.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--color-text-muted)" font-size="11">${escapeAttr(formatY(value))}</text>`;
    })
    .join('');

  const xLabelIndices = data.length <= 3
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  const xLabels = xLabelIndices
    .map((i) => {
      const pt = pts[i];
      return `<text x="${pt.x}" y="${height - 12}" text-anchor="middle" fill="var(--color-text-muted)" font-size="11">${escapeAttr(formatX(data[i].x))}</text>`;
    })
    .join('');

  const pointsMarkup = points
    ? pts
        .map(
          (pt) =>
            `<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="${escapeAttr(color)}" stroke="var(--color-surface)" stroke-width="2">
              <title>${escapeAttr(formatX(pt.raw.x))}: ${escapeAttr(formatY(pt.raw.y))}</title>
            </circle>`
        )
        .join('')
    : '';

  const gradientId = `chart-grad-${Math.random().toString(36).slice(2, 8)}`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart chart-line" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto;">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${escapeAttr(color)}" stop-opacity="0.3" />
          <stop offset="100%" stop-color="${escapeAttr(color)}" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridLines}
      ${area ? `<path d="${areaPath}" fill="url(#${gradientId})" />` : ''}
      <path d="${linePath}" fill="none" stroke="${escapeAttr(color)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${pointsMarkup}
      ${yLabels}
      ${xLabels}
    </svg>
  `;
}

/**
 * Render a bar chart.
 * @param {object} opts
 * @param {Array<{ x: string, y: number }>} opts.data
 * @param {number} [opts.width=700]
 * @param {number} [opts.height=220]
 * @param {string} [opts.color]
 * @param {(v: number) => string} [opts.formatY]
 */
export function barChart(opts) {
  const {
    data = [],
    width = 700,
    height = 220,
    padding: p = DEFAULT_PADDING,
    color = 'var(--color-primary)',
    formatY = (v) => String(Math.round(v))
  } = opts;

  if (data.length === 0) {
    return html`<div class="empty-state"><div class="empty-state-description">No data available.</div></div>`;
  }

  const ys = data.map((d) => d.y || 0);
  const maxY = Math.max(...ys) || 1;
  const graphWidth = width - p.left - p.right;
  const graphHeight = height - p.top - p.bottom;

  const barWidth = (graphWidth / data.length) * 0.7;
  const barGap = (graphWidth / data.length) * 0.3;

  const bars = data
    .map((d, i) => {
      const barHeight = (d.y / maxY) * graphHeight;
      const x = p.left + i * (barWidth + barGap) + barGap / 2;
      const y = p.top + graphHeight - barHeight;
      return `
        <g>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${escapeAttr(color)}" rx="4">
            <title>${escapeAttr(d.x)}: ${escapeAttr(formatY(d.y))}</title>
          </rect>
          <text x="${x + barWidth / 2}" y="${height - 12}" text-anchor="middle" fill="var(--color-text-muted)" font-size="11">${escapeAttr(String(d.x).slice(0, 8))}</text>
        </g>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart chart-bar" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto;">
      ${bars}
    </svg>
  `;
}

export default { lineChart, barChart };
