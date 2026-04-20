import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

/**
 * The OFF normalizer is defined inside src/routes/nutrition.js. To test it
 * without importing the Hono route (which requires the Cloudflare Workers
 * runtime), we read the file, extract the helper functions by regex, and
 * evaluate them in an isolated context.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../../src/routes/nutrition.js'), 'utf8');

// Grab just the normalizer helpers (everything between toNumber() and the
// closing brace of normalizeOpenFoodFactsProduct).
function extractHelpers() {
  const start = source.indexOf('function toNumber(');
  const marker = 'function normalizeOpenFoodFactsProduct(';
  const markerIdx = source.indexOf(marker, start);
  if (start < 0 || markerIdx < 0) throw new Error('Could not locate normalizer in source');

  // Find the end of normalizeOpenFoodFactsProduct by brace matching
  let depth = 0;
  let i = source.indexOf('{', markerIdx);
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return source.slice(start, i);
}

const helpersSource = extractHelpers();
const context = vm.createContext({ module: {}, exports: {} });
vm.runInContext(
  `${helpersSource}\nmodule.exports = { normalizeOpenFoodFactsProduct, resolveCalories, resolveMacro, resolveSodiumMg, toNumber };`,
  context
);
const { normalizeOpenFoodFactsProduct } = context.module.exports;

describe('OpenFoodFacts normalizer', () => {
  it('uses per-serving values when available', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'Test Bar',
      brands: 'Acme',
      serving_quantity: 45,
      nutriments: {
        'energy-kcal_serving': 180,
        'energy-kcal_100g': 400,
        proteins_serving: 8,
        proteins_100g: 17.8,
        carbohydrates_serving: 22,
        carbohydrates_100g: 48.9,
        fat_serving: 6,
        fat_100g: 13.3,
        fiber_serving: 3,
        sodium_serving: 0.15
      }
    }, '12345');

    expect(food.calories).toBe(180);
    expect(food.protein_g).toBe(8);
    expect(food.carbs_g).toBe(22);
    expect(food.fat_g).toBe(6);
    expect(food.fiber_g).toBe(3);
    expect(food.sodium_mg).toBe(150); // 0.15 g × 1000
    expect(food.serving_size).toBe(45);
    expect(food.name).toBe('Test Bar');
    expect(food.brand).toBe('Acme');
  });

  it('converts kJ to kcal when only kJ energy is reported', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'Euro Bar',
      serving_quantity: 40,
      nutriments: {
        'energy-kj_serving': 754, // ≈ 180 kcal
        proteins_serving: 7,
        carbohydrates_serving: 22,
        fat_serving: 6
      }
    }, '44444');

    // 754 kJ / 4.184 ≈ 180 kcal
    expect(food.calories).toBeGreaterThanOrEqual(175);
    expect(food.calories).toBeLessThanOrEqual(185);
  });

  it('converts salt to sodium when only salt is reported (EU products)', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'EU Snack',
      serving_quantity: 30,
      nutriments: {
        'energy-kcal_serving': 150,
        proteins_serving: 3,
        carbohydrates_serving: 18,
        fat_serving: 8,
        salt_serving: 0.5 // 0.5 g salt → 200 mg sodium
      }
    }, '55555');

    expect(food.sodium_mg).toBe(200);
  });

  it('scales per-100g values to the reported serving size', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'Pasta',
      serving_quantity: 75,
      nutriments: {
        'energy-kcal_100g': 360,
        proteins_100g: 12,
        carbohydrates_100g: 72,
        fat_100g: 2
      }
    }, '66666');

    // 75g serving = 0.75 × per-100g values
    expect(food.calories).toBe(270); // 360 × 0.75 = 270
    expect(food.protein_g).toBe(9);  // 12 × 0.75 = 9
    expect(food.carbs_g).toBe(54);   // 72 × 0.75 = 54
    expect(food.fat_g).toBeCloseTo(1.5, 1);
  });

  it('falls back to 100g when serving_quantity is missing or absurd', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'No Serving',
      nutriments: {
        'energy-kcal_100g': 250,
        proteins_100g: 10,
        carbohydrates_100g: 30,
        fat_100g: 10
      }
    }, '77777');

    expect(food.serving_size).toBe(100);
    expect(food.calories).toBe(250);
  });

  it('recomputes calories via Atwater when declared value is way off', () => {
    // Declared calories say 50 but macros imply ~200 kcal
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'Mislabeled',
      serving_quantity: 100,
      nutriments: {
        'energy-kcal_serving': 50, // WRONG
        proteins_serving: 10,      // 40 kcal
        carbohydrates_serving: 20, // 80 kcal
        fat_serving: 10            // 90 kcal → total 210 kcal
      }
    }, '88888');

    // Declared 50 / Atwater 210 = 0.24 ratio (way outside ±25%)
    // Should be corrected to the Atwater value
    expect(food.calories).toBe(210);
  });

  it('computes calories from macros when energy field is missing entirely', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'No Calories Field',
      serving_quantity: 100,
      nutriments: {
        proteins_serving: 20,
        carbohydrates_serving: 30,
        fat_serving: 10
      }
    }, '99999');

    // 20×4 + 30×4 + 10×9 = 80 + 120 + 90 = 290
    expect(food.calories).toBe(290);
  });

  it('handles string numeric values from OFF', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'String values',
      serving_quantity: '50',
      nutriments: {
        'energy-kcal_serving': '180',
        proteins_serving: '7.5',
        carbohydrates_serving: '22',
        fat_serving: '6'
      }
    }, '11111');

    expect(food.calories).toBe(180);
    expect(food.protein_g).toBe(7.5);
  });

  it('uses nutrition_data_per=serving when unsuffixed fields are per-serving', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'Per-serving default',
      serving_quantity: 50,
      nutrition_data_per: 'serving',
      nutriments: {
        'energy-kcal': 200,
        proteins: 10,
        carbohydrates: 20,
        fat: 8
      }
    }, '22222');

    // Since data_per is 'serving', unsuffixed fields are used directly
    expect(food.calories).toBe(200);
    expect(food.protein_g).toBe(10);
  });

  it('uses nutrition_data_per=100g as default when unsuffixed fields are per-100g', () => {
    const food = normalizeOpenFoodFactsProduct({
      product_name: 'Per-100g default',
      serving_quantity: 50,
      // nutrition_data_per omitted or '100g'
      nutriments: {
        'energy-kcal': 400,
        proteins: 20,
        carbohydrates: 40,
        fat: 16
      }
    }, '33333');

    // 50g serving, per-100g values → 0.5 × each
    expect(food.calories).toBe(200);
    expect(food.protein_g).toBe(10);
  });
});
