/**
 * Shared input validators.
 * Pure functions returning `{ valid: boolean, error?: string }`.
 */

export const validators = {
  required(value, label = 'Value') {
    if (value == null || value === '' || (typeof value === 'string' && value.trim() === '')) {
      return { valid: false, error: `${label} is required` };
    }
    return { valid: true };
  },

  positiveNumber(value, label = 'Value') {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(n) || n == null) {
      return { valid: false, error: `${label} must be a number` };
    }
    if (n <= 0) {
      return { valid: false, error: `${label} must be greater than zero` };
    }
    return { valid: true };
  },

  nonNegativeNumber(value, label = 'Value') {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(n) || n == null) {
      return { valid: false, error: `${label} must be a number` };
    }
    if (n < 0) {
      return { valid: false, error: `${label} cannot be negative` };
    }
    return { valid: true };
  },

  integerRange(value, min, max, label = 'Value') {
    const n = typeof value === 'string' ? parseInt(value, 10) : value;
    if (Number.isNaN(n) || !Number.isInteger(n)) {
      return { valid: false, error: `${label} must be a whole number` };
    }
    if (n < min || n > max) {
      return { valid: false, error: `${label} must be between ${min} and ${max}` };
    }
    return { valid: true };
  },

  dateNotFuture(value, label = 'Date') {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      return { valid: false, error: `${label} is not a valid date` };
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (d.getTime() > today.getTime()) {
      return { valid: false, error: `${label} cannot be in the future` };
    }
    return { valid: true };
  },

  /**
   * Run a sequence of validators; returns the first failure or success.
   */
  all(value, checks) {
    for (const check of checks) {
      const result = check(value);
      if (!result.valid) return result;
    }
    return { valid: true };
  }
};

export default validators;
