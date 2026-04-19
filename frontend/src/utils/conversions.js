/**
 * Unit conversion utilities.
 *
 * Consolidates the conversion functions from legacy app.js (lines 75-135)
 * and keeps the same numeric precision behavior to avoid round-trip drift
 * when users switch between metric and imperial.
 */

import { store } from '@core/state';

const KG_TO_LBS = 2.20462;
const INCHES_PER_CM = 1 / 2.54;

// -------- weight --------

/** kg → lbs (1 decimal place) */
export function kgToLbs(kg) {
  if (kg == null) return 0;
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}

/** lbs → kg (2 decimals to prevent round-trip drift) */
export function lbsToKg(lbs) {
  if (lbs == null) return 0;
  return Math.round((lbs / KG_TO_LBS) * 100) / 100;
}

// -------- height --------

export function cmToInches(cm) {
  return cm * INCHES_PER_CM;
}

export function inchesToCm(inches) {
  return inches / INCHES_PER_CM;
}

export function cmToFeetInches(cm) {
  const totalInches = Math.round(cmToInches(cm));
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches - feet * 12;
  return { feet, inches };
}

export function feetInchesToCm(feet, inches) {
  return inchesToCm((feet || 0) * 12 + (inches || 0));
}

// -------- user preference helpers --------

/**
 * Read the user's measurement system from the store, defaulting to metric.
 * @returns {'metric' | 'imperial'}
 */
export function getMeasurementSystem() {
  const user = store.get('user');
  return (user && user.measurement_system) || 'metric';
}

export function isImperialSystem() {
  return getMeasurementSystem() === 'imperial';
}

export function getWeightUnit() {
  return isImperialSystem() ? 'lbs' : 'kg';
}

/** Step size for weight inputs in the user's unit system */
export function getWeightStep() {
  return isImperialSystem() ? '5' : '2.5';
}

export function getDistanceUnit() {
  return isImperialSystem() ? 'mi' : 'km';
}

// -------- display conversions --------

/**
 * Convert a kg value to the user's unit system for display purposes.
 * @param {number} kg
 * @returns {number}
 */
export function toDisplayWeight(kg) {
  if (kg == null) return 0;
  return isImperialSystem() ? kgToLbs(kg) : kg;
}

/**
 * Convert a user-entered weight back to kg for storage.
 * @param {number|string} displayWeight
 * @returns {number|null}
 */
export function fromDisplayWeight(displayWeight) {
  const num = typeof displayWeight === 'string' ? parseFloat(displayWeight) : displayWeight;
  if (num == null || Number.isNaN(num)) return null;
  return isImperialSystem() ? lbsToKg(num) : num;
}
