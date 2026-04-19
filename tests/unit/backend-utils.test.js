import { describe, it, expect } from 'vitest';

import { ApiResponse } from '../../src/utils/api-response.js';
import {
  filter,
  buildQuery,
  buildPartialUpdate
} from '../../src/utils/query-builder.js';
import { escapeCsv, buildCsv } from '../../src/utils/csv.js';
import {
  parseAIJsonResponse,
  parseAIJsonArray
} from '../../src/utils/ai-parser.js';
import {
  unilateralVolumeSQL,
  calculateOneRepMax
} from '../../src/utils/volume.js';

describe('ApiResponse', () => {
  it('builds success responses', () => {
    expect(ApiResponse.success({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
  });

  it('builds paginated responses', () => {
    const res = ApiResponse.paginated([1, 2, 3], { page: 1, limit: 10, total: 25 });
    expect(res.success).toBe(true);
    expect(res.meta.totalPages).toBe(3);
    expect(res.meta.hasMore).toBe(true);
  });

  it('builds error responses with status', () => {
    const { body, status } = ApiResponse.error('Not found', { status: 404, code: 'NF' });
    expect(status).toBe(404);
    expect(body).toEqual({ success: false, error: 'Not found', code: 'NF' });
  });
});

describe('query-builder', () => {
  it('skips null filters', () => {
    const { sql, params } = buildQuery(
      'SELECT * FROM t',
      [filter('user_id = ?', 1), filter('deleted_at IS NULL', null), filter('name = ?', 'Dan')]
    );
    expect(sql).toBe('SELECT * FROM t WHERE 1=1 AND user_id = ? AND name = ?');
    expect(params).toEqual([1, 'Dan']);
  });

  it('applies orderBy, limit, offset', () => {
    const { sql, params } = buildQuery(
      'SELECT * FROM t',
      [filter('user_id = ?', 1)],
      { orderBy: 'created_at DESC', limit: 20, offset: 40 }
    );
    expect(sql).toBe('SELECT * FROM t WHERE 1=1 AND user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
    expect(params).toEqual([1, 20, 40]);
  });

  describe('buildPartialUpdate', () => {
    it('includes only allow-listed fields present in input', () => {
      const result = buildPartialUpdate('users', ['name', 'age', 'email'], { name: 'Dan', age: 30, ignored: 'x' }, { id: 1 });
      expect(result.sql).toBe('UPDATE users SET name = ?, age = ? WHERE id = ? RETURNING *');
      expect(result.params).toEqual(['Dan', 30, 1]);
    });

    it('returns null when nothing to update', () => {
      const result = buildPartialUpdate('users', ['name'], { ignored: 'x' }, { id: 1 });
      expect(result).toBeNull();
    });

    it('throws when no WHERE conditions are provided', () => {
      expect(() => buildPartialUpdate('users', ['name'], { name: 'x' }, {})).toThrow();
    });
  });
});

describe('csv', () => {
  it('escapes values containing commas, quotes, newlines', () => {
    expect(escapeCsv('hello')).toBe('hello');
    expect(escapeCsv('a,b')).toBe('"a,b"');
    expect(escapeCsv('he said "hi"')).toBe('"he said ""hi"""');
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsv(null)).toBe('');
  });

  it('builds CSV from columns + rows', () => {
    const csv = buildCsv({
      columns: [
        { header: 'Name', get: (r) => r.name },
        { header: 'Weight', get: (r) => r.weight }
      ],
      rows: [
        { name: 'Dan', weight: 80 },
        { name: 'A, B', weight: 75 }
      ]
    });
    expect(csv).toContain('Name,Weight');
    expect(csv).toContain('Dan,80');
    expect(csv).toContain('"A, B",75');
  });
});

describe('ai-parser', () => {
  it('parses JSON wrapped in code fences', () => {
    const text = 'Here you go:\n```json\n{"foo": 1}\n```\n';
    expect(parseAIJsonResponse(text)).toEqual({ foo: 1 });
  });

  it('parses JSON with surrounding prose', () => {
    const text = 'Analysis complete. Here is the data: {"x": 1, "y": [1, 2]} Let me know!';
    expect(parseAIJsonResponse(text)).toEqual({ x: 1, y: [1, 2] });
  });

  it('returns fallback on parse failure', () => {
    expect(parseAIJsonResponse('{invalid json}', { default: true })).toEqual({ default: true });
    expect(parseAIJsonResponse(null)).toBeNull();
    expect(parseAIJsonResponse('')).toBeNull();
  });

  it('parses arrays', () => {
    expect(parseAIJsonArray('Result: [1, 2, 3]')).toEqual([1, 2, 3]);
    expect(parseAIJsonArray('```json\n["a","b"]\n```')).toEqual(['a', 'b']);
    expect(parseAIJsonArray('not an array')).toEqual([]);
  });
});

describe('volume (backend)', () => {
  it('generates correct SQL for unilateral volume', () => {
    expect(unilateralVolumeSQL('s', 'e'))
      .toBe('CASE WHEN e.is_unilateral THEN s.weight_kg * s.reps * 2 ELSE s.weight_kg * s.reps END');
  });

  it('calculates 1RM with Epley formula', () => {
    expect(calculateOneRepMax(100, 1)).toBe(100);
    expect(calculateOneRepMax(100, 5)).toBeCloseTo(116.67, 1);
    expect(calculateOneRepMax(0, 10)).toBe(0);
  });
});
