-- Add comprehensive bodyweight exercises for all muscle groups

-- Chest bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Push-Up', 'Chest', 'Bodyweight', 'Classic bodyweight exercise for chest, shoulders, and triceps.', 'Keep body in straight line. Lower chest to floor. Full range of motion.', 0),
('Wide Push-Up', 'Chest', 'Bodyweight', 'Push-up variation with hands wider than shoulder width targeting outer chest.', 'Hands placed 1.5x shoulder width. Keep elbows at 45 degrees. Control the descent.', 0),
('Diamond Push-Up', 'Chest', 'Bodyweight', 'Push-up with hands close together forming a diamond shape, emphasizing triceps.', 'Hands form diamond under chest. Keep elbows close to body. Great for inner chest and triceps.', 0),
('Decline Push-Up', 'Chest', 'Bodyweight', 'Push-up with feet elevated targeting upper chest.', 'Feet on bench or step. Higher elevation increases difficulty. Keep core tight.', 0),
('Incline Push-Up', 'Chest', 'Bodyweight', 'Push-up with hands elevated, easier variation targeting lower chest.', 'Hands on bench or step. Great for beginners. Progress to floor push-ups.', 0),
('Pike Push-Up', 'Chest', 'Bodyweight', 'Push-up in pike position targeting shoulders and upper chest.', 'Hips high in air forming inverted V. Lower head toward floor. Builds toward handstand push-ups.', 0),
('Archer Push-Up', 'Chest', 'Bodyweight', 'Wide push-up shifting weight to one arm at a time.', 'One arm extends to side while other does the work. Alternate sides. Builds toward one-arm push-up.', 1),
('Clap Push-Up', 'Chest', 'Bodyweight', 'Explosive push-up with clap at the top for power development.', 'Push explosively off floor. Clap hands quickly. Land softly with bent elbows.', 0),
('Pseudo Planche Push-Up', 'Chest', 'Bodyweight', 'Push-up with hands positioned by hips, leaning forward.', 'Lean forward significantly. Hands by waist. Builds toward planche.', 0),
('Hindu Push-Up', 'Chest', 'Bodyweight', 'Flowing push-up moving from downward dog through to upward dog.', 'Start in pike position. Swoop down and through. Reverse the motion.', 0),
('Spiderman Push-Up', 'Chest', 'Bodyweight', 'Push-up bringing knee to elbow on each rep for added core work.', 'Bring knee toward same-side elbow as you lower. Alternate sides. Keep hips level.', 0),
('Staggered Push-Up', 'Chest', 'Bodyweight', 'Push-up with one hand forward and one back for unilateral emphasis.', 'One hand ahead, one back. Switch hand positions each set. Builds unilateral strength.', 1),
('One-Arm Push-Up', 'Chest', 'Bodyweight', 'Advanced push-up performed on single arm.', 'Feet wide for balance. Opposite hand behind back. Requires significant strength.', 1);

-- Back bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Pull-Up', 'Back', 'Pull-up Bar', 'Classic bodyweight back exercise with overhand grip.', 'Pull until chin over bar. Control the descent. Full extension at bottom.', 0),
('Chin-Up', 'Back', 'Pull-up Bar', 'Pull-up variation with underhand grip emphasizing biceps.', 'Palms facing you. Pull chest to bar. Excellent bicep engagement.', 0),
('Neutral Grip Pull-Up', 'Back', 'Pull-up Bar', 'Pull-up with palms facing each other.', 'Use parallel handles. Easier on shoulders. Good middle ground between pull-up and chin-up.', 0),
('Wide Grip Pull-Up', 'Back', 'Pull-up Bar', 'Pull-up with extra wide grip targeting lats.', 'Grip outside shoulder width. Focus on lat engagement. May reduce range of motion.', 0),
('Close Grip Pull-Up', 'Back', 'Pull-up Bar', 'Pull-up with hands close together.', 'Hands 6-8 inches apart. More bicep involvement. Full range of motion.', 0),
('Commando Pull-Up', 'Back', 'Pull-up Bar', 'Pull-up with hands in line, alternating head to each side of bar.', 'Grip bar lengthwise. Pull head to alternating sides. Works grip and core.', 0),
('Archer Pull-Up', 'Back', 'Pull-up Bar', 'Wide grip pull-up shifting weight to one arm at a time.', 'Pull toward one hand while other extends. Alternate sides. Builds toward one-arm pull-up.', 1),
('Muscle-Up', 'Back', 'Pull-up Bar', 'Advanced move transitioning from pull-up to dip position above bar.', 'Explosive pull-up transitioning over bar. Requires significant strength and technique.', 0),
('Australian Pull-Up', 'Back', 'Bodyweight', 'Inverted row using a low bar or rings at waist height.', 'Body horizontal under bar. Pull chest to bar. Great pull-up progression.', 0),
('Inverted Row', 'Back', 'Bodyweight', 'Horizontal pulling exercise using low bar, table, or rings.', 'Keep body straight. Pull chest to bar. Easier than pull-ups.', 0),
('Scapular Pull-Up', 'Back', 'Pull-up Bar', 'Partial pull-up focusing on scapular retraction and depression.', 'Hang from bar. Pull shoulder blades down and back. Small movement, big activation.', 0),
('Typewriter Pull-Up', 'Back', 'Pull-up Bar', 'Pull-up moving side to side at the top position.', 'Pull up, then shift side to side. Keep chin above bar throughout. Advanced movement.', 0),
('L-Sit Pull-Up', 'Back', 'Pull-up Bar', 'Pull-up while holding legs extended horizontally.', 'Hold L-sit throughout movement. Intense core engagement. Very challenging.', 0),
('One-Arm Pull-Up', 'Back', 'Pull-up Bar', 'Advanced pull-up performed with single arm.', 'Elite level movement. Use assisted variations to build up. Requires years of training.', 1);

-- Shoulder bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Handstand Push-Up', 'Shoulders', 'Bodyweight', 'Inverted push-up in handstand position against wall.', 'Kick up to wall. Lower head to floor. Press back up. Advanced movement.', 0),
('Wall Handstand Hold', 'Shoulders', 'Bodyweight', 'Isometric hold in handstand position against wall.', 'Chest to wall or back to wall. Engage shoulders and core. Build time gradually.', 0),
('Pike Push-Up', 'Shoulders', 'Bodyweight', 'Push-up in pike position targeting shoulders.', 'Hips high, head between arms. Lower forehead toward floor. Handstand push-up progression.', 0),
('Elevated Pike Push-Up', 'Shoulders', 'Bodyweight', 'Pike push-up with feet elevated for increased shoulder load.', 'Feet on box or bench. More vertical angle. Closer to handstand push-up.', 0),
('Wall Walk', 'Shoulders', 'Bodyweight', 'Walking hands up wall to handstand and back down.', 'Start in push-up position. Walk feet up wall, hands toward wall. Builds handstand strength.', 0),
('Shoulder Tap', 'Shoulders', 'Bodyweight', 'Plank position alternating tapping opposite shoulder.', 'Minimize hip rotation. Keep core tight. Anti-rotation shoulder work.', 0),
('Crab Walk', 'Shoulders', 'Bodyweight', 'Walking on hands and feet with belly facing up.', 'Hips elevated. Walk forward, backward, or sideways. Works rear delts and triceps.', 0),
('Bear Crawl', 'Shoulders', 'Bodyweight', 'Crawling on hands and feet with knees hovering.', 'Knees hover 2 inches off ground. Opposite hand and foot move together. Full body engagement.', 0),
('YTW Raises', 'Shoulders', 'Bodyweight', 'Prone raises in Y, T, and W positions for rear delts.', 'Lie face down. Raise arms in Y, T, then W shapes. Great for shoulder health.', 0),
('Prone I-Y-T', 'Shoulders', 'Bodyweight', 'Lying face down raising arms in I, Y, and T positions.', 'Arms straight for I, angled for Y, out for T. Targets different shoulder muscles.', 0);

-- Biceps bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Chin-Up', 'Biceps', 'Pull-up Bar', 'Underhand grip pull-up emphasizing biceps.', 'Palms facing you. Full range of motion. Control the negative.', 0),
('Bodyweight Bicep Curl', 'Biceps', 'Bodyweight', 'Using a low bar or rings to curl body weight.', 'Grip low bar underhand. Curl body up keeping elbows fixed. Like inverted row but curl motion.', 0),
('Headbanger', 'Biceps', 'Pull-up Bar', 'At top of pull-up, push and pull horizontally.', 'Hold at top of chin-up. Push away then pull back in. Intense bicep work.', 0),
('Ring Bicep Curl', 'Biceps', 'Gymnastic Rings', 'Curling movement using gymnastic rings.', 'Lean back with rings. Curl body up by bending elbows. Adjust angle for difficulty.', 0);

-- Triceps bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Dip', 'Triceps', 'Dip Bars', 'Classic bodyweight tricep exercise on parallel bars.', 'Lower until upper arms parallel to floor. Keep elbows close for tricep focus. Lean forward for chest.', 0),
('Bench Dip', 'Triceps', 'Bodyweight', 'Dip variation with hands on bench and feet on floor.', 'Hands on bench behind you. Lower body by bending elbows. Keep back close to bench.', 0),
('Ring Dip', 'Triceps', 'Gymnastic Rings', 'Dip performed on unstable gymnastic rings.', 'Stabilize rings throughout. Turn rings out at top. More challenging than bar dips.', 0),
('Close-Grip Push-Up', 'Triceps', 'Bodyweight', 'Push-up with hands close together targeting triceps.', 'Hands under chest, close together. Keep elbows tucked. Diamond push-up variation.', 0),
('Tricep Extension', 'Triceps', 'Bodyweight', 'Using low bar to perform bodyweight tricep extensions.', 'Grip bar, lean forward. Bend only at elbows. Like a skull crusher with body weight.', 0),
('Tiger Bend Push-Up', 'Triceps', 'Bodyweight', 'Push-up transitioning between forearm and hand position.', 'Lower to forearms then press back to hands. Intense tricep work. Advanced movement.', 0),
('Korean Dip', 'Triceps', 'Dip Bars', 'Dip with bar behind body for different angle.', 'Bar behind you. Lean back slightly. Targets triceps differently.', 0),
('Sphinx Push-Up', 'Triceps', 'Bodyweight', 'Push-up from forearm plank position pressing to high plank.', 'Start on forearms. Press up to hands. Lower back down. Tricep focused.', 0);

-- Legs bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Bodyweight Squat', 'Quads', 'Bodyweight', 'Classic air squat with no weight.', 'Feet shoulder width. Squat to parallel or below. Keep weight on heels.', 0),
('Pistol Squat', 'Quads', 'Bodyweight', 'Single-leg squat with other leg extended forward.', 'Stand on one leg. Squat down with other leg straight out. Requires balance and strength.', 1),
('Bulgarian Split Squat', 'Quads', 'Bodyweight', 'Single-leg squat with rear foot elevated.', 'Rear foot on bench. Lower until front thigh parallel. Keep torso upright.', 1),
('Shrimp Squat', 'Quads', 'Bodyweight', 'Single-leg squat holding rear foot behind you.', 'Hold rear foot with hand. Squat on one leg. Alternative to pistol squat.', 1),
('Jump Squat', 'Quads', 'Bodyweight', 'Explosive squat jumping at the top.', 'Squat down then explode up. Land softly. Great for power development.', 0),
('Sissy Squat', 'Quads', 'Bodyweight', 'Squat leaning back with heels elevated targeting quads.', 'Hold onto support. Lean back, bend knees. Intense quad isolation.', 0),
('Wall Sit', 'Quads', 'Bodyweight', 'Isometric hold in squat position against wall.', 'Back flat against wall. Thighs parallel to floor. Hold for time.', 0),
('Step-Up', 'Quads', 'Bodyweight', 'Stepping up onto a box or bench.', 'Drive through front foot. Dont push off back foot. Control the descent.', 1),
('Reverse Lunge', 'Quads', 'Bodyweight', 'Lunge stepping backward.', 'Step back into lunge. Front knee over ankle. Return to standing.', 1),
('Walking Lunge', 'Quads', 'Bodyweight', 'Continuous lunges moving forward.', 'Alternate legs as you walk. Keep torso upright. Full range of motion.', 1),
('Lateral Lunge', 'Quads', 'Bodyweight', 'Lunge stepping to the side.', 'Step wide to side. Sit hips back. Keep other leg straight.', 1),
('Curtsy Lunge', 'Quads', 'Bodyweight', 'Lunge stepping behind and across the body.', 'Step back and across. Targets glutes and inner thighs. Keep torso upright.', 1),
('Skater Squat', 'Quads', 'Bodyweight', 'Single-leg squat with rear leg floating behind.', 'Bend knee and hip to lower. Rear leg doesnt touch ground. Good pistol squat progression.', 1),
('Cossack Squat', 'Quads', 'Bodyweight', 'Wide stance squat shifting weight to one side.', 'Wide stance. Shift to one side, other leg straight. Great for mobility and strength.', 1),
('Box Jump', 'Quads', 'Plyo Box', 'Explosive jump onto a box.', 'Jump with both feet. Land softly on box. Step down to protect joints.', 0),
('Broad Jump', 'Quads', 'Bodyweight', 'Horizontal jump for distance.', 'Swing arms for momentum. Jump forward as far as possible. Land softly.', 0),
('Tuck Jump', 'Quads', 'Bodyweight', 'Jump bringing knees to chest at top.', 'Explosive jump. Pull knees high. Land softly with bent knees.', 0),
('Split Jump', 'Quads', 'Bodyweight', 'Jumping lunge alternating legs in the air.', 'Start in lunge. Jump and switch legs. Land softly in opposite lunge.', 0);

-- Hamstrings bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Nordic Curl', 'Hamstrings', 'Bodyweight', 'Eccentric hamstring exercise lowering body from kneeling.', 'Kneel with feet anchored. Lower body forward with control. Use hands to push back up initially.', 0),
('Glute Ham Raise', 'Hamstrings', 'GHD', 'Hip and knee extension on glute ham developer.', 'Start horizontal. Curl up using hamstrings. Keep hips extended.', 0),
('Single-Leg Romanian Deadlift', 'Hamstrings', 'Bodyweight', 'Single-leg hip hinge for hamstrings and balance.', 'Stand on one leg. Hinge forward keeping back flat. Rear leg extends behind.', 1),
('Good Morning', 'Hamstrings', 'Bodyweight', 'Hip hinge with hands behind head.', 'Feet hip width. Hinge at hips keeping back flat. Feel stretch in hamstrings.', 0),
('Sliding Leg Curl', 'Hamstrings', 'Bodyweight', 'Leg curl using sliders or towel on smooth floor.', 'Lie on back, heels on sliders. Bridge up then curl heels toward glutes.', 0),
('Glute Bridge March', 'Hamstrings', 'Bodyweight', 'Glute bridge alternating lifting knees.', 'Hold bridge position. Alternate lifting knees. Challenges hamstrings and stability.', 0);

-- Glutes bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Glute Bridge', 'Glutes', 'Bodyweight', 'Hip extension lying on back with feet on floor.', 'Drive through heels. Squeeze glutes at top. Dont hyperextend lower back.', 0),
('Single-Leg Glute Bridge', 'Glutes', 'Bodyweight', 'Glute bridge performed on one leg.', 'One leg extended or bent. Drive through working heel. Keep hips level.', 1),
('Hip Thrust', 'Glutes', 'Bodyweight', 'Hip extension with upper back on bench.', 'Shoulders on bench. Drive hips up. Squeeze glutes at top.', 0),
('Donkey Kick', 'Glutes', 'Bodyweight', 'Quadruped exercise kicking leg back and up.', 'On hands and knees. Kick one leg back and up. Keep core engaged.', 1),
('Fire Hydrant', 'Glutes', 'Bodyweight', 'Quadruped exercise lifting leg to the side.', 'On hands and knees. Lift leg to side keeping knee bent. Targets glute medius.', 1),
('Clamshell', 'Glutes', 'Bodyweight', 'Side-lying exercise opening knees while feet stay together.', 'Lie on side, knees bent. Open top knee like a clamshell. Targets glute medius.', 1),
('Glute Kickback', 'Glutes', 'Bodyweight', 'Standing or quadruped leg extension behind body.', 'Extend leg straight back. Squeeze glute at top. Control the movement.', 1),
('Frog Pump', 'Glutes', 'Bodyweight', 'Glute bridge with soles of feet together and knees out.', 'Soles together, knees dropped out. Thrust hips up. Unique glute activation.', 0),
('Bird Dog', 'Glutes', 'Bodyweight', 'Quadruped opposite arm and leg extension.', 'Extend opposite arm and leg. Keep spine neutral. Hold briefly.', 0);

-- Calves bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Standing Calf Raise', 'Calves', 'Bodyweight', 'Rising onto toes while standing.', 'Rise as high as possible. Pause at top. Full range of motion at bottom.', 0),
('Single-Leg Calf Raise', 'Calves', 'Bodyweight', 'Calf raise performed on one leg.', 'Hold wall for balance. Full range of motion. Can use step for extra stretch.', 1),
('Seated Calf Raise', 'Calves', 'Bodyweight', 'Calf raise while seated targeting soleus.', 'Sit with weight on knees. Rise onto toes. Different angle than standing.', 0),
('Jump Rope', 'Calves', 'Jump Rope', 'Jumping rope for calf endurance and conditioning.', 'Stay on balls of feet. Small jumps. Great for calf endurance.', 0),
('Stair Calf Raise', 'Calves', 'Bodyweight', 'Calf raise on stair edge for full range of motion.', 'Heels hang off step. Rise up fully. Lower below step level for stretch.', 0);

-- Forearms bodyweight exercises
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Dead Hang', 'Forearms', 'Pull-up Bar', 'Hanging from bar for grip strength and decompression.', 'Hang with arms straight. Relax shoulders initially. Build time gradually.', 0),
('Active Hang', 'Forearms', 'Pull-up Bar', 'Hanging with shoulders engaged and pulled down.', 'Hang from bar. Pull shoulders down and back. Engage lats.', 0),
('Finger Tip Push-Up', 'Forearms', 'Bodyweight', 'Push-up performed on fingertips.', 'Support weight on fingertips. Build gradually. Strengthens fingers and forearms.', 0),
('Towel Hang', 'Forearms', 'Bodyweight', 'Hanging from bar using towels for grip challenge.', 'Drape towels over bar. Grip towels and hang. Intense grip work.', 0),
('Wrist Push-Up', 'Forearms', 'Bodyweight', 'Push-up position on backs of hands.', 'Hands inverted, knuckles down. Build gradually. Strengthens wrist extensors.', 0);
