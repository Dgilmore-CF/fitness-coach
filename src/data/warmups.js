/**
 * Warmup and Stretch Database
 * Organized by muscle groups for dynamic workout preparation
 */

export const warmupDatabase = {
  'Chest': [
    {
      name: 'Arm Circles',
      duration: '30 seconds',
      description: 'Stand with arms extended. Make large circles forward, then backward.',
      reps: '10 forward, 10 backward'
    },
    {
      name: 'Wall Chest Stretch',
      duration: '30 seconds each side',
      description: 'Place forearm on wall at shoulder height. Rotate body away from wall.',
      reps: '2 sets per side'
    },
    {
      name: 'Dynamic Push-ups',
      duration: '1 minute',
      description: 'Perform slow, controlled push-ups focusing on full range of motion.',
      reps: '10-15 reps'
    }
  ],
  
  'Back': [
    {
      name: 'Cat-Cow Stretch',
      duration: '1 minute',
      description: 'On hands and knees, alternate arching and rounding your back.',
      reps: '10-12 cycles'
    },
    {
      name: 'Scapular Pull-ups',
      duration: '30 seconds',
      description: 'Hang from bar, engage shoulder blades by pulling them down and together.',
      reps: '8-10 reps'
    },
    {
      name: 'Thoracic Rotations',
      duration: '30 seconds each side',
      description: 'On hands and knees, rotate torso opening up through the thoracic spine.',
      reps: '8-10 per side'
    }
  ],
  
  'Shoulders': [
    {
      name: 'Shoulder Circles',
      duration: '30 seconds',
      description: 'Roll shoulders forward in large circles, then backward.',
      reps: '10 forward, 10 backward'
    },
    {
      name: 'Band Pull-Aparts',
      duration: '1 minute',
      description: 'Hold resistance band at chest height, pull apart squeezing shoulder blades.',
      reps: '15-20 reps'
    },
    {
      name: 'Cross-Body Shoulder Stretch',
      duration: '30 seconds each side',
      description: 'Pull one arm across body at shoulder height, hold stretch.',
      reps: '2 sets per side'
    }
  ],
  
  'Legs': [
    {
      name: 'Leg Swings',
      duration: '30 seconds each direction',
      description: 'Hold wall for balance, swing leg forward/back then side to side.',
      reps: '10-15 each direction'
    },
    {
      name: 'Walking Lunges',
      duration: '1 minute',
      description: 'Step forward into lunge, alternate legs with each step.',
      reps: '10-12 per leg'
    },
    {
      name: 'Bodyweight Squats',
      duration: '1 minute',
      description: 'Perform slow, controlled squats focusing on depth and form.',
      reps: '15-20 reps'
    }
  ],
  
  'Quads': [
    {
      name: 'Standing Quad Stretch',
      duration: '30 seconds each leg',
      description: 'Stand on one leg, pull other foot to glutes, feel stretch in front of thigh.',
      reps: '2 sets per leg'
    },
    {
      name: 'Leg Extensions (Light)',
      duration: '1 minute',
      description: 'Perform bodyweight or very light leg extensions to warm quadriceps.',
      reps: '15-20 reps'
    },
    {
      name: 'High Knees',
      duration: '30 seconds',
      description: 'March in place bringing knees to chest height.',
      reps: '20-30 total'
    }
  ],
  
  'Hamstrings': [
    {
      name: 'Standing Hamstring Stretch',
      duration: '30 seconds each leg',
      description: 'Place heel on elevated surface, lean forward keeping back straight.',
      reps: '2 sets per leg'
    },
    {
      name: 'Leg Curls (Light)',
      duration: '1 minute',
      description: 'Perform bodyweight or light leg curls to activate hamstrings.',
      reps: '15-20 reps'
    },
    {
      name: 'Inchworms',
      duration: '1 minute',
      description: 'Bend at waist, walk hands out to plank, walk feet to hands.',
      reps: '8-10 reps'
    }
  ],
  
  'Glutes': [
    {
      name: 'Glute Bridges',
      duration: '1 minute',
      description: 'Lie on back, feet flat, lift hips squeezing glutes at top.',
      reps: '15-20 reps'
    },
    {
      name: 'Fire Hydrants',
      duration: '30 seconds each side',
      description: 'On hands and knees, lift one leg out to side keeping knee bent.',
      reps: '12-15 per side'
    },
    {
      name: 'Donkey Kicks',
      duration: '30 seconds each side',
      description: 'On hands and knees, kick one leg back and up.',
      reps: '12-15 per side'
    }
  ],
  
  'Biceps': [
    {
      name: 'Arm Swings',
      duration: '30 seconds',
      description: 'Swing arms across body and back out, warming shoulder and elbow joints.',
      reps: '15-20 swings'
    },
    {
      name: 'Wall Bicep Stretch',
      duration: '30 seconds each arm',
      description: 'Extend arm behind you against wall, palm facing back, lean forward.',
      reps: '2 sets per arm'
    },
    {
      name: 'Light Band Curls',
      duration: '1 minute',
      description: 'Use resistance band for light curls, focus on blood flow.',
      reps: '15-20 reps'
    }
  ],
  
  'Triceps': [
    {
      name: 'Overhead Tricep Stretch',
      duration: '30 seconds each arm',
      description: 'Reach one arm overhead, bend elbow bringing hand to back, pull with other hand.',
      reps: '2 sets per arm'
    },
    {
      name: 'Bench Dips (Light)',
      duration: '1 minute',
      description: 'Perform slow, controlled dips on bench to warm triceps.',
      reps: '12-15 reps'
    },
    {
      name: 'Arm Extensions',
      duration: '30 seconds',
      description: 'Extend arms overhead and back down, warming shoulder and tricep.',
      reps: '15-20 reps'
    }
  ],
  
  'Abs': [
    {
      name: 'Standing Torso Twists',
      duration: '30 seconds',
      description: 'Stand with hands behind head, rotate torso side to side.',
      reps: '20-30 total'
    },
    {
      name: 'Dead Bug',
      duration: '1 minute',
      description: 'Lie on back, alternate lowering opposite arm and leg while keeping core engaged.',
      reps: '10-12 per side'
    },
    {
      name: 'Plank Hold',
      duration: '30-60 seconds',
      description: 'Hold plank position, focusing on core engagement.',
      reps: '1-2 sets'
    }
  ],
  
  'Core': [
    {
      name: 'Bird Dogs',
      duration: '1 minute',
      description: 'On hands and knees, extend opposite arm and leg, alternate sides.',
      reps: '10-12 per side'
    },
    {
      name: 'Side Plank Hold',
      duration: '30 seconds each side',
      description: 'Hold side plank, engaging obliques and entire core.',
      reps: '1-2 sets per side'
    },
    {
      name: 'Mountain Climbers',
      duration: '30 seconds',
      description: 'In plank position, alternate bringing knees to chest.',
      reps: '20-30 total'
    }
  ],
  
  'Calves': [
    {
      name: 'Calf Raises',
      duration: '1 minute',
      description: 'Stand on edge of step, raise up onto toes then lower heels below step.',
      reps: '20-25 reps'
    },
    {
      name: 'Ankle Circles',
      duration: '30 seconds each foot',
      description: 'Rotate ankle in circles, both directions.',
      reps: '10 each direction'
    },
    {
      name: 'Wall Calf Stretch',
      duration: '30 seconds each leg',
      description: 'Lean against wall with one leg back, press heel down to stretch calf.',
      reps: '2 sets per leg'
    }
  ],
  
  'Full Body': [
    {
      name: 'Jumping Jacks',
      duration: '1 minute',
      description: 'Classic jumping jacks to raise heart rate and warm entire body.',
      reps: '30-40 reps'
    },
    {
      name: 'Burpees (Light)',
      duration: '1 minute',
      description: 'Perform controlled burpees without the jump to warm up.',
      reps: '8-10 reps'
    },
    {
      name: 'Dynamic Stretching Flow',
      duration: '2 minutes',
      description: 'Flow through: toe touches, torso twists, arm circles, leg swings.',
      reps: 'Continuous for 2 min'
    }
  ]
};

/**
 * Get warmup exercises for specific muscle groups
 */
export function getWarmupsForMuscles(muscleGroups) {
  const warmups = [];
  const seen = new Set();
  
  // Add warmups for each muscle group
  for (const muscle of muscleGroups) {
    const exercises = warmupDatabase[muscle] || [];
    for (const ex of exercises) {
      if (!seen.has(ex.name)) {
        warmups.push({ ...ex, muscle });
        seen.add(ex.name);
      }
    }
  }
  
  // If no specific warmups found, add full body
  if (warmups.length === 0) {
    return warmupDatabase['Full Body'].map(ex => ({ ...ex, muscle: 'Full Body' }));
  }
  
  return warmups;
}
