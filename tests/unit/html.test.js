import { describe, it, expect } from 'vitest';
import { html, raw, escapeHTML, escapeAttr, isTrustedHtml } from '../../frontend/src/core/html.js';

// `html` returns a TrustedHtml object. For test comparisons we coerce to string.
const s = (t) => String(t);

describe('html tagged template', () => {
  it('returns a TrustedHtml object', () => {
    const result = html`<div>test</div>`;
    expect(isTrustedHtml(result)).toBe(true);
  });

  it('escapes interpolated values by default', () => {
    const result = html`<div>${'<script>alert(1)</script>'}</div>`;
    expect(s(result)).toBe('<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
  });

  it('escapes multiple values', () => {
    const name = '<b>Bob</b>';
    const bio = '"Hi"';
    const result = s(html`<p>${name} says: ${bio}</p>`);
    expect(result).toContain('&lt;b&gt;Bob&lt;/b&gt;');
    expect(result).toContain('&quot;Hi&quot;');
  });

  it('does not escape raw() values', () => {
    const trusted = '<strong>bold</strong>';
    const result = s(html`<div>${raw(trusted)}</div>`);
    expect(result).toBe('<div><strong>bold</strong></div>');
  });

  it('renders arrays by concatenating (including nested html templates)', () => {
    const items = ['a', 'b', 'c'];
    const result = s(html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`);
    expect(result).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>');
  });

  it('escapes strings inside arrays', () => {
    const items = ['<script>', 'ok'];
    const result = s(html`<div>${items}</div>`);
    expect(result).toBe('<div>&lt;script&gt;ok</div>');
  });

  it('renders nested html templates without double-escaping', () => {
    const inner = html`<span>${'<x>'}</span>`;
    const outer = s(html`<div>${inner}</div>`);
    expect(outer).toBe('<div><span>&lt;x&gt;</span></div>');
  });

  it('renders null and undefined as empty', () => {
    expect(s(html`<div>${null}</div>`)).toBe('<div></div>');
    expect(s(html`<div>${undefined}</div>`)).toBe('<div></div>');
  });

  it('renders false as empty, true as "true"', () => {
    expect(s(html`<div>${false}</div>`)).toBe('<div></div>');
    expect(s(html`<div>${true}</div>`)).toBe('<div>true</div>');
  });

  it('renders numbers as strings', () => {
    expect(s(html`<div>${42}</div>`)).toBe('<div>42</div>');
    expect(s(html`<div>${0}</div>`)).toBe('<div>0</div>');
  });
});

describe('escape helpers', () => {
  it('escapeHTML handles all dangerous characters', () => {
    expect(escapeHTML('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('escapeAttr handles double quotes and less-than', () => {
    expect(escapeAttr('foo"bar<baz')).toBe('foo&quot;bar&lt;baz');
  });

  it('escapeHTML coerces non-strings', () => {
    expect(escapeHTML(42)).toBe('42');
    expect(escapeHTML(null)).toBe('null');
  });
});
