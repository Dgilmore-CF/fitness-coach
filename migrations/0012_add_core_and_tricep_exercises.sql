-- Add single arm cable tricep extension (unilateral)
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Single Arm Cable Tricep Extension', 'Triceps', 'Cable Trainer', 'Unilateral overhead tricep extension performed one arm at a time for focused tricep isolation.', 'Keep upper arm stationary next to your head. Fully extend the arm and squeeze at the top. Control the negative.', 1);

-- Add bodyweight core exercises (no equipment)
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Plank', 'Core', 'Bodyweight', 'Isometric core exercise holding a push-up position on forearms.', 'Keep body in a straight line from head to heels. Engage core and glutes. Do not let hips sag or pike up.', 0),
('Side Plank', 'Core', 'Bodyweight', 'Lateral isometric hold targeting obliques and core stability.', 'Stack feet or stagger for balance. Keep hips elevated. Engage obliques throughout the hold.', 1),
('Dead Bug', 'Core', 'Bodyweight', 'Anti-extension exercise with alternating arm and leg movements while lying on back.', 'Press lower back into floor throughout. Move slowly and controlled. Exhale as you extend limbs.', 0),
('Bird Dog', 'Core', 'Bodyweight', 'Quadruped exercise extending opposite arm and leg for core stability.', 'Keep spine neutral. Extend arm and leg until parallel to floor. Hold briefly at the top.', 0),
('Mountain Climbers', 'Core', 'Bodyweight', 'Dynamic plank exercise alternating knee drives toward chest.', 'Keep hips level and core tight. Drive knees toward chest with control. Maintain steady breathing.', 0),
('Bicycle Crunches', 'Core', 'Bodyweight', 'Rotational crunch bringing opposite elbow to knee in cycling motion.', 'Keep lower back pressed to floor. Rotate through the torso, not just the elbows. Control the movement.', 0),
('Crunches', 'Core', 'Bodyweight', 'Basic abdominal exercise lifting shoulders off the ground.', 'Keep lower back on floor. Curl up using abs, not momentum. Do not pull on neck.', 0),
('Reverse Crunches', 'Core', 'Bodyweight', 'Lower ab focused exercise lifting hips off the ground.', 'Use abs to lift hips, not momentum. Control the lowering phase. Keep upper back on floor.', 0),
('Leg Raises', 'Core', 'Bodyweight', 'Lower ab exercise raising straight legs while lying on back.', 'Keep lower back pressed to floor. Lower legs slowly with control. Bend knees slightly if needed.', 0),
('Flutter Kicks', 'Core', 'Bodyweight', 'Alternating small leg kicks while lying on back for lower ab endurance.', 'Keep lower back pressed to floor. Small controlled movements. Keep legs relatively straight.', 0),
('Scissor Kicks', 'Core', 'Bodyweight', 'Crossing leg movements while lying on back targeting lower abs.', 'Keep lower back pressed to floor. Cross legs in controlled motion. Maintain core engagement.', 0),
('V-Ups', 'Core', 'Bodyweight', 'Advanced exercise simultaneously lifting torso and legs to form a V shape.', 'Reach hands toward toes at the top. Control the descent. Keep legs as straight as possible.', 0),
('Hollow Body Hold', 'Core', 'Bodyweight', 'Gymnastic core exercise holding a curved position with arms and legs extended.', 'Press lower back into floor. Arms by ears, legs straight. Scale by bending knees or lowering arms.', 0),
('Russian Twist', 'Core', 'Bodyweight', 'Seated rotational exercise twisting torso side to side.', 'Lean back slightly and lift feet off ground. Rotate through the torso. Can add weight for progression.', 0),
('Toe Touches', 'Core', 'Bodyweight', 'Lying crunch reaching hands toward elevated feet.', 'Keep legs vertical. Reach up with hands toward toes. Lower with control.', 0),
('Plank Shoulder Taps', 'Core', 'Bodyweight', 'Plank variation alternating tapping opposite shoulder with hand.', 'Minimize hip rotation. Keep core tight. Widen feet for more stability.', 0),
('Plank to Push-up', 'Core', 'Bodyweight', 'Dynamic plank transitioning between forearm and hand positions.', 'Keep hips stable throughout. Alternate leading arm. Maintain straight body line.', 0),
('Superman', 'Core', 'Bodyweight', 'Prone back extension lifting arms and legs off the ground.', 'Lift arms and legs simultaneously. Squeeze glutes and lower back. Hold briefly at the top.', 0),
('Windshield Wipers', 'Core', 'Bodyweight', 'Advanced rotational exercise lowering legs side to side while lying on back.', 'Keep shoulders on floor. Control the rotation. Start with bent knees if needed.', 0);

-- Add pull-up bar core exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Hanging Knee Raises', 'Core', 'Pull-up Bar', 'Hanging exercise raising knees toward chest.', 'Minimize swinging. Use abs to lift knees, not momentum. Control the lowering.', 0),
('Hanging Leg Raises', 'Core', 'Pull-up Bar', 'Advanced hanging exercise raising straight legs to horizontal or higher.', 'Keep legs straight. Lift with control using abs. Avoid excessive swinging.', 0),
('Hanging Oblique Knee Raises', 'Core', 'Pull-up Bar', 'Hanging knee raises with rotation to target obliques.', 'Raise knees toward opposite elbow. Alternate sides. Control the movement.', 0),
('Toes to Bar', 'Core', 'Pull-up Bar', 'Advanced hanging exercise touching toes to the bar.', 'Use kipping motion or strict form. Engage lats to initiate. Control the descent.', 0),
('Hanging L-Sit', 'Core', 'Pull-up Bar', 'Isometric hold with legs extended horizontally while hanging.', 'Keep legs straight and parallel to floor. Engage abs and hip flexors. Build up hold time.', 0),
('Hanging Windshield Wipers', 'Core', 'Pull-up Bar', 'Advanced hanging exercise rotating legs side to side.', 'Raise legs high then rotate side to side. Control the movement. Requires significant core strength.', 0);
