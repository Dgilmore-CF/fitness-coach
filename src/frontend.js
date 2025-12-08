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
            <div class="stat-value">\${Math.round(progress.overview.total_volume_kg)} kg</div>
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
                      \${w.total_weight_kg ? Math.round(w.total_weight_kg) + ' kg' : 'N/A'}
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
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2><i class="fas fa-list-alt"></i> My Programs</h2>
          <button class="btn btn-primary" onclick="showGenerateProgram()">
            <i class="fas fa-magic"></i> Generate New Program
          </button>
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
        <div style="margin: 20px 0; padding: 16px; background: var(--light); border-radius: 8px;">
          <h4>Day \${day.day_number}: \${day.name}</h4>
          <p style="color: var(--gray); margin-bottom: 10px;">\${day.focus}</p>
          
          <strong>Warm-up Stretches:</strong>
          <ul style="margin: 10px 0;">
            \${day.stretches.map(s => \`
              <li>\${s.name} - \${s.duration_seconds}s (\${s.muscle_group})</li>
            \`).join('')}
          </ul>

          <strong>Exercises:</strong>
          <ol style="margin: 10px 0;">
            \${day.exercises.map(ex => \`
              <li>
                <strong>\${ex.name}</strong> - \${ex.target_sets} sets x \${ex.target_reps} reps
                <div style="font-size: 12px; color: var(--gray);">
                  Rest: \${ex.rest_seconds}s | \${ex.muscle_group} | \${ex.equipment}
                </div>
                \${ex.tips ? \`<div style="font-size: 12px; font-style: italic; margin-top: 4px;">\${ex.tips}</div>\` : ''}
              </li>
            \`).join('')}
          </ol>
        </div>
      \`).join('')}

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
    \`;

    document.getElementById('modalTitle').textContent = 'Program Details';
    openModal();
  } catch (error) {
    showNotification('Error loading program: ' + error.message, 'error');
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

  try {
    showNotification('Generating program... This may take a moment.', 'info');
    closeModal();

    await api('/programs/generate', {
      method: 'POST',
      body: JSON.stringify({
        days_per_week: parseInt(days),
        goal
      })
    });

    showNotification('Program generated successfully!', 'success');
    loadPrograms();
  } catch (error) {
    showNotification('Error generating program: ' + error.message, 'error');
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
            <div>\${set.weight_kg}kg x \${set.reps}</div>
            <div style="font-size: 10px;">1RM: \${Math.round(set.one_rep_max_kg)}kg</div>
          </div>
        \`).join('')}
      </div>

      <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <input type="number" id="weight-\${exercise.id}" placeholder="Weight (kg)" step="2.5" 
               style="width: 100px; padding: 8px; border: 2px solid var(--light); border-radius: 6px;">
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
  const weight = parseFloat(document.getElementById(\`weight-\${exerciseId}\`).value);
  const reps = parseInt(document.getElementById(\`reps-\${exerciseId}\`).value);

  if (!weight || !reps) {
    showNotification('Please enter weight and reps', 'warning');
    return;
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
    await api(\`/workouts/\${state.currentWorkout.id}/complete\`, { method: 'POST' });
    
    if (state.workoutTimer) {
      clearInterval(state.workoutTimer);
      state.workoutTimer = null;
    }
    
    stopRestTimer();
    state.currentWorkout = null;
    state.workoutStartTime = null;
    
    showNotification('Workout completed! Great job!', 'success');
    loadWorkout();
  } catch (error) {
    showNotification('Error completing workout: ' + error.message, 'error');
  }
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
            <div class="stat-value">\${Math.round(progress.overview.total_volume_kg)} kg</div>
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
                <span>\${Math.round(m.volume)} kg</span>
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
                <div style="font-size: 12px;">\${Math.round(m.volume)} kg</div>
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
                    <div>\${Math.round(ex.volume)} kg total</div>
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

// Nutrition
async function loadNutrition() {
  const container = document.getElementById('nutrition');
  
  try {
    const daily = await api('/nutrition/daily');
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = \`
      <div class="card">
        <h2><i class="fas fa-apple-alt"></i> Today's Nutrition</h2>
        <div class="stats-grid">
          <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <div class="stat-label">Protein</div>
            <div class="stat-value">\${Math.round(daily.protein_grams)}g</div>
            <div class="stat-label">Goal: \${Math.round(daily.protein_goal)}g (\${Math.round(daily.protein_percentage)}%)</div>
          </div>
          <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
            <div class="stat-label">Water</div>
            <div class="stat-value">\${Math.round(daily.water_ml)}ml</div>
            <div class="stat-label">Goal: \${Math.round(daily.water_goal)}ml (\${Math.round(daily.water_percentage)}%)</div>
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
        </div>
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

// Profile modal
function showProfile() {
  const modalBody = document.getElementById('modalBody');
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
      <label>Height (cm):</label>
      <input type="number" id="profileHeight" value="\${state.user.height_cm || ''}" class="form-control" step="0.1">
    </div>

    <div class="form-group">
      <label>Weight (kg):</label>
      <input type="number" id="profileWeight" value="\${state.user.weight_kg || ''}" class="form-control" step="0.1">
    </div>

    <button class="btn btn-primary" onclick="saveProfile()">
      <i class="fas fa-save"></i> Save Profile
    </button>
  \`;

  document.getElementById('modalTitle').textContent = 'User Profile';
  openModal();
}

async function saveProfile() {
  const name = document.getElementById('profileName').value;
  const age = parseInt(document.getElementById('profileAge').value);
  const height_cm = parseFloat(document.getElementById('profileHeight').value);
  const weight_kg = parseFloat(document.getElementById('profileWeight').value);

  try {
    const data = await api('/auth/user', {
      method: 'PUT',
      body: JSON.stringify({ name, age, height_cm, weight_kg })
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

function openModal() {
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
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
