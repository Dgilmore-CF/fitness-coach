/**
 * Achievements and Challenges Service
 * Tracks user progress, awards achievements, and manages streaks
 */

import { calculateOneRepMax } from './ai.js';

/**
 * Check and award achievements after workout completion
 */
export async function checkAndAwardAchievements(db, userId, workoutId) {
  console.log(`🏆 Checking achievements for user ${userId} after workout ${workoutId}...`);
  
  const newAchievements = [];
  
  try {
    // Check all achievement types
    await updateWorkoutStreak(db, userId);
    newAchievements.push(...await checkConsistencyAchievements(db, userId));
    newAchievements.push(...await checkStrengthAchievements(db, userId, workoutId));
    newAchievements.push(...await checkVolumeAchievements(db, userId));
    newAchievements.push(...await checkMilestoneAchievements(db, userId));
    
    if (newAchievements.length > 0) {
      console.log(`✅ Awarded ${newAchievements.length} new achievement(s)!`);
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

/**
 * Update workout streak for user
 */
async function updateWorkoutStreak(db, userId) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get current streak data
  let streak = await db.prepare(
    'SELECT * FROM workout_streaks WHERE user_id = ?'
  ).bind(userId).first();
  
  if (!streak) {
    // First workout ever - initialize streak
    await db.prepare(`
      INSERT INTO workout_streaks (user_id, current_streak, longest_streak, last_workout_date, streak_start_date)
      VALUES (?, 1, 1, ?, ?)
    `).bind(userId, today, today).run();
    return;
  }
  
  const lastDate = new Date(streak.last_workout_date);
  const todayDate = new Date(today);
  const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
  
  let newStreak = streak.current_streak;
  let newLongest = streak.longest_streak;
  let streakStart = streak.streak_start_date;
  
  if (daysDiff === 0) {
    // Same day workout - no streak change
    return;
  } else if (daysDiff <= 7) {
    // Within same week or continuous - increment streak
    newStreak += 1;
    if (newStreak > newLongest) {
      newLongest = newStreak;
    }
  } else {
    // Streak broken - reset
    newStreak = 1;
    streakStart = today;
  }
  
  await db.prepare(`
    UPDATE workout_streaks 
    SET current_streak = ?, longest_streak = ?, last_workout_date = ?, 
        streak_start_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(newStreak, newLongest, today, streakStart, userId).run();
  
  console.log(`📊 Streak updated: ${newStreak} weeks (longest: ${newLongest})`);
}

/**
 * Check consistency achievements (streaks, total workouts)
 */
async function checkConsistencyAchievements(db, userId) {
  const awarded = [];
  
  // Get total workouts
  const { total } = await db.prepare(
    'SELECT COUNT(*) as total FROM workouts WHERE user_id = ? AND completed = 1'
  ).bind(userId).first();
  
  // Get streak data
  const streak = await db.prepare(
    'SELECT * FROM workout_streaks WHERE user_id = ?'
  ).bind(userId).first();
  
  // Check workout count achievements
  const workoutMilestones = [
    { key: 'first_workout', value: 1 },
    { key: 'workouts_10', value: 10 },
    { key: 'workouts_50', value: 50 },
    { key: 'workouts_100', value: 100 },
    { key: 'workouts_250', value: 250 }
  ];
  
  for (const milestone of workoutMilestones) {
    if (total >= milestone.value) {
      const achievement = await awardAchievement(db, userId, milestone.key, total);
      if (achievement) awarded.push(achievement);
    }
  }
  
  // Check streak achievements
  if (streak) {
    const currentWeeks = Math.floor(streak.current_streak / 7);
    const streakMilestones = [
      { key: 'week_streak_1', value: 1 },
      { key: 'week_streak_4', value: 4 },
      { key: 'week_streak_12', value: 12 },
      { key: 'week_streak_26', value: 26 },
      { key: 'week_streak_52', value: 52 }
    ];
    
    for (const milestone of streakMilestones) {
      if (currentWeeks >= milestone.value) {
        const achievement = await awardAchievement(db, userId, milestone.key, currentWeeks);
        if (achievement) awarded.push(achievement);
      }
    }
  }
  
  return awarded;
}

/**
 * Check strength achievements (1RM milestones)
 */
async function checkStrengthAchievements(db, userId, workoutId) {
  const awarded = [];
  
  // Get all exercises from this workout
  const exercises = await db.prepare(`
    SELECT we.exercise_id, e.name, s.weight_kg, s.reps
    FROM workout_exercises we
    JOIN exercises e ON we.exercise_id = e.id
    JOIN sets s ON s.workout_exercise_id = we.id
    WHERE we.workout_id = ? AND s.completed = 1
  `).bind(workoutId).all();
  
  if (!exercises.results) return awarded;
  
  // Calculate 1RMs and check for PRs
  const exerciseGroups = {};
  exercises.results.forEach(ex => {
    if (!exerciseGroups[ex.exercise_id]) {
      exerciseGroups[ex.exercise_id] = {
        name: ex.name,
        id: ex.exercise_id,
        sets: []
      };
    }
    exerciseGroups[ex.exercise_id].sets.push({
      weight: ex.weight_kg,
      reps: ex.reps
    });
  });
  
  for (const [exerciseId, data] of Object.entries(exerciseGroups)) {
    // Find best 1RM estimate
    let best1RM = 0;
    let bestWeight = 0;
    
    for (const set of data.sets) {
      const estimated1RM = calculateOneRepMax(set.weight, set.reps);
      if (estimated1RM > best1RM) {
        best1RM = estimated1RM;
        bestWeight = set.weight;
      }
    }
    
    // Check if this is a new PR
    const existingPR = await db.prepare(`
      SELECT record_value FROM personal_records
      WHERE user_id = ? AND exercise_id = ? AND record_type = '1rm'
      ORDER BY record_value DESC LIMIT 1
    `).bind(userId, exerciseId).first();
    
    if (!existingPR || best1RM > existingPR.record_value) {
      // New PR! Record it
      await db.prepare(`
        INSERT INTO personal_records (user_id, exercise_id, record_type, record_value, workout_id, previous_value)
        VALUES (?, ?, '1rm', ?, ?, ?)
      `).bind(userId, exerciseId, best1RM, workoutId, existingPR?.record_value || 0).run();
      
      console.log(`🎉 New 1RM PR: ${data.name} - ${best1RM.toFixed(1)}kg`);
      
      // Check for specific exercise milestones
      const exerciseName = data.name.toLowerCase();
      if (exerciseName.includes('bench press')) {
        if (best1RM >= 100) {
          const ach = await awardAchievement(db, userId, 'bench_press_100kg', Math.floor(best1RM));
          if (ach) awarded.push(ach);
        }
        if (best1RM >= 140) {
          const ach = await awardAchievement(db, userId, 'bench_press_140kg', Math.floor(best1RM));
          if (ach) awarded.push(ach);
        }
      } else if (exerciseName.includes('squat')) {
        if (best1RM >= 140) {
          const ach = await awardAchievement(db, userId, 'squat_140kg', Math.floor(best1RM));
          if (ach) awarded.push(ach);
        }
        if (best1RM >= 180) {
          const ach = await awardAchievement(db, userId, 'squat_180kg', Math.floor(best1RM));
          if (ach) awarded.push(ach);
        }
      } else if (exerciseName.includes('deadlift')) {
        if (best1RM >= 180) {
          const ach = await awardAchievement(db, userId, 'deadlift_180kg', Math.floor(best1RM));
          if (ach) awarded.push(ach);
        }
        if (best1RM >= 220) {
          const ach = await awardAchievement(db, userId, 'deadlift_220kg', Math.floor(best1RM));
          if (ach) awarded.push(ach);
        }
      }
    }
  }
  
  // Check PR count achievements
  const { total } = await db.prepare(
    'SELECT COUNT(*) as total FROM personal_records WHERE user_id = ?'
  ).bind(userId).first();
  
  const prMilestones = [
    { key: 'first_pr', value: 1 },
    { key: 'pr_10', value: 10 },
    { key: 'pr_25', value: 25 },
    { key: 'pr_50', value: 50 }
  ];
  
  for (const milestone of prMilestones) {
    if (total >= milestone.value) {
      const achievement = await awardAchievement(db, userId, milestone.key, total);
      if (achievement) awarded.push(achievement);
    }
  }
  
  return awarded;
}

/**
 * Check volume achievements
 */
async function checkVolumeAchievements(db, userId) {
  const awarded = [];
  
  // Total reps
  const { totalReps } = await db.prepare(`
    SELECT SUM(s.reps) as totalReps
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND s.completed = 1
  `).bind(userId).first();
  
  const repMilestones = [
    { key: 'total_reps_1000', value: 1000 },
    { key: 'total_reps_5000', value: 5000 },
    { key: 'total_reps_10000', value: 10000 }
  ];
  
  for (const milestone of repMilestones) {
    if (totalReps >= milestone.value) {
      const achievement = await awardAchievement(db, userId, milestone.key, totalReps);
      if (achievement) awarded.push(achievement);
    }
  }
  
  // Total volume (weight x reps)
  const { totalVolume } = await db.prepare(`
    SELECT SUM(s.reps * s.weight_kg) as totalVolume
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND s.completed = 1
  `).bind(userId).first();
  
  const volumeMilestones = [
    { key: 'total_volume_50000kg', value: 50000 },
    { key: 'total_volume_100000kg', value: 100000 }
  ];
  
  for (const milestone of volumeMilestones) {
    if (totalVolume >= milestone.value) {
      const achievement = await awardAchievement(db, userId, milestone.key, Math.floor(totalVolume));
      if (achievement) awarded.push(achievement);
    }
  }
  
  return awarded;
}

/**
 * Check milestone achievements
 */
async function checkMilestoneAchievements(db, userId) {
  const awarded = [];
  
  // Check if user completed a full program
  const completedPrograms = await db.prepare(`
    SELECT COUNT(DISTINCT p.id) as count
    FROM programs p
    JOIN program_days pd ON p.id = pd.program_id
    JOIN workouts w ON w.program_day_id = pd.id
    WHERE p.user_id = ? AND w.completed = 1
    GROUP BY p.id
    HAVING COUNT(DISTINCT pd.day_number) = p.days_per_week
  `).bind(userId).first();
  
  if (completedPrograms && completedPrograms.count > 0) {
    const achievement = await awardAchievement(db, userId, 'program_complete', completedPrograms.count);
    if (achievement) awarded.push(achievement);
  }
  
  return awarded;
}

/**
 * Award an achievement to a user
 */
async function awardAchievement(db, userId, achievementKey, progressValue = 0) {
  try {
    // Check if already earned
    const existing = await db.prepare(
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_key = ?'
    ).bind(userId, achievementKey).first();
    
    if (existing) {
      return null; // Already earned
    }
    
    // Get achievement definition
    const definition = await db.prepare(
      'SELECT * FROM achievement_definitions WHERE key = ?'
    ).bind(achievementKey).first();
    
    if (!definition) {
      console.error(`Achievement definition not found: ${achievementKey}`);
      return null;
    }
    
    // Award the achievement
    await db.prepare(`
      INSERT INTO user_achievements (user_id, achievement_key, progress_value)
      VALUES (?, ?, ?)
    `).bind(userId, achievementKey, progressValue).run();
    
    console.log(`🏆 Achievement earned: ${definition.name}`);
    
    return {
      key: achievementKey,
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      tier: definition.tier,
      category: definition.category
    };
  } catch (error) {
    console.error(`Error awarding achievement ${achievementKey}:`, error);
    return null;
  }
}

/**
 * Get all achievements for a user
 */
export async function getUserAchievements(db, userId) {
  const earned = await db.prepare(`
    SELECT 
      ua.achievement_key,
      ua.earned_at,
      ua.progress_value,
      ad.name,
      ad.description,
      ad.icon,
      ad.category,
      ad.tier,
      ad.requirement_value
    FROM user_achievements ua
    JOIN achievement_definitions ad ON ua.achievement_key = ad.key
    WHERE ua.user_id = ?
    ORDER BY ua.earned_at DESC
  `).bind(userId).all();
  
  // Get progress on locked achievements
  const streak = await db.prepare(
    'SELECT * FROM workout_streaks WHERE user_id = ?'
  ).bind(userId).first();
  
  const { totalWorkouts } = await db.prepare(
    'SELECT COUNT(*) as totalWorkouts FROM workouts WHERE user_id = ? AND completed = 1'
  ).bind(userId).first();
  
  const { totalPRs } = await db.prepare(
    'SELECT COUNT(*) as totalPRs FROM personal_records WHERE user_id = ?'
  ).bind(userId).first();
  
  return {
    earned: earned.results || [],
    stats: {
      currentStreak: streak?.current_streak || 0,
      longestStreak: streak?.longest_streak || 0,
      totalWorkouts: totalWorkouts || 0,
      totalPRs: totalPRs || 0
    }
  };
}

/**
 * Get recent personal records
 */
export async function getRecentPRs(db, userId, limit = 10) {
  const prs = await db.prepare(`
    SELECT 
      pr.*,
      e.name as exercise_name,
      e.muscle_group,
      w.end_time as workout_date
    FROM personal_records pr
    JOIN exercises e ON pr.exercise_id = e.id
    LEFT JOIN workouts w ON pr.workout_id = w.id
    WHERE pr.user_id = ?
    ORDER BY pr.achieved_at DESC
    LIMIT ?
  `).bind(userId, limit).all();
  
  return prs.results || [];
}

/**
 * Get workout streak information
 */
export async function getWorkoutStreak(db, userId) {
  const streak = await db.prepare(
    'SELECT * FROM workout_streaks WHERE user_id = ?'
  ).bind(userId).first();
  
  if (!streak) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_workout_date: null,
      streak_start_date: null
    };
  }
  
  return streak;
}
