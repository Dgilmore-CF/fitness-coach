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
  workoutTimer: null,
  audioContext: null
};

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
          <div class="exercise-list">
            \${recentWorkouts.workouts.map(w => \`
              <div class="exercise-item" onclick="viewWorkout(\${w.id})">
                <div style="display: flex; justify-content: space-between;">
                  <div>
                    <strong>\${w.day_name || 'Custom Workout'}</strong>
                    <div style="color: var(--gray); font-size: 14px;">
                      \${new Date(w.start_time).toLocaleDateString()} - 
                      \${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div>\${formatDuration(w.total_duration_seconds)}</div>
                    \${w.completed ? '<span style="color: var(--secondary);">✓ Completed</span>' : '<span style="color: var(--warning);">In Progress</span>'}
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

    // Show day selection
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = \`
      <h3>Select Workout Day</h3>
      <div class="exercise-list">
        \${program.days.map(day => \`
          <div class="exercise-item" onclick="startWorkoutDay(\${program.id}, \${day.id})">
            <strong>Day \${day.day_number}: \${day.name}</strong>
            <div style="color: var(--gray); font-size: 14px;">\${day.focus}</div>
            <div style="font-size: 12px; margin-top: 4px;">\${day.exercises.length} exercises</div>
          </div>
        \`).join('')}
      </div>
    \`;

    document.getElementById('modalTitle').textContent = 'Start Workout';
    openModal();
  } catch (error) {
    showNotification('Error starting workout: ' + error.message, 'error');
  }
}

// Start workout from program day
async function startWorkoutDay(programId, programDayId) {
  try {
    const data = await api('/workouts', {
      method: 'POST',
      body: JSON.stringify({
        program_id: programId,
        program_day_id: programDayId
      })
    });

    state.currentWorkout = data.workout;
    closeModal();
    switchTab('workout');
    loadWorkoutInterface();
    showNotification('Workout started!', 'success');
  } catch (error) {
    showNotification('Error starting workout: ' + error.message, 'error');
  }
}

// Workout interface
async function loadWorkout() {
  const container = document.getElementById('workout');

  // Check for active workout
  if (!state.currentWorkout) {
    const workouts = await api('/workouts?limit=1');
    const activeWorkout = workouts.workouts.find(w => !w.completed);
    
    if (activeWorkout) {
      state.currentWorkout = activeWorkout;
    }
  }

  if (state.currentWorkout) {
    loadWorkoutInterface();
  } else {
    container.innerHTML = \`
      <div class="card">
        <h2><i class="fas fa-dumbbell"></i> No Active Workout</h2>
        <p>Start a workout to begin tracking your session.</p>
        <button class="btn btn-primary" onclick="startWorkout()">
          <i class="fas fa-play"></i> Start Workout
        </button>
      </div>
    \`;
  }
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

    container.innerHTML = \`
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2><i class="fas fa-stopwatch"></i> \${workout.day_name || 'Workout Session'}</h2>
          <div id="workoutTimer" class="timer-display" style="font-size: 24px;">00:00:00</div>
        </div>
      </div>

      <div class="card">
        <h3><i class="fas fa-stopwatch"></i> Rest Timer</h3>
        <div id="restTimer" class="timer-display">00:00</div>
        <div class="timer-controls">
          <button class="btn btn-secondary" onclick="startRestTimer(60)">60s</button>
          <button class="btn btn-secondary" onclick="startRestTimer(90)">90s</button>
          <button class="btn btn-secondary" onclick="startRestTimer(120)">120s</button>
          <button class="btn btn-outline" onclick="stopRestTimer()">Stop</button>
        </div>
      </div>

      <div class="card">
        <h3><i class="fas fa-list"></i> Exercises</h3>
        <div id="exerciseList">
          \${workout.exercises.map((ex, idx) => renderExercise(ex, idx)).join('')}
        </div>
        <button class="btn btn-outline" onclick="addExerciseToWorkout()">
          <i class="fas fa-plus"></i> Add Exercise
        </button>
      </div>

      <div class="card">
        <h3><i class="fas fa-notes-medical"></i> Workout Notes</h3>
        <textarea id="workoutNotes" class="form-control" rows="3" placeholder="Add notes about your workout...">\${workout.notes || ''}</textarea>
        <button class="btn btn-outline" onclick="saveWorkoutNotes()" style="margin-top: 10px;">Save Notes</button>
      </div>

      <div class="card">
        <button class="btn btn-primary" onclick="completeWorkout()">
          <i class="fas fa-check"></i> Complete Workout
        </button>
      </div>
    \`;

    updateWorkoutTimerDisplay();
  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading workout: \${error.message}</p></div>\`;
  }
}

// Render exercise
function renderExercise(exercise, index) {
  const system = (state.user && state.user.measurement_system) || 'metric';
  const isImperial = system === 'imperial';
  const weightUnit = isImperial ? 'lbs' : 'kg';
  const weightStep = isImperial ? '5' : '2.5';
  
  return \`
    <div class="exercise-item" id="exercise-\${exercise.id}">
      <div style="margin-bottom: 10px;">
        <strong>\${index + 1}. \${exercise.name}</strong>
        <div style="font-size: 12px; color: var(--gray);">
          \${exercise.muscle_group} | \${exercise.equipment}
          \${exercise.is_unilateral ? ' | <strong>UNILATERAL (weight doubles)</strong>' : ''}
        </div>
        \${exercise.tips ? \`
          <details style="margin-top: 8px;">
            <summary style="cursor: pointer; color: var(--primary);"><i class="fas fa-info-circle"></i> Exercise Tips</summary>
            <p style="font-size: 13px; margin-top: 8px;">\${exercise.tips}</p>
          </details>
        \` : ''}
      </div>

      <div class="set-tracker">
        \${(exercise.sets || []).map((set, setIdx) => \`
          <div class="set-item completed">
            <div>Set \${set.set_number}</div>
            <div>\${formatWeight(set.weight_kg, system)} x \${set.reps}</div>
            <div style="font-size: 10px;">1RM: \${formatWeight(set.one_rep_max_kg, system)}</div>
          </div>
        \`).join('')}
      </div>

      <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <input type="number" id="weight-\${exercise.id}" placeholder="Weight (\${weightUnit})" step="\${weightStep}" 
               style="width: 110px; padding: 8px; border: 2px solid var(--light); border-radius: 6px;">
        <input type="number" id="reps-\${exercise.id}" placeholder="Reps" min="1"
               style="width: 80px; padding: 8px; border: 2px solid var(--light); border-radius: 6px;">
        <button class="btn btn-secondary" onclick="recordSet(\${exercise.id})">
          <i class="fas fa-plus"></i> Add Set
        </button>
        <button class="btn btn-outline" onclick="showExerciseNotes(\${exercise.id})">
          <i class="fas fa-sticky-note"></i> Notes
        </button>
      </div>
    </div>
  \`;
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
  if (state.restTimer) {
    clearInterval(state.restTimer);
    state.restTimer = null;
    state.restEndTime = null;
    const display = document.getElementById('restTimer');
    if (display) display.textContent = '00:00';
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
  } catch (error) {
    container.innerHTML = \`<div class="card"><p>Error loading analytics: \${error.message}</p></div>\`;
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
          <h3><i class="fas fa-calendar-week"></i> Weekly Trends</h3>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Avg Protein</th>
                  <th>Avg Water</th>
                  <th>Avg Creatine</th>
                  <th>Days Logged</th>
                  <th>Goals Hit</th>
                </tr>
              </thead>
              <tbody>
                \${weekly_trends.map(week => \`
                  <tr>
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
      body: JSON.stringify({ name, age, height_cm, weight_kg, measurement_system })
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

// Save workout notes
async function saveWorkoutNotes() {
  const notes = document.getElementById('workoutNotes').value;
  
  try {
    await api(\`/workouts/\${state.currentWorkout.id}\`, {
      method: 'PUT',
      body: JSON.stringify({ notes })
    });

    showNotification('Notes saved!', 'success');
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
`;
