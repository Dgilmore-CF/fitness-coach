-- Add single arm cable bicep curl (unilateral)
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Single Arm Cable Curl', 'Biceps', 'Cable Trainer', 'Unilateral cable curl performed one arm at a time for focused bicep isolation.', 'Keep elbow stationary at your side. Control the negative. Squeeze at the top of the movement.', 1);

-- Add tricep rope exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Tricep Rope Pushdown', 'Triceps', 'Cable Trainer', 'Tricep pushdown using a rope attachment, allowing for a split at the bottom for extra contraction.', 'Spread the rope apart at the bottom of the movement. Keep elbows pinned to your sides. Focus on squeezing the triceps.', 0),
('Tricep Rope Overhead Extension', 'Triceps', 'Cable Trainer', 'Overhead tricep extension using a rope attachment for long head emphasis.', 'Face away from the cable machine. Keep upper arms close to your head. Extend fully and squeeze at the top.', 0),
('Tricep Rope Kickback', 'Triceps', 'Cable Trainer', 'Cable kickback using rope attachment for tricep isolation with constant tension.', 'Hinge at the hips, keep upper arm parallel to floor. Extend arm fully behind you. Control the movement.', 0);

-- Add tricep V-bar exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Tricep V-Bar Pushdown', 'Triceps', 'Cable Trainer', 'Tricep pushdown using a V-bar attachment for a neutral grip and strong contraction.', 'Keep elbows tight to your body. Push down until arms are fully extended. Control the return.', 0),
('Tricep V-Bar Overhead Extension', 'Triceps', 'Cable Trainer', 'Overhead tricep extension using a V-bar attachment for long head development.', 'Face away from the machine. Keep elbows close to head. Fully extend and squeeze triceps at the top.', 0);
