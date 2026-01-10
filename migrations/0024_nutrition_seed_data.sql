-- Seed data for unit conversions and common food densities
-- This enables intelligent unit conversion (e.g., "3 oz chicken" -> grams -> macros)

-- Generic unit conversions (weight)
INSERT INTO unit_conversions (food_category, from_unit, to_unit, multiplier, notes) VALUES
(NULL, 'kg', 'g', 1000, 'Kilograms to grams'),
(NULL, 'lb', 'g', 453.592, 'Pounds to grams'),
(NULL, 'lbs', 'g', 453.592, 'Pounds to grams'),
(NULL, 'oz', 'g', 28.3495, 'Ounces to grams'),
(NULL, 'g', 'g', 1, 'Grams to grams (identity)'),
(NULL, 'mg', 'g', 0.001, 'Milligrams to grams');

-- Volume conversions (to ml)
INSERT INTO unit_conversions (food_category, from_unit, to_unit, multiplier, notes) VALUES
(NULL, 'l', 'ml', 1000, 'Liters to milliliters'),
(NULL, 'cup', 'ml', 236.588, 'US cups to milliliters'),
(NULL, 'cups', 'ml', 236.588, 'US cups to milliliters'),
(NULL, 'tbsp', 'ml', 14.787, 'Tablespoons to milliliters'),
(NULL, 'tsp', 'ml', 4.929, 'Teaspoons to milliliters'),
(NULL, 'fl oz', 'ml', 29.5735, 'Fluid ounces to milliliters'),
(NULL, 'ml', 'ml', 1, 'Milliliters to milliliters (identity)');

-- Common food densities (grams per cup, enables volume to weight conversion)
-- Proteins
INSERT INTO food_densities (food_name, food_category, grams_per_cup, grams_per_tbsp, notes) VALUES
('chicken breast', 'protein', 140, 8.75, 'Cooked, diced'),
('chicken thigh', 'protein', 140, 8.75, 'Cooked, diced'),
('ground beef', 'protein', 226, 14.1, 'Cooked, crumbled'),
('ground turkey', 'protein', 226, 14.1, 'Cooked, crumbled'),
('salmon', 'protein', 145, 9.1, 'Cooked, flaked'),
('tuna', 'protein', 154, 9.6, 'Canned, drained'),
('shrimp', 'protein', 145, 9.1, 'Cooked'),
('eggs', 'protein', 243, 15.2, 'Scrambled'),
('egg whites', 'protein', 243, 15.2, 'Liquid'),
('tofu', 'protein', 252, 15.75, 'Firm, cubed'),
('tempeh', 'protein', 166, 10.4, 'Cubed'),
('greek yogurt', 'dairy', 245, 15.3, 'Plain'),
('cottage cheese', 'dairy', 226, 14.1, 'Low-fat');

-- Grains and carbs
INSERT INTO food_densities (food_name, food_category, grams_per_cup, grams_per_tbsp, notes) VALUES
('rice', 'grain', 185, 11.6, 'Cooked, white'),
('brown rice', 'grain', 195, 12.2, 'Cooked'),
('quinoa', 'grain', 185, 11.6, 'Cooked'),
('oats', 'grain', 81, 5.1, 'Dry, rolled'),
('pasta', 'grain', 140, 8.75, 'Cooked'),
('bread crumbs', 'grain', 108, 6.75, 'Dry'),
('flour', 'grain', 125, 7.8, 'All-purpose'),
('sugar', 'sweetener', 200, 12.5, 'Granulated'),
('brown sugar', 'sweetener', 220, 13.75, 'Packed'),
('honey', 'sweetener', 340, 21.25, 'Liquid'),
('maple syrup', 'sweetener', 315, 19.7, 'Pure');

-- Vegetables
INSERT INTO food_densities (food_name, food_category, grams_per_cup, grams_per_tbsp, notes) VALUES
('broccoli', 'vegetable', 91, 5.7, 'Chopped'),
('spinach', 'vegetable', 30, 1.9, 'Raw, leaves'),
('kale', 'vegetable', 67, 4.2, 'Chopped'),
('carrots', 'vegetable', 128, 8, 'Chopped'),
('bell pepper', 'vegetable', 149, 9.3, 'Chopped'),
('onion', 'vegetable', 160, 10, 'Chopped'),
('tomatoes', 'vegetable', 180, 11.25, 'Chopped'),
('mushrooms', 'vegetable', 70, 4.4, 'Sliced'),
('zucchini', 'vegetable', 124, 7.75, 'Chopped'),
('sweet potato', 'vegetable', 200, 12.5, 'Cubed, cooked'),
('potato', 'vegetable', 150, 9.4, 'Cubed, cooked');

-- Fruits
INSERT INTO food_densities (food_name, food_category, grams_per_cup, grams_per_tbsp, notes) VALUES
('banana', 'fruit', 150, 9.4, 'Sliced'),
('apple', 'fruit', 125, 7.8, 'Chopped'),
('strawberries', 'fruit', 152, 9.5, 'Whole'),
('blueberries', 'fruit', 148, 9.25, 'Whole'),
('grapes', 'fruit', 151, 9.4, 'Whole'),
('orange', 'fruit', 180, 11.25, 'Sections'),
('mango', 'fruit', 165, 10.3, 'Cubed'),
('pineapple', 'fruit', 165, 10.3, 'Cubed'),
('avocado', 'fruit', 150, 9.4, 'Cubed');

-- Dairy
INSERT INTO food_densities (food_name, food_category, grams_per_cup, grams_per_tbsp, notes) VALUES
('milk', 'dairy', 244, 15.25, 'Whole'),
('almond milk', 'dairy', 240, 15, 'Unsweetened'),
('cheese', 'dairy', 113, 7.1, 'Shredded'),
('cream cheese', 'dairy', 232, 14.5, 'Soft'),
('sour cream', 'dairy', 230, 14.4, 'Full fat'),
('butter', 'dairy', 227, 14.2, 'Solid'),
('heavy cream', 'dairy', 238, 14.9, 'Liquid');

-- Nuts and seeds
INSERT INTO food_densities (food_name, food_category, grams_per_cup, grams_per_tbsp, notes) VALUES
('almonds', 'nuts', 143, 8.9, 'Whole'),
('peanuts', 'nuts', 146, 9.1, 'Shelled'),
('walnuts', 'nuts', 117, 7.3, 'Halves'),
('cashews', 'nuts', 137, 8.6, 'Whole'),
('peanut butter', 'nuts', 258, 16.1, 'Smooth'),
('almond butter', 'nuts', 256, 16, 'Smooth'),
('chia seeds', 'nuts', 168, 10.5, 'Whole'),
('flax seeds', 'nuts', 168, 10.5, 'Whole');

-- Fats and oils
INSERT INTO food_densities (food_name, food_category, grams_per_cup, grams_per_tbsp, notes) VALUES
('olive oil', 'oil', 216, 13.5, 'Liquid'),
('coconut oil', 'oil', 218, 13.6, 'Liquid'),
('vegetable oil', 'oil', 218, 13.6, 'Liquid');

-- Legumes
INSERT INTO food_densities (food_name, food_category, grams_per_cup, grams_per_tbsp, notes) VALUES
('black beans', 'legume', 172, 10.75, 'Cooked'),
('chickpeas', 'legume', 164, 10.25, 'Cooked'),
('lentils', 'legume', 198, 12.4, 'Cooked'),
('kidney beans', 'legume', 177, 11.1, 'Cooked');

-- Common portion size references (for natural language parsing)
INSERT INTO foods (name, source, serving_size, serving_unit, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, verified) VALUES
-- Proteins (per 100g base, with common serving descriptions)
('Chicken Breast (raw)', 'usda', 100, 'g', '100g / 3.5 oz', 120, 22.5, 0, 2.6, 0, 1),
('Chicken Breast (cooked)', 'usda', 100, 'g', '100g / 3.5 oz', 165, 31, 0, 3.6, 0, 1),
('Chicken Thigh (raw)', 'usda', 100, 'g', '100g / 3.5 oz', 177, 18, 0, 11, 0, 1),
('Chicken Thigh (cooked)', 'usda', 100, 'g', '100g / 3.5 oz', 209, 26, 0, 11, 0, 1),
('Ground Beef 80/20 (raw)', 'usda', 100, 'g', '100g / 3.5 oz', 254, 17, 0, 20, 0, 1),
('Ground Beef 80/20 (cooked)', 'usda', 100, 'g', '100g / 3.5 oz', 271, 26, 0, 18, 0, 1),
('Ground Beef 90/10 (raw)', 'usda', 100, 'g', '100g / 3.5 oz', 176, 20, 0, 10, 0, 1),
('Ground Beef 90/10 (cooked)', 'usda', 100, 'g', '100g / 3.5 oz', 217, 27, 0, 11, 0, 1),
('Ground Turkey (raw)', 'usda', 100, 'g', '100g / 3.5 oz', 149, 19, 0, 8, 0, 1),
('Ground Turkey (cooked)', 'usda', 100, 'g', '100g / 3.5 oz', 170, 27, 0, 6, 0, 1),
('Salmon (raw)', 'usda', 100, 'g', '100g / 3.5 oz', 208, 20, 0, 13, 0, 1),
('Salmon (cooked)', 'usda', 100, 'g', '100g / 3.5 oz', 206, 22, 0, 12, 0, 1),
('Tilapia (raw)', 'usda', 100, 'g', '100g / 3.5 oz', 96, 20, 0, 1.7, 0, 1),
('Tilapia (cooked)', 'usda', 100, 'g', '100g / 3.5 oz', 128, 26, 0, 2.7, 0, 1),
('Tuna (canned in water)', 'usda', 100, 'g', '100g / 3.5 oz', 116, 26, 0, 0.8, 0, 1),
('Shrimp (raw)', 'usda', 100, 'g', '100g / 3.5 oz', 85, 20, 0.2, 0.5, 0, 1),
('Shrimp (cooked)', 'usda', 100, 'g', '100g / 3.5 oz', 99, 24, 0.2, 0.3, 0, 1),
('Eggs (whole, raw)', 'usda', 50, 'g', '1 large egg', 72, 6.3, 0.4, 5, 0, 1),
('Eggs (whole, cooked)', 'usda', 50, 'g', '1 large egg', 78, 6.3, 0.6, 5.3, 0, 1),
('Egg Whites', 'usda', 33, 'g', '1 large egg white', 17, 3.6, 0.2, 0.1, 0, 1),
('Tofu (firm)', 'usda', 100, 'g', '100g / 3.5 oz', 144, 17, 3, 8, 2, 1),
('Tempeh', 'usda', 100, 'g', '100g / 3.5 oz', 192, 20, 8, 11, 0, 1),
('Greek Yogurt (plain, nonfat)', 'usda', 170, 'g', '1 container (6 oz)', 100, 17, 6, 0.7, 0, 1),
('Greek Yogurt (plain, whole)', 'usda', 170, 'g', '1 container (6 oz)', 165, 15, 6, 9, 0, 1),
('Cottage Cheese (2%)', 'usda', 113, 'g', '1/2 cup', 92, 12, 5, 2.5, 0, 1),

-- Grains and carbs
('White Rice (cooked)', 'usda', 158, 'g', '1 cup cooked', 206, 4.3, 45, 0.4, 0.6, 1),
('Brown Rice (cooked)', 'usda', 195, 'g', '1 cup cooked', 218, 5, 46, 1.6, 3.5, 1),
('Quinoa (cooked)', 'usda', 185, 'g', '1 cup cooked', 222, 8, 39, 3.6, 5, 1),
('Oatmeal (cooked)', 'usda', 234, 'g', '1 cup cooked', 158, 6, 27, 3.2, 4, 1),
('Oats (dry)', 'usda', 40, 'g', '1/2 cup dry', 150, 5, 27, 3, 4, 1),
('Pasta (cooked)', 'usda', 140, 'g', '1 cup cooked', 220, 8, 43, 1.3, 2.5, 1),
('Bread (whole wheat)', 'usda', 43, 'g', '1 slice', 81, 4, 14, 1.1, 2, 1),
('Bread (white)', 'usda', 30, 'g', '1 slice', 79, 2.7, 15, 1, 0.6, 1),
('Tortilla (flour, 8")', 'usda', 45, 'g', '1 tortilla', 140, 3.5, 24, 3, 1.5, 1),
('Sweet Potato (baked)', 'usda', 200, 'g', '1 medium', 180, 4, 41, 0.2, 6.6, 1),
('Potato (baked)', 'usda', 173, 'g', '1 medium', 161, 4.3, 37, 0.2, 3.8, 1),
('Banana', 'usda', 118, 'g', '1 medium', 105, 1.3, 27, 0.4, 3.1, 1),
('Apple', 'usda', 182, 'g', '1 medium', 95, 0.5, 25, 0.3, 4.4, 1),

-- Dairy
('Milk (whole)', 'usda', 244, 'g', '1 cup', 149, 8, 12, 8, 0, 1),
('Milk (2%)', 'usda', 244, 'g', '1 cup', 122, 8, 12, 4.8, 0, 1),
('Milk (skim)', 'usda', 245, 'g', '1 cup', 83, 8, 12, 0.2, 0, 1),
('Almond Milk (unsweetened)', 'usda', 240, 'ml', '1 cup', 30, 1, 1, 2.5, 0, 1),
('Cheddar Cheese', 'usda', 28, 'g', '1 oz', 113, 7, 0.4, 9.3, 0, 1),
('Mozzarella Cheese', 'usda', 28, 'g', '1 oz', 85, 6, 0.6, 6.3, 0, 1),
('Parmesan Cheese', 'usda', 5, 'g', '1 tbsp grated', 21, 2, 0.2, 1.4, 0, 1),
('Butter', 'usda', 14, 'g', '1 tbsp', 102, 0.1, 0, 11.5, 0, 1),

-- Fats and oils
('Olive Oil', 'usda', 14, 'g', '1 tbsp', 119, 0, 0, 13.5, 0, 1),
('Coconut Oil', 'usda', 14, 'g', '1 tbsp', 121, 0, 0, 13.5, 0, 1),
('Avocado', 'usda', 150, 'g', '1 medium', 240, 3, 13, 22, 10, 1),

-- Nuts and seeds
('Almonds', 'usda', 28, 'g', '1 oz (23 almonds)', 164, 6, 6, 14, 3.5, 1),
('Peanuts', 'usda', 28, 'g', '1 oz', 161, 7, 5, 14, 2.4, 1),
('Walnuts', 'usda', 28, 'g', '1 oz (14 halves)', 185, 4.3, 4, 18.5, 1.9, 1),
('Peanut Butter', 'usda', 32, 'g', '2 tbsp', 188, 8, 6, 16, 2, 1),
('Almond Butter', 'usda', 32, 'g', '2 tbsp', 196, 7, 6, 18, 3, 1),

-- Vegetables (per 100g or common serving)
('Broccoli', 'usda', 91, 'g', '1 cup chopped', 31, 2.5, 6, 0.4, 2.4, 1),
('Spinach (raw)', 'usda', 30, 'g', '1 cup', 7, 0.9, 1.1, 0.1, 0.7, 1),
('Spinach (cooked)', 'usda', 180, 'g', '1 cup', 41, 5.4, 7, 0.5, 4.3, 1),
('Kale (raw)', 'usda', 67, 'g', '1 cup chopped', 33, 2.2, 6, 0.5, 1.3, 1),
('Carrots', 'usda', 128, 'g', '1 cup chopped', 52, 1.2, 12, 0.3, 3.6, 1),
('Bell Pepper', 'usda', 149, 'g', '1 cup chopped', 46, 1.5, 9, 0.5, 3.1, 1),
('Tomato', 'usda', 123, 'g', '1 medium', 22, 1.1, 4.8, 0.2, 1.5, 1),
('Cucumber', 'usda', 52, 'g', '1/2 cup sliced', 8, 0.3, 1.9, 0.1, 0.3, 1),
('Onion', 'usda', 160, 'g', '1 cup chopped', 64, 1.8, 15, 0.2, 2.7, 1),
('Mushrooms', 'usda', 70, 'g', '1 cup sliced', 15, 2.2, 2.3, 0.2, 0.7, 1),
('Asparagus', 'usda', 134, 'g', '1 cup', 27, 2.9, 5.2, 0.2, 2.8, 1),
('Green Beans', 'usda', 100, 'g', '1 cup', 31, 1.8, 7, 0.1, 3.4, 1),
('Cauliflower', 'usda', 100, 'g', '1 cup', 25, 2, 5, 0.1, 2, 1),
('Zucchini', 'usda', 124, 'g', '1 cup chopped', 21, 1.5, 3.9, 0.4, 1.2, 1),

-- Legumes
('Black Beans (cooked)', 'usda', 172, 'g', '1 cup', 227, 15, 41, 0.9, 15, 1),
('Chickpeas (cooked)', 'usda', 164, 'g', '1 cup', 269, 15, 45, 4.3, 12.5, 1),
('Lentils (cooked)', 'usda', 198, 'g', '1 cup', 230, 18, 40, 0.8, 15.6, 1),
('Kidney Beans (cooked)', 'usda', 177, 'g', '1 cup', 225, 15, 40, 0.9, 13, 1),

-- Common snacks and misc
('Protein Powder (whey)', 'user', 30, 'g', '1 scoop', 120, 24, 3, 1.5, 0, 1),
('Protein Bar (average)', 'user', 60, 'g', '1 bar', 200, 20, 22, 7, 3, 1),
('Rice Cakes', 'usda', 9, 'g', '1 cake', 35, 0.7, 7.3, 0.3, 0.4, 1),
('Hummus', 'usda', 30, 'g', '2 tbsp', 70, 2, 6, 5, 1, 1),
('Salsa', 'usda', 32, 'g', '2 tbsp', 10, 0.5, 2, 0, 0.5, 1);
