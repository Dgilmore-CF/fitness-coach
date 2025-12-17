-- Add cardio exercises for various activities
INSERT INTO exercises (name, muscle_group, equipment, description, tips, is_unilateral) VALUES
('Treadmill Running', 'Cardio', 'Treadmill', 'Running on a treadmill at various speeds and inclines.', 'Start with a warm-up pace. Maintain good posture. Use incline for added intensity.', 0),
('Treadmill Walking', 'Cardio', 'Treadmill', 'Walking on a treadmill, great for low-impact cardio.', 'Use incline for more challenge. Keep a brisk pace. Swing arms naturally.', 0),
('Treadmill Incline Walk', 'Cardio', 'Treadmill', 'Walking at high incline for intense cardio without running.', 'Set incline to 10-15%. Maintain moderate speed. Great for building endurance.', 0),
('Stationary Bike', 'Cardio', 'Stationary Bike', 'Cycling on a stationary bike for cardiovascular fitness.', 'Adjust seat height properly. Vary resistance levels. Maintain steady cadence.', 0),
('Spin Bike Intervals', 'Cardio', 'Stationary Bike', 'High-intensity interval training on a spin bike.', 'Alternate between high and low intensity. Stand for sprints. Stay hydrated.', 0),
('Elliptical Trainer', 'Cardio', 'Elliptical', 'Low-impact full-body cardio on an elliptical machine.', 'Use handles for upper body engagement. Vary resistance and incline. Pedal forward and backward.', 0),
('Stair Climber', 'Cardio', 'Stair Machine', 'Climbing stairs on a stair machine for leg and cardio work.', 'Avoid leaning on handles. Take full steps. Maintain upright posture.', 0),
('Jump Rope', 'Cardio', 'Jump Rope', 'Jumping rope for high-intensity cardio and coordination.', 'Start with basic jumps. Keep elbows close to body. Land softly on balls of feet.', 0),
('Outdoor Running', 'Cardio', 'Bodyweight', 'Running outdoors on roads, trails, or tracks.', 'Wear proper footwear. Stay hydrated. Vary terrain for different challenges.', 0),
('Outdoor Walking', 'Cardio', 'Bodyweight', 'Walking outdoors for low-impact cardiovascular exercise.', 'Maintain brisk pace. Use proper walking form. Great for active recovery.', 0),
('Outdoor Cycling', 'Cardio', 'Bicycle', 'Cycling outdoors on roads or trails.', 'Wear helmet. Adjust bike fit. Vary routes for different intensities.', 0),
('Swimming', 'Cardio', 'Pool', 'Swimming laps for full-body cardiovascular exercise.', 'Vary strokes for different muscle engagement. Focus on breathing technique. Great low-impact option.', 0),
('HIIT Circuit', 'Cardio', 'Bodyweight', 'High-intensity interval training combining various exercises.', 'Work hard during work periods. Rest completely during rest periods. Modify exercises as needed.', 0),
('Battle Ropes', 'Cardio', 'Battle Ropes', 'High-intensity cardio using heavy ropes for waves and slams.', 'Keep core engaged. Vary wave patterns. Maintain athletic stance.', 0),
('Box Jumps', 'Cardio', 'Plyo Box', 'Explosive jumping onto a box for power and cardio.', 'Start with lower box. Land softly. Step down rather than jump down.', 0),
('Burpees', 'Cardio', 'Bodyweight', 'Full-body exercise combining squat, plank, and jump.', 'Modify by removing jump or push-up. Keep core tight. Pace yourself.', 0),
('Jumping Jacks', 'Cardio', 'Bodyweight', 'Classic cardio exercise with jumping and arm movements.', 'Land softly. Keep core engaged. Great for warm-ups or HIIT.', 0),
('High Knees', 'Cardio', 'Bodyweight', 'Running in place with exaggerated knee lifts.', 'Drive knees up to hip height. Pump arms. Stay on balls of feet.', 0),
('Mountain Climbers', 'Cardio', 'Bodyweight', 'Plank position with alternating knee drives for cardio.', 'Keep hips level. Drive knees toward chest. Maintain steady pace.', 0);

-- Add cardio_duration_seconds and calories_burned columns to sets table for cardio tracking
-- Note: For cardio exercises, weight_kg can store distance (in meters) and reps can store intervals
