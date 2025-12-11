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
  return kg * 2.20462;
}

function lbsToKg(lbs) {
  return lbs / 2.20462;
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

function formatWeight(kg, system) {
  if (!kg) return 'N/A';
  system = system || (state.user && state.user.measurement_system) || 'metric';
  if (system === 'imperial') {
    return \`\${Math.round(kgToLbs(kg))} lbs\`;
  }
  return \`\${Math.round(kg)} kg\`;
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
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  
  // Find and activate the correct tab button by matching onclick attribute
  const targetTab = Array.from(document.querySelectorAll('.tab')).find(tab => {
    const onclick = tab.getAttribute('onclick');
    return onclick && onclick.includes(\`'\${tabName}'\`) || onclick && onclick.includes(\`"\${tabName}"\`);
  });
  
  if (targetTab) {
    targetTab.classList.add('active');
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
    case 'achievements':
      loadAchievements();
      break;
    case 'nutrition':
      loadNutrition();
      break;
    case 'learn':
      loadLearn();
      break;
  }
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
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
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
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = \`
      <h3>\${program.name}</h3>
      <p>\${program.days_per_week} days per week | \${program.goal}</p>
      <p><em>\${program.equipment}</em></p>

      \${program.days.map(day => \`
        <div style="margin: 20px 0; padding: 20px; background: var(--light); border-radius: 12px;">
          <h4 style="margin-bottom: 12px;">Day \${day.day_number}: \${day.name}</h4>
          <p style="color: var(--gray); margin-bottom: 16px; font-weight: 500;">\${day.focus}</p>
          
          <strong style="display: block; margin-bottom: 8px;">Warm-up Stretches:</strong>
          <ul style="margin: 0 0 16px 20px; line-height: 1.8;">
            \${day.stretches.map(s => \`
              <li>\${s.name} - \${s.duration_seconds}s (\${s.muscle_group})</li>
            \`).join('')}
          </ul>

          <strong style="display: block; margin-bottom: 8px;">Exercises:</strong>
          <ol style="margin: 0 0 0 20px; line-height: 1.8;">
            \${day.exercises.map(ex => \`
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
    
    // Calculate total volume
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    
    workout.exercises.forEach(ex => {
      if (ex.sets) {
        ex.sets.forEach(set => {
          totalVolume += (set.weight_kg * set.reps);
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
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 24px;">
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
          <div style="font-size: 24px; font-weight: bold;">\${workout.exercises?.length || 0}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Exercises</div>
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

    <p style="font-size: 14px; color: var(--gray); margin: 16px 0;">
      AI will generate a personalized program based on your profile and available equipment.
    </p>

    <button class="btn btn-primary" onclick="generateProgram()">
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
        goal
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
    
    // Create the workout
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
      <div style="display: flex; flex-direction: column; gap: 12px;">
        \${day.exercises && day.exercises.length > 0 ? day.exercises.map((ex, idx) => \`
          <div style="background: var(--light); border-radius: 12px; padding: 16px; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
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

// Load workout interface
async function loadWorkoutInterface() {
  const container = document.getElementById('workout');
  
  try {
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    const workout = data.workout;

    // Start workout timer if not already started
    if (!state.workoutTimer) {
      startWorkoutTimer();
    }

    const totalSets = workout.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const totalVolume = workout.exercises.reduce((sum, ex) => {
      return sum + (ex.sets || []).reduce((exSum, set) => exSum + (set.weight_kg * set.reps), 0);
    }, 0);

    container.innerHTML = \`
      <!-- Header Card -->
      <div class="card" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; border: none;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <h2 style="color: white; margin-bottom: 8px;"><i class="fas fa-dumbbell"></i> \${workout.day_name || 'Workout Session'}</h2>
            <div style="font-size: 14px; opacity: 0.9;">\${workout.day_focus || 'Strength Training'}</div>
          </div>
          <div style="text-align: right;">
            <div id="workoutTimer" style="font-size: 32px; font-weight: bold; font-family: 'Courier New', monospace;">00:00:00</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Duration</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2);">
          <div>
            <div style="font-size: 12px; opacity: 0.8;">Exercises</div>
            <div style="font-size: 24px; font-weight: bold;">\${workout.exercises.length}</div>
          </div>
          <div>
            <div style="font-size: 12px; opacity: 0.8;">Sets Completed</div>
            <div style="font-size: 24px; font-weight: bold;">\${totalSets}</div>
          </div>
          <div>
            <div style="font-size: 12px; opacity: 0.8;">Volume (kg)</div>
            <div style="font-size: 24px; font-weight: bold;">\${Math.round(totalVolume)}</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="completeWorkout()" style="flex: 1; min-width: 150px;">
            <i class="fas fa-check-circle"></i> Complete Workout
          </button>
          <button class="btn btn-secondary" onclick="switchToCardio()" style="flex: 1; min-width: 150px;">
            <i class="fas fa-running"></i> Switch to Cardio
          </button>
          <button class="btn btn-danger" onclick="deleteWorkout()" style="min-width: 150px;">
            <i class="fas fa-trash"></i> Delete Workout
          </button>
        </div>
      </div>

      <!-- Rest Timer -->
      <div class="card" style="background: var(--light); border: 2px solid var(--border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0;"><i class="fas fa-clock"></i> Rest Timer</h3>
          <button class="btn btn-outline" onclick="stopRestTimer()" style="padding: 6px 12px; font-size: 12px;">
            <i class="fas fa-stop"></i> Reset
          </button>
        </div>
        <div id="restTimer" style="font-size: 48px; font-weight: bold; text-align: center; font-family: 'Courier New', monospace; color: var(--primary); margin: 16px 0;">00:00</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <button class="btn btn-secondary" onclick="startRestTimer(60)" style="font-size: 14px;">60s</button>
          <button class="btn btn-secondary" onclick="startRestTimer(90)" style="font-size: 14px;">90s</button>
          <button class="btn btn-secondary" onclick="startRestTimer(120)" style="font-size: 14px;">2min</button>
          <button class="btn btn-secondary" onclick="startRestTimer(180)" style="font-size: 14px;">3min</button>
        </div>
      </div>

      <!-- Exercises -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0;"><i class="fas fa-list-check"></i> Exercises</h3>
          <button class="btn btn-outline" onclick="addExerciseToWorkout()" style="padding: 8px 16px;">
            <i class="fas fa-plus"></i> Add Exercise
          </button>
        </div>
        <div id="exerciseList" style="display: flex; flex-direction: column; gap: 16px;">
          \${workout.exercises.map((ex, idx) => renderExerciseEnhanced(ex, idx)).join('')}
        </div>
      </div>

      <!-- Workout Notes -->
      <div class="card">
        <h3><i class="fas fa-sticky-note"></i> Session Notes</h3>
        <div style="background: var(--light); border-radius: 12px; padding: 16px; margin-top: 12px;">
          <textarea id="workoutNotes" 
            placeholder="How did this workout feel? Any modifications made? Energy levels? Notes for next time..." 
            style="width: 100%; min-height: 120px; border: 2px solid var(--border); border-radius: 8px; padding: 12px; font-size: 14px; resize: vertical; font-family: inherit;">\${workout.notes || ''}</textarea>
          <button class="btn btn-primary" onclick="saveWorkoutNotes()" style="margin-top: 12px; width: 100%;">
            <i class="fas fa-save"></i> Save Notes
          </button>
        </div>
      </div>
    \`;

    updateWorkoutTimerDisplay();
  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading workout: \${error.message}</p></div>\`;
  }
}

// Render exercise with enhanced UI
function renderExerciseEnhanced(exercise, index) {
  const system = (state.user && state.user.measurement_system) || 'metric';
  const isImperial = system === 'imperial';
  const weightUnit = isImperial ? 'lbs' : 'kg';
  const weightStep = isImperial ? '5' : '2.5';
  
  const completedSets = (exercise.sets || []).length;
  const targetSets = exercise.target_sets || 3;
  const setsProgress = Math.min((completedSets / targetSets) * 100, 100);
  
  // Auto-fill last weight and reps from previous set
  const lastSet = exercise.sets && exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1] : null;
  const defaultWeight = lastSet ? formatWeight(lastSet.weight_kg, system).replace(weightUnit, '').trim() : '';
  const defaultReps = lastSet ? lastSet.reps : (exercise.target_reps || '');
  
  return \`
    <div style="background: var(--white); border: 2px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);" id="exercise-\${exercise.id}">
      <!-- Exercise Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">
              \${index + 1}
            </div>
            <h4 style="margin: 0; font-size: 18px; font-weight: 600;">\${exercise.name}</h4>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <span style="background: var(--secondary-light); color: var(--secondary); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              <i class="fas fa-bullseye"></i> \${exercise.muscle_group}
            </span>
            <span style="background: var(--primary-light); color: var(--primary); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              <i class="fas fa-dumbbell"></i> \${exercise.equipment}
            </span>
            \${exercise.is_unilateral ? '<span style="background: var(--warning); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;"><i class="fas fa-balance-scale"></i> Unilateral</span>' : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: var(--primary);">\${completedSets}/\${targetSets}</div>
          <div style="font-size: 11px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px;">Sets</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div style="background: var(--light); height: 8px; border-radius: 4px; margin-bottom: 16px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%); height: 100%; width: \${setsProgress}%; transition: width 0.3s;"></div>
      </div>

      <!-- Exercise Tips (Comprehensive) -->
      \${exercise.tips ? \`
      <details style="margin-bottom: 16px; background: var(--light); border-radius: 12px; padding: 12px;">
        <summary style="cursor: pointer; font-weight: 600; color: var(--primary); user-select: none;">
          <i class="fas fa-lightbulb"></i> Form & Technique Guide
        </summary>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
          <div style="font-size: 14px; line-height: 1.6; color: var(--dark); white-space: pre-wrap;">\${exercise.tips}</div>
          \${exercise.target_reps ? \`
          <div style="margin-top: 12px; padding: 12px; background: var(--white); border-radius: 8px; border-left: 4px solid var(--primary);">
            <strong style="color: var(--primary);"><i class="fas fa-chart-line"></i> AI Recommendation:</strong><br>
            <span style="font-size: 14px;">\${targetSets} sets × \${exercise.target_reps} reps @ \${exercise.target_rpe ? \`RPE \${exercise.target_rpe}\` : 'moderate intensity'}</span>
          </div>
          \` : ''}
        </div>
      </details>
      \` : ''}

      <!-- Completed Sets -->
      \${(exercise.sets && exercise.sets.length > 0) ? \`
      <div style="margin-bottom: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: var(--gray); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          <i class="fas fa-check-circle"></i> Completed Sets
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
          \${exercise.sets.map((set, setIdx) => \`
            <div style="background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); color: white; padding: 12px; border-radius: 10px; position: relative;">
              <button onclick="deleteSet(\${exercise.id}, \${set.id})" 
                style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;"
                title="Delete set">
                <i class="fas fa-times"></i>
              </button>
              <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">Set \${set.set_number}</div>
              <div style="font-size: 18px; font-weight: bold;">\${formatWeight(set.weight_kg, system)} × \${set.reps}</div>
              <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">1RM: \${formatWeight(set.one_rep_max_kg, system)}</div>
            </div>
          \`).join('')}
        </div>
      </div>
      \` : ''}

      <!-- Add Set Form -->
      <div style="background: var(--light); border-radius: 12px; padding: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: var(--gray); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          <i class="fas fa-plus-circle"></i> Record Next Set
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 8px; align-items: end;">
          <div>
            <label style="font-size: 12px; color: var(--gray); display: block; margin-bottom: 4px; font-weight: 600;">Weight (\${weightUnit})</label>
            <input type="number" id="weight-\${exercise.id}" value="\${defaultWeight}" placeholder="0" step="\${weightStep}" 
                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 16px; font-weight: 600;">
          </div>
          <div>
            <label style="font-size: 12px; color: var(--gray); display: block; margin-bottom: 4px; font-weight: 600;">Reps</label>
            <input type="number" id="reps-\${exercise.id}" value="\${defaultReps}" placeholder="0" min="1"
                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 16px; font-weight: 600;">
          </div>
          <button class="btn btn-primary" onclick="recordSet(\${exercise.id})" style="padding: 12px 24px; font-size: 16px;">
            <i class="fas fa-check"></i> Add
          </button>
          <button class="btn btn-outline" onclick="showExerciseNotes(\${exercise.id})" style="padding: 12px 16px;">
            <i class="fas fa-sticky-note"></i>
          </button>
        </div>
      </div>
    </div>
  \`;
}

// Render exercise (legacy - keep for compatibility)
function renderExercise(exercise, index) {
  return renderExerciseEnhanced(exercise, index);
}

// Record set
async function recordSet(exerciseId) {
  let weight = parseFloat(document.getElementById(\`weight-\${exerciseId}\`).value);
  const reps = parseInt(document.getElementById(\`reps-\${exerciseId}\`).value);

  if (!weight || !reps) {
    showNotification('Please enter weight and reps', 'warning');
    return;
  }

  // Convert to kg if user is using imperial
  const system = (state.user && state.user.measurement_system) || 'metric';
  if (system === 'imperial') {
    weight = lbsToKg(weight);
  }

  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/sets\`, {
      method: 'POST',
      body: JSON.stringify({ weight_kg: weight, reps, rest_seconds: 90 })
    });

    showNotification('Set recorded!', 'success');
    loadWorkoutInterface();

    // Auto-start rest timer
    startRestTimer(90);
  } catch (error) {
    showNotification('Error recording set: ' + error.message, 'error');
  }
}

// Timers
function startWorkoutTimer() {
  state.workoutStartTime = Date.now();
  state.workoutTimer = setInterval(updateWorkoutTimerDisplay, 1000);
}

function updateWorkoutTimerDisplay() {
  if (!state.workoutStartTime) return;
  
  const elapsed = Math.floor((Date.now() - state.workoutStartTime) / 1000);
  const display = document.getElementById('workoutTimer');
  if (display) {
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
    const [progress, volumeData, bodyMap] = await Promise.all([
      api('/analytics/progress?days=90'),
      api('/analytics/volume?days=90&group_by=week'),
      api('/analytics/bodymap?days=7')
    ]);

    container.innerHTML = \`
      <div class="card">
        <h2><i class="fas fa-chart-line"></i> 90-Day Progress</h2>
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
    \`;

    // Load and display workout history
    await loadWorkoutHistory(container);

  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading analytics: \${error.message}</p></div>\`;
  }
}

// Load workout history for analytics
async function loadWorkoutHistory(container) {
  try {
    const workoutsData = await api('/workouts?limit=20');
    
    const historyHTML = \`
      <div class="card">
        <h2><i class="fas fa-history"></i> Workout History</h2>
        \${workoutsData.workouts.length > 0 ? \`
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Workout</th>
                  <th>Duration</th>
                  <th>Volume</th>
                  <th>Sets</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                \${workoutsData.workouts.map(w => \`
                  <tr>
                    <td>\${new Date(w.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td><strong>\${w.day_name || 'Custom Workout'}</strong></td>
                    <td>\${formatDuration(w.total_duration_seconds)}</td>
                    <td>\${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}</td>
                    <td>\${w.total_sets || 0}</td>
                    <td>
                      \${w.completed 
                        ? '<span style="background: var(--secondary-light); color: var(--secondary); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ Complete</span>' 
                        : '<span style="background: var(--warning); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">In Progress</span>'}
                    </td>
                    <td>
                      <button class="btn btn-outline" onclick="viewWorkout(\${w.id})" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="btn btn-danger" onclick="deleteAnalyticsWorkout(\${w.id})" style="padding: 6px 12px; font-size: 12px;">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \` : '<p>No workout history yet.</p>'}
      </div>
    \`;
    
    container.insertAdjacentHTML('beforeend', historyHTML);
  } catch (error) {
    console.error('Error loading workout history:', error);
  }
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
                      <td><strong style="color: var(--secondary);">\${pr.record_value.toFixed(1)} kg</strong></td>
                      <td>\${pr.previous_value ? pr.previous_value.toFixed(1) + ' kg' : '-'}</td>
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

        <!-- Export Options -->
        <div style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-outline" onclick="exportNutritionCSV('daily', 30)">
            <i class="fas fa-download"></i> Export Daily CSV (30 days)
          </button>
          <button class="btn btn-outline" onclick="exportNutritionCSV('weekly', 30)">
            <i class="fas fa-download"></i> Export Weekly CSV (30 days)
          </button>
          <button class="btn btn-outline" onclick="exportNutritionReport(30)">
            <i class="fas fa-file-alt"></i> Export Report (30 days)
          </button>
          <button class="btn btn-outline" onclick="exportNutritionCSV('daily', 90)">
            <i class="fas fa-download"></i> Export Daily CSV (90 days)
          </button>
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
                    <td><small>\${new Date(week.week_start).toLocaleDateString()} - \${new Date(week.week_end).toLocaleDateString()}</small></td>
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
                    <td><strong>\${new Date(day.date).toLocaleDateString()}</strong></td>
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
              \${daily_data.slice(-14).map(day => \`
                <div style="flex: 1; text-align: center;">
                  <div style="font-size: 11px; color: var(--gray); margin-bottom: 8px;">
                    \${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
              \`).join('')}
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

    <button class="btn btn-primary" onclick="saveProfile()">
      <i class="fas fa-save"></i> Save Profile
    </button>
  \`;

  document.getElementById('modalTitle').textContent = 'User Profile';
  openModal();
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
    showNotification('Profile updated!', 'success');
    closeModal();
    loadUser();
  } catch (error) {
    showNotification('Error saving profile: ' + error.message, 'error');
  }
}

// Utility functions
function formatDuration(seconds) {
  if (!seconds) return '00:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return \`\${String(hrs).padStart(2, '0')}:\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
  }
  
  return \`\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
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

// Delete a set
async function deleteSet(exerciseId, setId) {
  if (!confirm('Delete this set?')) return;
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}/exercises/\${exerciseId}/sets/\${setId}\`, {
      method: 'DELETE'
    });
    
    showNotification('Set deleted!', 'success');
    loadWorkoutInterface();
  } catch (error) {
    showNotification('Error deleting set: ' + error.message, 'error');
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
    background: white;
    z-index: 10000;
    overflow-y: auto;
  \`;
  
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
          <i class="fas fa-running" style="font-size: 40px; color: white;"></i>
        </div>
        <h1 style="font-size: 32px; margin: 0 0 12px 0;">Warm-Up & Stretch</h1>
        <p style="font-size: 18px; color: var(--gray); margin: 0;">Prepare your body for \${workout.day_name || 'your workout'}</p>
      </div>
      
      <!-- Warmup Exercises -->
      <div style="background: var(--light); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
          <i class="fas fa-list-check"></i> Recommended Warm-ups
        </h3>
        <div style="display: grid; gap: 12px;">
          \${warmups.slice(0, 6).map((warmup, idx) => \`
            <div style="background: white; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px;">
              <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                \${idx + 1}
              </div>
              <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 4px;">\${warmup.name}</strong>
                <span style="color: var(--gray); font-size: 13px;"><i class="fas fa-bullseye"></i> \${warmup.muscle}</span>
              </div>
              <span style="color: var(--gray); font-size: 13px;">30-60 sec</span>
            </div>
          \`).join('')}
        </div>
      </div>
      
      <!-- Tips -->
      <div style="background: var(--primary-light); border-left: 4px solid var(--primary); border-radius: 8px; padding: 16px; margin-bottom: 32px;">
        <strong style="display: block; margin-bottom: 8px; color: var(--primary);"><i class="fas fa-lightbulb"></i> Pro Tips</strong>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Start with light cardio to raise your heart rate</li>
          <li>Focus on the muscles you'll be training today</li>
          <li>Perform dynamic stretches (movement-based)</li>
          <li>Take 5-10 minutes to properly warm up</li>
        </ul>
      </div>
      
      <!-- Actions -->
      <div style="display: flex; gap: 12px; justify-content: center;">
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
}

// Cancel workout start
function cancelWorkoutStart() {
  const modal = document.getElementById('workout-modal');
  if (modal) modal.remove();
  
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
      z-index: 1000;
      overflow-y: auto;
      padding: 20px;
    \`;
    document.body.appendChild(modal);
  }
  
  // Initialize workout state if not exists
  if (!state.workoutExercise) {
    state.workoutExercise = {
      currentIndex: 0,
      completed: []
    };
  }
  
  // Start workout timer if not already started
  if (!state.workoutTimer) {
    startWorkoutTimer();
  }
  
  // Fetch latest workout data
  try {
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
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
  
  // Start workout timer
  if (!state.workoutTimer) {
    startWorkoutTimer();
  }
  
  // Fetch full workout data
  try {
    const data = await api(\`/workouts/\${state.currentWorkout.id}\`);
    state.currentWorkout = data.workout;
    
    // Render tabbed exercise interface
    renderWorkoutExerciseTabs();
    
  } catch (error) {
    showNotification('Error loading workout: ' + error.message, 'error');
  }
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
    showWorkoutSummary();
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
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; gap: 8px;">
          \${workout.exercises.map((ex, idx) => \`
            <button 
              onclick="switchToExercise(\${idx})"
              style="padding: 12px 20px; border: none; background: \${idx === currentIdx ? 'var(--primary)' : idx < currentIdx ? 'var(--secondary)' : 'white'}; color: \${idx === currentIdx || idx < currentIdx ? 'white' : 'var(--gray)'}; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; \${idx > currentIdx ? 'opacity: 0.5;' : ''}">
              \${idx < currentIdx ? '<i class="fas fa-check"></i>' : ''} \${ex.name.length > 20 ? ex.name.substring(0, 20) + '...' : ex.name}
            </button>
          \`).join('')}
        </div>
      </div>
      
      <!-- Exercise Content -->
      <div style="flex: 1; overflow-y: auto; background: var(--light);">
        <div style="max-width: 1200px; margin: 0 auto; padding: 24px 20px;">
          \${renderExerciseContent(currentExercise, currentIdx)}
        </div>
      </div>
      
      <!-- Footer Actions -->
      <div style="background: white; border-top: 2px solid var(--border); padding: 16px 20px; flex-shrink: 0; box-shadow: 0 -2px 10px rgba(0,0,0,0.05);">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline" onclick="previousExercise()" \${currentIdx === 0 ? 'disabled style="opacity: 0.5;"' : ''}>
              <i class="fas fa-arrow-left"></i> Previous
            </button>
            <button class="btn btn-outline" onclick="showWorkoutNotesModal()" title="Add workout notes">
              <i class="fas fa-note-sticky"></i> Notes
            </button>
          </div>
          <button class="btn btn-danger" onclick="endWorkoutEarly()">
            <i class="fas fa-stop"></i> End Workout
          </button>
          <button class="btn btn-primary" onclick="nextExercise()" style="min-width: 150px;">
            \${currentIdx === workout.exercises.length - 1 ? '<i class="fas fa-flag-checkered"></i> Finish' : '<i class="fas fa-arrow-right"></i> Next Exercise'}
          </button>
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
    
    // Focus on weight input
    if (weightInput) {
      weightInput.focus();
      
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
  }, 0); // Changed to 0 - no need to wait, elements are immediately available
}

// Render exercise content with set table
function renderExerciseContent(exercise, index) {
  const system = (state.user && state.user.measurement_system) || 'metric';
  const weightUnit = system === 'imperial' ? 'lbs' : 'kg';
  const completedSets = (exercise.sets || []).length;
  const targetSets = exercise.target_sets || 3;
  
  return \`
    <!-- Exercise Header -->
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div style="flex: 1;">
          <h2 style="margin: 0 0 12px 0;">\${exercise.name}</h2>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <span style="background: var(--secondary-light); color: var(--secondary); padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;">
              <i class="fas fa-bullseye"></i> \${exercise.muscle_group}
            </span>
            <span style="background: var(--primary-light); color: var(--primary); padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;">
              <i class="fas fa-dumbbell"></i> \${exercise.equipment}
            </span>
            \${exercise.is_unilateral ? '<span style="background: var(--warning); color: white; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;"><i class="fas fa-balance-scale"></i> Unilateral</span>' : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 36px; font-weight: bold; color: var(--primary);">\${completedSets}/\${targetSets}</div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Sets Complete</div>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div style="background: var(--light); height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%); height: 100%; width: \${Math.min((completedSets / targetSets) * 100, 100)}%; transition: width 0.3s;"></div>
      </div>
    </div>
    
    <!-- Exercise Tips -->
    \${exercise.tips ? \`
      <div class="card" style="margin-bottom: 20px;">
        <details open>
          <summary style="cursor: pointer; font-weight: 600; color: var(--primary); user-select: none; font-size: 16px;">
            <i class="fas fa-lightbulb"></i> Form & Technique Tips
          </summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); line-height: 1.6; color: var(--dark);">
            \${exercise.tips}
          </div>
        </details>
      </div>
    \` : ''}
    
    <!-- Set Table -->
    <div class="card">
      <h3 style="margin: 0 0 16px 0;"><i class="fas fa-table"></i> Set Tracker</h3>
      
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 80px;">Set</th>
              <th>Weight (\${weightUnit})</th>
              <th>Reps</th>
              <th style="width: 120px;">1RM</th>
              <th style="width: 100px;">Complete</th>
              <th style="width: 80px;">Actions</th>
            </tr>
          </thead>
          <tbody id="set-table-body">
            \${(exercise.sets || []).map((set, idx) => \`
              <tr style="background: var(--secondary-light);">
                <td><strong>\${set.set_number}</strong></td>
                <td><strong>\${formatWeight(set.weight_kg, system)}</strong></td>
                <td><strong>\${set.reps}</strong></td>
                <td>\${formatWeight(set.one_rep_max_kg, system)}</td>
                <td><span style="color: var(--secondary); font-size: 20px;"><i class="fas fa-check-circle"></i></span></td>
                <td>
                  <button class="btn btn-danger" onclick="deleteExerciseSet(\${exercise.id}, \${set.id})" style="padding: 4px 8px; font-size: 12px;">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            \`).join('')}
            \${completedSets < 10 ? \`
              <tr id="new-set-row">
                <td><strong>\${completedSets + 1}</strong></td>
                <td>
                  <input type="number" id="newSetWeight" placeholder="0" step="\${system === 'imperial' ? '5' : '2.5'}" 
                    style="width: 100%; padding: 8px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px;">
                </td>
                <td>
                  <input type="number" id="newSetReps" placeholder="0" min="1"
                    style="width: 100%; padding: 8px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px;">
                </td>
                <td colspan="2">
                  <button class="btn btn-primary" id="logSetButton" data-exercise-id="\${exercise.id}" style="width: 100%;">
                    <i class="fas fa-plus"></i> Log Set
                  </button>
                </td>
                <td></td>
              </tr>
            \` : ''}
          </tbody>
        </table>
      </div>
      
      \${completedSets >= targetSets ? \`
        <div style="margin-top: 16px; padding: 16px; background: var(--secondary-light); border-radius: 8px; text-align: center;">
          <i class="fas fa-check-circle" style="font-size: 24px; color: var(--secondary); margin-bottom: 8px;"></i>
          <div style="font-weight: 600; color: var(--secondary);">Target Sets Complete! Ready to move on.</div>
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
  const system = (state.user && state.user.measurement_system) || 'metric';
  if (system === 'imperial') {
    weight = weight * 0.453592;
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
      
      if (completedSets >= targetSets) {
        setTimeout(() => {
          if (confirm('Target sets complete! Move to next exercise?')) {
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
    showWorkoutSummary();
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

// End workout early
function endWorkoutEarly() {
  if (confirm('Are you sure you want to end this workout? Your progress will be saved.')) {
    showWorkoutSummary();
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
      return sum + (ex.sets || []).reduce((exSum, set) => exSum + (set.weight_kg * set.reps), 0);
    }, 0);
    const duration = workout.total_duration_seconds || 0;
    
    // Fun comparisons
    const comparison = getFunWeightComparison(totalVolume);
    
    modal.innerHTML = \`
      <div style="max-width: 900px; margin: 0 auto; padding: 40px 20px;">
        <!-- Success Icon -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 100px; height: 100px; background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-trophy" style="font-size: 50px; color: white;"></i>
          </div>
          <h1 style="font-size: 36px; margin: 0 0 12px 0;">Workout Complete!</h1>
          <p style="font-size: 18px; color: var(--gray); margin: 0;">Outstanding work today 💪</p>
        </div>
        
        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
          <div class="card" style="text-align: center;">
            <div style="font-size: 14px; color: var(--gray); text-transform: uppercase; margin-bottom: 8px;">Duration</div>
            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">\${formatDuration(duration)}</div>
          </div>
          <div class="card" style="text-align: center;">
            <div style="font-size: 14px; color: var(--gray); text-transform: uppercase; margin-bottom: 8px;">Total Sets</div>
            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">\${totalSets}</div>
          </div>
          <div class="card" style="text-align: center;">
            <div style="font-size: 14px; color: var(--gray); text-transform: uppercase; margin-bottom: 8px;">Total Volume</div>
            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">\${Math.round(totalVolume)} kg</div>
          </div>
        </div>
        
        <!-- Fun Comparison -->
        <div class="card" style="background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%); border: none; margin-bottom: 32px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="font-size: 60px;">\${comparison.emoji}</div>
            <div>
              <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">\${comparison.title}</div>
              <div style="font-size: 16px; color: var(--gray);">\${comparison.description}</div>
            </div>
          </div>
        </div>
        
        <!-- Exercise Summary -->
        <div class="card" style="margin-bottom: 32px;">
          <h3 style="margin: 0 0 16px 0;"><i class="fas fa-list-check"></i> Exercise Summary</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            \${workout.exercises.map((ex, idx) => \`
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--light); border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    \${idx + 1}
                  </div>
                  <strong>\${ex.name}</strong>
                </div>
                <span style="color: var(--gray);">\${(ex.sets || []).length} sets completed</span>
              </div>
            \`).join('')}
          </div>
        </div>
        
        <!-- Actions -->
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-outline" onclick="deleteCompletedWorkout()" style="min-width: 180px;">
            <i class="fas fa-trash"></i> Delete Workout
          </button>
          <button class="btn btn-primary" onclick="finishWorkoutSummary()" style="min-width: 200px; font-size: 16px;">
            <i class="fas fa-check"></i> Done
          </button>
        </div>
      </div>
    \`;
    
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

// Finish workout summary and return to dashboard
function finishWorkoutSummary() {
  const modal = document.getElementById('workout-modal');
  if (modal) modal.remove();
  
  // Clear workout state
  state.currentWorkout = null;
  state.workoutExercise = null;
  state.workoutNotes = '';
  state.keyboardShortcutsEnabled = false;
  
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

// Rest Timer System
function startRestTimer(seconds = 90) {
  // Clear any existing timer
  if (state.restTimerInterval) {
    clearInterval(state.restTimerInterval);
  }
  
  state.restTimeRemaining = seconds;
  
  // Create or update rest timer display
  let timerDisplay = document.getElementById('rest-timer-display');
  if (!timerDisplay) {
    timerDisplay = document.createElement('div');
    timerDisplay.id = 'rest-timer-display';
    timerDisplay.style.cssText = \`
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
      color: white;
      padding: 20px 30px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 10001;
      min-width: 200px;
      text-align: center;
      animation: slideInRight 0.3s ease-out;
    \`;
    document.body.appendChild(timerDisplay);
  }
  
  // Start countdown
  state.restTimerInterval = setInterval(() => {
    state.restTimeRemaining--;
    
    if (state.restTimeRemaining <= 0) {
      clearInterval(state.restTimerInterval);
      state.restTimerInterval = null;
      
      // Show notification
      showNotification('Rest complete! Ready for next set 💪', 'success');
      
      // Remove timer display with animation
      if (timerDisplay) {
        timerDisplay.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => timerDisplay.remove(), 300);
      }
      
      // Play sound if available
      playRestCompleteSound();
    } else {
      // Update display
      const mins = Math.floor(state.restTimeRemaining / 60);
      const secs = state.restTimeRemaining % 60;
      timerDisplay.innerHTML = \`
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Rest Timer</div>
        <div style="font-size: 48px; font-weight: bold; font-family: monospace; line-height: 1;">
          \${mins}:\${secs.toString().padStart(2, '0')}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: center; align-items: center;">
          <button class="btn btn-outline" onclick="adjustRestTimer(-15)" style="background: white; color: var(--primary); border: none; padding: 8px 12px; font-size: 12px; min-width: 50px;">
            -15s
          </button>
          <button class="btn btn-outline" onclick="skipRestTimer()" style="background: white; color: var(--primary); border: none; padding: 8px 16px; font-size: 12px;">
            Skip
          </button>
          <button class="btn btn-outline" onclick="adjustRestTimer(15)" style="background: white; color: var(--primary); border: none; padding: 8px 12px; font-size: 12px; min-width: 50px;">
            +15s
          </button>
        </div>
      \`;
    }
  }, 1000);
}

function skipRestTimer() {
  if (state.restTimerInterval) {
    clearInterval(state.restTimerInterval);
    state.restTimerInterval = null;
  }
  
  const timerDisplay = document.getElementById('rest-timer-display');
  if (timerDisplay) {
    timerDisplay.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => timerDisplay.remove(), 300);
  }
  
  showNotification('Rest skipped', 'info');
}

// Adjust rest timer by seconds (can be negative)
function adjustRestTimer(seconds) {
  if (!state.restTimerInterval) return;
  
  state.restTimeRemaining = Math.max(5, state.restTimeRemaining + seconds);
  
  // Immediate update display
  const timerDisplay = document.getElementById('rest-timer-display');
  if (timerDisplay) {
    const mins = Math.floor(state.restTimeRemaining / 60);
    const secs = state.restTimeRemaining % 60;
    timerDisplay.innerHTML = \`
      <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Rest Timer \${seconds > 0 ? '(+' + seconds + 's)' : '(' + seconds + 's)'}</div>
      <div style="font-size: 48px; font-weight: bold; font-family: monospace; line-height: 1;">
        \${mins}:\${secs.toString().padStart(2, '0')}
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: center; align-items: center;">
        <button class="btn btn-outline" onclick="adjustRestTimer(-15)" style="background: white; color: var(--primary); border: none; padding: 8px 12px; font-size: 12px; min-width: 50px;">
          -15s
        </button>
        <button class="btn btn-outline" onclick="skipRestTimer()" style="background: white; color: var(--primary); border: none; padding: 8px 16px; font-size: 12px;">
          Skip
        </button>
        <button class="btn btn-outline" onclick="adjustRestTimer(15)" style="background: white; color: var(--primary); border: none; padding: 8px 12px; font-size: 12px; min-width: 50px;">
          +15s
        </button>
      </div>
    \`;
  }
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

// Enhanced addExerciseSet with rest timer
const originalAddExerciseSet = addExerciseSet;
async function addExerciseSet(exerciseId) {
  await originalAddExerciseSet(exerciseId);
  
  // Start rest timer after logging set (unless it's the last set)
  const currentExercise = state.currentWorkout.exercises[state.workoutExercise.currentIndex];
  const completedSets = (currentExercise.sets || []).length;
  const targetSets = currentExercise.target_sets || 3;
  
  if (completedSets < targetSets) {
    // Start 90 second rest timer
    startRestTimer(90);
  }
}

// Enhanced startWorkoutExercises with keyboard shortcuts
const originalStartWorkoutExercises = startWorkoutExercises;
startWorkoutExercises = async function() {
  await originalStartWorkoutExercises();
  enableKeyboardShortcuts();
  
  // Show keyboard shortcuts hint
  setTimeout(() => {
    showNotification('💡 Press ? for keyboard shortcuts', 'info');
  }, 2000);
};

// Enhanced showWorkoutSummary with confetti
const originalShowWorkoutSummary = showWorkoutSummary;
showWorkoutSummary = async function() {
  await originalShowWorkoutSummary();
  
  // Trigger confetti animation
  setTimeout(() => triggerConfetti(), 500);
  
  disableKeyboardShortcuts();
};

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
