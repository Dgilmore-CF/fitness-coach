-- Add incline variations for applicable pressing exercises
-- Only adding incline variations where they are anatomically and practically applicable

-- Barbell Incline Variations
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Incline Barbell Bench Press', 'Chest', 'Olympic Bar', 'Upper chest focus on incline bench (30-45 degrees)', 'Set bench to 30-45 degrees. Bar path should be straight up from upper chest. Retract shoulder blades and maintain arch.', 0);

-- Cable Incline Variations
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Incline Cable Chest Fly', 'Chest', 'Cable Trainer', 'Upper chest isolation with constant tension', 'Set bench to 30-45 degrees or use low pulley position. Bring handles together above chest. Control the stretch and squeeze at top.', 0);

-- Note: Smith Machine already has Incline Press
-- Note: Decline variations could be added separately if needed
-- Note: Incline variations don't apply to: squats, deadlifts, rows, curls, overhead presses, leg machines, or cardio
