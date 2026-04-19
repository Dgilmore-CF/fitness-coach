/**
 * CSV generation helper.
 *
 * Replaces the 4x duplicated CSV generation logic in exports.js with one
 * configurable utility that escapes values safely and returns a Response
 * with proper headers.
 *
 * Usage:
 *   return csvResponse({
 *     filename: 'workouts.csv',
 *     columns: [
 *       { header: 'Date', get: (r) => r.date },
 *       { header: 'Volume (kg)', get: (r) => r.total_weight_kg?.toFixed(1) }
 *     ],
 *     rows: workouts
 *   });
 */

/**
 * Escape a value for CSV output (RFC 4180-ish).
 * @param {*} value
 * @returns {string}
 */
export function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV string from columns and rows.
 * @param {object} opts
 * @param {Array<{ header: string, get: (row: *) => * }>} opts.columns
 * @param {Array} opts.rows
 * @returns {string}
 */
export function buildCsv({ columns, rows }) {
  const header = columns.map((c) => escapeCsv(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(c.get(row))).join(','))
    .join('\n');
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

/**
 * Build a CSV download Response.
 * @param {object} opts
 * @param {string} opts.filename
 * @param {Array<{ header: string, get: (row: *) => * }>} opts.columns
 * @param {Array} opts.rows
 * @returns {Response}
 */
export function csvResponse({ filename, columns, rows }) {
  const csv = buildCsv({ columns, rows });
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}
