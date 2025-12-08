/**
 * Measurement conversion utilities
 */

// Weight conversions
export function kgToLbs(kg) {
  return kg * 2.20462;
}

export function lbsToKg(lbs) {
  return lbs / 2.20462;
}

// Height conversions
export function cmToInches(cm) {
  return cm / 2.54;
}

export function inchesToCm(inches) {
  return inches * 2.54;
}

export function cmToFeetInches(cm) {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

export function feetInchesToCm(feet, inches) {
  return inchesToCm(feet * 12 + inches);
}

// Format display values
export function formatWeight(kg, system = 'metric') {
  if (system === 'imperial') {
    return `${Math.round(kgToLbs(kg))} lbs`;
  }
  return `${Math.round(kg)} kg`;
}

export function formatHeight(cm, system = 'metric') {
  if (system === 'imperial') {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}
