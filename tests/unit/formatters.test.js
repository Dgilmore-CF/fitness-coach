import { describe, it, expect, beforeEach } from 'vitest';

import {
  formatDuration,
  formatDurationShort,
  formatDate,
  formatPercentChange,
  formatNumber,
  getExertionEmoji,
  getExertionLabel
} from '../../frontend/src/utils/formatters.js';

describe('formatters', () => {
  describe('formatDuration', () => {
    it('formats seconds as MM:SS under an hour', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(45)).toBe('00:45');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(600)).toBe('10:00');
    });

    it('formats HH:MM:SS over an hour', () => {
      expect(formatDuration(3600)).toBe('01:00:00');
      expect(formatDuration(3665)).toBe('01:01:05');
      expect(formatDuration(7800)).toBe('02:10:00');
    });

    it('handles null and negative values', () => {
      expect(formatDuration(null)).toBe('00:00');
      expect(formatDuration(undefined)).toBe('00:00');
      expect(formatDuration(-5)).toBe('00:00');
    });
  });

  describe('formatDurationShort', () => {
    it('uses short humanized format', () => {
      expect(formatDurationShort(30)).toBe('30s');
      expect(formatDurationShort(90)).toBe('1m');
      expect(formatDurationShort(3600)).toBe('1h');
      expect(formatDurationShort(3900)).toBe('1h 5m');
      expect(formatDurationShort(7200)).toBe('2h');
    });

    it('handles edge cases', () => {
      expect(formatDurationShort(0)).toBe('0s');
      expect(formatDurationShort(null)).toBe('0s');
      expect(formatDurationShort(-5)).toBe('0s');
    });
  });

  describe('formatDate', () => {
    it('formats ISO dates without timezone shift', () => {
      // No timezone conversion bug — "2024-01-15" should always format as Jan 15
      expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');
      expect(formatDate('2024-12-31')).toBe('Dec 31, 2024');
    });

    it('handles ISO timestamps (strips time)', () => {
      expect(formatDate('2024-01-15T12:34:56Z')).toBe('Jan 15, 2024');
    });

    it('returns empty string for null/undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('formatPercentChange', () => {
    it('formats positive and negative percentages with arrows', () => {
      expect(formatPercentChange(12.5)).toBe('↑ 12.5%');
      expect(formatPercentChange(-8.3)).toBe('↓ 8.3%');
      expect(formatPercentChange(0)).toBe('0%');
    });

    it('handles null and NaN', () => {
      expect(formatPercentChange(null)).toBe('—');
      expect(formatPercentChange(NaN)).toBe('—');
    });
  });

  describe('formatNumber', () => {
    it('adds thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('handles null', () => {
      expect(formatNumber(null)).toBe('0');
    });
  });

  describe('getExertionEmoji', () => {
    it('maps exertion levels to emoji brackets', () => {
      expect(getExertionEmoji(1)).toBe('😴');
      expect(getExertionEmoji(3)).toBe('🙂');
      expect(getExertionEmoji(5)).toBe('💪');
      expect(getExertionEmoji(8)).toBe('🔥');
      expect(getExertionEmoji(10)).toBe('🥵');
      expect(getExertionEmoji(null)).toBe('');
    });
  });

  describe('getExertionLabel', () => {
    it('returns human-readable labels', () => {
      expect(getExertionLabel(1)).toBe('Very easy');
      expect(getExertionLabel(5)).toBe('Moderate');
      expect(getExertionLabel(10)).toBe('Maximum effort');
      expect(getExertionLabel(null)).toBe('Not rated');
    });
  });
});
