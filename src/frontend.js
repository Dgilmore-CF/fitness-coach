// Auto-generated - do not edit manually
export default `/**
 * AI Fitness Coach - Frontend Application
 */

// Global state
const state = {
  user: null,
  currentWorkout: null,
  currentProgram: null,
  activeTimer: null,
  restTimer: null,
  restTimerInterval: null,
  restTimeRemaining: 0,
  workoutTimer: null,
  workoutNotes: '',
  audioContext: null,
  keyboardShortcutsEnabled: false,
  theme: null
};

// Prevent concurrent set logging
let isAddingSet = false;

// Theme Management
function initTheme() {
  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    state.theme = savedTheme;
  } else {
    state.theme = systemPrefersDark ? 'dark' : 'light';
  }
  
  applyTheme(state.theme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      state.theme = e.matches ? 'dark' : 'light';
      applyTheme(state.theme);
    }
  });
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  localStorage.setItem('theme', state.theme);
  
  // Show notification
  showNotification(\`Switched to \${state.theme} mode\`, 'success');
}

function applyTheme(theme) {
  const root = document.documentElement;
  const themeIcon = document.getElementById('themeIcon');
  
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    if (themeIcon) {
      themeIcon.className = 'fas fa-sun';
    }
  } else {
    root.setAttribute('data-theme', 'light');
    if (themeIcon) {
      themeIcon.className = 'fas fa-moon';
    }
  }
}

// Measurement conversion utilities
function kgToLbs(kg) {
  // Round to 1 decimal place for clean display values
  return Math.round(kg * 2.20462 * 10) / 10;
}

function lbsToKg(lbs) {
  // Round to 2 decimal places to eliminate floating-point drift
  // This ensures clean round-trip conversion (lbs -> kg -> lbs)
  return Math.round((lbs / 2.20462) * 100) / 100;
}

function cmToInches(cm) {
  return cm / 2.54;
}

function inchesToCm(inches) {
  return inches * 2.54;
}

function cmToFeetInches(cm) {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

function feetInchesToCm(feet, inches) {
  return inchesToCm(feet * 12 + inches);
}

// Measurement system utilities - centralized to avoid duplication
function getMeasurementSystem() {
  return (state.user && state.user.measurement_system) || 'metric';
}

function isImperialSystem() {
  return getMeasurementSystem() === 'imperial';
}

function getWeightUnit() {
  return isImperialSystem() ? 'lbs' : 'kg';
}

function getWeightStep() {
  return isImperialSystem() ? '5' : '2.5';
}

function getDistanceUnit() {
  return isImperialSystem() ? 'mi' : 'km';
}

function convertWeightForDisplay(kg) {
  if (!kg) return '';
  const value = isImperialSystem() ? kgToLbs(kg) : kg;
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

function convertWeightForStorage(displayWeight) {
  const weight = parseFloat(displayWeight);
  if (isNaN(weight)) return null;
  return isImperialSystem() ? lbsToKg(weight) : weight;
}

function formatWeight(kg, system) {
  if (!kg) return 'N/A';
  system = system || (state.user && state.user.measurement_system) || 'metric';
  if (system === 'imperial') {
    const lbs = kgToLbs(kg);
    // For large totals (>1000), round to whole number for cleaner display
    if (lbs >= 1000) {
      return \`\${Math.round(lbs).toLocaleString()} lbs\`;
    }
    // Show decimal only if it's not a whole number
    return lbs % 1 === 0 ? \`\${lbs} lbs\` : \`\${lbs.toFixed(1)} lbs\`;
  }
  // For large totals (>1000), round to whole number for cleaner display
  if (kg >= 1000) {
    return \`\${Math.round(kg).toLocaleString()} kg\`;
  }
  // Show decimal only if it's not a whole number
  return kg % 1 === 0 ? \`\${kg} kg\` : \`\${parseFloat(kg).toFixed(1)} kg\`;
}

function formatHeight(cm, system) {
  if (!cm) return 'N/A';
  system = system || (state.user && state.user.measurement_system) || 'metric';
  if (system === 'imperial') {
    const { feet, inches } = cmToFeetInches(cm);
    return \`\${feet}'\${inches}"\`;
  }
  return \`\${Math.round(cm)} cm\`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadUser();
  loadDashboard();
});

// API helper
async function api(endpoint, options = {}) {
  const response = await fetch(\`/api\${endpoint}\`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Load user data
async function loadUser() {
  try {
    const data = await api('/auth/user');
    state.user = data.user;
    document.getElementById('userName').textContent = state.user.name || state.user.email;
  } catch (error) {
    console.error('Failed to load user:', error);
    document.getElementById('userName').textContent = 'Error';
    showNotification('Failed to load user. Please refresh the page.', 'error');
  }
}

// Tab switching
function switchTab(tabName) {
  // Update desktop tab buttons
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  
  // Find and activate the correct tab button by matching onclick attribute
  const targetTab = Array.from(document.querySelectorAll('.tab')).find(tab => {
    const onclick = tab.getAttribute('onclick');
    return onclick && onclick.includes(\`'\${tabName}'\`) || onclick && onclick.includes(\`"\${tabName}"\`);
  });
  
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // Update mobile nav buttons
  document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));
  const mobileNavItem = document.querySelector(\`.mobile-nav-item[data-tab="\${tabName}"]\`);
  if (mobileNavItem) {
    mobileNavItem.classList.add('active');
  } else {
    // If tab is in "More" menu, highlight the More button
    const moreBtn = document.querySelector('.mobile-nav-item[data-tab="more"]');
    if (moreBtn && ['insights', 'achievements', 'nutrition', 'learn'].includes(tabName)) {
      moreBtn.classList.add('active');
    }
  }

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');

  // Load tab content
  switch (tabName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'program':
      loadPrograms();
      break;
    case 'workout':
      loadWorkout();
      break;
    case 'analytics':
      loadAnalytics();
      break;
    case 'insights':
      loadInsights();
      break;
    case 'achievements':
      loadAchievements();
      break;
    case 'nutrition':
      loadNutrition();
      break;
    case 'learn':
      loadLearn();
      break;
    default:
      loadDashboard();
      break;
  }
}

// Mobile "More" menu
function showMobileMoreMenu() {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  modalTitle.textContent = 'More';
  modalBody.innerHTML = \`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button class="btn btn-outline" onclick="closeModal(); switchTab('insights')" style="justify-content: flex-start; padding: 16px;">
        <i class="fas fa-robot" style="width: 24px;"></i> AI Coach
      </button>
      <button class="btn btn-outline" onclick="closeModal(); switchTab('achievements')" style="justify-content: flex-start; padding: 16px;">
        <i class="fas fa-trophy" style="width: 24px;"></i> Achievements
      </button>
      <button class="btn btn-outline" onclick="closeModal(); switchTab('nutrition')" style="justify-content: flex-start; padding: 16px;">
        <i class="fas fa-apple-alt" style="width: 24px;"></i> Nutrition
      </button>
      <button class="btn btn-outline" onclick="closeModal(); switchTab('learn')" style="justify-content: flex-start; padding: 16px;">
        <i class="fas fa-graduation-cap" style="width: 24px;"></i> Learn
      </button>
    </div>
  \`;
  
  modal.classList.add('active');
}

// Dashboard
async function loadDashboard() {
  const container = document.getElementById('dashboard');
  
  try {
    const [progress, programs, recentWorkouts] = await Promise.all([
      api('/analytics/progress?days=30'),
      api('/programs'),
      api('/workouts?limit=5')
    ]);

    container.innerHTML = \`
      <div class="card">
        <h2><i class="fas fa-chart-line"></i> 30-Day Progress</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Workouts</div>
            <div class="stat-value">\${progress.overview.total_workouts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Weight Lifted</div>
            <div class="stat-value">\${formatWeight(progress.overview.total_volume_kg)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Time</div>
            <div class="stat-value">\${formatDuration(progress.overview.total_time_seconds)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Workout</div>
            <div class="stat-value">\${formatDuration(progress.overview.average_workout_time)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2><i class="fas fa-dumbbell"></i> Quick Actions</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="showGenerateProgram()">
            <i class="fas fa-magic"></i> Generate New Program
          </button>
          <button class="btn btn-secondary" onclick="startWorkout()">
            <i class="fas fa-play"></i> Start Workout
          </button>
          <button class="btn btn-outline" onclick="switchTab('analytics')">
            <i class="fas fa-chart-bar"></i> View Analytics
          </button>
        </div>
      </div>

      <div class="card">
        <h2><i class="fas fa-history"></i> Recent Workouts</h2>
        \${recentWorkouts.workouts.length > 0 ? \`
          <div style="display: flex; flex-direction: column; gap: 12px;">
            \${recentWorkouts.workouts.map(w => \`
              <div style="background: var(--white); border: 2px solid var(--border); border-radius: 12px; overflow: hidden; transition: all 0.3s;" id="workout-card-\${w.id}">
                <!-- Workout Header -->
                <div style="padding: 16px; cursor: pointer;" onclick="toggleWorkoutDetails(\${w.id})">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="background: \${w.completed ? 'var(--secondary)' : 'var(--warning)'}; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                          <i class="fas fa-\${w.completed ? 'check' : 'clock'}"></i>
                        </div>
                        <div>
                          <strong style="font-size: 16px;">\${w.day_name || 'Custom Workout'}</strong>
                          <div style="color: var(--gray); font-size: 13px;">
                            \${new Date(w.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                        <span style="font-size: 13px; color: var(--gray);">
                          <i class="fas fa-clock"></i> \${formatDuration(w.total_duration_seconds)}
                        </span>
                        <span style="font-size: 13px; color: var(--gray);">
                          <i class="fas fa-weight-hanging"></i> \${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      \${w.completed ? '<span style="background: var(--secondary-light); color: var(--secondary); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ Complete</span>' : '<span style="background: var(--warning); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">In Progress</span>'}
                      <i class="fas fa-chevron-down" id="workout-chevron-\${w.id}" style="transition: transform 0.3s;"></i>
                    </div>
                  </div>
                </div>
                <!-- Expandable Details -->
                <div id="workout-details-\${w.id}" style="display: none; border-top: 1px solid var(--border); background: var(--light); padding: 20px;">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 16px;">
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Training Time</div>
                      <div style="font-size: 18px; font-weight: 600;">\${formatDuration(w.total_duration_seconds)}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Exercises</div>
                      <div style="font-size: 18px; font-weight: 600;">\${w.exercise_count || 0}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Sets</div>
                      <div style="font-size: 18px; font-weight: 600;">\${w.total_sets || 0}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Volume</div>
                      <div style="font-size: 18px; font-weight: 600;">\${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Effort Level</div>
                      <div style="font-size: 18px; font-weight: 600;">\${w.perceived_exertion ? \`\${w.perceived_exertion}/10 \${getExertionEmoji(w.perceived_exertion)}\` : 'Not rated'}</div>
                    </div>
                  </div>
                  \${w.notes ? \`
                    <div style="background: var(--white); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Session Notes</div>
                      <div style="font-size: 14px; line-height: 1.5;">\${w.notes}</div>
                    </div>
                  \` : ''}
                  <div style="display: flex; gap: 8px; margin-top: 12px;">
                    \${w.completed ? \`
                      <button class="btn btn-outline" onclick="event.stopPropagation(); viewWorkout(\${w.id})" style="flex: 1;">
                        <i class="fas fa-eye"></i> View Details
                      </button>
                    \` : \`
                      <button class="btn btn-primary" onclick="event.stopPropagation(); viewWorkout(\${w.id})" style="flex: 1;">
                        <i class="fas fa-play"></i> Continue Workout
                      </button>
                    \`}
                    <button class="btn btn-danger" onclick="event.stopPropagation(); deleteDashboardWorkout(\${w.id})">
                      <i class="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            \`).join('')}
          </div>
        \` : '<p>No workouts yet. Start your first workout!</p>'}
      </div>
    \`;
  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading dashboard: \${error.message}</p></div>\`;
  }
}

// Programs
async function loadPrograms() {
  const container = document.getElementById('program');
  
  try {
    const data = await api('/programs');
    const activeProgram = data.programs.find(p => p.active);
    
    container.innerHTML = \`
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <h2><i class="fas fa-list-alt"></i> My Programs</h2>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="showGenerateProgram()">
              <i class="fas fa-magic"></i> AI Generate
            </button>
            <button class="btn btn-secondary" onclick="showCreateManualProgram()">
              <i class="fas fa-plus"></i> Create Custom
            </button>
          </div>
        </div>
      </div>

      \${activeProgram ? \`
        <div class="card" style="border: 2px solid var(--secondary);">
          <h2><i class="fas fa-check-circle"></i> Active Program</h2>
          <div onclick="viewProgram(\${activeProgram.id})" style="cursor: pointer;">
            <h3>\${activeProgram.name}</h3>
            <p>\${activeProgram.days_per_week} days per week | \${activeProgram.goal}</p>
          </div>
          <button class="btn btn-secondary" onclick="viewProgram(\${activeProgram.id})">
            View Details
          </button>
        </div>
      \` : ''}

      <div class="card">
        <h2><i class="fas fa-folder"></i> All Programs</h2>
        \${data.programs.length > 0 ? \`
          <div class="exercise-list">
            \${data.programs.map(p => \`
              <div class="exercise-item \${p.active ? 'active' : ''}" onclick="viewProgram(\${p.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>\${p.name}</strong>
                    <div style="color: var(--gray); font-size: 14px;">
                      \${p.days_per_week} days/week | \${p.goal} | \${p.ai_generated ? '🤖 AI Generated' : 'Custom'}
                    </div>
                  </div>
                  <div>
                    \${p.active ? '<span style="color: var(--secondary); font-weight: bold;">ACTIVE</span>' : \`
                      <button class="btn btn-outline" onclick="event.stopPropagation(); activateProgram(\${p.id})">
                        Activate
                      </button>
                    \`}
                  </div>
                </div>
              </div>
            \`).join('')}
          </div>
        \` : '<p>No programs yet. Generate your first program!</p>'}
      </div>
    \`;
  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading programs: \${error.message}</p></div>\`;
  }
}

// View program details
async function viewProgram(programId) {
  try {
    const data = await api(\`/programs/\${programId}\`);
    const program = data.program;
    
    // Format creation date
    const createdDate = program.created_at ? new Date(program.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }) : 'Unknown';
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = \`
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <h3 id="programNameDisplay" style="margin: 0;">\${program.name}</h3>
        <button class="btn btn-outline" onclick="showRenameProgramModal(\${program.id}, '\${program.name.replace(/'/g, "\\\\'")}')" style="padding: 6px 12px; font-size: 12px;">
          <i class="fas fa-edit"></i> Rename
        </button>
      </div>
      <p style="color: var(--gray); font-size: 13px; margin-bottom: 8px;">
        <i class="fas fa-calendar"></i> Created \${createdDate} | \${program.days_per_week} days/week | \${program.goal}
      </p>
      <p><em>\${program.equipment}</em></p>
      \${program.description ? \`<p style="color: var(--text-secondary); margin-top: 8px; font-style: italic;">\${program.description}</p>\` : ''}
      \${program.custom_instructions ? \`
        <div style="margin: 16px 0; padding: 12px 16px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(91, 33, 182, 0.1) 100%); border-radius: 8px; border-left: 3px solid #7c3aed;">
          <div style="font-size: 12px; color: #7c3aed; font-weight: 600; margin-bottom: 4px;">
            <i class="fas fa-magic"></i> Custom Instructions Used
          </div>
          <div style="font-size: 14px; color: var(--text-primary);">\${program.custom_instructions}</div>
        </div>
      \` : ''}

      \${program.days.map(day => \`
        <div style="margin: 20px 0; padding: 20px; background: var(--light); border-radius: 12px;">
          <h4 style="margin-bottom: 12px;">
            Day \${day.day_number}: \${day.name}
            \${day.is_cardio_day ? '<span style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;"><i class="fas fa-heartbeat"></i> Cardio</span>' : ''}
          </h4>
          <p style="color: var(--gray); margin-bottom: 16px; font-weight: 500;">\${day.focus}</p>
          
          \${day.is_cardio_day ? \`
            <!-- Cardio Day Content -->
            <div style="margin-bottom: 16px;">
              <strong style="display: block; margin-bottom: 12px; color: #ef4444;">
                <i class="fas fa-fire"></i> Cardio Sessions
              </strong>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                \${(day.cardio_sessions || []).map((session, idx) => \`
                  <div style="background: \${session.heart_rate_zone <= 2 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : session.heart_rate_zone <= 3 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}; color: white; padding: 16px; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <strong style="font-size: 16px;">\${session.name}</strong>
                      <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                        <i class="fas fa-clock"></i> \${session.duration_minutes} min
                      </span>
                    </div>
                    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px;">
                      <span style="font-size: 13px;">
                        <i class="fas fa-heartbeat"></i> Zone \${session.heart_rate_zone}: \${session.zone_name || ''}
                      </span>
                    </div>
                    <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">
                      \${session.zone_description || ''}
                    </div>
                    \${session.activity_suggestions ? \`
                      <div style="font-size: 12px; background: rgba(255,255,255,0.15); padding: 8px 12px; border-radius: 6px; margin-top: 8px;">
                        <i class="fas fa-lightbulb"></i> \${session.activity_suggestions}
                      </div>
                    \` : ''}
                    \${session.interval_structure ? \`
                      <div style="font-size: 12px; background: rgba(255,255,255,0.15); padding: 8px 12px; border-radius: 6px; margin-top: 8px;">
                        <i class="fas fa-stopwatch"></i> \${session.interval_structure}
                      </div>
                    \` : ''}
                  </div>
                \`).join('')}
              </div>
              <div style="margin-top: 16px; padding: 12px; background: var(--white); border-radius: 8px; border: 1px solid var(--border);">
                <strong style="display: block; margin-bottom: 8px; font-size: 13px; color: var(--gray);">
                  <i class="fas fa-info-circle"></i> Heart Rate Zone Guide
                </strong>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; font-size: 12px;">
                  <div><span style="color: #10b981; font-weight: 600;">Zone 1-2:</span> 50-70% max HR - Recovery/Fat burn</div>
                  <div><span style="color: #f59e0b; font-weight: 600;">Zone 3:</span> 70-80% max HR - Aerobic endurance</div>
                  <div><span style="color: #ef4444; font-weight: 600;">Zone 4-5:</span> 80-100% max HR - Threshold/Maximum</div>
                </div>
                <div style="margin-top: 8px; font-size: 11px; color: var(--gray);">
                  Max HR ≈ 220 - your age
                </div>
              </div>
            </div>
          \` : \`
            <!-- Strength Training Day Content -->
            <strong style="display: block; margin-bottom: 8px;">Warm-up Stretches:</strong>
            <ul style="margin: 0 0 16px 20px; line-height: 1.8;">
              \${(day.stretches || []).map(s => \`
                <li>\${s.name} - \${s.duration_seconds}s (\${s.muscle_group})</li>
              \`).join('')}
            </ul>

            <strong style="display: block; margin-bottom: 8px;">Exercises:</strong>
            <ol style="margin: 0 0 0 20px; line-height: 1.8;">
              \${(day.exercises || []).map(ex => \`
                <li style="margin-bottom: 16px;">
                  <div style="margin-bottom: 6px;">
                    <strong style="font-size: 15px;">\${ex.name}</strong> - \${ex.target_sets} sets x \${ex.target_reps} reps
                  </div>
                  <div style="font-size: 13px; color: var(--gray); margin-bottom: 8px;">
                    Rest: \${ex.rest_seconds}s | \${ex.muscle_group} | \${ex.equipment}
                  </div>
                  \${ex.tips ? \`
                    <details style="margin-top: 8px; padding: 12px; background: var(--white); border-radius: 8px; border: 1px solid var(--border);">
                      <summary style="cursor: pointer; color: var(--primary); font-weight: 600; font-size: 13px;">
                        <i class="fas fa-info-circle"></i> Exercise Tips & Form Cues
                      </summary>
                      <div style="margin-top: 12px; font-size: 13px; line-height: 1.6; color: var(--dark);">
                        \${ex.tips}
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
                          <strong style="display: block; margin-bottom: 6px; color: var(--primary);">Key Points:</strong>
                          <ul style="margin: 0 0 0 20px;">
                            <li>Focus on controlled movement throughout the entire range of motion</li>
                            <li>Maintain proper breathing: exhale on exertion, inhale on the negative</li>
                            <li>Keep core engaged and maintain neutral spine alignment</li>
                            <li>Use a weight that allows you to complete all reps with good form</li>
                          </ul>
                        </div>
                      </div>
                    </details>
                  \` : ''}
                </li>
              \`).join('')}
            </ol>
          \`}
        </div>
      \`).join('')}

      <div style="margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="startWorkoutFromProgram(\${program.id})">
          <i class="fas fa-play"></i> Start Workout
        </button>
        \${!program.active ? \`
          <button class="btn btn-secondary" onclick="activateProgram(\${program.id})">
            Set as Active
          </button>
        \` : ''}
        <button class="btn btn-danger" onclick="deleteProgram(\${program.id})">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    \`;

    document.getElementById('modalTitle').textContent = 'Program Details';
    openModal(true); // Pass true for wide modal
  } catch (error) {
    showNotification('Error loading program: ' + error.message, 'error');
  }
}

// View workout details
async function viewWorkout(workoutId) {
  try {
    const data = await api(\`/workouts/\${workoutId}\`);
    const workout = data.workout;
    
    // If workout is not completed, resume it in the modal instead
    if (!workout.completed) {
      state.currentWorkout = workout;
      resumeWorkoutModal();
      return;
    }
    
    // Calculate total volume (accounting for unilateral exercises)
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    let exercisesWithSets = 0;
    
    workout.exercises.forEach(ex => {
      if (ex.sets && ex.sets.length > 0) {
        exercisesWithSets++;
        ex.sets.forEach(set => {
          // Multiply by 2 for unilateral exercises (same as backend calculation)
          const multiplier = ex.is_unilateral ? 2 : 1;
          totalVolume += (set.weight_kg * set.reps * multiplier);
          totalSets += 1;
          totalReps += set.reps;
        });
      }
    });
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = \`
      <div style="margin-bottom: 24px;">
        <h3 style="margin-bottom: 8px;">\${workout.program_day_name || 'Workout'}</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; color: var(--gray);">
          <span><i class="fas fa-calendar"></i> \${new Date(workout.start_time).toLocaleDateString()}</span>
          <span><i class="fas fa-clock"></i> \${formatDuration(workout.total_duration_seconds)}</span>
          <span><i class="fas fa-check-circle" style="color: var(--secondary);"></i> Completed</span>
        </div>
      </div>

      <!-- Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: 24px;">
        <div style="padding: 16px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">\${formatWeight(totalVolume)}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Total Volume</div>
        </div>
        <div style="padding: 16px; background: linear-gradient(135deg, var(--secondary) 0%, #047857 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">\${totalSets}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Total Sets</div>
        </div>
        <div style="padding: 16px; background: linear-gradient(135deg, var(--warning) 0%, #d97706 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">\${totalReps}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Total Reps</div>
        </div>
        <div style="padding: 16px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">\${exercisesWithSets}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Exercises</div>
        </div>
        <div style="padding: 16px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">\${workout.perceived_exertion ? \`\${workout.perceived_exertion}/10\` : '-'}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Effort \${workout.perceived_exertion ? getExertionEmoji(workout.perceived_exertion) : ''}</div>
        </div>
      </div>

      \${workout.notes ? \`
        <div style="padding: 16px; background: var(--light); border-radius: 12px; margin-bottom: 24px; border-left: 4px solid var(--primary);">
          <strong style="display: block; margin-bottom: 8px; color: var(--primary);">
            <i class="fas fa-sticky-note"></i> Workout Notes
          </strong>
          <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">\${workout.notes}</p>
        </div>
      \` : ''}

      <!-- Exercise Details -->
      <div style="margin-top: 24px;">
        <h4 style="margin-bottom: 16px; color: var(--text-primary);">
          <i class="fas fa-dumbbell"></i> Exercises Performed
        </h4>
        \${workout.exercises && workout.exercises.length > 0 ? workout.exercises.map((ex, idx) => {
          const exerciseVolume = ex.sets?.reduce((sum, set) => sum + (set.weight_kg * set.reps), 0) || 0;
          const exerciseSets = ex.sets?.length || 0;
          const exerciseReps = ex.sets?.reduce((sum, set) => sum + set.reps, 0) || 0;
          
          return \`
            <div style="margin-bottom: 20px; padding: 20px; background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; flex-wrap: wrap; gap: 12px;">
                <div>
                  <strong style="font-size: 16px; color: var(--text-primary);">
                    \${idx + 1}. \${ex.name}
                  </strong>
                  <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                    <span style="margin-right: 12px;"><i class="fas fa-bullseye"></i> \${ex.muscle_group}</span>
                    \${ex.equipment ? \`<span><i class="fas fa-tools"></i> \${ex.equipment}</span>\` : ''}
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 12px; color: var(--text-secondary);">Volume</div>
                  <div style="font-size: 18px; font-weight: bold; color: var(--primary);">
                    \${formatWeight(exerciseVolume)}
                  </div>
                </div>
              </div>

              \${ex.sets && ex.sets.length > 0 ? \`
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                      <tr style="background: var(--light); border-bottom: 2px solid var(--border);">
                        <th style="padding: 8px; text-align: center; font-weight: 600;">Set</th>
                        <th style="padding: 8px; text-align: center; font-weight: 600;">Weight</th>
                        <th style="padding: 8px; text-align: center; font-weight: 600;">Reps</th>
                        <th style="padding: 8px; text-align: center; font-weight: 600;">1RM Est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      \${ex.sets.map((set, setIdx) => \`
                        <tr style="border-bottom: 1px solid var(--border);">
                          <td style="padding: 10px; text-align: center; font-weight: 600;">\${setIdx + 1}</td>
                          <td style="padding: 10px; text-align: center;">\${formatWeight(set.weight_kg)}</td>
                          <td style="padding: 10px; text-align: center;">\${set.reps}</td>
                          <td style="padding: 10px; text-align: center; color: var(--primary); font-weight: 600;">
                            \${set.one_rep_max_kg ? formatWeight(set.one_rep_max_kg) : '-'}
                          </td>
                        </tr>
                      \`).join('')}
                      <tr style="background: var(--light); font-weight: 600;">
                        <td style="padding: 10px; text-align: center;">Total</td>
                        <td style="padding: 10px; text-align: center;">-</td>
                        <td style="padding: 10px; text-align: center;">\${exerciseReps}</td>
                        <td style="padding: 10px; text-align: center;">\${exerciseSets} sets</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              \` : '<p style="color: var(--gray); font-style: italic; margin-top: 8px;">No sets recorded</p>'}

              \${ex.notes ? \`
                <div style="margin-top: 12px; padding: 12px; background: var(--bg-primary); border-radius: 8px; border-left: 3px solid var(--primary);">
                  <strong style="font-size: 12px; color: var(--primary); display: block; margin-bottom: 4px;">
                    <i class="fas fa-comment"></i> Exercise Notes:
                  </strong>
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary);">\${ex.notes}</p>
                </div>
              \` : ''}
            </div>
          \`;
        }).join('') : '<p style="color: var(--gray); font-style: italic;">No exercises recorded</p>'}
      </div>

      <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border); display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-outline" onclick="closeModal()">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
    \`;
    
    document.getElementById('modalTitle').textContent = 'Workout Details';
    openModal(true); // Pass true for wide modal
  } catch (error) {
    showNotification('Error loading workout: ' + error.message, 'error');
  }
}

// Manual program creation state
const manualProgramState = {
  name: '',
  days_per_week: 3,
  goal: 'hypertrophy',
  days: [],
  currentDayIndex: 0,
  availableExercises: []
};

// Show create manual program
async function showCreateManualProgram() {
  // Reset state
  manualProgramState.days = [];
  manualProgramState.currentDayIndex = 0;
  
  // Load available exercises
  try {
    const data = await api('/exercises');
    manualProgramState.availableExercises = data.exercises;
  } catch (error) {
    showNotification('Error loading exercises', 'error');
    return;
  }
  
  showManualProgramStep1();
}

// Step 1: Program details
function showManualProgramStep1() {
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = \`
    <h3>Create Custom Program - Step 1</h3>
    <p style="color: var(--gray); margin-bottom: 20px;">Enter your program details</p>
    
    <div class="form-group">
      <label>Program Name:</label>
      <input type="text" id="programName" class="form-control" placeholder="e.g., My Push/Pull/Legs" value="\${manualProgramState.name}">
    </div>
    
    <div class="form-group">
      <label>Days per week:</label>
      <select id="daysPerWeek" class="form-control">
        <option value="3" \${manualProgramState.days_per_week === 3 ? 'selected' : ''}>3 days</option>
        <option value="4" \${manualProgramState.days_per_week === 4 ? 'selected' : ''}>4 days</option>
        <option value="5" \${manualProgramState.days_per_week === 5 ? 'selected' : ''}>5 days</option>
        <option value="6" \${manualProgramState.days_per_week === 6 ? 'selected' : ''}>6 days</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>Goal:</label>
      <select id="programGoal" class="form-control">
        <option value="hypertrophy" \${manualProgramState.goal === 'hypertrophy' ? 'selected' : ''}>Hypertrophy (Muscle Growth)</option>
        <option value="strength" \${manualProgramState.goal === 'strength' ? 'selected' : ''}>Strength</option>
        <option value="endurance" \${manualProgramState.goal === 'endurance' ? 'selected' : ''}>Endurance</option>
      </select>
    </div>
    
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveManualProgramStep1()">
        Next: Configure Days <i class="fas fa-arrow-right"></i>
      </button>
    </div>
  \`;
  
  document.getElementById('modalTitle').textContent = 'Create Custom Program';
  openModal(true);
}

function saveManualProgramStep1() {
  manualProgramState.name = document.getElementById('programName').value.trim();
  manualProgramState.days_per_week = parseInt(document.getElementById('daysPerWeek').value);
  manualProgramState.goal = document.getElementById('programGoal').value;
  
  if (!manualProgramState.name) {
    showNotification('Please enter a program name', 'warning');
    return;
  }
  
  // Initialize days array
  manualProgramState.days = [];
  for (let i = 0; i < manualProgramState.days_per_week; i++) {
    manualProgramState.days.push({
      day_number: i + 1,
      name: \`Day \${i + 1}\`,
      focus: '',
      exercises: []
    });
  }
  
  manualProgramState.currentDayIndex = 0;
  showManualProgramDayBuilder();
}

// Step 2: Build each day
function showManualProgramDayBuilder() {
  const day = manualProgramState.days[manualProgramState.currentDayIndex];
  const exercisesByMuscle = {};
  
  // Group exercises by muscle group
  manualProgramState.availableExercises.forEach(ex => {
    if (!exercisesByMuscle[ex.muscle_group]) {
      exercisesByMuscle[ex.muscle_group] = [];
    }
    exercisesByMuscle[ex.muscle_group].push(ex);
  });
  
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = \`
    <h3>Day \${day.day_number} of \${manualProgramState.days_per_week}</h3>
    <p style="color: var(--gray); margin-bottom: 20px;">Configure this workout day</p>
    
    <div class="form-group">
      <label>Day Name:</label>
      <input type="text" id="dayName" class="form-control" placeholder="e.g., Upper Body Push" value="\${day.name}">
    </div>
    
    <div class="form-group">
      <label>Focus/Description:</label>
      <input type="text" id="dayFocus" class="form-control" placeholder="e.g., Chest, Shoulders, Triceps" value="\${day.focus}">
    </div>
    
    <div class="form-group">
      <label>Select Exercises (\${day.exercises.length} selected):</label>
      <div style="max-height: 400px; overflow-y: auto; border: 1.5px solid var(--border); border-radius: 10px; padding: 16px;">
        \${Object.keys(exercisesByMuscle).sort().map(muscleGroup => \`
          <div style="margin-bottom: 20px;">
            <h4 style="color: var(--primary); font-size: 14px; margin-bottom: 8px;">\${muscleGroup}</h4>
            \${exercisesByMuscle[muscleGroup].map(ex => {
              const isSelected = day.exercises.some(e => e.exercise_id === ex.id);
              const selectedEx = day.exercises.find(e => e.exercise_id === ex.id);
              return \`
                <div style="padding: 12px; margin-bottom: 8px; background: \${isSelected ? 'var(--primary-light)' : 'var(--white)'}; border: 1.5px solid \${isSelected ? 'var(--primary)' : 'var(--border)'}; border-radius: 8px;">
                  <label style="display: flex; align-items: start; cursor: pointer; margin: 0;">
                    <input type="checkbox" 
                           \${isSelected ? 'checked' : ''}
                           onchange="toggleExerciseSelection(\${ex.id}, '\${ex.name.replace(/'/g, "\\\\'")}')"
                           style="margin-right: 12px; margin-top: 4px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600; margin-bottom: 4px;">\${ex.name}</div>
                      <div style="font-size: 12px; color: var(--gray);">\${ex.equipment}</div>
                      \${isSelected ? \`
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">
                          <input type="number" 
                                 value="\${selectedEx.sets || 3}"
                                 onchange="updateExerciseConfig(\${ex.id}, 'sets', this.value)"
                                 placeholder="Sets"
                                 min="1"
                                 style="padding: 6px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px;">
                          <input type="text" 
                                 value="\${selectedEx.reps || '8-12'}"
                                 onchange="updateExerciseConfig(\${ex.id}, 'reps', this.value)"
                                 placeholder="Reps"
                                 style="padding: 6px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px;">
                          <input type="number" 
                                 value="\${selectedEx.rest_seconds || 90}"
                                 onchange="updateExerciseConfig(\${ex.id}, 'rest_seconds', this.value)"
                                 placeholder="Rest (s)"
                                 min="30"
                                 step="15"
                                 style="padding: 6px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px;">
                        </div>
                      \` : ''}
                    </div>
                  </label>
                </div>
              \`;
            }).join('')}
          </div>
        \`).join('')}
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap;">
      \${manualProgramState.currentDayIndex > 0 ? \`
        <button class="btn btn-outline" onclick="manualProgramState.currentDayIndex--; showManualProgramDayBuilder()">
          <i class="fas fa-arrow-left"></i> Previous Day
        </button>
      \` : ''}
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveManualProgramDay()" style="margin-left: auto;">
        \${manualProgramState.currentDayIndex < manualProgramState.days_per_week - 1 ? 'Next Day' : 'Finish & Save'} 
        <i class="fas fa-\${manualProgramState.currentDayIndex < manualProgramState.days_per_week - 1 ? 'arrow-right' : 'check'}"></i>
      </button>
    </div>
  \`;
}

function toggleExerciseSelection(exerciseId, exerciseName) {
  const day = manualProgramState.days[manualProgramState.currentDayIndex];
  const index = day.exercises.findIndex(e => e.exercise_id === exerciseId);
  
  if (index >= 0) {
    // Remove exercise
    day.exercises.splice(index, 1);
  } else {
    // Add exercise with defaults
    day.exercises.push({
      exercise_id: exerciseId,
      name: exerciseName,
      sets: 3,
      reps: '8-12',
      rest_seconds: 90
    });
  }
  
  showManualProgramDayBuilder();
}

function updateExerciseConfig(exerciseId, field, value) {
  const day = manualProgramState.days[manualProgramState.currentDayIndex];
  const exercise = day.exercises.find(e => e.exercise_id === exerciseId);
  
  if (exercise) {
    exercise[field] = field === 'reps' ? value : parseInt(value);
  }
}

function saveManualProgramDay() {
  const day = manualProgramState.days[manualProgramState.currentDayIndex];
  day.name = document.getElementById('dayName').value.trim() || \`Day \${day.day_number}\`;
  day.focus = document.getElementById('dayFocus').value.trim();
  
  if (day.exercises.length === 0) {
    showNotification('Please select at least one exercise for this day', 'warning');
    return;
  }
  
  // Move to next day or finish
  if (manualProgramState.currentDayIndex < manualProgramState.days_per_week - 1) {
    manualProgramState.currentDayIndex++;
    showManualProgramDayBuilder();
  } else {
    saveManualProgram();
  }
}

async function saveManualProgram() {
  try {
    const programData = {
      name: manualProgramState.name,
      days_per_week: manualProgramState.days_per_week,
      goal: manualProgramState.goal,
      days: manualProgramState.days
    };
    
    await api('/programs/manual', {
      method: 'POST',
      body: JSON.stringify(programData)
    });
    
    showNotification('Custom program created successfully!', 'success');
    closeModal();
    loadPrograms();
  } catch (error) {
    showNotification('Error creating program: ' + error.message, 'error');
  }
}

// Generate program modal
function showGenerateProgram() {
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = \`
    <div class="form-group">
      <label>Days per week:</label>
      <select id="daysPerWeek" class="form-control">
        <option value="3">3 days</option>
        <option value="4">4 days</option>
        <option value="5">5 days</option>
        <option value="6">6 days</option>
      </select>
    </div>

    <div class="form-group">
      <label>Goal:</label>
      <select id="programGoal" class="form-control">
        <option value="hypertrophy">Hypertrophy (Muscle Growth)</option>
        <option value="strength">Strength</option>
        <option value="endurance">Endurance</option>
      </select>
    </div>

    <div class="form-group">
      <label>Available Equipment:</label>
      <div id="equipmentCheckboxes" class="equipment-grid">
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Smith Machine" checked> Smith Machine
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Olympic Bar" checked> Olympic Bar
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Cable Trainer" checked> Cable Machine
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Leg Extension/Curl" checked> Leg Ext/Curl
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Pull-up Bar"> Pull-up Bar
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Landmine"> Landmine
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Dip Bars"> Dip Bars
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Rower"> Rower
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Treadmill"> Treadmill
        </label>
        <label class="equipment-checkbox">
          <input type="checkbox" name="equipment" value="Stationary Bike"> Bike
        </label>
      </div>
      <small style="color: var(--gray); font-size: 12px; margin-top: 8px; display: block;">Equipment exercises prioritized over bodyweight</small>
    </div>

    <div class="form-group">
      <label>Custom Instructions (optional):</label>
      <textarea id="customInstructions" class="form-control" rows="3" 
        placeholder="E.g., Include 2 push days, 2 pull days, 1 leg day, and a cardio day. Include core workouts on relevant days."
        style="resize: vertical; min-height: 80px;"></textarea>
      <small style="color: var(--gray); font-size: 12px;">Tell the AI any specific preferences for your program</small>
    </div>

    <button class="btn btn-primary" onclick="generateProgram()" style="margin-top: 16px;">
      <i class="fas fa-magic"></i> Generate Program
    </button>
  \`;

  document.getElementById('modalTitle').textContent = 'Generate AI Program';
  openModal();
}

// Generate program
async function generateProgram() {
  const days = document.getElementById('daysPerWeek').value;
  const goal = document.getElementById('programGoal').value;
  const customInstructions = document.getElementById('customInstructions')?.value || '';
  
  // Collect selected equipment
  const equipmentCheckboxes = document.querySelectorAll('input[name="equipment"]:checked');
  const available_equipment = Array.from(equipmentCheckboxes).map(cb => cb.value);

  // Show loading state in modal
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = \`
    <div style="text-align: center; padding: 40px 20px;">
      <div style="margin-bottom: 24px;">
        <i class="fas fa-magic" style="font-size: 48px; color: var(--primary); animation: pulse 2s infinite;"></i>
      </div>
      
      <h3 style="margin-bottom: 16px; color: var(--dark);">Generating Your Program</h3>
      
      <div style="max-width: 400px; margin: 0 auto 24px;">
        <div class="loading-bar" style="height: 8px; background: var(--light); border-radius: 4px; overflow: hidden;">
          <div class="loading-bar-fill" style="height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); border-radius: 4px; animation: loading 2s ease-in-out infinite;"></div>
        </div>
      </div>
      
      <div style="color: var(--gray); line-height: 1.8;">
        <p style="margin: 8px 0;"><i class="fas fa-check" style="color: var(--secondary);"></i> Analyzing your profile...</p>
        <p style="margin: 8px 0;"><i class="fas fa-check" style="color: var(--secondary);"></i> Consulting AI for optimal exercises...</p>
        <p style="margin: 8px 0;"><i class="fas fa-spinner fa-spin" style="color: var(--primary);"></i> Building \${days}-day program...</p>
        <p style="margin: 8px 0; color: var(--gray-light);"><i class="fas fa-clock"></i> Optimizing sets and rest periods...</p>
      </div>
      
      <p style="margin-top: 24px; font-size: 13px; color: var(--gray);">This usually takes 10-30 seconds</p>
    </div>
  \`;

  try {
    await api('/programs/generate', {
      method: 'POST',
      body: JSON.stringify({
        days_per_week: parseInt(days),
        goal,
        custom_instructions: customInstructions,
        available_equipment
      })
    });

    // Show success state
    modalBody.innerHTML = \`
      <div style="text-align: center; padding: 40px 20px;">
        <div style="margin-bottom: 24px;">
          <i class="fas fa-check-circle" style="font-size: 64px; color: var(--secondary);"></i>
        </div>
        <h3 style="color: var(--dark); margin-bottom: 12px;">Program Generated Successfully!</h3>
        <p style="color: var(--gray); margin-bottom: 24px;">Your new \${days}-day \${goal} program is ready</p>
        <button class="btn btn-primary" onclick="closeModal(); loadPrograms();">
          <i class="fas fa-list"></i> View My Programs
        </button>
      </div>
    \`;
    
    // Auto-close and refresh after 2 seconds
    setTimeout(() => {
      closeModal();
      loadPrograms();
    }, 2000);
  } catch (error) {
    // Show error state
    modalBody.innerHTML = \`
      <div style="text-align: center; padding: 40px 20px;">
        <div style="margin-bottom: 24px;">
          <i class="fas fa-exclamation-circle" style="font-size: 64px; color: var(--danger);"></i>
        </div>
        <h3 style="color: var(--dark); margin-bottom: 12px;">Generation Failed</h3>
        <p style="color: var(--gray); margin-bottom: 24px;">\${error.message}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-outline" onclick="closeModal();">Close</button>
          <button class="btn btn-primary" onclick="showGenerateProgram();">Try Again</button>
        </div>
      </div>
    \`;
  }
}

// Activate program
async function activateProgram(programId) {
  try {
    await api(\`/programs/\${programId}/activate\`, { method: 'POST' });
    showNotification('Program activated!', 'success');
    loadPrograms();
  } catch (error) {
    showNotification('Error activating program: ' + error.message, 'error');
  }
}

// Delete program
async function deleteProgram(programId) {
  if (!confirm('Are you sure you want to delete this program?')) return;

  try {
    await api(\`/programs/\${programId}\`, { method: 'DELETE' });
    showNotification('Program deleted', 'success');
    closeModal();
    loadPrograms();
  } catch (error) {
    showNotification('Error deleting program: ' + error.message, 'error');
  }
}

// Start workout
async function startWorkout() {
  try {
    // Get active program
    const programsData = await api('/programs');
    const activeProgram = programsData.programs.find(p => p.active);

    if (!activeProgram) {
      showNotification('Please activate a program first', 'warning');
      switchTab('program');
      return;
    }

    // Get program details
    const programData = await api(\`/programs/\${activeProgram.id}\`);
    const program = programData.program;

    if (!program || !program.days || program.days.length === 0) {
      showNotification('No workout days found in this program', 'warning');
      return;
    }

    // Show day selection
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = \`
      <h3>Select Workout Day</h3>
      <div class="exercise-list">
        \${program.days.map(day => \`
          <div class="exercise-item" onclick="startWorkoutDay(\${program.id}, \${day.id})">
            <strong>Day \${day.day_number}: \${day.name || 'Workout Day'}</strong>
            <div style="color: var(--gray); font-size: 14px;">\${day.focus || 'Training'}</div>
            <div style="font-size: 12px; margin-top: 4px;">\${(day.exercises && day.exercises.length) || 0} exercises</div>
          </div>
        \`).join('')}
      </div>
    \`;

    document.getElementById('modalTitle').textContent = 'Start Workout';
    openModal();
  } catch (error) {
    console.error('Error starting workout:', error);
    showNotification('Error starting workout: ' + error.message, 'error');
  }
}

// Start workout from a specific program
async function startWorkoutFromProgram(programId) {
  try {
    // Get program details
    const programData = await api(\`/programs/\${programId}\`);
    const program = programData.program;

    if (!program || !program.days || program.days.length === 0) {
      showNotification('No workout days found in this program', 'warning');
      return;
    }

    // Show day selection
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = \`
      <h3>Select Workout Day</h3>
      <div class="exercise-list">
        \${program.days.map(day => \`
          <div class="exercise-item" onclick="startWorkoutDay(\${program.id}, \${day.id})">
            <strong>Day \${day.day_number}: \${day.name || 'Workout Day'}</strong>
            <div style="color: var(--gray); font-size: 14px;">\${day.focus || 'Training'}</div>
            <div style="font-size: 12px; margin-top: 4px;">\${(day.exercises && day.exercises.length) || 0} exercises</div>
          </div>
        \`).join('')}
      </div>
    \`;

    document.getElementById('modalTitle').textContent = 'Start Workout';
    openModal();
  } catch (error) {
    console.error('Error starting workout from program:', error);
    showNotification('Error starting workout: ' + error.message, 'error');
  }
}

// Start workout from program day - Phase 3 New Flow
async function startWorkoutDay(programId, programDayId) {
  try {
    showLoadingOverlay('Starting your workout...');
    
    // First check if this is a cardio day by fetching program details
    const programData = await api(\`/programs/\${programId}\`);
    const programDay = programData.program.days.find(d => d.id === programDayId);
    
    // If it's a cardio day, show cardio workout interface instead
    if (programDay && programDay.is_cardio_day) {
      hideLoadingOverlay();
      closeModal();
      showCardioWorkoutInterface(programDay, programId);
      return;
    }
    
    // Create the workout for strength training days
    const data = await api('/workouts', {
      method: 'POST',
      body: JSON.stringify({
        program_id: programId,
        program_day_id: programDayId
      })
    });

    // Fetch the full workout details with exercises
    const fullWorkout = await api(\`/workouts/\${data.workout.id}\`);
    
    state.currentWorkout = fullWorkout.workout;
    hideLoadingOverlay();
    closeModal();
    
    // Phase 3: Show warmup screen first, then exercise tabs
    showWorkoutWarmupScreen(fullWorkout.workout);
    
  } catch (error) {
    hideLoadingOverlay();
    showNotification('Error starting workout: ' + error.message, 'error');
    console.error('Start workout error:', error);
  }
}

// Cardio Workout Interface
function showCardioWorkoutInterface(programDay, programId) {
  const cardioSessions = programDay.cardio_sessions || [];
  
  // Create full-screen modal for cardio
  const modal = document.createElement('div');
  modal.id = 'cardio-workout-modal';
  modal.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-secondary);
    z-index: 10000;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  \`;
  
  // Prevent background scrolling
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = \`-\${window.scrollY}px\`;
  
  // Start timer
  const startTime = Date.now();
  
  modal.innerHTML = \`
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; text-align: center;">
        <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-heartbeat" style="font-size: 32px;"></i>
        </div>
        <h1 style="margin: 0 0 8px 0; font-size: 24px; color: white;">\${programDay.name}</h1>
        <p style="margin: 0; opacity: 0.9;">\${programDay.focus}</p>
        <div id="cardio-timer" style="font-size: 32px; font-weight: bold; margin-top: 16px; font-family: monospace;">00:00:00</div>
      </div>
      
      <!-- Planned Sessions -->
      \${cardioSessions.length > 0 ? \`
        <div class="card" style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 16px 0;"><i class="fas fa-list-check" style="color: #ef4444;"></i> Planned Sessions</h3>
          <div style="display: grid; gap: 12px;">
            \${cardioSessions.map((session, idx) => \`
              <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>\${session.name}</strong>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                      \${session.duration_minutes} min • Zone \${session.target_hr_zone || 'N/A'}
                    </div>
                  </div>
                  <span style="background: \${session.target_hr_zone <= 2 ? '#22c55e' : session.target_hr_zone <= 3 ? '#f59e0b' : '#ef4444'}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px;">
                    \${session.intensity || 'Moderate'}
                  </span>
                </div>
                \${session.notes ? \`<p style="margin: 8px 0 0 0; font-size: 13px; color: var(--text-secondary);">\${session.notes}</p>\` : ''}
              </div>
            \`).join('')}
          </div>
        </div>
      \` : ''}
      
      <!-- Record Cardio Form -->
      <div class="card" style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 16px 0;"><i class="fas fa-edit" style="color: var(--primary);"></i> Record Your Session</h3>
        
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Activity Type</label>
          <select id="cardio-activity-type" class="form-control">
            <option value="running">🏃 Running</option>
            <option value="cycling">🚴 Cycling</option>
            <option value="rowing">🚣 Rowing</option>
            <option value="elliptical">⭕ Elliptical</option>
            <option value="stairmaster">🪜 Stair Climber</option>
            <option value="swimming">🏊 Swimming</option>
            <option value="walking">🚶 Walking</option>
            <option value="hiit">⚡ HIIT</option>
            <option value="jump_rope">🪢 Jump Rope</option>
            <option value="other">📋 Other</option>
          </select>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div class="form-group" style="margin: 0;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">Duration (min)</label>
            <input type="number" id="cardio-duration" class="form-control" placeholder="30" min="1" value="">
          </div>
          <div class="form-group" style="margin: 0;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">Distance (optional)</label>
            <input type="number" id="cardio-distance" class="form-control" placeholder="km or mi" step="0.1" min="0">
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div class="form-group" style="margin: 0;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">Avg Heart Rate (bpm)</label>
            <input type="number" id="cardio-heart-rate" class="form-control" placeholder="140" min="40" max="220">
          </div>
          <div class="form-group" style="margin: 0;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">Calories Burned</label>
            <input type="number" id="cardio-calories" class="form-control" placeholder="300" min="0">
          </div>
        </div>
        
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Intensity</label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <label class="cardio-intensity-option" style="display: flex; flex-direction: column; align-items: center; padding: 12px; border: 2px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="cardio-intensity" value="low" style="display: none;">
              <span style="font-size: 24px; margin-bottom: 4px;">😊</span>
              <span style="font-size: 12px;">Low</span>
            </label>
            <label class="cardio-intensity-option" style="display: flex; flex-direction: column; align-items: center; padding: 12px; border: 2px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="cardio-intensity" value="moderate" checked style="display: none;">
              <span style="font-size: 24px; margin-bottom: 4px;">💪</span>
              <span style="font-size: 12px;">Moderate</span>
            </label>
            <label class="cardio-intensity-option" style="display: flex; flex-direction: column; align-items: center; padding: 12px; border: 2px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="cardio-intensity" value="high" style="display: none;">
              <span style="font-size: 24px; margin-bottom: 4px;">🔥</span>
              <span style="font-size: 12px;">High</span>
            </label>
          </div>
        </div>
        
        <div class="form-group" style="margin: 0;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Notes (optional)</label>
          <textarea id="cardio-notes" class="form-control" rows="2" placeholder="How did the session feel?"></textarea>
        </div>
      </div>
      
      <!-- Actions -->
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-outline" onclick="cancelCardioWorkout()" style="flex: 1; min-width: 120px;">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button class="btn btn-primary" onclick="saveCardioWorkout(\${programId}, \${programDay.id})" style="flex: 2; min-width: 200px; background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);">
          <i class="fas fa-check"></i> Complete Cardio Session
        </button>
      </div>
    </div>
  \`;
  
  document.body.appendChild(modal);
  
  // Start timer update
  window.cardioTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('cardio-timer').textContent = 
      \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
  }, 1000);
  
  // Store start time for duration calculation
  window.cardioStartTime = startTime;
  
  // Add intensity selection styling
  setTimeout(() => {
    document.querySelectorAll('.cardio-intensity-option').forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio.checked) {
        option.style.borderColor = 'var(--primary)';
        option.style.background = 'var(--primary-light)';
      }
      option.addEventListener('click', () => {
        document.querySelectorAll('.cardio-intensity-option').forEach(o => {
          o.style.borderColor = 'var(--border)';
          o.style.background = 'transparent';
        });
        option.style.borderColor = 'var(--primary)';
        option.style.background = 'var(--primary-light)';
      });
    });
  }, 100);
}

// Cancel cardio workout
function cancelCardioWorkout() {
  if (window.cardioTimerInterval) {
    clearInterval(window.cardioTimerInterval);
  }
  const modal = document.getElementById('cardio-workout-modal');
  if (modal) {
    modal.remove();
  }
  // Restore scrolling
  const scrollY = document.body.style.top;
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  window.scrollTo(0, parseInt(scrollY || '0') * -1);
}

// Save cardio workout
async function saveCardioWorkout(programId, programDayId) {
  try {
    const activityType = document.getElementById('cardio-activity-type').value;
    const duration = document.getElementById('cardio-duration').value;
    const distance = document.getElementById('cardio-distance').value;
    const heartRate = document.getElementById('cardio-heart-rate').value;
    const calories = document.getElementById('cardio-calories').value;
    const intensity = document.querySelector('input[name="cardio-intensity"]:checked')?.value || 'moderate';
    const notes = document.getElementById('cardio-notes').value;
    
    // Calculate duration from timer if not entered
    const actualDuration = duration || Math.round((Date.now() - window.cardioStartTime) / 60000);
    
    if (!actualDuration || actualDuration < 1) {
      showNotification('Please enter a duration', 'error');
      return;
    }
    
    // Save cardio session
    const response = await api('/workouts/cardio', {
      method: 'POST',
      body: JSON.stringify({
        program_id: programId,
        program_day_id: programDayId,
        activity_type: activityType,
        duration_minutes: parseInt(actualDuration),
        distance_km: distance ? parseFloat(distance) : null,
        avg_heart_rate: heartRate ? parseInt(heartRate) : null,
        calories_burned: calories ? parseInt(calories) : null,
        intensity: intensity,
        notes: notes || null
      })
    });
    
    // Stop timer
    if (window.cardioTimerInterval) {
      clearInterval(window.cardioTimerInterval);
    }
    
    // Close modal
    const modal = document.getElementById('cardio-workout-modal');
    if (modal) {
      modal.remove();
    }
    
    // Restore scrolling
    const scrollY = document.body.style.top;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
    
    showNotification('Cardio session recorded!', 'success');
    switchTab('analytics');
    
  } catch (error) {
    showNotification('Error saving cardio: ' + error.message, 'error');
    console.error('Save cardio error:', error);
  }
}

// Workout interface - Phase 2 Redesign
async function loadWorkout() {
  const container = document.getElementById('workout');

  // Check for active workout first
  if (!state.currentWorkout) {
    const workouts = await api('/workouts?limit=1');
    const activeWorkout = workouts.workouts.find(w => !w.completed);
    
    if (activeWorkout) {
      state.currentWorkout = activeWorkout;
    }
  }

  // If there's an active workout, resume it in the modal
  if (state.currentWorkout) {
    resumeWorkoutModal();
    return;
  }

  // Otherwise, show the program overview interface
  try {
    const programsData = await api('/programs');
    const activeProgram = programsData.programs.find(p => p.active);

    if (!activeProgram) {
      container.innerHTML = \`
        <div class="card">
          <h2><i class="fas fa-dumbbell"></i> No Active Program</h2>
          <p>Create or activate a program to start training.</p>
          <button class="btn btn-primary" onclick="showGenerateProgram()">
            <i class="fas fa-magic"></i> Generate New Program
          </button>
          <button class="btn btn-secondary" onclick="switchTab('program')">
            <i class="fas fa-list"></i> View Programs
          </button>
        </div>
      \`;
      return;
    }

    // Get full program details
    const programData = await api(\`/programs/\${activeProgram.id}\`);
    const program = programData.program;

    // Initialize workout tab state
    if (!state.workoutTab) {
      state.workoutTab = { currentSubTab: 'overview', selectedDay: null };
    }

    // Render the workout tab with hero and sub-tabs
    renderWorkoutTab(program);

  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading workout tab: \${error.message}</p></div>\`;
  }
}

// Render workout tab with hero section and sub-tabs
function renderWorkoutTab(program) {
  const container = document.getElementById('workout');
  
  container.innerHTML = \`
    <!-- Hero Section -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 40px 32px; color: white; margin-bottom: 24px; position: relative; overflow: hidden;">
      <!-- Background Pattern -->
      <div style="position: absolute; top: 0; right: 0; width: 200px; height: 200px; opacity: 0.1;">
        <i class="fas fa-dumbbell" style="font-size: 180px;"></i>
      </div>
      
      <div style="position: relative; z-index: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
          <div>
            <div style="font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Active Training Program</div>
            <h1 style="font-size: 32px; font-weight: 700; margin: 0 0 12px 0; color: white;">\${program.name}</h1>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <span style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px;">
                <i class="fas fa-calendar"></i> \${program.days?.length || 0} Days
              </span>
              <span style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px;">
                <i class="fas fa-target"></i> \${program.goal || 'Fitness'}
              </span>
              <span style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px;">
                <i class="fas fa-signal"></i> \${program.experience_level || 'Intermediate'}
              </span>
            </div>
          </div>
          <div>
            <button class="btn btn-primary" onclick="startWorkout()" style="background: white; color: var(--primary); font-size: 16px; padding: 14px 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <i class="fas fa-play"></i> Start Workout
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-tabs -->
    <div style="background: white; border-radius: 12px; padding: 8px; margin-bottom: 20px; display: flex; gap: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      <button 
        class="workout-subtab \${state.workoutTab.currentSubTab === 'overview' ? 'active' : ''}" 
        onclick="switchWorkoutSubTab('overview')"
        style="flex: 1; padding: 12px 20px; border: none; background: \${state.workoutTab.currentSubTab === 'overview' ? 'var(--primary)' : 'transparent'}; color: \${state.workoutTab.currentSubTab === 'overview' ? 'white' : 'var(--gray)'}; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
        <i class="fas fa-th-large"></i> Overview
      </button>
      <button 
        class="workout-subtab \${state.workoutTab.currentSubTab === 'details' ? 'active' : ''}" 
        onclick="switchWorkoutSubTab('details')"
        style="flex: 1; padding: 12px 20px; border: none; background: \${state.workoutTab.currentSubTab === 'details' ? 'var(--primary)' : 'transparent'}; color: \${state.workoutTab.currentSubTab === 'details' ? 'white' : 'var(--gray)'}; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
        <i class="fas fa-list"></i> Day Details
      </button>
    </div>

    <!-- Sub-tab Content -->
    <div id="workout-subtab-content"></div>
  \`;

  // Load the appropriate sub-tab content
  if (state.workoutTab.currentSubTab === 'overview') {
    renderWorkoutOverview(program);
  } else {
    renderWorkoutDayDetails(program);
  }
}

// Render workout overview sub-tab
function renderWorkoutOverview(program) {
  const container = document.getElementById('workout-subtab-content');
  
  // Get day of week for correlation
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date().getDay();
  
  container.innerHTML = \`
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
      <!-- Program Days List -->
      <div class="card">
        <h3><i class="fas fa-calendar-week"></i> Training Schedule</h3>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
          \${program.days && program.days.length > 0 ? program.days.map((day, idx) => {
            const dayOfWeek = daysOfWeek[(today + idx) % 7];
            return \`
              <div class="workout-day-card" onclick="selectWorkoutDay(\${idx})" style="background: \${state.workoutTab.selectedDay === idx ? 'var(--primary-light)' : 'var(--light)'}; border: 2px solid \${state.workoutTab.selectedDay === idx ? 'var(--primary)' : 'var(--border)'}; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; justify-content: between; align-items: center; gap: 16px;">
                  <div style="background: var(--primary); color: white; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; flex-shrink: 0;">
                    \${day.day_number || idx + 1}
                  </div>
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                      <div>
                        <strong style="font-size: 16px; display: block; margin-bottom: 4px;">\${day.name || \`Day \${day.day_number || idx + 1}\`}</strong>
                        <div style="color: var(--gray); font-size: 13px;">
                          <i class="fas fa-calendar"></i> Suggested: \${dayOfWeek}
                        </div>
                      </div>
                    </div>
                    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px;">
                      <span style="font-size: 13px; color: var(--gray);">
                        <i class="fas fa-dumbbell"></i> \${(day.exercises && day.exercises.length) || 0} exercises
                      </span>
                      <span style="font-size: 13px; color: var(--gray);">
                        <i class="fas fa-clock"></i> ~\${estimateDuration(day)} min
                      </span>
                      <span style="font-size: 13px; color: var(--gray);">
                        <i class="fas fa-history"></i> Last: \${getLastPerformed(day.id) || 'Never'}
                      </span>
                    </div>
                    \${day.focus ? \`<div style="margin-top: 8px; font-size: 13px; color: var(--gray);"><i class="fas fa-bullseye"></i> \${day.focus}</div>\` : ''}
                  </div>
                  <button class="btn btn-primary" onclick="event.stopPropagation(); startWorkoutFromDay(\${program.id}, \${day.id})" style="flex-shrink: 0;">
                    <i class="fas fa-play"></i>
                  </button>
                </div>
              </div>
            \`;
          }).join('') : '<p>No workout days in this program.</p>'}
        </div>
      </div>

      <!-- Muscle Map & Info -->
      <div>
        <div class="card">
          <h3><i class="fas fa-user-alt"></i> Targeted Muscles</h3>
          <div id="muscle-map" style="margin-top: 16px;">
            \${renderMuscleMap(program, state.workoutTab.selectedDay)}
          </div>
        </div>
        
        <div class="card" style="margin-top: 16px;">
          <h3><i class="fas fa-info-circle"></i> Program Info</h3>
          <div style="margin-top: 12px; font-size: 14px; line-height: 1.6;">
            \${program.description || 'No description available.'}
          </div>
        </div>
      </div>
    </div>
  \`;
}

// Render workout day details sub-tab
function renderWorkoutDayDetails(program) {
  const container = document.getElementById('workout-subtab-content');
  
  const selectedDayIndex = state.workoutTab.selectedDay !== null ? state.workoutTab.selectedDay : 0;
  const day = program.days && program.days[selectedDayIndex];

  if (!day) {
    container.innerHTML = \`
      <div class="card">
        <p>No workout day selected. Please select a day from the Overview tab.</p>
        <button class="btn btn-primary" onclick="switchWorkoutSubTab('overview')">
          <i class="fas fa-arrow-left"></i> Back to Overview
        </button>
      </div>
    \`;
    return;
  }

  container.innerHTML = \`
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="margin: 0 0 8px 0;">Day \${day.day_number || selectedDayIndex + 1}: \${day.name || 'Workout'}</h2>
          <p style="color: var(--gray); margin: 0;">\${day.focus || 'Training Session'}</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline" onclick="switchWorkoutSubTab('overview')">
            <i class="fas fa-arrow-left"></i> Overview
          </button>
          <button class="btn btn-primary" onclick="startWorkoutFromDay(\${program.id}, \${day.id})">
            <i class="fas fa-play"></i> Start This Workout
          </button>
        </div>
      </div>

      <!-- Exercise List -->
      <div style="display: flex; flex-direction: column; gap: 12px;" id="exercise-list-\${day.id}">
        \${day.exercises && day.exercises.length > 0 ? day.exercises.map((ex, idx) => \`
          <div style="background: var(--light); border-radius: 12px; padding: 16px; border-left: 4px solid var(--primary);" data-exercise-id="\${ex.id}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="display: flex; flex-direction: column; gap: 4px; margin-right: 8px;">
                <button onclick="moveExercise(\${day.id}, \${ex.id}, 'up')" class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; \${idx === 0 ? 'opacity: 0.3; pointer-events: none;' : ''}" \${idx === 0 ? 'disabled' : ''}>
                  <i class="fas fa-chevron-up"></i>
                </button>
                <button onclick="moveExercise(\${day.id}, \${ex.id}, 'down')" class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; \${idx === day.exercises.length - 1 ? 'opacity: 0.3; pointer-events: none;' : ''}" \${idx === day.exercises.length - 1 ? 'disabled' : ''}>
                  <i class="fas fa-chevron-down"></i>
                </button>
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    \${idx + 1}
                  </div>
                  <strong style="font-size: 16px;">\${ex.name}</strong>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-left: 44px;">
                  <span style="background: var(--secondary-light); color: var(--secondary); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-bullseye"></i> \${ex.muscle_group}
                  </span>
                  <span style="background: var(--primary-light); color: var(--primary); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-dumbbell"></i> \${ex.equipment}
                  </span>
                  \${ex.is_unilateral ? '<span style="background: var(--warning); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;"><i class="fas fa-balance-scale"></i> Unilateral</span>' : ''}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; color: var(--gray);">Suggested:</div>
                <div style="font-size: 18px; font-weight: 600; color: var(--primary);">
                  \${ex.target_sets || 3} × \${ex.target_reps || '8-12'}
                </div>
              </div>
            </div>
            \${ex.tips ? \`
              <details style="margin-top: 12px; margin-left: 44px;">
                <summary style="cursor: pointer; color: var(--primary); font-weight: 600; user-select: none;">
                  <i class="fas fa-info-circle"></i> Exercise Tips
                </summary>
                <div style="margin-top: 8px; font-size: 14px; line-height: 1.6; color: var(--gray);">
                  \${ex.tips}
                </div>
              </details>
            \` : ''}
          </div>
        \`).join('') : '<p>No exercises in this workout.</p>'}
      </div>
    </div>
  \`;
}

// Move exercise up or down within a program day
async function moveExercise(dayId, exerciseId, direction) {
  // Find the current program and day
  const program = state.program;
  if (!program) return;
  
  const day = program.days.find(d => d.id === dayId);
  if (!day || !day.exercises) return;
  
  const currentIndex = day.exercises.findIndex(ex => ex.id === exerciseId);
  if (currentIndex === -1) return;
  
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= day.exercises.length) return;
  
  // Swap exercises in local state
  const temp = day.exercises[currentIndex];
  day.exercises[currentIndex] = day.exercises[newIndex];
  day.exercises[newIndex] = temp;
  
  // Get new order of exercise IDs
  const exerciseOrder = day.exercises.map(ex => ex.id);
  
  try {
    await api(\`/programs/days/\${dayId}/reorder\`, {
      method: 'PATCH',
      body: JSON.stringify({ exercise_order: exerciseOrder })
    });
    
    // Re-render the day view
    renderDayDetail(program, day);
    showNotification('Exercise order updated', 'success');
  } catch (error) {
    // Revert local state on error
    day.exercises[newIndex] = day.exercises[currentIndex];
    day.exercises[currentIndex] = temp;
    showNotification('Failed to reorder exercises: ' + error.message, 'error');
  }
}

// Helper: Estimate workout duration
function estimateDuration(day) {
  if (!day.exercises) return 0;
  // Rough estimate: 3-4 minutes per set, 3 sets per exercise
  const exerciseCount = day.exercises.length;
  return Math.round(exerciseCount * 3 * 3.5);
}

// Helper: Get last performed date (placeholder)
function getLastPerformed(dayId) {
  // TODO: Implement actual tracking
  return null;
}

// Helper: Render muscle map
function renderMuscleMap(program, selectedDayIndex) {
  const day = program.days && program.days[selectedDayIndex !== null ? selectedDayIndex : 0];
  
  if (!day || !day.exercises) {
    return '<p style="color: var(--gray); font-size: 14px; text-align: center; padding: 20px;">Select a workout day to see targeted muscles</p>';
  }

  // Extract unique muscle groups
  const muscleGroups = [...new Set(day.exercises.map(ex => ex.muscle_group).filter(Boolean))];
  
  // Generate professional SVG muscle visualization
  const muscleMapSVG = generateMuscleMapSVG(muscleGroups);
  
  return \`
    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 16px; padding: 20px;">
      <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px;">
        <i class="fas fa-crosshairs"></i> Targeted Muscles
      </h4>
      
      <!-- Professional SVG Muscle Map -->
      <div style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        \${muscleMapSVG}
      </div>
      
      <!-- Muscle Legend -->
      <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px;">
        \${muscleGroups.map(muscle => {
          const color = getMuscleColor(muscle);
          return \`
            <div style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: white; border-radius: 20px; border: 2px solid \${color}; font-size: 12px; font-weight: 600;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: \${color};"></div>
              <span style="color: \${color};">\${muscle}</span>
            </div>
          \`;
        }).join('')}
      </div>
      
      <!-- Exercise Count -->
      <div style="margin-top: 12px; text-align: center; font-size: 12px; color: var(--gray);">
        <i class="fas fa-dumbbell"></i> \${day.exercises.length} exercises targeting \${muscleGroups.length} muscle group\${muscleGroups.length !== 1 ? 's' : ''}
      </div>
    </div>
  \`;
}

// Helper: Get consistent muscle colors
function getMuscleColor(muscle) {
  const muscleColors = {
    'Chest': '#e74c3c',
    'Back': '#3498db',
    'Shoulders': '#f39c12',
    'Biceps': '#9b59b6',
    'Triceps': '#1abc9c',
    'Legs': '#2ecc71',
    'Quads': '#27ae60',
    'Hamstrings': '#16a085',
    'Glutes': '#d35400',
    'Calves': '#8e44ad',
    'Abs': '#e67e22',
    'Core': '#c0392b',
    'Forearms': '#95a5a6',
    'Traps': '#34495e',
    'Lats': '#2980b9'
  };
  return muscleColors[muscle] || '#4F46E5';
}

// Generate professional SVG muscle map - anatomically accurate design
function generateMuscleMapSVG(activeMuscles) {
  const isActive = (muscle) => activeMuscles.includes(muscle);
  const getOpacity = (muscle) => isActive(muscle) ? '1' : '0.2';
  const getColor = (muscle) => isActive(muscle) ? getMuscleColor(muscle) : '#d1d5db';
  const getStroke = (muscle) => isActive(muscle) ? getMuscleColor(muscle) : '#9ca3af';
  
  return \`
    <svg viewBox="0 0 700 800" style="width: 100%; max-width: 500px; height: auto; margin: 0 auto; display: block;">
      <defs>
        <!-- Enhanced gradients for realistic depth -->
        <linearGradient id="muscleGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:0.1" />
        </linearGradient>
        <radialGradient id="muscleHighlight">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
        </radialGradient>
        <filter id="muscleShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="1" dy="1" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="700" height="800" fill="#fafafa" rx="12"/>
      
      <!-- FRONT VIEW -->
      <g id="front-view" transform="translate(50, 40)">
        <!-- Head -->
        <ellipse cx="150" cy="40" rx="35" ry="45" fill="#f5e6d3" stroke="#d4a373" stroke-width="1.5"/>
        <circle cx="140" cy="35" r="3" fill="#333"/>
        <circle cx="160" cy="35" r="3" fill="#333"/>
        <path d="M 140 48 Q 150 52 160 48" stroke="#333" stroke-width="1" fill="none"/>
        
        <!-- Neck -->
        <path d="M 135 85 L 135 105 L 165 105 L 165 85" fill="#f5e6d3" stroke="#d4a373" stroke-width="1.5"/>
        
        <!-- Trapezius (upper) -->
        <path d="M 120 105 Q 115 115 120 125 L 135 115 L 135 105 Z" 
              fill="\${getColor('Traps')}" stroke="\${getStroke('Traps')}" stroke-width="2" 
              opacity="\${getOpacity('Traps')}" filter="url(#muscleShadow)">
          \${isActive('Traps') ? '<animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        <path d="M 180 105 Q 185 115 180 125 L 165 115 L 165 105 Z" 
              fill="\${getColor('Traps')}" stroke="\${getStroke('Traps')}" stroke-width="2" 
              opacity="\${getOpacity('Traps')}" filter="url(#muscleShadow)">
          \${isActive('Traps') ? '<animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        
        <!-- Deltoids (Shoulders) - Anatomically accurate shape -->
        <path d="M 95 120 Q 85 135 90 155 Q 95 165 105 168 Q 115 165 120 155 L 120 125 Z" 
              fill="\${getColor('Shoulders')}" stroke="\${getStroke('Shoulders')}" stroke-width="2.5" 
              opacity="\${getOpacity('Shoulders')}" filter="url(#muscleShadow)">
          <ellipse cx="105" cy="145" rx="12" ry="18" fill="url(#muscleHighlight)" opacity="0.3"/>
          \${isActive('Shoulders') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        <path d="M 205 120 Q 215 135 210 155 Q 205 165 195 168 Q 185 165 180 155 L 180 125 Z" 
              fill="\${getColor('Shoulders')}" stroke="\${getStroke('Shoulders')}" stroke-width="2.5" 
              opacity="\${getOpacity('Shoulders')}" filter="url(#muscleShadow)">
          <ellipse cx="195" cy="145" rx="12" ry="18" fill="url(#muscleHighlight)" opacity="0.3"/>
          \${isActive('Shoulders') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        
        <!-- Pectorals (Chest) - Realistic muscle fiber pattern -->
        <path d="M 135 115 Q 125 125 125 145 Q 125 165 140 175 L 150 170 L 150 125 Z" 
              fill="\${getColor('Chest')}" stroke="\${getStroke('Chest')}" stroke-width="2.5" 
              opacity="\${getOpacity('Chest')}" filter="url(#muscleShadow)">
          \${isActive('Chest') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        <path d="M 165 115 Q 175 125 175 145 Q 175 165 160 175 L 150 170 L 150 125 Z" 
              fill="\${getColor('Chest')}" stroke="\${getStroke('Chest')}" stroke-width="2.5" 
              opacity="\${getOpacity('Chest')}" filter="url(#muscleShadow)">
          \${isActive('Chest') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        <!-- Chest striations for detail -->
        \${isActive('Chest') ? \`
          <line x1="130" y1="130" x2="148" y2="145" stroke="\${getStroke('Chest')}" stroke-width="0.5" opacity="0.4"/>
          <line x1="132" y1="145" x2="148" y2="158" stroke="\${getStroke('Chest')}" stroke-width="0.5" opacity="0.4"/>
          <line x1="170" y1="130" x2="152" y2="145" stroke="\${getStroke('Chest')}" stroke-width="0.5" opacity="0.4"/>
          <line x1="168" y1="145" x2="152" y2="158" stroke="\${getStroke('Chest')}" stroke-width="0.5" opacity="0.4"/>
        \` : ''}
        
        <!-- Biceps - Defined peaks -->
        <ellipse cx="85" cy="195" rx="18" ry="42" fill="\${getColor('Biceps')}" 
                 stroke="\${getStroke('Biceps')}" stroke-width="2" 
                 opacity="\${getOpacity('Biceps')}" filter="url(#muscleShadow)" transform="rotate(-10 85 195)">
          <ellipse cx="85" cy="185" rx="10" ry="15" fill="url(#muscleHighlight)" opacity="0.4"/>
          \${isActive('Biceps') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </ellipse>
        <ellipse cx="215" cy="195" rx="18" ry="42" fill="\${getColor('Biceps')}" 
                 stroke="\${getStroke('Biceps')}" stroke-width="2" 
                 opacity="\${getOpacity('Biceps')}" filter="url(#muscleShadow)" transform="rotate(10 215 195)">
          <ellipse cx="215" cy="185" rx="10" ry="15" fill="url(#muscleHighlight)" opacity="0.4"/>
          \${isActive('Biceps') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </ellipse>
        
        <!-- Triceps (visible from front) -->
        <path d="M 77 220 Q 72 235 75 250 L 82 248 Q 82 235 80 220 Z" 
              fill="\${getColor('Triceps')}" stroke="\${getStroke('Triceps')}" stroke-width="1.5" 
              opacity="\${getOpacity('Triceps') * 0.7}" filter="url(#muscleShadow)"/>
        <path d="M 223 220 Q 228 235 225 250 L 218 248 Q 218 235 220 220 Z" 
              fill="\${getColor('Triceps')}" stroke="\${getStroke('Triceps')}" stroke-width="1.5" 
              opacity="\${getOpacity('Triceps') * 0.7}" filter="url(#muscleShadow)"/>
        
        <!-- Forearms - Detailed muscle groups -->
        <path d="M 75 250 Q 70 280 72 320 Q 73 335 78 345 Q 82 335 83 320 Q 85 280 82 250 Z" 
              fill="\${getColor('Forearms')}" stroke="\${getStroke('Forearms')}" stroke-width="1.5" 
              opacity="\${getOpacity('Forearms')}" filter="url(#muscleShadow)">
          \${isActive('Forearms') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        <path d="M 225 250 Q 230 280 228 320 Q 227 335 222 345 Q 218 335 217 320 Q 215 280 218 250 Z" 
              fill="\${getColor('Forearms')}" stroke="\${getStroke('Forearms')}" stroke-width="1.5" 
              opacity="\${getOpacity('Forearms')}" filter="url(#muscleShadow)">
          \${isActive('Forearms') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        
        <!-- Abs/Core - Six-pack definition -->
        <g opacity="\${Math.max(parseFloat(getOpacity('Abs')), parseFloat(getOpacity('Core')))}">
          \${isActive('Abs') || isActive('Core') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
          <!-- Upper abs -->
          <rect x="135" y="180" width="30" height="22" rx="3" fill="\${getColor('Abs')}" 
                stroke="\${getStroke('Abs')}" stroke-width="2" filter="url(#muscleShadow)"/>
          <line x1="150" y1="180" x2="150" y2="202" stroke="\${getStroke('Abs')}" stroke-width="1.5" opacity="0.5"/>
          <!-- Middle abs -->
          <rect x="137" y="207" width="26" height="20" rx="3" fill="\${getColor('Abs')}" 
                stroke="\${getStroke('Abs')}" stroke-width="2" filter="url(#muscleShadow)"/>
          <line x1="150" y1="207" x2="150" y2="227" stroke="\${getStroke('Abs')}" stroke-width="1.5" opacity="0.5"/>
          <!-- Lower abs -->
          <rect x="139" y="232" width="22" height="18" rx="3" fill="\${getColor('Abs')}" 
                stroke="\${getStroke('Abs')}" stroke-width="2" filter="url(#muscleShadow)"/>
          <line x1="150" y1="232" x2="150" y2="250" stroke="\${getStroke('Abs')}" stroke-width="1.5" opacity="0.5"/>
        </g>
        
        <!-- Obliques -->
        <path d="M 120 200 Q 115 220 118 245 L 135 240 Q 133 220 130 200 Z" 
              fill="\${getColor('Abs')}" stroke="\${getStroke('Abs')}" stroke-width="1.5" 
              opacity="\${getOpacity('Abs') * 0.6}" filter="url(#muscleShadow)"/>
        <path d="M 180 200 Q 185 220 182 245 L 165 240 Q 167 220 170 200 Z" 
              fill="\${getColor('Abs')}" stroke="\${getStroke('Abs')}" stroke-width="1.5" 
              opacity="\${getOpacity('Abs') * 0.6}" filter="url(#muscleShadow)"/>
        
        <!-- Hip flexors / Lower core -->
        <path d="M 130 255 L 135 280 L 140 285 L 145 280 L 145 255 Z" 
              fill="\${getColor('Core')}" stroke="\${getStroke('Core')}" stroke-width="1.5" 
              opacity="\${getOpacity('Core') * 0.5}"/>
        <path d="M 170 255 L 165 280 L 160 285 L 155 280 L 155 255 Z" 
              fill="\${getColor('Core')}" stroke="\${getStroke('Core')}" stroke-width="1.5" 
              opacity="\${getOpacity('Core') * 0.5}"/>
        
        <!-- Quadriceps - Four-headed muscle -->
        <g opacity="\${Math.max(parseFloat(getOpacity('Quads')), parseFloat(getOpacity('Legs')))}">
          \${isActive('Quads') || isActive('Legs') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
          <!-- Left quad -->
          <path d="M 125 290 Q 118 350 122 420 Q 124 445 128 465 Q 132 445 134 420 Q 138 350 134 290 Z" 
                fill="\${getColor('Quads')}" stroke="\${getStroke('Quads')}" stroke-width="2" filter="url(#muscleShadow)"/>
          <ellipse cx="129" cy="360" rx="8" ry="35" fill="url(#muscleHighlight)" opacity="0.3"/>
          <line x1="129" y1="310" x2="129" y2="440" stroke="\${getStroke('Quads')}" stroke-width="1" opacity="0.4"/>
          <!-- Right quad -->
          <path d="M 175 290 Q 182 350 178 420 Q 176 445 172 465 Q 168 445 166 420 Q 162 350 166 290 Z" 
                fill="\${getColor('Quads')}" stroke="\${getStroke('Quads')}" stroke-width="2" filter="url(#muscleShadow)"/>
          <ellipse cx="171" cy="360" rx="8" ry="35" fill="url(#muscleHighlight)" opacity="0.3"/>
          <line x1="171" y1="310" x2="171" y2="440" stroke="\${getStroke('Quads')}" stroke-width="1" opacity="0.4"/>
        </g>
        
        <!-- Calves - Gastrocnemius -->
        <g opacity="\${Math.max(parseFloat(getOpacity('Calves')), parseFloat(getOpacity('Legs')))}">
          \${isActive('Calves') || isActive('Legs') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
          <ellipse cx="128" cy="530" rx="16" ry="48" fill="\${getColor('Calves')}" 
                   stroke="\${getStroke('Calves')}" stroke-width="2" filter="url(#muscleShadow)">
            <ellipse cx="128" cy="510" rx="10" ry="20" fill="url(#muscleHighlight)" opacity="0.4"/>
          </ellipse>
          <ellipse cx="172" cy="530" rx="16" ry="48" fill="\${getColor('Calves')}" 
                   stroke="\${getStroke('Calves')}" stroke-width="2" filter="url(#muscleShadow)">
            <ellipse cx="172" cy="510" rx="10" ry="20" fill="url(#muscleHighlight)" opacity="0.4"/>
          </ellipse>
        </g>
        
        <!-- Feet -->
        <ellipse cx="128" cy="595" rx="14" ry="18" fill="#f5e6d3" stroke="#d4a373" stroke-width="1"/>
        <ellipse cx="172" cy="595" rx="14" ry="18" fill="#f5e6d3" stroke="#d4a373" stroke-width="1"/>
        
        <!-- Label -->
        <text x="150" y="635" text-anchor="middle" font-size="14" font-weight="700" fill="#4b5563">FRONT</text>
      </g>
      
      <!-- BACK VIEW -->
      <g id="back-view" transform="translate(400, 40)">
        <!-- Head (back view) -->
        <ellipse cx="150" cy="40" rx="35" ry="45" fill="#f5e6d3" stroke="#d4a373" stroke-width="1.5"/>
        <path d="M 125 30 Q 135 20 145 22 Q 155 20 165 22 Q 175 20 175 30" 
              stroke="#8b6914" stroke-width="2" fill="none" stroke-linecap="round"/>
        
        <!-- Neck (back) -->
        <path d="M 135 85 L 135 105 L 165 105 L 165 85" fill="#f5e6d3" stroke="#d4a373" stroke-width="1.5"/>
        
        <!-- Trapezius (Upper back) -->
        <path d="M 120 105 Q 110 115 115 140 Q 120 155 135 155 L 150 145 L 150 110 Z" 
              fill="\${getColor('Traps')}" stroke="\${getStroke('Traps')}" stroke-width="2.5" 
              opacity="\${getOpacity('Traps')}" filter="url(#muscleShadow)">
          \${isActive('Traps') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        <path d="M 180 105 Q 190 115 185 140 Q 180 155 165 155 L 150 145 L 150 110 Z" 
              fill="\${getColor('Traps')}" stroke="\${getStroke('Traps')}" stroke-width="2.5" 
              opacity="\${getOpacity('Traps')}" filter="url(#muscleShadow)">
          \${isActive('Traps') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        
        <!-- Rear Deltoids -->
        <ellipse cx="105" cy="140" rx="18" ry="28" fill="\${getColor('Shoulders')}" 
                 stroke="\${getStroke('Shoulders')}" stroke-width="2" 
                 opacity="\${getOpacity('Shoulders')}" filter="url(#muscleShadow)" transform="rotate(-15 105 140)">
          \${isActive('Shoulders') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </ellipse>
        <ellipse cx="195" cy="140" rx="18" ry="28" fill="\${getColor('Shoulders')}" 
                 stroke="\${getStroke('Shoulders')}" stroke-width="2" 
                 opacity="\${getOpacity('Shoulders')}" filter="url(#muscleShadow)" transform="rotate(15 195 140)">
          \${isActive('Shoulders') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </ellipse>
        
        <!-- Latissimus Dorsi (Lats) - V-taper shape -->
        <path d="M 135 160 Q 115 200 110 250 Q 108 270 115 285 L 135 275 L 145 220 Z" 
              fill="\${getColor('Back')}" stroke="\${getStroke('Back')}" stroke-width="2.5" 
              opacity="\${Math.max(parseFloat(getOpacity('Back')), parseFloat(getOpacity('Lats')))}" 
              filter="url(#muscleShadow)">
          \${isActive('Back') || isActive('Lats') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        <path d="M 165 160 Q 185 200 190 250 Q 192 270 185 285 L 165 275 L 155 220 Z" 
              fill="\${getColor('Back')}" stroke="\${getStroke('Back')}" stroke-width="2.5" 
              opacity="\${Math.max(parseFloat(getOpacity('Back')), parseFloat(getOpacity('Lats')))}" 
              filter="url(#muscleShadow)">
          \${isActive('Back') || isActive('Lats') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        
        <!-- Erector Spinae (Lower back) -->
        <rect x="142" y="185" width="7" height="95" rx="3" fill="\${getColor('Back')}" 
              stroke="\${getStroke('Back')}" stroke-width="1.5" 
              opacity="\${getOpacity('Back') * 0.8}" filter="url(#muscleShadow)"/>
        <rect x="151" y="185" width="7" height="95" rx="3" fill="\${getColor('Back')}" 
              stroke="\${getStroke('Back')}" stroke-width="1.5" 
              opacity="\${getOpacity('Back') * 0.8}" filter="url(#muscleShadow)"/>
        
        <!-- Triceps (back view) -->
        <path d="M 88 180 Q 80 210 83 240 Q 85 245 90 246 Q 95 244 98 240 Q 101 210 98 180 Z" 
              fill="\${getColor('Triceps')}" stroke="\${getStroke('Triceps')}" stroke-width="2" 
              opacity="\${getOpacity('Triceps')}" filter="url(#muscleShadow)">
          \${isActive('Triceps') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        <path d="M 212 180 Q 220 210 217 240 Q 215 245 210 246 Q 205 244 202 240 Q 199 210 202 180 Z" 
              fill="\${getColor('Triceps')}" stroke="\${getStroke('Triceps')}" stroke-width="2" 
              opacity="\${getOpacity('Triceps')}" filter="url(#muscleShadow)">
          \${isActive('Triceps') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
        </path>
        
        <!-- Forearms (back) -->
        <path d="M 83 250 Q 78 280 80 320 Q 81 335 86 345 Q 90 335 91 320 Q 93 280 90 250 Z" 
              fill="\${getColor('Forearms')}" stroke="\${getStroke('Forearms')}" stroke-width="1.5" 
              opacity="\${getOpacity('Forearms')}" filter="url(#muscleShadow)"/>
        <path d="M 217 250 Q 222 280 220 320 Q 219 335 214 345 Q 210 335 209 320 Q 207 280 210 250 Z" 
              fill="\${getColor('Forearms')}" stroke="\${getStroke('Forearms')}" stroke-width="1.5" 
              opacity="\${getOpacity('Forearms')}" filter="url(#muscleShadow)"/>
        
        <!-- Glutes -->
        <g opacity="\${Math.max(parseFloat(getOpacity('Glutes')), parseFloat(getOpacity('Legs')))}">
          \${isActive('Glutes') || isActive('Legs') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
          <ellipse cx="130" cy="300" rx="20" ry="32" fill="\${getColor('Glutes')}" 
                   stroke="\${getStroke('Glutes')}" stroke-width="2" filter="url(#muscleShadow)">
            <ellipse cx="130" cy="290" rx="12" ry="15" fill="url(#muscleHighlight)" opacity="0.3"/>
          </ellipse>
          <ellipse cx="170" cy="300" rx="20" ry="32" fill="\${getColor('Glutes')}" 
                   stroke="\${getStroke('Glutes')}" stroke-width="2" filter="url(#muscleShadow)">
            <ellipse cx="170" cy="290" rx="12" ry="15" fill="url(#muscleHighlight)" opacity="0.3"/>
          </ellipse>
        </g>
        
        <!-- Hamstrings -->
        <g opacity="\${Math.max(parseFloat(getOpacity('Hamstrings')), parseFloat(getOpacity('Legs')))}">
          \${isActive('Hamstrings') || isActive('Legs') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
          <ellipse cx="128" cy="400" rx="18" ry="65" fill="\${getColor('Hamstrings')}" 
                   stroke="\${getStroke('Hamstrings')}" stroke-width="2" filter="url(#muscleShadow)">
            <ellipse cx="128" cy="380" rx="12" ry="25" fill="url(#muscleHighlight)" opacity="0.3"/>
          </ellipse>
          <ellipse cx="172" cy="400" rx="18" ry="65" fill="\${getColor('Hamstrings')}" 
                   stroke="\${getStroke('Hamstrings')}" stroke-width="2" filter="url(#muscleShadow)">
            <ellipse cx="172" cy="380" rx="12" ry="25" fill="url(#muscleHighlight)" opacity="0.3"/>
          </ellipse>
        </g>
        
        <!-- Calves (back) -->
        <g opacity="\${Math.max(parseFloat(getOpacity('Calves')), parseFloat(getOpacity('Legs')))}">
          <ellipse cx="128" cy="530" rx="16" ry="48" fill="\${getColor('Calves')}" 
                   stroke="\${getStroke('Calves')}" stroke-width="2" filter="url(#muscleShadow)">
            <ellipse cx="128" cy="510" rx="10" ry="20" fill="url(#muscleHighlight)" opacity="0.4"/>
          </ellipse>
          <ellipse cx="172" cy="530" rx="16" ry="48" fill="\${getColor('Calves')}" 
                   stroke="\${getStroke('Calves')}" stroke-width="2" filter="url(#muscleShadow)">
            <ellipse cx="172" cy="510" rx="10" ry="20" fill="url(#muscleHighlight)" opacity="0.4"/>
          </ellipse>
        </g>
        
        <!-- Feet -->
        <ellipse cx="128" cy="595" rx="14" ry="18" fill="#f5e6d3" stroke="#d4a373" stroke-width="1"/>
        <ellipse cx="172" cy="595" rx="14" ry="18" fill="#f5e6d3" stroke="#d4a373" stroke-width="1"/>
        
        <!-- Label -->
        <text x="150" y="635" text-anchor="middle" font-size="14" font-weight="700" fill="#4b5563">BACK</text>
      </g>
      
      <!-- Active Muscle Labels at top -->
      <g transform="translate(350, 10)">
        \${activeMuscles.slice(0, 3).map((muscle, idx) => \`
          <g transform="translate(0, \${idx * 24})">
            <rect x="-80" y="0" width="160" height="20" rx="10" fill="\${getMuscleColor(muscle)}" opacity="0.9"/>
            <text x="0" y="14" text-anchor="middle" font-size="13" font-weight="700" fill="white">
              \${muscle.toUpperCase()}
            </text>
          </g>
        \`).join('')}
      </g>
    </svg>
  \`;
}

// Switch workout sub-tab
function switchWorkoutSubTab(subtab) {
  state.workoutTab.currentSubTab = subtab;
  loadWorkout(); // Reload to reflect new sub-tab
}

// Select workout day
function selectWorkoutDay(dayIndex) {
  state.workoutTab.selectedDay = dayIndex;
  
  // Re-render the entire overview to update highlighting
  api('/programs').then(data => {
    const activeProgram = data.programs.find(p => p.active);
    if (activeProgram) {
      api(\`/programs/\${activeProgram.id}\`).then(programData => {
        renderWorkoutOverview(programData.program);
      });
    }
  });
}

// Update muscle map when day selected
function renderMuscleMapUpdate() {
  const mapContainer = document.getElementById('muscle-map');
  if (!mapContainer) return;
  
  // Re-fetch program and render
  api('/programs').then(data => {
    const activeProgram = data.programs.find(p => p.active);
    if (activeProgram) {
      api(\`/programs/\${activeProgram.id}\`).then(programData => {
        mapContainer.innerHTML = renderMuscleMap(programData.program, state.workoutTab.selectedDay);
      });
    }
  });
}

// Start workout from specific day
function startWorkoutFromDay(programId, dayId) {
  startWorkoutDay(programId, dayId);
}

// Check if exercise is cardio
function isCardioExercise(exercise) {
  return exercise.muscle_group === 'Cardio';
}

// Estimate calories burned for cardio based on user profile and duration
function estimateCaloriesBurned(durationMinutes, intensity = 'moderate') {
  const user = state.user || {};
  const weightKg = user.weight_kg || 70;
  
  // MET values for different intensities
  const metValues = {
    light: 3.5,      // Walking
    moderate: 6,     // Jogging, cycling
    vigorous: 9,     // Running, HIIT
    intense: 12      // Sprinting, intense intervals
  };
  
  const met = metValues[intensity] || metValues.moderate;
  // Calories = MET × weight(kg) × duration(hours)
  return Math.round(met * weightKg * (durationMinutes / 60));
}

// Format duration for display
function formatCardioTime(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
}

// Record cardio session
async function recordCardioSession(exerciseId) {
  const durationInput = document.getElementById(\`cardio-duration-\${exerciseId}\`);
  const intensitySelect = document.getElementById(\`cardio-intensity-\${exerciseId}\`);
  const distanceInput = document.getElementById(\`cardio-distance-\${exerciseId}\`);
  const hrInput = document.getElementById(\`cardio-hr-\${exerciseId}\`);
  
  const durationMinutes = parseFloat(durationInput?.value);
  if (!durationMinutes || durationMinutes <= 0) {
    showNotification('Please enter a valid duration', 'warning');
    return;
  }
  
  const intensity = intensitySelect?.value || 'moderate';
  const durationSeconds = Math.round(durationMinutes * 60);
  const caloriesBurned = estimateCaloriesBurned(durationMinutes, intensity);
  
  // Convert distance to meters
  let distanceMeters = null;
  if (distanceInput?.value) {
    const distanceValue = parseFloat(distanceInput.value);
    distanceMeters = isImperialSystem() ? distanceValue * 1609.34 : distanceValue * 1000;
  }
  
  const avgHeartRate = hrInput?.value ? parseInt(hrInput.value) : null;
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/sets\`, {
      method: 'POST',
      body: JSON.stringify({
        duration_seconds: durationSeconds,
        calories_burned: caloriesBurned,
        distance_meters: distanceMeters,
        avg_heart_rate: avgHeartRate
      })
    });
    
    showNotification(\`Cardio logged! ~\${caloriesBurned} calories burned\`, 'success');
    
    // Refresh workout UI
    await refreshWorkoutUI();
  } catch (error) {
    showNotification('Error logging cardio: ' + error.message, 'error');
  }
}

// Refresh workout UI - uses Phase 3 modal if open, otherwise does nothing (modal is primary interface)
async function refreshWorkoutUI() {
  const workoutModal = document.getElementById('workout-modal');
  if (workoutModal) {
    // Refresh data and re-render the modal
    try {
      const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
      state.currentWorkout = data.workout;
      renderWorkoutExerciseTabs();
    } catch (error) {
      console.error('Error refreshing workout UI:', error);
    }
  }
}

// Record set (legacy function - kept for any remaining references)
async function recordSet(exerciseId) {
  let weight = parseFloat(document.getElementById(\`weight-\${exerciseId}\`).value);
  const reps = parseInt(document.getElementById(\`reps-\${exerciseId}\`).value);

  if (!weight || !reps) {
    showNotification('Please enter weight and reps', 'warning');
    return;
  }

  // Convert to kg if user is using imperial
  if (isImperialSystem()) {
    weight = lbsToKg(weight);
  }

  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/sets\`, {
      method: 'POST',
      body: JSON.stringify({ weight_kg: weight, reps, rest_seconds: 90 })
    });

    showNotification('Set recorded!', 'success');
    await refreshWorkoutUI();

    // Auto-start rest timer
    startRestTimer(90);
  } catch (error) {
    showNotification('Error recording set: ' + error.message, 'error');
  }
}

// Timers
function startWorkoutTimer(workout) {
  // If workout has a start_time from DB, use that. Otherwise use current time.
  if (workout && workout.start_time) {
    // Parse the ISO date string properly
    const startTime = new Date(workout.start_time.replace(' ', 'T') + 'Z');
    state.workoutStartTime = startTime.getTime();
  } else {
    state.workoutStartTime = Date.now();
  }
  
  // Only create interval if it doesn't exist
  if (!state.workoutTimer) {
    state.workoutTimer = setInterval(updateWorkoutTimerDisplay, 1000);
  }
  
  // Update display immediately
  updateWorkoutTimerDisplay();
}

function updateWorkoutTimerDisplay() {
  if (!state.workoutStartTime) return;
  
  const elapsed = Math.floor((Date.now() - state.workoutStartTime) / 1000);
  const display = document.getElementById('workoutTimer');
  if (display && elapsed >= 0) {
    display.textContent = formatDuration(elapsed);
  }
}

function startRestTimer(seconds) {
  stopRestTimer();
  
  state.restEndTime = Date.now() + (seconds * 1000);
  state.restTimer = setInterval(updateRestTimerDisplay, 100);
  updateRestTimerDisplay();
}

function updateRestTimerDisplay() {
  if (!state.restEndTime) return;
  
  const remaining = Math.max(0, Math.ceil((state.restEndTime - Date.now()) / 1000));
  const display = document.getElementById('restTimer');
  
  if (display) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    display.textContent = \`\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
    
    if (remaining === 0) {
      playAlarm();
      stopRestTimer();
      showNotification('Rest time complete!', 'success');
    }
  }
}

function stopRestTimer() {
  // Stop old interface rest timer
  if (state.restTimer) {
    clearInterval(state.restTimer);
    state.restTimer = null;
    state.restEndTime = null;
    const display = document.getElementById('restTimer');
    if (display) display.textContent = '00:00';
  }
  
  // Stop Phase 4 rest timer
  if (state.restTimerInterval) {
    clearInterval(state.restTimerInterval);
    state.restTimerInterval = null;
    const timerDisplay = document.getElementById('rest-timer-display');
    if (timerDisplay) timerDisplay.remove();
  }
}

function playAlarm() {
  // Simple beep using Web Audio API
  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  const oscillator = state.audioContext.createOscillator();
  const gainNode = state.audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(state.audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, state.audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.5);
  
  oscillator.start(state.audioContext.currentTime);
  oscillator.stop(state.audioContext.currentTime + 0.5);
}

// Complete workout
async function completeWorkout() {
  if (!confirm('Are you sure you want to complete this workout?')) return;

  try {
    const result = await api(\`/workouts/\${state.currentWorkout.id}/complete\`, { method: 'POST' });
    
    if (state.workoutTimer) {
      clearInterval(state.workoutTimer);
      state.workoutTimer = null;
    }
    
    stopRestTimer();
    state.currentWorkout = null;
    state.workoutStartTime = null;
    
    showNotification('Workout completed! Great job!', 'success');
    
    // Show achievement notifications
    if (result.achievements && result.achievements.length > 0) {
      setTimeout(() => {
        result.achievements.forEach((achievement, index) => {
          setTimeout(() => {
            showAchievementNotification(achievement);
          }, index * 1500); // Stagger notifications
        });
      }, 1000);
    }
    
    loadWorkout();
  } catch (error) {
    showNotification('Error completing workout: ' + error.message, 'error');
  }
}

// Show achievement earned notification
function showAchievementNotification(achievement) {
  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = \`
    <div style="display: flex; align-items: center; gap: 16px;">
      <div style="font-size: 48px;">\${achievement.icon}</div>
      <div>
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 4px;">Achievement Unlocked!</div>
        <div style="font-size: 16px; color: var(--dark); margin-bottom: 4px;">\${achievement.name}</div>
        <div style="font-size: 13px; color: var(--gray);">\${achievement.description}</div>
      </div>
    </div>
  \`;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 100);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

// Analytics
async function loadAnalytics() {
  const container = document.getElementById('analytics');
  
  try {
    const [progress, volumeData, bodyMap, prsData, progressComparison] = await Promise.all([
      api('/analytics/progress?days=90'),
      api('/analytics/volume?days=90&group_by=week'),
      api('/analytics/bodymap?days=7'),
      api('/achievements/prs?limit=10'),
      api('/analytics/progress-comparison')
    ]);
    
    const prs = prsData.prs || [];
    const weekly = progressComparison.weekly;
    const monthly = progressComparison.monthly;

    // Helper to format change with arrow and color
    const formatChange = (change) => {
      if (change === 0) return '<span style="color: var(--text-secondary);">—</span>';
      const isPositive = change > 0;
      const arrow = isPositive ? '↑' : '↓';
      const color = isPositive ? 'var(--secondary)' : 'var(--danger)';
      return \`<span style="color: \${color}; font-weight: 600;">\${arrow} \${Math.abs(change).toFixed(1)}%</span>\`;
    };

    // Helper to format date range
    const formatDateRange = (start, end) => {
      const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      return \`\${formatDate(start)} - \${formatDate(end)}\`;
    };

    container.innerHTML = \`
      <!-- Progress Comparison Section -->
      <div class="card">
        <h2><i class="fas fa-chart-line"></i> Progress Comparison</h2>
        
        <!-- Weekly Comparison -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 4px; color: var(--text-secondary);">
            <i class="fas fa-calendar-week"></i> This Week vs Last Week
          </h3>
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
            <span style="color: var(--primary); font-weight: 500;">\${formatDateRange(weekly.current.start_date, weekly.current.end_date)}</span>
            vs
            <span>\${formatDateRange(weekly.previous.start_date, weekly.previous.end_date)}</span>
          </div>
          <div class="progress-comparison-grid">
            <div class="progress-comparison-card">
              <div class="progress-comparison-label">Total Volume</div>
              <div class="progress-comparison-values">
                <span class="progress-comparison-current">\${formatWeight(weekly.current.total_volume)}</span>
                <span class="progress-comparison-previous">vs \${formatWeight(weekly.previous.total_volume)}</span>
              </div>
              <div class="progress-comparison-change">\${formatChange(weekly.changes.total_volume)}</div>
            </div>
            <div class="progress-comparison-card">
              <div class="progress-comparison-label">Workout Time</div>
              <div class="progress-comparison-values">
                <span class="progress-comparison-current">\${formatDuration(weekly.current.total_time)}</span>
                <span class="progress-comparison-previous">vs \${formatDuration(weekly.previous.total_time)}</span>
              </div>
              <div class="progress-comparison-change">\${formatChange(weekly.changes.total_time)}</div>
            </div>
            <div class="progress-comparison-card">
              <div class="progress-comparison-label">Workouts</div>
              <div class="progress-comparison-values">
                <span class="progress-comparison-current">\${weekly.current.workout_count}</span>
                <span class="progress-comparison-previous">vs \${weekly.previous.workout_count}</span>
              </div>
              <div class="progress-comparison-change">\${formatChange(weekly.changes.workout_count)}</div>
            </div>
          </div>
        </div>
        
        <!-- Monthly Comparison -->
        <div>
          <h3 style="font-size: 16px; margin-bottom: 4px; color: var(--text-secondary);">
            <i class="fas fa-calendar-alt"></i> This Month vs Last Month
          </h3>
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
            <span style="color: var(--primary); font-weight: 500;">\${formatDateRange(monthly.current.start_date, monthly.current.end_date)}</span>
            vs
            <span>\${formatDateRange(monthly.previous.start_date, monthly.previous.end_date)}</span>
          </div>
          <div class="progress-comparison-grid">
            <div class="progress-comparison-card">
              <div class="progress-comparison-label">Total Volume</div>
              <div class="progress-comparison-values">
                <span class="progress-comparison-current">\${formatWeight(monthly.current.total_volume)}</span>
                <span class="progress-comparison-previous">vs \${formatWeight(monthly.previous.total_volume)}</span>
              </div>
              <div class="progress-comparison-change">\${formatChange(monthly.changes.total_volume)}</div>
            </div>
            <div class="progress-comparison-card">
              <div class="progress-comparison-label">Workout Time</div>
              <div class="progress-comparison-values">
                <span class="progress-comparison-current">\${formatDuration(monthly.current.total_time)}</span>
                <span class="progress-comparison-previous">vs \${formatDuration(monthly.previous.total_time)}</span>
              </div>
              <div class="progress-comparison-change">\${formatChange(monthly.changes.total_time)}</div>
            </div>
            <div class="progress-comparison-card">
              <div class="progress-comparison-label">Workouts</div>
              <div class="progress-comparison-values">
                <span class="progress-comparison-current">\${monthly.current.workout_count}</span>
                <span class="progress-comparison-previous">vs \${monthly.previous.workout_count}</span>
              </div>
              <div class="progress-comparison-change">\${formatChange(monthly.changes.workout_count)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2><i class="fas fa-chart-bar"></i> 90-Day Overview</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Workouts</div>
            <div class="stat-value">\${progress.overview.total_workouts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Volume</div>
            <div class="stat-value">\${formatWeight(progress.overview.total_volume_kg)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Time</div>
            <div class="stat-value">\${formatDuration(progress.overview.total_time_seconds)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Workout</div>
            <div class="stat-value">\${formatDuration(progress.overview.average_workout_time)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2><i class="fas fa-weight"></i> Volume by Muscle Group (90 days)</h2>
        \${volumeData.volume_by_muscle.length > 0 ? \`
          <div style="display: grid; gap: 8px;">
            \${volumeData.volume_by_muscle.map(m => \`
              <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--light); border-radius: 6px;">
                <strong>\${m.muscle_group}</strong>
                <span>\${formatWeight(m.volume)}</span>
              </div>
            \`).join('')}
          </div>
        \` : '<p>No volume data yet.</p>'}
      </div>
      
      <!-- Calendar placeholder - will be populated by loadWorkoutHistory -->
      <div id="workoutCalendarContainer"></div>

      <div class="card">
        <h2><i class="fas fa-body"></i> Body Map (Last 7 Days)</h2>
        \${bodyMap.body_map.length > 0 ? \`
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">
            \${bodyMap.body_map.map(m => \`
              <div style="padding: 16px; background: linear-gradient(135deg, rgba(79, 70, 229, \${m.intensity/100}) 0%, rgba(118, 75, 162, \${m.intensity/100}) 100%); 
                          border-radius: 8px; color: white; text-align: center;">
                <div style="font-weight: bold;">\${m.muscle_group}</div>
                <div style="font-size: 12px; margin-top: 4px;">\${m.set_count} sets</div>
                <div style="font-size: 12px;">\${formatWeight(m.volume)}</div>
              </div>
            \`).join('')}
          </div>
        \` : '<p>No workout data in the last 7 days.</p>'}
      </div>

      <div class="card">
        <h2><i class="fas fa-trophy"></i> Top Exercises</h2>
        \${progress.top_exercises.length > 0 ? \`
          <div class="exercise-list">
            \${progress.top_exercises.map((ex, idx) => \`
              <div class="exercise-item">
                <div style="display: flex; justify-content: space-between;">
                  <div>
                    <strong>\${idx + 1}. \${ex.name}</strong>
                    <div style="font-size: 12px; color: var(--gray);">\${ex.muscle_group}</div>
                  </div>
                  <div style="text-align: right;">
                    <div>\${formatWeight(ex.volume)} total</div>
                    <div style="font-size: 12px; color: var(--gray);">\${ex.workout_count} workouts</div>
                  </div>
                </div>
              </div>
            \`).join('')}
          </div>
        \` : '<p>No exercise data yet.</p>'}
      </div>
      
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h2 style="margin: 0;"><i class="fas fa-medal" style="color: var(--warning);"></i> Personal Records</h2>
          <button class="btn btn-outline" onclick="recalculatePRs()" style="font-size: 12px; padding: 8px 12px;">
            <i class="fas fa-sync"></i> Recalculate PRs
          </button>
        </div>
        \${prs.length > 0 ? \`
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
            \${prs.map(pr => \`
              <div style="padding: 16px; background: var(--bg-secondary); border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--warning);">
                <div>
                  <strong style="display: block; font-size: 15px;">\${pr.exercise_name}</strong>
                  <span style="font-size: 12px; color: var(--text-secondary);">\${pr.record_type.toUpperCase()} • \${new Date(pr.achieved_at).toLocaleDateString()}</span>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 20px; font-weight: bold; color: var(--primary);">\${formatWeight(pr.record_value)}</div>
                  \${pr.previous_value ? \`<div style="font-size: 12px; color: var(--secondary);">+\${((pr.record_value - pr.previous_value) / pr.previous_value * 100).toFixed(1)}%</div>\` : ''}
                </div>
              </div>
            \`).join('')}
          </div>
        \` : '<p style="color: var(--text-secondary);">No personal records yet. Complete workouts to set new PRs!</p>'}
      </div>
      
      <div class="card" id="export-section">
        <h2><i class="fas fa-download"></i> Export & Reports</h2>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">Export your fitness data or generate professional PDF reports.</p>
        
        <button class="btn btn-primary" onclick="openUnifiedExporter()" style="width: 100%; padding: 16px; font-size: 16px; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);">
          <i class="fas fa-file-export"></i> Open Export Center
        </button>
      </div>
    \`;

    // Load and display workout history
    await loadWorkoutHistory(container);

  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading analytics: \${error.message}</p></div>\`;
  }
}

// Recalculate PRs from actual workout data
async function recalculatePRs() {
  if (!confirm('This will recalculate all your Personal Records from your workout history. Continue?')) {
    return;
  }
  
  try {
    showNotification('Recalculating PRs...', 'info');
    const result = await api('/achievements/prs/recalculate', { method: 'POST' });
    showNotification(result.message, 'success');
    loadAnalytics(); // Refresh the page
  } catch (error) {
    showNotification('Error recalculating PRs: ' + error.message, 'error');
  }
}

// Export data function
async function exportData(type) {
  const startDate = document.getElementById('exportStartDate')?.value || '';
  const endDate = document.getElementById('exportEndDate')?.value || '';
  const format = document.getElementById('exportFormat')?.value || 'csv';
  
  // Build query params
  const params = new URLSearchParams();
  if (startDate) params.append('start', startDate);
  if (endDate) params.append('end', endDate);
  if (type !== 'all') params.append('format', format);
  
  const queryString = params.toString() ? \`?\${params.toString()}\` : '';
  const url = \`/api/exports/\${type}\${queryString}\`;
  
  showNotification(\`Preparing \${type} export...\`, 'info');
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Cf-Access-Jwt-Assertion': token
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Export failed');
    }
    
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('text/csv')) {
      // Handle CSV download
      const blob = await response.blob();
      const filename = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] 
        || \`\${type}_export_\${new Date().toISOString().split('T')[0]}.csv\`;
      downloadBlob(blob, filename);
      showNotification(\`\${type} data exported successfully!\`, 'success');
    } else {
      // Handle JSON
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const filename = \`\${type}_export_\${new Date().toISOString().split('T')[0]}.json\`;
      downloadBlob(blob, filename);
      showNotification(\`\${type} data exported successfully!\`, 'success');
    }
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Export failed: ' + error.message, 'error');
  }
}

// Helper to trigger file download
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ============================================
// UNIFIED EXPORT CENTER
// ============================================

// Open the unified Export Center modal
function openUnifiedExporter() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const modal = document.getElementById('modal');
  const modalContent = modal.querySelector('.modal-content');
  modalContent.classList.add('wide');
  
  document.getElementById('modalTitle').innerHTML = '<i class="fas fa-file-export" style="color: #7c3aed;"></i> Export Center';
  document.getElementById('modalBody').innerHTML = \`
    <div style="display: grid; gap: 20px;">
      <!-- Export Type Tabs -->
      <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--border); padding-bottom: 0;">
        <button class="export-tab active" onclick="switchExportTab('data')" data-tab="data" style="padding: 12px 20px; border: none; background: none; font-weight: 600; color: var(--primary); border-bottom: 2px solid var(--primary); margin-bottom: -2px; cursor: pointer;">
          <i class="fas fa-database"></i> Data Export
        </button>
        <button class="export-tab" onclick="switchExportTab('pdf')" data-tab="pdf" style="padding: 12px 20px; border: none; background: none; font-weight: 600; color: var(--text-secondary); border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer;">
          <i class="fas fa-file-pdf"></i> PDF Report
        </button>
      </div>
      
      <!-- Shared Date Range -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; background: var(--bg-secondary); border-radius: 12px;">
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 13px;">Start Date</label>
          <input type="date" id="exportStartDate" class="form-control" value="\${thirtyDaysAgo.toISOString().split('T')[0]}" style="padding: 12px;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 13px;">End Date</label>
          <input type="date" id="exportEndDate" class="form-control" value="\${new Date().toISOString().split('T')[0]}" style="padding: 12px;">
        </div>
      </div>
      
      <!-- Data Export Panel -->
      <div id="dataExportPanel">
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 600; margin-bottom: 12px;">Select Data to Export</label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
            <label style="display: flex; align-items: center; gap: 10px; padding: 14px; background: var(--bg-secondary); border-radius: 10px; cursor: pointer; border: 2px solid var(--border); transition: all 0.2s;" onchange="updateExportSelection()">
              <input type="checkbox" id="exportWorkouts" checked style="width: 18px; height: 18px; accent-color: var(--primary);">
              <i class="fas fa-dumbbell" style="color: var(--primary);"></i>
              <span>Workouts</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; padding: 14px; background: var(--bg-secondary); border-radius: 10px; cursor: pointer; border: 2px solid var(--border); transition: all 0.2s;">
              <input type="checkbox" id="exportNutrition" checked style="width: 18px; height: 18px; accent-color: var(--secondary);">
              <i class="fas fa-utensils" style="color: var(--secondary);"></i>
              <span>Nutrition</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; padding: 14px; background: var(--bg-secondary); border-radius: 10px; cursor: pointer; border: 2px solid var(--border); transition: all 0.2s;">
              <input type="checkbox" id="exportRecords" checked style="width: 18px; height: 18px; accent-color: var(--warning);">
              <i class="fas fa-trophy" style="color: var(--warning);"></i>
              <span>Personal Records</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; padding: 14px; background: var(--bg-secondary); border-radius: 10px; cursor: pointer; border: 2px solid var(--border); transition: all 0.2s;">
              <input type="checkbox" id="exportHealth" checked style="width: 18px; height: 18px; accent-color: #ec4899;">
              <i class="fas fa-heartbeat" style="color: #ec4899;"></i>
              <span>Health Data</span>
            </label>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px;">Export Format</label>
          <div style="display: flex; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--primary-light); border: 2px solid var(--primary); border-radius: 10px; cursor: pointer;">
              <input type="radio" name="exportFormat" value="csv" checked style="display: none;">
              <i class="fas fa-file-csv" style="color: var(--primary);"></i>
              <span style="font-weight: 600; color: var(--primary);">CSV</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 10px; cursor: pointer;" onclick="selectExportFormat(this, 'json')">
              <input type="radio" name="exportFormat" value="json" style="display: none;">
              <i class="fas fa-file-code" style="color: var(--text-secondary);"></i>
              <span style="font-weight: 600;">JSON</span>
            </label>
          </div>
        </div>
        
        <button class="btn btn-primary" onclick="executeDataExport()" style="width: 100%; padding: 14px; font-size: 15px;">
          <i class="fas fa-download"></i> Download Data
        </button>
      </div>
      
      <!-- PDF Report Panel (Hidden by default) -->
      <div id="pdfExportPanel" style="display: none;">
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 600; margin-bottom: 12px;">Report Type</label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px;">
            <label style="display: flex; align-items: center; gap: 10px; padding: 14px; border: 2px solid var(--primary); background: var(--primary-light); border-radius: 10px; cursor: pointer;" onclick="selectReportType(this, 'progress')">
              <input type="radio" name="reportType" value="progress" checked style="display: none;">
              <i class="fas fa-chart-line" style="color: var(--primary);"></i>
              <span style="font-weight: 500;">Progress</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; padding: 14px; border: 2px solid var(--border); border-radius: 10px; cursor: pointer;" onclick="selectReportType(this, 'workout')">
              <input type="radio" name="reportType" value="workout" style="display: none;">
              <i class="fas fa-dumbbell" style="color: var(--text-secondary);"></i>
              <span>Workouts</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; padding: 14px; border: 2px solid var(--border); border-radius: 10px; cursor: pointer;" onclick="selectReportType(this, 'analytics')">
              <input type="radio" name="reportType" value="analytics" style="display: none;">
              <i class="fas fa-brain" style="color: var(--text-secondary);"></i>
              <span>Analytics</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; padding: 14px; border: 2px solid var(--border); border-radius: 10px; cursor: pointer;" onclick="selectReportType(this, 'comprehensive')">
              <input type="radio" name="reportType" value="comprehensive" style="display: none;">
              <i class="fas fa-file-alt" style="color: var(--text-secondary);"></i>
              <span>Full Report</span>
            </label>
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 600; margin-bottom: 12px;">Include in Report</label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; font-size: 14px;">
              <input type="checkbox" id="chartVolume" checked style="width: 16px; height: 16px; accent-color: var(--primary);">
              <span>Volume Chart</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; font-size: 14px;">
              <input type="checkbox" id="chartMuscle" checked style="width: 16px; height: 16px; accent-color: var(--primary);">
              <span>Muscle Chart</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; font-size: 14px;">
              <input type="checkbox" id="sectionPRs" checked style="width: 16px; height: 16px; accent-color: var(--primary);">
              <span>PRs Table</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; font-size: 14px;">
              <input type="checkbox" id="sectionRecovery" checked style="width: 16px; height: 16px; accent-color: var(--primary);">
              <span>Recovery</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; font-size: 14px;">
              <input type="checkbox" id="sectionPredictions" checked style="width: 16px; height: 16px; accent-color: var(--primary);">
              <span>Predictions</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; font-size: 14px;">
              <input type="checkbox" id="sectionNutrition" checked style="width: 16px; height: 16px; accent-color: var(--primary);">
              <span>Nutrition</span>
            </label>
          </div>
        </div>
        
        <div id="reportPreviewArea" style="display: none; border: 1px solid var(--border); border-radius: 12px; padding: 16px; background: white; margin-bottom: 16px; max-height: 300px; overflow-y: auto;">
          <div id="reportPreviewContent"></div>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-outline" onclick="previewPDFReport()" style="flex: 1;">
            <i class="fas fa-eye"></i> Preview
          </button>
          <button class="btn btn-primary" onclick="generatePDFReport()" style="flex: 2; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);">
            <i class="fas fa-file-pdf"></i> Generate PDF
          </button>
        </div>
      </div>
    </div>
  \`;
  
  modal.classList.add('active');
}

// Switch between export tabs
function switchExportTab(tab) {
  document.querySelectorAll('.export-tab').forEach(t => {
    t.style.color = 'var(--text-secondary)';
    t.style.borderBottomColor = 'transparent';
    t.classList.remove('active');
  });
  const activeTab = document.querySelector(\`.export-tab[data-tab="\${tab}"]\`);
  if (activeTab) {
    activeTab.style.color = 'var(--primary)';
    activeTab.style.borderBottomColor = 'var(--primary)';
    activeTab.classList.add('active');
  }
  
  document.getElementById('dataExportPanel').style.display = tab === 'data' ? 'block' : 'none';
  document.getElementById('pdfExportPanel').style.display = tab === 'pdf' ? 'block' : 'none';
}

// Select export format (CSV/JSON)
function selectExportFormat(element, format) {
  document.querySelectorAll('label:has(input[name="exportFormat"])').forEach(label => {
    label.style.background = 'var(--bg-secondary)';
    label.style.borderColor = 'var(--border)';
    label.querySelector('i').style.color = 'var(--text-secondary)';
    label.querySelector('span').style.color = 'var(--text-primary)';
  });
  element.style.background = 'var(--primary-light)';
  element.style.borderColor = 'var(--primary)';
  element.querySelector('i').style.color = 'var(--primary)';
  element.querySelector('span').style.color = 'var(--primary)';
  element.querySelector('input').checked = true;
}

// Execute data export based on selections
async function executeDataExport() {
  const startDate = document.getElementById('exportStartDate')?.value || '';
  const endDate = document.getElementById('exportEndDate')?.value || '';
  const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv';
  
  const exportWorkouts = document.getElementById('exportWorkouts')?.checked;
  const exportNutrition = document.getElementById('exportNutrition')?.checked;
  const exportRecords = document.getElementById('exportRecords')?.checked;
  const exportHealth = document.getElementById('exportHealth')?.checked;
  
  // If all selected, do a full export
  if (exportWorkouts && exportNutrition && exportRecords && exportHealth) {
    await exportData('all');
    return;
  }
  
  // Export selected types
  const exports = [];
  if (exportWorkouts) exports.push(exportData('workouts'));
  if (exportNutrition) exports.push(exportData('nutrition'));
  if (exportRecords) exports.push(exportData('records'));
  if (exportHealth) exports.push(exportData('measurements'));
  
  if (exports.length === 0) {
    showNotification('Please select at least one data type to export', 'error');
    return;
  }
  
  await Promise.all(exports);
}

// Keep old function name for compatibility
function openReportBuilder() {
  openUnifiedExporter();
  setTimeout(() => switchExportTab('pdf'), 100);
}

// Select report type in the builder
function selectReportType(element, type) {
  document.querySelectorAll('label[onclick*="selectReportType"]').forEach(label => {
    label.style.borderColor = 'var(--border)';
    label.style.background = 'transparent';
  });
  element.style.borderColor = 'var(--primary)';
  element.style.background = 'var(--primary-light)';
  element.querySelector('input').checked = true;
}

// Preview the PDF report before generating
async function previewPDFReport() {
  const previewArea = document.getElementById('reportPreviewArea');
  const previewContent = document.getElementById('reportPreviewContent');
  
  previewArea.style.display = 'block';
  previewContent.innerHTML = \`
    <div style="text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-secondary);">Generating preview...</p>
    </div>
  \`;
  
  try {
    const reportData = await fetchReportData();
    previewContent.innerHTML = generateReportHTML(reportData);
    
    // Render charts in preview
    setTimeout(() => renderPreviewCharts(reportData), 100);
  } catch (error) {
    previewContent.innerHTML = \`<p style="color: var(--danger);">Error generating preview: \${error.message}</p>\`;
  }
}

// Fetch all data needed for the report
async function fetchReportData() {
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;
  const reportType = document.querySelector('input[name="reportType"]:checked').value;
  
  const [progressData, advancedData, workoutsData, nutritionData, prsData] = await Promise.all([
    api(\`/analytics/progress?days=90\`),
    api('/analytics/advanced'),
    api(\`/workouts?limit=100\`),
    api('/nutrition/logs?limit=30'),
    api('/achievements/prs')
  ]);
  
  // Filter workouts by date range
  const workouts = (workoutsData.workouts || []).filter(w => {
    const date = w.start_time.split('T')[0];
    return date >= startDate && date <= endDate;
  });
  
  return {
    reportType,
    startDate,
    endDate,
    progress: progressData,
    advanced: advancedData,
    workouts,
    nutrition: nutritionData.logs || [],
    prs: prsData.records || [],
    user: state.user,
    options: {
      chartVolume: document.getElementById('chartVolume')?.checked,
      chartMuscle: document.getElementById('chartMuscle')?.checked,
      chartStrength: document.getElementById('chartStrength')?.checked,
      chartFrequency: document.getElementById('chartFrequency')?.checked,
      sectionPRs: document.getElementById('sectionPRs')?.checked,
      sectionNutrition: document.getElementById('sectionNutrition')?.checked,
      sectionRecovery: document.getElementById('sectionRecovery')?.checked,
      sectionPredictions: document.getElementById('sectionPredictions')?.checked
    }
  };
}

// Generate HTML for the report
function generateReportHTML(data) {
  const dateRangeText = \`\${new Date(data.startDate).toLocaleDateString()} - \${new Date(data.endDate).toLocaleDateString()}\`;
  
  return \`
    <div id="pdfReportContent" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: white; color: #111;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #7c3aed;">
        <h1 style="margin: 0; color: #7c3aed; font-size: 28px;">AI Fitness Coach</h1>
        <h2 style="margin: 8px 0 0 0; color: #666; font-weight: normal; font-size: 18px;">
          \${data.reportType === 'progress' ? 'Progress Report' : 
            data.reportType === 'workout' ? 'Workout Summary' :
            data.reportType === 'analytics' ? 'Analytics Report' : 'Comprehensive Fitness Report'}
        </h2>
        <p style="margin: 8px 0 0 0; color: #999; font-size: 14px;">\${dateRangeText}</p>
        <p style="margin: 4px 0 0 0; color: #999; font-size: 12px;">Generated for \${data.user?.name || 'User'} on \${new Date().toLocaleDateString()}</p>
      </div>
      
      <!-- Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px;">
        <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 12px;">
          <div style="font-size: 28px; font-weight: bold; color: #2563eb;">\${data.workouts.length}</div>
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">Workouts</div>
        </div>
        <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 12px;">
          <div style="font-size: 28px; font-weight: bold; color: #059669;">\${formatWeight(data.progress?.overview?.total_volume_kg || 0)}</div>
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">Total Volume</div>
        </div>
        <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 12px;">
          <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">\${Math.round((data.progress?.overview?.total_time_seconds || 0) / 60)}m</div>
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">Total Time</div>
        </div>
        <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 12px;">
          <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">\${data.prs.length}</div>
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">PRs Set</div>
        </div>
      </div>
      
      \${data.options.chartVolume ? \`
      <!-- Volume Chart -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          <span style="color: #2563eb;">📊</span> Volume Trend
        </h3>
        <div style="height: 250px; background: #fafafa; border-radius: 8px; padding: 10px;">
          <canvas id="previewVolumeChart"></canvas>
        </div>
      </div>
      \` : ''}
      
      \${data.options.chartMuscle ? \`
      <!-- Muscle Distribution -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          <span style="color: #059669;">💪</span> Muscle Group Distribution
        </h3>
        <div style="display: flex; justify-content: center;">
          <div style="width: 300px; height: 300px;">
            <canvas id="previewMuscleChart"></canvas>
          </div>
        </div>
      </div>
      \` : ''}
      
      \${data.options.sectionRecovery && data.advanced ? \`
      <!-- Recovery & Balance -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          <span style="color: #7c3aed;">⚡</span> Recovery & Balance
        </h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="text-align: center; padding: 20px; background: \${data.advanced.recovery?.score >= 70 ? '#d1fae5' : data.advanced.recovery?.score >= 40 ? '#fef3c7' : '#fee2e2'}; border-radius: 12px;">
            <div style="font-size: 32px; font-weight: bold;">\${data.advanced.recovery?.score || 0}</div>
            <div style="font-size: 13px; color: #666;">Recovery Score</div>
          </div>
          <div style="text-align: center; padding: 20px; background: \${data.advanced.consistency?.consistency >= 70 ? '#d1fae5' : '#fef3c7'}; border-radius: 12px;">
            <div style="font-size: 32px; font-weight: bold;">\${data.advanced.consistency?.consistency || 0}%</div>
            <div style="font-size: 13px; color: #666;">Consistency</div>
          </div>
          <div style="text-align: center; padding: 20px; background: \${data.advanced.muscle_balance?.balance >= 70 ? '#d1fae5' : '#fef3c7'}; border-radius: 12px;">
            <div style="font-size: 32px; font-weight: bold;">\${data.advanced.muscle_balance?.balance || 0}%</div>
            <div style="font-size: 13px; color: #666;">Muscle Balance</div>
          </div>
        </div>
      </div>
      \` : ''}
      
      \${data.options.sectionPRs && data.prs.length > 0 ? \`
      <!-- Personal Records -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          <span style="color: #f59e0b;">🏆</span> Personal Records
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb;">Exercise</th>
              <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e5e7eb;">Record</th>
              <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e5e7eb;">Type</th>
              <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e5e7eb;">Date</th>
            </tr>
          </thead>
          <tbody>
            \${data.prs.slice(0, 10).map(pr => \`
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">\${pr.exercise_name}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #2563eb;">\${formatWeight(pr.record_value)}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">\${pr.record_type}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb; color: #666;">\${new Date(pr.achieved_at).toLocaleDateString()}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
      \` : ''}
      
      \${data.options.sectionPredictions && data.advanced?.strength_predictions?.length > 0 ? \`
      <!-- Strength Predictions -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          <span style="color: #7c3aed;">🔮</span> Strength Predictions (4 Weeks)
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb;">Exercise</th>
              <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e5e7eb;">Current</th>
              <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e5e7eb;">Predicted</th>
              <th style="text-align: center; padding: 12px; border-bottom: 2px solid #e5e7eb;">Trend</th>
              <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e5e7eb;">Confidence</th>
            </tr>
          </thead>
          <tbody>
            \${data.advanced.strength_predictions.slice(0, 8).map(pred => \`
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">\${pred.exercise_name}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">\${formatWeight(pred.current_max)}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #7c3aed;">\${formatWeight(pred.predicted_max_4_weeks)}</td>
                <td style="text-align: center; padding: 12px; border-bottom: 1px solid #e5e7eb;">\${pred.trend === 'increasing' ? '📈' : pred.trend === 'decreasing' ? '📉' : '➡️'}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">\${pred.confidence}%</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
      \` : ''}
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px;">
        <p>Generated by AI Fitness Coach • \${new Date().toLocaleString()}</p>
      </div>
    </div>
  \`;
}

// Render charts in the preview
function renderPreviewCharts(data) {
  // Volume Chart
  if (data.options.chartVolume && document.getElementById('previewVolumeChart')) {
    const volumeData = data.progress?.volume_trends || [];
    new Chart(document.getElementById('previewVolumeChart'), {
      type: 'line',
      data: {
        labels: volumeData.map(v => v.period),
        datasets: [{
          label: 'Volume (kg)',
          data: volumeData.map(v => v.total_volume),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
  
  // Muscle Distribution Chart
  if (data.options.chartMuscle && document.getElementById('previewMuscleChart')) {
    const muscleData = data.progress?.volume_by_muscle || [];
    new Chart(document.getElementById('previewMuscleChart'), {
      type: 'doughnut',
      data: {
        labels: muscleData.map(m => m.muscle_group),
        datasets: [{
          data: muscleData.map(m => m.volume),
          backgroundColor: [
            '#2563eb', '#059669', '#7c3aed', '#f59e0b', '#ec4899',
            '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  }
}

// Generate and download the PDF
async function generatePDFReport() {
  showNotification('Generating PDF report...', 'info');
  
  try {
    const reportData = await fetchReportData();
    
    // Create a temporary container for the report
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = 'white';
    container.innerHTML = generateReportHTML(reportData);
    document.body.appendChild(container);
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Render charts
    await renderPDFCharts(container, reportData);
    
    // Wait for charts to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate PDF using html2canvas and jsPDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    // Clean up
    document.body.removeChild(container);
    
    // Download PDF
    const filename = \`fitness_report_\${reportData.startDate}_to_\${reportData.endDate}.pdf\`;
    pdf.save(filename);
    
    showNotification('PDF report generated successfully!', 'success');
    closeModal();
    
  } catch (error) {
    console.error('PDF generation error:', error);
    showNotification('Error generating PDF: ' + error.message, 'error');
  }
}

// Render charts for PDF generation
async function renderPDFCharts(container, data) {
  const volumeCanvas = container.querySelector('#previewVolumeChart');
  const muscleCanvas = container.querySelector('#previewMuscleChart');
  
  if (volumeCanvas && data.options.chartVolume) {
    const volumeData = data.progress?.volume_trends || [];
    new Chart(volumeCanvas, {
      type: 'line',
      data: {
        labels: volumeData.map(v => v.period),
        datasets: [{
          label: 'Volume (kg)',
          data: volumeData.map(v => v.total_volume),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }
  
  if (muscleCanvas && data.options.chartMuscle) {
    const muscleData = data.progress?.volume_by_muscle || [];
    new Chart(muscleCanvas, {
      type: 'doughnut',
      data: {
        labels: muscleData.map(m => m.muscle_group),
        datasets: [{
          data: muscleData.map(m => m.volume),
          backgroundColor: [
            '#2563eb', '#059669', '#7c3aed', '#f59e0b', '#ec4899',
            '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  }
}

// Load workout history calendar for analytics
async function loadWorkoutHistory(container) {
  try {
    // Fetch more workouts for calendar view (last 90 days worth)
    const workoutsData = await api('/workouts?limit=100');
    
    // Store workouts globally for calendar interaction
    state.calendarWorkouts = workoutsData.workouts || [];
    
    // Build workout lookup by date
    const workoutsByDate = {};
    for (const w of state.calendarWorkouts) {
      const dateKey = new Date(w.start_time).toISOString().split('T')[0];
      if (!workoutsByDate[dateKey]) workoutsByDate[dateKey] = [];
      workoutsByDate[dateKey].push(w);
    }
    state.workoutsByDate = workoutsByDate;
    
    // Initialize to current month
    const now = new Date();
    state.calendarMonth = now.getMonth();
    state.calendarYear = now.getFullYear();
    
    const historyHTML = \`
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;"><i class="fas fa-calendar-alt"></i> Workout Calendar</h2>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-outline" onclick="changeCalendarMonth(-1)" style="padding: 8px 12px;">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span id="calendarMonthLabel" style="min-width: 140px; text-align: center; font-weight: 600; font-size: 16px;">
              \${new Date(state.calendarYear, state.calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button class="btn btn-outline" onclick="changeCalendarMonth(1)" style="padding: 8px 12px;">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        <div id="workoutCalendar">
          \${renderWorkoutCalendar()}
        </div>
        <div id="calendarWorkoutDetail" style="margin-top: 20px;"></div>
      </div>
    \`;
    
    // Insert into the placeholder container if it exists, otherwise append
    const calendarContainer = document.getElementById('workoutCalendarContainer');
    if (calendarContainer) {
      calendarContainer.innerHTML = historyHTML;
    } else {
      container.insertAdjacentHTML('beforeend', historyHTML);
    }
  } catch (error) {
    console.error('Error loading workout history:', error);
  }
}

// Render workout calendar grid
function renderWorkoutCalendar() {
  const year = state.calendarYear;
  const month = state.calendarMonth;
  const workoutsByDate = state.workoutsByDate || {};
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay(); // 0 = Sunday
  const totalDays = lastDay.getDate();
  
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let html = \`
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;">
      \${dayNames.map(d => \`<div style="padding: 8px; font-weight: 600; color: var(--text-secondary); font-size: 12px;">\${d}</div>\`).join('')}
  \`;
  
  // Empty cells for start padding
  for (let i = 0; i < startPadding; i++) {
    html += \`<div style="padding: 8px;"></div>\`;
  }
  
  // Day cells
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
    const hasWorkout = workoutsByDate[dateKey] && workoutsByDate[dateKey].length > 0;
    const isToday = dateKey === todayKey;
    const workoutCount = hasWorkout ? workoutsByDate[dateKey].length : 0;
    
    html += \`
      <div 
        onclick="\${hasWorkout ? \`showCalendarWorkouts('\${dateKey}')\` : ''}"
        style="
          padding: 8px;
          min-height: 50px;
          border-radius: 8px;
          cursor: \${hasWorkout ? 'pointer' : 'default'};
          background: \${isToday ? 'var(--primary-light)' : 'var(--bg-secondary)'};
          border: \${isToday ? '2px solid var(--primary)' : '1px solid var(--border)'};
          position: relative;
          transition: transform 0.1s;
          \${hasWorkout ? 'box-shadow: 0 2px 4px rgba(0,0,0,0.1);' : ''}
        "
        \${hasWorkout ? 'onmouseover="this.style.transform=\\'scale(1.05)\\'" onmouseout="this.style.transform=\\'scale(1)\\'"' : ''}
      >
        <div style="font-size: 14px; \${isToday ? 'font-weight: bold; color: var(--primary);' : ''}">\${day}</div>
        \${hasWorkout ? \`
          <div style="
            width: 24px; 
            height: 24px; 
            background: var(--secondary); 
            border-radius: 50%; 
            margin: 4px auto 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: bold;
          ">\${workoutCount > 1 ? workoutCount : '<i class="fas fa-dumbbell" style="font-size: 10px;"></i>'}</div>
        \` : ''}
      </div>
    \`;
  }
  
  html += '</div>';
  
  // Legend
  html += \`
    <div style="display: flex; gap: 20px; margin-top: 16px; justify-content: center; font-size: 13px; color: var(--text-secondary);">
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 20px; height: 20px; background: var(--secondary); border-radius: 50%;"></div>
        <span>Workout completed</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 20px; height: 20px; background: var(--primary-light); border: 2px solid var(--primary); border-radius: 4px;"></div>
        <span>Today</span>
      </div>
    </div>
  \`;
  
  return html;
}

// Change calendar month
function changeCalendarMonth(delta) {
  state.calendarMonth += delta;
  if (state.calendarMonth > 11) {
    state.calendarMonth = 0;
    state.calendarYear++;
  } else if (state.calendarMonth < 0) {
    state.calendarMonth = 11;
    state.calendarYear--;
  }
  
  // Update label
  document.getElementById('calendarMonthLabel').textContent = 
    new Date(state.calendarYear, state.calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Re-render calendar
  document.getElementById('workoutCalendar').innerHTML = renderWorkoutCalendar();
  
  // Clear workout detail
  document.getElementById('calendarWorkoutDetail').innerHTML = '';
}

// Show workouts for a specific date
function showCalendarWorkouts(dateKey) {
  const workouts = state.workoutsByDate[dateKey] || [];
  if (workouts.length === 0) return;
  
  const dateDisplay = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  });
  
  const detailHTML = \`
    <div style="border-top: 1px solid var(--border); padding-top: 20px;">
      <h3 style="margin-bottom: 16px;"><i class="fas fa-calendar-day"></i> \${dateDisplay}</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        \${workouts.map(w => \`
          <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; border-left: 4px solid \${w.completed ? 'var(--secondary)' : 'var(--warning)'};">
            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px;">
              <div>
                <strong style="font-size: 16px;">\${w.day_name || 'Custom Workout'}</strong>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
                  <span><i class="fas fa-clock"></i> \${formatDuration(w.total_duration_seconds)}</span>
                  <span><i class="fas fa-weight-hanging"></i> \${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}</span>
                  <span><i class="fas fa-layer-group"></i> \${w.total_sets || 0} sets</span>
                  \${w.perceived_exertion ? \`<span><i class="fas fa-fire"></i> \${w.perceived_exertion}/10 \${getExertionEmoji(w.perceived_exertion)}</span>\` : ''}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" onclick="viewWorkout(\${w.id})" style="padding: 8px 16px; font-size: 13px;">
                  <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn btn-danger" onclick="deleteAnalyticsWorkout(\${w.id})" style="padding: 8px 12px; font-size: 13px;">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        \`).join('')}
      </div>
    </div>
  \`;
  
  document.getElementById('calendarWorkoutDetail').innerHTML = detailHTML;
}

// AI Insights & Recommendations
async function loadInsights() {
  const container = document.getElementById('insights');
  
  // Show loading state
  container.innerHTML = \`
    <div class="card" style="text-align: center; padding: 60px;">
      <i class="fas fa-robot fa-spin" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
      <h3>Analyzing your training data...</h3>
      <p style="color: var(--text-secondary);">Your AI Coach is reviewing your workout history</p>
    </div>
  \`;
  
  try {
    // Fetch training analysis data
    const analysisData = await api('/ai/coach/analysis?days=90');
    const data = analysisData.data;
    
    if (!data || data.summary.total_workouts < 1) {
      container.innerHTML = \`
        <div class="card" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; border: none;">
          <h2 style="margin: 0 0 12px 0; color: white;"><i class="fas fa-robot"></i> AI Fitness Coach</h2>
          <p style="margin: 0; opacity: 0.95;">Your personal AI-powered strength coach</p>
        </div>
        <div class="card" style="text-align: center; padding: 60px;">
          <i class="fas fa-dumbbell" style="font-size: 64px; color: var(--gray); margin-bottom: 16px;"></i>
          <h3>Complete Some Workouts First</h3>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">
            Your AI Coach needs workout data to provide personalized recommendations.<br>
            Complete at least 3 workouts to unlock AI coaching features.
          </p>
          <button class="btn btn-primary" onclick="switchTab('workout')">
            <i class="fas fa-play"></i> Start a Workout
          </button>
        </div>
      \`;
      return;
    }
    
    // Store for chat context
    state.aiCoachData = data;
    state.aiChatHistory = state.aiChatHistory || [];
    
    const system = state.user?.measurement_system || 'metric';
    const isImperial = system === 'imperial';
    
    container.innerHTML = \`
      <!-- Header -->
      <div class="card" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; border: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="margin: 0 0 8px 0; color: white;"><i class="fas fa-robot"></i> AI Fitness Coach</h2>
            <p style="margin: 0; opacity: 0.95;">Science-based coaching from \${data.summary.total_workouts} workouts</p>
          </div>
        </div>
      </div>
      
      <!-- AI Chat Interface -->
      <div class="card">
        <h3 style="margin-bottom: 16px;"><i class="fas fa-comments"></i> Ask Your AI Coach</h3>
        <div id="aiChatMessages" style="max-height: 400px; overflow-y: auto; margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i class="fas fa-robot" style="color: white;"></i>
            </div>
            <div style="background: var(--bg-primary); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px; max-width: 85%;">
              <p style="margin: 0; line-height: 1.6;">
                Hi \${data.user.name || 'there'}! I'm your AI fitness coach with access to your complete training history. Ask me anything about:
              </p>
              <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
                <li><strong>Progressive overload</strong> - "Should I increase weight on bench press?"</li>
                <li><strong>Volume optimization</strong> - "Am I training chest enough?"</li>
                <li><strong>Recovery</strong> - "Do I need more rest days?"</li>
                <li><strong>Plateaus</strong> - "Why isn't my squat improving?"</li>
                <li><strong>Program design</strong> - "What should I focus on this week?"</li>
              </ul>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="aiChatInput" placeholder="Ask your AI coach anything..." 
                 style="flex: 1; padding: 14px 16px; border: 2px solid var(--border); border-radius: 8px; font-size: 15px;"
                 onkeypress="if(event.key==='Enter') sendAIChat()">
          <button class="btn btn-primary" onclick="sendAIChat()" style="padding: 14px 24px;">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
          <button class="btn btn-outline" onclick="askQuickQuestion('What should I focus on in my next workout?')" style="font-size: 12px; padding: 8px 12px;">
            <i class="fas fa-dumbbell"></i> Next workout focus
          </button>
          <button class="btn btn-outline" onclick="askQuickQuestion('Analyze my training volume - am I doing enough?')" style="font-size: 12px; padding: 8px 12px;">
            <i class="fas fa-chart-bar"></i> Volume check
          </button>
          <button class="btn btn-outline" onclick="askQuickQuestion('Which exercises should I increase weight on?')" style="font-size: 12px; padding: 8px 12px;">
            <i class="fas fa-arrow-up"></i> Progressive overload
          </button>
          <button class="btn btn-outline" onclick="askQuickQuestion('Are there any muscle imbalances I should address?')" style="font-size: 12px; padding: 8px 12px;">
            <i class="fas fa-balance-scale"></i> Muscle balance
          </button>
        </div>
      </div>
      
      <!-- Plateau Alerts -->
      \${data.plateauExercises && data.plateauExercises.length > 0 ? \`
        <div class="card" style="border-left: 4px solid var(--warning);">
          <h3 style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Plateau Detected</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px;">These exercises haven't progressed in 3+ weeks. Ask your AI coach for strategies to break through!</p>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            \${data.plateauExercises.map(p => \`
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--warning-light); border-radius: 8px;">
                <div>
                  <strong>\${p.exercise_name}</strong>
                  <div style="font-size: 13px; color: var(--text-secondary);">\${p.muscle_group} • Stuck at \${formatWeight(p.current_weight)}</div>
                </div>
                <button class="btn btn-outline" onclick="askQuickQuestion('How do I break through my \${p.exercise_name} plateau? I\\\\'ve been stuck at \${formatWeight(p.current_weight)} for weeks.')" style="font-size: 12px;">
                  <i class="fas fa-lightbulb"></i> Get Tips
                </button>
              </div>
            \`).join('')}
          </div>
        </div>
      \` : ''}
      
      <!-- Saved Conversations -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0;"><i class="fas fa-history"></i> Previous Coaching Sessions</h3>
          <button class="btn btn-outline" onclick="loadSavedConversations()" style="font-size: 12px; padding: 8px 12px;">
            <i class="fas fa-sync"></i> Refresh
          </button>
        </div>
        <div id="savedConversations" style="max-height: 400px; overflow-y: auto;">
          <p style="color: var(--text-secondary); text-align: center; padding: 20px;">Loading saved conversations...</p>
        </div>
      </div>
      
      <!-- Quick Stats for AI Context -->
      <div class="card">
        <h3><i class="fas fa-chart-line"></i> Your Training at a Glance</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">This data powers your AI coach's recommendations</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
          <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--primary);">\${data.summary.workouts_per_week}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">Workouts/Week</div>
          </div>
          <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--secondary);">\${formatWeight(data.summary.total_volume_kg)}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">90-Day Volume</div>
          </div>
          <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--warning);">\${data.summary.avg_workout_duration_minutes}m</div>
            <div style="font-size: 11px; color: var(--text-secondary);">Avg Duration</div>
          </div>
          <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: \${data.summary.avg_perceived_exertion > 7 ? 'var(--danger)' : 'var(--primary)'};">
              \${data.summary.avg_perceived_exertion || '-'}/10
            </div>
            <div style="font-size: 11px; color: var(--text-secondary);">Avg Effort</div>
          </div>
        </div>
      </div>
      
      <!-- Advanced Analytics Section -->
      <div id="advancedAnalyticsSection">
        <div class="card" style="text-align: center; padding: 40px;">
          <i class="fas fa-brain fa-spin" style="font-size: 32px; color: var(--primary); margin-bottom: 12px;"></i>
          <p style="color: var(--text-secondary);">Loading advanced analytics...</p>
        </div>
      </div>
    \`;
    
    // Load saved conversations
    loadSavedConversations();
    
    // Load advanced analytics
    loadAdvancedAnalytics();
    
  } catch (error) {
    console.error('Error loading AI Coach:', error);
    container.innerHTML = \`
      <div class="card">
        <p style="color: var(--danger);">Error loading AI Coach: \${error.message}</p>
        <button class="btn btn-primary" onclick="loadInsights()">
          <i class="fas fa-sync"></i> Retry
        </button>
      </div>
    \`;
  }
}

// Load saved AI coach conversations
async function loadSavedConversations() {
  const container = document.getElementById('savedConversations');
  if (!container) return;
  
  try {
    const result = await api('/ai/coach/history?limit=10');
    const conversations = result.conversations || [];
    
    if (conversations.length === 0) {
      container.innerHTML = \`
        <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
          <i class="fas fa-comment-slash" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
          No saved conversations yet. Ask your AI coach a question to get started!
        </p>
      \`;
      return;
    }
    
    container.innerHTML = conversations.map(conv => \`
      <div style="border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; overflow: hidden;">
        <div style="padding: 12px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 14px;"><i class="fas fa-user"></i> You asked:</strong>
            <span style="font-size: 11px; color: var(--text-secondary);">\${new Date(conv.created_at).toLocaleDateString()} \${new Date(conv.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: var(--text-primary);">\${escapeHtml(conv.user_message)}</p>
        </div>
        <div style="padding: 12px 16px;">
          <strong style="font-size: 14px; color: var(--primary);"><i class="fas fa-robot"></i> AI Coach:</strong>
          <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">\${escapeHtml(conv.ai_response)}</p>
        </div>
      </div>
    \`).join('');
    
  } catch (error) {
    console.error('Error loading saved conversations:', error);
    container.innerHTML = \`
      <p style="color: var(--danger); text-align: center; padding: 20px;">
        Error loading saved conversations. <a href="#" onclick="loadSavedConversations(); return false;">Try again</a>
      </p>
    \`;
  }
}

// Load Advanced Analytics
async function loadAdvancedAnalytics() {
  const container = document.getElementById('advancedAnalyticsSection');
  if (!container) return;
  
  try {
    const data = await api('/analytics/advanced');
    
    // Get color for recovery status
    const recoveryColors = {
      'well_rested': 'var(--secondary)',
      'moderate': 'var(--warning)',
      'fatigued': 'var(--danger)',
      'needs_rest': 'var(--danger)'
    };
    const recoveryColor = recoveryColors[data.recovery?.status] || 'var(--gray)';
    
    // Get color for consistency
    const consistencyColor = data.consistency?.consistency >= 70 ? 'var(--secondary)' : 
                             data.consistency?.consistency >= 40 ? 'var(--warning)' : 'var(--danger)';
    
    // Get trend icon
    const trendIcons = {
      'increasing': '<i class="fas fa-arrow-up" style="color: var(--secondary);"></i>',
      'decreasing': '<i class="fas fa-arrow-down" style="color: var(--danger);"></i>',
      'stable': '<i class="fas fa-minus" style="color: var(--warning);"></i>'
    };
    
    container.innerHTML = \`
      <!-- Advanced Analytics Header -->
      <div class="card" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; border: none;">
        <h2 style="margin: 0; color: white;"><i class="fas fa-brain"></i> Advanced Analytics</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">ML-powered predictions and insights based on \${data.summary?.total_workouts_analyzed || 0} workouts</p>
      </div>
      
      <!-- Key Metrics Row -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
        <!-- Recovery Score -->
        <div class="card" style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: \${recoveryColor}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <span style="font-size: 28px; font-weight: bold; color: \${recoveryColor};">\${data.recovery?.score || 0}</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">Recovery Score</div>
          <div style="font-size: 13px; color: var(--text-secondary); text-transform: capitalize;">\${(data.recovery?.status || 'unknown').replace('_', ' ')}</div>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">\${data.recovery?.recommendation || ''}</p>
        </div>
        
        <!-- Consistency Score -->
        <div class="card" style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: \${consistencyColor}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <span style="font-size: 28px; font-weight: bold; color: \${consistencyColor};">\${data.consistency?.consistency || 0}%</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">Consistency</div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            <i class="fas fa-fire" style="color: var(--warning);"></i> \${data.consistency?.currentStreak || 0} workout streak
          </div>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">Best day: \${data.consistency?.bestDay || 'N/A'}</p>
        </div>
        
        <!-- Muscle Balance -->
        <div class="card" style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: \${data.muscle_balance?.balance >= 70 ? 'var(--secondary)' : 'var(--warning)'}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <span style="font-size: 28px; font-weight: bold; color: \${data.muscle_balance?.balance >= 70 ? 'var(--secondary)' : 'var(--warning)'};">\${data.muscle_balance?.balance || 0}%</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">Muscle Balance</div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            \${data.muscle_balance?.imbalances?.length || 0} imbalances detected
          </div>
        </div>
        
        <!-- Volume Trend -->
        <div class="card" style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--primary)20; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            \${trendIcons[data.volume_predictions?.trend] || trendIcons['stable']}
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">Volume Trend</div>
          <div style="font-size: 13px; color: var(--text-secondary); text-transform: capitalize;">\${data.volume_predictions?.trend || 'stable'}</div>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">\${data.volume_predictions?.confidence || 0}% confidence</p>
        </div>
      </div>
      
      <!-- AI Insights -->
      \${data.ai_insights?.insights?.length > 0 ? \`
        <div class="card">
          <h3><i class="fas fa-lightbulb" style="color: var(--warning);"></i> AI-Powered Insights</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">\${data.ai_insights?.overall_assessment || ''}</p>
          <div style="display: grid; gap: 12px;">
            \${data.ai_insights.insights.map(insight => \`
              <div style="padding: 16px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid \${insight.priority === 'high' ? 'var(--danger)' : insight.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                  <strong>\${insight.title}</strong>
                  <span style="font-size: 11px; padding: 2px 8px; background: \${insight.priority === 'high' ? 'var(--danger)' : insight.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'}; color: white; border-radius: 12px; text-transform: uppercase;">\${insight.priority}</span>
                </div>
                <p style="font-size: 14px; color: var(--text-secondary); margin: 0 0 8px 0;">\${insight.insight}</p>
                <p style="font-size: 13px; color: var(--primary); margin: 0;"><i class="fas fa-check-circle"></i> \${insight.action}</p>
              </div>
            \`).join('')}
          </div>
        </div>
      \` : ''}
      
      <!-- Strength Predictions -->
      \${data.strength_predictions?.length > 0 ? \`
        <div class="card">
          <h3><i class="fas fa-chart-line" style="color: var(--primary);"></i> Strength Predictions</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">Predicted 1RM in 4 weeks based on your progression rate</p>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: var(--bg-secondary);">
                  <th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--border);">Exercise</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 2px solid var(--border);">Current</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 2px solid var(--border);">Predicted</th>
                  <th style="text-align: center; padding: 12px; border-bottom: 2px solid var(--border);">Trend</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 2px solid var(--border);">Confidence</th>
                </tr>
              </thead>
              <tbody>
                \${data.strength_predictions.slice(0, 8).map(pred => \`
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border);">
                      <strong>\${pred.exercise_name}</strong>
                      <div style="font-size: 11px; color: var(--text-secondary);">\${pred.data_points} data points</div>
                    </td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid var(--border);">\${formatWeight(pred.current_max)}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid var(--border); font-weight: bold; color: var(--primary);">\${formatWeight(pred.predicted_max_4_weeks)}</td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid var(--border);">
                      \${pred.trend === 'increasing' ? '<i class="fas fa-arrow-up" style="color: var(--secondary);"></i>' : pred.trend === 'decreasing' ? '<i class="fas fa-arrow-down" style="color: var(--danger);"></i>' : '<i class="fas fa-minus" style="color: var(--warning);"></i>'}
                    </td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid var(--border);">
                      <span style="padding: 2px 8px; background: \${pred.confidence >= 70 ? 'var(--secondary)' : pred.confidence >= 40 ? 'var(--warning)' : 'var(--gray)'}; color: white; border-radius: 12px; font-size: 11px;">\${pred.confidence}%</span>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \` : ''}
      
      <!-- Volume Predictions -->
      \${data.volume_predictions?.predictions?.length > 0 ? \`
        <div class="card">
          <h3><i class="fas fa-weight" style="color: var(--secondary);"></i> Volume Forecast</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">\${data.volume_predictions?.recommendation || ''}</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            \${data.volume_predictions.predictions.map((pred, idx) => \`
              <div style="flex: 1; min-width: 100px; text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">\${pred.week}</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--primary);">\${formatWeight(pred.predicted_volume)}</div>
              </div>
            \`).join('')}
          </div>
          <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px;">Current Weekly Volume</span>
            <strong>\${formatWeight(data.volume_predictions?.current_weekly_volume || 0)}</strong>
          </div>
        </div>
      \` : ''}
      
      <!-- Muscle Balance Details -->
      \${data.muscle_balance?.imbalances?.length > 0 ? \`
        <div class="card">
          <h3><i class="fas fa-balance-scale" style="color: var(--warning);"></i> Muscle Imbalances</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">Areas that need attention based on your training volume distribution</p>
          <div style="display: grid; gap: 8px;">
            \${data.muscle_balance.imbalances.map(imb => \`
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: \${imb.status === 'undertrained' ? 'var(--warning)' : 'var(--danger)'}15; border-radius: 8px; border-left: 4px solid \${imb.status === 'undertrained' ? 'var(--warning)' : 'var(--danger)'};">
                <div>
                  <strong>\${imb.muscle}</strong>
                  <span style="font-size: 12px; color: var(--text-secondary); margin-left: 8px; text-transform: capitalize;">\${imb.status}</span>
                </div>
                <span style="font-size: 13px; color: \${imb.deviation < 0 ? 'var(--danger)' : 'var(--warning)'};">\${imb.deviation > 0 ? '+' : ''}\${imb.deviation}%</span>
              </div>
            \`).join('')}
          </div>
          \${data.muscle_balance.recommendations?.length > 0 ? \`
            <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
              <strong style="font-size: 13px;"><i class="fas fa-lightbulb"></i> Recommendations:</strong>
              <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: var(--text-secondary);">
                \${data.muscle_balance.recommendations.map(rec => \`<li>\${rec}</li>\`).join('')}
              </ul>
            </div>
          \` : ''}
        </div>
      \` : ''}
      
      <!-- Training Pattern -->
      \${data.consistency?.dayDistribution ? \`
        <div class="card">
          <h3><i class="fas fa-calendar-alt" style="color: var(--primary);"></i> Training Pattern</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">Your workout distribution by day of the week</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            \${Object.entries(data.consistency.dayDistribution).map(([day, count]) => {
              const maxCount = Math.max(...Object.values(data.consistency.dayDistribution));
              const intensity = maxCount > 0 ? count / maxCount : 0;
              return \`
                <div style="flex: 1; min-width: 60px; text-align: center; padding: 12px 8px; background: rgba(79, 70, 229, \${0.1 + intensity * 0.5}); border-radius: 8px;">
                  <div style="font-size: 11px; color: var(--text-secondary);">\${day.substring(0, 3)}</div>
                  <div style="font-size: 18px; font-weight: bold; color: var(--primary);">\${count}</div>
                </div>
              \`;
            }).join('')}
          </div>
          <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
            <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
              <div style="font-size: 12px; color: var(--text-secondary);">Average Gap</div>
              <div style="font-size: 18px; font-weight: bold;">\${data.consistency?.averageGap || 0} days</div>
            </div>
            <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
              <div style="font-size: 12px; color: var(--text-secondary);">Longest Streak</div>
              <div style="font-size: 18px; font-weight: bold;">\${data.consistency?.longestStreak || 0} workouts</div>
            </div>
            <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
              <div style="font-size: 12px; color: var(--text-secondary);">Training Age</div>
              <div style="font-size: 18px; font-weight: bold;">\${data.summary?.training_age_days || 0} days</div>
            </div>
          </div>
        </div>
      \` : ''}
    \`;
    
  } catch (error) {
    console.error('Error loading advanced analytics:', error);
    container.innerHTML = \`
      <div class="card">
        <p style="color: var(--danger);">Error loading advanced analytics: \${error.message}</p>
        <button class="btn btn-outline" onclick="loadAdvancedAnalytics()">
          <i class="fas fa-sync"></i> Retry
        </button>
      </div>
    \`;
  }
}

// Generate AI recommendations
async function generateRecommendations() {
  try {
    showNotification('Analyzing your training data...', 'info');
    await api('/ai/recommendations/generate', { method: 'POST' });
    showNotification('Recommendations generated!', 'success');
    loadInsights();
  } catch (error) {
    showNotification('Error generating recommendations: ' + error.message, 'error');
  }
}

// Apply a recommendation automatically
async function applyRecommendation(recId) {
  if (!confirm('This will automatically modify your training program based on this recommendation. Continue?')) return;
  
  try {
    await api(\`/ai/recommendations/\${recId}/apply\`, { method: 'POST' });
    showNotification('Recommendation applied! Your program has been updated.', 'success');
    loadInsights();
    loadPrograms(); // Refresh programs to show changes
  } catch (error) {
    showNotification('Error applying recommendation: ' + error.message, 'error');
  }
}

// Dismiss a recommendation
async function dismissRecommendation(recId) {
  try {
    await api(\`/ai/recommendations/\${recId}/dismiss\`, { method: 'POST' });
    showNotification('Recommendation dismissed', 'success');
    loadInsights();
  } catch (error) {
    showNotification('Error dismissing recommendation: ' + error.message, 'error');
  }
}

// View recommendation details in modal
async function viewRecommendationDetails(recId) {
  try {
    const data = await api(\`/ai/recommendations/\${recId}\`);
    const rec = data.recommendation;
    
    showModal(\`
      <h2>\${rec.title}</h2>
      <div style="margin: 20px 0;">
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <span style="background: \${rec.priority === 'high' ? 'var(--danger)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'}; color: white; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            \${rec.priority.toUpperCase()} PRIORITY
          </span>
          <span style="background: var(--light); color: var(--dark); padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            \${rec.category}
          </span>
        </div>
        <p style="line-height: 1.8; margin-bottom: 16px;">\${rec.description}</p>
        \${rec.reasoning ? \`
          <div style="background: var(--light); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 8px;"><i class="fas fa-brain"></i> AI Analysis:</strong>
            <p style="margin: 0; line-height: 1.6;">\${rec.reasoning}</p>
          </div>
        \` : ''}
        \${rec.action_items && rec.action_items.length > 0 ? \`
          <div style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 8px;"><i class="fas fa-tasks"></i> Action Items:</strong>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
              \${rec.action_items.map(item => \`<li>\${item}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}
        \${rec.expected_outcome ? \`
          <div style="background: var(--secondary-light); padding: 16px; border-radius: 8px;">
            <strong style="display: block; margin-bottom: 8px; color: var(--secondary);"><i class="fas fa-target"></i> Expected Outcome:</strong>
            <p style="margin: 0; line-height: 1.6;">\${rec.expected_outcome}</p>
          </div>
        \` : ''}
      </div>
      <div style="display: flex; gap: 12px;">
        \${rec.auto_apply ? \`
          <button class="btn btn-primary" onclick="closeModal(); applyRecommendation(\${recId});" style="flex: 1;">
            <i class="fas fa-magic"></i> Apply Now
          </button>
        \` : ''}
        <button class="btn btn-outline" onclick="closeModal();" style="flex: 1;">
          Close
        </button>
      </div>
    \`);
  } catch (error) {
    showNotification('Error loading recommendation details: ' + error.message, 'error');
  }
}

// Toggle auto-apply recommendations
async function toggleAutoApply(enabled) {
  try {
    await api('/ai/recommendations/settings', {
      method: 'PATCH',
      body: JSON.stringify({ auto_apply: enabled })
    });
    showNotification(\`Auto-apply \${enabled ? 'enabled' : 'disabled'}\`, 'success');
  } catch (error) {
    showNotification('Error updating settings: ' + error.message, 'error');
  }
}

// Toggle weekly analysis
async function toggleWeeklyAnalysis(enabled) {
  try {
    await api('/ai/recommendations/settings', {
      method: 'PATCH',
      body: JSON.stringify({ weekly_analysis: enabled })
    });
    showNotification(\`Weekly analysis \${enabled ? 'enabled' : 'disabled'}\`, 'success');
  } catch (error) {
    showNotification('Error updating settings: ' + error.message, 'error');
  }
}

// Toggle real-time suggestions
async function toggleRealtimeSuggestions(enabled) {
  try {
    await api('/ai/recommendations/settings', {
      method: 'PATCH',
      body: JSON.stringify({ realtime_suggestions: enabled })
    });
    showNotification(\`Real-time suggestions \${enabled ? 'enabled' : 'disabled'}\`, 'success');
  } catch (error) {
    showNotification('Error updating settings: ' + error.message, 'error');
  }
}

// ========== AI COACH FUNCTIONS ==========

// Send message to AI Coach chat
async function sendAIChat() {
  const input = document.getElementById('aiChatInput');
  const messagesContainer = document.getElementById('aiChatMessages');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Clear input
  input.value = '';
  
  // Add user message to chat
  messagesContainer.innerHTML += \`
    <div style="display: flex; gap: 12px; margin-bottom: 12px; justify-content: flex-end;">
      <div style="background: var(--primary); color: white; padding: 12px 16px; border-radius: 12px; border-top-right-radius: 4px; max-width: 85%;">
        <p style="margin: 0; line-height: 1.6;">\${escapeHtml(message)}</p>
      </div>
      <div style="width: 36px; height: 36px; background: var(--secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fas fa-user" style="color: white;"></i>
      </div>
    </div>
  \`;
  
  // Add loading indicator
  const loadingId = 'ai-loading-' + Date.now();
  messagesContainer.innerHTML += \`
    <div id="\${loadingId}" style="display: flex; gap: 12px; margin-bottom: 12px;">
      <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fas fa-robot" style="color: white;"></i>
      </div>
      <div style="background: var(--bg-primary); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px;">
        <i class="fas fa-circle-notch fa-spin"></i> Thinking...
      </div>
    </div>
  \`;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  try {
    // Build conversation history for context
    const history = (state.aiChatHistory || []).slice(-6).map(h => ({
      role: h.role,
      content: h.content
    }));
    
    const response = await api('/ai/coach/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    });
    
    // Remove loading indicator
    document.getElementById(loadingId)?.remove();
    
    if (response.success && response.response) {
      // Store in history
      state.aiChatHistory = state.aiChatHistory || [];
      state.aiChatHistory.push({ role: 'user', content: message });
      state.aiChatHistory.push({ role: 'assistant', content: response.response });
      
      // Add AI response
      messagesContainer.innerHTML += \`
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas fa-robot" style="color: white;"></i>
          </div>
          <div style="background: var(--bg-primary); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px; max-width: 85%;">
            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">\${escapeHtml(response.response)}</p>
          </div>
        </div>
      \`;
    } else {
      messagesContainer.innerHTML += \`
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <div style="width: 36px; height: 36px; background: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas fa-exclamation" style="color: white;"></i>
          </div>
          <div style="background: var(--danger-light); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px;">
            <p style="margin: 0; color: var(--danger);">Sorry, I couldn't process that request. Please try again.</p>
          </div>
        </div>
      \`;
    }
  } catch (error) {
    document.getElementById(loadingId)?.remove();
    messagesContainer.innerHTML += \`
      <div style="display: flex; gap: 12px; margin-bottom: 12px;">
        <div style="width: 36px; height: 36px; background: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fas fa-exclamation" style="color: white;"></i>
        </div>
        <div style="background: var(--danger-light); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px;">
          <p style="margin: 0; color: var(--danger);">Error: \${error.message}</p>
        </div>
      </div>
    \`;
  }
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Quick question helper - fills input and sends
function askQuickQuestion(question) {
  const input = document.getElementById('aiChatInput');
  if (input) {
    input.value = question;
    sendAIChat();
  }
}

// Generate comprehensive AI coaching analysis
async function generateAICoaching() {
  const resultsContainer = document.getElementById('aiAnalysisResults');
  
  resultsContainer.innerHTML = \`
    <div class="card" style="text-align: center; padding: 40px;">
      <i class="fas fa-brain fa-spin" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
      <h3>Generating Personalized Analysis...</h3>
      <p style="color: var(--text-secondary);">Your AI Coach is analyzing your training patterns, progression, and recovery</p>
    </div>
  \`;
  
  try {
    const response = await api('/ai/coach/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'comprehensive' })
    });
    
    if (!response.success) {
      resultsContainer.innerHTML = \`
        <div class="card" style="border-left: 4px solid var(--warning);">
          <h3><i class="fas fa-info-circle"></i> \${response.message || 'Unable to generate analysis'}</h3>
          <p style="color: var(--text-secondary);">Complete more workouts to receive detailed AI coaching.</p>
        </div>
      \`;
      return;
    }
    
    const analysis = response.analysis;
    
    if (!analysis) {
      resultsContainer.innerHTML = \`
        <div class="card">
          <h3><i class="fas fa-robot"></i> AI Response</h3>
          <p style="white-space: pre-wrap; line-height: 1.8;">\${response.raw_response || 'No analysis available'}</p>
        </div>
      \`;
      return;
    }
    
    resultsContainer.innerHTML = \`
      <!-- Overall Assessment -->
      <div class="card" style="border-left: 4px solid var(--primary);">
        <h3><i class="fas fa-clipboard-check"></i> Overall Assessment</h3>
        <p style="font-size: 16px; line-height: 1.8; margin-top: 12px;">\${analysis.overall_assessment || 'Analysis complete.'}</p>
      </div>
      
      <!-- Strengths & Areas for Improvement -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
        \${analysis.strengths && analysis.strengths.length > 0 ? \`
          <div class="card" style="border-left: 4px solid var(--secondary);">
            <h3 style="color: var(--secondary);"><i class="fas fa-thumbs-up"></i> Strengths</h3>
            <ul style="margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
              \${analysis.strengths.map(s => \`<li>\${s}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}
        \${analysis.areas_for_improvement && analysis.areas_for_improvement.length > 0 ? \`
          <div class="card" style="border-left: 4px solid var(--warning);">
            <h3 style="color: var(--warning);"><i class="fas fa-arrow-up"></i> Areas to Improve</h3>
            <ul style="margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
              \${analysis.areas_for_improvement.map(a => \`<li>\${a}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}
      </div>
      
      <!-- Recommendations -->
      \${analysis.recommendations && analysis.recommendations.length > 0 ? \`
        <div class="card">
          <h3><i class="fas fa-lightbulb"></i> Personalized Recommendations</h3>
          <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px;">
            \${analysis.recommendations.map(rec => \`
              <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; border-left: 4px solid \${
                rec.priority === 'high' ? 'var(--danger)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'
              };">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <strong style="font-size: 16px;">\${rec.title}</strong>
                  <div style="display: flex; gap: 8px;">
                    <span style="background: var(--primary-light); color: var(--primary); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                      \${rec.category || 'general'}
                    </span>
                    <span style="background: \${rec.priority === 'high' ? 'var(--danger)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'}; 
                                 color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                      \${rec.priority || 'medium'}
                    </span>
                  </div>
                </div>
                <p style="margin: 0 0 12px 0; line-height: 1.7;">\${rec.description}</p>
                \${rec.action_steps && rec.action_steps.length > 0 ? \`
                  <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <strong style="font-size: 13px; display: block; margin-bottom: 8px;"><i class="fas fa-tasks"></i> Action Steps:</strong>
                    <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
                      \${rec.action_steps.map(step => \`<li>\${step}</li>\`).join('')}
                    </ol>
                  </div>
                \` : ''}
                \${rec.expected_outcome ? \`
                  <p style="margin: 0; font-size: 13px; color: var(--secondary);"><i class="fas fa-bullseye"></i> <strong>Expected:</strong> \${rec.expected_outcome}</p>
                \` : ''}
                \${rec.timeframe ? \`
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary);"><i class="fas fa-clock"></i> \${rec.timeframe}</p>
                \` : ''}
              </div>
            \`).join('')}
          </div>
        </div>
      \` : ''}
      
      <!-- Quick Tips -->
      \${analysis.next_workout_tips && analysis.next_workout_tips.length > 0 ? \`
        <div class="card" style="background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%); border: none;">
          <h3><i class="fas fa-bolt"></i> Tips for Your Next Workout</h3>
          <ul style="margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
            \${analysis.next_workout_tips.map(tip => \`<li>\${tip}</li>\`).join('')}
          </ul>
        </div>
      \` : ''}
      
      \${analysis.weekly_focus ? \`
        <div class="card" style="text-align: center; padding: 24px; background: var(--primary); color: white; border: none;">
          <h3 style="color: white; margin-bottom: 8px;"><i class="fas fa-crosshairs"></i> This Week's Focus</h3>
          <p style="margin: 0; font-size: 18px; opacity: 0.95;">\${analysis.weekly_focus}</p>
        </div>
      \` : ''}
    \`;
    
  } catch (error) {
    console.error('Error generating AI coaching:', error);
    resultsContainer.innerHTML = \`
      <div class="card" style="border-left: 4px solid var(--danger);">
        <h3 style="color: var(--danger);"><i class="fas fa-exclamation-circle"></i> Error</h3>
        <p>Failed to generate AI analysis: \${error.message}</p>
        <button class="btn btn-primary" onclick="generateAICoaching()" style="margin-top: 12px;">
          <i class="fas fa-sync"></i> Try Again
        </button>
      </div>
    \`;
  }
}

// Get exercise-specific coaching tips
async function getExerciseCoaching(exerciseId, exerciseName) {
  showModal(\`
    <div style="text-align: center; padding: 40px;">
      <i class="fas fa-dumbbell fa-spin" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
      <h3>Analyzing \${exerciseName}...</h3>
      <p style="color: var(--text-secondary);">Getting personalized coaching tips</p>
    </div>
  \`);
  
  try {
    const response = await api(\`/ai/coach/exercise/\${exerciseId}\`);
    
    if (!response.success) {
      showModal(\`
        <h2><i class="fas fa-dumbbell"></i> \${exerciseName}</h2>
        <div style="margin-top: 20px;">
          <p style="color: var(--text-secondary);">\${response.message || 'Need more workout data for this exercise to provide coaching tips.'}</p>
        </div>
        <button class="btn btn-outline" onclick="closeModal()" style="margin-top: 20px;">Close</button>
      \`);
      return;
    }
    
    const coaching = response.coaching;
    
    showModal(\`
      <h2><i class="fas fa-dumbbell"></i> \${response.exercise?.name || exerciseName}</h2>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">\${response.exercise?.muscle_group || ''}</p>
      
      \${coaching ? \`
        <!-- Progress Assessment -->
        \${coaching.progress_assessment ? \`
          <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong><i class="fas fa-chart-line"></i> Progress Assessment</strong>
            <p style="margin: 8px 0 0 0; line-height: 1.6;">\${coaching.progress_assessment}</p>
          </div>
        \` : ''}
        
        <!-- Next Session Recommendation -->
        \${coaching.next_session_recommendation ? \`
          <div style="background: var(--primary-light); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="color: var(--primary);"><i class="fas fa-bullseye"></i> Next Session Target</strong>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; text-align: center;">
              <div>
                <div style="font-size: 24px; font-weight: bold; color: var(--primary);">\${formatWeight(coaching.next_session_recommendation.weight_kg)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Weight</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold; color: var(--primary);">\${coaching.next_session_recommendation.sets || 3}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Sets</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold; color: var(--primary);">\${coaching.next_session_recommendation.reps || '8-10'}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Reps</div>
              </div>
            </div>
            \${coaching.next_session_recommendation.notes ? \`
              <p style="margin: 12px 0 0 0; font-size: 13px; color: var(--text-secondary);"><i class="fas fa-info-circle"></i> \${coaching.next_session_recommendation.notes}</p>
            \` : ''}
          </div>
        \` : ''}
        
        <!-- Technique Tips -->
        \${coaching.technique_tips && coaching.technique_tips.length > 0 ? \`
          <div style="margin-bottom: 16px;">
            <strong><i class="fas fa-clipboard-list"></i> Technique Tips</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
              \${coaching.technique_tips.map(tip => \`<li>\${tip}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}
        
        <!-- Common Mistakes -->
        \${coaching.common_mistakes_to_avoid && coaching.common_mistakes_to_avoid.length > 0 ? \`
          <div style="background: var(--danger-light); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Mistakes to Avoid</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
              \${coaching.common_mistakes_to_avoid.map(m => \`<li>\${m}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}
        
        <!-- Progression Plan -->
        \${coaching.progression_plan ? \`
          <div style="margin-bottom: 16px;">
            <strong><i class="fas fa-calendar-alt"></i> 4-Week Progression Plan</strong>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px;">
              \${Object.entries(coaching.progression_plan).map(([week, target]) => \`
                <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px; text-align: center;">
                  <div style="font-size: 12px; color: var(--text-secondary); text-transform: capitalize;">\${week.replace('_', ' ')}</div>
                  <div style="font-weight: 600; margin-top: 4px;">\${target}</div>
                </div>
              \`).join('')}
            </div>
          </div>
        \` : ''}
      \` : \`
        <p style="white-space: pre-wrap; line-height: 1.8;">\${response.raw_response || 'No coaching data available'}</p>
      \`}
      
      <button class="btn btn-primary" onclick="closeModal()" style="width: 100%; margin-top: 16px;">
        Got It
      </button>
    \`);
    
  } catch (error) {
    showModal(\`
      <h2><i class="fas fa-exclamation-circle" style="color: var(--danger);"></i> Error</h2>
      <p style="margin: 20px 0;">Failed to get coaching tips: \${error.message}</p>
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    \`);
  }
}

// Helper function to escape HTML in chat messages
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Achievements
async function loadAchievements() {
  const container = document.getElementById('achievements');
  
  try {
    const [achievementsData, prsData, streakData] = await Promise.all([
      api('/achievements'),
      api('/achievements/prs?limit=10'),
      api('/achievements/streak')
    ]);
    
    const { earned, stats } = achievementsData;
    const { prs } = prsData;
    const { streak } = streakData;
    
    // Group achievements by category
    const achievementsByCategory = {};
    earned.forEach(ach => {
      if (!achievementsByCategory[ach.category]) {
        achievementsByCategory[ach.category] = [];
      }
      achievementsByCategory[ach.category].push(ach);
    });
    
    // Calculate streak weeks
    const currentWeeks = Math.floor(streak.current_streak / 7);
    const longestWeeks = Math.floor(streak.longest_streak / 7);
    
    container.innerHTML = \`
      <div class="card">
        <h2><i class="fas fa-trophy"></i> Achievements & Challenges</h2>
        
        <!-- Stats Overview -->
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 30px;">
          <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <div class="stat-icon" style="font-size: 32px;">🔥</div>
            <div class="stat-value" style="font-size: 36px;">\${currentWeeks}</div>
            <div class="stat-label">Week Streak</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Best: \${longestWeeks} weeks</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
            <div class="stat-icon" style="font-size: 32px;">💪</div>
            <div class="stat-value" style="font-size: 36px;">\${stats.totalWorkouts}</div>
            <div class="stat-label">Total Workouts</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
            <div class="stat-icon" style="font-size: 32px;">📈</div>
            <div class="stat-value" style="font-size: 36px;">\${stats.totalPRs}</div>
            <div class="stat-label">Personal Records</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white;">
            <div class="stat-icon" style="font-size: 32px;">🏆</div>
            <div class="stat-value" style="font-size: 36px;">\${earned.length}</div>
            <div class="stat-label">Achievements Earned</div>
          </div>
        </div>
        
        <!-- Recent Personal Records -->
        \${prs.length > 0 ? \`
        <div style="margin-bottom: 30px;">
          <h3><i class="fas fa-medal"></i> Recent Personal Records</h3>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Type</th>
                  <th>Record</th>
                  <th>Previous</th>
                  <th>Improvement</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                \${prs.map(pr => {
                  const improvement = pr.previous_value ? 
                    \`+\${((pr.record_value - pr.previous_value) / pr.previous_value * 100).toFixed(1)}%\` : 
                    'First PR!';
                  const improvementColor = pr.previous_value ? '#4CAF50' : '#2196F3';
                  return \`
                    <tr>
                      <td><strong>\${pr.exercise_name}</strong></td>
                      <td><span class="badge">\${pr.record_type.toUpperCase()}</span></td>
                      <td><strong style="color: var(--secondary);">\${formatWeight(pr.record_value)}</strong></td>
                      <td>\${pr.previous_value ? formatWeight(pr.previous_value) : '-'}</td>
                      <td><span style="color: \${improvementColor}; font-weight: bold;">\${improvement}</span></td>
                      <td>\${new Date(pr.achieved_at).toLocaleDateString()}</td>
                    </tr>
                  \`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        \` : '<p style="margin: 20px 0;">No personal records yet. Keep pushing!</p>'}
        
        <!-- Earned Achievements -->
        <div style="margin-bottom: 30px;">
          <h3><i class="fas fa-award"></i> Earned Achievements</h3>
          \${Object.keys(achievementsByCategory).length > 0 ? Object.entries(achievementsByCategory).map(([category, achievements]) => \`
            <div style="margin-bottom: 24px;">
              <h4 style="text-transform: capitalize; color: var(--primary); margin-bottom: 12px;">
                \${category === 'consistency' ? '🔥' : category === 'strength' ? '💪' : category === 'volume' ? '📊' : '⭐'} 
                \${category}
              </h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
                \${achievements.map(ach => {
                  const tierColors = {
                    bronze: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)',
                    silver: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
                    gold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    platinum: 'linear-gradient(135deg, #E5E4E2 0%, #71797E 100%)'
                  };
                  return \`
                    <div style="background: \${tierColors[ach.tier]}; padding: 16px; border-radius: 12px; color: white;">
                      <div style="font-size: 48px; margin-bottom: 8px;">\${ach.icon}</div>
                      <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">\${ach.name}</div>
                      <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">\${ach.description}</div>
                      <div style="font-size: 12px; opacity: 0.8;">
                        <i class="fas fa-calendar"></i> \${new Date(ach.earned_at).toLocaleDateString()}
                      </div>
                    </div>
                  \`;
                }).join('')}
              </div>
            </div>
          \`).join('') : '<p>No achievements earned yet. Complete workouts to unlock achievements!</p>'}
        </div>
        
        \${streak.current_streak > 0 ? \`
        <!-- Streak Calendar -->
        <div>
          <h3><i class="fas fa-fire"></i> Workout Streak</h3>
          <div style="background: var(--light); padding: 20px; border-radius: 12px; border-left: 4px solid var(--secondary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <div style="font-size: 14px; color: var(--gray);">Current Streak</div>
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">\${currentWeeks} \${currentWeeks === 1 ? 'Week' : 'Weeks'}</div>
              </div>
              <div>
                <div style="font-size: 14px; color: var(--gray);">Longest Streak</div>
                <div style="font-size: 32px; font-weight: bold; color: var(--secondary);">\${longestWeeks} \${longestWeeks === 1 ? 'Week' : 'Weeks'}</div>
              </div>
              <div>
                <div style="font-size: 14px; color: var(--gray);">Since</div>
                <div style="font-size: 16px; font-weight: bold;">\${new Date(streak.streak_start_date).toLocaleDateString()}</div>
              </div>
            </div>
            \${streak.last_workout_date ? \`
              <div style="font-size: 14px; color: var(--gray);">
                Last workout: \${new Date(streak.last_workout_date).toLocaleDateString()}
              </div>
            \` : ''}
          </div>
        </div>
        \` : ''}
      </div>
    \`;
  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading achievements: \${error.message}</p></div>\`;
  }
}

// Nutrition
async function loadNutrition() {
  const container = document.getElementById('nutrition');
  
  try {
    const [daily, analytics, streaks] = await Promise.all([
      api('/nutrition/daily'),
      api('/nutrition/analytics?days=30'),
      api('/nutrition/streaks')
    ]);
    
    const { summary, weekly_trends, daily_data } = analytics;
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = \`
      <div class="card">
        <h2><i class="fas fa-apple-alt"></i> Today's Nutrition</h2>
        <div class="stats-grid">
          <div class="stat-card" style="background: var(--secondary);">
            <div class="stat-label">Protein</div>
            <div class="stat-value">\${Math.round(daily.protein_grams)}g</div>
            <div class="stat-label">Goal: \${Math.round(daily.protein_goal)}g (\${Math.round(daily.protein_percentage)}%)</div>
          </div>
          <div class="stat-card" style="background: var(--primary);">
            <div class="stat-label">Water</div>
            <div class="stat-value">\${Math.round(daily.water_ml)}ml</div>
            <div class="stat-label">Goal: \${Math.round(daily.water_goal)}ml (\${Math.round(daily.water_percentage)}%)</div>
          </div>
          <div class="stat-card" style="background: #8b5cf6;">
            <div class="stat-label">Creatine</div>
            <div class="stat-value">\${Math.round(daily.creatine_grams)}g</div>
            <div class="stat-label">Goal: \${Math.round(daily.creatine_goal)}g (\${Math.round(daily.creatine_percentage)}%)</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2><i class="fas fa-plus-circle"></i> Log Nutrition</h2>
        <div style="display: grid; gap: 16px;">
          <div class="form-group">
            <label>Protein (grams):</label>
            <div style="display: flex; gap: 8px;">
              <input type="number" id="proteinInput" placeholder="Amount" style="flex: 1;">
              <button class="btn btn-secondary" onclick="logProtein()">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Water (ml):</label>
            <div style="display: flex; gap: 8px;">
              <input type="number" id="waterInput" placeholder="Amount" step="100" style="flex: 1;">
              <button class="btn btn-secondary" onclick="logWater()">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="btn btn-outline" onclick="logWater(250)">250ml</button>
              <button class="btn btn-outline" onclick="logWater(500)">500ml</button>
              <button class="btn btn-outline" onclick="logWater(1000)">1L</button>
            </div>
          </div>

          <div class="form-group">
            <label>Creatine (grams):</label>
            <div style="display: flex; gap: 8px;">
              <input type="number" id="creatineInput" placeholder="Amount" step="0.5" style="flex: 1;">
              <button class="btn btn-secondary" onclick="logCreatine()">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="btn btn-outline" onclick="logCreatine(5)">5g (Standard)</button>
            </div>
            <div style="font-size: 12px; color: var(--gray); margin-top: 8px;">
              <i class="fas fa-info-circle"></i> Recommended: 5g daily for maintenance. Take with carbs post-workout for optimal absorption.
            </div>
          </div>
        </div>
      </div>

      <!-- Today's Entries -->
      <div class="card" id="nutrition-entries-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h2><i class="fas fa-list"></i> Today's Entries</h2>
          <button class="btn btn-outline" onclick="loadNutritionEntries()" style="padding: 6px 12px; font-size: 12px;">
            <i class="fas fa-sync"></i> Refresh
          </button>
        </div>
        <div id="nutrition-entries-table">
          <div style="text-align: center; padding: 20px; color: var(--gray);">
            <i class="fas fa-spinner fa-spin"></i> Loading entries...
          </div>
        </div>
      </div>

      <!-- Nutrition Analytics & Trends -->
      <div class="card">
        <h2><i class="fas fa-chart-line"></i> Nutrition Analytics (30 Days)</h2>
        
        <!-- Streak Cards -->
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 24px;">
          <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <div class="stat-icon" style="font-size: 24px;">🔥</div>
            <div class="stat-value" style="font-size: 28px;">\${streaks.streaks.all.current}</div>
            <div class="stat-label">Current Streak</div>
            <div style="font-size: 12px; opacity: 0.9;">Best: \${streaks.streaks.all.longest} days</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
            <div class="stat-icon" style="font-size: 24px;">🥩</div>
            <div class="stat-value" style="font-size: 28px;">\${streaks.streaks.protein.current}</div>
            <div class="stat-label">Protein Streak</div>
            <div style="font-size: 12px; opacity: 0.9;">Best: \${streaks.streaks.protein.longest} days</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
            <div class="stat-icon" style="font-size: 24px;">💧</div>
            <div class="stat-value" style="font-size: 28px;">\${streaks.streaks.water.current}</div>
            <div class="stat-label">Water Streak</div>
            <div style="font-size: 12px; opacity: 0.9;">Best: \${streaks.streaks.water.longest} days</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white;">
            <div class="stat-icon" style="font-size: 24px;">⚡</div>
            <div class="stat-value" style="font-size: 28px;">\${streaks.streaks.creatine.current}</div>
            <div class="stat-label">Creatine Streak</div>
            <div style="font-size: 12px; opacity: 0.9;">Best: \${streaks.streaks.creatine.longest} days</div>
          </div>
        </div>

        <!-- Summary Stats -->
        <div style="background: var(--light); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
          <h3 style="margin-bottom: 16px;"><i class="fas fa-chart-bar"></i> 30-Day Summary</h3>
          <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Days Logged</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--primary);">\${summary.total_days_logged}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Avg Protein</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--secondary);">\${summary.avg_protein_daily}g</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Avg Water</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--primary);">\${summary.avg_water_daily}ml</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Avg Creatine</div>
              <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">\${summary.avg_creatine_daily}g</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Adherence Rate</div>
              <div style="font-size: 24px; font-weight: bold; color: \${summary.adherence_rate >= 80 ? '#4CAF50' : summary.adherence_rate >= 60 ? '#FFA500' : '#f44336'};">\${summary.adherence_rate}%</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">All Goals Hit</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--success);">\${summary.all_goals_days} days</div>
            </div>
          </div>
        </div>


        <!-- Weekly Trends -->
        \${weekly_trends.length > 0 ? \`
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3><i class="fas fa-calendar-week"></i> Weekly Trends</h3>
            <div style="display: flex; gap: 8px;">
              <input 
                type="text" 
                id="weeklyTrendsFilter" 
                placeholder="Filter..." 
                oninput="filterWeeklyTrends()"
                style="padding: 6px 12px; border: 1px solid var(--light); border-radius: 6px; width: 150px;"
              >
              <select 
                id="weeklyTrendsSort" 
                onchange="sortWeeklyTrends()" 
                style="padding: 6px 12px; border: 1px solid var(--light); border-radius: 6px;"
              >
                <option value="date-desc">Date (Newest)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="protein-desc">Protein (High-Low)</option>
                <option value="protein-asc">Protein (Low-High)</option>
                <option value="water-desc">Water (High-Low)</option>
                <option value="water-asc">Water (Low-High)</option>
                <option value="goals-desc">Goals Hit (High-Low)</option>
                <option value="goals-asc">Goals Hit (Low-High)</option>
              </select>
            </div>
          </div>
          <div class="table-container">
            <table class="data-table" id="weeklyTrendsTable">
              <thead>
                <tr>
                  <th onclick="sortWeeklyTrendsByColumn('week')" style="cursor: pointer;">
                    Week <i class="fas fa-sort"></i>
                  </th>
                  <th onclick="sortWeeklyTrendsByColumn('protein')" style="cursor: pointer;">
                    Avg Protein <i class="fas fa-sort"></i>
                  </th>
                  <th onclick="sortWeeklyTrendsByColumn('water')" style="cursor: pointer;">
                    Avg Water <i class="fas fa-sort"></i>
                  </th>
                  <th onclick="sortWeeklyTrendsByColumn('creatine')" style="cursor: pointer;">
                    Avg Creatine <i class="fas fa-sort"></i>
                  </th>
                  <th onclick="sortWeeklyTrendsByColumn('logged')" style="cursor: pointer;">
                    Days Logged <i class="fas fa-sort"></i>
                  </th>
                  <th onclick="sortWeeklyTrendsByColumn('goals')" style="cursor: pointer;">
                    Goals Hit <i class="fas fa-sort"></i>
                  </th>
                </tr>
              </thead>
              <tbody id="weeklyTrendsBody">
                \${weekly_trends.map(week => \`
                  <tr data-week-start="\${week.week_start}" data-protein="\${Math.round(week.avg_protein)}" data-water="\${Math.round(week.avg_water)}" data-creatine="\${week.avg_creatine.toFixed(1)}" data-logged="\${week.days_logged}" data-goals="\${week.days_hit_goals}">
                    <td><small>\${formatDateOnly(week.week_start)} - \${formatDateOnly(week.week_end)}</small></td>
                    <td><strong>\${Math.round(week.avg_protein)}g</strong></td>
                    <td><strong>\${Math.round(week.avg_water)}ml</strong></td>
                    <td><strong>\${week.avg_creatine.toFixed(1)}g</strong></td>
                    <td>\${week.days_logged}</td>
                    <td><span style="color: \${week.days_hit_goals >= 5 ? 'var(--success)' : 'var(--warning)'};">\${week.days_hit_goals} days</span></td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        \` : ''}
        
        <!-- Daily History with Edit -->
        \${daily_data.length > 0 ? \`
        <div style="margin-bottom: 24px;">
          <h3><i class="fas fa-history"></i> Daily History (Last 30 Days)</h3>
          <div class="table-container" style="max-height: 400px; overflow-y: auto;">
            <table class="data-table">
              <thead style="position: sticky; top: 0; background: white; z-index: 10;">
                <tr>
                  <th>Date</th>
                  <th>Protein</th>
                  <th>Water</th>
                  <th>Creatine</th>
                  <th>Goals</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                \${daily_data.slice().reverse().map(day => \`
                  <tr>
                    <td><strong>\${formatDateOnly(day.date)}</strong></td>
                    <td>\${day.protein}g \${day.hit_protein ? '✅' : '❌'}</td>
                    <td>\${day.water}ml \${day.hit_water ? '✅' : '❌'}</td>
                    <td>\${day.creatine}g \${day.hit_creatine ? '✅' : '❌'}</td>
                    <td>\${day.hit_all ? '<span style="color: var(--success);">All Hit ✅</span>' : '<span style="color: var(--warning);">Incomplete</span>'}</td>
                    <td>
                      <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="editNutritionLog('\${day.date}', \${day.protein}, \${day.water}, \${day.creatine})">
                        <i class="fas fa-edit"></i> Edit
                      </button>
                      <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; color: var(--danger);" onclick="deleteNutritionLog('\${day.date}')">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        \` : ''}

        <!-- Daily Trend Chart (last 14 days) -->
        \${daily_data.length > 0 ? \`
        <div>
          <h3><i class="fas fa-chart-area"></i> Recent Trends (Last 14 Days)</h3>
          <div style="background: var(--light); padding: 16px; border-radius: 12px; overflow-x: auto;">
            <div style="display: flex; gap: 12px; min-width: 800px;">
              \${daily_data.slice(-14).map(day => {
                const [year, month, dayNum] = day.date.split('-').map(Number);
                const date = new Date(year, month - 1, dayNum);
                return \`
                <div style="flex: 1; text-align: center;">
                  <div style="font-size: 11px; color: var(--gray); margin-bottom: 8px;">
                    \${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  
                  <!-- Protein Bar -->
                  <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
                    <div style="width: 24px; height: \${Math.min((day.protein / day.protein_goal) * 100, 100)}px; background: \${day.hit_protein ? 'var(--secondary)' : '#ccc'}; border-radius: 4px 4px 0 0;"></div>
                    <div style="font-size: 10px; margin-top: 4px;">💪</div>
                  </div>
                  
                  <!-- Water Bar -->
                  <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
                    <div style="width: 24px; height: \${Math.min((day.water / day.water_goal) * 100, 100)}px; background: \${day.hit_water ? 'var(--primary)' : '#ccc'}; border-radius: 4px 4px 0 0;"></div>
                    <div style="font-size: 10px; margin-top: 4px;">💧</div>
                  </div>
                  
                  <!-- Creatine Bar -->
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="width: 24px; height: \${Math.min((day.creatine / day.creatine_goal) * 100, 100)}px; background: \${day.hit_creatine ? '#8b5cf6' : '#ccc'}; border-radius: 4px 4px 0 0;"></div>
                    <div style="font-size: 10px; margin-top: 4px;">⚡</div>
                  </div>
                  
                  \${day.hit_all ? '<div style="font-size: 16px; margin-top: 8px;">✅</div>' : ''}
                </div>
                \`;
              }).join('')}
            </div>
          </div>
        </div>
        \` : '<p>No data yet. Start logging your nutrition to see trends!</p>'}
      </div>
    \`;
    
    // Load today's individual entries
    loadNutritionEntries();
  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading nutrition: \${error.message}</p></div>\`;
  }
}

async function logProtein(amount) {
  const grams = amount || parseFloat(document.getElementById('proteinInput').value);
  
  if (!grams) {
    showNotification('Please enter protein amount', 'warning');
    return;
  }

  try {
    await api('/nutrition/entries', {
      method: 'POST',
      body: JSON.stringify({ 
        entry_type: 'protein', 
        amount: grams, 
        unit: 'g'
      })
    });

    showNotification('Protein logged!', 'success');
    document.getElementById('proteinInput').value = '';
    loadNutrition();
  } catch (error) {
    showNotification('Error logging protein: ' + error.message, 'error');
  }
}

async function logWater(amount) {
  const ml = amount || parseFloat(document.getElementById('waterInput').value);
  
  if (!ml) {
    showNotification('Please enter water amount', 'warning');
    return;
  }

  try {
    await api('/nutrition/entries', {
      method: 'POST',
      body: JSON.stringify({ 
        entry_type: 'water', 
        amount: ml, 
        unit: 'ml'
      })
    });

    showNotification('Water logged!', 'success');
    if (!amount) document.getElementById('waterInput').value = '';
    loadNutrition();
  } catch (error) {
    showNotification('Error logging water: ' + error.message, 'error');
  }
}

async function logCreatine(amount) {
  const grams = amount || parseFloat(document.getElementById('creatineInput').value);
  
  if (!grams) {
    showNotification('Please enter creatine amount', 'warning');
    return;
  }

  try {
    await api('/nutrition/entries', {
      method: 'POST',
      body: JSON.stringify({ 
        entry_type: 'creatine', 
        amount: grams, 
        unit: 'g'
      })
    });

    showNotification('Creatine logged!', 'success');
    if (!amount) document.getElementById('creatineInput').value = '';
    loadNutrition();
  } catch (error) {
    showNotification('Error logging creatine: ' + error.message, 'error');
  }
}

// Load nutrition entries for today
async function loadNutritionEntries() {
  const today = new Date().toISOString().split('T')[0];
  const container = document.getElementById('nutrition-entries-table');
  
  try {
    const data = await api(\`/nutrition/entries?start_date=\${today}&end_date=\${today}\`);
    const entries = data.entries || [];
    
    if (entries.length === 0) {
      container.innerHTML = \`
        <div style="text-align: center; padding: 20px; color: var(--gray);">
          <i class="fas fa-inbox"></i>
          <p style="margin-top: 8px;">No entries logged today. Start tracking above!</p>
        </div>
      \`;
      return;
    }
    
    // Group entries by type
    const grouped = {
      protein: entries.filter(e => e.entry_type === 'protein'),
      water: entries.filter(e => e.entry_type === 'water'),
      creatine: entries.filter(e => e.entry_type === 'creatine')
    };
    
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };
    
    const renderEntries = (entries, icon, color) => {
      if (entries.length === 0) return '';
      
      return \`
        <div style="margin-bottom: 20px;">
          <h4 style="color: \${color}; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="\${icon}"></i> \${entries[0].entry_type.charAt(0).toUpperCase() + entries[0].entry_type.slice(1)} 
            <span style="font-size: 14px; font-weight: normal; color: var(--gray);">(\${entries.length} \${entries.length === 1 ? 'entry' : 'entries'})</span>
          </h4>
          <div style="overflow-x: auto;">
            <table class="data-table" style="font-size: 14px;">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                \${entries.map(entry => \`
                  <tr>
                    <td>\${formatTime(entry.logged_at)}</td>
                    <td><strong>\${entry.amount}\${entry.unit}</strong></td>
                    <td>
                      <button class="btn btn-outline" onclick="editNutritionEntry(\${entry.id}, '\${entry.entry_type}', \${entry.amount})" 
                              style="padding: 4px 8px; font-size: 12px; margin-right: 4px;">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-outline" onclick="deleteNutritionEntry(\${entry.id})" 
                              style="padding: 4px 8px; font-size: 12px; color: var(--danger);">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \`;
    };
    
    container.innerHTML = \`
      \${renderEntries(grouped.protein, 'fas fa-drumstick-bite', 'var(--secondary)')}
      \${renderEntries(grouped.water, 'fas fa-tint', 'var(--primary)')}
      \${renderEntries(grouped.creatine, 'fas fa-flask', '#8b5cf6')}
    \`;
    
  } catch (error) {
    container.innerHTML = \`
      <div style="text-align: center; padding: 20px; color: var(--danger);">
        <i class="fas fa-exclamation-triangle"></i>
        <p style="margin-top: 8px;">Error loading entries: \${error.message}</p>
      </div>
    \`;
  }
}

// Edit nutrition entry
function editNutritionEntry(id, type, currentAmount) {
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = \`
    <div class="form-group">
      <label>Type:</label>
      <input type="text" value="\${type.charAt(0).toUpperCase() + type.slice(1)}" disabled style="background: var(--light);">
    </div>
    <div class="form-group">
      <label>Amount:</label>
      <input type="number" id="editEntryAmount" value="\${currentAmount}" step="0.5" min="0.1">
    </div>
    <button class="btn btn-primary" onclick="saveNutritionEntryEdit(\${id})">
      <i class="fas fa-save"></i> Save Changes
    </button>
  \`;
  
  openModal('Edit Entry');
}

// Save nutrition entry edit
async function saveNutritionEntryEdit(id) {
  const amount = parseFloat(document.getElementById('editEntryAmount').value);
  
  if (!amount || amount <= 0) {
    showNotification('Please enter a valid amount', 'warning');
    return;
  }
  
  try {
    await api(\`/nutrition/entries/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify({ amount })
    });
    
    showNotification('Entry updated!', 'success');
    closeModal();
    loadNutritionEntries();
    loadNutrition();
  } catch (error) {
    showNotification('Error updating entry: ' + error.message, 'error');
  }
}

// Delete nutrition entry
async function deleteNutritionEntry(id) {
  if (!confirm('Delete this entry?')) return;
  
  try {
    await api(\`/nutrition/entries/\${id}\`, {
      method: 'DELETE'
    });
    
    showNotification('Entry deleted!', 'success');
    loadNutritionEntries();
    loadNutrition();
  } catch (error) {
    showNotification('Error deleting entry: ' + error.message, 'error');
  }
}

// Profile modal
function showProfile() {
  const modalBody = document.getElementById('modalBody');
  const system = state.user.measurement_system || 'metric';
  const isImperial = system === 'imperial';
  
  let heightValue = state.user.height_cm || '';
  let heightFeet = '';
  let heightInches = '';
  if (isImperial && heightValue) {
    const feetInches = cmToFeetInches(heightValue);
    heightFeet = feetInches.feet;
    heightInches = feetInches.inches;
  }
  
  const weightValue = isImperial && state.user.weight_kg 
    ? Math.round(kgToLbs(state.user.weight_kg)) 
    : (state.user.weight_kg || '');
  
  modalBody.innerHTML = \`
    <div class="form-group">
      <label>Name:</label>
      <input type="text" id="profileName" value="\${state.user.name || ''}" class="form-control">
    </div>

    <div class="form-group">
      <label>Age:</label>
      <input type="number" id="profileAge" value="\${state.user.age || ''}" class="form-control">
    </div>

    <div class="form-group">
      <label>Gender:</label>
      <select id="profileGender" class="form-control">
        <option value="not_specified" \${!state.user.gender || state.user.gender === 'not_specified' ? 'selected' : ''}>Prefer not to say</option>
        <option value="male" \${state.user.gender === 'male' ? 'selected' : ''}>Male</option>
        <option value="female" \${state.user.gender === 'female' ? 'selected' : ''}>Female</option>
      </select>
      <small style="color: var(--gray); font-size: 12px; display: block; margin-top: 4px;">
        <i class="fas fa-info-circle"></i> Used by AI to personalize program recommendations
      </small>
    </div>

    <div class="form-group">
      <label>Measurement System:</label>
      <select id="profileSystem" class="form-control" onchange="toggleMeasurementInputs()">
        <option value="metric" \${!isImperial ? 'selected' : ''}>Metric (kg, cm)</option>
        <option value="imperial" \${isImperial ? 'selected' : ''}>Imperial (lbs, feet/inches)</option>
      </select>
    </div>

    <div id="metricInputs" style="display: \${isImperial ? 'none' : 'block'}">
      <div class="form-group">
        <label>Height (cm):</label>
        <input type="number" id="profileHeightCm" value="\${heightValue}" class="form-control" step="0.1">
      </div>
      <div class="form-group">
        <label>Weight (kg):</label>
        <input type="number" id="profileWeightKg" value="\${state.user.weight_kg || ''}" class="form-control" step="0.1">
      </div>
    </div>

    <div id="imperialInputs" style="display: \${isImperial ? 'block' : 'none'}">
      <div class="form-group">
        <label>Height:</label>
        <div style="display: flex; gap: 10px;">
          <input type="number" id="profileHeightFeet" value="\${heightFeet}" placeholder="Feet" class="form-control" style="flex: 1;">
          <input type="number" id="profileHeightInches" value="\${heightInches}" placeholder="Inches" class="form-control" style="flex: 1;">
        </div>
      </div>
      <div class="form-group">
        <label>Weight (lbs):</label>
        <input type="number" id="profileWeightLbs" value="\${weightValue}" class="form-control" step="0.1">
      </div>
    </div>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--border);">
    
    <h3 style="margin-bottom: 16px;"><i class="fas fa-envelope"></i> Email Reports</h3>
    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
      Receive workout summary reports comparing your progress to previous periods.
    </p>
    
    <div id="emailReportPrefs" style="margin-bottom: 20px;">
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
          <input type="checkbox" id="weeklyReport" style="width: 18px; height: 18px;">
          <div>
            <strong>Weekly Report</strong>
            <div style="font-size: 12px; color: var(--text-secondary);">Sent every Monday morning</div>
          </div>
        </label>
        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
          <input type="checkbox" id="monthlyReport" style="width: 18px; height: 18px;">
          <div>
            <strong>Monthly Report</strong>
            <div style="font-size: 12px; color: var(--text-secondary);">Sent on the 1st of each month</div>
          </div>
        </label>
        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
          <input type="checkbox" id="yearlyReport" style="width: 18px; height: 18px;">
          <div>
            <strong>Yearly Report</strong>
            <div style="font-size: 12px; color: var(--text-secondary);">Sent on January 1st</div>
          </div>
        </label>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn btn-outline" onclick="previewReport('weekly')" style="font-size: 13px;">
          <i class="fas fa-eye"></i> Preview Weekly
        </button>
        <button class="btn btn-outline" onclick="previewReport('monthly')" style="font-size: 13px;">
          <i class="fas fa-eye"></i> Preview Monthly
        </button>
        <button class="btn btn-outline" onclick="previewReport('yearly')" style="font-size: 13px;">
          <i class="fas fa-eye"></i> Preview Yearly
        </button>
      </div>
    </div>

    <button class="btn btn-primary" onclick="saveProfile()">
      <i class="fas fa-save"></i> Save Profile
    </button>
  \`;

  document.getElementById('modalTitle').textContent = 'User Profile';
  openModal();
  
  // Load email report preferences
  loadEmailReportPreferences();
}

function toggleMeasurementInputs() {
  const system = document.getElementById('profileSystem').value;
  const metricInputs = document.getElementById('metricInputs');
  const imperialInputs = document.getElementById('imperialInputs');
  
  if (system === 'metric') {
    metricInputs.style.display = 'block';
    imperialInputs.style.display = 'none';
  } else {
    metricInputs.style.display = 'none';
    imperialInputs.style.display = 'block';
  }
}

async function saveProfile() {
  const name = document.getElementById('profileName').value;
  const age = parseInt(document.getElementById('profileAge').value);
  const gender = document.getElementById('profileGender').value;
  const measurement_system = document.getElementById('profileSystem').value;
  
  let height_cm, weight_kg;
  
  if (measurement_system === 'imperial') {
    const feet = parseFloat(document.getElementById('profileHeightFeet').value) || 0;
    const inches = parseFloat(document.getElementById('profileHeightInches').value) || 0;
    const lbs = parseFloat(document.getElementById('profileWeightLbs').value) || 0;
    
    height_cm = feetInchesToCm(feet, inches);
    weight_kg = lbsToKg(lbs);
  } else {
    height_cm = parseFloat(document.getElementById('profileHeightCm').value);
    weight_kg = parseFloat(document.getElementById('profileWeightKg').value);
  }

  try {
    const data = await api('/auth/user', {
      method: 'PUT',
      body: JSON.stringify({ name, age, gender, height_cm, weight_kg, measurement_system })
    });

    state.user = data.user;
    
    // Also save email report preferences
    await saveEmailReportPreferences();
    
    showNotification('Profile updated!', 'success');
    closeModal();
    loadUser();
  } catch (error) {
    showNotification('Error saving profile: ' + error.message, 'error');
  }
}

// Utility functions
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '00:00';
  
  seconds = Math.abs(Math.floor(seconds));
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return \`\${String(hrs).padStart(2, '0')}:\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
  }
  
  return \`\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
}

function formatDateOnly(dateStr) {
  // Parse date without timezone conversion
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Email report preferences functions
async function loadEmailReportPreferences() {
  try {
    const result = await api('/reports/preferences');
    const prefs = result.preferences || {};
    
    const weeklyEl = document.getElementById('weeklyReport');
    const monthlyEl = document.getElementById('monthlyReport');
    const yearlyEl = document.getElementById('yearlyReport');
    
    if (weeklyEl) weeklyEl.checked = prefs.weeklyReport || false;
    if (monthlyEl) monthlyEl.checked = prefs.monthlyReport || false;
    if (yearlyEl) yearlyEl.checked = prefs.yearlyReport || false;
  } catch (error) {
    console.error('Error loading email report preferences:', error);
  }
}

async function saveEmailReportPreferences() {
  try {
    const weeklyReport = document.getElementById('weeklyReport')?.checked || false;
    const monthlyReport = document.getElementById('monthlyReport')?.checked || false;
    const yearlyReport = document.getElementById('yearlyReport')?.checked || false;
    
    await api('/reports/preferences', {
      method: 'PUT',
      body: JSON.stringify({ weeklyReport, monthlyReport, yearlyReport })
    });
    
    return true;
  } catch (error) {
    console.error('Error saving email report preferences:', error);
    return false;
  }
}

async function previewReport(period) {
  showNotification(\`Generating \${period} report preview...\`, 'info');
  
  try {
    // Open the HTML report in a new tab
    const token = localStorage.getItem('token');
    window.open(\`/api/reports/html/\${period}?token=\${token}\`, '_blank');
  } catch (error) {
    showNotification('Error generating report: ' + error.message, 'error');
  }
}

function openModal(wide = false) {
  const modal = document.getElementById('modal');
  const modalContent = document.querySelector('.modal-content');
  
  // Add or remove wide class
  if (wide) {
    modalContent.classList.add('wide');
  } else {
    modalContent.classList.remove('wide');
  }
  
  modal.classList.add('active');
  
  // Click outside to close
  setTimeout(() => {
    modal.onclick = function(e) {
      if (e.target === modal) {
        closeModal();
      }
    };
  }, 100);
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('active');
  modal.onclick = null;
}

// Show rename program modal
function showRenameProgramModal(programId, currentName) {
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = \`
    <div class="form-group">
      <label>Program Name:</label>
      <input type="text" id="newProgramName" class="form-control" value="\${currentName}" />
    </div>
    <div style="display: flex; gap: 12px; margin-top: 20px;">
      <button class="btn btn-outline" onclick="viewProgram(\${programId})">Cancel</button>
      <button class="btn btn-primary" onclick="renameProgram(\${programId})">
        <i class="fas fa-save"></i> Save Name
      </button>
    </div>
  \`;
  document.getElementById('modalTitle').textContent = 'Rename Program';
}

// Rename program
async function renameProgram(programId) {
  const newName = document.getElementById('newProgramName').value.trim();
  
  if (!newName) {
    showNotification('Please enter a program name', 'error');
    return;
  }
  
  try {
    await api(\`/programs/\${programId}\`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName })
    });
    
    showNotification('Program renamed successfully', 'success');
    
    // Refresh the program view
    viewProgram(programId);
    
    // Refresh programs list in background
    loadPrograms();
  } catch (error) {
    showNotification('Failed to rename program: ' + error.message, 'error');
  }
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  const text = document.getElementById('notificationText');
  
  text.textContent = message;
  notification.classList.add('active');
  
  setTimeout(() => {
    notification.classList.remove('active');
  }, 3000);
}

// Save workout notes (works with both old interface and Phase 4 modal)
async function saveWorkoutNotes() {
  // Try Phase 4 modal textarea first
  const textarea = document.getElementById('workout-notes-input');
  const notes = textarea ? textarea.value : document.getElementById('workoutNotes')?.value;
  
  if (!state.currentWorkout) {
    showNotification('No active workout', 'error');
    return;
  }
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}\`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });

    state.workoutNotes = notes;
    showNotification('Notes saved!', 'success');
    
    // Close modal if it's the Phase 4 version
    if (textarea) {
      const modal = textarea.closest('div[style*="fixed"]');
      if (modal) modal.remove();
    }
  } catch (error) {
    showNotification('Error saving notes: ' + error.message, 'error');
  }
}

// Show exercise history with charts and progression
async function showExerciseHistory(exerciseId, exerciseName) {
  try {
    const data = await api(\`/analytics/exercise-history/\${exerciseId}\`);
    const weightUnit = getWeightUnit();
    
    // Create history modal
    const modal = document.createElement('div');
    modal.id = 'exercise-history-modal';
    modal.style.cssText = \`
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 20000;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    \`;
    
    const formatHistoryWeight = (kg) => isImperialSystem() ? (kg * 2.20462).toFixed(1) : kg?.toFixed(1) || '0';
    
    // Build chart data points
    const chartData = data.progression || [];
    const maxWeight = Math.max(...chartData.map(d => d.max_weight || 0), 1);
    const max1RM = Math.max(...chartData.map(d => d.max_1rm || 0), 1);
    
    modal.innerHTML = \`
      <div style="background: var(--bg-primary); border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); padding: 24px; border-radius: 16px 16px 0 0; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="margin: 0 0 8px 0; font-size: 22px; color: white;">\${exerciseName}</h2>
              <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                <i class="fas fa-bullseye"></i> \${data.exercise?.muscle_group || 'N/A'} • 
                <i class="fas fa-dumbbell"></i> \${data.exercise?.equipment || 'N/A'}
              </p>
            </div>
            <button onclick="document.getElementById('exercise-history-modal').remove()" 
              style="background: rgba(255,255,255,0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 18px;">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <!-- Personal Records -->
        <div style="padding: 20px; border-bottom: 1px solid var(--border);">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: var(--text-secondary);">
            <i class="fas fa-trophy" style="color: gold;"></i> Personal Records
          </h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 12px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: var(--primary);">\${formatHistoryWeight(data.personal_records?.max_weight)} \${weightUnit}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">Max Weight</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 12px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: var(--secondary);">\${formatHistoryWeight(data.personal_records?.max_1rm)} \${weightUnit}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">Est. 1RM</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 12px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">\${data.personal_records?.max_reps || 0}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">Max Reps</div>
            </div>
          </div>
        </div>
        
        <!-- Weight Progression Chart -->
        \${chartData.length > 1 ? \`
        <div style="padding: 20px; border-bottom: 1px solid var(--border);">
          <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: var(--text-secondary);">
            <i class="fas fa-chart-line"></i> Weight Progression
          </h3>
          <div style="height: 150px; display: flex; align-items: flex-end; gap: 4px; padding: 10px 0;">
            \${chartData.slice(-20).map((d, i) => {
              const heightPercent = (d.max_weight / maxWeight) * 100;
              const date = new Date(d.workout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return \`
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 30px;">
                  <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">\${formatHistoryWeight(d.max_weight)}</div>
                  <div style="width: 100%; background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%); height: \${heightPercent}%; min-height: 4px; border-radius: 4px 4px 0 0;" title="\${date}: \${formatHistoryWeight(d.max_weight)} \${weightUnit}"></div>
                  <div style="font-size: 9px; color: var(--text-secondary); margin-top: 4px; writing-mode: vertical-rl; transform: rotate(180deg); height: 40px; overflow: hidden;">\${date}</div>
                </div>
              \`;
            }).join('')}
          </div>
        </div>
        \` : '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Not enough data for progression chart</div>'}
        
        <!-- History Table -->
        <div style="padding: 20px;">
          <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: var(--text-secondary);">
            <i class="fas fa-history"></i> Workout History
          </h3>
          \${data.history && data.history.length > 0 ? \`
            <div style="max-height: 300px; overflow-y: auto;">
              \${data.history.slice(0, 20).map(workout => \`
                <div style="background: var(--bg-secondary); border-radius: 10px; margin-bottom: 12px; overflow: hidden;">
                  <div style="background: var(--primary); color: white; padding: 10px 14px; font-weight: 600; font-size: 14px;">
                    <i class="fas fa-calendar"></i> \${new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style="padding: 12px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                      <thead>
                        <tr style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase;">
                          <th style="text-align: left; padding: 4px 8px;">Set</th>
                          <th style="text-align: right; padding: 4px 8px;">Weight</th>
                          <th style="text-align: right; padding: 4px 8px;">Reps</th>
                          <th style="text-align: right; padding: 4px 8px;">Est. 1RM</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${workout.sets.map(set => \`
                          <tr style="border-top: 1px solid var(--border);">
                            <td style="padding: 8px; font-weight: 600;">\${set.set_number}</td>
                            <td style="padding: 8px; text-align: right;">\${formatHistoryWeight(set.weight_kg)} \${weightUnit}</td>
                            <td style="padding: 8px; text-align: right;">\${set.reps}</td>
                            <td style="padding: 8px; text-align: right; color: var(--primary);">\${formatHistoryWeight(set.one_rep_max_kg)}</td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              \`).join('')}
            </div>
          \` : '<p style="text-align: center; color: var(--text-secondary);">No history available for this exercise</p>'}
        </div>
        
        <!-- Close Button -->
        <div style="padding: 20px; border-top: 1px solid var(--border); text-align: center;">
          <button class="btn btn-primary" onclick="document.getElementById('exercise-history-modal').remove()" style="min-width: 150px;">
            <i class="fas fa-check"></i> Close
          </button>
        </div>
      </div>
    \`;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
  } catch (error) {
    showNotification('Error loading exercise history: ' + error.message, 'error');
    console.error('Exercise history error:', error);
  }
}

// Show exercise notes
function showExerciseNotes(exerciseId) {
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = \`
    <div class="form-group">
      <label>Exercise Notes:</label>
      <textarea id="exerciseNotes" class="form-control" rows="4" placeholder="Add notes about this exercise..."></textarea>
    </div>

    <button class="btn btn-primary" onclick="saveExerciseNotes(\${exerciseId})">
      <i class="fas fa-save"></i> Save Notes
    </button>
  \`;

  document.getElementById('modalTitle').textContent = 'Exercise Notes';
  openModal();
}

async function saveExerciseNotes(exerciseId) {
  const notes = document.getElementById('exerciseNotes').value;
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/notes\`, {
      method: 'PUT',
      body: JSON.stringify({ notes })
    });

    showNotification('Notes saved!', 'success');
    closeModal();
  } catch (error) {
    showNotification('Error saving notes: ' + error.message, 'error');
  }
}

// Export nutrition data as CSV
function exportNutritionCSV(type, days) {
  window.location.href = \`/api/nutrition/export/csv?type=\${type}&days=\${days}\`;
}

// Export nutrition report
function exportNutritionReport(days) {
  window.location.href = \`/api/nutrition/export/report?days=\${days}\`;
}

// Edit nutrition log
function editNutritionLog(date, protein, water, creatine) {
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = \`
    <div style="display: grid; gap: 16px;">
      <div class="form-group">
        <label>Date:</label>
        <input type="date" id="editNutritionDate" value="\${date}" readonly class="form-control" style="background: var(--light);">
      </div>
      
      <div class="form-group">
        <label>Protein (grams):</label>
        <input type="number" id="editNutritionProtein" value="\${protein}" class="form-control" step="1" min="0">
      </div>
      
      <div class="form-group">
        <label>Water (ml):</label>
        <input type="number" id="editNutritionWater" value="\${water}" class="form-control" step="100" min="0">
      </div>
      
      <div class="form-group">
        <label>Creatine (grams):</label>
        <input type="number" id="editNutritionCreatine" value="\${creatine}" class="form-control" step="0.5" min="0">
      </div>
      
      <button class="btn btn-primary" onclick="saveNutritionEdit()">
        <i class="fas fa-save"></i> Save Changes
      </button>
    </div>
  \`;
  
  openModal('Edit Nutrition Log');
}

// Save edited nutrition log
async function saveNutritionEdit() {
  const date = document.getElementById('editNutritionDate').value;
  const protein = parseFloat(document.getElementById('editNutritionProtein').value) || 0;
  const water = parseFloat(document.getElementById('editNutritionWater').value) || 0;
  const creatine = parseFloat(document.getElementById('editNutritionCreatine').value) || 0;
  
  try {
    await api('/nutrition/daily', {
      method: 'PUT',
      body: JSON.stringify({
        date,
        protein_grams: protein,
        water_ml: water,
        creatine_grams: creatine
      })
    });
    
    showNotification('Nutrition log updated!', 'success');
    closeModal();
    loadNutrition();
  } catch (error) {
    showNotification('Error updating nutrition log: ' + error.message, 'error');
  }
}

// Delete nutrition log
async function deleteNutritionLog(date) {
  if (!confirm(\`Delete nutrition log for \${new Date(date).toLocaleDateString()}?\`)) return;
  
  try {
    await api(\`/nutrition/daily/\${date}\`, {
      method: 'DELETE'
    });
    
    showNotification('Nutrition log deleted!', 'success');
    loadNutrition();
  } catch (error) {
    showNotification('Error deleting nutrition log: ' + error.message, 'error');
  }
}

// Filter weekly trends table
function filterWeeklyTrends() {
  const filterValue = document.getElementById('weeklyTrendsFilter').value.toLowerCase();
  const tbody = document.getElementById('weeklyTrendsBody');
  const rows = tbody.getElementsByTagName('tr');
  
  for (let row of rows) {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(filterValue) ? '' : 'none';
  }
}

// Sort weekly trends by dropdown
function sortWeeklyTrends() {
  const sortValue = document.getElementById('weeklyTrendsSort').value;
  const tbody = document.getElementById('weeklyTrendsBody');
  const rows = Array.from(tbody.getElementsByTagName('tr'));
  
  rows.sort((a, b) => {
    let aVal, bVal;
    
    switch(sortValue) {
      case 'date-desc':
        aVal = new Date(a.dataset.weekStart);
        bVal = new Date(b.dataset.weekStart);
        return bVal - aVal;
      case 'date-asc':
        aVal = new Date(a.dataset.weekStart);
        bVal = new Date(b.dataset.weekStart);
        return aVal - bVal;
      case 'protein-desc':
        return parseFloat(b.dataset.protein) - parseFloat(a.dataset.protein);
      case 'protein-asc':
        return parseFloat(a.dataset.protein) - parseFloat(b.dataset.protein);
      case 'water-desc':
        return parseFloat(b.dataset.water) - parseFloat(a.dataset.water);
      case 'water-asc':
        return parseFloat(a.dataset.water) - parseFloat(b.dataset.water);
      case 'goals-desc':
        return parseInt(b.dataset.goals) - parseInt(a.dataset.goals);
      case 'goals-asc':
        return parseInt(a.dataset.goals) - parseInt(b.dataset.goals);
      default:
        return 0;
    }
  });
  
  rows.forEach(row => tbody.appendChild(row));
}

// Sort weekly trends by column click
function sortWeeklyTrendsByColumn(column) {
  const select = document.getElementById('weeklyTrendsSort');
  const currentValue = select.value;
  
  // Toggle between asc and desc
  if (currentValue === \`\${column}-desc\`) {
    select.value = \`\${column}-asc\`;
  } else {
    select.value = \`\${column}-desc\`;
  }
  
  // Map column names to sort values
  const columnMap = {
    'week': 'date',
    'protein': 'protein',
    'water': 'water',
    'creatine': 'creatine',
    'logged': 'logged',
    'goals': 'goals'
  };
  
  if (columnMap[column]) {
    select.value = currentValue.includes(columnMap[column]) && currentValue.includes('desc') 
      ? \`\${columnMap[column]}-asc\` 
      : \`\${columnMap[column]}-desc\`;
    sortWeeklyTrends();
  }
}

// Edit a set
function editSet(exerciseId, setId, currentWeightKg, currentReps) {
  const weightUnit = getWeightUnit();
  const currentWeight = isImperialSystem() ? kgToLbs(currentWeightKg) : currentWeightKg;
  const displayWeight = currentWeight % 1 === 0 ? String(currentWeight) : currentWeight.toFixed(1);
  
  // Create inline edit overlay for workout modal
  const workoutModal = document.getElementById('workout-modal');
  if (workoutModal) {
    // Create overlay within workout modal
    let overlay = document.getElementById('edit-set-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'edit-set-overlay';
      workoutModal.appendChild(overlay);
    }
    
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    overlay.innerHTML = \`
      <div style="background: var(--bg-primary); border-radius: 16px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <h3 style="margin: 0 0 20px 0; color: var(--text-primary);">Edit Set</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--text-secondary);">Weight (\${weightUnit})</label>
            <input type="number" id="editSetWeight" value="\${displayWeight}" step="\${getWeightStep()}" 
                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 18px; background: var(--bg-secondary); color: var(--text-primary);">
          </div>
          <div>
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--text-secondary);">Reps</label>
            <input type="number" id="editSetReps" value="\${currentReps}" min="1"
                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 18px; background: var(--bg-secondary); color: var(--text-primary);">
          </div>
          <div style="display: flex; gap: 12px; margin-top: 8px;">
            <button class="btn btn-outline" onclick="closeEditSetOverlay()" style="flex: 1; padding: 12px;">Cancel</button>
            <button class="btn btn-primary" onclick="saveEditedSet(\${exerciseId}, \${setId})" style="flex: 1; padding: 12px;">
              <i class="fas fa-save"></i> Save
            </button>
          </div>
        </div>
      </div>
    \`;
    return;
  }
  
  // Fallback to standard modal for non-workout views
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  modalTitle.textContent = 'Edit Set';
  modalBody.innerHTML = \`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="form-group">
        <label>Weight (\${weightUnit})</label>
        <input type="number" id="editSetWeight" value="\${displayWeight}" step="\${getWeightStep()}" 
               style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 16px;">
      </div>
      <div class="form-group">
        <label>Reps</label>
        <input type="number" id="editSetReps" value="\${currentReps}" min="1"
               style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 16px;">
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="btn btn-outline" onclick="closeModal()" style="flex: 1;">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditedSet(\${exerciseId}, \${setId})" style="flex: 1;">
          <i class="fas fa-save"></i> Save
        </button>
      </div>
    </div>
  \`;
  
  modal.classList.add('active');
}

// Close edit set overlay
function closeEditSetOverlay() {
  const overlay = document.getElementById('edit-set-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Save edited set
async function saveEditedSet(exerciseId, setId) {
  const weightInput = document.getElementById('editSetWeight');
  const repsInput = document.getElementById('editSetReps');
  
  let weight = parseFloat(weightInput.value);
  const reps = parseInt(repsInput.value);
  
  if (isNaN(weight) || weight < 0 || isNaN(reps) || reps < 1) {
    showNotification('Please enter valid weight and reps', 'warning');
    return;
  }
  
  // Convert to kg if imperial
  if (isImperialSystem()) {
    weight = lbsToKg(weight);
  }
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/sets/\${setId}\`, {
      method: 'PUT',
      body: JSON.stringify({ weight_kg: weight, reps, rest_seconds: 90 })
    });
    
    // Close any open overlays/modals
    closeEditSetOverlay();
    closeModal();
    
    showNotification('Set updated!', 'success');
    
    // Refresh workout data
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
    // Refresh workout UI
    await refreshWorkoutUI();
  } catch (error) {
    showNotification('Error updating set: ' + error.message, 'error');
  }
}

// Delete a set
async function deleteSet(exerciseId, setId) {
  if (!confirm('Delete this set?')) return;
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/sets/\${setId}\`, {
      method: 'DELETE'
    });
    
    showNotification('Set deleted!', 'success');
    await refreshWorkoutUI();
  } catch (error) {
    showNotification('Error deleting set: ' + error.message, 'error');
  }
}

// Delete exercise from workout
async function deleteExerciseFromWorkout(exerciseId, exerciseName) {
  if (!confirm(\`Remove "\${exerciseName}" from this workout? Any logged sets will be deleted.\`)) return;
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}\`, {
      method: 'DELETE'
    });
    
    showNotification('Exercise removed!', 'success');
    await refreshWorkoutUI();
  } catch (error) {
    showNotification('Error removing exercise: ' + error.message, 'error');
  }
}

// Delete exercise from workout modal view
async function deleteExerciseFromWorkoutModal(exerciseId, exerciseName) {
  if (!confirm(\`Remove "\${exerciseName}" from this workout? Any logged sets will be deleted.\`)) return;
  
  try {
    // Track the deletion for program update prompt
    if (!state.workoutModifications) {
      state.workoutModifications = { added: [], deleted: [] };
    }
    
    // Find the exercise to get its details before deleting
    const exercise = state.currentWorkout.exercises.find(ex => ex.id === exerciseId);
    if (exercise && exercise.program_exercise_id) {
      // This was a program exercise, track it as deleted
      state.workoutModifications.deleted.push({
        exercise_id: exercise.exercise_id,
        name: exerciseName,
        program_exercise_id: exercise.program_exercise_id
      });
    }
    
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}\`, {
      method: 'DELETE'
    });
    
    showNotification('Exercise removed!', 'success');
    
    // Refresh workout data
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
    // If we deleted the current exercise, adjust the index
    if (state.workoutExercise && state.workoutExercise.currentIndex >= state.currentWorkout.exercises.length) {
      state.workoutExercise.currentIndex = Math.max(0, state.currentWorkout.exercises.length - 1);
    }
    
    // Re-render the workout modal
    if (state.currentWorkout.exercises.length === 0) {
      // No exercises left, show summary
      showWorkoutSummary();
    } else {
      renderWorkoutExerciseTabs();
    }
  } catch (error) {
    showNotification('Error removing exercise: ' + error.message, 'error');
  }
}

// Delete entire workout
async function deleteWorkout() {
  if (!confirm('Are you sure you want to delete this entire workout? This cannot be undone.')) return;
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}\`, {
      method: 'DELETE'
    });
    
    // Clear workout state
    state.currentWorkout = null;
    if (state.workoutTimer) {
      clearInterval(state.workoutTimer);
      state.workoutTimer = null;
    }
    stopRestTimer();
    
    showNotification('Workout deleted successfully', 'success');
    loadWorkout();
  } catch (error) {
    showNotification('Error deleting workout: ' + error.message, 'error');
  }
}

// Switch workout to cardio session
function switchToCardio() {
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = \`
    <div style="display: grid; gap: 16px;">
      <div class="form-group">
        <label><i class="fas fa-running"></i> Cardio Type:</label>
        <select id="cardioType" class="form-control">
          <option value="Running">Running</option>
          <option value="Cycling">Cycling</option>
          <option value="Swimming">Swimming</option>
          <option value="Rowing">Rowing</option>
          <option value="Elliptical">Elliptical</option>
          <option value="Stairs">Stair Climber</option>
          <option value="HIIT">HIIT</option>
          <option value="Walking">Walking</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label><i class="fas fa-clock"></i> Duration (minutes):</label>
        <input type="number" id="cardioDuration" class="form-control" placeholder="30" min="1">
      </div>
      
      <div class="form-group">
        <label><i class="fas fa-route"></i> Distance (optional):</label>
        <input type="text" id="cardioDistance" class="form-control" placeholder="e.g., 5K, 10 miles">
      </div>
      
      <div class="form-group">
        <label><i class="fas fa-sticky-note"></i> Notes:</label>
        <textarea id="cardioNotes" class="form-control" rows="3" placeholder="How did it feel? Average pace? Heart rate? Intensity level..."></textarea>
      </div>
      
      <div style="background: var(--warning); color: white; padding: 12px; border-radius: 8px; font-size: 14px;">
        <i class="fas fa-info-circle"></i> <strong>Note:</strong> This will mark the workout as complete and replace it with a cardio session. All strength training data will be removed.
      </div>
      
      <button class="btn btn-primary" onclick="confirmCardioSwitch()" style="width: 100%;">
        <i class="fas fa-check"></i> Confirm Switch to Cardio
      </button>
    </div>
  \`;
  
  openModal('Switch to Cardio Session');
}

// Confirm cardio switch
async function confirmCardioSwitch() {
  const cardioType = document.getElementById('cardioType').value;
  const duration = parseInt(document.getElementById('cardioDuration').value);
  const distance = document.getElementById('cardioDistance').value;
  const notes = document.getElementById('cardioNotes').value;
  
  if (!duration) {
    showNotification('Please enter duration', 'warning');
    return;
  }
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/cardio\`, {
      method: 'PUT',
      body: JSON.stringify({
        is_cardio: true,
        cardio_type: cardioType,
        duration_minutes: duration,
        distance: distance || null,
        notes: notes || null
      })
    });
    
    // Clear workout state
    state.currentWorkout = null;
    if (state.workoutTimer) {
      clearInterval(state.workoutTimer);
      state.workoutTimer = null;
    }
    stopRestTimer();
    
    showNotification('Cardio session recorded!', 'success');
    closeModal();
    switchTab('analytics');
  } catch (error) {
    showNotification('Error recording cardio: ' + error.message, 'error');
  }
}

// Toggle workout details on dashboard
function toggleWorkoutDetails(workoutId) {
  const details = document.getElementById(\`workout-details-\${workoutId}\`);
  const chevron = document.getElementById(\`workout-chevron-\${workoutId}\`);
  
  if (details.style.display === 'none') {
    details.style.display = 'block';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    details.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
}

// Delete workout from dashboard
async function deleteDashboardWorkout(workoutId) {
  if (!confirm('Are you sure you want to delete this workout? This cannot be undone.')) return;
  
  try {
    await api(\`/workouts/\${workoutId}\`, {
      method: 'DELETE'
    });
    
    showNotification('Workout deleted successfully', 'success');
    loadDashboard();
  } catch (error) {
    showNotification('Error deleting workout: ' + error.message, 'error');
  }
}

// Delete workout from analytics
async function deleteAnalyticsWorkout(workoutId) {
  if (!confirm('Are you sure you want to delete this workout? This cannot be undone.')) return;
  
  try {
    await api(\`/workouts/\${workoutId}\`, {
      method: 'DELETE'
    });
    
    showNotification('Workout deleted successfully', 'success');
    loadAnalytics();
  } catch (error) {
    showNotification('Error deleting workout: ' + error.message, 'error');
  }
}

// ========== PHASE 3: NEW WORKOUT FLOW ==========

// Warmup Database (simplified version)
const warmupDatabase = {
  'Chest': ['Arm Circles', 'Wall Chest Stretch', 'Dynamic Push-ups'],
  'Back': ['Cat-Cow Stretch', 'Scapular Pull-ups', 'Thoracic Rotations'],
  'Shoulders': ['Shoulder Circles', 'Band Pull-Aparts', 'Cross-Body Stretch'],
  'Legs': ['Leg Swings', 'Walking Lunges', 'Bodyweight Squats'],
  'Quads': ['Standing Quad Stretch', 'Light Leg Extensions', 'High Knees'],
  'Hamstrings': ['Standing Hamstring Stretch', 'Light Leg Curls', 'Inchworms'],
  'Glutes': ['Glute Bridges', 'Fire Hydrants', 'Donkey Kicks'],
  'Biceps': ['Arm Swings', 'Wall Bicep Stretch', 'Light Band Curls'],
  'Triceps': ['Overhead Tricep Stretch', 'Light Bench Dips', 'Arm Extensions'],
  'Abs': ['Standing Torso Twists', 'Dead Bug', 'Plank Hold'],
  'Core': ['Bird Dogs', 'Side Plank Hold', 'Mountain Climbers'],
  'Calves': ['Calf Raises', 'Ankle Circles', 'Wall Calf Stretch']
};

// Show warmup screen before workout
function showWorkoutWarmupScreen(workout) {
  // Validate workout has exercises
  if (!workout || !workout.exercises || workout.exercises.length === 0) {
    showNotification('Error: Workout has no exercises', 'error');
    console.error('Invalid workout data:', workout);
    return;
  }
  
  // Create full-screen modal
  const modal = document.createElement('div');
  modal.id = 'workout-modal';
  modal.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-secondary);
    z-index: 10000;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  \`;
  
  // Prevent background scrolling on mobile
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = \`-\${window.scrollY}px\`;
  
  // Get muscle groups from exercises
  const muscleGroups = [...new Set(workout.exercises.map(ex => ex.muscle_group).filter(Boolean))];
  const warmups = [];
  
  // Get warmups for each muscle group
  for (const muscle of muscleGroups) {
    const exercises = warmupDatabase[muscle] || [];
    warmups.push(...exercises.map(name => ({ name, muscle })));
  }
  
  // If no specific warmups, use general ones
  if (warmups.length === 0) {
    warmups.push(
      { name: 'Jumping Jacks', muscle: 'Full Body' },
      { name: 'Dynamic Stretching', muscle: 'Full Body' },
      { name: 'Light Cardio', muscle: 'Full Body' }
    );
  }
  
  modal.innerHTML = \`
    <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-running" style="font-size: 40px; color: var(--white);"></i>
        </div>
        <h1 style="font-size: clamp(24px, 5vw, 32px); margin: 0 0 12px 0; color: var(--text-primary);">Warm-Up & Stretch</h1>
        <p style="font-size: 18px; color: var(--text-secondary); margin: 0;">Prepare your body for \${workout.day_name || 'your workout'}</p>
      </div>
      
      <!-- Warmup Exercises -->
      <div class="card" style="margin-bottom: 32px;">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px; color: var(--text-primary);">
          <i class="fas fa-list-check" style="color: var(--primary);"></i> Recommended Warm-ups
        </h3>
        <div style="display: grid; gap: 12px;">
          \${warmups.slice(0, 6).map((warmup, idx) => \`
            <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px;">
              <div style="background: var(--primary); color: var(--white); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                \${idx + 1}
              </div>
              <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 4px; color: var(--text-primary);">\${warmup.name}</strong>
                <span style="color: var(--text-secondary); font-size: 13px;"><i class="fas fa-bullseye"></i> \${warmup.muscle}</span>
              </div>
              <span style="color: var(--text-secondary); font-size: 13px;">30-60 sec</span>
            </div>
          \`).join('')}
        </div>
      </div>
      
      <!-- Tips -->
      <div style="background: var(--primary-light); border-left: 4px solid var(--primary); border-radius: 8px; padding: 16px; margin-bottom: 32px;">
        <strong style="display: block; margin-bottom: 8px; color: var(--primary);"><i class="fas fa-lightbulb"></i> Pro Tips</strong>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8; color: var(--text-primary);">
          <li>Start with light cardio to raise your heart rate</li>
          <li>Focus on the muscles you'll be training today</li>
          <li>Perform dynamic stretches (movement-based)</li>
          <li>Take 5-10 minutes to properly warm up</li>
        </ul>
      </div>
      
      <!-- Actions -->
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-outline" onclick="cancelWorkoutStart()" style="min-width: 150px;">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button class="btn btn-primary" onclick="startWorkoutExercises()" style="min-width: 200px; font-size: 16px;">
          <i class="fas fa-check"></i> Ready - Start Workout
        </button>
      </div>
    </div>
  \`;
  
  document.body.appendChild(modal);
  
  // Set up event delegation for the modal (handles all button clicks)
  setupWorkoutModalEventDelegation(modal);
}

// Set up event delegation for workout modal buttons
function setupWorkoutModalEventDelegation(modal) {
  modal.addEventListener('click', function(e) {
    // Handle +/- set buttons
    const adjustBtn = e.target.closest('[data-adjust-sets]');
    if (adjustBtn) {
      e.preventDefault();
      e.stopPropagation();
      const exerciseId = parseInt(adjustBtn.getAttribute('data-exercise-id'));
      const adjustment = parseInt(adjustBtn.getAttribute('data-adjust-sets'));
      if (!isNaN(exerciseId) && !isNaN(adjustment)) {
        adjustTargetSets(exerciseId, adjustment);
      }
      return;
    }
    
    // Handle delete set buttons
    const deleteBtn = e.target.closest('[data-delete-set]');
    if (deleteBtn) {
      e.preventDefault();
      const exerciseId = parseInt(deleteBtn.getAttribute('data-exercise-id'));
      const setId = parseInt(deleteBtn.getAttribute('data-set-id'));
      if (!isNaN(exerciseId) && !isNaN(setId)) {
        deleteExerciseSet(exerciseId, setId);
      }
      return;
    }
    
    // Handle show history button
    const historyBtn = e.target.closest('[data-show-history]');
    if (historyBtn) {
      e.preventDefault();
      const exerciseId = parseInt(historyBtn.getAttribute('data-exercise-id'));
      const exerciseName = historyBtn.getAttribute('data-exercise-name');
      if (!isNaN(exerciseId) && exerciseName) {
        showExerciseHistory(exerciseId, exerciseName);
      }
      return;
    }
  });
}

// Restore body scroll after modal closes
function restoreBodyScroll() {
  const scrollY = document.body.style.top;
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  if (scrollY) {
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
  }
}

// Cancel workout start
function cancelWorkoutStart() {
  const modal = document.getElementById('workout-modal');
  if (modal) modal.remove();
  restoreBodyScroll();
  
  // Delete the workout that was created
  if (state.currentWorkout) {
    api(\`/workouts/\${state.currentWorkout.id}\`, { method: 'DELETE' });
    state.currentWorkout = null;
  }
}

// Resume workout in modal (when navigating back to an active workout)
async function resumeWorkoutModal() {
  // Check if modal already exists
  let modal = document.getElementById('workout-modal');
  
  // If modal doesn't exist, create it
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'workout-modal';
    modal.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-secondary);
      z-index: 10000;
      overflow-y: auto;
      padding: 20px;
      -webkit-overflow-scrolling: touch;
    \`;
    document.body.appendChild(modal);
    
    // Prevent background scrolling on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = \`-\${window.scrollY}px\`;
    
    // Set up event delegation for the modal
    setupWorkoutModalEventDelegation(modal);
  }
  
  // Initialize workout state if not exists
  if (!state.workoutExercise) {
    state.workoutExercise = {
      currentIndex: 0,
      completed: []
    };
  }
  
  // Fetch latest workout data first
  try {
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
    // Fetch historical data if not already loaded
    if (!state.exerciseHistory || Object.keys(state.exerciseHistory).length === 0) {
      await fetchHistoricalExerciseData();
    }
    
    // Start workout timer if not already started (use workout's actual start_time)
    if (!state.workoutTimer) {
      startWorkoutTimer(state.currentWorkout);
    }
    
    // Render tabbed exercise interface
    renderWorkoutExerciseTabs();
    
    // Enable keyboard shortcuts
    enableKeyboardShortcuts();
    
    showNotification('Workout resumed!', 'success');
    
  } catch (error) {
    showNotification('Error resuming workout: ' + error.message, 'error');
    console.error('Error resuming workout:', error);
  }
}

// Start workout exercises (after warmup)
async function startWorkoutExercises() {
  const modal = document.getElementById('workout-modal');
  if (!modal) return;
  
  // Initialize workout state
  if (!state.workoutExercise) {
    state.workoutExercise = {
      currentIndex: 0,
      completed: []
    };
  }
  
  // Initialize modifications tracking
  state.workoutModifications = { added: [], deleted: [] };
  
  // Fetch full workout data first
  try {
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
    // Fetch historical data for all exercises (last set from previous workouts)
    await fetchHistoricalExerciseData();
    
    // Start workout timer (use workout's actual start_time)
    if (!state.workoutTimer) {
      startWorkoutTimer(state.currentWorkout);
    }
    
    // Render tabbed exercise interface
    renderWorkoutExerciseTabs();
    
  } catch (error) {
    showNotification('Error loading workout: ' + error.message, 'error');
  }
}

// Fetch historical exercise data for pre-population
async function fetchHistoricalExerciseData() {
  if (!state.currentWorkout || !state.currentWorkout.exercises) return;
  
  state.exerciseHistory = {};
  
  // Fetch last set data for each exercise in parallel
  const promises = state.currentWorkout.exercises.map(async (exercise) => {
    try {
      const data = await api(\`/workouts/exercises/\${exercise.exercise_id}/last-set?currentWorkoutId=\${state.currentWorkout.id}\`);
      if (data.lastSet) {
        state.exerciseHistory[exercise.exercise_id] = data.lastSet;
      }
    } catch (error) {
      console.log(\`No history for exercise \${exercise.exercise_id}\`);
    }
  });
  
  await Promise.all(promises);
}

// Render tabbed exercise interface
function renderWorkoutExerciseTabs() {
  const modal = document.getElementById('workout-modal');
  if (!modal) return;
  
  const workout = state.currentWorkout;
  const currentIdx = state.workoutExercise.currentIndex;
  const currentExercise = workout.exercises[currentIdx];
  
  if (!currentExercise) {
    // All exercises complete - show summary
    window.showWorkoutSummary();
    return;
  }
  
  modal.innerHTML = \`
    <div style="display: flex; flex-direction: column; height: 100vh;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; padding: 20px; flex-shrink: 0;">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0 0 8px 0; color: white;">\${workout.day_name || 'Workout'}</h2>
            <div style="font-size: 14px; opacity: 0.9;">Exercise \${currentIdx + 1} of \${workout.exercises.length}</div>
          </div>
          <div id="workoutTimer" style="font-size: 24px; font-weight: bold; font-family: monospace;">00:00:00</div>
        </div>
      </div>
      
      <!-- Exercise Tabs -->
      <div style="background: var(--light); border-bottom: 2px solid var(--border); padding: 8px 0; overflow-x: auto; flex-shrink: 0;">
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; gap: 8px; align-items: center;">
          \${workout.exercises.map((ex, idx) => {
            const hasRecordedSets = ex.sets && ex.sets.length > 0;
            const isComplete = hasRecordedSets && ex.sets.length >= (ex.target_sets || 1);
            const isCurrent = idx === currentIdx;
            let bgColor = 'white';
            let textColor = 'var(--gray)';
            let opacity = '1';
            
            if (isCurrent) {
              bgColor = 'var(--primary)';
              textColor = 'white';
            } else if (isComplete) {
              bgColor = 'var(--secondary)';
              textColor = 'white';
            } else if (hasRecordedSets) {
              bgColor = 'var(--warning)';
              textColor = 'white';
            } else if (idx > currentIdx) {
              opacity = '0.5';
            }
            
            return \`
            <div style="display: flex; align-items: center; gap: 2px;">
              <button 
                onclick="switchToExercise(\${idx})"
                style="padding: 12px 20px; border: none; background: \${bgColor}; color: \${textColor}; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; opacity: \${opacity};">
                \${isComplete ? '<i class="fas fa-check"></i>' : ''} \${ex.name.length > 20 ? ex.name.substring(0, 20) + '...' : ex.name}
              </button>
              \${isCurrent ? \`
                <div style="display: flex; flex-direction: column; gap: 2px; margin-left: 4px;">
                  <button onclick="moveWorkoutExercise(\${idx}, -1)" \${idx === 0 ? 'disabled' : ''} 
                    style="padding: 4px 6px; border: none; background: \${idx === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)'}; color: \${idx === 0 ? 'var(--text-muted)' : 'var(--primary)'}; border-radius: 4px; cursor: \${idx === 0 ? 'not-allowed' : 'pointer'}; font-size: 10px;" title="Move up">
                    <i class="fas fa-chevron-up"></i>
                  </button>
                  <button onclick="moveWorkoutExercise(\${idx}, 1)" \${idx === workout.exercises.length - 1 ? 'disabled' : ''} 
                    style="padding: 4px 6px; border: none; background: \${idx === workout.exercises.length - 1 ? 'var(--bg-secondary)' : 'var(--bg-primary)'}; color: \${idx === workout.exercises.length - 1 ? 'var(--text-muted)' : 'var(--primary)'}; border-radius: 4px; cursor: \${idx === workout.exercises.length - 1 ? 'not-allowed' : 'pointer'}; font-size: 10px;" title="Move down">
                    <i class="fas fa-chevron-down"></i>
                  </button>
                </div>
              \` : ''}
            </div>
          \`}).join('')}
        </div>
      </div>
      
      <!-- Exercise Content -->
      <div style="flex: 1; overflow-y: auto; background: var(--light);">
        <div style="max-width: 1200px; margin: 0 auto; padding: 24px 20px;">
          \${renderExerciseContent(currentExercise, currentIdx)}
        </div>
      </div>
      
      <!-- Footer Actions - Mobile Optimized -->
      <div style="background: var(--bg-primary); border-top: 2px solid var(--border); padding: 12px 16px; flex-shrink: 0; box-shadow: 0 -2px 10px var(--shadow);">
        <div style="max-width: 1200px; margin: 0 auto;">
          <!-- Mobile: Stack buttons vertically, Desktop: horizontal -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Primary actions row -->
            <div style="display: flex; gap: 8px; justify-content: space-between; align-items: center;">
              <button class="btn btn-outline" onclick="previousExercise()" \${currentIdx === 0 ? 'disabled style="opacity: 0.5;"' : ''} style="flex: 1; max-width: 120px;">
                <i class="fas fa-arrow-left"></i> <span class="hide-mobile">Prev</span>
              </button>
              <button class="btn btn-primary" onclick="nextExercise()" style="flex: 2; max-width: 200px;">
                \${currentIdx === workout.exercises.length - 1 ? '<i class="fas fa-flag-checkered"></i> Finish Workout' : '<i class="fas fa-arrow-right"></i> Next Exercise'}
              </button>
            </div>
            <!-- Secondary actions row -->
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-outline" onclick="showWorkoutNotesModal()" title="Add workout notes" style="font-size: 13px; padding: 8px 12px;">
                <i class="fas fa-note-sticky"></i> <span class="hide-mobile">Notes</span>
              </button>
              <button class="btn btn-outline" onclick="showAddExercisesModal()" title="Add exercises" style="font-size: 13px; padding: 8px 12px;">
                <i class="fas fa-plus-circle"></i> <span class="hide-mobile">Add</span>
              </button>
              <button class="btn btn-outline" onclick="minimizeWorkout()" title="Return to dashboard" style="font-size: 13px; padding: 8px 12px;">
                <i class="fas fa-compress"></i> <span class="hide-mobile">Minimize</span>
              </button>
              <button class="btn btn-outline" onclick="endWorkoutEarly()" title="End workout" style="font-size: 13px; padding: 8px 12px; color: var(--danger); border-color: var(--danger);">
                <i class="fas fa-stop"></i> <span class="hide-mobile">End</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  \`;
  
  updateWorkoutTimerDisplay();
  
  // Auto-focus and attach event handlers (using event delegation pattern)
  setTimeout(() => {
    const weightInput = document.getElementById('newSetWeight');
    const repsInput = document.getElementById('newSetReps');
    const logButton = document.getElementById('logSetButton');
    
    // Helper to clear pre-populated styling when user types
    function clearPrePopulatedStyle(input) {
      if (input && input.dataset.prepopulated === 'true') {
        input.style.color = 'var(--text-primary)';
        input.style.fontStyle = 'normal';
        input.style.borderColor = 'var(--border)';
        input.dataset.prepopulated = 'false';
      }
    }
    
    // Focus on weight input
    if (weightInput) {
      weightInput.focus();
      
      // Clear pre-populated style on input
      weightInput.oninput = function() {
        clearPrePopulatedStyle(this);
      };
      
      // Simple Enter key navigation (no need to clone - this element is fresh from render)
      weightInput.onkeydown = function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const reps = document.getElementById('newSetReps');
          if (reps) reps.focus();
        }
      };
    }
    
    // Handle Enter key in reps field
    if (repsInput) {
      // Clear pre-populated style on input
      repsInput.oninput = function() {
        clearPrePopulatedStyle(this);
      };
      
      repsInput.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (isAddingSet) return;
          const btn = document.getElementById('logSetButton');
          if (btn) btn.click();
        }
      };
    }
    
    // Attach button click handler
    if (logButton) {
      logButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const exerciseId = parseInt(this.getAttribute('data-exercise-id'));
        if (!isNaN(exerciseId)) {
          addExerciseSet(exerciseId);
        }
      };
    }
    
    // Restore rest timer display if it was active
    if (state.restTimerActive && state.restTimeRemaining > 0) {
      updateRestTimerDisplay();
    }
    
  }, 0); // Changed to 0 - no need to wait, elements are immediately available
  // Note: +/- set buttons use event delegation on the modal (setupWorkoutModalEventDelegation)
}

// Render exercise content with set table
function renderExerciseContent(exercise, index) {
  const weightUnit = getWeightUnit();
  const completedSets = (exercise.sets || []).length;
  const targetSets = exercise.target_sets || 3;
  const showNewSetRow = completedSets < targetSets && completedSets < 10;
  
  // Pre-populate from historical data (previous workout) or current workout's last set
  let defaultWeight = '';
  let defaultReps = exercise.target_reps || '';
  
  // First priority: use last set from current workout if exists
  const currentLastSet = exercise.sets && exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1] : null;
  // Second priority: use historical data from previous workouts
  const historicalSet = state.exerciseHistory && state.exerciseHistory[exercise.exercise_id];
  
  const sourceSet = currentLastSet || historicalSet;
  
  // Determine styling: 
  // - First set (no sets logged yet) + historical data = light grey italic (pre-populated from history)
  // - Subsequent sets (sets already logged) = black italic (from current workout)
  // - No source data = black normal
  const isFirstSet = !currentLastSet;
  const hasHistoricalData = isFirstSet && historicalSet;
  const hasCurrentData = currentLastSet;
  
  if (sourceSet) {
    if (sourceSet.weight_kg) {
      const weightValue = isImperialSystem() ? kgToLbs(sourceSet.weight_kg) : sourceSet.weight_kg;
      defaultWeight = weightValue % 1 === 0 ? String(weightValue) : weightValue.toFixed(1);
    }
    if (sourceSet.reps) {
      defaultReps = sourceSet.reps;
    }
  }
  
  // Style for input values:
  // - Historical pre-populated (first set): very light grey, italic
  // - Current workout data (subsequent sets): black, italic  
  // - No data: black, normal
  let inputTextStyle = 'color: var(--text-primary);';
  if (hasHistoricalData) {
    inputTextStyle = 'color: #999; font-style: italic;'; // Light grey italic for historical
  } else if (hasCurrentData) {
    inputTextStyle = 'color: var(--text-primary); font-style: italic;'; // Black italic for current workout
  }
  
  return \`
    <!-- Exercise Header -->
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; flex-wrap: wrap; gap: 16px;">
        <div style="flex: 1; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <h2 style="margin: 0; font-size: clamp(18px, 4vw, 24px);">\${exercise.name}</h2>
            \${exercise.is_added ? '<span style="background: var(--warning); color: var(--white); padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">ADDED</span>' : ''}
            <button onclick="deleteExerciseFromWorkoutModal(\${exercise.id}, '\${exercise.name.replace(/'/g, "\\\\'")}')" 
              style="margin-left: auto; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 14px; padding: 4px 8px; opacity: 0.6;"
              title="Remove exercise">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <span style="background: var(--secondary-light); color: var(--secondary); padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">
              <i class="fas fa-bullseye"></i> \${exercise.muscle_group}
            </span>
            <span style="background: var(--primary-light); color: var(--primary); padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">
              <i class="fas fa-dumbbell"></i> \${exercise.equipment}
            </span>
            \${exercise.is_unilateral ? '<span style="background: var(--warning); color: var(--white); padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;"><i class="fas fa-balance-scale"></i> Unilateral</span>' : ''}
            <button class="btn btn-outline" data-show-history="true" data-exercise-id="\${exercise.exercise_id || exercise.id}" data-exercise-name="\${exercise.name.replace(/"/g, '&quot;')}" 
              style="padding: 6px 12px; font-size: 13px; margin-left: auto;">
              <i class="fas fa-chart-line"></i> History
            </button>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-bottom: 8px;">
            <button data-adjust-sets="-1" data-exercise-id="\${exercise.id}" class="btn btn-outline" style="padding: 6px 10px; min-width: auto;" title="Decrease target sets">
              <i class="fas fa-minus"></i>
            </button>
            <div style="font-size: clamp(24px, 6vw, 36px); font-weight: bold; color: var(--primary);">\${completedSets}/\${targetSets}</div>
            <button data-adjust-sets="1" data-exercise-id="\${exercise.id}" class="btn btn-primary" style="padding: 6px 10px; min-width: auto;" title="Increase target sets">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Sets Target</div>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div style="background: var(--light); height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%); height: 100%; width: \${Math.min((completedSets / targetSets) * 100, 100)}%; transition: width 0.3s;"></div>
      </div>
    </div>
    
    <!-- Inline Rest Timer (visible when active) -->
    <div id="inline-rest-timer" style="display: none; margin-bottom: 20px;">
      <div class="card" style="background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); color: var(--white); text-align: center; padding: 20px;">
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;"><i class="fas fa-clock"></i> Rest Timer</div>
        <div id="inline-rest-time" style="font-size: clamp(36px, 10vw, 56px); font-weight: bold; font-family: monospace; line-height: 1;">0:00</div>
        <div style="display: flex; gap: 8px; margin-top: 16px; justify-content: center; flex-wrap: wrap;">
          <button class="btn" onclick="adjustRestTimer(-15)" style="background: rgba(255,255,255,0.2); color: var(--white); border: none; padding: 8px 16px; font-size: 14px;">-15s</button>
          <button class="btn" onclick="skipRestTimer()" style="background: var(--white); color: var(--primary); border: none; padding: 8px 20px; font-size: 14px; font-weight: 600;">Skip</button>
          <button class="btn" onclick="adjustRestTimer(15)" style="background: rgba(255,255,255,0.2); color: var(--white); border: none; padding: 8px 16px; font-size: 14px;">+15s</button>
        </div>
      </div>
    </div>
    
    <!-- Exercise Tips -->
    \${exercise.tips ? \`
      <div class="card" style="margin-bottom: 20px;">
        <details>
          <summary style="cursor: pointer; font-weight: 600; color: var(--primary); user-select: none; font-size: 16px;">
            <i class="fas fa-lightbulb"></i> Form & Technique Tips
          </summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); line-height: 1.6; color: var(--text-primary);">
            \${exercise.tips}
          </div>
        </details>
      </div>
    \` : ''}
    
    <!-- Set Table - Mobile Optimized -->
    <div class="card">
      <h3 style="margin: 0 0 16px 0; color: var(--text-primary);"><i class="fas fa-table"></i> Set Tracker</h3>
      
      <!-- Mobile-friendly set cards -->
      <div class="set-list" style="display: flex; flex-direction: column; gap: 12px;">
        \${(exercise.sets || []).map((set, idx) => \`
          <div class="set-card" style="background: var(--secondary-light); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="background: var(--secondary); color: var(--white); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
              \${set.set_number}
            </div>
            <div style="flex: 1; display: flex; gap: 16px; flex-wrap: wrap; min-width: 150px;">
              <div>
                <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Weight</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--text-primary);">\${formatWeight(set.weight_kg, system)}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Reps</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--text-primary);">\${set.reps}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Est. 1RM</div>
                <div style="font-size: 14px; color: var(--text-secondary);">\${formatWeight(set.one_rep_max_kg, system)}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn btn-outline" onclick="editSet(\${exercise.id}, \${set.id}, \${set.weight_kg || 0}, \${set.reps || 0})" style="padding: 6px 10px; font-size: 12px; color: var(--primary); border-color: var(--primary);">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button class="btn btn-outline" data-delete-set="true" data-exercise-id="\${exercise.id}" data-set-id="\${set.id}" style="padding: 6px 10px; font-size: 12px; color: var(--danger); border-color: var(--danger);">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        \`).join('')}
        
        \${showNewSetRow ? \`
          <!-- New Set Input -->
          <div class="new-set-card" style="background: var(--bg-primary); border: 2px dashed var(--primary); border-radius: 12px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="background: var(--primary-light); color: var(--primary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                \${completedSets + 1}
              </div>
              <div style="font-weight: 600; color: var(--text-primary);">Log Next Set</div>
            </div>
            \${hasHistoricalData ? '<div style="font-size: 11px; color: var(--primary); margin-bottom: 8px; text-align: center;"><i class="fas fa-history"></i> Pre-filled from last workout</div>' : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Weight (\${weightUnit})</label>
                <input type="number" id="newSetWeight" value="\${defaultWeight}" placeholder="0" step="\${getWeightStep()}" 
                  data-prepopulated="\${hasHistoricalData}"
                  style="width: 100%; padding: 12px; border: 2px solid \${hasHistoricalData ? 'var(--primary)' : 'var(--border)'}; border-radius: 8px; font-size: 18px; font-weight: bold; background: var(--bg-secondary); \${inputTextStyle}">
              </div>
              <div>
                <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Reps</label>
                <input type="number" id="newSetReps" value="\${defaultReps}" placeholder="0" min="1"
                  data-prepopulated="\${hasHistoricalData}"
                  style="width: 100%; padding: 12px; border: 2px solid \${hasHistoricalData ? 'var(--primary)' : 'var(--border)'}; border-radius: 8px; font-size: 18px; font-weight: bold; background: var(--bg-secondary); \${inputTextStyle}">
              </div>
            </div>
            <button class="btn btn-primary" id="logSetButton" data-exercise-id="\${exercise.id}" style="width: 100%; padding: 14px; font-size: 16px;">
              <i class="fas fa-plus"></i> Log Set
            </button>
          </div>
        \` : ''}
      </div>
      
      \${completedSets >= targetSets ? \`
        <div style="margin-top: 16px; padding: 16px; background: var(--secondary-light); border-radius: 12px; text-align: center;">
          <i class="fas fa-check-circle" style="font-size: 28px; color: var(--secondary); margin-bottom: 8px; display: block;"></i>
          <div style="font-weight: 600; color: var(--secondary); font-size: 16px;">Target Sets Complete!</div>
          <div style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">Ready to move on or add more sets</div>
          \${completedSets < 10 ? \`
            <button class="btn btn-outline" onclick="showExtraSetInput(\${exercise.id})" style="margin-top: 12px;">
              <i class="fas fa-plus"></i> Add Another Set
            </button>
          \` : ''}
        </div>
      \` : ''}
    </div>
  \`;
}

// Add set to exercise
async function addExerciseSet(exerciseId) {
  // Prevent concurrent execution
  if (isAddingSet) {
    console.log('Already processing a set, ignoring duplicate call');
    return;
  }
  
  isAddingSet = true;
  
  const weightInput = document.getElementById('newSetWeight');
  const repsInput = document.getElementById('newSetReps');
  const logButton = document.getElementById('logSetButton');
  
  // Disable button to prevent duplicate clicks
  if (logButton) {
    logButton.disabled = true;
    logButton.style.opacity = '0.5';
    logButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging...';
  }
  
  // Check if inputs exist
  if (!weightInput || !repsInput) {
    showNotification('Error: Input fields not found. Please refresh the page.', 'error');
    console.error('Missing input elements:', { weightInput, repsInput });
    isAddingSet = false;
    if (logButton) {
      logButton.disabled = false;
      logButton.style.opacity = '1';
      logButton.innerHTML = '<i class="fas fa-plus"></i> Log Set';
    }
    return;
  }

  let weight = parseFloat(weightInput.value);
  const reps = parseInt(repsInput.value);
  
  if (!weight || !reps || isNaN(weight) || isNaN(reps)) {
    showNotification('Please enter valid weight and reps', 'warning');
    isAddingSet = false;
    if (logButton) {
      logButton.disabled = false;
      logButton.style.opacity = '1';
      logButton.innerHTML = '<i class="fas fa-plus"></i> Log Set';
    }
    return;
  }
  
  // Convert to kg if imperial
  if (isImperialSystem()) {
    weight = lbsToKg(weight);
  }
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/sets\`, {
      method: 'POST',
      body: JSON.stringify({ weight_kg: weight, reps, rest_seconds: 90 })
    });
    
    // Refresh workout data
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
    showNotification('Set logged!', 'success');
    
    // Start rest timer after logging set
    startRestTimer(90);
    
    // Reset flag BEFORE re-rendering to prevent issues
    isAddingSet = false;
    
    // Defer re-render to next tick to completely clear call stack
    // This prevents the new button's onclick from firing during render
    setTimeout(() => {
      renderWorkoutExerciseTabs();
      
      // Auto-advance if target sets reached
      const currentExercise = state.currentWorkout.exercises[state.workoutExercise.currentIndex];
      const completedSets = (currentExercise.sets || []).length;
      const targetSets = currentExercise.target_sets || 3;
      const isLastExercise = state.workoutExercise.currentIndex === state.currentWorkout.exercises.length - 1;
      
      if (completedSets >= targetSets) {
        setTimeout(() => {
          const message = isLastExercise 
            ? 'Target sets complete! Finish workout?' 
            : 'Target sets complete! Move to next exercise?';
          if (confirm(message)) {
            nextExercise();
          }
        }, 500);
      }
    }, 0);
    
  } catch (error) {
    console.error('Error logging set:', error);
    showNotification('Error logging set: ' + error.message, 'error');
    isAddingSet = false;
    // Re-enable button on error
    if (logButton) {
      logButton.disabled = false;
      logButton.style.opacity = '1';
      logButton.innerHTML = '<i class="fas fa-plus"></i> Log Set';
    }
  }
}

// Adjust target sets for an exercise during workout
async function adjustTargetSets(exerciseId, adjustment) {
  const exercise = state.currentWorkout.exercises.find(ex => ex.id === exerciseId);
  if (!exercise) return;
  
  const newTarget = (exercise.target_sets || 3) + adjustment;
  
  // Minimum 1 set, maximum 10 sets
  if (newTarget < 1 || newTarget > 10) {
    showNotification(\`Target sets must be between 1 and 10\`, 'warning');
    return;
  }
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/target-sets\`, {
      method: 'PATCH',
      body: JSON.stringify({ target_sets: newTarget })
    });
    
    // Update local state
    exercise.target_sets = newTarget;
    
    // Re-render to show new target
    renderWorkoutExerciseTabs();
    
    showNotification(\`Target sets \${adjustment > 0 ? 'increased' : 'decreased'} to \${newTarget}\`, 'success');
  } catch (error) {
    showNotification('Error updating target sets: ' + error.message, 'error');
  }
}

// Delete set from exercise
async function deleteExerciseSet(exerciseId, setId) {
  if (!confirm('Delete this set?')) return;
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/sets/\${setId}\`, {
      method: 'DELETE'
    });
    
    // Refresh workout data
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
    // Re-render
    renderWorkoutExerciseTabs();
    
    showNotification('Set deleted', 'success');
    
  } catch (error) {
    showNotification('Error deleting set: ' + error.message, 'error');
  }
}

// Switch to specific exercise
function switchToExercise(index) {
  state.workoutExercise.currentIndex = index;
  renderWorkoutExerciseTabs();
}

// Next exercise
function nextExercise() {
  const nextIndex = state.workoutExercise.currentIndex + 1;
  if (nextIndex >= state.currentWorkout.exercises.length) {
    // Workout complete
    window.showWorkoutSummary();
  } else {
    state.workoutExercise.currentIndex = nextIndex;
    renderWorkoutExerciseTabs();
  }
}

// Previous exercise
function previousExercise() {
  if (state.workoutExercise.currentIndex > 0) {
    state.workoutExercise.currentIndex--;
    renderWorkoutExerciseTabs();
  }
}

// Move workout exercise up or down
async function moveWorkoutExercise(index, direction) {
  const exercises = state.currentWorkout.exercises;
  const newIndex = index + direction;
  
  // Validate bounds
  if (newIndex < 0 || newIndex >= exercises.length) return;
  
  // Swap exercises in local state
  const temp = exercises[index];
  exercises[index] = exercises[newIndex];
  exercises[newIndex] = temp;
  
  // Update current index to follow the moved exercise
  state.workoutExercise.currentIndex = newIndex;
  
  // Re-render immediately for responsive UI
  renderWorkoutExerciseTabs();
  
  // Build exercise orders array for API
  const exerciseOrders = exercises.map((ex, idx) => ({
    id: ex.id,
    order_index: idx
  }));
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/reorder\`, {
      method: 'PATCH',
      body: JSON.stringify({ exerciseOrders })
    });
    
    showNotification(\`Exercise moved \${direction < 0 ? 'up' : 'down'}\`, 'success');
  } catch (error) {
    // Revert on failure
    exercises[newIndex] = exercises[index];
    exercises[index] = temp;
    state.workoutExercise.currentIndex = index;
    renderWorkoutExerciseTabs();
    showNotification('Failed to reorder exercise: ' + error.message, 'error');
  }
}

// End workout early
function endWorkoutEarly() {
  if (confirm('Are you sure you want to end this workout? Your progress will be saved.')) {
    window.showWorkoutSummary();
  }
}

// Minimize workout - return to dashboard while keeping workout active
function minimizeWorkout() {
  const modal = document.getElementById('workout-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  restoreBodyScroll();
  
  // Stop the rest timer display but keep workout state
  if (state.restTimerInterval) {
    clearInterval(state.restTimerInterval);
    state.restTimerInterval = null;
  }
  
  showNotification('Workout minimized. Resume from dashboard.', 'info');
  switchTab('dashboard');
}

// Show extra set input when target is already reached
function showExtraSetInput(exerciseId) {
  // Re-render with the input shown by temporarily adjusting target
  const exercise = state.currentWorkout.exercises.find(ex => ex.id === exerciseId);
  if (exercise) {
    // Increase target by 1 to show the input
    exercise.target_sets = (exercise.target_sets || 3) + 1;
    renderWorkoutExerciseTabs();
  }
}

// Show add exercises modal
async function showAddExercisesModal() {
  // Fetch all available exercises
  try {
    const data = await api('/exercises');
    const exercises = data.exercises || [];
    
    // Group exercises by muscle group
    const grouped = {};
    exercises.forEach(ex => {
      const group = ex.muscle_group || 'Other';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(ex);
    });
    
    // Get current workout exercise IDs to mark already added
    const currentExerciseIds = new Set(state.currentWorkout.exercises.map(e => e.exercise_id));
    
    // Store for selection tracking
    state.addExerciseSelection = new Set();
    
    const overlay = document.createElement('div');
    overlay.id = 'add-exercises-overlay';
    overlay.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    \`;
    
    overlay.innerHTML = \`
      <div style="background: var(--bg-primary); border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border);">
        <!-- Header -->
        <div style="padding: 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0; color: var(--text-primary);"><i class="fas fa-plus-circle"></i> Add Exercises</h2>
            <button onclick="closeAddExercisesModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary);">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <!-- Search -->
          <div style="position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
            <input type="text" id="exerciseSearchInput" placeholder="Search exercises..." 
              style="width: 100%; padding: 12px 12px 12px 40px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--bg-secondary); color: var(--text-primary);"
              oninput="filterExerciseList(this.value)">
          </div>
          
          <!-- Selection count -->
          <div id="exerciseSelectionCount" style="margin-top: 12px; font-size: 14px; color: var(--text-secondary);">
            <span id="selectedCount">0</span> exercise(s) selected
          </div>
        </div>
        
        <!-- Exercise List -->
        <div id="exerciseListContainer" style="flex: 1; overflow-y: auto; padding: 16px; background: var(--bg-secondary);">
          \${Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([group, exs]) => \`
            <div class="exercise-group" data-group="\${group}">
              <h4 style="margin: 0 0 12px 0; color: var(--primary); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                <i class="fas fa-dumbbell"></i> \${group} (\${exs.length})
              </h4>
              <div style="display: grid; gap: 8px; margin-bottom: 20px;">
                \${exs.map(ex => \`
                  <label class="exercise-item" data-exercise-id="\${ex.id}" data-name="\${ex.name.toLowerCase()}" 
                    style="display: flex; align-items: center; gap: 12px; padding: 12px; background: \${currentExerciseIds.has(ex.id) ? 'var(--light)' : 'var(--bg-primary)'}; border: 2px solid var(--border); border-radius: 8px; cursor: \${currentExerciseIds.has(ex.id) ? 'not-allowed' : 'pointer'}; transition: all 0.2s; \${currentExerciseIds.has(ex.id) ? 'opacity: 0.6;' : ''}">
                    <input type="checkbox" data-exercise-id="\${ex.id}" 
                      \${currentExerciseIds.has(ex.id) ? 'disabled checked' : ''}
                      onchange="toggleExerciseSelection(\${ex.id}, this.checked)"
                      style="width: 20px; height: 20px; accent-color: var(--primary);">
                    <div style="flex: 1;">
                      <div style="font-weight: 600; color: var(--text-primary);">\${ex.name}</div>
                      <div style="font-size: 12px; color: var(--text-secondary);">\${ex.equipment || 'Bodyweight'}</div>
                    </div>
                    \${currentExerciseIds.has(ex.id) ? '<span style="font-size: 12px; color: var(--secondary); font-weight: 600;">Already in workout</span>' : ''}
                  </label>
                \`).join('')}
              </div>
            </div>
          \`).join('')}
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 20px; border-top: 1px solid var(--border); background: var(--light); flex-shrink: 0;">
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn btn-outline" onclick="closeAddExercisesModal()">Cancel</button>
            <button class="btn btn-primary" id="addSelectedExercisesBtn" onclick="addSelectedExercises()" disabled>
              <i class="fas fa-plus"></i> Add Selected (<span id="addBtnCount">0</span>)
            </button>
          </div>
        </div>
      </div>
    \`;
    
    document.body.appendChild(overlay);
    
    // Focus search input
    setTimeout(() => {
      const searchInput = document.getElementById('exerciseSearchInput');
      if (searchInput) searchInput.focus();
    }, 100);
    
  } catch (error) {
    showNotification('Error loading exercises: ' + error.message, 'error');
  }
}

// Close add exercises modal
function closeAddExercisesModal() {
  const overlay = document.getElementById('add-exercises-overlay');
  if (overlay) overlay.remove();
  state.addExerciseSelection = null;
}

// Toggle exercise selection
function toggleExerciseSelection(exerciseId, isSelected) {
  if (!state.addExerciseSelection) state.addExerciseSelection = new Set();
  
  if (isSelected) {
    state.addExerciseSelection.add(exerciseId);
  } else {
    state.addExerciseSelection.delete(exerciseId);
  }
  
  // Update UI
  const count = state.addExerciseSelection.size;
  const countSpan = document.getElementById('selectedCount');
  const btnCount = document.getElementById('addBtnCount');
  const addBtn = document.getElementById('addSelectedExercisesBtn');
  
  if (countSpan) countSpan.textContent = count;
  if (btnCount) btnCount.textContent = count;
  if (addBtn) addBtn.disabled = count === 0;
  
  // Highlight selected items
  const item = document.querySelector(\`.exercise-item[data-exercise-id="\${exerciseId}"]\`);
  if (item && !item.querySelector('input:disabled')) {
    item.style.borderColor = isSelected ? 'var(--primary)' : 'var(--border)';
    item.style.background = isSelected ? 'var(--primary-light)' : 'white';
  }
}

// Filter exercise list by search
function filterExerciseList(query) {
  const items = document.querySelectorAll('.exercise-item');
  const groups = document.querySelectorAll('.exercise-group');
  const lowerQuery = query.toLowerCase().trim();
  
  items.forEach(item => {
    const name = item.getAttribute('data-name') || '';
    const matches = !lowerQuery || name.includes(lowerQuery);
    item.style.display = matches ? 'flex' : 'none';
  });
  
  // Hide empty groups
  groups.forEach(group => {
    const visibleItems = group.querySelectorAll('.exercise-item[style*="display: flex"], .exercise-item:not([style*="display"])');
    const hasVisible = Array.from(group.querySelectorAll('.exercise-item')).some(item => item.style.display !== 'none');
    group.style.display = hasVisible ? 'block' : 'none';
  });
}

// Add selected exercises to workout
async function addSelectedExercises() {
  if (!state.addExerciseSelection || state.addExerciseSelection.size === 0) return;
  
  const exerciseIds = Array.from(state.addExerciseSelection);
  const addBtn = document.getElementById('addSelectedExercisesBtn');
  
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  }
  
  try {
    const result = await api(\`/workouts/\${state.currentWorkout.id}/add-exercises\`, {
      method: 'POST',
      body: JSON.stringify({ exercise_ids: exerciseIds })
    });
    
    // Track the additions for program update prompt
    if (!state.workoutModifications) {
      state.workoutModifications = { added: [], deleted: [] };
    }
    
    // Get exercise names for the added exercises and fetch historical data
    if (result.exercises) {
      for (const ex of result.exercises) {
        state.workoutModifications.added.push({
          exercise_id: ex.exercise_id,
          name: ex.name
        });
        
        // Fetch historical data for newly added exercises
        try {
          const histData = await api(\`/workouts/exercises/\${ex.exercise_id}/last-set?currentWorkoutId=\${state.currentWorkout.id}\`);
          if (histData.lastSet) {
            if (!state.exerciseHistory) state.exerciseHistory = {};
            state.exerciseHistory[ex.exercise_id] = histData.lastSet;
          }
        } catch (e) {
          console.log(\`No history for added exercise \${ex.exercise_id}\`);
        }
      }
    }
    
    // Refresh workout data
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
    // Track that exercises were manually added (for save to program prompt)
    state.workoutModified = true;
    
    closeAddExercisesModal();
    renderWorkoutExerciseTabs();
    
    showNotification(result.message || \`Added \${exerciseIds.length} exercise(s)\`, 'success');
    
  } catch (error) {
    showNotification('Error adding exercises: ' + error.message, 'error');
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.innerHTML = \`<i class="fas fa-plus"></i> Add Selected (<span id="addBtnCount">\${exerciseIds.length}</span>)\`;
    }
  }
}

// Show workout summary
async function showWorkoutSummary() {
  const modal = document.getElementById('workout-modal');
  if (!modal) return;
  
  // Stop timers
  if (state.workoutTimer) {
    clearInterval(state.workoutTimer);
    state.workoutTimer = null;
  }
  
  // Complete the workout
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/complete\`, {
      method: 'POST'
    });
    
    // Get final workout data
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    const workout = data.workout;
    
    // Calculate stats
    const totalSets = workout.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const totalVolume = workout.exercises.reduce((sum, ex) => {
      const multiplier = ex.is_unilateral ? 2 : 1;
      return sum + (ex.sets || []).reduce((exSum, set) => exSum + (set.weight_kg * set.reps * multiplier), 0);
    }, 0);
    const duration = workout.total_duration_seconds || 0;
    
    // Fun comparisons
    const comparison = getFunWeightComparison(totalVolume);
    
    // Ensure modal is visible and properly styled for summary
    modal.style.display = 'block';
    modal.style.overflow = 'auto';
    
    modal.innerHTML = \`
      <div style="max-width: 900px; margin: 0 auto; padding: clamp(20px, 5vw, 40px) 16px; min-height: 100vh;">
        <!-- Success Icon -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: clamp(70px, 15vw, 100px); height: clamp(70px, 15vw, 100px); background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-trophy" style="font-size: clamp(30px, 8vw, 50px); color: var(--white);"></i>
          </div>
          <h1 style="font-size: clamp(24px, 6vw, 36px); margin: 0 0 8px 0; color: var(--text-primary);">Workout Complete!</h1>
          <p style="font-size: clamp(14px, 4vw, 18px); color: var(--text-secondary); margin: 0;">Outstanding work today 💪</p>
        </div>
        
        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
          <div class="card" style="text-align: center; padding: 16px;">
            <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Duration</div>
            <div style="font-size: clamp(20px, 5vw, 32px); font-weight: bold; color: var(--primary);">\${formatDuration(duration)}</div>
          </div>
          <div class="card" style="text-align: center; padding: 16px;">
            <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Sets</div>
            <div style="font-size: clamp(20px, 5vw, 32px); font-weight: bold; color: var(--primary);">\${totalSets}</div>
          </div>
          <div class="card" style="text-align: center; padding: 16px;">
            <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Volume</div>
            <div style="font-size: clamp(20px, 5vw, 32px); font-weight: bold; color: var(--primary);">\${formatWeight(totalVolume)}</div>
          </div>
        </div>
        
        <!-- Fun Comparison -->
        <div class="card" style="background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%); border: none; margin-bottom: 24px; padding: 16px;">
          <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div style="font-size: clamp(40px, 10vw, 60px);">\${comparison.emoji}</div>
            <div style="flex: 1; min-width: 150px;">
              <div style="font-size: clamp(16px, 4vw, 20px); font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">\${comparison.title}</div>
              <div style="font-size: clamp(13px, 3vw, 16px); color: var(--text-secondary);">\${comparison.description}</div>
            </div>
          </div>
        </div>
        
        <!-- Exercise Summary -->
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 16px;"><i class="fas fa-list-check" style="color: var(--primary);"></i> Exercise Summary</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            \${workout.exercises.map((ex, idx) => \`
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-secondary); border-radius: 8px; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                  <div style="background: var(--primary); color: var(--white); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; flex-shrink: 0;">
                    \${idx + 1}
                  </div>
                  <strong style="color: var(--text-primary); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${ex.name}</strong>
                </div>
                <span style="color: var(--text-secondary); font-size: 13px; white-space: nowrap;">\${(ex.sets || []).length} sets</span>
              </div>
            \`).join('')}
          </div>
        </div>
        
        <!-- Perceived Exertion -->
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 16px;"><i class="fas fa-gauge-high" style="color: var(--primary);"></i> Rate Your Effort</h3>
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 12px; font-weight: 600; color: var(--secondary);">Easy</span>
            <div style="flex: 1; position: relative;">
              <input type="range" id="perceivedExertion" min="1" max="10" value="5" step="1" 
                style="width: 100%; height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--secondary) 0%, var(--warning) 50%, var(--danger) 100%); outline: none; -webkit-appearance: none; appearance: none;">
            </div>
            <span style="font-size: 12px; font-weight: 600; color: var(--danger);">Hard</span>
          </div>
          
          <div style="text-align: center; margin-top: 12px;">
            <div id="exertionDisplay" style="font-size: 20px; font-weight: bold; color: var(--primary);">5/10</div>
          </div>
        </div>
        
        <!-- Save to Program (if modified) -->
        \${(state.workoutModifications && (state.workoutModifications.added.length > 0 || state.workoutModifications.deleted.length > 0) && workout.program_day_id) ? \`
        <div class="card" style="margin-bottom: 24px; border: 2px solid var(--primary); background: var(--primary-light);">
          <h4 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 15px;">
            <i class="fas fa-sync-alt" style="color: var(--primary);"></i> Update Program?
          </h4>
          <p style="margin: 0 0 12px 0; color: var(--text-secondary); font-size: 13px;">
            You made changes to this workout. Would you like to update your program to reflect these changes for future workouts?
          </p>
          
          \${state.workoutModifications.added.length > 0 ? \`
          <div style="margin-bottom: 8px;">
            <div style="font-size: 12px; color: var(--secondary); font-weight: 600; margin-bottom: 4px;">
              <i class="fas fa-plus-circle"></i> Added Exercises:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              \${state.workoutModifications.added.map(ex => \`
                <span style="background: var(--secondary-light); color: var(--secondary); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;">\${ex.name}</span>
              \`).join('')}
            </div>
          </div>
          \` : ''}
          
          \${state.workoutModifications.deleted.length > 0 ? \`
          <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; color: var(--danger); font-weight: 600; margin-bottom: 4px;">
              <i class="fas fa-minus-circle"></i> Removed Exercises:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              \${state.workoutModifications.deleted.map(ex => \`
                <span style="background: rgba(220, 53, 69, 0.1); color: var(--danger); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;">\${ex.name}</span>
              \`).join('')}
            </div>
          </div>
          \` : ''}
          
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-outline" onclick="skipProgramUpdate()" style="flex: 1;">
              Skip
            </button>
            <button class="btn btn-primary" onclick="saveWorkoutToProgram()" id="saveToProgramBtn" style="flex: 1;">
              <i class="fas fa-save"></i> Update Program
            </button>
          </div>
        </div>
        \` : ''}
        
        <!-- Actions -->
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; padding-bottom: 20px;">
          <button class="btn btn-outline" onclick="deleteCompletedWorkout()" style="flex: 1; max-width: 180px;">
            <i class="fas fa-trash"></i> Delete
          </button>
          <button class="btn btn-primary" onclick="finishWorkoutSummary()" style="flex: 1; max-width: 200px; font-size: 16px;">
            <i class="fas fa-check"></i> Done
          </button>
        </div>
      </div>
    \`;
    
    // Add event listener for perceived exertion slider
    setTimeout(() => {
      const slider = document.getElementById('perceivedExertion');
      const display = document.getElementById('exertionDisplay');
      if (slider && display) {
        slider.oninput = function() {
          display.textContent = \`\${this.value}/10\`;
          // Store the value for later saving
          state.perceivedExertion = parseInt(this.value);
        };
      }
    }, 0);
    
  } catch (error) {
    showNotification('Error completing workout: ' + error.message, 'error');
  }
}

// Get fun weight comparison
function getFunWeightComparison(totalKg) {
  const comparisons = [
    { threshold: 0, emoji: '🎈', title: 'Great Start!', description: \`You lifted the equivalent of \${Math.round(totalKg / 0.45)} basketballs!\` },
    { threshold: 500, emoji: '🦁', title: 'Beast Mode!', description: \`You lifted the equivalent of \${Math.round(totalKg / 190)} adult lions!\` },
    { threshold: 1000, emoji: '🐻', title: 'Incredible Power!', description: \`You lifted more than \${Math.round(totalKg / 200)} grizzly bears!\` },
    { threshold: 2000, emoji: '🚗', title: 'Superhuman Strength!', description: \`You lifted the equivalent of \${(totalKg / 1500).toFixed(1)} compact cars!\` },
    { threshold: 3000, emoji: '🦏', title: 'Absolutely Insane!', description: \`You lifted \${(totalKg / 2000).toFixed(1)} rhinoceroses worth of weight!\` },
    { threshold: 5000, emoji: '🐘', title: 'Legendary Performance!', description: \`You lifted \${(totalKg / 5000).toFixed(1)} elephants! That's phenomenal!\` }
  ];
  
  for (let i = comparisons.length - 1; i >= 0; i--) {
    if (totalKg >= comparisons[i].threshold) {
      return comparisons[i];
    }
  }
  
  return comparisons[0];
}

// Get emoji for perceived exertion level
function getExertionEmoji(level) {
  if (level <= 2) return '😊';
  if (level <= 4) return '🙂';
  if (level <= 6) return '😤';
  if (level <= 8) return '💪';
  return '🔥';
}

// Delete completed workout from summary
async function deleteCompletedWorkout() {
  if (!confirm('Are you sure you want to delete this workout? This cannot be undone.')) return;
  
  const workoutId = state.currentWorkout.id;
  
  try {
    await api(\`/workouts/\${workoutId}\`, {
      method: 'DELETE'
    });
    
    showNotification('Workout deleted', 'success');
    
    // Clear workout state
    state.currentWorkout = null;
    state.workoutExercise = null;
    state.workoutNotes = '';
    
    // Close modal
    const modal = document.getElementById('workout-modal');
    if (modal) modal.remove();
    restoreBodyScroll();
    
    // Stop any active rest timer
    if (state.restTimerInterval) {
      clearInterval(state.restTimerInterval);
      state.restTimerInterval = null;
    }
    
    // Disable keyboard shortcuts
    disableKeyboardShortcuts();
    
    // Return to dashboard and reload it
    switchTab('dashboard');
    loadDashboard();
    
  } catch (error) {
    console.error('Error deleting workout:', error);
    showNotification('Error deleting workout: ' + error.message, 'error');
  }
}

// Save workout exercises to program
async function saveWorkoutToProgram() {
  if (!state.currentWorkout) return;
  
  const btn = document.getElementById('saveToProgramBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }
  
  try {
    const result = await api(\`/workouts/\${state.currentWorkout.id}/save-to-program\`, {
      method: 'POST'
    });
    
    showNotification(result.message || 'Program updated successfully!', 'success');
    
    // Update button to show success
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    }
    
    // Clear the modified flag
    state.workoutModified = false;
    
  } catch (error) {
    showNotification('Error saving to program: ' + error.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save to Program';
    }
  }
}

// Skip program update and continue
function skipProgramUpdate() {
  state.workoutModifications = null;
  // Re-render summary without the update prompt
  const updateCard = document.querySelector('.card[style*="border: 2px solid var(--primary)"]');
  if (updateCard) {
    updateCard.style.display = 'none';
  }
  showNotification('Program not updated', 'info');
}

// Finish workout summary and return to dashboard
async function finishWorkoutSummary() {
  // Save perceived exertion if set
  if (state.perceivedExertion && state.currentWorkout) {
    try {
      await api(\`/workouts/\${state.currentWorkout.id}/perceived-exertion\`, {
        method: 'PATCH',
        body: JSON.stringify({ perceived_exertion: state.perceivedExertion })
      });
    } catch (error) {
      console.error('Error saving perceived exertion:', error);
    }
  }
  
  const modal = document.getElementById('workout-modal');
  if (modal) modal.remove();
  restoreBodyScroll();
  
  // Clear workout state
  state.currentWorkout = null;
  state.workoutExercise = null;
  state.workoutNotes = '';
  state.workoutModified = false;
  state.workoutModifications = null;
  state.keyboardShortcutsEnabled = false;
  state.perceivedExertion = null;
  
  // Stop any active rest timer
  if (state.restTimerInterval) {
    clearInterval(state.restTimerInterval);
    state.restTimerInterval = null;
  }
  
  // Return to dashboard
  switchTab('dashboard');
  showNotification('Great workout! 💪', 'success');
}

// ========== PHASE 4: POLISH & REFINEMENTS ==========

// Rest Timer System - Uses inline display within workout modal
function startRestTimer(seconds = 90) {
  // Clear any existing timer
  if (state.restTimerInterval) {
    clearInterval(state.restTimerInterval);
  }
  
  state.restTimeRemaining = seconds;
  state.restTimerActive = true;
  
  // Show and update inline timer immediately
  showInlineRestTimer();
  
  // Start countdown
  state.restTimerInterval = setInterval(() => {
    state.restTimeRemaining--;
    
    if (state.restTimeRemaining <= 0) {
      clearInterval(state.restTimerInterval);
      state.restTimerInterval = null;
      state.restTimerActive = false;
      
      // Hide inline timer
      const inlineTimer = document.getElementById('inline-rest-timer');
      if (inlineTimer) {
        inlineTimer.style.display = 'none';
      }
      
      // Show notification
      showNotification('Rest complete! Ready for next set 💪', 'success');
      
      // Play sound if available
      playRestCompleteSound();
    } else {
      updateRestTimerDisplay();
    }
  }, 1000);
}

// Show and update inline rest timer (finds element fresh each time)
function showInlineRestTimer() {
  const inlineTimer = document.getElementById('inline-rest-timer');
  const inlineTimeDisplay = document.getElementById('inline-rest-time');
  
  if (inlineTimer && state.restTimerActive) {
    inlineTimer.style.display = 'block';
    // Scroll to make timer visible
    inlineTimer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  updateRestTimerDisplay();
}

// Update rest timer display (inline version) - finds element fresh each call
function updateRestTimerDisplay() {
  const inlineTimer = document.getElementById('inline-rest-timer');
  const inlineTimeDisplay = document.getElementById('inline-rest-time');
  
  // Show timer if it exists and timer is active
  if (inlineTimer && state.restTimerActive) {
    inlineTimer.style.display = 'block';
  }
  
  if (inlineTimeDisplay && state.restTimeRemaining > 0) {
    const mins = Math.floor(state.restTimeRemaining / 60);
    const secs = state.restTimeRemaining % 60;
    inlineTimeDisplay.textContent = \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
  }
}

function skipRestTimer() {
  if (state.restTimerInterval) {
    clearInterval(state.restTimerInterval);
    state.restTimerInterval = null;
  }
  
  state.restTimerActive = false;
  
  // Hide inline timer
  const inlineTimer = document.getElementById('inline-rest-timer');
  if (inlineTimer) {
    inlineTimer.style.display = 'none';
  }
  
  showNotification('Rest skipped', 'info');
}

// Adjust rest timer by seconds (can be negative)
function adjustRestTimer(seconds) {
  if (!state.restTimerInterval) return;
  
  state.restTimeRemaining = Math.max(5, state.restTimeRemaining + seconds);
  
  // Update inline display
  updateRestTimerDisplay();
  
  showNotification(\`Rest timer \${seconds > 0 ? '+' : ''}\${seconds}s\`, 'info');
}

function playRestCompleteSound() {
  try {
    // Simple beep using Web Audio API
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = state.audioContext.createOscillator();
    const gainNode = state.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(state.audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, state.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.3);
    
    oscillator.start(state.audioContext.currentTime);
    oscillator.stop(state.audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Audio not available:', error);
  }
}

// Keyboard Shortcuts
function enableKeyboardShortcuts() {
  if (state.keyboardShortcutsEnabled) return;
  
  state.keyboardShortcutsEnabled = true;
  
  document.addEventListener('keydown', handleKeyboardShortcut);
}

function disableKeyboardShortcuts() {
  state.keyboardShortcutsEnabled = false;
  document.removeEventListener('keydown', handleKeyboardShortcut);
}

function handleKeyboardShortcut(e) {
  if (!state.keyboardShortcutsEnabled) return;
  
  const modal = document.getElementById('workout-modal');
  if (!modal) return;
  
  // Special handling for Ctrl+Enter to log set (works even in input fields)
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    const logButton = document.getElementById('logSetButton');
    if (logButton) logButton.click();
    return;
  }
  
  // Ignore other shortcuts if typing in input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  switch(e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      previousExercise();
      break;
    case 'ArrowRight':
      e.preventDefault();
      nextExercise();
      break;
    case 'Escape':
      e.preventDefault();
      endWorkoutEarly();
      break;
    case 'r':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        startRestTimer();
      }
      break;
    case '?':
      e.preventDefault();
      showKeyboardShortcutsHelp();
      break;
  }
}

function showKeyboardShortcutsHelp() {
  const helpModal = document.createElement('div');
  helpModal.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 10002;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  \`;
  
  helpModal.innerHTML = \`
    <div style="background: white; border-radius: 16px; padding: 32px; max-width: 500px; animation: scaleIn 0.3s ease-out;">
      <h2 style="margin: 0 0 24px 0;"><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h2>
      <div style="display: grid; gap: 12px;">
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--light); border-radius: 8px;">
          <span><strong>← →</strong></span>
          <span>Previous/Next Exercise</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--light); border-radius: 8px;">
          <span><strong>Cmd/Ctrl + Enter</strong></span>
          <span>Log Set</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--light); border-radius: 8px;">
          <span><strong>Cmd/Ctrl + R</strong></span>
          <span>Start Rest Timer</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--light); border-radius: 8px;">
          <span><strong>Escape</strong></span>
          <span>End Workout</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--light); border-radius: 8px;">
          <span><strong>?</strong></span>
          <span>Show This Help</span>
        </div>
      </div>
      <button class="btn btn-primary" onclick="this.closest('div[style*=fixed]').remove()" style="width: 100%; margin-top: 24px;">
        Got it!
      </button>
    </div>
  \`;
  
  helpModal.onclick = (e) => {
    if (e.target === helpModal) helpModal.remove();
  };
  
  document.body.appendChild(helpModal);
}

// Workout Notes
function showWorkoutNotesModal() {
  const notesModal = document.createElement('div');
  notesModal.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 10002;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  \`;
  
  notesModal.innerHTML = \`
    <div style="background: white; border-radius: 16px; padding: 32px; max-width: 600px; width: 90%; animation: scaleIn 0.3s ease-out;">
      <h2 style="margin: 0 0 16px 0;"><i class="fas fa-note-sticky"></i> Workout Notes</h2>
      <p style="color: var(--gray); margin-bottom: 16px;">Add notes about today's workout (form, energy levels, etc.)</p>
      <textarea id="workout-notes-input" 
        style="width: 100%; min-height: 150px; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 14px; resize: vertical;"
        placeholder="e.g., Felt strong today, increased weight on bench press...">\${state.workoutNotes}</textarea>
      <div style="display: flex; gap: 12px; margin-top: 20px;">
        <button class="btn btn-outline" onclick="this.closest('div[style*=fixed]').remove()" style="flex: 1;">
          Cancel
        </button>
        <button class="btn btn-primary" onclick="saveWorkoutNotes()" style="flex: 1;">
          <i class="fas fa-save"></i> Save Notes
        </button>
      </div>
    </div>
  \`;
  
  notesModal.onclick = (e) => {
    if (e.target === notesModal) notesModal.remove();
  };
  
  document.body.appendChild(notesModal);
  
  // Focus textarea
  setTimeout(() => document.getElementById('workout-notes-input')?.focus(), 100);
}

// Note: saveWorkoutNotes() is defined earlier in the file and works with both interfaces

// Confetti Animation
function triggerConfetti() {
  const confettiCount = 100;
  const colors = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
  
  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const animationDuration = 2 + Math.random() * 2;
      const size = 5 + Math.random() * 5;
      
      confetti.style.cssText = \`
        position: fixed;
        left: \${left}%;
        top: -20px;
        width: \${size}px;
        height: \${size}px;
        background: \${color};
        z-index: 10003;
        pointer-events: none;
        animation: confettiFall \${animationDuration}s ease-out forwards;
        opacity: 1;
      \`;
      
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), animationDuration * 1000);
    }, i * 10);
  }
}

// Loading States
function showLoadingOverlay(message = 'Loading...') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    document.body.appendChild(overlay);
  }
  
  overlay.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255,255,255,0.95);
    z-index: 10004;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  \`;
  
  overlay.innerHTML = \`
    <div style="text-align: center;">
      <div class="spinner" style="margin: 0 auto 20px;"></div>
      <div style="font-size: 18px; color: var(--gray);">\${message}</div>
    </div>
  \`;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => overlay.remove(), 200);
  }
}

// Add CSS animations to document
function injectPhase4Styles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = \`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    
    @keyframes scaleIn {
      from {
        transform: scale(0.8);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    @keyframes confettiFall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .spinner {
      border: 3px solid var(--light);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 0.8s linear infinite;
    }
    
    /* Smooth transitions for all interactive elements */
    button, .card, .tab {
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }
    
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    .card:hover {
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    }
    
    /* Loading skeleton for empty states */
    .skeleton {
      background: linear-gradient(90deg, var(--light) 25%, #f0f0f0 50%, var(--light) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    /* Success animation */
    @keyframes successPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }
    
    .success-animation {
      animation: successPulse 0.6s ease-out;
    }
  \`;
  
  document.head.appendChild(styleEl);
}

// Initialize Phase 4 features
document.addEventListener('DOMContentLoaded', () => {
  injectPhase4Styles();
});

// Note: addExerciseSet already handles rest timer in its implementation
// No need for wrapper here - removed to prevent recursion

// Enhanced startWorkoutExercises with keyboard shortcuts
// Note: This wrapper is applied after the original function is defined
(function() {
  const originalFn = startWorkoutExercises;
  window.startWorkoutExercises = async function() {
    await originalFn();
    enableKeyboardShortcuts();
    
    // Show keyboard shortcuts hint
    setTimeout(() => {
      showNotification('💡 Press ? for keyboard shortcuts', 'info');
    }, 2000);
  };
})();

// Enhanced showWorkoutSummary with confetti
(function() {
  const originalFn = showWorkoutSummary;
  window.showWorkoutSummary = async function() {
    await originalFn();
    
    // Trigger confetti animation
    setTimeout(() => triggerConfetti(), 500);
    
    disableKeyboardShortcuts();
  };
})();

// Load comprehensive training education content
function loadLearn() {
  const container = document.getElementById('learn');
  
  container.innerHTML = \`
    <div class="card">
      <h2><i class="fas fa-graduation-cap"></i> Training Education Center</h2>
      <p style="color: var(--text-secondary); font-size: 14px; margin-top: 8px;">
        Comprehensive, scientifically-backed information about training methods, styles, and variables for all experience levels.
      </p>
    </div>

    <!-- Quick Navigation -->
    <div class="card" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; border: none;">
      <h3 style="color: white; margin-bottom: 16px;"><i class="fas fa-compass"></i> Quick Navigation</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
        <button onclick="document.getElementById('hypertrophy-section').scrollIntoView({behavior: 'smooth'})" 
                style="padding: 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.2s;">
          💪 Hypertrophy
        </button>
        <button onclick="document.getElementById('strength-section').scrollIntoView({behavior: 'smooth'})"
                style="padding: 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.2s;">
          🏋️ Strength
        </button>
        <button onclick="document.getElementById('endurance-section').scrollIntoView({behavior: 'smooth'})"
                style="padding: 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.2s;">
          🏃 Endurance
        </button>
        <button onclick="document.getElementById('cardio-section').scrollIntoView({behavior: 'smooth'})"
                style="padding: 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.2s;">
          ❤️ Cardio
        </button>
        <button onclick="document.getElementById('comparison-section').scrollIntoView({behavior: 'smooth'})"
                style="padding: 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.2s;">
          🔍 Compare
        </button>
        <button onclick="document.getElementById('variables-section').scrollIntoView({behavior: 'smooth'})"
                style="padding: 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.2s;">
          📊 Variables
        </button>
      </div>
    </div>

    <!-- Hypertrophy Training -->
    <div id="hypertrophy-section" class="card">
      <h2 style="color: var(--primary);"><i class="fas fa-dumbbell"></i> Hypertrophy Training (Muscle Building)</h2>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%); border-radius: 12px; margin-bottom: 24px;">
        <p style="font-size: 15px; line-height: 1.8; color: var(--text-primary); margin: 0;">
          <strong>Hypertrophy training</strong> is the science and practice of increasing muscle size through strategic resistance training. This comprehensive guide covers everything from cellular mechanisms to practical program design, backed by peer-reviewed research.
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-microscope"></i> What is Muscle Hypertrophy?</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        <strong>Hypertrophy</strong> refers to the increase in muscle cross-sectional area through the enlargement of individual muscle fibers. At the cellular level, hypertrophy occurs when the rate of <strong>muscle protein synthesis (MPS)</strong> exceeds the rate of <strong>muscle protein breakdown (MPB)</strong> over extended periods, resulting in a net positive protein balance and subsequent muscle growth.
      </p>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        This adaptation is primarily achieved through progressive resistance training combined with adequate nutrition (especially protein intake), sufficient recovery, and appropriate hormonal milieu. Research shows that properly programmed resistance training can increase muscle size by 0.5-2.0% per week in trained individuals, with greater rates possible in beginners.
        <br><a href="https://pubmed.ncbi.nlm.nih.gov/27433992/" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 600;">📖 Schoenfeld et al., 2016 - Effects of resistance training frequency</a>
      </p>

      <h4 style="margin-top: 24px; color: var(--text-primary); font-size: 17px;"><i class="fas fa-dna"></i> Types of Hypertrophy</h4>
      <div style="display: grid; gap: 16px; margin-top: 12px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid var(--primary); border-radius: 8px;">
          <strong style="color: var(--primary); font-size: 16px;">1. Myofibrillar Hypertrophy</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Increase in the number and size of myofibrils (contractile proteins: actin and myosin) within the muscle fiber. This type of hypertrophy results in both <strong>increased muscle size AND increased strength</strong>. Myofibrillar hypertrophy is primarily stimulated by heavier loads (>75% 1RM) and lower rep ranges (3-8 reps) that create high mechanical tension.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Key Benefits:</strong> Denser, harder muscle appearance; significant strength gains; improved power output
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid var(--secondary); border-radius: 8px;">
          <strong style="color: var(--secondary); font-size: 16px;">2. Sarcoplasmic Hypertrophy</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Increase in the volume of sarcoplasm (fluid and energy substrates like glycogen, creatine phosphate, water) within the muscle cell without a proportional increase in contractile proteins. This type is primarily stimulated by moderate loads (60-75% 1RM) with higher rep ranges (8-15 reps) and shorter rest periods that create metabolic stress.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Key Benefits:</strong> Fuller, more "pumped" muscle appearance; enhanced glycogen storage capacity; improved muscular endurance
          </p>
        </div>
      </div>
      <p style="margin-top: 12px; font-size: 13px; font-style: italic; color: var(--text-secondary);">
        Note: While these hypertrophy types exist on a spectrum, optimal programs incorporate both mechanisms through varied loading schemes.
        <br><a href="https://pubmed.ncbi.nlm.nih.gov/20847704/" target="_blank" style="color: var(--primary);">📖 Schoenfeld, 2010 - The mechanisms of muscle hypertrophy</a>
      </p>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-chart-line"></i> The Three Mechanisms of Hypertrophy</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Modern research identifies three primary mechanisms that stimulate muscle hypertrophy. Effective training programs strategically manipulate all three for maximal results:
      </p>
      
      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #3b82f6; border-radius: 8px;">
          <strong style="color: #3b82f6; font-size: 17px;">1. Mechanical Tension</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>The Primary Driver:</strong> Mechanical tension refers to the force generated within muscle fibers during contraction against resistance. This is widely considered the most important factor for hypertrophy.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Mechanism:</strong> When muscles contract against significant resistance, mechanoreceptors within the muscle fibers detect the mechanical stress and activate signaling pathways (particularly mTOR - mechanistic target of rapamycin) that increase protein synthesis. The tension must be sufficient to create a stimulus greater than the muscle's current capacity.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Progressive Overload:</strong> To continuously stimulate growth, mechanical tension must progressively increase over time through:
          </p>
          <ul style="margin: 8px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Increasing load:</strong> Adding weight to exercises (most direct method)</li>
            <li><strong>Increasing volume:</strong> More reps, sets, or exercises per muscle group</li>
            <li><strong>Improving technique:</strong> Better form creates more effective tension</li>
            <li><strong>Increasing time under tension:</strong> Slower eccentrics, pauses, tempo manipulation</li>
            <li><strong>Increasing range of motion:</strong> Greater stretch and contraction</li>
          </ul>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Research Finding:</strong> Studies show that muscles can be effectively trained across a wide loading spectrum (30-85% 1RM) as long as sets are taken close to failure, suggesting that tension created through maximal effort is more important than absolute load for hypertrophy.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/20847704/" target="_blank" style="color: var(--primary);">Schoenfeld, 2010 - Mechanisms of muscle hypertrophy</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/28834797/" target="_blank" style="color: var(--primary);">Schoenfeld et al., 2017 - Strength vs hypertrophy training</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/26605807/" target="_blank" style="color: var(--primary);">Wackerhage et al., 2019 - Molecular response to resistance training</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #10b981; border-radius: 8px;">
          <strong style="color: #10b981; font-size: 17px;">2. Metabolic Stress</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>The "Pump" Factor:</strong> Metabolic stress refers to the accumulation of metabolic byproducts (lactate, hydrogen ions, inorganic phosphate, creatine) during resistance exercise, particularly with moderate loads and shorter rest periods.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Mechanism:</strong> Metabolic stress triggers several growth-promoting effects:
          </p>
          <ul style="margin: 8px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Cell swelling:</strong> Accumulation of metabolites draws water into the muscle cell, creating cellular swelling that may trigger anabolic signaling</li>
            <li><strong>Hormonal response:</strong> Increases acute growth hormone and IGF-1 release</li>
            <li><strong>Reactive oxygen species:</strong> Controlled oxidative stress stimulates adaptation</li>
            <li><strong>Fiber recruitment:</strong> Fatigue of lower-threshold motor units forces recruitment of higher-threshold units</li>
          </ul>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Training Methods to Maximize Metabolic Stress:</strong>
          </p>
          <ul style="margin: 8px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li>Higher rep ranges (8-15+ reps)</li>
            <li>Shorter rest periods (30-90 seconds)</li>
            <li>Drop sets, supersets, and giant sets</li>
            <li>Blood flow restriction (BFR) training</li>
            <li>Slow tempo training with continuous tension</li>
          </ul>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Important Note:</strong> While metabolic stress contributes to hypertrophy, it appears to be less potent than mechanical tension alone. However, combining both mechanisms (moderate-heavy loads with some metabolic stress) may optimize muscle growth.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/25853914/" target="_blank" style="color: var(--primary);">Schoenfeld, 2013 - Potential mechanisms for metabolic stress</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/22344059/" target="_blank" style="color: var(--primary);">Goto et al., 2005 - Metabolic stress and muscle hypertrophy</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f59e0b; border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 17px;">3. Muscle Damage</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Controlled Disruption:</strong> Exercise-induced muscle damage refers to microscopic tears in muscle fibers and surrounding connective tissue, primarily occurring during eccentric (lengthening) contractions.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Mechanism:</strong> The repair process involves:
          </p>
          <ul style="margin: 8px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Inflammation:</strong> Immune cells infiltrate damaged tissue and release growth factors</li>
            <li><strong>Satellite cell activation:</strong> Muscle stem cells proliferate and donate nuclei to existing fibers</li>
            <li><strong>Protein remodeling:</strong> Damaged proteins are broken down and rebuilt stronger</li>
            <li><strong>Connective tissue strengthening:</strong> Supporting structures adapt to handle greater forces</li>
          </ul>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>⚠️ The Controversy:</strong> While muscle damage clearly occurs with training, its role as a primary hypertrophy mechanism is debated. Current evidence suggests:
          </p>
          <ul style="margin: 8px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Not necessary:</strong> Significant hypertrophy can occur without substantial muscle damage</li>
            <li><strong>Diminishing returns:</strong> The repeated bout effect means muscles adapt and experience less damage over time</li>
            <li><strong>Recovery cost:</strong> Excessive damage requires more recovery and may impair training frequency</li>
            <li><strong>Supportive role:</strong> Some damage may facilitate adaptation but shouldn't be the primary goal</li>
          </ul>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Practical Takeaway:</strong> Don't chase extreme soreness (DOMS). Focus on progressive overload and mechanical tension while allowing some natural muscle damage to occur through proper eccentric control.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/11828249/" target="_blank" style="color: var(--primary);">Clarkson & Hubal, 2002 - Exercise-induced muscle damage</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/26666744/" target="_blank" style="color: var(--primary);">Damas et al., 2016 - Muscle damage and hypertrophy</a>
            </p>
          </div>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-cogs"></i> Evidence-Based Training Parameters</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Based on systematic reviews and meta-analyses, here are the optimal parameters for hypertrophy training:
      </p>
      
      <div style="overflow-x: auto; margin-top: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white;">
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid var(--primary); font-weight: 700;">Variable</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid var(--primary); font-weight: 700;">Optimal Range</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid var(--primary); font-weight: 700;">Scientific Rationale</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Rep Range</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">6-30 reps (taken near failure)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Research shows hypertrophy occurs across a wide rep spectrum when sets are taken close to failure. 6-12 reps is most time-efficient, but 12-30 reps also works well. Lower reps (<6) favor strength more than size.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/28834797/" target="_blank" style="color: var(--primary); font-size: 12px;">Schoenfeld et al., 2017</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Weekly Volume</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">10-20 sets per muscle group</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Meta-analyses show dose-response relationship: more volume = more growth, up to ~10-20 sets/week per muscle. Beyond this, returns diminish and recovery becomes challenging. Advanced lifters may tolerate more.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/28834797/" target="_blank" style="color: var(--primary); font-size: 12px;">Schoenfeld et al., 2017 - Dose-response analysis</a>
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Training Frequency</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">2-3x per muscle per week</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Protein synthesis remains elevated for 24-48 hours post-training. Training each muscle 2-3x/week allows multiple growth signals while distributing volume for better recovery and performance. Higher frequencies work if volume per session is managed.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/27102172/" target="_blank" style="color: var(--primary); font-size: 12px;">Schoenfeld et al., 2016 - Training frequency</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Intensity (Load)</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">30-85% 1RM (near failure)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Loads as light as 30% 1RM can build muscle when taken to failure, but 60-85% 1RM is more time-efficient. The key is achieving high motor unit recruitment through heavy loads OR training near failure with lighter loads.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/27174923/" target="_blank" style="color: var(--primary); font-size: 12px;">Morton et al., 2016 - Load and muscle hypertrophy</a>
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Rest Between Sets</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">2-3 minutes (compounds)<br>1-2 minutes (isolation)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Longer rest (2-5 min) allows better performance maintenance across sets, leading to greater total volume. However, shorter rest (60-90s) may enhance metabolic stress. A mixed approach optimizes both factors.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/26605807/" target="_blank" style="color: var(--primary); font-size: 12px;">Schoenfeld et al., 2016 - Rest intervals</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Tempo</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">2-4 sec eccentric<br>0-2 sec pause<br>1-2 sec concentric</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Controlled eccentrics maximize time under tension and mechanical tension. Explosive concentrics develop power. Very slow tempos (>10s) may compromise total volume. Aim for controlled but not excessively slow movement.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/25601394/" target="_blank" style="color: var(--primary); font-size: 12px;">Schoenfeld et al., 2015 - Tempo effects</a>
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Proximity to Failure</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">0-3 RIR (reps in reserve)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Training close to muscular failure (0-3 reps from failure) ensures adequate stimulation. Going to absolute failure every set may accumulate excessive fatigue. Save failure training for final sets or isolation exercises.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/33572412/" target="_blank" style="color: var(--primary); font-size: 12px;">Grgic et al., 2021 - Training to failure</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Range of Motion</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">Full ROM (or at least lengthened partials)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Training with full range of motion, particularly emphasizing the stretched position, appears superior for hypertrophy. Partial reps can supplement but shouldn't replace full ROM training.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/30558333/" target="_blank" style="color: var(--primary); font-size: 12px;">Pallarés et al., 2020 - ROM and hypertrophy</a>
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px;"><strong>Exercise Selection</strong></td>
              <td style="padding: 14px;">Mix of compound & isolation</td>
              <td style="padding: 14px; line-height: 1.6;">
                Compound movements (squats, deadlifts, presses) allow heavy loading and work multiple muscles. Isolation exercises (curls, extensions, raises) target specific muscles through full ROM. Both are valuable for complete development.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/29564973/" target="_blank" style="color: var(--primary); font-size: 12px;">Paoli et al., 2017 - Exercise selection</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px; padding: 16px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--primary); border-radius: 8px;">
        <p style="margin: 0; line-height: 1.7; color: var(--text-secondary);">
          <strong style="color: var(--primary);">💡 Key Takeaway:</strong> Hypertrophy is remarkably adaptable to various training approaches as long as you achieve sufficient volume, mechanical tension (through load or proximity to failure), and progressive overload over time. The "perfect" program is the one you can consistently execute and progressively advance.
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-utensils"></i> Nutritional Requirements for Hypertrophy</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Training provides the stimulus, but nutrition provides the building blocks. Optimal hypertrophy requires careful attention to caloric intake, macronutrient distribution, and nutrient timing.
      </p>

      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: var(--primary); font-size: 16px;">🥩 Protein Intake</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Daily Target:</strong> 1.6-2.2 g/kg bodyweight (0.7-1.0 g/lb)
              <br><a href="https://pubmed.ncbi.nlm.nih.gov/28698222/" target="_blank" style="color: var(--primary); font-size: 13px;">Morton et al., 2018 - Systematic review of protein needs</a>
            </li>
            <li><strong>Distribution:</strong> Spread across 3-5 meals, each containing 20-40g protein</li>
            <li><strong>Quality:</strong> Complete proteins with all essential amino acids (especially leucine ~2.5-3g per meal)</li>
            <li><strong>Timing:</strong> Consume protein within ~2 hours post-workout; total daily intake matters more than precise timing</li>
            <li><strong>Higher needs for:</strong> Caloric deficits, older individuals (>40 years), vegetarians/vegans</li>
          </ul>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: var(--primary); font-size: 16px;">🍚 Carbohydrate Intake</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Daily Target:</strong> 3-7 g/kg bodyweight depending on training volume and goals</li>
            <li><strong>Role:</strong> Fuels high-intensity training, spares protein from being used for energy, replenishes muscle glycogen</li>
            <li><strong>Pre-workout:</strong> 1-4g/kg consumed 1-4 hours before training enhances performance</li>
            <li><strong>Post-workout:</strong> 1.0-1.5 g/kg within 2 hours optimizes glycogen resynthesis</li>
            <li><strong>Types:</strong> Emphasize complex carbs (oats, rice, potatoes) for sustained energy; simple carbs around workouts for quick fuel</li>
          </ul>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: var(--primary); font-size: 16px;">🥑 Fat Intake</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Daily Target:</strong> 0.5-1.5 g/kg bodyweight (minimum 20-30% of total calories)</li>
            <li><strong>Essential for:</strong> Hormone production (testosterone, growth hormone), vitamin absorption, inflammation management</li>
            <li><strong>Sources:</strong> Mix of saturated (meat, dairy), monounsaturated (olive oil, avocados), and polyunsaturated (fish, nuts) fats</li>
            <li><strong>Omega-3s:</strong> 2-4g EPA+DHA daily for anti-inflammatory effects and recovery
              <br><a href="https://pubmed.ncbi.nlm.nih.gov/29133823/" target="_blank" style="color: var(--primary); font-size: 13px;">McGlory et al., 2019 - Omega-3 and muscle protein synthesis</a>
            </li>
          </ul>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: var(--primary); font-size: 16px;">📊 Caloric Surplus</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Recommended surplus:</strong> 200-500 calories above maintenance (smaller for advanced lifters to minimize fat gain)</li>
            <li><strong>Rate of gain:</strong> 0.25-0.5% bodyweight per week (0.5-1 lb/week for most people)</li>
            <li><strong>Lean bulking:</strong> Slower gains with minimal fat accumulation vs aggressive bulking with faster muscle gain but more fat</li>
            <li><strong>Recomposition:</strong> Advanced technique of building muscle at maintenance/slight deficit; works best for beginners and returning trainers</li>
          </ul>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-calendar-alt"></i> Sample Training Split Options</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Different training splits can all build muscle effectively when volume and intensity are equated:
      </p>

      <div style="display: grid; gap: 12px; margin-top: 16px;">
        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer;">
          <summary style="font-weight: 700; font-size: 15px; color: var(--primary); cursor: pointer;">Full Body Training (3-4x/week)</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Beginners, time-limited individuals, those prioritizing strength</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Pros:</strong> High frequency allows skill practice; flexible scheduling; efficient</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Cons:</strong> Longer sessions; may be fatiguing; less volume per muscle per session</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Example (3x/week):</strong> Each session includes 1-2 exercises for chest, back, legs, shoulders, arms</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer;">
          <summary style="font-weight: 700; font-size: 15px; color: var(--primary); cursor: pointer;">Upper/Lower Split (4x/week)</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Intermediate lifters, general muscle building</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Pros:</strong> Balanced frequency (2x/week per muscle); manageable sessions; clear organization</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Cons:</strong> Requires 4 days commitment; leg days can be very demanding</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Example:</strong> Mon-Upper, Tue-Lower, Thu-Upper, Fri-Lower</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer;">
          <summary style="font-weight: 700; font-size: 15px; color: var(--primary); cursor: pointer;">Push/Pull/Legs (6x/week or 3x/week)</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Advanced lifters, bodybuilders, high-volume training</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Pros:</strong> Synergistic muscle grouping; high frequency if done 6x/week; excellent for hypertrophy</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Cons:</strong> Time commitment; requires good recovery; may be excessive for beginners</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Example (6x/week):</strong> Push-Pull-Legs-Push-Pull-Legs-Rest</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer;">
          <summary style="font-weight: 700; font-size: 15px; color: var(--primary); cursor: pointer;">Body Part Split (5-6x/week)</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Advanced bodybuilders, those with recovery capacity for high volume</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Pros:</strong> Maximum volume per muscle; great "pump"; complete focus per session</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Cons:</strong> Lower frequency (1x/week per muscle); requires 5-6 days; not optimal for strength</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Example:</strong> Chest-Back-Shoulders-Arms-Legs-Rest</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0; font-size: 13px;"><em>Note: Research suggests 2x frequency is superior to 1x/week, so modern adaptations often use 2x/week variations</em></p>
          </div>
        </details>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-clock"></i> Time Course of Adaptations</h3>
      <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px; margin-top: 16px;">
        <ul style="margin: 0; padding: 0 0 0 20px; line-height: 2; color: var(--text-secondary);">
          <li><strong>Weeks 1-4:</strong> Rapid strength gains primarily from neural adaptations (improved coordination, motor learning)</li>
          <li><strong>Weeks 4-8:</strong> First measurable hypertrophy becomes apparent; continued neural improvements</li>
          <li><strong>Weeks 8-12:</strong> Noticeable muscle growth; protein synthesis rates optimize</li>
          <li><strong>Months 3-6:</strong> Significant visual changes; beginning intermediate phase</li>
          <li><strong>6-12 months:</strong> Approaching genetic muscular potential rate limits; progress slows</li>
          <li><strong>1-2 years:</strong> Advanced trainee; gains require precision programming and patience</li>
          <li><strong>2-4 years:</strong> Approaching natural muscular potential in trained muscle groups</li>
        </ul>
        <p style="margin: 12px 0 0 0; font-size: 13px; font-style: italic; color: var(--text-secondary);">
          <a href="https://pubmed.ncbi.nlm.nih.gov/28546505/" target="_blank" style="color: var(--primary);">📖 Seynnes et al., 2007 - Early vs late hypertrophy adaptations</a>
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-user-check"></i> Who Should Focus on Hypertrophy?</h3>
      <div style="display: grid; gap: 10px; margin-top: 16px;">
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid var(--primary); border-radius: 6px;">
          <strong style="color: var(--primary);">✓ Bodybuilders & Physique Competitors</strong> - Primary training goal
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid var(--primary); border-radius: 6px;">
          <strong style="color: var(--primary);">✓ Athletes Requiring Muscle Mass</strong> - Rugby, football, combat sports
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid var(--primary); border-radius: 6px;">
          <strong style="color: var(--primary);">✓ General Fitness Enthusiasts</strong> - Aesthetic improvements, metabolism boost
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid var(--primary); border-radius: 6px;">
          <strong style="color: var(--primary);">✓ Older Adults</strong> - Combat sarcopenia (age-related muscle loss)
          <br><a href="https://pubmed.ncbi.nlm.nih.gov/30153194/" target="_blank" style="color: var(--primary); font-size: 12px;">Fragala et al., 2019 - Resistance training for older adults</a>
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid var(--primary); border-radius: 6px;">
          <strong style="color: var(--primary);">✓ Rehabilitation & Injury Prevention</strong> - Strengthening supporting musculature
        </div>
      </div>

      <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%); border-radius: 12px; border: 2px solid rgba(59, 130, 246, 0.3);">
        <h4 style="margin: 0 0 12px 0; color: var(--primary); font-size: 17px;"><i class="fas fa-book-open"></i> Further Reading & Resources</h4>
        <div style="display: grid; gap: 8px;">
          <a href="https://www.strongerbyscience.com/hypertrophy-range/" target="_blank" style="color: var(--primary); text-decoration: none; line-height: 1.6;">📘 Stronger by Science - The "Hypertrophy Rep Range" Myth</a>
          <a href="https://mennohenselmans.com/optimal-program-design/" target="_blank" style="color: var(--primary); text-decoration: none; line-height: 1.6;">📘 Menno Henselmans - Optimal Program Design</a>
          <a href="https://rpstrength.com/hypertrophy-training-guide-central-hub/" target="_blank" style="color: var(--primary); text-decoration: none; line-height: 1.6;">📘 Renaissance Periodization - Hypertrophy Training Guide</a>
          <a href="https://pubmed.ncbi.nlm.nih.gov/31102253/" target="_blank" style="color: var(--primary); text-decoration: none; line-height: 1.6;">📄 PubMed - Schoenfeld et al., 2019 - Science and Development of Muscle Hypertrophy (Textbook)</a>
        </div>
      </div>
    </div>

    <!-- Strength Training -->
    <div id="strength-section" class="card">
      <h2 style="color: var(--danger);"><i class="fas fa-weight-hanging"></i> Strength Training (Maximal Force Production)</h2>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%); border-radius: 12px; margin-bottom: 24px;">
        <p style="font-size: 15px; line-height: 1.8; color: var(--text-primary); margin: 0;">
          <strong>Strength training</strong> is the systematic practice of maximizing force production through neural, structural, and mechanical adaptations. This guide explores the science of getting stronger, from motor unit recruitment to elite powerlifting protocols.
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-bolt"></i> What is Strength?</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        <strong>Strength</strong> is the neuromuscular system's ability to produce force against external resistance. Unlike hypertrophy, strength improvements come primarily from <strong>neural adaptations</strong> that allow you to better utilize existing muscle mass. This is why strength athletes can lift significantly more than bodybuilders despite sometimes having less muscle - their nervous systems are highly trained to generate maximal force.
        <br><a href="https://pubmed.ncbi.nlm.nih.gov/2796409/" target="_blank" style="color: var(--danger); text-decoration: none; font-weight: 600;">📖 Sale, 1988 - Neural adaptation to resistance training</a>
      </p>

      <h4 style="margin-top: 24px; color: var(--text-primary); font-size: 17px;"><i class="fas fa-list"></i> Types of Strength</h4>
      <div style="display: grid; gap: 16px; margin-top: 12px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #ef4444; border-radius: 8px;">
          <strong style="color: #ef4444; font-size: 16px;">1. Maximal Strength (Absolute Strength)</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Maximum force generated in a single voluntary contraction, regardless of time. This is your <strong>one-rep max (1RM)</strong> - the primary focus of powerlifting (squat, bench press, deadlift).
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Trained through:</strong> Heavy loads (>85% 1RM), low reps (1-5), long rest (3-5 min), high frequency
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f97316; border-radius: 8px;">
          <strong style="color: #f97316; font-size: 16px;">2. Explosive Strength (Power)</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Ability to generate maximum force in minimum time. Power = Force × Velocity. Critical for Olympic weightlifting, jumping, throwing, and sprinting.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Trained through:</strong> Moderate loads (30-80% 1RM), explosive intent, low reps (1-5), plyometrics
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #84cc16; border-radius: 8px;">
          <strong style="color: #84cc16; font-size: 16px;">3. Strength-Endurance</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Ability to maintain high force output over repeated contractions. Important for sports requiring sustained power (wrestling, rock climbing, rowing).
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Trained through:</strong> Moderate loads (60-75% 1RM), higher reps (6-15), shorter rest (60-120s)
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #3b82f6; border-radius: 8px;">
          <strong style="color: #3b82f6; font-size: 16px;">4. Relative Strength</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Strength relative to body weight (strength-to-weight ratio). Critical for gymnastics, rock climbing, and weight-class sports.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Calculation:</strong> Relative Strength = Absolute Strength ÷ Body Weight<br>
            Example: 150kg squat ÷ 75kg bodyweight = 2.0× bodyweight
          </p>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-brain"></i> Neural Adaptations: Why Strength Increases</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Primary adaptations to strength training occur in the <strong>nervous system</strong>, not muscles. These neural changes explain why beginners can double their strength while gaining minimal muscle mass.
      </p>

      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #dc2626; border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 17px;">1. Motor Unit Recruitment</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Motor units</strong> (motor neuron + muscle fibers) are recruited in size order (Henneman's Size Principle):
          </p>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Type I (slow-twitch):</strong> Small, fatigue-resistant, recruited first</li>
            <li><strong>Type IIa (fast-twitch):</strong> Medium size, moderate power</li>
            <li><strong>Type IIx (fast-twitch):</strong> Large, high power, recruited only with heavy loads</li>
          </ul>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Training effect:</strong> Improves ability to recruit high-threshold motor units more efficiently, accessing your most powerful muscle fibers more readily.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(220, 38, 38, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/2796409/" target="_blank" style="color: var(--danger);">Sale, 1988 - Neural adaptation</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/16095413/" target="_blank" style="color: var(--danger);">Folland & Williams, 2007 - Morphological contributions</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #dc2626; border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 17px;">2. Rate Coding (Firing Frequency)</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Rate coding</strong> is the frequency motor neurons send signals to muscles. Higher firing rates produce greater force.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Mechanism:</strong> Motor neurons fire 8-50+ times per second. Strength training increases firing rate during maximal efforts, allowing muscles to contract harder and faster. Primary mechanism behind <strong>rate of force development (RFD)</strong>.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(220, 38, 38, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/9694422/" target="_blank" style="color: var(--danger);">Van Cutsem et al., 1998 - Motor unit behavior</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/11904689/" target="_blank" style="color: var(--danger);">Aagaard, 2003 - Neural function changes</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #dc2626; border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 17px;">3. Intermuscular Coordination</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Coordination</strong> between multiple muscles improves dramatically with strength training.
          </p>
          <ul style="margin: 8px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Agonist activation:</strong> Better recruitment of prime movers</li>
            <li><strong>Antagonist inhibition:</strong> Reduced co-contraction of opposing muscles</li>
            <li><strong>Synergist coordination:</strong> Improved timing of supporting muscles</li>
            <li><strong>Stabilizer efficiency:</strong> Better core and joint stabilization</li>
          </ul>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Example:</strong> Deadlift coordination of lats, core, glutes, hamstrings, and grip takes months - this is skill acquisition, not just muscle building.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(220, 38, 38, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/11991778/" target="_blank" style="color: var(--danger);">Aagaard et al., 2002 - Neural adaptations</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/10694116/" target="_blank" style="color: var(--danger);">Carroll et al., 2001 - Neural adaptations to training</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #dc2626; border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 17px;">4. Intramuscular Coordination</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Synchronization</strong> of motor unit firing within a single muscle improves force production efficiency. Instead of firing randomly, motor units fire more simultaneously (in-phase), creating stronger contractions. Think of rowers synchronizing strokes.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Note:</strong> Degree of improvement is debated in research. Some studies suggest it's less important than recruitment and rate coding, but it likely contributes to overall neural efficiency.
          </p>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #dc2626; border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 17px;">5. Tendon Stiffness & Elastic Energy</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Tendon stiffness</strong> increases with training, allowing better force transmission and improved utilization of the <strong>stretch-shortening cycle</strong>. Stiffer tendons act like better springs, storing and releasing elastic energy more efficiently. Crucial for explosive movements.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(220, 38, 38, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/20847705/" target="_blank" style="color: var(--danger);">Bojsen-Møller et al., 2005 - Muscle performance</a>
            </p>
          </div>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-cogs"></i> Evidence-Based Training Parameters</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Research-backed guidelines for maximizing strength gains:
      </p>

      <div style="overflow-x: auto; margin-top: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white;">
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #dc2626; font-weight: 700;">Variable</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #dc2626; font-weight: 700;">Optimal Range</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #dc2626; font-weight: 700;">Scientific Rationale</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Rep Range</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">1-6 reps (focus 1-5)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Heavy loads (>80% 1RM) maximize neural adaptations. Singles and doubles are most specific to 1RM but triples and sets of 5 accumulate more quality volume.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/28834797/" target="_blank" style="color: var(--danger); font-size: 12px;">Schoenfeld et al., 2017 - Strength adaptations</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Weekly Volume</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">12-24 sets per lift pattern</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                More than hypertrophy due to high frequency. Squat: 12-20 sets, Hinge: 8-15 sets, Press: 10-18 sets. Advanced lifters need more.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/27941492/" target="_blank" style="color: var(--danger); font-size: 12px;">Ralston et al., 2017 - Volume and strength</a>
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Frequency</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">3-6x per lift per week</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                High frequency allows skill practice and volume distribution. Bulgarian and Norwegian methods have daily maximal training. Higher frequency superior if volume is equated.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/30558719/" target="_blank" style="color: var(--danger); font-size: 12px;">Grgic et al., 2018 - Frequency and strength</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Intensity (Load)</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">80-100% 1RM (emphasis >85%)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Specificity principle: To get stronger at heavy loads, lift heavy loads. Most work 80-90%, some >90%, occasional max attempts. Lighter loads (70-80%) for volume.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/22344059/" target="_blank" style="color: var(--danger); font-size: 12px;">Schoenfeld et al., 2017 - Loading recommendations</a>
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Rest</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">3-5 min (up to 10 for maximal)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Complete ATP-PC recovery takes 3-5 min. Longer rest allows high intensity maintenance. >2 min superior to shorter. Elite lifters may rest 5-10 min between near-max.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/26605807/" target="_blank" style="color: var(--danger); font-size: 12px;">Schoenfeld et al., 2016 - Rest intervals</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Tempo</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">Controlled eccentric (2-3s)<br>Explosive concentric</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                <strong>Compensatory Acceleration Training (CAT):</strong> Attempt to accelerate bar throughout range. Maximizes force and neural drive. Controlled eccentrics minimize injury risk.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/23897021/" target="_blank" style="color: var(--danger); font-size: 12px;">Kawamori & Haff, 2004 - Force-velocity</a>
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px;"><strong>Proximity to Failure</strong></td>
              <td style="padding: 14px;">Leave 1-3 RIR (training)<br>Max effort (testing/peaking)</td>
              <td style="padding: 14px; line-height: 1.6;">
                Training to failure frequently increases injury risk and CNS fatigue without benefits. Use RPE 7-9 for most training. Reserve maximal attempts for testing or peaking.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/27768473/" target="_blank" style="color: var(--danger); font-size: 12px;">Davies et al., 2016 - Failure training</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px; padding: 16px; background: rgba(220, 38, 38, 0.1); border-left: 4px solid #dc2626; border-radius: 8px;">
        <p style="margin: 0; line-height: 1.7; color: var(--text-secondary);">
          <strong style="color: #dc2626;">💡 Key Takeaway:</strong> Strength training requires heavy loads, adequate volume across high frequency, complete recovery, and consistent practice of specific movements. Unlike hypertrophy, maximal strength cannot be achieved with light loads regardless of effort.
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-calendar-week"></i> Periodization for Strength</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        <strong>Periodization</strong> is systematic variation of training variables to optimize performance and prevent overtraining. Essential for long-term strength progress.
      </p>

      <div style="display: grid; gap: 12px; margin-top: 16px;">
        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #dc2626;">
          <summary style="font-weight: 700; font-size: 15px; color: #dc2626; cursor: pointer;">📈 Linear Periodization (Classic Model)</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Structure:</strong> Progress from high volume/low intensity → low volume/high intensity over 8-16 weeks</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;">
              <strong>Phases:</strong>
              <br>• Hypertrophy (weeks 1-4): 8-12 reps, 70-75% 1RM, 3-4 sets
              <br>• Strength (weeks 5-8): 4-6 reps, 80-85% 1RM, 4-5 sets
              <br>• Power/Peaking (weeks 9-12): 1-3 reps, 90-95% 1RM, 3-5 sets
              <br>• Taper (weeks 13-14): Reduce volume 40-60%, maintain intensity
            </p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Beginners, single-peak competitions (yearly)</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Pros:</strong> Simple, predictable, well-researched</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Cons:</strong> Detraining of untrained qualities, less variety</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #dc2626;">
          <summary style="font-weight: 700; font-size: 15px; color: #dc2626; cursor: pointer;">🔄 Daily Undulating Periodization (DUP)</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Structure:</strong> Vary intensity and volume day-to-day within each week</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;">
              <strong>Example weekly setup:</strong>
              <br>• Monday: Heavy (3x3 @ 85-90% 1RM)
              <br>• Wednesday: Light (3x8 @ 65-70% 1RM)
              <br>• Friday: Medium (3x5 @ 75-80% 1RM)
            </p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Intermediate to advanced, multiple competitions yearly</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Pros:</strong> Maintains all qualities, interesting, flexible</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Cons:</strong> More complex, may be too variable for beginners</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0; font-size: 13px;">
              <a href="https://pubmed.ncbi.nlm.nih.gov/26666744/" target="_blank" style="color: var(--danger);">Research shows DUP may be superior to linear for experienced lifters</a>
            </p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #dc2626;">
          <summary style="font-weight: 700; font-size: 15px; color: #dc2626; cursor: pointer;">🧱 Block Periodization</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Structure:</strong> Focus on one quality per 2-4 week block, then transition</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;">
              <strong>Blocks:</strong>
              <br>• <strong>Accumulation:</strong> High volume, lower intensity, build capacity (70-80% 1RM)
              <br>• <strong>Intensification:</strong> Reduce volume, increase intensity (80-90% 1RM)
              <br>• <strong>Realization:</strong> Low volume, peak intensity, express strength (90-100% 1RM)
            </p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Advanced/elite athletes, multiple peaks yearly</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Pros:</strong> Focused development, prevents staleness, residual effects</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Cons:</strong> Requires experience, complex planning</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0; font-size: 13px;">
              <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3438871/" target="_blank" style="color: var(--danger);">Popularized by Verkhoshansky - Soviet training theory</a>
            </p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #dc2626;">
          <summary style="font-weight: 700; font-size: 15px; color: #dc2626; cursor: pointer;">⚡ Conjugate Method (Westside Barbell)</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Structure:</strong> Train maximal effort, dynamic effort, and repetition effort simultaneously</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;">
              <strong>Weekly template:</strong>
              <br>• <strong>Max Effort Lower:</strong> Work to 1-3RM on squat/deadlift variation
              <br>• <strong>Max Effort Upper:</strong> Work to 1-3RM on bench press variation
              <br>• <strong>Dynamic Effort Lower:</strong> 8-12 sets of 2 reps at 50-60% with bands/chains
              <br>• <strong>Dynamic Effort Upper:</strong> 8-9 sets of 3 reps at 50-60% with bands/chains
            </p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Equipped powerlifters, advanced raw lifters, variety seekers</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Pros:</strong> Addresses all strength aspects, prevents accommodation, exciting</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Cons:</strong> Very demanding, requires extensive exercise library</p>
          </div>
        </details>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-user-check"></i> Who Should Focus on Strength Training?</h3>
      <div style="display: grid; gap: 10px; margin-top: 16px;">
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #dc2626; border-radius: 6px;">
          <strong style="color: #dc2626;">✓ Powerlifters & Strongman Athletes</strong> - Primary training focus
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #dc2626; border-radius: 6px;">
          <strong style="color: #dc2626;">✓ Olympic Weightlifters</strong> - Strength base for snatch/clean & jerk
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #dc2626; border-radius: 6px;">
          <strong style="color: #dc2626;">✓ Field Sport Athletes</strong> - Football, rugby, throwing, sprinting
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #dc2626; border-radius: 6px;">
          <strong style="color: #dc2626;">✓ Combat Sports Athletes</strong> - MMA, wrestling, boxing (weight-class)
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #dc2626; border-radius: 6px;">
          <strong style="color: #dc2626;">✓ Older Adults</strong> - Prevent sarcopenia, maintain independence
          <br><a href="https://pubmed.ncbi.nlm.nih.gov/29517930/" target="_blank" style="color: var(--danger); font-size: 12px;">Peterson et al., 2010 - Resistance training for older adults</a>
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #dc2626; border-radius: 6px;">
          <strong style="color: #dc2626;">✓ Anyone Seeking Performance</strong> - Strength transfers to all activities
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-dumbbell"></i> The Powerlifting "Big 3"</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Competitive powerlifting revolves around three lifts that test total-body strength and form the foundation of any strength program:
      </p>

      <div style="display: grid; gap: 12px; margin-top: 16px;">
        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #dc2626;">
          <summary style="font-weight: 700; font-size: 15px; color: #dc2626; cursor: pointer;">🦵 Back Squat - King of Lower Body</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Primary muscles:</strong> Quadriceps, glutes, hamstrings, core, erectors</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Why it matters:</strong> Highest load potential of any lower body exercise; builds total-body strength and resilience</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Variants:</strong> High-bar (upright, quad-dominant), Low-bar (forward lean, hip-dominant), Front squat, Safety bar</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Elite standards:</strong> Advanced males: 2.0-2.5× bodyweight; Females: 1.5-2.0× bodyweight</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #dc2626;">
          <summary style="font-weight: 700; font-size: 15px; color: #dc2626; cursor: pointer;">💪 Bench Press - Upper Body Power</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Primary muscles:</strong> Pectorals, anterior deltoids, triceps</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Why it matters:</strong> Best measure of upper body pressing strength; highly technical requiring leg drive and lat engagement</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Variants:</strong> Competition (pause on chest), Touch-and-go, Close-grip, Incline, Floor press</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Elite standards:</strong> Advanced males: 1.5-2.0× bodyweight; Females: 0.75-1.0× bodyweight</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #dc2626;">
          <summary style="font-weight: 700; font-size: 15px; color: #dc2626; cursor: pointer;">🏋️ Deadlift - Pure Pulling Strength</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Primary muscles:</strong> Entire posterior chain (glutes, hamstrings, erectors), lats, traps, grip</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Why it matters:</strong> Highest absolute load of any lift; tests total-body strength from floor to lockout</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Variants:</strong> Conventional (narrow stance), Sumo (wide stance, upright), Romanian, Trap bar, Deficit</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Elite standards:</strong> Advanced males: 2.5-3.0× bodyweight; Females: 2.0-2.5× bodyweight</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0; font-size: 13px;"><em>Note: Deadlift typically highest 1RM due to favorable biomechanics and full-body involvement</em></p>
          </div>
        </details>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-utensils"></i> Nutrition for Strength</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Nutritional needs differ from hypertrophy due to higher intensity and CNS demands:
      </p>

      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 16px;">🥩 Protein: 1.6-2.0 g/kg (0.7-0.9 g/lb)</strong>
          <p style="margin: 12px 0 0 0; line-height: 1.7; color: var(--text-secondary);">
            Slightly lower than hypertrophy because strength training causes less muscle damage. Focus on protein around training and distribute evenly across meals. Quality matters more than quantity.
          </p>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 16px;">🍚 Carbohydrates: 4-7 g/kg (Higher for training days)</strong>
          <p style="margin: 12px 0 0 0; line-height: 1.7; color: var(--text-secondary);">
            <strong>Critical for strength!</strong> Heavy lifting relies on ATP-PC and glycolytic systems requiring carbs. Pre-workout carbs enhance performance; post-workout restores glycogen. Low-carb significantly impairs maximal strength.
            <br><a href="https://pubmed.ncbi.nlm.nih.gov/30982439/" target="_blank" style="color: var(--danger); font-size: 13px;">Escobar et al., 2016 - Carbohydrate and strength performance</a>
          </p>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 16px;">🥑 Fats: 0.8-1.5 g/kg (25-30% of calories)</strong>
          <p style="margin: 12px 0 0 0; line-height: 1.7; color: var(--text-secondary);">
            Adequate fats support testosterone production (critical for strength), reduce inflammation, provide concentrated energy. Don't go too low during intense training.
          </p>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 16px;">⚖️ Caloric Strategy</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Weight class athletes:</strong> Maintain bodyweight or strategic cuts near competition</li>
            <li><strong>Non-weight class:</strong> Slight surplus (200-300 cal) optimizes recovery</li>
            <li><strong>Bulking for strength:</strong> Gaining weight often increases leverages and absolute strength</li>
            <li><strong>Cutting for strength:</strong> Possible to maintain in moderate deficit with high protein</li>
          </ul>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 16px;">💊 Effective Supplements</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Creatine monohydrate (5g/day):</strong> +5-15% strength gains, most researched
              <br><a href="https://pubmed.ncbi.nlm.nih.gov/12945830/" target="_blank" style="color: var(--danger); font-size: 13px;">Kreider et al., 2003 - Creatine supplementation</a>
            </li>
            <li><strong>Caffeine (3-6mg/kg pre-workout):</strong> Enhances power output, reduces perceived exertion</li>
            <li><strong>Beta-alanine (3-6g/day):</strong> Buffers lactate, helps with volume work</li>
            <li><strong>Citrulline malate (6-8g):</strong> May reduce fatigue between sets</li>
          </ul>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-clock"></i> Time Course of Strength Gains</h3>
      <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px; margin-top: 16px;">
        <ul style="margin: 0; padding: 0 0 0 20px; line-height: 2; color: var(--text-secondary);">
          <li><strong>Weeks 1-4:</strong> Rapid neural adaptations - 10-30% strength gains from motor learning</li>
          <li><strong>Weeks 4-12:</strong> Continued neural improvements plus structural - 5-15% additional gains</li>
          <li><strong>Months 3-12:</strong> Steady progress - 2-5% monthly gains typical for intermediates</li>
          <li><strong>Years 1-2:</strong> Slower gains - 0.5-2% monthly; advanced programming required</li>
          <li><strong>Years 2-5:</strong> Elite level - 1-2% annually; perfecting technique and peaking</li>
          <li><strong>Years 5-10+:</strong> World-class - micro-gains; maintaining peak, preventing injury</li>
        </ul>
        <p style="margin: 16px 0 0 0; font-size: 14px; color: var(--text-secondary); line-height: 1.7;">
          <strong>Important:</strong> Absolute beginners can often double lifts in 6-12 months. Advanced lifters may take years to add 5-10kg. This is normal - strength gains follow a logarithmic curve.
        </p>
      </div>

      <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.08) 100%); border-radius: 12px; border: 2px solid rgba(220, 38, 38, 0.3);">
        <h4 style="margin: 0 0 12px 0; color: #dc2626; font-size: 17px;"><i class="fas fa-book-open"></i> Further Reading & Resources</h4>
        <div style="display: grid; gap: 8px;">
          <a href="https://www.strongerbyscience.com/complete-strength-training-guide/" target="_blank" style="color: var(--danger); text-decoration: none; line-height: 1.6;">📘 Stronger by Science - Complete Strength Training Guide</a>
          <a href="https://www.jtsstrength.com/pillars-of-squat-technique/" target="_blank" style="color: var(--danger); text-decoration: none; line-height: 1.6;">📘 Juggernaut Training Systems - Squat, Bench, Deadlift Pillars</a>
          <a href="https://startingstrength.com/article/prescription_of_exercise_intensity" target="_blank" style="color: var(--danger); text-decoration: none; line-height: 1.6;">📘 Starting Strength - Programming Fundamentals</a>
          <a href="https://www.strongerbyscience.com/powerlifting-programs/" target="_blank" style="color: var(--danger); text-decoration: none; line-height: 1.6;">📘 Powerlifting Program Reviews & Comparisons</a>
          <a href="https://pubmed.ncbi.nlm.nih.gov/22344059/" target="_blank" style="color: var(--danger); text-decoration: none; line-height: 1.6;">📄 PubMed - Schoenfeld et al., 2017 - Strength & Hypertrophy Training</a>
          <strong style="margin-top: 8px; display: block; color: #dc2626;">Recommended Books:</strong>
          <span style="color: var(--text-secondary); font-size: 14px; line-height: 1.7;">
            • "Starting Strength" - Mark Rippetoe<br>
            • "The Science and Practice of Strength Training" - Zatsiorsky & Kraemer<br>
            • "Practical Programming for Strength Training" - Rippetoe & Baker<br>
            • "Periodization Training for Sports" - Bompa & Buzzichelli
          </span>
        </div>
      </div>
    </div>

    <!-- Endurance Training -->
    <div id="endurance-section" class="card">
      <h2 style="color: var(--secondary);"><i class="fas fa-running"></i> Muscular Endurance Training</h2>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%); border-radius: 12px; margin-bottom: 24px;">
        <p style="font-size: 15px; line-height: 1.8; color: var(--text-primary); margin: 0;">
          <strong>Muscular endurance training</strong> develops the ability to sustain repeated contractions or maintain force output over extended periods. This comprehensive guide covers energy systems, metabolic adaptations, and sport-specific applications backed by research.
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-battery-three-quarters"></i> What is Muscular Endurance?</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        <strong>Muscular endurance</strong> is the capacity of muscles to perform repeated contractions against submaximal resistance or maintain a contraction for extended durations without fatigue. Unlike strength (maximal force) or hypertrophy (muscle size), endurance training prioritizes <strong>fatigue resistance</strong> and <strong>work capacity</strong>.
      </p>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        This quality is essential for athletes competing in endurance events, combat sports requiring sustained output, and occupations demanding prolonged physical exertion. Research shows trained endurance athletes can maintain 60-70% of maximal force output for extended periods compared to 20-30% in untrained individuals.
        <br><a href="https://pubmed.ncbi.nlm.nih.gov/17326698/" target="_blank" style="color: var(--secondary); text-decoration: none; font-weight: 600;">📖 Moritani et al., 1981 - Neural factors in muscle endurance</a>
      </p>

      <h4 style="margin-top: 24px; color: var(--text-primary); font-size: 17px;"><i class="fas fa-bolt"></i> Types of Muscular Endurance</h4>
      <div style="display: grid; gap: 16px; margin-top: 12px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #10b981; border-radius: 8px;">
          <strong style="color: #10b981; font-size: 16px;">1. Dynamic Muscular Endurance</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Ability to perform repeated concentric and eccentric contractions (e.g., push-ups, squats, running). Most common type, involving rhythmic movement patterns.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Examples:</strong> CrossFit WODs, circuit training, high-rep calisthenics, distance running
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #059669; border-radius: 8px;">
          <strong style="color: #059669; font-size: 16px;">2. Static Muscular Endurance (Isometric)</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Ability to maintain a fixed position under load without movement (e.g., planks, wall sits). Tests time-to-exhaustion at constant force output.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Examples:</strong> Gymnastics holds, rock climbing, core stabilization
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #047857; border-radius: 8px;">
          <strong style="color: #047857; font-size: 16px;">3. Anaerobic Muscular Endurance</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Ability to sustain high-intensity efforts for 30 seconds to 2 minutes, heavily taxing glycolytic system. Characterized by lactate accumulation and "burn."
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Examples:</strong> 400m-800m running, 100m-200m swimming, wrestling matches
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #065f46; border-radius: 8px;">
          <strong style="color: #065f46; font-size: 16px;">4. Aerobic Muscular Endurance</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Ability to sustain low-to-moderate intensity efforts for extended periods (>2 minutes), relying primarily on oxidative metabolism.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Examples:</strong> Distance running, cycling, swimming; military ruck marches
          </p>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-chart-line"></i> Physiological Adaptations</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Muscular endurance training triggers specific metabolic and structural adaptations that enhance fatigue resistance:
      </p>

      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #10b981; border-radius: 8px;">
          <strong style="color: #10b981; font-size: 17px;">1. Mitochondrial Biogenesis</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>The Powerhouse Expansion:</strong> High-rep training dramatically increases mitochondrial density (number and size) in muscle cells. Mitochondria are the "powerhouses" producing ATP aerobically.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Mechanism:</strong> Endurance training activates PGC-1α (peroxisome proliferator-activated receptor gamma coactivator 1-alpha), the master regulator of mitochondrial biogenesis. This increases oxidative capacity by 50-100% in trained individuals.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Result:</strong> More efficient energy production, reduced reliance on glycolysis, less lactate accumulation, improved fat oxidation
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/18162482/" target="_blank" style="color: var(--secondary);">Holloszy, 2008 - Regulation of mitochondrial biogenesis</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/15947721/" target="_blank" style="color: var(--secondary);">Hood et al., 2006 - Exercise-induced mitochondrial adaptations</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #10b981; border-radius: 8px;">
          <strong style="color: #10b981; font-size: 17px;">2. Capillary Density (Angiogenesis)</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Enhanced Blood Flow:</strong> Training increases capillary density around muscle fibers by 15-25%, creating a denser vascular network for oxygen and nutrient delivery.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Mechanism:</strong> Repeated muscle contractions create local hypoxia (low oxygen), triggering VEGF (vascular endothelial growth factor) release. This stimulates new capillary formation around active muscle fibers.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Result:</strong> Faster oxygen delivery, improved waste removal, better thermoregulation, enhanced recovery
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/577088/" target="_blank" style="color: var(--secondary);">Andersen & Henriksson, 1977 - Capillary supply</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/19910840/" target="_blank" style="color: var(--secondary);">Egginton, 2009 - Activity-induced angiogenesis</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #10b981; border-radius: 8px;">
          <strong style="color: #10b981; font-size: 17px;">3. Enhanced Buffering Capacity</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Lactate Tolerance:</strong> Training improves muscle's ability to buffer hydrogen ions (H+) and manage lactate accumulation, the primary causes of "the burn" during high-rep sets.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Mechanisms:</strong>
          </p>
          <ul style="margin: 8px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Increased buffering proteins:</strong> Carnosine, bicarbonate systems</li>
            <li><strong>Enhanced lactate clearance:</strong> Better transport and utilization as fuel</li>
            <li><strong>Improved pH regulation:</strong> Maintains optimal enzyme function</li>
          </ul>
          <div style="margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/15064596/" target="_blank" style="color: var(--secondary);">Bishop et al., 2004 - Effects on buffering capacity</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/20847704/" target="_blank" style="color: var(--secondary);">Edge et al., 2006 - Lactate threshold adaptations</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #10b981; border-radius: 8px;">
          <strong style="color: #10b981; font-size: 17px;">4. Fiber Type Transformation</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Shift Toward Endurance:</strong> Endurance training causes Type IIx (fast-twitch glycolytic) fibers to become more Type IIa (fast-twitch oxidative), gaining endurance characteristics while maintaining some power.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Note:</strong> Complete conversion (IIx → IIa → I) is limited. Training primarily enhances oxidative capacity of existing fibers rather than fully converting fiber types.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/2674114/" target="_blank" style="color: var(--secondary);">Pette & Staron, 1997 - Fiber type transformations</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #10b981; border-radius: 8px;">
          <strong style="color: #10b981; font-size: 17px;">5. Substrate Utilization Efficiency</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            Training improves the body's ability to use fat as fuel during submaximal efforts, sparing glycogen for higher intensities. Trained athletes can oxidize 50-100% more fat at given intensities.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Result:</strong> Extended performance before glycogen depletion ("hitting the wall"), improved endurance capacity
          </p>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-cogs"></i> Evidence-Based Training Parameters</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Research-backed guidelines for maximizing muscular endurance:
      </p>

      <div style="overflow-x: auto; margin-top: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #10b981; font-weight: 700;">Variable</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #10b981; font-weight: 700;">Optimal Range</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #10b981; font-weight: 700;">Scientific Rationale</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Rep Range</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">15-30+ reps (or 30-120s)</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Extended time under tension promotes metabolic adaptations. Higher reps (20-30+) develop aerobic endurance, moderate reps (15-20) target anaerobic endurance.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/22990567/" target="_blank" style="color: var(--secondary); font-size: 12px;">Schoenfeld et al., 2015 - Effects of rep ranges</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Sets per Exercise</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">2-5 sets</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Moderate volume allows accumulation of high-rep work. Total time under tension matters more than set count. Circuit training may use 1-2 sets per exercise with multiple rounds.
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Frequency</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">3-6x per week</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                High frequency enhances metabolic adaptations. Endurance recovers faster than strength, allowing more frequent training. Daily sessions possible with proper load management.
                <br><a href="https://pubmed.ncbi.nlm.nih.gov/11991778/" target="_blank" style="color: var(--secondary); font-size: 12px;">Bompa & Buzzichelli, 2015 - Periodization for endurance</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Intensity (Load)</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">40-70% 1RM</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Light to moderate loads allow high reps without excessive joint stress. Lower intensities (40-50%) develop aerobic endurance, higher (60-70%) target anaerobic capacity.
              </td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Rest Between Sets</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">30-90 seconds</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">
                Short rest periods maintain metabolic stress and simulate endurance conditions. 30-45s for conditioning, 60-90s for strength-endurance. Circuit training may use minimal rest.
              </td>
            </tr>
            <tr>
              <td style="padding: 14px;"><strong>Tempo</strong></td>
              <td style="padding: 14px;">Steady, controlled pace<br>Or varied for HIIT</td>
              <td style="padding: 14px; line-height: 1.6;">
                Consistent tempo maintains metabolic demand. Explosive movements (plyometrics) develop power-endurance. Varied tempo in intervals trains multiple energy systems.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px; padding: 16px; background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 8px;">
        <p style="margin: 0; line-height: 1.7; color: var(--text-secondary);">
          <strong style="color: #10b981;">💡 Key Takeaway:</strong> Muscular endurance training emphasizes time under tension and metabolic stress through high reps, moderate loads, and short rest periods. Focus on accumulating volume while managing fatigue.
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-fire"></i> Training Methods for Endurance</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Various training approaches effectively build muscular endurance:
      </p>

      <div style="display: grid; gap: 12px; margin-top: 16px;">
        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #10b981;">
          <summary style="font-weight: 700; font-size: 15px; color: #10b981; cursor: pointer;">🔄 Circuit Training</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Method:</strong> Perform series of exercises back-to-back with minimal rest, then repeat circuit</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Example:</strong> 5 exercises, 15-20 reps each, 30s rest between exercises, 2-3min rest between circuits, 3-5 rounds</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Benefits:</strong> Time-efficient, combines strength and cardio, high metabolic demand, sport-specific</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> General fitness, fat loss, work capacity, functional training</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #10b981;">
          <summary style="font-weight: 700; font-size: 15px; color: #10b981; cursor: pointer;">⚡ High-Intensity Interval Training (HIIT)</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Method:</strong> Alternate between high-intensity work and low-intensity recovery periods</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Example:</strong> 30-60s max effort, 60-120s active recovery, 8-12 rounds</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Benefits:</strong> Improves both aerobic and anaerobic capacity, time-efficient, boosts metabolism</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Athletes, fat loss, conditioning, VO2max improvement</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #10b981;">
          <summary style="font-weight: 700; font-size: 15px; color: #10b981; cursor: pointer;">🎯 Tempo Training</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Method:</strong> Maintain specific tempo for extended duration (e.g., 60-90s per set)</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Example:</strong> 3-1-3-1 tempo (3s eccentric, 1s pause, 3s concentric, 1s pause), 10-15 reps</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Benefits:</strong> Increased time under tension, muscle control, mind-muscle connection</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Hypertrophy, technique refinement, injury prevention</p>
          </div>
        </details>

        <details style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border-left: 3px solid #10b981;">
          <summary style="font-weight: 700; font-size: 15px; color: #10b981; cursor: pointer;">🏋️ Complexes & Density Training</summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Method:</strong> Perform multiple exercises with same implement without rest, or accumulate max volume in set time</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Example:</strong> Barbell complex: Row-Clean-Press-Squat-RDL, 6 reps each, 4 rounds</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Benefits:</strong> Intense metabolic demand, full-body conditioning, efficient</p>
            <p style="line-height: 1.7; color: var(--text-secondary); margin: 8px 0;"><strong>Best for:</strong> Conditioning, fat loss, time-crunched athletes</p>
          </div>
        </details>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-utensils"></i> Nutrition for Muscular Endurance</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Endurance training has unique nutritional demands:
      </p>

      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #10b981; font-size: 16px;">🍚 Carbohydrates: THE Priority</strong>
          <p style="margin: 12px 0 0 0; line-height: 1.7; color: var(--text-secondary);">
            <strong>5-10 g/kg daily</strong> - Highest carb needs of any training type. Glycogen depletion is primary limiter of endurance performance. Pre-training carbs maximize performance, post-training replenishment is critical for recovery.
          </p>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #10b981; font-size: 16px;">🥩 Protein: 1.2-1.6 g/kg</strong>
          <p style="margin: 12px 0 0 0; line-height: 1.7; color: var(--text-secondary);">
            Lower than strength/hypertrophy training. Focus on recovery and preventing catabolism during long sessions. Distribute evenly across meals. Leucine-rich sources post-training.
          </p>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #10b981; font-size: 16px;">💧 Hydration: Critical</strong>
          <p style="margin: 12px 0 0 0; line-height: 1.7; color: var(--text-secondary);">
            <strong>Before:</strong> 5-7 ml/kg 2-4hrs pre-training. <strong>During:</strong> 0.4-0.8 L/hr depending on sweat rate. <strong>After:</strong> 150% of fluid lost (weigh pre/post). Electrolytes essential for sessions >1hr.
          </p>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #10b981; font-size: 16px;">💊 Effective Supplements</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Beta-alanine (3-6g/day):</strong> Buffers lactate, delays fatigue</li>
            <li><strong>Sodium bicarbonate (0.3g/kg):</strong> Improves buffering capacity for high-intensity work</li>
            <li><strong>Caffeine (3-6mg/kg):</strong> Enhances endurance performance, reduces perceived effort</li>
            <li><strong>Beetroot juice/Nitrates:</strong> Improves oxygen efficiency, reduces energy cost</li>
          </ul>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-clock"></i> Timeline of Endurance Adaptations</h3>
      <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px; margin-top: 16px;">
        <ul style="margin: 0; padding: 0 0 0 20px; line-height: 2; color: var(--text-secondary);">
          <li><strong>Weeks 1-2:</strong> Neuromuscular coordination improvements, reduced perceived exertion</li>
          <li><strong>Weeks 2-4:</strong> Initial metabolic adaptations, improved lactate clearance</li>
          <li><strong>Weeks 4-8:</strong> Significant mitochondrial biogenesis, increased capillary density</li>
          <li><strong>Weeks 8-12:</strong> Enhanced buffering capacity, improved substrate utilization</li>
          <li><strong>Months 3-6:</strong> Fiber type adaptations, optimized energy systems</li>
          <li><strong>6+ months:</strong> Continued refinement, approaching genetic potential for endurance</li>
        </ul>
        <p style="margin: 16px 0 0 0; font-size: 14px; color: var(--text-secondary); line-height: 1.7;">
          <strong>Note:</strong> Endurance adaptations occur faster than strength but detrain quickly - consistency is key!
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-user-check"></i> Who Should Focus on Muscular Endurance?</h3>
      <div style="display: grid; gap: 10px; margin-top: 16px;">
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #10b981; border-radius: 6px;">
          <strong style="color: #10b981;">✓ Endurance Athletes</strong> - Runners, cyclists, swimmers, triathletes
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #10b981; border-radius: 6px;">
          <strong style="color: #10b981;">✓ Combat Sports</strong> - MMA, boxing, wrestling requiring sustained output
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #10b981; border-radius: 6px;">
          <strong style="color: #10b981;">✓ CrossFit & Functional Fitness</strong> - Work capacity emphasis
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #10b981; border-radius: 6px;">
          <strong style="color: #10b981;">✓ Military & Tactical Athletes</strong> - Rucking, long missions, sustained operations
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #10b981; border-radius: 6px;">
          <strong style="color: #10b981;">✓ Team Sports</strong> - Soccer, basketball, lacrosse with repeated sprints
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #10b981; border-radius: 6px;">
          <strong style="color: #10b981;">✓ General Fitness & Fat Loss</strong> - High metabolic demand training
        </div>
      </div>

      <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%); border-radius: 12px; border: 2px solid rgba(16, 185, 129, 0.3);">
        <h4 style="margin: 0 0 12px 0; color: #10b981; font-size: 17px;"><i class="fas fa-book-open"></i> Further Reading & Resources</h4>
        <div style="display: grid; gap: 8px;">
          <a href="https://www.strongerbyscience.com/complete-strength-training-guide/#Muscular_Endurance" target="_blank" style="color: var(--secondary); text-decoration: none; line-height: 1.6;">📘 Stronger by Science - Muscular Endurance Training</a>
          <a href="https://www.8weeksout.com/" target="_blank" style="color: var(--secondary); text-decoration: none; line-height: 1.6;">📘 8 Weeks Out - Conditioning for Combat Sports</a>
          <a href="https://www.crossfit.com/essentials/metabolic-conditioning" target="_blank" style="color: var(--secondary); text-decoration: none; line-height: 1.6;">📘 CrossFit - Metabolic Conditioning Principles</a>
          <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3737860/" target="_blank" style="color: var(--secondary); text-decoration: none; line-height: 1.6;">📄 NCBI - Endurance Training Adaptations (Review)</a>
          <strong style="margin-top: 8px; display: block; color: #10b981;">Recommended Books:</strong>
          <span style="color: var(--text-secondary); font-size: 14px; line-height: 1.7;">
            • "Tactical Barbell: Conditioning" - K. Black<br>
            • "The Science of Running" - Steve Magness<br>
            • "Training for the New Alpinism" - House & Johnston<br>
            • "Overcoming Gravity" - Steven Low (bodyweight endurance)
          </span>
        </div>
      </div>
    </div>

    <!-- Cardio Training -->
    <div id="cardio-section" class="card">
      <h2 style="color: var(--warning);"><i class="fas fa-heartbeat"></i> Cardiovascular Training</h2>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%); border-radius: 12px; margin-bottom: 24px;">
        <p style="font-size: 15px; line-height: 1.8; color: var(--text-primary); margin: 0;">
          <strong>Cardiovascular training</strong> is the foundation of health and endurance performance, improving the efficiency of oxygen delivery and utilization. This comprehensive guide covers heart rate zones, VO2max science, training methods, and longevity benefits backed by research.
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-heart-pulse"></i> What is Cardiovascular Training?</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        <strong>Cardiovascular (cardio) training</strong>, also called aerobic exercise, systematically improves the cardiovascular and respiratory systems' ability to deliver oxygen to working muscles and utilize it for energy production. Unlike resistance training that primarily stresses muscles, cardio training primarily stresses the <strong>heart, lungs, and blood vessels</strong>.
      </p>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        This type of training is the most powerful intervention for improving overall health, reducing disease risk, and extending lifespan. Research shows regular cardio training reduces cardiovascular disease risk by 30-40%, all-cause mortality by 20-30%, and significantly improves quality of life in all age groups.
        <br><a href="https://pubmed.ncbi.nlm.nih.gov/26181488/" target="_blank" style="color: var(--warning); text-decoration: none; font-weight: 600;">📖 Wen et al., 2011 - Minimum exercise for mortality reduction</a>
      </p>

      <h4 style="margin-top: 24px; color: var(--text-primary); font-size: 17px;"><i class="fas fa-stopwatch"></i> Types of Cardiovascular Training</h4>
      <div style="display: grid; gap: 16px; margin-top: 12px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f59e0b; border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 16px;">1. LISS (Low-Intensity Steady State)</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Continuous moderate intensity (Zone 2: 60-70% HRmax) for extended periods (30-90 minutes). The "conversational pace" - you can talk but not sing.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Examples:</strong> Jogging, cycling, swimming, brisk walking, rowing<br>
            <strong>Benefits:</strong> Fat oxidation, aerobic base, recovery, longevity
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f97316; border-radius: 8px;">
          <strong style="color: #f97316; font-size: 16px;">2. MISS (Moderate-Intensity Steady State)</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Sustained efforts at lactate threshold pace (Zone 3: 70-80% HRmax) for 20-40 minutes. The "comfortably hard" intensity where lactate begins accumulating.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Examples:</strong> Tempo runs, threshold pace cycling<br>
            <strong>Benefits:</strong> Lactate threshold improvement, race pace tolerance
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #dc2626; border-radius: 8px;">
          <strong style="color: #dc2626; font-size: 16px;">3. HIIT (High-Intensity Interval Training)</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Alternating periods of high intensity (Zone 4-5: 85-100% HRmax) with recovery periods. Work intervals typically 20 seconds to 4 minutes.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Examples:</strong> Sprint intervals, cycling intervals, rowing intervals<br>
            <strong>Benefits:</strong> VO2max improvement, time-efficient, EPOC (afterburn)
          </p>
        </div>
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #84cc16; border-radius: 8px;">
          <strong style="color: #84cc16; font-size: 16px;">4. SIT (Sprint Interval Training)</strong>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            Very short (8-30 seconds), all-out maximal efforts with longer recovery (2-4 minutes). Most intense form of interval training.
          </p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Examples:</strong> Tabata protocol, Wingate test, all-out sprints<br>
            <strong>Benefits:</strong> Maximum anaerobic capacity, power, extreme time efficiency
          </p>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-heart"></i> Cardiovascular Adaptations</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Cardiovascular training triggers powerful central and peripheral adaptations:
      </p>

      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f59e0b; border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 17px;">1. Cardiac Hypertrophy & Increased Stroke Volume</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>"Athlete's Heart":</strong> The left ventricle enlarges and walls thicken, increasing chamber size and contractility. This allows the heart to pump more blood per beat (stroke volume).
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Result:</strong> Resting heart rate decreases (bradycardia) - elite endurance athletes often have RHR 35-45 bpm vs 70-80 bpm in untrained individuals. Same cardiac output achieved with fewer beats = more efficient.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/18483213/" target="_blank" style="color: var(--warning);">Levine, 2008 - VO2max knowledge</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/17075401/" target="_blank" style="color: var(--warning);">Mandsager et al., 2018 - Cardiorespiratory fitness and mortality</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f59e0b; border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 17px;">2. Enhanced VO2max (Maximal Oxygen Uptake)</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>VO2max</strong> is the maximum rate your body can consume oxygen during exercise, measured in ml/kg/min. It's the gold standard measure of cardiovascular fitness and single strongest predictor of longevity.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Factors:</strong> Cardiac output (heart rate × stroke volume) × arteriovenous oxygen difference (a-vO2 diff). Training improves both delivery (central) and extraction (peripheral).
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Reference values:</strong> Untrained males 35-40 ml/kg/min, females 30-35. Elite endurance athletes reach 70-85 ml/kg/min. Training can increase VO2max 15-30%.
          </p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/10926927/" target="_blank" style="color: var(--warning);">Bassett & Howley, 2000 - Limiting factors for VO2max</a>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/30125275/" target="_blank" style="color: var(--warning);">Mandsager et al., 2018 - VO2max and all-cause mortality</a>
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f59e0b; border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 17px;">3. Increased Blood Volume & Hemoglobin</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            Training increases plasma volume by 10-20% and total blood volume by 20-25%. More red blood cells and hemoglobin improve oxygen-carrying capacity.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Result:</strong> More oxygen delivered per heartbeat, enhanced endurance, better thermoregulation
          </p>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f59e0b; border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 17px;">4. Improved Lactate Threshold</strong>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);">
            <strong>Lactate threshold (LT)</strong> is the intensity where lactate production exceeds clearance, causing accumulation and fatigue. Training increases LT from ~50-60% VO2max to 75-85% in trained athletes.
          </p>
          <p style="margin-top: 10px; line-height: 1.7; color: var(--text-secondary); font-size: 14px;">
            <strong>Importance:</strong> Can sustain higher pace before "hitting the wall." Often better predictor of race performance than VO2max.
          </p>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-left: 4px solid #f59e0b; border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 17px;">5. Metabolic & Health Benefits</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Improved insulin sensitivity:</strong> Better glucose regulation, reduced diabetes risk</li>
            <li><strong>Enhanced fat oxidation:</strong> Burns more fat at given intensities</li>
            <li><strong>Reduced blood pressure:</strong> 5-7 mmHg reduction in hypertensive individuals</li>
            <li><strong>Improved lipid profile:</strong> Higher HDL, lower LDL and triglycerides</li>
            <li><strong>Reduced inflammation:</strong> Lower systemic inflammatory markers</li>
          </ul>
          <div style="margin-top: 12px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/17921630/" target="_blank" style="color: var(--warning);">Helgerud et al., 2007 - Aerobic high-intensity intervals</a>
            </p>
          </div>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-layer-group"></i> Heart Rate Training Zones</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        Training zones based on percentage of maximum heart rate (HRmax = 220 - age). Each zone targets specific physiological adaptations:
      </p>

      <div style="overflow-x: auto; margin-top: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #f59e0b; font-weight: 700;">Zone</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #f59e0b; font-weight: 700;">% HRmax</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #f59e0b; font-weight: 700;">Feel/RPE</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #f59e0b; font-weight: 700;">Duration</th>
              <th style="padding: 14px; text-align: left; border-bottom: 2px solid #f59e0b; font-weight: 700;">Primary Benefits</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Zone 1: Recovery</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">50-60%</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">Very easy, RPE 3-4</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">20-60 min</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">Active recovery, promotes blood flow, mental health. Can hold conversation easily.</td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Zone 2: Endurance</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">60-70%</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">Comfortable, RPE 5-6</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">30-120 min</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;"><strong>THE FOUNDATION ZONE.</strong> Fat oxidation, mitochondrial biogenesis, capillary density. 70-80% of training should be here.</td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Zone 3: Tempo</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">70-80%</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">Moderate, RPE 7</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">20-60 min</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">Lactate threshold improvement. "Comfortably hard" - can speak in short sentences. Use sparingly.</td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);"><strong>Zone 4: Threshold</strong></td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">80-90%</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">Hard, RPE 8</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border);">10-40 min</td>
              <td style="padding: 14px; border-bottom: 1px solid var(--border); line-height: 1.6;">VO2max improvement, lactate buffering. Intervals or sustained tempo. Talking difficult.</td>
            </tr>
            <tr style="background: var(--bg-secondary);">
              <td style="padding: 14px;"><strong>Zone 5: Maximal</strong></td>
              <td style="padding: 14px;">90-100%</td>
              <td style="padding: 14px;">Very hard, RPE 9-10</td>
              <td style="padding: 14px;">30s - 8 min intervals</td>
              <td style="padding: 14px; line-height: 1.6;">Anaerobic capacity, neuromuscular power, peak VO2max. Sprint intervals. Cannot talk. Use sparingly.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px; padding: 16px; background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 8px;">
        <p style="margin: 0; line-height: 1.7; color: var(--text-secondary);">
          <strong style="color: #f59e0b;">💡 80/20 Rule:</strong> Elite endurance athletes spend ~80% of training time in Zones 1-2 (easy) and ~20% in Zones 4-5 (hard), avoiding Zone 3 "no man's land" which is too hard to recover from but too easy for quality adaptations.
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-running"></i> Training Methods: LISS vs HIIT</h3>
      <p style="line-height: 1.8; color: var(--text-secondary); margin-top: 12px;">
        The two primary approaches with different benefits and applications:
      </p>

      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 20px; background: var(--bg-secondary); border-radius: 8px; border: 2px solid #10b981;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <strong style="color: #10b981; font-size: 18px;">🚶 LISS (Low-Intensity Steady State)</strong>
          </div>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);"><strong>Method:</strong> Continuous moderate intensity (Zone 2) for 30-120 minutes</p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary);"><strong>Pros:</strong> Sustainable, low injury risk, improves fat oxidation, builds aerobic base, promotes recovery, can be done daily, enjoyable</p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary);"><strong>Cons:</strong> Time-consuming, slower VO2max improvements, less metabolic stimulus</p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary);"><strong>Best for:</strong> Health/longevity, fat loss, aerobic base, active recovery, beginners, complement to resistance training</p>
        </div>

        <div style="padding: 20px; background: var(--bg-secondary); border-radius: 8px; border: 2px solid #dc2626;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <strong style="color: #dc2626; font-size: 18px;">⚡ HIIT (High-Intensity Interval Training)</strong>
          </div>
          <p style="margin-top: 12px; line-height: 1.7; color: var(--text-secondary);"><strong>Method:</strong> Alternating high-intensity (Zone 4-5) with recovery periods</p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary);"><strong>Pros:</strong> Time-efficient (20-30 min), rapid VO2max gains, EPOC (afterburn effect), improves lactate threshold, mentally engaging</p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary);"><strong>Cons:</strong> High injury risk if overtrained, CNS fatigue, requires recovery, can't do daily, difficult/unenjoyable</p>
          <p style="margin-top: 8px; line-height: 1.7; color: var(--text-secondary);"><strong>Best for:</strong> Time-crunched individuals, athletes, VO2max improvement, performance goals. Limit to 2-3x/week.</p>
          <div style="margin-top: 12px; padding: 12px; background: rgba(220, 38, 38, 0.1); border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
              📚 <strong>Key Research:</strong>
              <br>• <a href="https://pubmed.ncbi.nlm.nih.gov/18197184/" target="_blank" style="color: var(--warning);">Gibala et al., 2008 - Metabolic adaptations to HIIT</a>
            </p>
          </div>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-utensils"></i> Nutrition for Cardiovascular Training</h3>
      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 16px;">🍚 Carbohydrates: Essential for Performance</strong>
          <p style="margin: 12px 0 0 0; line-height: 1.7; color: var(--text-secondary);">
            <strong>3-7 g/kg daily</strong> depending on volume. For sessions >90min: 30-60g carbs/hour during exercise improves performance. Post-exercise: 1.0-1.2 g/kg within 30-60 min to replenish glycogen.
          </p>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 16px;">💧 Hydration: Critical</strong>
          <p style="margin: 12px 0 0 0; line-height: 1.7; color: var(--text-secondary);">
            Pre: Start hydrated. During: 400-800ml/hr (sweat rate dependent). Post: Drink 150% of fluid lost. For >60min sessions, add electrolytes (sodium 300-600mg/hr).
          </p>
        </div>

        <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: #f59e0b; font-size: 16px;">💊 Ergogenic Aids</strong>
          <ul style="margin: 12px 0 0 20px; line-height: 1.8; color: var(--text-secondary);">
            <li><strong>Caffeine (3-6mg/kg):</strong> 2-5% performance improvement, reduced perceived effort</li>
            <li><strong>Beetroot juice:</strong> Nitrates improve oxygen efficiency, 1-2% time improvement</li>
            <li><strong>Beta-alanine:</strong> Buffers lactate for efforts 1-4 minutes</li>
          </ul>
        </div>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-clock"></i> Timeline of Cardiovascular Adaptations</h3>
      <div style="padding: 18px; background: var(--bg-secondary); border-radius: 8px; margin-top: 16px;">
        <ul style="margin: 0; padding: 0 0 0 20px; line-height: 2; color: var(--text-secondary);">
          <li><strong>Days 1-7:</strong> Increased plasma volume, reduced perceived effort</li>
          <li><strong>Weeks 2-4:</strong> Stroke volume increases, resting HR begins dropping</li>
          <li><strong>Weeks 4-8:</strong> Significant VO2max improvements (5-15%), lactate threshold gains</li>
          <li><strong>Weeks 8-12:</strong> Continued cardiac adaptations, mitochondrial density peaks</li>
          <li><strong>Months 3-6:</strong> Near-maximal VO2max gains (15-25% from baseline)</li>
          <li><strong>6-12+ months:</strong> Refinement, approach genetic potential, focus on efficiency</li>
        </ul>
        <p style="margin: 16px 0 0 0; font-size: 14px; color: var(--text-secondary); line-height: 1.7;">
          <strong>Important:</strong> Cardio adaptations occur quickly but also detrain rapidly - 2-3 weeks of inactivity causes 5-10% VO2max decline. Consistency is essential!
        </p>
      </div>

      <h3 style="margin-top: 32px; color: var(--text-primary); font-size: 20px;"><i class="fas fa-user-check"></i> Who Should Focus on Cardiovascular Training?</h3>
      <div style="display: grid; gap: 10px; margin-top: 16px;">
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #f59e0b; border-radius: 6px;">
          <strong style="color: #f59e0b;">✓ EVERYONE for Health</strong> - Single most powerful health intervention
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #f59e0b; border-radius: 6px;">
          <strong style="color: #f59e0b;">✓ Endurance Athletes</strong> - Runners, cyclists, swimmers, triathletes (primary focus)
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #f59e0b; border-radius: 6px;">
          <strong style="color: #f59e0b;">✓ Weight Loss Goals</strong> - Creates caloric deficit, improves fat oxidation
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #f59e0b; border-radius: 6px;">
          <strong style="color: #f59e0b;">✓ Cardiovascular Disease Risk</strong> - Reduces risk by 30-40%
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #f59e0b; border-radius: 6px;">
          <strong style="color: #f59e0b;">✓ Longevity Focus</strong> - Each 1 MET increase in VO2max = 13% lower mortality
        </div>
        <div style="padding: 14px 18px; background: var(--bg-secondary); border-left: 3px solid #f59e0b; border-radius: 6px;">
          <strong style="color: #f59e0b;">✓ Mental Health</strong> - Reduces anxiety, depression; improves cognition
        </div>
      </div>

      <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%); border-radius: 12px; border: 2px solid rgba(251, 191, 36, 0.3);">
        <h4 style="margin: 0 0 12px 0; color: #f59e0b; font-size: 17px;"><i class="fas fa-book-open"></i> Further Reading & Resources</h4>
        <div style="display: grid; gap: 8px;">
          <a href="https://www.strongerbyscience.com/cardio-101/" target="_blank" style="color: var(--warning); text-decoration: none; line-height: 1.6;">📘 Stronger by Science - Cardio 101</a>
          <a href="https://www.outsideonline.com/health/training-performance/endurance-training-intensity-80-20/" target="_blank" style="color: var(--warning); text-decoration: none; line-height: 1.6;">📘 80/20 Endurance Training Method</a>
          <a href="https://uphill-athlete.com/" target="_blank" style="color: var(--warning); text-decoration: none; line-height: 1.6;">📘 Uphill Athlete - Endurance Training</a>
          <a href="https://www.trainingpeaks.com/learn/" target="_blank" style="color: var(--warning); text-decoration: none; line-height: 1.6;">📘 TrainingPeaks - Heart Rate Training Zones</a>
          <a href="https://pubmed.ncbi.nlm.nih.gov/30125275/" target="_blank" style="color: var(--warning); text-decoration: none; line-height: 1.6;">📄 PubMed - Mandsager et al., 2018 - VO2max and mortality</a>
          <strong style="margin-top: 8px; display: block; color: #f59e0b;">Recommended Books:</strong>
          <span style="color: var(--text-secondary); font-size: 14px; line-height: 1.7;">
            • "80/20 Running" - Matt Fitzgerald<br>
            • "The Big Book of Endurance Training and Racing" - Philip Maffetone<br>
            • "Training for the Uphill Athlete" - House & Johnston<br>
            • "The Cyclist's Training Bible" - Joe Friel
          </span>
        </div>
      </div>
    </div>

    <!-- Comparison Section -->
    <div id="comparison-section" class="card" style="background: linear-gradient(135deg, var(--bg-primary) 0%, var(--light) 100%);">
      <h2><i class="fas fa-balance-scale"></i> Training Method Comparison</h2>
      
      <div style="overflow-x: auto; margin-top: 20px;">
        <table style="width: 100%; border-collapse: collapse; background: var(--bg-primary);">
          <tr style="background: var(--primary); color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid var(--border);">Aspect</th>
            <th style="padding: 12px; text-align: left; border: 1px solid var(--border);">Hypertrophy</th>
            <th style="padding: 12px; text-align: left; border: 1px solid var(--border);">Strength</th>
            <th style="padding: 12px; text-align: left; border: 1px solid var(--border);">Endurance</th>
            <th style="padding: 12px; text-align: left; border: 1px solid var(--border);">Cardio</th>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid var(--border); font-weight: 600;">Primary Goal</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Muscle size ↑</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Force production ↑</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Fatigue resistance ↑</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Aerobic capacity ↑</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid var(--border); font-weight: 600;">Rep Range</td>
            <td style="padding: 12px; border: 1px solid var(--border);">6-15 reps</td>
            <td style="padding: 12px; border: 1px solid var(--border);">1-6 reps</td>
            <td style="padding: 12px; border: 1px solid var(--border);">15-25+ reps</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Continuous</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid var(--border); font-weight: 600;">Intensity</td>
            <td style="padding: 12px; border: 1px solid var(--border);">60-85% 1RM</td>
            <td style="padding: 12px; border: 1px solid var(--border);">85-100% 1RM</td>
            <td style="padding: 12px; border: 1px solid var(--border);">40-60% 1RM</td>
            <td style="padding: 12px; border: 1px solid var(--border);">50-90% HRmax</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid var(--border); font-weight: 600;">Rest Periods</td>
            <td style="padding: 12px; border: 1px solid var(--border);">60-120 sec</td>
            <td style="padding: 12px; border: 1px solid var(--border);">3-5 min</td>
            <td style="padding: 12px; border: 1px solid var(--border);">30-60 sec</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Varies</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid var(--border); font-weight: 600;">Weekly Frequency</td>
            <td style="padding: 12px; border: 1px solid var(--border);">2-3x per muscle</td>
            <td style="padding: 12px; border: 1px solid var(--border);">3-6x</td>
            <td style="padding: 12px; border: 1px solid var(--border);">3-5x</td>
            <td style="padding: 12px; border: 1px solid var(--border);">3-6x</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid var(--border); font-weight: 600;">Primary Adaptation</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Structural (muscle fibers)</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Neural (motor units)</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Metabolic (mitochondria)</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Cardiovascular (heart, lungs)</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid var(--border); font-weight: 600;">Time to See Results</td>
            <td style="padding: 12px; border: 1px solid var(--border);">6-12 weeks</td>
            <td style="padding: 12px; border: 1px solid var(--border);">4-8 weeks</td>
            <td style="padding: 12px; border: 1px solid var(--border);">4-8 weeks</td>
            <td style="padding: 12px; border: 1px solid var(--border);">2-6 weeks</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid var(--border); font-weight: 600;">Calorie Burn</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Moderate</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Low-Moderate</td>
            <td style="padding: 12px; border: 1px solid var(--border);">Moderate-High</td>
            <td style="padding: 12px; border: 1px solid var(--border);">High</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-puzzle-piece"></i> Can You Combine Them?</h3>
      <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 12px;">
        <strong>Yes!</strong> Concurrent training (combining multiple training styles) is effective when properly programmed. Research shows:
      </p>
      <ul style="margin-top: 12px; line-height: 2; color: var(--text-secondary);">
        <li><strong>Hypertrophy + Cardio:</strong> Moderate cardio doesn't impair muscle growth. Keep cardio sessions separate from resistance training or on non-lifting days.</li>
        <li><strong>Strength + Cardio:</strong> High-intensity cardio may interfere with strength gains. Prioritize strength training and use low-intensity cardio.</li>
        <li><strong>Periodization:</strong> Cycle through different training phases (e.g., 4-6 weeks hypertrophy, 4-6 weeks strength, 2-3 weeks endurance).</li>
        <li><strong>Interference Effect:</strong> Excessive cardio can inhibit muscle and strength gains. Limit to 2-3 sessions per week if building muscle/strength is primary.</li>
      </ul>
      <p style="margin-top: 12px; font-size: 13px; font-style: italic; color: var(--text-secondary);">
        Source: Wilson, J.M., et al. (2012). Concurrent training: a meta-analysis. Journal of Strength and Conditioning Research.
      </p>
    </div>

    <!-- Training Variables -->
    <div id="variables-section" class="card">
      <h2><i class="fas fa-sliders-h"></i> Key Training Variables</h2>
      
      <div style="display: grid; gap: 16px; margin-top: 20px;">
        <!-- Volume -->
        <div style="padding: 20px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid var(--primary);">
          <h3 style="color: var(--primary); margin-bottom: 12px;"><i class="fas fa-chart-bar"></i> Volume</h3>
          <p style="line-height: 1.7; color: var(--text-secondary);">
            <strong>Definition:</strong> Total amount of work performed (Sets × Reps × Weight)
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Importance:</strong> Volume is the primary driver of hypertrophy. More volume generally equals more growth, up to a point (10-20 sets per muscle per week).
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Progressive Overload:</strong> Gradually increase volume over time by adding sets, reps, or weight.
          </p>
        </div>

        <!-- Intensity -->
        <div style="padding: 20px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid var(--danger);">
          <h3 style="color: var(--danger); margin-bottom: 12px;"><i class="fas fa-fire"></i> Intensity</h3>
          <p style="line-height: 1.7; color: var(--text-secondary);">
            <strong>Definition:</strong> Percentage of one-rep max (1RM) or effort level (RPE)
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Importance:</strong> Determines the type of adaptation. Higher intensity (>85% 1RM) = strength. Moderate (60-85%) = hypertrophy.
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>RPE Scale:</strong> Rate of Perceived Exertion (1-10 scale). RPE 7-9 is ideal for most training.
          </p>
        </div>

        <!-- Frequency -->
        <div style="padding: 20px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid var(--secondary);">
          <h3 style="color: var(--secondary); margin-bottom: 12px;"><i class="fas fa-calendar-alt"></i> Frequency</h3>
          <p style="line-height: 1.7; color: var(--text-secondary);">
            <strong>Definition:</strong> How often you train a muscle group per week
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Importance:</strong> Higher frequency (2-3x per week per muscle) allows for better volume distribution and more frequent protein synthesis stimulation.
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Recommendation:</strong> Train each muscle group at least 2x per week for optimal growth.
          </p>
        </div>

        <!-- Rest -->
        <div style="padding: 20px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid var(--warning);">
          <h3 style="color: var(--warning); margin-bottom: 12px;"><i class="fas fa-pause-circle"></i> Rest & Recovery</h3>
          <p style="line-height: 1.7; color: var(--text-secondary);">
            <strong>Definition:</strong> Time between sets and between training sessions
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Between Sets:</strong> Strength (3-5 min), Hypertrophy (60-120 sec), Endurance (30-60 sec)
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Between Sessions:</strong> Allow 48-72 hours recovery for the same muscle group. Sleep 7-9 hours for optimal recovery.
          </p>
        </div>

        <!-- Tempo -->
        <div style="padding: 20px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid #9333ea;">
          <h3 style="color: #9333ea; margin-bottom: 12px;"><i class="fas fa-stopwatch"></i> Tempo</h3>
          <p style="line-height: 1.7; color: var(--text-secondary);">
            <strong>Definition:</strong> Speed of movement during each rep (Eccentric-Pause-Concentric-Pause)
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Hypertrophy:</strong> 2-3 sec eccentric, 1 sec concentric (controlled)
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Strength:</strong> Explosive concentric, controlled eccentric
          </p>
          <p style="line-height: 1.7; color: var(--text-secondary); margin-top: 8px;">
            <strong>Importance:</strong> Time under tension affects muscle growth and neural adaptation.
          </p>
        </div>
      </div>
    </div>

    <!-- Scientific Resources -->
    <div class="card" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
      <h2><i class="fas fa-book-open"></i> Scientific References & Further Reading</h2>
      
      <div style="margin-top: 20px;">
        <h3 style="color: var(--text-primary); margin-bottom: 12px;">Key Research Papers</h3>
        <ul style="line-height: 2; color: var(--text-secondary); font-size: 14px;">
          <li>Schoenfeld, B.J. (2010). "The mechanisms of muscle hypertrophy and their application to resistance training." <em>Journal of Strength and Conditioning Research</em>, 24(10), 2857-2872.</li>
          <li>Kraemer, W.J. & Ratamess, N.A. (2004). "Fundamentals of resistance training: progression and exercise prescription." <em>Medicine and Science in Sports and Exercise</em>, 36(4), 674-688.</li>
          <li>Gibala, M.J., et al. (2012). "Physiological adaptations to low-volume, high-intensity interval training in health and disease." <em>Journal of Physiology</em>, 590(5), 1077-1084.</li>
          <li>Wilson, J.M., et al. (2012). "Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises." <em>Journal of Strength and Conditioning Research</em>, 26(8), 2293-2307.</li>
          <li>Helgerud, J., et al. (2007). "Aerobic high-intensity intervals improve VO2max more than moderate training." <em>Medicine and Science in Sports and Exercise</em>, 39(4), 665-671.</li>
        </ul>
      </div>

      <div style="margin-top: 24px;">
        <h3 style="color: var(--text-primary); margin-bottom: 12px;">Recommended Books</h3>
        <ul style="line-height: 2; color: var(--text-secondary); font-size: 14px;">
          <li><strong>"Science and Practice of Strength Training"</strong> by Vladimir Zatsiorsky & William Kraemer</li>
          <li><strong>"The Muscle and Strength Pyramid: Training"</strong> by Eric Helms, Andy Morgan, & Andrea Valdez</li>
          <li><strong>"Periodization Training for Sports"</strong> by Tudor Bompa & Carlo Buzzichelli</li>
          <li><strong>"Essentials of Strength Training and Conditioning"</strong> by NSCA</li>
        </ul>
      </div>

      <div style="margin-top: 24px;">
        <h3 style="color: var(--text-primary); margin-bottom: 12px;">Evidence-Based Resources</h3>
        <ul style="line-height: 2; color: var(--text-secondary); font-size: 14px;">
          <li><strong>Stronger By Science:</strong> Research reviews and practical applications</li>
          <li><strong>Renaissance Periodization:</strong> Science-based hypertrophy and strength content</li>
          <li><strong>MASS Research Review:</strong> Monthly journal article reviews</li>
          <li><strong>PubMed/NCBI:</strong> Direct access to research papers</li>
        </ul>
      </div>
    </div>

    <!-- Disclaimer -->
    <div style="padding: 16px; background: var(--light); border-radius: 12px; border: 2px dashed var(--border); margin-top: 24px;">
      <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
        <i class="fas fa-info-circle" style="color: var(--primary);"></i> 
        <strong>Disclaimer:</strong> This information is for educational purposes only and should not replace professional medical or training advice. Always consult with a qualified healthcare provider or certified trainer before beginning any new exercise program, especially if you have pre-existing health conditions. Individual results may vary based on genetics, training experience, nutrition, recovery, and other factors.
      </p>
    </div>
  \`;
}
`;
