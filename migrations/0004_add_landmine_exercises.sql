-- Add landmine attachment exercises
-- Landmine allows for unique angles and movements with one end of the barbell anchored

INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
-- Pressing Movements
('Landmine Press', 'Shoulders', 'Landmine', 'Unilateral overhead pressing with natural arc motion', 'Press the bar from shoulder height. Follow the natural arc path. Keep core tight and avoid excessive lean.', 1),
('Landmine Chest Press', 'Chest', 'Landmine', 'Horizontal pressing movement targeting chest', 'Hold bar at chest level, press forward and up. Can be done standing or in a lunge position for stability.', 1),

-- Pulling/Back Movements
('Landmine Row', 'Back', 'Landmine', 'Single arm rowing movement with neutral grip', 'Hinge at hips, pull bar to hip. Keep elbow close to body. Avoid rotating torso.', 1),
('Landmine Meadows Row', 'Back', 'Landmine', 'Wide stance row for lat development', 'Straddle the bar, wide stance. Pull with straight arm path. Pioneered by John Meadows.', 1),

-- Lower Body
('Landmine Squat', 'Legs', 'Landmine', 'Goblet-style squat with landmine', 'Hold bar at chest, squat to depth. Keeps torso more upright than back squat.', 0),
('Landmine Romanian Deadlift', 'Hamstrings', 'Landmine', 'Hip hinge movement for posterior chain', 'Slight knee bend, push hips back. Keep bar close to legs. Single or double arm.', 0),
('Landmine Single Leg RDL', 'Hamstrings', 'Landmine', 'Unilateral balance and hamstring work', 'Stand on one leg, hinge forward. Reach free leg back. Great for balance and stability.', 1),
('Landmine Reverse Lunge', 'Legs', 'Landmine', 'Lunge variation with front-loaded weight', 'Hold bar at chest, step back into lunge. Front-loaded position challenges quads and core.', 1),

-- Core/Rotational
('Landmine Rotation', 'Core', 'Landmine', 'Anti-rotation and oblique strengthening', 'Hold bar at chest height, rotate side to side. Control the movement, engage obliques. Can be half-kneeling or standing.', 0),
('Landmine Rainbow', 'Core', 'Landmine', 'Full rotational movement from floor to overhead', 'Swing bar in arc from one side to other overhead. Dynamic core and shoulder stability.', 0),
('Landmine Russian Twist', 'Core', 'Landmine', 'Seated rotational core exercise', 'Sit at base of landmine, rotate bar side to side. Keep arms extended, rotate through core.', 0),
('Landmine Anti-Rotation Press', 'Core', 'Landmine', 'Pressing movement that resists rotation', 'Hold bar at chest, press forward while resisting rotational force. Excellent anti-rotation drill.', 0),

-- Shoulder Specific
('Landmine Lateral Raise', 'Shoulders', 'Landmine', 'Medial deltoid isolation with unique angle', 'Stand perpendicular to landmine, raise bar laterally. Targets side delts with constant tension.', 1),
('Landmine Front Raise', 'Shoulders', 'Landmine', 'Front deltoid and upper chest work', 'Face the landmine, raise bar forward and up. Keep slight bend in elbows.', 0);
