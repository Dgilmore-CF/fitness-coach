/**
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
  showNotification(`Switched to ${state.theme} mode`, 'success');
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
    return `${Math.round(kgToLbs(kg))} lbs`;
  }
  return `${Math.round(kg)} kg`;
}

function formatHeight(cm, system) {
  if (!cm) return 'N/A';
  system = system || (state.user && state.user.measurement_system) || 'metric';
  if (system === 'imperial') {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadUser();
  loadDashboard();
});

// API helper
async function api(endpoint, options = {}) {
  const response = await fetch(`/api${endpoint}`, {
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
  event.target.classList.add('active');

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

    container.innerHTML = `
      <div class="card">
        <h2><i class="fas fa-chart-line"></i> 30-Day Progress</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Workouts</div>
            <div class="stat-value">${progress.overview.total_workouts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Weight Lifted</div>
            <div class="stat-value">${formatWeight(progress.overview.total_volume_kg)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Time</div>
            <div class="stat-value">${formatDuration(progress.overview.total_time_seconds)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Workout</div>
            <div class="stat-value">${formatDuration(progress.overview.average_workout_time)}</div>
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
        ${recentWorkouts.workouts.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${recentWorkouts.workouts.map(w => `
              <div style="background: var(--white); border: 2px solid var(--border); border-radius: 12px; overflow: hidden; transition: all 0.3s;" id="workout-card-${w.id}">
                <!-- Workout Header -->
                <div style="padding: 16px; cursor: pointer;" onclick="toggleWorkoutDetails(${w.id})">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="background: ${w.completed ? 'var(--secondary)' : 'var(--warning)'}; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                          <i class="fas fa-${w.completed ? 'check' : 'clock'}"></i>
                        </div>
                        <div>
                          <strong style="font-size: 16px;">${w.day_name || 'Custom Workout'}</strong>
                          <div style="color: var(--gray); font-size: 13px;">
                            ${new Date(w.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                        <span style="font-size: 13px; color: var(--gray);">
                          <i class="fas fa-clock"></i> ${formatDuration(w.total_duration_seconds)}
                        </span>
                        <span style="font-size: 13px; color: var(--gray);">
                          <i class="fas fa-weight-hanging"></i> ${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      ${w.completed ? '<span style="background: var(--secondary-light); color: var(--secondary); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ Complete</span>' : '<span style="background: var(--warning); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">In Progress</span>'}
                      <i class="fas fa-chevron-down" id="workout-chevron-${w.id}" style="transition: transform 0.3s;"></i>
                    </div>
                  </div>
                </div>
                <!-- Expandable Details -->
                <div id="workout-details-${w.id}" style="display: none; border-top: 1px solid var(--border); background: var(--light); padding: 20px;">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Training Time</div>
                      <div style="font-size: 18px; font-weight: 600;">${formatDuration(w.total_duration_seconds)}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Exercises</div>
                      <div style="font-size: 18px; font-weight: 600;">${w.exercise_count || 0}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Sets</div>
                      <div style="font-size: 18px; font-weight: 600;">${w.total_sets || 0}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Volume</div>
                      <div style="font-size: 18px; font-weight: 600;">${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}</div>
                    </div>
                  </div>
                  ${w.notes ? `
                    <div style="background: var(--white); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                      <div style="font-size: 12px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Session Notes</div>
                      <div style="font-size: 14px; line-height: 1.5;">${w.notes}</div>
                    </div>
                  ` : ''}
                  <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-outline" onclick="event.stopPropagation(); viewWorkout(${w.id})" style="flex: 1;">
                      <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); deleteDashboardWorkout(${w.id})">
                      <i class="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p>No workouts yet. Start your first workout!</p>'}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="card"><p>Error loading dashboard: ${error.message}</p></div>`;
  }
}

// Programs
async function loadPrograms() {
  const container = document.getElementById('program');
  
  try {
    const data = await api('/programs');
    const activeProgram = data.programs.find(p => p.active);
    
    container.innerHTML = `
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

      ${activeProgram ? `
        <div class="card" style="border: 2px solid var(--secondary);">
          <h2><i class="fas fa-check-circle"></i> Active Program</h2>
          <div onclick="viewProgram(${activeProgram.id})" style="cursor: pointer;">
            <h3>${activeProgram.name}</h3>
            <p>${activeProgram.days_per_week} days per week | ${activeProgram.goal}</p>
          </div>
          <button class="btn btn-secondary" onclick="viewProgram(${activeProgram.id})">
            View Details
          </button>
        </div>
      ` : ''}

      <div class="card">
        <h2><i class="fas fa-folder"></i> All Programs</h2>
        ${data.programs.length > 0 ? `
          <div class="exercise-list">
            ${data.programs.map(p => `
              <div class="exercise-item ${p.active ? 'active' : ''}" onclick="viewProgram(${p.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>${p.name}</strong>
                    <div style="color: var(--gray); font-size: 14px;">
                      ${p.days_per_week} days/week | ${p.goal} | ${p.ai_generated ? '🤖 AI Generated' : 'Custom'}
                    </div>
                  </div>
                  <div>
                    ${p.active ? '<span style="color: var(--secondary); font-weight: bold;">ACTIVE</span>' : `
                      <button class="btn btn-outline" onclick="event.stopPropagation(); activateProgram(${p.id})">
                        Activate
                      </button>
                    `}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p>No programs yet. Generate your first program!</p>'}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="card"><p>Error loading programs: ${error.message}</p></div>`;
  }
}

// View program details
async function viewProgram(programId) {
  try {
    const data = await api(`/programs/${programId}`);
    const program = data.program;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <h3>${program.name}</h3>
      <p>${program.days_per_week} days per week | ${program.goal}</p>
      <p><em>${program.equipment}</em></p>

      ${program.days.map(day => `
        <div style="margin: 20px 0; padding: 20px; background: var(--light); border-radius: 12px;">
          <h4 style="margin-bottom: 12px;">Day ${day.day_number}: ${day.name}</h4>
          <p style="color: var(--gray); margin-bottom: 16px; font-weight: 500;">${day.focus}</p>
          
          <strong style="display: block; margin-bottom: 8px;">Warm-up Stretches:</strong>
          <ul style="margin: 0 0 16px 20px; line-height: 1.8;">
            ${day.stretches.map(s => `
              <li>${s.name} - ${s.duration_seconds}s (${s.muscle_group})</li>
            `).join('')}
          </ul>

          <strong style="display: block; margin-bottom: 8px;">Exercises:</strong>
          <ol style="margin: 0 0 0 20px; line-height: 1.8;">
            ${day.exercises.map(ex => `
              <li style="margin-bottom: 16px;">
                <div style="margin-bottom: 6px;">
                  <strong style="font-size: 15px;">${ex.name}</strong> - ${ex.target_sets} sets x ${ex.target_reps} reps
                </div>
                <div style="font-size: 13px; color: var(--gray); margin-bottom: 8px;">
                  Rest: ${ex.rest_seconds}s | ${ex.muscle_group} | ${ex.equipment}
                </div>
                ${ex.tips ? `
                  <details style="margin-top: 8px; padding: 12px; background: var(--white); border-radius: 8px; border: 1px solid var(--border);">
                    <summary style="cursor: pointer; color: var(--primary); font-weight: 600; font-size: 13px;">
                      <i class="fas fa-info-circle"></i> Exercise Tips & Form Cues
                    </summary>
                    <div style="margin-top: 12px; font-size: 13px; line-height: 1.6; color: var(--dark);">
                      ${ex.tips}
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
                ` : ''}
              </li>
            `).join('')}
          </ol>
        </div>
      `).join('')}

      <div style="margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="startWorkoutFromProgram(${program.id})">
          <i class="fas fa-play"></i> Start Workout
        </button>
        ${!program.active ? `
          <button class="btn btn-secondary" onclick="activateProgram(${program.id})">
            Set as Active
          </button>
        ` : ''}
        <button class="btn btn-danger" onclick="deleteProgram(${program.id})">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;

    document.getElementById('modalTitle').textContent = 'Program Details';
    openModal(true); // Pass true for wide modal
  } catch (error) {
    showNotification('Error loading program: ' + error.message, 'error');
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
  modalBody.innerHTML = `
    <h3>Create Custom Program - Step 1</h3>
    <p style="color: var(--gray); margin-bottom: 20px;">Enter your program details</p>
    
    <div class="form-group">
      <label>Program Name:</label>
      <input type="text" id="programName" class="form-control" placeholder="e.g., My Push/Pull/Legs" value="${manualProgramState.name}">
    </div>
    
    <div class="form-group">
      <label>Days per week:</label>
      <select id="daysPerWeek" class="form-control">
        <option value="3" ${manualProgramState.days_per_week === 3 ? 'selected' : ''}>3 days</option>
        <option value="4" ${manualProgramState.days_per_week === 4 ? 'selected' : ''}>4 days</option>
        <option value="5" ${manualProgramState.days_per_week === 5 ? 'selected' : ''}>5 days</option>
        <option value="6" ${manualProgramState.days_per_week === 6 ? 'selected' : ''}>6 days</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>Goal:</label>
      <select id="programGoal" class="form-control">
        <option value="hypertrophy" ${manualProgramState.goal === 'hypertrophy' ? 'selected' : ''}>Hypertrophy (Muscle Growth)</option>
        <option value="strength" ${manualProgramState.goal === 'strength' ? 'selected' : ''}>Strength</option>
        <option value="endurance" ${manualProgramState.goal === 'endurance' ? 'selected' : ''}>Endurance</option>
      </select>
    </div>
    
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveManualProgramStep1()">
        Next: Configure Days <i class="fas fa-arrow-right"></i>
      </button>
    </div>
  `;
  
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
      name: `Day ${i + 1}`,
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
  modalBody.innerHTML = `
    <h3>Day ${day.day_number} of ${manualProgramState.days_per_week}</h3>
    <p style="color: var(--gray); margin-bottom: 20px;">Configure this workout day</p>
    
    <div class="form-group">
      <label>Day Name:</label>
      <input type="text" id="dayName" class="form-control" placeholder="e.g., Upper Body Push" value="${day.name}">
    </div>
    
    <div class="form-group">
      <label>Focus/Description:</label>
      <input type="text" id="dayFocus" class="form-control" placeholder="e.g., Chest, Shoulders, Triceps" value="${day.focus}">
    </div>
    
    <div class="form-group">
      <label>Select Exercises (${day.exercises.length} selected):</label>
      <div style="max-height: 400px; overflow-y: auto; border: 1.5px solid var(--border); border-radius: 10px; padding: 16px;">
        ${Object.keys(exercisesByMuscle).sort().map(muscleGroup => `
          <div style="margin-bottom: 20px;">
            <h4 style="color: var(--primary); font-size: 14px; margin-bottom: 8px;">${muscleGroup}</h4>
            ${exercisesByMuscle[muscleGroup].map(ex => {
              const isSelected = day.exercises.some(e => e.exercise_id === ex.id);
              const selectedEx = day.exercises.find(e => e.exercise_id === ex.id);
              return `
                <div style="padding: 12px; margin-bottom: 8px; background: ${isSelected ? 'var(--primary-light)' : 'var(--white)'}; border: 1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; border-radius: 8px;">
                  <label style="display: flex; align-items: start; cursor: pointer; margin: 0;">
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''}
                           onchange="toggleExerciseSelection(${ex.id}, '${ex.name.replace(/'/g, "\\'")}')"
                           style="margin-right: 12px; margin-top: 4px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600; margin-bottom: 4px;">${ex.name}</div>
                      <div style="font-size: 12px; color: var(--gray);">${ex.equipment}</div>
                      ${isSelected ? `
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">
                          <input type="number" 
                                 value="${selectedEx.sets || 3}"
                                 onchange="updateExerciseConfig(${ex.id}, 'sets', this.value)"
                                 placeholder="Sets"
                                 min="1"
                                 style="padding: 6px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px;">
                          <input type="text" 
                                 value="${selectedEx.reps || '8-12'}"
                                 onchange="updateExerciseConfig(${ex.id}, 'reps', this.value)"
                                 placeholder="Reps"
                                 style="padding: 6px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px;">
                          <input type="number" 
                                 value="${selectedEx.rest_seconds || 90}"
                                 onchange="updateExerciseConfig(${ex.id}, 'rest_seconds', this.value)"
                                 placeholder="Rest (s)"
                                 min="30"
                                 step="15"
                                 style="padding: 6px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px;">
                        </div>
                      ` : ''}
                    </div>
                  </label>
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap;">
      ${manualProgramState.currentDayIndex > 0 ? `
        <button class="btn btn-outline" onclick="manualProgramState.currentDayIndex--; showManualProgramDayBuilder()">
          <i class="fas fa-arrow-left"></i> Previous Day
        </button>
      ` : ''}
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveManualProgramDay()" style="margin-left: auto;">
        ${manualProgramState.currentDayIndex < manualProgramState.days_per_week - 1 ? 'Next Day' : 'Finish & Save'} 
        <i class="fas fa-${manualProgramState.currentDayIndex < manualProgramState.days_per_week - 1 ? 'arrow-right' : 'check'}"></i>
      </button>
    </div>
  `;
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
  day.name = document.getElementById('dayName').value.trim() || `Day ${day.day_number}`;
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
  modalBody.innerHTML = `
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
  `;

  document.getElementById('modalTitle').textContent = 'Generate AI Program';
  openModal();
}

// Generate program
async function generateProgram() {
  const days = document.getElementById('daysPerWeek').value;
  const goal = document.getElementById('programGoal').value;

  // Show loading state in modal
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
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
        <p style="margin: 8px 0;"><i class="fas fa-spinner fa-spin" style="color: var(--primary);"></i> Building ${days}-day program...</p>
        <p style="margin: 8px 0; color: var(--gray-light);"><i class="fas fa-clock"></i> Optimizing sets and rest periods...</p>
      </div>
      
      <p style="margin-top: 24px; font-size: 13px; color: var(--gray);">This usually takes 10-30 seconds</p>
    </div>
  `;

  try {
    await api('/programs/generate', {
      method: 'POST',
      body: JSON.stringify({
        days_per_week: parseInt(days),
        goal
      })
    });

    // Show success state
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="margin-bottom: 24px;">
          <i class="fas fa-check-circle" style="font-size: 64px; color: var(--secondary);"></i>
        </div>
        <h3 style="color: var(--dark); margin-bottom: 12px;">Program Generated Successfully!</h3>
        <p style="color: var(--gray); margin-bottom: 24px;">Your new ${days}-day ${goal} program is ready</p>
        <button class="btn btn-primary" onclick="closeModal(); loadPrograms();">
          <i class="fas fa-list"></i> View My Programs
        </button>
      </div>
    `;
    
    // Auto-close and refresh after 2 seconds
    setTimeout(() => {
      closeModal();
      loadPrograms();
    }, 2000);
  } catch (error) {
    // Show error state
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="margin-bottom: 24px;">
          <i class="fas fa-exclamation-circle" style="font-size: 64px; color: var(--danger);"></i>
        </div>
        <h3 style="color: var(--dark); margin-bottom: 12px;">Generation Failed</h3>
        <p style="color: var(--gray); margin-bottom: 24px;">${error.message}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-outline" onclick="closeModal();">Close</button>
          <button class="btn btn-primary" onclick="showGenerateProgram();">Try Again</button>
        </div>
      </div>
    `;
  }
}

// Activate program
async function activateProgram(programId) {
  try {
    await api(`/programs/${programId}/activate`, { method: 'POST' });
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
    await api(`/programs/${programId}`, { method: 'DELETE' });
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
    const programData = await api(`/programs/${activeProgram.id}`);
    const program = programData.program;

    if (!program || !program.days || program.days.length === 0) {
      showNotification('No workout days found in this program', 'warning');
      return;
    }

    // Show day selection
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <h3>Select Workout Day</h3>
      <div class="exercise-list">
        ${program.days.map(day => `
          <div class="exercise-item" onclick="startWorkoutDay(${program.id}, ${day.id})">
            <strong>Day ${day.day_number}: ${day.name || 'Workout Day'}</strong>
            <div style="color: var(--gray); font-size: 14px;">${day.focus || 'Training'}</div>
            <div style="font-size: 12px; margin-top: 4px;">${(day.exercises && day.exercises.length) || 0} exercises</div>
          </div>
        `).join('')}
      </div>
    `;

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
    const programData = await api(`/programs/${programId}`);
    const program = programData.program;

    if (!program || !program.days || program.days.length === 0) {
      showNotification('No workout days found in this program', 'warning');
      return;
    }

    // Show day selection
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <h3>Select Workout Day</h3>
      <div class="exercise-list">
        ${program.days.map(day => `
          <div class="exercise-item" onclick="startWorkoutDay(${program.id}, ${day.id})">
            <strong>Day ${day.day_number}: ${day.name || 'Workout Day'}</strong>
            <div style="color: var(--gray); font-size: 14px;">${day.focus || 'Training'}</div>
            <div style="font-size: 12px; margin-top: 4px;">${(day.exercises && day.exercises.length) || 0} exercises</div>
          </div>
        `).join('')}
      </div>
    `;

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
    const fullWorkout = await api(`/workouts/${data.workout.id}`);
    
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

  // If there's an active workout, show the workout recording interface
  if (state.currentWorkout) {
    loadWorkoutInterface();
    return;
  }

  // Otherwise, show the program overview interface
  try {
    const programsData = await api('/programs');
    const activeProgram = programsData.programs.find(p => p.active);

    if (!activeProgram) {
      container.innerHTML = `
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
      `;
      return;
    }

    // Get full program details
    const programData = await api(`/programs/${activeProgram.id}`);
    const program = programData.program;

    // Initialize workout tab state
    if (!state.workoutTab) {
      state.workoutTab = { currentSubTab: 'overview', selectedDay: null };
    }

    // Render the workout tab with hero and sub-tabs
    renderWorkoutTab(program);

  } catch (error) {
    container.innerHTML = `<div class="card"><p>Error loading workout tab: ${error.message}</p></div>`;
  }
}

// Render workout tab with hero section and sub-tabs
function renderWorkoutTab(program) {
  const container = document.getElementById('workout');
  
  container.innerHTML = `
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
            <h1 style="font-size: 32px; font-weight: 700; margin: 0 0 12px 0; color: white;">${program.name}</h1>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <span style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px;">
                <i class="fas fa-calendar"></i> ${program.days?.length || 0} Days
              </span>
              <span style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px;">
                <i class="fas fa-target"></i> ${program.goal || 'Fitness'}
              </span>
              <span style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px;">
                <i class="fas fa-signal"></i> ${program.experience_level || 'Intermediate'}
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
        class="workout-subtab ${state.workoutTab.currentSubTab === 'overview' ? 'active' : ''}" 
        onclick="switchWorkoutSubTab('overview')"
        style="flex: 1; padding: 12px 20px; border: none; background: ${state.workoutTab.currentSubTab === 'overview' ? 'var(--primary)' : 'transparent'}; color: ${state.workoutTab.currentSubTab === 'overview' ? 'white' : 'var(--gray)'}; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
        <i class="fas fa-th-large"></i> Overview
      </button>
      <button 
        class="workout-subtab ${state.workoutTab.currentSubTab === 'details' ? 'active' : ''}" 
        onclick="switchWorkoutSubTab('details')"
        style="flex: 1; padding: 12px 20px; border: none; background: ${state.workoutTab.currentSubTab === 'details' ? 'var(--primary)' : 'transparent'}; color: ${state.workoutTab.currentSubTab === 'details' ? 'white' : 'var(--gray)'}; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
        <i class="fas fa-list"></i> Day Details
      </button>
    </div>

    <!-- Sub-tab Content -->
    <div id="workout-subtab-content"></div>
  `;

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
  
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
      <!-- Program Days List -->
      <div class="card">
        <h3><i class="fas fa-calendar-week"></i> Training Schedule</h3>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
          ${program.days && program.days.length > 0 ? program.days.map((day, idx) => {
            const dayOfWeek = daysOfWeek[(today + idx) % 7];
            return `
              <div class="workout-day-card" onclick="selectWorkoutDay(${idx})" style="background: ${state.workoutTab.selectedDay === idx ? 'var(--primary-light)' : 'var(--light)'}; border: 2px solid ${state.workoutTab.selectedDay === idx ? 'var(--primary)' : 'var(--border)'}; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; justify-content: between; align-items: center; gap: 16px;">
                  <div style="background: var(--primary); color: white; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; flex-shrink: 0;">
                    ${day.day_number || idx + 1}
                  </div>
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                      <div>
                        <strong style="font-size: 16px; display: block; margin-bottom: 4px;">${day.name || `Day ${day.day_number || idx + 1}`}</strong>
                        <div style="color: var(--gray); font-size: 13px;">
                          <i class="fas fa-calendar"></i> Suggested: ${dayOfWeek}
                        </div>
                      </div>
                    </div>
                    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px;">
                      <span style="font-size: 13px; color: var(--gray);">
                        <i class="fas fa-dumbbell"></i> ${(day.exercises && day.exercises.length) || 0} exercises
                      </span>
                      <span style="font-size: 13px; color: var(--gray);">
                        <i class="fas fa-clock"></i> ~${estimateDuration(day)} min
                      </span>
                      <span style="font-size: 13px; color: var(--gray);">
                        <i class="fas fa-history"></i> Last: ${getLastPerformed(day.id) || 'Never'}
                      </span>
                    </div>
                    ${day.focus ? `<div style="margin-top: 8px; font-size: 13px; color: var(--gray);"><i class="fas fa-bullseye"></i> ${day.focus}</div>` : ''}
                  </div>
                  <button class="btn btn-primary" onclick="event.stopPropagation(); startWorkoutFromDay(${program.id}, ${day.id})" style="flex-shrink: 0;">
                    <i class="fas fa-play"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('') : '<p>No workout days in this program.</p>'}
        </div>
      </div>

      <!-- Muscle Map & Info -->
      <div>
        <div class="card">
          <h3><i class="fas fa-user-alt"></i> Targeted Muscles</h3>
          <div id="muscle-map" style="margin-top: 16px;">
            ${renderMuscleMap(program, state.workoutTab.selectedDay)}
          </div>
        </div>
        
        <div class="card" style="margin-top: 16px;">
          <h3><i class="fas fa-info-circle"></i> Program Info</h3>
          <div style="margin-top: 12px; font-size: 14px; line-height: 1.6;">
            ${program.description || 'No description available.'}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render workout day details sub-tab
function renderWorkoutDayDetails(program) {
  const container = document.getElementById('workout-subtab-content');
  
  const selectedDayIndex = state.workoutTab.selectedDay !== null ? state.workoutTab.selectedDay : 0;
  const day = program.days && program.days[selectedDayIndex];

  if (!day) {
    container.innerHTML = `
      <div class="card">
        <p>No workout day selected. Please select a day from the Overview tab.</p>
        <button class="btn btn-primary" onclick="switchWorkoutSubTab('overview')">
          <i class="fas fa-arrow-left"></i> Back to Overview
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="margin: 0 0 8px 0;">Day ${day.day_number || selectedDayIndex + 1}: ${day.name || 'Workout'}</h2>
          <p style="color: var(--gray); margin: 0;">${day.focus || 'Training Session'}</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline" onclick="switchWorkoutSubTab('overview')">
            <i class="fas fa-arrow-left"></i> Overview
          </button>
          <button class="btn btn-primary" onclick="startWorkoutFromDay(${program.id}, ${day.id})">
            <i class="fas fa-play"></i> Start This Workout
          </button>
        </div>
      </div>

      <!-- Exercise List -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${day.exercises && day.exercises.length > 0 ? day.exercises.map((ex, idx) => `
          <div style="background: var(--light); border-radius: 12px; padding: 16px; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    ${idx + 1}
                  </div>
                  <strong style="font-size: 16px;">${ex.name}</strong>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-left: 44px;">
                  <span style="background: var(--secondary-light); color: var(--secondary); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-bullseye"></i> ${ex.muscle_group}
                  </span>
                  <span style="background: var(--primary-light); color: var(--primary); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-dumbbell"></i> ${ex.equipment}
                  </span>
                  ${ex.is_unilateral ? '<span style="background: var(--warning); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;"><i class="fas fa-balance-scale"></i> Unilateral</span>' : ''}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; color: var(--gray);">Suggested:</div>
                <div style="font-size: 18px; font-weight: 600; color: var(--primary);">
                  ${ex.target_sets || 3} × ${ex.target_reps || '8-12'}
                </div>
              </div>
            </div>
            ${ex.tips ? `
              <details style="margin-top: 12px; margin-left: 44px;">
                <summary style="cursor: pointer; color: var(--primary); font-weight: 600; user-select: none;">
                  <i class="fas fa-info-circle"></i> Exercise Tips
                </summary>
                <div style="margin-top: 8px; font-size: 14px; line-height: 1.6; color: var(--gray);">
                  ${ex.tips}
                </div>
              </details>
            ` : ''}
          </div>
        `).join('') : '<p>No exercises in this workout.</p>'}
      </div>
    </div>
  `;
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
  
  return `
    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 16px; padding: 20px;">
      <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px;">
        <i class="fas fa-crosshairs"></i> Targeted Muscles
      </h4>
      
      <!-- Professional SVG Muscle Map -->
      <div style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        ${muscleMapSVG}
      </div>
      
      <!-- Muscle Legend -->
      <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px;">
        ${muscleGroups.map(muscle => {
          const color = getMuscleColor(muscle);
          return `
            <div style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: white; border-radius: 20px; border: 2px solid ${color}; font-size: 12px; font-weight: 600;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color};"></div>
              <span style="color: ${color};">${muscle}</span>
            </div>
          `;
        }).join('')}
      </div>
      
      <!-- Exercise Count -->
      <div style="margin-top: 12px; text-align: center; font-size: 12px; color: var(--gray);">
        <i class="fas fa-dumbbell"></i> ${day.exercises.length} exercises targeting ${muscleGroups.length} muscle group${muscleGroups.length !== 1 ? 's' : ''}
      </div>
    </div>
  `;
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

// Generate professional SVG muscle map
function generateMuscleMapSVG(activeMuscles) {
  const isActive = (muscle) => activeMuscles.includes(muscle);
  const getOpacity = (muscle) => isActive(muscle) ? '1' : '0.15';
  const getColor = (muscle) => isActive(muscle) ? getMuscleColor(muscle) : '#cbd5e1';
  
  return `
    <svg viewBox="0 0 600 700" style="width: 100%; max-width: 400px; height: auto; margin: 0 auto; display: block;">
      <defs>
        <!-- Gradients for depth -->
        <linearGradient id="chestGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${getColor('Chest')};stop-opacity:${getOpacity('Chest')}" />
          <stop offset="100%" style="stop-color:${getColor('Chest')};stop-opacity:${parseFloat(getOpacity('Chest')) * 0.7}" />
        </linearGradient>
        <linearGradient id="absGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${getColor('Abs')};stop-opacity:${getOpacity('Abs')}" />
          <stop offset="100%" style="stop-color:${getColor('Abs')};stop-opacity:${parseFloat(getOpacity('Abs')) * 0.7}" />
        </linearGradient>
        <linearGradient id="quadsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${getColor('Quads')};stop-opacity:${getOpacity('Quads')}" />
          <stop offset="100%" style="stop-color:${getColor('Quads')};stop-opacity:${parseFloat(getOpacity('Quads')) * 0.7}" />
        </linearGradient>
        <radialGradient id="shoulderGrad" cx="50%" cy="50%">
          <stop offset="0%" style="stop-color:${getColor('Shoulders')};stop-opacity:${getOpacity('Shoulders')}" />
          <stop offset="100%" style="stop-color:${getColor('Shoulders')};stop-opacity:${parseFloat(getOpacity('Shoulders')) * 0.6}" />
        </radialGradient>
      </defs>
      
      <!-- Body Outline -->
      <ellipse cx="300" cy="100" rx="55" ry="65" fill="#f8f9fa" stroke="#cbd5e1" stroke-width="2"/>
      
      <!-- Shoulders (Front) -->
      <ellipse cx="230" cy="160" rx="45" ry="35" fill="url(#shoulderGrad)" stroke="${isActive('Shoulders') ? getColor('Shoulders') : '#cbd5e1'}" stroke-width="${isActive('Shoulders') ? '3' : '2'}" opacity="${getOpacity('Shoulders')}" class="muscle-part">
        ${isActive('Shoulders') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </ellipse>
      <ellipse cx="370" cy="160" rx="45" ry="35" fill="url(#shoulderGrad)" stroke="${isActive('Shoulders') ? getColor('Shoulders') : '#cbd5e1'}" stroke-width="${isActive('Shoulders') ? '3' : '2'}" opacity="${getOpacity('Shoulders')}" class="muscle-part">
        ${isActive('Shoulders') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </ellipse>
      
      <!-- Chest -->
      <path d="M 250 180 Q 270 160 300 165 Q 330 160 350 180 Q 340 230 300 240 Q 260 230 250 180" 
            fill="url(#chestGrad)" 
            stroke="${isActive('Chest') ? getColor('Chest') : '#cbd5e1'}" 
            stroke-width="${isActive('Chest') ? '3' : '2'}" 
            opacity="${getOpacity('Chest')}" 
            class="muscle-part">
        ${isActive('Chest') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </path>
      
      <!-- Biceps (Front) -->
      <ellipse cx="205" cy="250" rx="22" ry="50" fill="${getColor('Biceps')}" stroke="${isActive('Biceps') ? getColor('Biceps') : '#cbd5e1'}" stroke-width="${isActive('Biceps') ? '3' : '2'}" opacity="${getOpacity('Biceps')}" class="muscle-part">
        ${isActive('Biceps') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </ellipse>
      <ellipse cx="395" cy="250" rx="22" ry="50" fill="${getColor('Biceps')}" stroke="${isActive('Biceps') ? getColor('Biceps') : '#cbd5e1'}" stroke-width="${isActive('Biceps') ? '3' : '2'}" opacity="${getOpacity('Biceps')}" class="muscle-part">
        ${isActive('Biceps') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </ellipse>
      
      <!-- Abs/Core -->
      <rect x="270" y="245" width="60" height="35" rx="8" fill="url(#absGrad)" stroke="${isActive('Abs') || isActive('Core') ? getColor('Abs') : '#cbd5e1'}" stroke-width="${isActive('Abs') || isActive('Core') ? '3' : '2'}" opacity="${Math.max(parseFloat(getOpacity('Abs')), parseFloat(getOpacity('Core')))}" class="muscle-part">
        ${isActive('Abs') || isActive('Core') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </rect>
      <rect x="275" y="285" width="50" height="30" rx="6" fill="url(#absGrad)" stroke="${isActive('Abs') || isActive('Core') ? getColor('Abs') : '#cbd5e1'}" stroke-width="${isActive('Abs') || isActive('Core') ? '3' : '2'}" opacity="${Math.max(parseFloat(getOpacity('Abs')), parseFloat(getOpacity('Core')))}" class="muscle-part">
        ${isActive('Abs') || isActive('Core') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </rect>
      <rect x="280" y="320" width="40" height="25" rx="5" fill="url(#absGrad)" stroke="${isActive('Abs') || isActive('Core') ? getColor('Abs') : '#cbd5e1'}" stroke-width="${isActive('Abs') || isActive('Core') ? '3' : '2'}" opacity="${Math.max(parseFloat(getOpacity('Abs')), parseFloat(getOpacity('Core')))}" class="muscle-part">
        ${isActive('Abs') || isActive('Core') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </rect>
      
      <!-- Forearms -->
      <rect x="195" y="305" width="18" height="65" rx="9" fill="${getColor('Forearms')}" stroke="${isActive('Forearms') ? getColor('Forearms') : '#cbd5e1'}" stroke-width="${isActive('Forearms') ? '3' : '2'}" opacity="${getOpacity('Forearms')}" class="muscle-part"/>
      <rect x="387" y="305" width="18" height="65" rx="9" fill="${getColor('Forearms')}" stroke="${isActive('Forearms') ? getColor('Forearms') : '#cbd5e1'}" stroke-width="${isActive('Forearms') ? '3' : '2'}" opacity="${getOpacity('Forearms')}" class="muscle-part"/>
      
      <!-- Quads -->
      <ellipse cx="265" cy="450" rx="32" ry="95" fill="url(#quadsGrad)" stroke="${isActive('Quads') || isActive('Legs') ? getColor('Quads') : '#cbd5e1'}" stroke-width="${isActive('Quads') || isActive('Legs') ? '3' : '2'}" opacity="${Math.max(parseFloat(getOpacity('Quads')), parseFloat(getOpacity('Legs')))}" class="muscle-part">
        ${isActive('Quads') || isActive('Legs') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </ellipse>
      <ellipse cx="335" cy="450" rx="32" ry="95" fill="url(#quadsGrad)" stroke="${isActive('Quads') || isActive('Legs') ? getColor('Quads') : '#cbd5e1'}" stroke-width="${isActive('Quads') || isActive('Legs') ? '3' : '2'}" opacity="${Math.max(parseFloat(getOpacity('Quads')), parseFloat(getOpacity('Legs')))}" class="muscle-part">
        ${isActive('Quads') || isActive('Legs') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </ellipse>
      
      <!-- Calves -->
      <ellipse cx="265" cy="600" rx="24" ry="55" fill="${getColor('Calves')}" stroke="${isActive('Calves') || isActive('Legs') ? getColor('Calves') : '#cbd5e1'}" stroke-width="${isActive('Calves') || isActive('Legs') ? '3' : '2'}" opacity="${Math.max(parseFloat(getOpacity('Calves')), parseFloat(getOpacity('Legs')))}" class="muscle-part">
        ${isActive('Calves') || isActive('Legs') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </ellipse>
      <ellipse cx="335" cy="600" rx="24" ry="55" fill="${getColor('Calves')}" stroke="${isActive('Calves') || isActive('Legs') ? getColor('Calves') : '#cbd5e1'}" stroke-width="${isActive('Calves') || isActive('Legs') ? '3' : '2'}" opacity="${Math.max(parseFloat(getOpacity('Calves')), parseFloat(getOpacity('Legs')))}" class="muscle-part">
        ${isActive('Calves') || isActive('Legs') ? '<animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>' : ''}
      </ellipse>
      
      <!-- Back View Indicator -->
      ${(isActive('Back') || isActive('Traps') || isActive('Lats') || isActive('Hamstrings') || isActive('Glutes')) ? `
        <g opacity="0.9">
          <rect x="20" y="150" width="150" height="400" rx="20" fill="white" stroke="#e5e7eb" stroke-width="2"/>
          <text x="95" y="175" text-anchor="middle" font-size="12" font-weight="600" fill="#6b7280">BACK VIEW</text>
          
          <!-- Back/Lats -->
          ${isActive('Back') || isActive('Lats') ? `
            <path d="M 60 200 Q 50 250 60 320 L 95 310 L 95 210 Z" fill="${getColor('Back')}" stroke="${getColor('Back')}" stroke-width="2" opacity="0.9">
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M 130 200 Q 140 250 130 320 L 95 310 L 95 210 Z" fill="${getColor('Back')}" stroke="${getColor('Back')}" stroke-width="2" opacity="0.9">
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
            </path>
          ` : ''}
          
          <!-- Traps -->
          ${isActive('Traps') ? `
            <path d="M 75 195 Q 95 185 115 195 L 105 215 L 85 215 Z" fill="${getColor('Traps')}" stroke="${getColor('Traps')}" stroke-width="2" opacity="0.9">
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
            </path>
          ` : ''}
          
          <!-- Glutes -->
          ${isActive('Glutes') || isActive('Legs') ? `
            <ellipse cx="75" cy="360" rx="22" ry="35" fill="${getColor('Glutes')}" stroke="${getColor('Glutes')}" stroke-width="2" opacity="0.9">
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="115" cy="360" rx="22" ry="35" fill="${getColor('Glutes')}" stroke="${getColor('Glutes')}" stroke-width="2" opacity="0.9">
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
            </ellipse>
          ` : ''}
          
          <!-- Hamstrings -->
          ${isActive('Hamstrings') || isActive('Legs') ? `
            <ellipse cx="75" cy="450" rx="20" ry="60" fill="${getColor('Hamstrings')}" stroke="${getColor('Hamstrings')}" stroke-width="2" opacity="0.9">
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="115" cy="450" rx="20" ry="60" fill="${getColor('Hamstrings')}" stroke="${getColor('Hamstrings')}" stroke-width="2" opacity="0.9">
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
            </ellipse>
          ` : ''}
        </g>
      ` : ''}
      
      <!-- Labels for Active Muscles -->
      ${activeMuscles.slice(0, 3).map((muscle, idx) => `
        <text x="300" y="${30 + idx * 20}" text-anchor="middle" font-size="12" font-weight="600" fill="${getMuscleColor(muscle)}">
          ${muscle.toUpperCase()}
        </text>
      `).join('')}
    </svg>
  `;
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
      api(`/programs/${activeProgram.id}`).then(programData => {
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
      api(`/programs/${activeProgram.id}`).then(programData => {
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
    const data = await api(`/workouts/${state.currentWorkout.id}`);
    const workout = data.workout;

    // Start workout timer if not already started
    if (!state.workoutTimer) {
      startWorkoutTimer();
    }

    const totalSets = workout.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const totalVolume = workout.exercises.reduce((sum, ex) => {
      return sum + (ex.sets || []).reduce((exSum, set) => exSum + (set.weight_kg * set.reps), 0);
    }, 0);

    container.innerHTML = `
      <!-- Header Card -->
      <div class="card" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; border: none;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <h2 style="color: white; margin-bottom: 8px;"><i class="fas fa-dumbbell"></i> ${workout.day_name || 'Workout Session'}</h2>
            <div style="font-size: 14px; opacity: 0.9;">${workout.day_focus || 'Strength Training'}</div>
          </div>
          <div style="text-align: right;">
            <div id="workoutTimer" style="font-size: 32px; font-weight: bold; font-family: 'Courier New', monospace;">00:00:00</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Duration</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2);">
          <div>
            <div style="font-size: 12px; opacity: 0.8;">Exercises</div>
            <div style="font-size: 24px; font-weight: bold;">${workout.exercises.length}</div>
          </div>
          <div>
            <div style="font-size: 12px; opacity: 0.8;">Sets Completed</div>
            <div style="font-size: 24px; font-weight: bold;">${totalSets}</div>
          </div>
          <div>
            <div style="font-size: 12px; opacity: 0.8;">Volume (kg)</div>
            <div style="font-size: 24px; font-weight: bold;">${Math.round(totalVolume)}</div>
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
          ${workout.exercises.map((ex, idx) => renderExerciseEnhanced(ex, idx)).join('')}
        </div>
      </div>

      <!-- Workout Notes -->
      <div class="card">
        <h3><i class="fas fa-sticky-note"></i> Session Notes</h3>
        <div style="background: var(--light); border-radius: 12px; padding: 16px; margin-top: 12px;">
          <textarea id="workoutNotes" 
            placeholder="How did this workout feel? Any modifications made? Energy levels? Notes for next time..." 
            style="width: 100%; min-height: 120px; border: 2px solid var(--border); border-radius: 8px; padding: 12px; font-size: 14px; resize: vertical; font-family: inherit;">${workout.notes || ''}</textarea>
          <button class="btn btn-primary" onclick="saveWorkoutNotes()" style="margin-top: 12px; width: 100%;">
            <i class="fas fa-save"></i> Save Notes
          </button>
        </div>
      </div>
    `;

    updateWorkoutTimerDisplay();
  } catch (error) {
    container.innerHTML = `<div class="card"><p>Error loading workout: ${error.message}</p></div>`;
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
  
  return `
    <div style="background: var(--white); border: 2px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);" id="exercise-${exercise.id}">
      <!-- Exercise Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">
              ${index + 1}
            </div>
            <h4 style="margin: 0; font-size: 18px; font-weight: 600;">${exercise.name}</h4>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <span style="background: var(--secondary-light); color: var(--secondary); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              <i class="fas fa-bullseye"></i> ${exercise.muscle_group}
            </span>
            <span style="background: var(--primary-light); color: var(--primary); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              <i class="fas fa-dumbbell"></i> ${exercise.equipment}
            </span>
            ${exercise.is_unilateral ? '<span style="background: var(--warning); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;"><i class="fas fa-balance-scale"></i> Unilateral</span>' : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${completedSets}/${targetSets}</div>
          <div style="font-size: 11px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px;">Sets</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div style="background: var(--light); height: 8px; border-radius: 4px; margin-bottom: 16px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%); height: 100%; width: ${setsProgress}%; transition: width 0.3s;"></div>
      </div>

      <!-- Exercise Tips (Comprehensive) -->
      ${exercise.tips ? `
      <details style="margin-bottom: 16px; background: var(--light); border-radius: 12px; padding: 12px;">
        <summary style="cursor: pointer; font-weight: 600; color: var(--primary); user-select: none;">
          <i class="fas fa-lightbulb"></i> Form & Technique Guide
        </summary>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
          <div style="font-size: 14px; line-height: 1.6; color: var(--dark); white-space: pre-wrap;">${exercise.tips}</div>
          ${exercise.target_reps ? `
          <div style="margin-top: 12px; padding: 12px; background: var(--white); border-radius: 8px; border-left: 4px solid var(--primary);">
            <strong style="color: var(--primary);"><i class="fas fa-chart-line"></i> AI Recommendation:</strong><br>
            <span style="font-size: 14px;">${targetSets} sets × ${exercise.target_reps} reps @ ${exercise.target_rpe ? `RPE ${exercise.target_rpe}` : 'moderate intensity'}</span>
          </div>
          ` : ''}
        </div>
      </details>
      ` : ''}

      <!-- Completed Sets -->
      ${(exercise.sets && exercise.sets.length > 0) ? `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: var(--gray); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          <i class="fas fa-check-circle"></i> Completed Sets
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
          ${exercise.sets.map((set, setIdx) => `
            <div style="background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); color: white; padding: 12px; border-radius: 10px; position: relative;">
              <button onclick="deleteSet(${exercise.id}, ${set.id})" 
                style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;"
                title="Delete set">
                <i class="fas fa-times"></i>
              </button>
              <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">Set ${set.set_number}</div>
              <div style="font-size: 18px; font-weight: bold;">${formatWeight(set.weight_kg, system)} × ${set.reps}</div>
              <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">1RM: ${formatWeight(set.one_rep_max_kg, system)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Add Set Form -->
      <div style="background: var(--light); border-radius: 12px; padding: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: var(--gray); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          <i class="fas fa-plus-circle"></i> Record Next Set
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 8px; align-items: end;">
          <div>
            <label style="font-size: 12px; color: var(--gray); display: block; margin-bottom: 4px; font-weight: 600;">Weight (${weightUnit})</label>
            <input type="number" id="weight-${exercise.id}" value="${defaultWeight}" placeholder="0" step="${weightStep}" 
                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 16px; font-weight: 600;">
          </div>
          <div>
            <label style="font-size: 12px; color: var(--gray); display: block; margin-bottom: 4px; font-weight: 600;">Reps</label>
            <input type="number" id="reps-${exercise.id}" value="${defaultReps}" placeholder="0" min="1"
                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 16px; font-weight: 600;">
          </div>
          <button class="btn btn-primary" onclick="recordSet(${exercise.id})" style="padding: 12px 24px; font-size: 16px;">
            <i class="fas fa-check"></i> Add
          </button>
          <button class="btn btn-outline" onclick="showExerciseNotes(${exercise.id})" style="padding: 12px 16px;">
            <i class="fas fa-sticky-note"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Render exercise (legacy - keep for compatibility)
function renderExercise(exercise, index) {
  return renderExerciseEnhanced(exercise, index);
}

// Record set
async function recordSet(exerciseId) {
  let weight = parseFloat(document.getElementById(`weight-${exerciseId}`).value);
  const reps = parseInt(document.getElementById(`reps-${exerciseId}`).value);

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
    await api(`/workouts/${state.currentWorkout.id}/exercises/${exerciseId}/sets`, {
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
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
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
    const result = await api(`/workouts/${state.currentWorkout.id}/complete`, { method: 'POST' });
    
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
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px;">
      <div style="font-size: 48px;">${achievement.icon}</div>
      <div>
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 4px;">Achievement Unlocked!</div>
        <div style="font-size: 16px; color: var(--dark); margin-bottom: 4px;">${achievement.name}</div>
        <div style="font-size: 13px; color: var(--gray);">${achievement.description}</div>
      </div>
    </div>
  `;
  
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

    container.innerHTML = `
      <div class="card">
        <h2><i class="fas fa-chart-line"></i> 90-Day Progress</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Workouts</div>
            <div class="stat-value">${progress.overview.total_workouts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Volume</div>
            <div class="stat-value">${formatWeight(progress.overview.total_volume_kg)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Time</div>
            <div class="stat-value">${formatDuration(progress.overview.total_time_seconds)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Workout</div>
            <div class="stat-value">${formatDuration(progress.overview.average_workout_time)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2><i class="fas fa-weight"></i> Volume by Muscle Group (90 days)</h2>
        ${volumeData.volume_by_muscle.length > 0 ? `
          <div style="display: grid; gap: 8px;">
            ${volumeData.volume_by_muscle.map(m => `
              <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--light); border-radius: 6px;">
                <strong>${m.muscle_group}</strong>
                <span>${formatWeight(m.volume)}</span>
              </div>
            `).join('')}
          </div>
        ` : '<p>No volume data yet.</p>'}
      </div>

      <div class="card">
        <h2><i class="fas fa-body"></i> Body Map (Last 7 Days)</h2>
        ${bodyMap.body_map.length > 0 ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">
            ${bodyMap.body_map.map(m => `
              <div style="padding: 16px; background: linear-gradient(135deg, rgba(79, 70, 229, ${m.intensity/100}) 0%, rgba(118, 75, 162, ${m.intensity/100}) 100%); 
                          border-radius: 8px; color: white; text-align: center;">
                <div style="font-weight: bold;">${m.muscle_group}</div>
                <div style="font-size: 12px; margin-top: 4px;">${m.set_count} sets</div>
                <div style="font-size: 12px;">${formatWeight(m.volume)}</div>
              </div>
            `).join('')}
          </div>
        ` : '<p>No workout data in the last 7 days.</p>'}
      </div>

      <div class="card">
        <h2><i class="fas fa-trophy"></i> Top Exercises</h2>
        ${progress.top_exercises.length > 0 ? `
          <div class="exercise-list">
            ${progress.top_exercises.map((ex, idx) => `
              <div class="exercise-item">
                <div style="display: flex; justify-content: space-between;">
                  <div>
                    <strong>${idx + 1}. ${ex.name}</strong>
                    <div style="font-size: 12px; color: var(--gray);">${ex.muscle_group}</div>
                  </div>
                  <div style="text-align: right;">
                    <div>${formatWeight(ex.volume)} total</div>
                    <div style="font-size: 12px; color: var(--gray);">${ex.workout_count} workouts</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p>No exercise data yet.</p>'}
      </div>
    `;

    // Load and display workout history
    await loadWorkoutHistory(container);

  } catch (error) {
    container.innerHTML = `<div class="card"><p>Error loading analytics: ${error.message}</p></div>`;
  }
}

// Load workout history for analytics
async function loadWorkoutHistory(container) {
  try {
    const workoutsData = await api('/workouts?limit=20');
    
    const historyHTML = `
      <div class="card">
        <h2><i class="fas fa-history"></i> Workout History</h2>
        ${workoutsData.workouts.length > 0 ? `
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
                ${workoutsData.workouts.map(w => `
                  <tr>
                    <td>${new Date(w.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td><strong>${w.day_name || 'Custom Workout'}</strong></td>
                    <td>${formatDuration(w.total_duration_seconds)}</td>
                    <td>${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}</td>
                    <td>${w.total_sets || 0}</td>
                    <td>
                      ${w.completed 
                        ? '<span style="background: var(--secondary-light); color: var(--secondary); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ Complete</span>' 
                        : '<span style="background: var(--warning); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">In Progress</span>'}
                    </td>
                    <td>
                      <button class="btn btn-outline" onclick="viewWorkout(${w.id})" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="btn btn-danger" onclick="deleteAnalyticsWorkout(${w.id})" style="padding: 6px 12px; font-size: 12px;">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p>No workout history yet.</p>'}
      </div>
    `;
    
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
    
    container.innerHTML = `
      <div class="card">
        <h2><i class="fas fa-trophy"></i> Achievements & Challenges</h2>
        
        <!-- Stats Overview -->
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 30px;">
          <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <div class="stat-icon" style="font-size: 32px;">🔥</div>
            <div class="stat-value" style="font-size: 36px;">${currentWeeks}</div>
            <div class="stat-label">Week Streak</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Best: ${longestWeeks} weeks</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
            <div class="stat-icon" style="font-size: 32px;">💪</div>
            <div class="stat-value" style="font-size: 36px;">${stats.totalWorkouts}</div>
            <div class="stat-label">Total Workouts</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
            <div class="stat-icon" style="font-size: 32px;">📈</div>
            <div class="stat-value" style="font-size: 36px;">${stats.totalPRs}</div>
            <div class="stat-label">Personal Records</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white;">
            <div class="stat-icon" style="font-size: 32px;">🏆</div>
            <div class="stat-value" style="font-size: 36px;">${earned.length}</div>
            <div class="stat-label">Achievements Earned</div>
          </div>
        </div>
        
        <!-- Recent Personal Records -->
        ${prs.length > 0 ? `
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
                ${prs.map(pr => {
                  const improvement = pr.previous_value ? 
                    `+${((pr.record_value - pr.previous_value) / pr.previous_value * 100).toFixed(1)}%` : 
                    'First PR!';
                  const improvementColor = pr.previous_value ? '#4CAF50' : '#2196F3';
                  return `
                    <tr>
                      <td><strong>${pr.exercise_name}</strong></td>
                      <td><span class="badge">${pr.record_type.toUpperCase()}</span></td>
                      <td><strong style="color: var(--secondary);">${pr.record_value.toFixed(1)} kg</strong></td>
                      <td>${pr.previous_value ? pr.previous_value.toFixed(1) + ' kg' : '-'}</td>
                      <td><span style="color: ${improvementColor}; font-weight: bold;">${improvement}</span></td>
                      <td>${new Date(pr.achieved_at).toLocaleDateString()}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : '<p style="margin: 20px 0;">No personal records yet. Keep pushing!</p>'}
        
        <!-- Earned Achievements -->
        <div style="margin-bottom: 30px;">
          <h3><i class="fas fa-award"></i> Earned Achievements</h3>
          ${Object.keys(achievementsByCategory).length > 0 ? Object.entries(achievementsByCategory).map(([category, achievements]) => `
            <div style="margin-bottom: 24px;">
              <h4 style="text-transform: capitalize; color: var(--primary); margin-bottom: 12px;">
                ${category === 'consistency' ? '🔥' : category === 'strength' ? '💪' : category === 'volume' ? '📊' : '⭐'} 
                ${category}
              </h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
                ${achievements.map(ach => {
                  const tierColors = {
                    bronze: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)',
                    silver: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
                    gold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    platinum: 'linear-gradient(135deg, #E5E4E2 0%, #71797E 100%)'
                  };
                  return `
                    <div style="background: ${tierColors[ach.tier]}; padding: 16px; border-radius: 12px; color: white;">
                      <div style="font-size: 48px; margin-bottom: 8px;">${ach.icon}</div>
                      <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${ach.name}</div>
                      <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">${ach.description}</div>
                      <div style="font-size: 12px; opacity: 0.8;">
                        <i class="fas fa-calendar"></i> ${new Date(ach.earned_at).toLocaleDateString()}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('') : '<p>No achievements earned yet. Complete workouts to unlock achievements!</p>'}
        </div>
        
        ${streak.current_streak > 0 ? `
        <!-- Streak Calendar -->
        <div>
          <h3><i class="fas fa-fire"></i> Workout Streak</h3>
          <div style="background: var(--light); padding: 20px; border-radius: 12px; border-left: 4px solid var(--secondary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <div style="font-size: 14px; color: var(--gray);">Current Streak</div>
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${currentWeeks} ${currentWeeks === 1 ? 'Week' : 'Weeks'}</div>
              </div>
              <div>
                <div style="font-size: 14px; color: var(--gray);">Longest Streak</div>
                <div style="font-size: 32px; font-weight: bold; color: var(--secondary);">${longestWeeks} ${longestWeeks === 1 ? 'Week' : 'Weeks'}</div>
              </div>
              <div>
                <div style="font-size: 14px; color: var(--gray);">Since</div>
                <div style="font-size: 16px; font-weight: bold;">${new Date(streak.streak_start_date).toLocaleDateString()}</div>
              </div>
            </div>
            ${streak.last_workout_date ? `
              <div style="font-size: 14px; color: var(--gray);">
                Last workout: ${new Date(streak.last_workout_date).toLocaleDateString()}
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="card"><p>Error loading achievements: ${error.message}</p></div>`;
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

    container.innerHTML = `
      <div class="card">
        <h2><i class="fas fa-apple-alt"></i> Today's Nutrition</h2>
        <div class="stats-grid">
          <div class="stat-card" style="background: var(--secondary);">
            <div class="stat-label">Protein</div>
            <div class="stat-value">${Math.round(daily.protein_grams)}g</div>
            <div class="stat-label">Goal: ${Math.round(daily.protein_goal)}g (${Math.round(daily.protein_percentage)}%)</div>
          </div>
          <div class="stat-card" style="background: var(--primary);">
            <div class="stat-label">Water</div>
            <div class="stat-value">${Math.round(daily.water_ml)}ml</div>
            <div class="stat-label">Goal: ${Math.round(daily.water_goal)}ml (${Math.round(daily.water_percentage)}%)</div>
          </div>
          <div class="stat-card" style="background: #8b5cf6;">
            <div class="stat-label">Creatine</div>
            <div class="stat-value">${Math.round(daily.creatine_grams)}g</div>
            <div class="stat-label">Goal: ${Math.round(daily.creatine_goal)}g (${Math.round(daily.creatine_percentage)}%)</div>
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

      <!-- Nutrition Analytics & Trends -->
      <div class="card">
        <h2><i class="fas fa-chart-line"></i> Nutrition Analytics (30 Days)</h2>
        
        <!-- Streak Cards -->
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 24px;">
          <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <div class="stat-icon" style="font-size: 24px;">🔥</div>
            <div class="stat-value" style="font-size: 28px;">${streaks.streaks.all.current}</div>
            <div class="stat-label">Current Streak</div>
            <div style="font-size: 12px; opacity: 0.9;">Best: ${streaks.streaks.all.longest} days</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
            <div class="stat-icon" style="font-size: 24px;">🥩</div>
            <div class="stat-value" style="font-size: 28px;">${streaks.streaks.protein.current}</div>
            <div class="stat-label">Protein Streak</div>
            <div style="font-size: 12px; opacity: 0.9;">Best: ${streaks.streaks.protein.longest} days</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
            <div class="stat-icon" style="font-size: 24px;">💧</div>
            <div class="stat-value" style="font-size: 28px;">${streaks.streaks.water.current}</div>
            <div class="stat-label">Water Streak</div>
            <div style="font-size: 12px; opacity: 0.9;">Best: ${streaks.streaks.water.longest} days</div>
          </div>
          
          <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white;">
            <div class="stat-icon" style="font-size: 24px;">⚡</div>
            <div class="stat-value" style="font-size: 28px;">${streaks.streaks.creatine.current}</div>
            <div class="stat-label">Creatine Streak</div>
            <div style="font-size: 12px; opacity: 0.9;">Best: ${streaks.streaks.creatine.longest} days</div>
          </div>
        </div>

        <!-- Summary Stats -->
        <div style="background: var(--light); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
          <h3 style="margin-bottom: 16px;"><i class="fas fa-chart-bar"></i> 30-Day Summary</h3>
          <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Days Logged</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${summary.total_days_logged}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Avg Protein</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--secondary);">${summary.avg_protein_daily}g</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Avg Water</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${summary.avg_water_daily}ml</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Avg Creatine</div>
              <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${summary.avg_creatine_daily}g</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">Adherence Rate</div>
              <div style="font-size: 24px; font-weight: bold; color: ${summary.adherence_rate >= 80 ? '#4CAF50' : summary.adherence_rate >= 60 ? '#FFA500' : '#f44336'};">${summary.adherence_rate}%</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray); margin-bottom: 4px;">All Goals Hit</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--success);">${summary.all_goals_days} days</div>
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
        ${weekly_trends.length > 0 ? `
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
                ${weekly_trends.map(week => `
                  <tr data-week-start="${week.week_start}" data-protein="${Math.round(week.avg_protein)}" data-water="${Math.round(week.avg_water)}" data-creatine="${week.avg_creatine.toFixed(1)}" data-logged="${week.days_logged}" data-goals="${week.days_hit_goals}">
                    <td><small>${new Date(week.week_start).toLocaleDateString()} - ${new Date(week.week_end).toLocaleDateString()}</small></td>
                    <td><strong>${Math.round(week.avg_protein)}g</strong></td>
                    <td><strong>${Math.round(week.avg_water)}ml</strong></td>
                    <td><strong>${week.avg_creatine.toFixed(1)}g</strong></td>
                    <td>${week.days_logged}</td>
                    <td><span style="color: ${week.days_hit_goals >= 5 ? 'var(--success)' : 'var(--warning)'};">${week.days_hit_goals} days</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}
        
        <!-- Daily History with Edit -->
        ${daily_data.length > 0 ? `
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
                ${daily_data.slice().reverse().map(day => `
                  <tr>
                    <td><strong>${new Date(day.date).toLocaleDateString()}</strong></td>
                    <td>${day.protein}g ${day.hit_protein ? '✅' : '❌'}</td>
                    <td>${day.water}ml ${day.hit_water ? '✅' : '❌'}</td>
                    <td>${day.creatine}g ${day.hit_creatine ? '✅' : '❌'}</td>
                    <td>${day.hit_all ? '<span style="color: var(--success);">All Hit ✅</span>' : '<span style="color: var(--warning);">Incomplete</span>'}</td>
                    <td>
                      <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="editNutritionLog('${day.date}', ${day.protein}, ${day.water}, ${day.creatine})">
                        <i class="fas fa-edit"></i> Edit
                      </button>
                      <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; color: var(--danger);" onclick="deleteNutritionLog('${day.date}')">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Daily Trend Chart (last 14 days) -->
        ${daily_data.length > 0 ? `
        <div>
          <h3><i class="fas fa-chart-area"></i> Recent Trends (Last 14 Days)</h3>
          <div style="background: var(--light); padding: 16px; border-radius: 12px; overflow-x: auto;">
            <div style="display: flex; gap: 12px; min-width: 800px;">
              ${daily_data.slice(-14).map(day => `
                <div style="flex: 1; text-align: center;">
                  <div style="font-size: 11px; color: var(--gray); margin-bottom: 8px;">
                    ${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  
                  <!-- Protein Bar -->
                  <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
                    <div style="width: 24px; height: ${Math.min((day.protein / day.protein_goal) * 100, 100)}px; background: ${day.hit_protein ? 'var(--secondary)' : '#ccc'}; border-radius: 4px 4px 0 0;"></div>
                    <div style="font-size: 10px; margin-top: 4px;">💪</div>
                  </div>
                  
                  <!-- Water Bar -->
                  <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
                    <div style="width: 24px; height: ${Math.min((day.water / day.water_goal) * 100, 100)}px; background: ${day.hit_water ? 'var(--primary)' : '#ccc'}; border-radius: 4px 4px 0 0;"></div>
                    <div style="font-size: 10px; margin-top: 4px;">💧</div>
                  </div>
                  
                  <!-- Creatine Bar -->
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="width: 24px; height: ${Math.min((day.creatine / day.creatine_goal) * 100, 100)}px; background: ${day.hit_creatine ? '#8b5cf6' : '#ccc'}; border-radius: 4px 4px 0 0;"></div>
                    <div style="font-size: 10px; margin-top: 4px;">⚡</div>
                  </div>
                  
                  ${day.hit_all ? '<div style="font-size: 16px; margin-top: 8px;">✅</div>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        ` : '<p>No data yet. Start logging your nutrition to see trends!</p>'}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="card"><p>Error loading nutrition: ${error.message}</p></div>`;
  }
}

async function logProtein(amount) {
  const grams = amount || parseFloat(document.getElementById('proteinInput').value);
  
  if (!grams) {
    showNotification('Please enter protein amount', 'warning');
    return;
  }

  try {
    await api('/nutrition/protein', {
      method: 'POST',
      body: JSON.stringify({ grams })
    });

    showNotification('Protein logged!', 'success');
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
    await api('/nutrition/water', {
      method: 'POST',
      body: JSON.stringify({ ml })
    });

    showNotification('Water logged!', 'success');
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
    await api('/nutrition/creatine', {
      method: 'POST',
      body: JSON.stringify({ grams })
    });

    showNotification('Creatine logged!', 'success');
    loadNutrition();
  } catch (error) {
    showNotification('Error logging creatine: ' + error.message, 'error');
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
  
  modalBody.innerHTML = `
    <div class="form-group">
      <label>Name:</label>
      <input type="text" id="profileName" value="${state.user.name || ''}" class="form-control">
    </div>

    <div class="form-group">
      <label>Age:</label>
      <input type="number" id="profileAge" value="${state.user.age || ''}" class="form-control">
    </div>

    <div class="form-group">
      <label>Gender:</label>
      <select id="profileGender" class="form-control">
        <option value="not_specified" ${!state.user.gender || state.user.gender === 'not_specified' ? 'selected' : ''}>Prefer not to say</option>
        <option value="male" ${state.user.gender === 'male' ? 'selected' : ''}>Male</option>
        <option value="female" ${state.user.gender === 'female' ? 'selected' : ''}>Female</option>
      </select>
      <small style="color: var(--gray); font-size: 12px; display: block; margin-top: 4px;">
        <i class="fas fa-info-circle"></i> Used by AI to personalize program recommendations
      </small>
    </div>

    <div class="form-group">
      <label>Measurement System:</label>
      <select id="profileSystem" class="form-control" onchange="toggleMeasurementInputs()">
        <option value="metric" ${!isImperial ? 'selected' : ''}>Metric (kg, cm)</option>
        <option value="imperial" ${isImperial ? 'selected' : ''}>Imperial (lbs, feet/inches)</option>
      </select>
    </div>

    <div id="metricInputs" style="display: ${isImperial ? 'none' : 'block'}">
      <div class="form-group">
        <label>Height (cm):</label>
        <input type="number" id="profileHeightCm" value="${heightValue}" class="form-control" step="0.1">
      </div>
      <div class="form-group">
        <label>Weight (kg):</label>
        <input type="number" id="profileWeightKg" value="${state.user.weight_kg || ''}" class="form-control" step="0.1">
      </div>
    </div>

    <div id="imperialInputs" style="display: ${isImperial ? 'block' : 'none'}">
      <div class="form-group">
        <label>Height:</label>
        <div style="display: flex; gap: 10px;">
          <input type="number" id="profileHeightFeet" value="${heightFeet}" placeholder="Feet" class="form-control" style="flex: 1;">
          <input type="number" id="profileHeightInches" value="${heightInches}" placeholder="Inches" class="form-control" style="flex: 1;">
        </div>
      </div>
      <div class="form-group">
        <label>Weight (lbs):</label>
        <input type="number" id="profileWeightLbs" value="${weightValue}" class="form-control" step="0.1">
      </div>
    </div>

    <button class="btn btn-primary" onclick="saveProfile()">
      <i class="fas fa-save"></i> Save Profile
    </button>
  `;

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
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
    await api(`/workouts/${state.currentWorkout.id}`, {
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
  modalBody.innerHTML = `
    <div class="form-group">
      <label>Exercise Notes:</label>
      <textarea id="exerciseNotes" class="form-control" rows="4" placeholder="Add notes about this exercise..."></textarea>
    </div>

    <button class="btn btn-primary" onclick="saveExerciseNotes(${exerciseId})">
      <i class="fas fa-save"></i> Save Notes
    </button>
  `;

  document.getElementById('modalTitle').textContent = 'Exercise Notes';
  openModal();
}

async function saveExerciseNotes(exerciseId) {
  const notes = document.getElementById('exerciseNotes').value;
  
  try {
    await api(`/workouts/${state.currentWorkout.id}/exercises/${exerciseId}/notes`, {
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
  window.location.href = `/api/nutrition/export/csv?type=${type}&days=${days}`;
}

// Export nutrition report
function exportNutritionReport(days) {
  window.location.href = `/api/nutrition/export/report?days=${days}`;
}

// Edit nutrition log
function editNutritionLog(date, protein, water, creatine) {
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div style="display: grid; gap: 16px;">
      <div class="form-group">
        <label>Date:</label>
        <input type="date" id="editNutritionDate" value="${date}" readonly class="form-control" style="background: var(--light);">
      </div>
      
      <div class="form-group">
        <label>Protein (grams):</label>
        <input type="number" id="editNutritionProtein" value="${protein}" class="form-control" step="1" min="0">
      </div>
      
      <div class="form-group">
        <label>Water (ml):</label>
        <input type="number" id="editNutritionWater" value="${water}" class="form-control" step="100" min="0">
      </div>
      
      <div class="form-group">
        <label>Creatine (grams):</label>
        <input type="number" id="editNutritionCreatine" value="${creatine}" class="form-control" step="0.5" min="0">
      </div>
      
      <button class="btn btn-primary" onclick="saveNutritionEdit()">
        <i class="fas fa-save"></i> Save Changes
      </button>
    </div>
  `;
  
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
  if (!confirm(`Delete nutrition log for ${new Date(date).toLocaleDateString()}?`)) return;
  
  try {
    await api(`/nutrition/daily/${date}`, {
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
  if (currentValue === `${column}-desc`) {
    select.value = `${column}-asc`;
  } else {
    select.value = `${column}-desc`;
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
      ? `${columnMap[column]}-asc` 
      : `${columnMap[column]}-desc`;
    sortWeeklyTrends();
  }
}

// Delete a set
async function deleteSet(exerciseId, setId) {
  if (!confirm('Delete this set?')) return;
  
  try {
    await api(`/workouts/${state.currentWorkout.id}/exercises/${exerciseId}/sets/${setId}`, {
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
    await api(`/workouts/${state.currentWorkout.id}`, {
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
  
  modalBody.innerHTML = `
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
  `;
  
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
    await api(`/workouts/${state.currentWorkout.id}/cardio`, {
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
  const details = document.getElementById(`workout-details-${workoutId}`);
  const chevron = document.getElementById(`workout-chevron-${workoutId}`);
  
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
    await api(`/workouts/${workoutId}`, {
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
    await api(`/workouts/${workoutId}`, {
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
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 10000;
    overflow-y: auto;
  `;
  
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
  
  modal.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-running" style="font-size: 40px; color: white;"></i>
        </div>
        <h1 style="font-size: 32px; margin: 0 0 12px 0;">Warm-Up & Stretch</h1>
        <p style="font-size: 18px; color: var(--gray); margin: 0;">Prepare your body for ${workout.day_name || 'your workout'}</p>
      </div>
      
      <!-- Warmup Exercises -->
      <div style="background: var(--light); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
          <i class="fas fa-list-check"></i> Recommended Warm-ups
        </h3>
        <div style="display: grid; gap: 12px;">
          ${warmups.slice(0, 6).map((warmup, idx) => `
            <div style="background: white; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px;">
              <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                ${idx + 1}
              </div>
              <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 4px;">${warmup.name}</strong>
                <span style="color: var(--gray); font-size: 13px;"><i class="fas fa-bullseye"></i> ${warmup.muscle}</span>
              </div>
              <span style="color: var(--gray); font-size: 13px;">30-60 sec</span>
            </div>
          `).join('')}
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
  `;
  
  document.body.appendChild(modal);
}

// Cancel workout start
function cancelWorkoutStart() {
  const modal = document.getElementById('workout-modal');
  if (modal) modal.remove();
  
  // Delete the workout that was created
  if (state.currentWorkout) {
    api(`/workouts/${state.currentWorkout.id}`, { method: 'DELETE' });
    state.currentWorkout = null;
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
    const data = await api(`/workouts/${state.currentWorkout.id}`);
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
  
  modal.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100vh;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; padding: 20px; flex-shrink: 0;">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0 0 8px 0; color: white;">${workout.day_name || 'Workout'}</h2>
            <div style="font-size: 14px; opacity: 0.9;">Exercise ${currentIdx + 1} of ${workout.exercises.length}</div>
          </div>
          <div id="workoutTimer" style="font-size: 24px; font-weight: bold; font-family: monospace;">00:00:00</div>
        </div>
      </div>
      
      <!-- Exercise Tabs -->
      <div style="background: var(--light); border-bottom: 2px solid var(--border); padding: 8px 0; overflow-x: auto; flex-shrink: 0;">
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; gap: 8px;">
          ${workout.exercises.map((ex, idx) => `
            <button 
              onclick="switchToExercise(${idx})"
              style="padding: 12px 20px; border: none; background: ${idx === currentIdx ? 'var(--primary)' : idx < currentIdx ? 'var(--secondary)' : 'white'}; color: ${idx === currentIdx || idx < currentIdx ? 'white' : 'var(--gray)'}; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; ${idx > currentIdx ? 'opacity: 0.5;' : ''}">
              ${idx < currentIdx ? '<i class="fas fa-check"></i>' : ''} ${ex.name.length > 20 ? ex.name.substring(0, 20) + '...' : ex.name}
            </button>
          `).join('')}
        </div>
      </div>
      
      <!-- Exercise Content -->
      <div style="flex: 1; overflow-y: auto; background: var(--light);">
        <div style="max-width: 1200px; margin: 0 auto; padding: 24px 20px;">
          ${renderExerciseContent(currentExercise, currentIdx)}
        </div>
      </div>
      
      <!-- Footer Actions -->
      <div style="background: white; border-top: 2px solid var(--border); padding: 16px 20px; flex-shrink: 0; box-shadow: 0 -2px 10px rgba(0,0,0,0.05);">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline" onclick="previousExercise()" ${currentIdx === 0 ? 'disabled style="opacity: 0.5;"' : ''}>
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
            ${currentIdx === workout.exercises.length - 1 ? '<i class="fas fa-flag-checkered"></i> Finish' : '<i class="fas fa-arrow-right"></i> Next Exercise'}
          </button>
        </div>
      </div>
    </div>
  `;
  
  updateWorkoutTimerDisplay();
}

// Render exercise content with set table
function renderExerciseContent(exercise, index) {
  const system = (state.user && state.user.measurement_system) || 'metric';
  const weightUnit = system === 'imperial' ? 'lbs' : 'kg';
  const completedSets = (exercise.sets || []).length;
  const targetSets = exercise.target_sets || 3;
  
  return `
    <!-- Exercise Header -->
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div style="flex: 1;">
          <h2 style="margin: 0 0 12px 0;">${exercise.name}</h2>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <span style="background: var(--secondary-light); color: var(--secondary); padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;">
              <i class="fas fa-bullseye"></i> ${exercise.muscle_group}
            </span>
            <span style="background: var(--primary-light); color: var(--primary); padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;">
              <i class="fas fa-dumbbell"></i> ${exercise.equipment}
            </span>
            ${exercise.is_unilateral ? '<span style="background: var(--warning); color: white; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;"><i class="fas fa-balance-scale"></i> Unilateral</span>' : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 36px; font-weight: bold; color: var(--primary);">${completedSets}/${targetSets}</div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Sets Complete</div>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div style="background: var(--light); height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%); height: 100%; width: ${Math.min((completedSets / targetSets) * 100, 100)}%; transition: width 0.3s;"></div>
      </div>
    </div>
    
    <!-- Exercise Tips -->
    ${exercise.tips ? `
      <div class="card" style="margin-bottom: 20px;">
        <details open>
          <summary style="cursor: pointer; font-weight: 600; color: var(--primary); user-select: none; font-size: 16px;">
            <i class="fas fa-lightbulb"></i> Form & Technique Tips
          </summary>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); line-height: 1.6; color: var(--dark);">
            ${exercise.tips}
          </div>
        </details>
      </div>
    ` : ''}
    
    <!-- Set Table -->
    <div class="card">
      <h3 style="margin: 0 0 16px 0;"><i class="fas fa-table"></i> Set Tracker</h3>
      
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 80px;">Set</th>
              <th>Weight (${weightUnit})</th>
              <th>Reps</th>
              <th style="width: 120px;">1RM</th>
              <th style="width: 100px;">Complete</th>
              <th style="width: 80px;">Actions</th>
            </tr>
          </thead>
          <tbody id="set-table-body">
            ${(exercise.sets || []).map((set, idx) => `
              <tr style="background: var(--secondary-light);">
                <td><strong>${set.set_number}</strong></td>
                <td><strong>${formatWeight(set.weight_kg, system)}</strong></td>
                <td><strong>${set.reps}</strong></td>
                <td>${formatWeight(set.one_rep_max_kg, system)}</td>
                <td><span style="color: var(--secondary); font-size: 20px;"><i class="fas fa-check-circle"></i></span></td>
                <td>
                  <button class="btn btn-danger" onclick="deleteExerciseSet(${exercise.id}, ${set.id})" style="padding: 4px 8px; font-size: 12px;">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
            ${completedSets < 10 ? `
              <tr id="new-set-row">
                <td><strong>${completedSets + 1}</strong></td>
                <td>
                  <input type="number" id="newSetWeight" placeholder="0" step="${system === 'imperial' ? '5' : '2.5'}" 
                    style="width: 100%; padding: 8px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px;">
                </td>
                <td>
                  <input type="number" id="newSetReps" placeholder="0" min="1"
                    style="width: 100%; padding: 8px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px;">
                </td>
                <td colspan="2">
                  <button class="btn btn-primary" onclick="addExerciseSet(${exercise.id})" style="width: 100%;">
                    <i class="fas fa-plus"></i> Log Set
                  </button>
                </td>
                <td></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      
      ${completedSets >= targetSets ? `
        <div style="margin-top: 16px; padding: 16px; background: var(--secondary-light); border-radius: 8px; text-align: center;">
          <i class="fas fa-check-circle" style="font-size: 24px; color: var(--secondary); margin-bottom: 8px;"></i>
          <div style="font-weight: 600; color: var(--secondary);">Target Sets Complete! Ready to move on.</div>
        </div>
      ` : ''}
    </div>
  `;
}

// Add set to exercise
async function addExerciseSet(exerciseId) {
  const weightInput = document.getElementById('newSetWeight');
  const repsInput = document.getElementById('newSetReps');
  
  let weight = parseFloat(weightInput.value);
  const reps = parseInt(repsInput.value);
  
  if (!weight || !reps) {
    showNotification('Please enter weight and reps', 'warning');
    return;
  }
  
  // Convert to kg if imperial
  const system = (state.user && state.user.measurement_system) || 'metric';
  if (system === 'imperial') {
    weight = weight * 0.453592;
  }
  
  try {
    await api(`/workouts/${state.currentWorkout.id}/exercises/${exerciseId}/sets`, {
      method: 'POST',
      body: JSON.stringify({ weight_kg: weight, reps, rest_seconds: 90 })
    });
    
    // Refresh workout data
    const data = await api(`/workouts/${state.currentWorkout.id}`);
    state.currentWorkout = data.workout;
    
    // Re-render current exercise
    renderWorkoutExerciseTabs();
    
    showNotification('Set logged!', 'success');
    
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
    
  } catch (error) {
    showNotification('Error logging set: ' + error.message, 'error');
  }
}

// Delete set from exercise
async function deleteExerciseSet(exerciseId, setId) {
  if (!confirm('Delete this set?')) return;
  
  try {
    await api(`/workouts/${state.currentWorkout.id}/exercises/${exerciseId}/sets/${setId}`, {
      method: 'DELETE'
    });
    
    // Refresh workout data
    const data = await api(`/workouts/${state.currentWorkout.id}`);
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
    await api(`/workouts/${state.currentWorkout.id}/complete`, {
      method: 'POST'
    });
    
    // Get final workout data
    const data = await api(`/workouts/${state.currentWorkout.id}`);
    const workout = data.workout;
    
    // Calculate stats
    const totalSets = workout.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const totalVolume = workout.exercises.reduce((sum, ex) => {
      return sum + (ex.sets || []).reduce((exSum, set) => exSum + (set.weight_kg * set.reps), 0);
    }, 0);
    const duration = workout.total_duration_seconds || 0;
    
    // Fun comparisons
    const comparison = getFunWeightComparison(totalVolume);
    
    modal.innerHTML = `
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
            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${formatDuration(duration)}</div>
          </div>
          <div class="card" style="text-align: center;">
            <div style="font-size: 14px; color: var(--gray); text-transform: uppercase; margin-bottom: 8px;">Total Sets</div>
            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${totalSets}</div>
          </div>
          <div class="card" style="text-align: center;">
            <div style="font-size: 14px; color: var(--gray); text-transform: uppercase; margin-bottom: 8px;">Total Volume</div>
            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${Math.round(totalVolume)} kg</div>
          </div>
        </div>
        
        <!-- Fun Comparison -->
        <div class="card" style="background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%); border: none; margin-bottom: 32px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="font-size: 60px;">${comparison.emoji}</div>
            <div>
              <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${comparison.title}</div>
              <div style="font-size: 16px; color: var(--gray);">${comparison.description}</div>
            </div>
          </div>
        </div>
        
        <!-- Exercise Summary -->
        <div class="card" style="margin-bottom: 32px;">
          <h3 style="margin: 0 0 16px 0;"><i class="fas fa-list-check"></i> Exercise Summary</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${workout.exercises.map((ex, idx) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--light); border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    ${idx + 1}
                  </div>
                  <strong>${ex.name}</strong>
                </div>
                <span style="color: var(--gray);">${(ex.sets || []).length} sets completed</span>
              </div>
            `).join('')}
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
    `;
    
  } catch (error) {
    showNotification('Error completing workout: ' + error.message, 'error');
  }
}

// Get fun weight comparison
function getFunWeightComparison(totalKg) {
  const comparisons = [
    { threshold: 0, emoji: '🎈', title: 'Great Start!', description: `You lifted the equivalent of ${Math.round(totalKg / 0.45)} basketballs!` },
    { threshold: 500, emoji: '🦁', title: 'Beast Mode!', description: `You lifted the equivalent of ${Math.round(totalKg / 190)} adult lions!` },
    { threshold: 1000, emoji: '🐻', title: 'Incredible Power!', description: `You lifted more than ${Math.round(totalKg / 200)} grizzly bears!` },
    { threshold: 2000, emoji: '🚗', title: 'Superhuman Strength!', description: `You lifted the equivalent of ${(totalKg / 1500).toFixed(1)} compact cars!` },
    { threshold: 3000, emoji: '🦏', title: 'Absolutely Insane!', description: `You lifted ${(totalKg / 2000).toFixed(1)} rhinoceroses worth of weight!` },
    { threshold: 5000, emoji: '🐘', title: 'Legendary Performance!', description: `You lifted ${(totalKg / 5000).toFixed(1)} elephants! That's phenomenal!` }
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
  
  try {
    await api(`/workouts/${state.currentWorkout.id}`, {
      method: 'DELETE'
    });
    
    showNotification('Workout deleted', 'success');
    finishWorkoutSummary();
    
  } catch (error) {
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
    timerDisplay.style.cssText = `
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
    `;
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
      timerDisplay.innerHTML = `
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Rest Timer</div>
        <div style="font-size: 48px; font-weight: bold; font-family: monospace; line-height: 1;">
          ${mins}:${secs.toString().padStart(2, '0')}
        </div>
        <button class="btn btn-outline" onclick="skipRestTimer()" style="margin-top: 12px; background: white; color: var(--primary); border: none; padding: 8px 16px; font-size: 12px;">
          Skip Rest
        </button>
      `;
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
  
  // Ignore if typing in input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  const modal = document.getElementById('workout-modal');
  if (!modal) return;
  
  switch(e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      previousExercise();
      break;
    case 'ArrowRight':
      e.preventDefault();
      nextExercise();
      break;
    case 'Enter':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const logButton = document.querySelector('.btn-primary[onclick^="addExerciseSet"]');
        if (logButton) logButton.click();
      }
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
  helpModal.style.cssText = `
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
  `;
  
  helpModal.innerHTML = `
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
  `;
  
  helpModal.onclick = (e) => {
    if (e.target === helpModal) helpModal.remove();
  };
  
  document.body.appendChild(helpModal);
}

// Workout Notes
function showWorkoutNotesModal() {
  const notesModal = document.createElement('div');
  notesModal.style.cssText = `
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
  `;
  
  notesModal.innerHTML = `
    <div style="background: white; border-radius: 16px; padding: 32px; max-width: 600px; width: 90%; animation: scaleIn 0.3s ease-out;">
      <h2 style="margin: 0 0 16px 0;"><i class="fas fa-note-sticky"></i> Workout Notes</h2>
      <p style="color: var(--gray); margin-bottom: 16px;">Add notes about today's workout (form, energy levels, etc.)</p>
      <textarea id="workout-notes-input" 
        style="width: 100%; min-height: 150px; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 14px; resize: vertical;"
        placeholder="e.g., Felt strong today, increased weight on bench press...">${state.workoutNotes}</textarea>
      <div style="display: flex; gap: 12px; margin-top: 20px;">
        <button class="btn btn-outline" onclick="this.closest('div[style*=fixed]').remove()" style="flex: 1;">
          Cancel
        </button>
        <button class="btn btn-primary" onclick="saveWorkoutNotes()" style="flex: 1;">
          <i class="fas fa-save"></i> Save Notes
        </button>
      </div>
    </div>
  `;
  
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
      
      confetti.style.cssText = `
        position: fixed;
        left: ${left}%;
        top: -20px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        z-index: 10003;
        pointer-events: none;
        animation: confettiFall ${animationDuration}s ease-out forwards;
        opacity: 1;
      `;
      
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
  
  overlay.style.cssText = `
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
  `;
  
  overlay.innerHTML = `
    <div style="text-align: center;">
      <div class="spinner" style="margin: 0 auto 20px;"></div>
      <div style="font-size: 18px; color: var(--gray);">${message}</div>
    </div>
  `;
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
  styleEl.textContent = `
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
  `;
  
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
  
  container.innerHTML = `
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
      
      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-info-circle"></i> What is Hypertrophy?</h3>
      <p style="line-height: 1.7; color: var(--text-secondary);">
        <strong>Hypertrophy</strong> refers to the increase in muscle size through the enlargement of muscle fibers. It occurs when muscle protein synthesis exceeds muscle protein breakdown, typically achieved through resistance training combined with adequate nutrition and recovery.
      </p>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-chart-line"></i> Scientific Principles</h3>
      <div style="display: grid; gap: 12px; margin-top: 12px;">
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--primary); border-radius: 8px;">
          <strong style="color: var(--primary);">Mechanical Tension</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            The primary driver of muscle growth. Progressive overload through increasing weight, reps, or sets creates mechanical stress that signals muscle adaptation.
            <br><em style="font-size: 13px;">Source: Schoenfeld, B.J. (2010). The mechanisms of muscle hypertrophy. Journal of Strength and Conditioning Research.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--secondary); border-radius: 8px;">
          <strong style="color: var(--secondary);">Metabolic Stress</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            The "pump" feeling from higher rep ranges (8-15 reps) creates cellular swelling and metabolite accumulation, contributing to muscle growth.
            <br><em style="font-size: 13px;">Source: Schoenfeld, B.J. (2013). Potential mechanisms for a role of metabolic stress. Sports Medicine.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--warning); border-radius: 8px;">
          <strong style="color: var(--warning);">Muscle Damage</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Controlled muscle damage from eccentric (lowering) phases triggers repair and growth. Recovery is crucial for this adaptation.
            <br><em style="font-size: 13px;">Source: Clarkson, P.M. & Hubal, M.J. (2002). Exercise-induced muscle damage in humans. American Journal of Physical Medicine.</em>
          </p>
        </div>
      </div>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-cogs"></i> Optimal Training Parameters</h3>
      <div style="overflow-x: auto; margin-top: 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: var(--light);">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Variable</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Recommendation</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Rationale</th>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Rep Range</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">6-15 reps</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Optimal balance of mechanical tension and metabolic stress</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Sets per Muscle</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">10-20 sets/week</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Dose-response relationship for muscle growth</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Frequency</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">2-3x per muscle/week</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Maximizes protein synthesis opportunities</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Intensity</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">60-85% 1RM</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Sufficient load for mechanical tension</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Rest Between Sets</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">60-120 seconds</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Balances recovery and metabolic stress</td>
          </tr>
          <tr>
            <td style="padding: 12px;"><strong>Tempo</strong></td>
            <td style="padding: 12px;">2-3 sec eccentric, 1 sec concentric</td>
            <td style="padding: 12px; font-size: 13px;">Controlled movement maximizes time under tension</td>
          </tr>
        </table>
      </div>
      <p style="margin-top: 12px; font-size: 13px; font-style: italic; color: var(--text-secondary);">
        Source: Schoenfeld, B.J., et al. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. Journal of Sports Sciences.
      </p>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-user"></i> Best For</h3>
      <ul style="margin-top: 12px; line-height: 2; color: var(--text-secondary);">
        <li>Bodybuilders and physique athletes</li>
        <li>Individuals seeking aesthetic improvements</li>
        <li>Athletes needing muscle mass for their sport</li>
        <li>General fitness enthusiasts wanting to build muscle</li>
      </ul>
    </div>

    <!-- Strength Training -->
    <div id="strength-section" class="card">
      <h2 style="color: var(--danger);"><i class="fas fa-weight-hanging"></i> Strength Training (Maximal Force Production)</h2>
      
      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-info-circle"></i> What is Strength Training?</h3>
      <p style="line-height: 1.7; color: var(--text-secondary);">
        <strong>Strength training</strong> focuses on maximizing the amount of force a muscle or muscle group can produce. It emphasizes neural adaptations, motor unit recruitment, and improving intermuscular coordination rather than muscle size alone.
      </p>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-brain"></i> Neural Adaptations</h3>
      <div style="display: grid; gap: 12px; margin-top: 12px;">
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--danger); border-radius: 8px;">
          <strong style="color: var(--danger);">Motor Unit Recruitment</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Heavy loads (>85% 1RM) recruit high-threshold motor units more efficiently, increasing maximal force production without significant muscle growth.
            <br><em style="font-size: 13px;">Source: Sale, D.G. (1988). Neural adaptation to resistance training. Medicine and Science in Sports and Exercise.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--danger); border-radius: 8px;">
          <strong style="color: var(--danger);">Rate Coding</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Frequency at which motor units fire action potentials increases with training, allowing faster and more powerful contractions.
            <br><em style="font-size: 13px;">Source: Van Cutsem, M., et al. (1998). Changes in single motor unit behavior. Journal of Physiology.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--danger); border-radius: 8px;">
          <strong style="color: var(--danger);">Synchronization</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Improved coordination between muscle groups and reduction in antagonist muscle co-activation enhances force transfer.
            <br><em style="font-size: 13px;">Source: Aagaard, P., et al. (2002). Neural adaptation to strength training. Scandinavian Journal of Medicine.</em>
          </p>
        </div>
      </div>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-cogs"></i> Optimal Training Parameters</h3>
      <div style="overflow-x: auto; margin-top: 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: var(--light);">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Variable</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Recommendation</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Rationale</th>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Rep Range</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">1-6 reps</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Maximizes neural adaptations and force production</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Sets per Exercise</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">3-8 sets</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Adequate volume for strength adaptation</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Frequency</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">3-6x per week</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">High frequency improves motor patterns</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Intensity</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">85-100% 1RM</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Heavy loads required for strength gains</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Rest Between Sets</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">3-5 minutes</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Complete recovery for maximal effort</td>
          </tr>
          <tr>
            <td style="padding: 12px;"><strong>Tempo</strong></td>
            <td style="padding: 12px;">Explosive concentric, controlled eccentric</td>
            <td style="padding: 12px; font-size: 13px;">Rate of force development is key</td>
          </tr>
        </table>
      </div>
      <p style="margin-top: 12px; font-size: 13px; font-style: italic; color: var(--text-secondary);">
        Source: Kraemer, W.J. & Ratamess, N.A. (2004). Fundamentals of resistance training. Medicine and Science in Sports and Exercise.
      </p>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-user"></i> Best For</h3>
      <ul style="margin-top: 12px; line-height: 2; color: var(--text-secondary);">
        <li>Powerlifters and strength athletes</li>
        <li>Athletes requiring maximal force (sprinters, throwers)</li>
        <li>Advanced lifters pursuing performance goals</li>
        <li>Individuals preparing for strength competitions</li>
      </ul>
    </div>

    <!-- Endurance Training -->
    <div id="endurance-section" class="card">
      <h2 style="color: var(--secondary);"><i class="fas fa-running"></i> Muscular Endurance Training</h2>
      
      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-info-circle"></i> What is Muscular Endurance?</h3>
      <p style="line-height: 1.7; color: var(--text-secondary);">
        <strong>Muscular endurance</strong> is the ability of a muscle or muscle group to perform repeated contractions against a resistance for an extended period. It emphasizes fatigue resistance and the ability to maintain force output over time.
      </p>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-chart-line"></i> Physiological Adaptations</h3>
      <div style="display: grid; gap: 12px; margin-top: 12px;">
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--secondary); border-radius: 8px;">
          <strong style="color: var(--secondary);">Mitochondrial Density</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            High-rep training increases mitochondrial content in muscle cells, improving aerobic energy production and delaying fatigue.
            <br><em style="font-size: 13px;">Source: Holloszy, J.O. (2008). Regulation of mitochondrial biogenesis. Journal of Applied Physiology.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--secondary); border-radius: 8px;">
          <strong style="color: var(--secondary);">Capillary Density</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Increased capillarization improves oxygen and nutrient delivery to working muscles, enhancing endurance capacity.
            <br><em style="font-size: 13px;">Source: Andersen, P. & Henriksson, J. (1977). Capillary supply of the quadriceps femoris. Acta Physiologica Scandinavica.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--secondary); border-radius: 8px;">
          <strong style="color: var(--secondary);">Buffering Capacity</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Training improves the muscle's ability to buffer lactate and hydrogen ions, delaying the onset of fatigue.
            <br><em style="font-size: 13px;">Source: Bishop, D., et al. (2004). The effects of strength training. Journal of Strength and Conditioning Research.</em>
          </p>
        </div>
      </div>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-cogs"></i> Optimal Training Parameters</h3>
      <div style="overflow-x: auto; margin-top: 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: var(--light);">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Variable</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Recommendation</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Rationale</th>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Rep Range</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">15-25+ reps</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Extended time under tension builds endurance</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Sets per Exercise</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">2-4 sets</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Moderate volume with high reps</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Frequency</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">3-5x per week</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Frequent stimulation of endurance adaptations</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Intensity</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">40-60% 1RM</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Light to moderate loads</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Rest Between Sets</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">30-60 seconds</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Short rest maintains metabolic stress</td>
          </tr>
          <tr>
            <td style="padding: 12px;"><strong>Tempo</strong></td>
            <td style="padding: 12px;">Steady, controlled pace</td>
            <td style="padding: 12px; font-size: 13px;">Consistent movement pattern</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-user"></i> Best For</h3>
      <ul style="margin-top: 12px; line-height: 2; color: var(--text-secondary);">
        <li>Endurance athletes (runners, cyclists, swimmers)</li>
        <li>Combat sports athletes (MMA, boxing)</li>
        <li>Individuals focusing on work capacity</li>
        <li>Rehabilitation and injury prevention</li>
      </ul>
    </div>

    <!-- Cardio Training -->
    <div id="cardio-section" class="card">
      <h2 style="color: var(--warning);"><i class="fas fa-heartbeat"></i> Cardiovascular Training</h2>
      
      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-info-circle"></i> What is Cardiovascular Training?</h3>
      <p style="line-height: 1.7; color: var(--text-secondary);">
        <strong>Cardiovascular training</strong> (aerobic exercise) improves the efficiency of the cardiovascular system in absorbing and transporting oxygen. It enhances heart health, aerobic capacity (VO2max), and overall metabolic health.
      </p>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-heart"></i> Cardiovascular Adaptations</h3>
      <div style="display: grid; gap: 12px; margin-top: 12px;">
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--warning); border-radius: 8px;">
          <strong style="color: var(--warning);">Increased Stroke Volume</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            The heart becomes more efficient, pumping more blood per beat. This reduces resting heart rate and improves exercise capacity.
            <br><em style="font-size: 13px;">Source: Levine, B.D. (2008). VO2max: what do we know, and what do we still need to know? Journal of Physiology.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--warning); border-radius: 8px;">
          <strong style="color: var(--warning);">Enhanced VO2max</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Maximal oxygen uptake increases through improved cardiac output and oxygen extraction at the muscle level.
            <br><em style="font-size: 13px;">Source: Bassett, D.R. & Howley, E.T. (2000). Limiting factors for maximum oxygen uptake. Medicine and Science in Sports.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-left: 4px solid var(--warning); border-radius: 8px;">
          <strong style="color: var(--warning);">Metabolic Efficiency</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Improved fat oxidation, insulin sensitivity, and mitochondrial function enhance metabolic health and endurance.
            <br><em style="font-size: 13px;">Source: Helgerud, J., et al. (2007). Aerobic high-intensity intervals. American Journal of Physiology.</em>
          </p>
        </div>
      </div>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-layer-group"></i> Training Zones</h3>
      <div style="overflow-x: auto; margin-top: 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: var(--light);">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Zone</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Intensity (% HRmax)</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Duration</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Primary Benefit</th>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Zone 1 (Recovery)</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">50-60%</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">20-40 min</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Active recovery, base building</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Zone 2 (Endurance)</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">60-70%</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">30-90 min</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Fat oxidation, aerobic base</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Zone 3 (Tempo)</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">70-80%</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">20-40 min</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">Lactate threshold improvement</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>Zone 4 (Threshold)</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">80-90%</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">10-30 min</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px;">VO2max improvement</td>
          </tr>
          <tr>
            <td style="padding: 12px;"><strong>Zone 5 (Max)</strong></td>
            <td style="padding: 12px;">90-100%</td>
            <td style="padding: 12px;">1-5 min intervals</td>
            <td style="padding: 12px; font-size: 13px;">Anaerobic capacity, speed</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-clock"></i> Training Methods</h3>
      <div style="display: grid; gap: 12px; margin-top: 12px;">
        <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: var(--warning);">Steady State (LISS)</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Continuous moderate intensity (Zone 2-3) for 30-60 minutes. Best for building aerobic base and fat oxidation.
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: var(--warning);">High-Intensity Interval Training (HIIT)</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Short bursts (20-90 sec) at 85-95% HRmax with recovery periods. Improves VO2max and metabolic rate efficiently.
            <br><em style="font-size: 13px;">Source: Gibala, M.J. & McGee, S.L. (2008). Metabolic adaptations to short-term high-intensity interval training. Exercise and Sport Sciences Reviews.</em>
          </p>
        </div>
        <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
          <strong style="color: var(--warning);">Fartlek Training</strong>
          <p style="margin-top: 8px; line-height: 1.6; color: var(--text-secondary);">
            Variable intensity "speed play" combining different zones. Excellent for sport-specific conditioning.
          </p>
        </div>
      </div>

      <h3 style="margin-top: 24px; color: var(--text-primary);"><i class="fas fa-user"></i> Best For</h3>
      <ul style="margin-top: 12px; line-height: 2; color: var(--text-secondary);">
        <li>Overall health and longevity</li>
        <li>Weight loss and body composition</li>
        <li>Endurance athletes (runners, cyclists, triathletes)</li>
        <li>Heart health and disease prevention</li>
      </ul>
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
  `;
}
