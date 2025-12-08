-- Seed exercise library with equipment-specific exercises

-- Smith Machine Exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Smith Machine Bench Press', 'Chest', 'Smith Machine', 'Compound chest exercise using the Smith machine for stability', 'Keep your back flat, lower to chest level, and push explosively. Retract shoulder blades.', 0),
('Smith Machine Incline Press', 'Chest', 'Smith Machine', 'Upper chest focus on incline bench', 'Set bench to 30-45 degrees. Press in straight line without flaring elbows too much.', 0),
('Smith Machine Squat', 'Legs', 'Smith Machine', 'Compound leg exercise with guided bar path', 'Feet slightly forward, sit back, keep chest up. Go to parallel or below.', 0),
('Smith Machine Romanian Deadlift', 'Hamstrings', 'Smith Machine', 'Hip hinge movement targeting hamstrings and glutes', 'Slight knee bend, push hips back, keep bar close to legs. Feel stretch in hamstrings.', 0),
('Smith Machine Overhead Press', 'Shoulders', 'Smith Machine', 'Vertical pressing movement for shoulders', 'Stand or sit, press straight up, lock out at top. Keep core tight.', 0),
('Smith Machine Bent Over Row', 'Back', 'Smith Machine', 'Horizontal pulling for back thickness', 'Bend at hips, pull bar to lower chest/upper abs. Squeeze shoulder blades together.', 0),
('Smith Machine Lunges', 'Legs', 'Smith Machine', 'Single leg exercise for quads and glutes', 'Step forward or backward, lower back knee toward ground. Keep front knee over ankle.', 1),
('Smith Machine Calf Raise', 'Calves', 'Smith Machine', 'Isolated calf exercise', 'Stand on elevated surface, lower heels, then raise up on toes. Full range of motion.', 0);

-- Olympic Bar Exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Barbell Bench Press', 'Chest', 'Olympic Bar', 'Classic compound chest exercise', 'Lower bar to mid-chest, press straight up. Maintain arch in lower back.', 0),
('Barbell Squat', 'Legs', 'Olympic Bar', 'King of leg exercises', 'Bar on upper traps, squat to depth, drive through heels. Keep knees out.', 0),
('Barbell Deadlift', 'Back', 'Olympic Bar', 'Total body compound pull', 'Hip hinge, neutral spine, pull bar straight up close to body. Full lockout at top.', 0),
('Barbell Overhead Press', 'Shoulders', 'Olympic Bar', 'Standing shoulder press', 'Press bar straight overhead, push head through at top. Tight core.', 0),
('Barbell Bent Over Row', 'Back', 'Olympic Bar', 'Back thickness builder', 'Hinge at hips, pull to lower chest. Keep elbows tight to body.', 0),
('Barbell Bicep Curl', 'Biceps', 'Olympic Bar', 'Isolation movement for biceps', 'Keep elbows stationary, curl with control. No swinging or momentum.', 0),
('Barbell Front Squat', 'Legs', 'Olympic Bar', 'Quad-focused squat variation', 'Bar rests on front delts, elbows up high. Stay upright.', 0),
('Barbell Hip Thrust', 'Glutes', 'Olympic Bar', 'Glute isolation exercise', 'Upper back on bench, bar across hips. Drive through heels, squeeze glutes at top.', 0);

-- Cable Machine Exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Cable Chest Fly', 'Chest', 'Cable Trainer', 'Chest isolation with constant tension', 'Slight bend in elbows, bring handles together in front. Squeeze chest.', 0),
('Cable Crossover', 'Chest', 'Cable Trainer', 'Lower chest emphasis', 'High to low motion, cross hands over. Control the negative.', 0),
('Cable Lateral Raise', 'Shoulders', 'Cable Trainer', 'Medial delt isolation', 'Single arm, pull to shoulder height. Keep elbow slightly bent.', 1),
('Cable Face Pull', 'Shoulders', 'Cable Trainer', 'Rear delt and upper back', 'Pull rope to face, separate hands at end. External rotation.', 0),
('Cable Tricep Pushdown', 'Triceps', 'Cable Trainer', 'Tricep isolation', 'Elbows at sides, press down fully. Control the return.', 0),
('Cable Overhead Tricep Extension', 'Triceps', 'Cable Trainer', 'Long head tricep focus', 'Face away from machine, extend arms overhead. Keep elbows stationary.', 0),
('Cable Bicep Curl', 'Biceps', 'Cable Trainer', 'Constant tension bicep work', 'Curl with control, squeeze at top. No swinging.', 0),
('Cable Woodchop', 'Core', 'Cable Trainer', 'Rotational core exercise', 'Rotate through core, keep arms extended. Control both directions.', 0),
('Cable Lat Pulldown', 'Back', 'Cable Trainer', 'Lat width builder', 'Pull bar to upper chest, squeeze shoulder blades. Control negative.', 0),
('Cable Seated Row', 'Back', 'Cable Trainer', 'Back thickness with constant tension', 'Pull to lower chest, squeeze back. Keep chest up.', 0),
('Cable Single Arm Row', 'Back', 'Cable Trainer', 'Unilateral back work', 'Pull to hip, rotate slightly. Feel lat contraction.', 1);

-- Leg Extension/Curl Machine
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Leg Extension', 'Quads', 'Leg Extension/Curl', 'Quad isolation', 'Extend legs fully, squeeze at top. Control the descent.', 0),
('Leg Curl', 'Hamstrings', 'Leg Extension/Curl', 'Hamstring isolation', 'Curl heels to glutes, squeeze hamstrings. No hip movement.', 0),
('Single Leg Extension', 'Quads', 'Leg Extension/Curl', 'Unilateral quad work', 'One leg at a time, full extension. Correct imbalances.', 1),
('Single Leg Curl', 'Hamstrings', 'Leg Extension/Curl', 'Unilateral hamstring work', 'One leg at a time, full contraction. Feel the hamstring.', 1);

-- Rower
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Rowing Machine - Steady State', 'Cardio', 'Rower', 'Aerobic conditioning', 'Maintain steady pace. Drive with legs, pull with back and arms.', 0),
('Rowing Machine - Intervals', 'Cardio', 'Rower', 'High intensity intervals', 'Alternate high effort and recovery periods. Track split times.', 0),
('Rowing Machine - Sprint', 'Cardio', 'Rower', 'Short burst maximum effort', 'All-out effort for short duration. Explosive power.', 0);

-- Seed stretches
INSERT INTO stretches (name, muscle_group, description, duration_seconds) VALUES
('Chest Doorway Stretch', 'Chest', 'Stand in doorway, arms on frame, lean forward', 30),
('Shoulder Circles', 'Shoulders', 'Large arm circles forward and backward', 30),
('Arm Across Chest Stretch', 'Shoulders', 'Pull arm across chest with opposite hand', 20),
('Overhead Tricep Stretch', 'Triceps', 'Reach arm overhead, bend elbow, pull with other hand', 20),
('Wrist Circles', 'Forearms', 'Rotate wrists in both directions', 20),
('Cat-Cow Stretch', 'Back', 'On hands and knees, alternate arching and rounding spine', 30),
('Standing Quad Stretch', 'Quads', 'Pull foot to glutes while standing', 20),
('Walking Lunges', 'Legs', 'Dynamic stretch with controlled lunges', 40),
('Leg Swings', 'Hips', 'Swing leg forward and back, then side to side', 30),
('Hamstring Stretch', 'Hamstrings', 'Straight leg forward, hinge at hips', 30),
('Hip Flexor Stretch', 'Hip Flexors', 'Lunge position, push hips forward', 30),
('Glute Stretch', 'Glutes', 'Figure-4 stretch or pigeon pose', 30),
('Calf Stretch', 'Calves', 'Push against wall with straight leg', 20),
('Ankle Circles', 'Ankles', 'Rotate ankle in both directions', 20),
('Torso Twists', 'Core', 'Standing rotation side to side', 30),
('Side Bends', 'Obliques', 'Reach arm overhead and bend to side', 20);
