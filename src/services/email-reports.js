// Email Report Service - Generates workout summary reports

export async function generateWorkoutReport(db, userId, periodType) {
  // Calculate date ranges based on period type
  const now = new Date();
  let startDate, endDate, previousStartDate, previousEndDate;
  
  if (periodType === 'weekly') {
    // This week (Sunday to Saturday)
    const dayOfWeek = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - dayOfWeek - 7); // Start of last week
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    previousStartDate = new Date(startDate);
    previousStartDate.setDate(startDate.getDate() - 7);
    previousEndDate = new Date(endDate);
    previousEndDate.setDate(endDate.getDate() - 7);
  } else if (periodType === 'monthly') {
    // Last month
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    
    previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
  } else if (periodType === 'yearly') {
    // Last year
    startDate = new Date(now.getFullYear() - 1, 0, 1);
    endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    
    previousStartDate = new Date(now.getFullYear() - 2, 0, 1);
    previousEndDate = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59, 999);
  }
  
  // Get current period stats
  const currentStats = await getWorkoutStats(db, userId, startDate, endDate);
  
  // Get previous period stats for comparison
  const previousStats = await getWorkoutStats(db, userId, previousStartDate, previousEndDate);
  
  // Get top exercises for the period
  const topExercises = await getTopExercises(db, userId, startDate, endDate);
  
  // Get user info
  const user = await db.prepare('SELECT name, email, measurement_system FROM users WHERE id = ?')
    .bind(userId).first();
  
  return {
    user,
    periodType,
    periodLabel: formatPeriodLabel(periodType, startDate, endDate),
    currentStats,
    previousStats,
    comparison: calculateComparison(currentStats, previousStats),
    topExercises
  };
}

async function getWorkoutStats(db, userId, startDate, endDate) {
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();
  
  // Get workout count and total duration
  const workoutSummary = await db.prepare(`
    SELECT 
      COUNT(*) as workout_count,
      COALESCE(SUM(total_duration_seconds), 0) as total_duration,
      COALESCE(AVG(perceived_exertion), 0) as avg_exertion
    FROM workouts 
    WHERE user_id = ? AND completed = 1 
      AND start_time >= ? AND start_time <= ?
  `).bind(userId, startStr, endStr).first();
  
  // Get total volume (weight lifted)
  const volumeData = await db.prepare(`
    SELECT COALESCE(SUM(s.weight_kg * s.reps), 0) as total_volume,
           COUNT(s.id) as total_sets
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND w.completed = 1
      AND w.start_time >= ? AND w.start_time <= ?
  `).bind(userId, startStr, endStr).first();
  
  return {
    workoutCount: workoutSummary?.workout_count || 0,
    totalDuration: workoutSummary?.total_duration || 0,
    avgExertion: workoutSummary?.avg_exertion || 0,
    totalVolume: volumeData?.total_volume || 0,
    totalSets: volumeData?.total_sets || 0
  };
}

async function getTopExercises(db, userId, startDate, endDate) {
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();
  
  const result = await db.prepare(`
    SELECT e.name, e.muscle_group,
           COUNT(DISTINCT we.id) as times_performed,
           MAX(s.weight_kg) as max_weight,
           SUM(s.weight_kg * s.reps) as total_volume
    FROM exercises e
    JOIN workout_exercises we ON we.exercise_id = e.id
    JOIN sets s ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND w.completed = 1
      AND w.start_time >= ? AND w.start_time <= ?
    GROUP BY e.id
    ORDER BY total_volume DESC
    LIMIT 5
  `).bind(userId, startStr, endStr).all();
  
  return result.results || [];
}

function calculateComparison(current, previous) {
  const safePercent = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };
  
  return {
    workoutChange: safePercent(current.workoutCount, previous.workoutCount),
    volumeChange: safePercent(current.totalVolume, previous.totalVolume),
    durationChange: safePercent(current.totalDuration, previous.totalDuration),
    setsChange: safePercent(current.totalSets, previous.totalSets)
  };
}

function formatPeriodLabel(periodType, startDate, endDate) {
  const options = { month: 'short', day: 'numeric' };
  const yearOptions = { month: 'long', year: 'numeric' };
  
  if (periodType === 'weekly') {
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}, ${endDate.getFullYear()}`;
  } else if (periodType === 'monthly') {
    return startDate.toLocaleDateString('en-US', yearOptions);
  } else {
    return `${startDate.getFullYear()}`;
  }
}

export function generateReportHTML(report) {
  const { user, periodType, periodLabel, currentStats, comparison, topExercises } = report;
  const isImperial = user?.measurement_system === 'imperial';
  
  const formatWeight = (kg) => {
    if (!kg) return '0';
    if (isImperial) {
      return `${Math.round(kg * 2.20462).toLocaleString()} lbs`;
    }
    return `${Math.round(kg).toLocaleString()} kg`;
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };
  
  const changeIndicator = (value) => {
    if (value > 0) return `<span style="color: #10b981;">↑ ${value}%</span>`;
    if (value < 0) return `<span style="color: #ef4444;">↓ ${Math.abs(value)}%</span>`;
    return `<span style="color: #6b7280;">→ 0%</span>`;
  };
  
  const periodTitle = periodType === 'weekly' ? 'Weekly' : periodType === 'monthly' ? 'Monthly' : 'Yearly';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${periodTitle} Workout Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 32px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; font-size: 28px;">🏋️ ${periodTitle} Workout Report</h1>
      <p style="margin: 0; opacity: 0.9; font-size: 16px;">${periodLabel}</p>
    </div>
    
    <!-- Greeting -->
    <div style="padding: 24px 32px 0;">
      <p style="font-size: 18px; color: #374151;">Hey ${user?.name || 'there'}! 👋</p>
      <p style="color: #6b7280; line-height: 1.6;">Here's your ${periodType} workout summary. Keep crushing it!</p>
    </div>
    
    <!-- Stats Grid -->
    <div style="padding: 24px 32px;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        
        <!-- Workouts -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #6366f1;">${currentStats.workoutCount}</div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Workouts</div>
          <div style="font-size: 13px;">${changeIndicator(comparison.workoutChange)} vs last ${periodType.replace('ly', '')}</div>
        </div>
        
        <!-- Total Volume -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #10b981;">${formatWeight(currentStats.totalVolume)}</div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Total Volume</div>
          <div style="font-size: 13px;">${changeIndicator(comparison.volumeChange)} vs last ${periodType.replace('ly', '')}</div>
        </div>
        
        <!-- Time -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #f59e0b;">${formatDuration(currentStats.totalDuration)}</div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Time Training</div>
          <div style="font-size: 13px;">${changeIndicator(comparison.durationChange)} vs last ${periodType.replace('ly', '')}</div>
        </div>
        
        <!-- Sets -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #ec4899;">${currentStats.totalSets}</div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Total Sets</div>
          <div style="font-size: 13px;">${changeIndicator(comparison.setsChange)} vs last ${periodType.replace('ly', '')}</div>
        </div>
        
      </div>
    </div>
    
    <!-- Top Exercises -->
    ${topExercises.length > 0 ? `
    <div style="padding: 0 32px 24px;">
      <h2 style="font-size: 20px; color: #374151; margin-bottom: 16px;">🏆 Top Exercises</h2>
      <div style="background: #f9fafb; border-radius: 12px; overflow: hidden;">
        ${topExercises.map((ex, idx) => `
          <div style="padding: 16px; border-bottom: 1px solid #e5e7eb; ${idx === topExercises.length - 1 ? 'border-bottom: none;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: #374151;">${idx + 1}. ${ex.name}</div>
                <div style="font-size: 13px; color: #6b7280;">${ex.muscle_group} • ${ex.times_performed} sessions</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 600; color: #6366f1;">${formatWeight(ex.total_volume)}</div>
                <div style="font-size: 12px; color: #6b7280;">Max: ${formatWeight(ex.max_weight)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px;">Keep up the great work! 💪</p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        You're receiving this email because you subscribed to ${periodType} reports.<br>
        Manage your preferences in the AI Fitness Coach app settings.
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

export async function getReportPreferences(db, userId) {
  let prefs = await db.prepare(
    'SELECT * FROM email_report_preferences WHERE user_id = ?'
  ).bind(userId).first();
  
  if (!prefs) {
    // Create default preferences
    await db.prepare(
      'INSERT INTO email_report_preferences (user_id) VALUES (?)'
    ).bind(userId).run();
    
    prefs = {
      weekly_report: 0,
      monthly_report: 0,
      yearly_report: 0
    };
  }
  
  return {
    weeklyReport: !!prefs.weekly_report,
    monthlyReport: !!prefs.monthly_report,
    yearlyReport: !!prefs.yearly_report,
    lastWeeklySent: prefs.last_weekly_sent,
    lastMonthlySent: prefs.last_monthly_sent,
    lastYearlySent: prefs.last_yearly_sent
  };
}

export async function updateReportPreferences(db, userId, preferences) {
  const { weeklyReport, monthlyReport, yearlyReport } = preferences;
  
  await db.prepare(`
    INSERT INTO email_report_preferences (user_id, weekly_report, monthly_report, yearly_report, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      weekly_report = excluded.weekly_report,
      monthly_report = excluded.monthly_report,
      yearly_report = excluded.yearly_report,
      updated_at = CURRENT_TIMESTAMP
  `).bind(userId, weeklyReport ? 1 : 0, monthlyReport ? 1 : 0, yearlyReport ? 1 : 0).run();
  
  return { success: true };
}
