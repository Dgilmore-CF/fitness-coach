import { describe, it, expect, beforeEach } from 'vitest';

import {
  kgToLbs,
  lbsToKg,
  cmToInches,
  inchesToCm,
  cmToFeetInches,
  feetInchesToCm
} from '../../frontend/src/utils/conversions.js';

describe('conversions', () => {
  describe('weight', () => {
    it('converts kg to lbs with 1-decimal precision', () => {
      expect(kgToLbs(100)).toBe(220.5);
      expect(kgToLbs(50)).toBe(110.2);
      expect(kgToLbs(0)).toBe(0);
    });

    it('converts lbs to kg with 2-decimal precision', () => {
      expect(lbsToKg(220)).toBe(99.79);
      expect(lbsToKg(100)).toBe(45.36);
      expect(lbsToKg(0)).toBe(0);
    });

    it('round-trips lbs→kg→lbs without drift', () => {
      for (const lbs of [45, 95, 135, 185, 225, 315, 405]) {
        const kg = lbsToKg(lbs);
        const back = kgToLbs(kg);
        expect(Math.abs(back - lbs)).toBeLessThan(0.1);
      }
    });

    it('handles null/undefined safely', () => {
      expect(kgToLbs(null)).toBe(0);
      expect(lbsToKg(undefined)).toBe(0);
    });
  });

  describe('height', () => {
    it('converts cm to inches', () => {
      expect(cmToInches(2.54)).toBeCloseTo(1, 5);
      expect(cmToInches(182.88)).toBeCloseTo(72, 5);
    });

    it('converts inches to cm', () => {
      expect(inchesToCm(1)).toBeCloseTo(2.54, 5);
      expect(inchesToCm(72)).toBeCloseTo(182.88, 5);
    });

    it('converts cm to feet/inches correctly', () => {
      expect(cmToFeetInches(182.88)).toEqual({ feet: 6, inches: 0 });
      expect(cmToFeetInches(170)).toEqual({ feet: 5, inches: 7 });
    });

    it('round-trips feet/inches → cm → feet/inches', () => {
      for (const height of [
        { feet: 5, inches: 0 },
        { feet: 5, inches: 6 },
        { feet: 6, inches: 2 },
        { feet: 5, inches: 11 }
      ]) {
        const cm = feetInchesToCm(height.feet, height.inches);
        const back = cmToFeetInches(cm);
        expect(back.feet).toBe(height.feet);
        // Allow 1" tolerance for rounding
        expect(Math.abs(back.inches - height.inches)).toBeLessThanOrEqual(1);
      }
    });
  });
});
