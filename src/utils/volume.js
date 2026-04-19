/**
 * Server-side workout volume calculations.
 *
 * Mirrors `frontend/src/utils/volume.js` to ensure the backend and frontend
 * never disagree about unilateral exercise handling.
 *
 * Include these constants in SQL via string templates:
 *   const { UNILATERAL_VOLUME_SQL } = await import('../utils/volume.js');
 *   `SELECT SUM(${UNILATERAL_VOLUME_SQL('s', 'e')}) FROM ...`
 */

/**
 * SQL fragment for unilateral-aware volume calculation.
 * @param {string} setAlias - table alias for sets (default 's')
 * @param {string} exerciseAlias - table alias for exercises (default 'e')
 * @returns {string}
 */
export function unilateralVolumeSQL(setAlias = 's', exerciseAlias = 'e') {
  return `CASE WHEN ${exerciseAlias}.is_unilateral THEN ${setAlias}.weight_kg * ${setAlias}.reps * 2 ELSE ${setAlias}.weight_kg * ${setAlias}.reps END`;
}

/**
 * Epley 1RM estimate.
 * @param {number} weightKg
 * @param {number} reps
 */
export function calculateOneRepMax(weightKg, reps) {
  if (!weightKg || !reps) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
