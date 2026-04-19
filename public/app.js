/**
 * AI Fitness Coach - Frontend Application
 */

// Global state
const state = {
  user: null,
  currentWorkout: null,
  currentProgram: null,
  currentTab: 'dashboard',
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

// Smart weight tracking for bodyweight exercises
// Returns: { showWeight: boolean, useBodyweight: boolean, weightOptional: boolean }
function getBodyweightExerciseConfig(exerciseName, muscleGroup) {
  const name = (exerciseName || '').toLowerCase();
  const group = (muscleGroup || '').toLowerCase();
  
  // Core exercises - typically no weight needed (reps only)
  const noWeightExercises = [
    'sit-up', 'situp', 'crunch', 'plank', 'dead bug', 'bird dog', 'mountain climber',
    'leg raise', 'flutter kick', 'bicycle', 'v-up', 'hollow hold', 'superman',
    'reverse crunch', 'toe touch', 'russian twist', 'side plank', 'windshield wiper',
    'jumping jack', 'high knee', 'butt kick', 'burpee'
  ];
  
  // Exercises where bodyweight is the primary resistance (optional to track)
  const bodyweightOptionalExercises = [
    'push-up', 'push up', 'pushup', 'pull-up', 'pull up', 'pullup', 
    'chin-up', 'chin up', 'chinup', 'dip', 'inverted row', 'muscle-up',
    'pistol squat', 'lunge', 'squat', 'glute bridge', 'hip thrust',
    'nordic curl', 'calf raise', 'step-up', 'step up'
  ];
  
  // Check if weight should be hidden completely
  for (const pattern of noWeightExercises) {
    if (name.includes(pattern)) {
      return { showWeight: false, useBodyweight: false, weightOptional: true };
    }
  }
  
  // Check if it's a bodyweight exercise where weight is optional
  for (const pattern of bodyweightOptionalExercises) {
    if (name.includes(pattern)) {
      return { showWeight: true, useBodyweight: true, weightOptional: true };
    }
  }
  
  // Default: show weight input normally
  return { showWeight: true, useBodyweight: false, weightOptional: false };
}

function formatWeight(kg, system) {
  if (!kg) return 'N/A';
  system = system || (state.user && state.user.measurement_system) || 'metric';
  if (system === 'imperial') {
    const lbs = kgToLbs(kg);
    // For large totals (>1000), round to whole number for cleaner display
    if (lbs >= 1000) {
      return `${Math.round(lbs).toLocaleString()} lbs`;
    }
    // Show decimal only if it's not a whole number
    return lbs % 1 === 0 ? `${lbs} lbs` : `${lbs.toFixed(1)} lbs`;
  }
  // For large totals (>1000), round to whole number for cleaner display
  if (kg >= 1000) {
    return `${Math.round(kg).toLocaleString()} kg`;
  }
  // Show decimal only if it's not a whole number
  return kg % 1 === 0 ? `${kg} kg` : `${parseFloat(kg).toFixed(1)} kg`;
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
  // Track current tab in state
  state.currentTab = tabName;
  
  // Update desktop tab buttons
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  
  // Find and activate the correct tab button by matching onclick attribute
  const targetTab = Array.from(document.querySelectorAll('.tab')).find(tab => {
    const onclick = tab.getAttribute('onclick');
    return onclick && onclick.includes(`'${tabName}'`) || onclick && onclick.includes(`"${tabName}"`);
  });
  
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // Update mobile nav buttons
  document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));
  const mobileNavItem = document.querySelector(`.mobile-nav-item[data-tab="${tabName}"]`);
  if (mobileNavItem) {
    mobileNavItem.classList.add('active');
  } else {
    // If tab is not in bottom nav, highlight the Menu button
    const menuBtn = document.querySelector('.mobile-nav-item[data-tab="menu"]');
    if (menuBtn && ['program', 'insights', 'achievements', 'learn'].includes(tabName)) {
      menuBtn.classList.add('active');
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

// Mobile Menu Configuration
const mobileMenuItems = [
  { id: 'dashboard', icon: 'fa-home', label: 'Home', color: '#3b82f6' },
  { id: 'workout', icon: 'fa-dumbbell', label: 'Workout', color: '#10b981' },
  { id: 'nutrition', icon: 'fa-apple-alt', label: 'Nutrition', color: '#f59e0b' },
  { id: 'program', icon: 'fa-list', label: 'Programs', color: '#8b5cf6' },
  { id: 'analytics', icon: 'fa-chart-line', label: 'Analytics', color: '#ec4899' },
  { id: 'insights', icon: 'fa-robot', label: 'AI Coach', color: '#06b6d4' },
  { id: 'achievements', icon: 'fa-trophy', label: 'Achievements', color: '#eab308' },
  { id: 'learn', icon: 'fa-graduation-cap', label: 'Learn', color: '#14b8a6' }
];

// Open mobile menu drawer
function openMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const drawer = document.getElementById('mobileMenuDrawer');
  const grid = document.getElementById('mobileMenuGrid');
  
  // Get current active tab
  const activeTab = document.querySelector('.tab.active')?.textContent?.trim()?.toLowerCase() || 'dashboard';
  
  // Populate menu grid
  grid.innerHTML = mobileMenuItems.map(item => `
    <button class="mobile-menu-item ${state.currentTab === item.id ? 'active' : ''}" 
            onclick="closeMobileMenu(); switchTab('${item.id}')">
      <div class="mobile-menu-icon" style="color: ${item.color};">
        <i class="fas ${item.icon}"></i>
      </div>
      <span class="mobile-menu-label">${item.label}</span>
    </button>
  `).join('');
  
  // Show menu with animation
  overlay.classList.add('active');
  setTimeout(() => drawer.classList.add('active'), 10);
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

// Close mobile menu drawer
function closeMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const drawer = document.getElementById('mobileMenuDrawer');
  
  drawer.classList.remove('active');
  setTimeout(() => {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }, 300);
}

// Legacy function for backwards compatibility
function showMobileMoreMenu() {
  openMobileMenu();
}



// View workout details
async function viewWorkout(workoutId) {
  try {
    const data = await api(`/workouts/${workoutId}`);
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
    modalBody.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h3 style="margin-bottom: 8px;">${workout.program_day_name || 'Workout'}</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; color: var(--gray);">
          <span><i class="fas fa-calendar"></i> ${new Date(workout.start_time).toLocaleDateString()}</span>
          <span><i class="fas fa-clock"></i> ${formatDuration(workout.total_duration_seconds)}</span>
          <span><i class="fas fa-check-circle" style="color: var(--secondary);"></i> Completed</span>
        </div>
      </div>

      <!-- Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: 24px;">
        <div style="padding: 16px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">${formatWeight(totalVolume)}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Total Volume</div>
        </div>
        <div style="padding: 16px; background: linear-gradient(135deg, var(--secondary) 0%, #047857 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">${totalSets}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Total Sets</div>
        </div>
        <div style="padding: 16px; background: linear-gradient(135deg, var(--warning) 0%, #d97706 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">${totalReps}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Total Reps</div>
        </div>
        <div style="padding: 16px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">${exercisesWithSets}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Exercises</div>
        </div>
        <div style="padding: 16px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border-radius: 12px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">${workout.perceived_exertion ? `${workout.perceived_exertion}/10` : '-'}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Effort ${workout.perceived_exertion ? getExertionEmoji(workout.perceived_exertion) : ''}</div>
        </div>
      </div>

      ${workout.notes ? `
        <div style="padding: 16px; background: var(--light); border-radius: 12px; margin-bottom: 24px; border-left: 4px solid var(--primary);">
          <strong style="display: block; margin-bottom: 8px; color: var(--primary);">
            <i class="fas fa-sticky-note"></i> Workout Notes
          </strong>
          <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${workout.notes}</p>
        </div>
      ` : ''}

      <!-- Exercise Details -->
      <div style="margin-top: 24px;">
        <h4 style="margin-bottom: 16px; color: var(--text-primary);">
          <i class="fas fa-dumbbell"></i> Exercises Performed
        </h4>
        ${workout.exercises && workout.exercises.length > 0 ? workout.exercises.map((ex, idx) => {
          const exerciseVolume = ex.sets?.reduce((sum, set) => sum + (set.weight_kg * set.reps), 0) || 0;
          const exerciseSets = ex.sets?.length || 0;
          const exerciseReps = ex.sets?.reduce((sum, set) => sum + set.reps, 0) || 0;
          
          return `
            <div style="margin-bottom: 20px; padding: 20px; background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; flex-wrap: wrap; gap: 12px;">
                <div>
                  <strong style="font-size: 16px; color: var(--text-primary);">
                    ${idx + 1}. ${ex.name}
                  </strong>
                  <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                    <span style="margin-right: 12px;"><i class="fas fa-bullseye"></i> ${ex.muscle_group}</span>
                    ${ex.equipment ? `<span><i class="fas fa-tools"></i> ${ex.equipment}</span>` : ''}
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 12px; color: var(--text-secondary);">Volume</div>
                  <div style="font-size: 18px; font-weight: bold; color: var(--primary);">
                    ${formatWeight(exerciseVolume)}
                  </div>
                </div>
              </div>

              ${ex.sets && ex.sets.length > 0 ? `
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
                      ${ex.sets.map((set, setIdx) => `
                        <tr style="border-bottom: 1px solid var(--border);">
                          <td style="padding: 10px; text-align: center; font-weight: 600;">${setIdx + 1}</td>
                          <td style="padding: 10px; text-align: center;">${formatWeight(set.weight_kg)}</td>
                          <td style="padding: 10px; text-align: center;">${set.reps}</td>
                          <td style="padding: 10px; text-align: center; color: var(--primary); font-weight: 600;">
                            ${set.one_rep_max_kg ? formatWeight(set.one_rep_max_kg) : '-'}
                          </td>
                        </tr>
                      `).join('')}
                      <tr style="background: var(--light); font-weight: 600;">
                        <td style="padding: 10px; text-align: center;">Total</td>
                        <td style="padding: 10px; text-align: center;">-</td>
                        <td style="padding: 10px; text-align: center;">${exerciseReps}</td>
                        <td style="padding: 10px; text-align: center;">${exerciseSets} sets</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ` : '<p style="color: var(--gray); font-style: italic; margin-top: 8px;">No sets recorded</p>'}

              ${ex.notes ? `
                <div style="margin-top: 12px; padding: 12px; background: var(--bg-primary); border-radius: 8px; border-left: 3px solid var(--primary);">
                  <strong style="font-size: 12px; color: var(--primary); display: block; margin-bottom: 4px;">
                    <i class="fas fa-comment"></i> Exercise Notes:
                  </strong>
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary);">${ex.notes}</p>
                </div>
              ` : ''}
            </div>
          `;
        }).join('') : '<p style="color: var(--gray); font-style: italic;">No exercises recorded</p>'}
      </div>

      <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border); display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-outline" onclick="closeModal()">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
    `;
    
    document.getElementById('modalTitle').textContent = 'Workout Details';
    openModal(true); // Pass true for wide modal
  } catch (error) {
    showNotification('Error loading workout: ' + error.message, 'error');
  }
}

// Generate program modal
// Activate program
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
    
    // First check if this is a cardio day by fetching program details
    const programData = await api(`/programs/${programId}`);
    const programDay = programData.program.days.find(d => d.id === programDayId);
    
    // If it's a cardio day, show cardio workout interface instead
    if (programDay && programDay.is_cardio_day) {
      hideLoadingOverlay();
      closeModal();
      showCardioWorkoutInterface(programDay, programId);
      return;
    }

    hideLoadingOverlay();
    closeModal();

    // Phase 4: Show the AI pre-workout briefing BEFORE creating the workout
    // so the user can preview readiness and suggested weights. If they
    // dismiss the briefing, we still proceed (the briefing is informational).
    if (window.aiCoach && typeof window.aiCoach.showPreview === 'function') {
      try {
        await window.aiCoach.showPreview(programDayId);
      } catch (err) {
        console.warn('AI briefing failed, continuing:', err);
      }
    }

    showLoadingOverlay('Starting your workout...');

    // Create the workout for strength training days
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
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-secondary);
    z-index: 10000;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  `;
  
  // Prevent background scrolling
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = `-${window.scrollY}px`;
  
  // Start timer
  const startTime = Date.now();
  
  modal.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; text-align: center;">
        <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-heartbeat" style="font-size: 32px;"></i>
        </div>
        <h1 style="margin: 0 0 8px 0; font-size: 24px; color: white;">${programDay.name}</h1>
        <p style="margin: 0; opacity: 0.9;">${programDay.focus}</p>
        <div id="cardio-timer" style="font-size: 32px; font-weight: bold; margin-top: 16px; font-family: monospace;">00:00:00</div>
      </div>
      
      <!-- Planned Sessions -->
      ${cardioSessions.length > 0 ? `
        <div class="card" style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 16px 0;"><i class="fas fa-list-check" style="color: #ef4444;"></i> Planned Sessions</h3>
          <div style="display: grid; gap: 12px;">
            ${cardioSessions.map((session, idx) => `
              <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>${session.name}</strong>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                      ${session.duration_minutes} min • Zone ${session.target_hr_zone || 'N/A'}
                    </div>
                  </div>
                  <span style="background: ${session.target_hr_zone <= 2 ? '#22c55e' : session.target_hr_zone <= 3 ? '#f59e0b' : '#ef4444'}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px;">
                    ${session.intensity || 'Moderate'}
                  </span>
                </div>
                ${session.notes ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: var(--text-secondary);">${session.notes}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
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
        <button class="btn btn-primary" onclick="saveCardioWorkout(${programId}, ${programDay.id})" style="flex: 2; min-width: 200px; background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);">
          <i class="fas fa-check"></i> Complete Cardio Session
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Start timer update
  window.cardioTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('cardio-timer').textContent = 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Record cardio session
async function recordCardioSession(exerciseId) {
  const durationInput = document.getElementById(`cardio-duration-${exerciseId}`);
  const intensitySelect = document.getElementById(`cardio-intensity-${exerciseId}`);
  const distanceInput = document.getElementById(`cardio-distance-${exerciseId}`);
  const hrInput = document.getElementById(`cardio-hr-${exerciseId}`);
  
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
    await api(`/workouts/${state.currentWorkout.id}/exercises/${exerciseId}/sets`, {
      method: 'POST',
      body: JSON.stringify({
        duration_seconds: durationSeconds,
        calories_burned: caloriesBurned,
        distance_meters: distanceMeters,
        avg_heart_rate: avgHeartRate
      })
    });
    
    showNotification(`Cardio logged! ~${caloriesBurned} calories burned`, 'success');
    
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
      const data = await api(`/workouts/${state.currentWorkout.id}`);
      state.currentWorkout = data.workout;
      renderWorkoutExerciseTabs();
    } catch (error) {
      console.error('Error refreshing workout UI:', error);
    }
  }
}

// Record set (legacy function - kept for any remaining references)
async function recordSet(exerciseId) {
  let weight = parseFloat(document.getElementById(`weight-${exerciseId}`).value);
  const reps = parseInt(document.getElementById(`reps-${exerciseId}`).value);

  if (!weight || !reps) {
    showNotification('Please enter weight and reps', 'warning');
    return;
  }

  // Convert to kg if user is using imperial
  if (isImperialSystem()) {
    weight = lbsToKg(weight);
  }

  try {
    await api(`/workouts/${state.currentWorkout.id}/exercises/${exerciseId}/sets`, {
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
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const url = `/api/exports/${type}${queryString}`;
  
  showNotification(`Preparing ${type} export...`, 'info');
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
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
        || `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
      downloadBlob(blob, filename);
      showNotification(`${type} data exported successfully!`, 'success');
    } else {
      // Handle JSON
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.json`;
      downloadBlob(blob, filename);
      showNotification(`${type} data exported successfully!`, 'success');
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
  document.getElementById('modalBody').innerHTML = `
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
          <input type="date" id="exportStartDate" class="form-control" value="${thirtyDaysAgo.toISOString().split('T')[0]}" style="padding: 12px;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 13px;">End Date</label>
          <input type="date" id="exportEndDate" class="form-control" value="${new Date().toISOString().split('T')[0]}" style="padding: 12px;">
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
  `;
  
  modal.classList.add('active');
}

// Switch between export tabs
function switchExportTab(tab) {
  document.querySelectorAll('.export-tab').forEach(t => {
    t.style.color = 'var(--text-secondary)';
    t.style.borderBottomColor = 'transparent';
    t.classList.remove('active');
  });
  const activeTab = document.querySelector(`.export-tab[data-tab="${tab}"]`);
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
  previewContent.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-secondary);">Generating preview...</p>
    </div>
  `;
  
  try {
    const reportData = await fetchReportData();
    previewContent.innerHTML = generateReportHTML(reportData);
    
    // Render charts in preview
    setTimeout(() => renderPreviewCharts(reportData), 100);
  } catch (error) {
    previewContent.innerHTML = `<p style="color: var(--danger);">Error generating preview: ${error.message}</p>`;
  }
}

// Fetch all data needed for the report
async function fetchReportData() {
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;
  const reportType = document.querySelector('input[name="reportType"]:checked').value;
  
  const [progressData, advancedData, workoutsData, nutritionData, prsData] = await Promise.all([
    api(`/analytics/progress?days=90`),
    api('/analytics/advanced'),
    api(`/workouts?limit=100`),
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
  const dateRangeText = `${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}`;
  
  return `
    <div id="pdfReportContent" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: white; color: #111;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #7c3aed;">
        <h1 style="margin: 0; color: #7c3aed; font-size: 28px;">AI Fitness Coach</h1>
        <h2 style="margin: 8px 0 0 0; color: #666; font-weight: normal; font-size: 18px;">
          ${data.reportType === 'progress' ? 'Progress Report' : 
            data.reportType === 'workout' ? 'Workout Summary' :
            data.reportType === 'analytics' ? 'Analytics Report' : 'Comprehensive Fitness Report'}
        </h2>
        <p style="margin: 8px 0 0 0; color: #999; font-size: 14px;">${dateRangeText}</p>
        <p style="margin: 4px 0 0 0; color: #999; font-size: 12px;">Generated for ${data.user?.name || 'User'} on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <!-- Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px;">
        <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 12px;">
          <div style="font-size: 28px; font-weight: bold; color: #2563eb;">${data.workouts.length}</div>
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">Workouts</div>
        </div>
        <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 12px;">
          <div style="font-size: 28px; font-weight: bold; color: #059669;">${formatWeight(data.progress?.overview?.total_volume_kg || 0)}</div>
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">Total Volume</div>
        </div>
        <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 12px;">
          <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">${Math.round((data.progress?.overview?.total_time_seconds || 0) / 60)}m</div>
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">Total Time</div>
        </div>
        <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 12px;">
          <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${data.prs.length}</div>
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">PRs Set</div>
        </div>
      </div>
      
      ${data.options.chartVolume ? `
      <!-- Volume Chart -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          <span style="color: #2563eb;">📊</span> Volume Trend
        </h3>
        <div style="height: 250px; background: #fafafa; border-radius: 8px; padding: 10px;">
          <canvas id="previewVolumeChart"></canvas>
        </div>
      </div>
      ` : ''}
      
      ${data.options.chartMuscle ? `
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
      ` : ''}
      
      ${data.options.sectionRecovery && data.advanced ? `
      <!-- Recovery & Balance -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          <span style="color: #7c3aed;">⚡</span> Recovery & Balance
        </h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="text-align: center; padding: 20px; background: ${data.advanced.recovery?.score >= 70 ? '#d1fae5' : data.advanced.recovery?.score >= 40 ? '#fef3c7' : '#fee2e2'}; border-radius: 12px;">
            <div style="font-size: 32px; font-weight: bold;">${data.advanced.recovery?.score || 0}</div>
            <div style="font-size: 13px; color: #666;">Recovery Score</div>
          </div>
          <div style="text-align: center; padding: 20px; background: ${data.advanced.consistency?.consistency >= 70 ? '#d1fae5' : '#fef3c7'}; border-radius: 12px;">
            <div style="font-size: 32px; font-weight: bold;">${data.advanced.consistency?.consistency || 0}%</div>
            <div style="font-size: 13px; color: #666;">Consistency</div>
          </div>
          <div style="text-align: center; padding: 20px; background: ${data.advanced.muscle_balance?.balance >= 70 ? '#d1fae5' : '#fef3c7'}; border-radius: 12px;">
            <div style="font-size: 32px; font-weight: bold;">${data.advanced.muscle_balance?.balance || 0}%</div>
            <div style="font-size: 13px; color: #666;">Muscle Balance</div>
          </div>
        </div>
      </div>
      ` : ''}
      
      ${data.options.sectionPRs && data.prs.length > 0 ? `
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
            ${data.prs.slice(0, 10).map(pr => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${pr.exercise_name}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #2563eb;">${formatWeight(pr.record_value)}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">${pr.record_type}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb; color: #666;">${new Date(pr.achieved_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${data.options.sectionPredictions && data.advanced?.strength_predictions?.length > 0 ? `
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
            ${data.advanced.strength_predictions.slice(0, 8).map(pred => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${pred.exercise_name}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatWeight(pred.current_max)}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #7c3aed;">${formatWeight(pred.predicted_max_4_weeks)}</td>
                <td style="text-align: center; padding: 12px; border-bottom: 1px solid #e5e7eb;">${pred.trend === 'increasing' ? '📈' : pred.trend === 'decreasing' ? '📉' : '➡️'}</td>
                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">${pred.confidence}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px;">
        <p>Generated by AI Fitness Coach • ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;
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
    const filename = `fitness_report_${reportData.startDate}_to_${reportData.endDate}.pdf`;
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
    
    const historyHTML = `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;"><i class="fas fa-calendar-alt"></i> Workout Calendar</h2>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-outline" onclick="changeCalendarMonth(-1)" style="padding: 8px 12px;">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span id="calendarMonthLabel" style="min-width: 140px; text-align: center; font-weight: 600; font-size: 16px;">
              ${new Date(state.calendarYear, state.calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button class="btn btn-outline" onclick="changeCalendarMonth(1)" style="padding: 8px 12px;">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        <div id="workoutCalendar">
          ${renderWorkoutCalendar()}
        </div>
        <div id="calendarWorkoutDetail" style="margin-top: 20px;"></div>
      </div>
    `;
    
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
  
  let html = `
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;">
      ${dayNames.map(d => `<div style="padding: 8px; font-weight: 600; color: var(--text-secondary); font-size: 12px;">${d}</div>`).join('')}
  `;
  
  // Empty cells for start padding
  for (let i = 0; i < startPadding; i++) {
    html += `<div style="padding: 8px;"></div>`;
  }
  
  // Day cells
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasWorkout = workoutsByDate[dateKey] && workoutsByDate[dateKey].length > 0;
    const isToday = dateKey === todayKey;
    const isFuture = new Date(dateKey) > today;
    const workoutCount = hasWorkout ? workoutsByDate[dateKey].length : 0;
    
    // Click action: show workouts if has workout, or allow logging past workout if not future
    const clickAction = hasWorkout ? `showCalendarWorkouts('${dateKey}')` : (!isFuture ? `showLogPastWorkout('${dateKey}')` : '');
    
    html += `
      <div 
        onclick="${clickAction}"
        title="${hasWorkout ? 'View workouts' : (!isFuture ? 'Click to log a workout' : '')}"
        style="
          padding: 8px;
          min-height: 50px;
          border-radius: 8px;
          cursor: ${clickAction ? 'pointer' : 'default'};
          background: ${isToday ? 'var(--primary-light)' : 'var(--bg-secondary)'};
          border: ${isToday ? '2px solid var(--primary)' : '1px solid var(--border)'};
          position: relative;
          transition: transform 0.1s;
          ${hasWorkout ? 'box-shadow: 0 2px 4px rgba(0,0,0,0.1);' : ''}
          ${isFuture ? 'opacity: 0.5;' : ''}
        "
        ${clickAction ? 'onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'"' : ''}
      >
        <div style="font-size: 14px; ${isToday ? 'font-weight: bold; color: var(--primary);' : ''}">${day}</div>
        ${hasWorkout ? `
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
          ">${workoutCount > 1 ? workoutCount : '<i class="fas fa-dumbbell" style="font-size: 10px;"></i>'}</div>
        ` : (!isFuture ? `
          <div style="
            width: 24px; 
            height: 24px; 
            margin: 4px auto 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--gray);
            font-size: 10px;
            opacity: 0;
            transition: opacity 0.2s;
          " class="add-workout-hint"><i class="fas fa-plus"></i></div>
        ` : '')}
      </div>
    `;
  }
  
  html += '</div>';
  
  // Legend
  html += `
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
  `;
  
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
  
  const detailHTML = `
    <div style="border-top: 1px solid var(--border); padding-top: 20px;">
      <h3 style="margin-bottom: 16px;"><i class="fas fa-calendar-day"></i> ${dateDisplay}</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${workouts.map(w => `
          <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; border-left: 4px solid ${w.completed ? 'var(--secondary)' : 'var(--warning)'};">
            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px;">
              <div>
                <strong style="font-size: 16px;">${w.day_name || 'Custom Workout'}</strong>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
                  <span><i class="fas fa-clock"></i> ${formatDuration(w.total_duration_seconds)}</span>
                  <span><i class="fas fa-weight-hanging"></i> ${w.total_weight_kg ? formatWeight(w.total_weight_kg) : 'N/A'}</span>
                  <span><i class="fas fa-layer-group"></i> ${w.total_sets || 0} sets</span>
                  ${w.perceived_exertion ? `<span><i class="fas fa-fire"></i> ${w.perceived_exertion}/10 ${getExertionEmoji(w.perceived_exertion)}</span>` : ''}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" onclick="viewWorkout(${w.id})" style="padding: 8px 16px; font-size: 13px;">
                  <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn btn-danger" onclick="deleteAnalyticsWorkout(${w.id})" style="padding: 8px 12px; font-size: 13px;">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  document.getElementById('calendarWorkoutDetail').innerHTML = detailHTML;
}

// AI Insights & Recommendations

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
    
    container.innerHTML = `
      <!-- Advanced Analytics Header -->
      <div class="card" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; border: none;">
        <h2 style="margin: 0; color: white;"><i class="fas fa-brain"></i> Advanced Analytics</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">ML-powered predictions and insights based on ${data.summary?.total_workouts_analyzed || 0} workouts</p>
      </div>
      
      <!-- Key Metrics Row -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
        <!-- Recovery Score -->
        <div class="card" style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: ${recoveryColor}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <span style="font-size: 28px; font-weight: bold; color: ${recoveryColor};">${data.recovery?.score || 0}</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">Recovery Score</div>
          <div style="font-size: 13px; color: var(--text-secondary); text-transform: capitalize;">${(data.recovery?.status || 'unknown').replace('_', ' ')}</div>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">${data.recovery?.recommendation || ''}</p>
        </div>
        
        <!-- Consistency Score -->
        <div class="card" style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: ${consistencyColor}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <span style="font-size: 28px; font-weight: bold; color: ${consistencyColor};">${data.consistency?.consistency || 0}%</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">Consistency</div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            <i class="fas fa-fire" style="color: var(--warning);"></i> ${data.consistency?.currentStreak || 0} workout streak
          </div>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">Best day: ${data.consistency?.bestDay || 'N/A'}</p>
        </div>
        
        <!-- Muscle Balance -->
        <div class="card" style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: ${data.muscle_balance?.balance >= 70 ? 'var(--secondary)' : 'var(--warning)'}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <span style="font-size: 28px; font-weight: bold; color: ${data.muscle_balance?.balance >= 70 ? 'var(--secondary)' : 'var(--warning)'};">${data.muscle_balance?.balance || 0}%</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">Muscle Balance</div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            ${data.muscle_balance?.imbalances?.length || 0} imbalances detected
          </div>
        </div>
        
        <!-- Volume Trend -->
        <div class="card" style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--primary)20; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            ${trendIcons[data.volume_predictions?.trend] || trendIcons['stable']}
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">Volume Trend</div>
          <div style="font-size: 13px; color: var(--text-secondary); text-transform: capitalize;">${data.volume_predictions?.trend || 'stable'}</div>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">${data.volume_predictions?.confidence || 0}% confidence</p>
        </div>
      </div>
      
      <!-- AI Insights -->
      ${data.ai_insights?.insights?.length > 0 ? `
        <div class="card">
          <h3><i class="fas fa-lightbulb" style="color: var(--warning);"></i> AI-Powered Insights</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">${data.ai_insights?.overall_assessment || ''}</p>
          <div style="display: grid; gap: 12px;">
            ${data.ai_insights.insights.map(insight => `
              <div style="padding: 16px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid ${insight.priority === 'high' ? 'var(--danger)' : insight.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                  <strong>${insight.title}</strong>
                  <span style="font-size: 11px; padding: 2px 8px; background: ${insight.priority === 'high' ? 'var(--danger)' : insight.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'}; color: white; border-radius: 12px; text-transform: uppercase;">${insight.priority}</span>
                </div>
                <p style="font-size: 14px; color: var(--text-secondary); margin: 0 0 8px 0;">${insight.insight}</p>
                <p style="font-size: 13px; color: var(--primary); margin: 0;"><i class="fas fa-check-circle"></i> ${insight.action}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Strength Predictions -->
      ${data.strength_predictions?.length > 0 ? `
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
                ${data.strength_predictions.slice(0, 8).map(pred => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border);">
                      <strong>${pred.exercise_name}</strong>
                      <div style="font-size: 11px; color: var(--text-secondary);">${pred.data_points} data points</div>
                    </td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid var(--border);">${formatWeight(pred.current_max)}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid var(--border); font-weight: bold; color: var(--primary);">${formatWeight(pred.predicted_max_4_weeks)}</td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid var(--border);">
                      ${pred.trend === 'increasing' ? '<i class="fas fa-arrow-up" style="color: var(--secondary);"></i>' : pred.trend === 'decreasing' ? '<i class="fas fa-arrow-down" style="color: var(--danger);"></i>' : '<i class="fas fa-minus" style="color: var(--warning);"></i>'}
                    </td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid var(--border);">
                      <span style="padding: 2px 8px; background: ${pred.confidence >= 70 ? 'var(--secondary)' : pred.confidence >= 40 ? 'var(--warning)' : 'var(--gray)'}; color: white; border-radius: 12px; font-size: 11px;">${pred.confidence}%</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
      
      <!-- Volume Predictions -->
      ${data.volume_predictions?.predictions?.length > 0 ? `
        <div class="card">
          <h3><i class="fas fa-weight" style="color: var(--secondary);"></i> Volume Forecast</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">${data.volume_predictions?.recommendation || ''}</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            ${data.volume_predictions.predictions.map((pred, idx) => `
              <div style="flex: 1; min-width: 100px; text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">${pred.week}</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--primary);">${formatWeight(pred.predicted_volume)}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px;">Current Weekly Volume</span>
            <strong>${formatWeight(data.volume_predictions?.current_weekly_volume || 0)}</strong>
          </div>
        </div>
      ` : ''}
      
      <!-- Muscle Balance Details -->
      ${data.muscle_balance?.imbalances?.length > 0 ? `
        <div class="card">
          <h3><i class="fas fa-balance-scale" style="color: var(--warning);"></i> Muscle Imbalances</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">Areas that need attention based on your training volume distribution</p>
          <div style="display: grid; gap: 8px;">
            ${data.muscle_balance.imbalances.map(imb => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${imb.status === 'undertrained' ? 'var(--warning)' : 'var(--danger)'}15; border-radius: 8px; border-left: 4px solid ${imb.status === 'undertrained' ? 'var(--warning)' : 'var(--danger)'};">
                <div>
                  <strong>${imb.muscle}</strong>
                  <span style="font-size: 12px; color: var(--text-secondary); margin-left: 8px; text-transform: capitalize;">${imb.status}</span>
                </div>
                <span style="font-size: 13px; color: ${imb.deviation < 0 ? 'var(--danger)' : 'var(--warning)'};">${imb.deviation > 0 ? '+' : ''}${imb.deviation}%</span>
              </div>
            `).join('')}
          </div>
          ${data.muscle_balance.recommendations?.length > 0 ? `
            <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
              <strong style="font-size: 13px;"><i class="fas fa-lightbulb"></i> Recommendations:</strong>
              <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: var(--text-secondary);">
                ${data.muscle_balance.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <!-- Training Pattern -->
      ${data.consistency?.dayDistribution ? `
        <div class="card">
          <h3><i class="fas fa-calendar-alt" style="color: var(--primary);"></i> Training Pattern</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">Your workout distribution by day of the week</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${Object.entries(data.consistency.dayDistribution).map(([day, count]) => {
              const maxCount = Math.max(...Object.values(data.consistency.dayDistribution));
              const intensity = maxCount > 0 ? count / maxCount : 0;
              return `
                <div style="flex: 1; min-width: 60px; text-align: center; padding: 12px 8px; background: rgba(79, 70, 229, ${0.1 + intensity * 0.5}); border-radius: 8px;">
                  <div style="font-size: 11px; color: var(--text-secondary);">${day.substring(0, 3)}</div>
                  <div style="font-size: 18px; font-weight: bold; color: var(--primary);">${count}</div>
                </div>
              `;
            }).join('')}
          </div>
          <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
            <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
              <div style="font-size: 12px; color: var(--text-secondary);">Average Gap</div>
              <div style="font-size: 18px; font-weight: bold;">${data.consistency?.averageGap || 0} days</div>
            </div>
            <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
              <div style="font-size: 12px; color: var(--text-secondary);">Longest Streak</div>
              <div style="font-size: 18px; font-weight: bold;">${data.consistency?.longestStreak || 0} workouts</div>
            </div>
            <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
              <div style="font-size: 12px; color: var(--text-secondary);">Training Age</div>
              <div style="font-size: 18px; font-weight: bold;">${data.summary?.training_age_days || 0} days</div>
            </div>
          </div>
        </div>
      ` : ''}
    `;
    
  } catch (error) {
    console.error('Error loading advanced analytics:', error);
    container.innerHTML = `
      <div class="card">
        <p style="color: var(--danger);">Error loading advanced analytics: ${error.message}</p>
        <button class="btn btn-outline" onclick="loadAdvancedAnalytics()">
          <i class="fas fa-sync"></i> Retry
        </button>
      </div>
    `;
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
    await api(`/ai/recommendations/${recId}/apply`, { method: 'POST' });
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
    await api(`/ai/recommendations/${recId}/dismiss`, { method: 'POST' });
    showNotification('Recommendation dismissed', 'success');
    loadInsights();
  } catch (error) {
    showNotification('Error dismissing recommendation: ' + error.message, 'error');
  }
}

// View recommendation details in modal
async function viewRecommendationDetails(recId) {
  try {
    const data = await api(`/ai/recommendations/${recId}`);
    const rec = data.recommendation;
    
    showModal(`
      <h2>${rec.title}</h2>
      <div style="margin: 20px 0;">
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <span style="background: ${rec.priority === 'high' ? 'var(--danger)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'}; color: white; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${rec.priority.toUpperCase()} PRIORITY
          </span>
          <span style="background: var(--light); color: var(--dark); padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${rec.category}
          </span>
        </div>
        <p style="line-height: 1.8; margin-bottom: 16px;">${rec.description}</p>
        ${rec.reasoning ? `
          <div style="background: var(--light); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 8px;"><i class="fas fa-brain"></i> AI Analysis:</strong>
            <p style="margin: 0; line-height: 1.6;">${rec.reasoning}</p>
          </div>
        ` : ''}
        ${rec.action_items && rec.action_items.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 8px;"><i class="fas fa-tasks"></i> Action Items:</strong>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
              ${rec.action_items.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${rec.expected_outcome ? `
          <div style="background: var(--secondary-light); padding: 16px; border-radius: 8px;">
            <strong style="display: block; margin-bottom: 8px; color: var(--secondary);"><i class="fas fa-target"></i> Expected Outcome:</strong>
            <p style="margin: 0; line-height: 1.6;">${rec.expected_outcome}</p>
          </div>
        ` : ''}
      </div>
      <div style="display: flex; gap: 12px;">
        ${rec.auto_apply ? `
          <button class="btn btn-primary" onclick="closeModal(); applyRecommendation(${recId});" style="flex: 1;">
            <i class="fas fa-magic"></i> Apply Now
          </button>
        ` : ''}
        <button class="btn btn-outline" onclick="closeModal();" style="flex: 1;">
          Close
        </button>
      </div>
    `);
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
    showNotification(`Auto-apply ${enabled ? 'enabled' : 'disabled'}`, 'success');
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
    showNotification(`Weekly analysis ${enabled ? 'enabled' : 'disabled'}`, 'success');
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
    showNotification(`Real-time suggestions ${enabled ? 'enabled' : 'disabled'}`, 'success');
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
  messagesContainer.innerHTML += `
    <div style="display: flex; gap: 12px; margin-bottom: 12px; justify-content: flex-end;">
      <div style="background: var(--primary); color: white; padding: 12px 16px; border-radius: 12px; border-top-right-radius: 4px; max-width: 85%;">
        <p style="margin: 0; line-height: 1.6;">${escapeHtml(message)}</p>
      </div>
      <div style="width: 36px; height: 36px; background: var(--secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fas fa-user" style="color: white;"></i>
      </div>
    </div>
  `;
  
  // Add loading indicator
  const loadingId = 'ai-loading-' + Date.now();
  messagesContainer.innerHTML += `
    <div id="${loadingId}" style="display: flex; gap: 12px; margin-bottom: 12px;">
      <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fas fa-robot" style="color: white;"></i>
      </div>
      <div style="background: var(--bg-primary); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px;">
        <i class="fas fa-circle-notch fa-spin"></i> Thinking...
      </div>
    </div>
  `;
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
      messagesContainer.innerHTML += `
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas fa-robot" style="color: white;"></i>
          </div>
          <div style="background: var(--bg-primary); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px; max-width: 85%;">
            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(response.response)}</p>
          </div>
        </div>
      `;
    } else {
      messagesContainer.innerHTML += `
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <div style="width: 36px; height: 36px; background: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas fa-exclamation" style="color: white;"></i>
          </div>
          <div style="background: var(--danger-light); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px;">
            <p style="margin: 0; color: var(--danger);">Sorry, I couldn't process that request. Please try again.</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    document.getElementById(loadingId)?.remove();
    messagesContainer.innerHTML += `
      <div style="display: flex; gap: 12px; margin-bottom: 12px;">
        <div style="width: 36px; height: 36px; background: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fas fa-exclamation" style="color: white;"></i>
        </div>
        <div style="background: var(--danger-light); padding: 12px 16px; border-radius: 12px; border-top-left-radius: 4px;">
          <p style="margin: 0; color: var(--danger);">Error: ${error.message}</p>
        </div>
      </div>
    `;
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
  
  resultsContainer.innerHTML = `
    <div class="card" style="text-align: center; padding: 40px;">
      <i class="fas fa-brain fa-spin" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
      <h3>Generating Personalized Analysis...</h3>
      <p style="color: var(--text-secondary);">Your AI Coach is analyzing your training patterns, progression, and recovery</p>
    </div>
  `;
  
  try {
    const response = await api('/ai/coach/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'comprehensive' })
    });
    
    if (!response.success) {
      resultsContainer.innerHTML = `
        <div class="card" style="border-left: 4px solid var(--warning);">
          <h3><i class="fas fa-info-circle"></i> ${response.message || 'Unable to generate analysis'}</h3>
          <p style="color: var(--text-secondary);">Complete more workouts to receive detailed AI coaching.</p>
        </div>
      `;
      return;
    }
    
    const analysis = response.analysis;
    
    if (!analysis) {
      resultsContainer.innerHTML = `
        <div class="card">
          <h3><i class="fas fa-robot"></i> AI Response</h3>
          <p style="white-space: pre-wrap; line-height: 1.8;">${response.raw_response || 'No analysis available'}</p>
        </div>
      `;
      return;
    }
    
    resultsContainer.innerHTML = `
      <!-- Overall Assessment -->
      <div class="card" style="border-left: 4px solid var(--primary);">
        <h3><i class="fas fa-clipboard-check"></i> Overall Assessment</h3>
        <p style="font-size: 16px; line-height: 1.8; margin-top: 12px;">${analysis.overall_assessment || 'Analysis complete.'}</p>
      </div>
      
      <!-- Strengths & Areas for Improvement -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
        ${analysis.strengths && analysis.strengths.length > 0 ? `
          <div class="card" style="border-left: 4px solid var(--secondary);">
            <h3 style="color: var(--secondary);"><i class="fas fa-thumbs-up"></i> Strengths</h3>
            <ul style="margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
              ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${analysis.areas_for_improvement && analysis.areas_for_improvement.length > 0 ? `
          <div class="card" style="border-left: 4px solid var(--warning);">
            <h3 style="color: var(--warning);"><i class="fas fa-arrow-up"></i> Areas to Improve</h3>
            <ul style="margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
              ${analysis.areas_for_improvement.map(a => `<li>${a}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
      
      <!-- Recommendations -->
      ${analysis.recommendations && analysis.recommendations.length > 0 ? `
        <div class="card">
          <h3><i class="fas fa-lightbulb"></i> Personalized Recommendations</h3>
          <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px;">
            ${analysis.recommendations.map(rec => `
              <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; border-left: 4px solid ${
                rec.priority === 'high' ? 'var(--danger)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'
              };">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <strong style="font-size: 16px;">${rec.title}</strong>
                  <div style="display: flex; gap: 8px;">
                    <span style="background: var(--primary-light); color: var(--primary); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                      ${rec.category || 'general'}
                    </span>
                    <span style="background: ${rec.priority === 'high' ? 'var(--danger)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'}; 
                                 color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                      ${rec.priority || 'medium'}
                    </span>
                  </div>
                </div>
                <p style="margin: 0 0 12px 0; line-height: 1.7;">${rec.description}</p>
                ${rec.action_steps && rec.action_steps.length > 0 ? `
                  <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <strong style="font-size: 13px; display: block; margin-bottom: 8px;"><i class="fas fa-tasks"></i> Action Steps:</strong>
                    <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
                      ${rec.action_steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                  </div>
                ` : ''}
                ${rec.expected_outcome ? `
                  <p style="margin: 0; font-size: 13px; color: var(--secondary);"><i class="fas fa-bullseye"></i> <strong>Expected:</strong> ${rec.expected_outcome}</p>
                ` : ''}
                ${rec.timeframe ? `
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary);"><i class="fas fa-clock"></i> ${rec.timeframe}</p>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Quick Tips -->
      ${analysis.next_workout_tips && analysis.next_workout_tips.length > 0 ? `
        <div class="card" style="background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%); border: none;">
          <h3><i class="fas fa-bolt"></i> Tips for Your Next Workout</h3>
          <ul style="margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
            ${analysis.next_workout_tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${analysis.weekly_focus ? `
        <div class="card" style="text-align: center; padding: 24px; background: var(--primary); color: white; border: none;">
          <h3 style="color: white; margin-bottom: 8px;"><i class="fas fa-crosshairs"></i> This Week's Focus</h3>
          <p style="margin: 0; font-size: 18px; opacity: 0.95;">${analysis.weekly_focus}</p>
        </div>
      ` : ''}
    `;
    
  } catch (error) {
    console.error('Error generating AI coaching:', error);
    resultsContainer.innerHTML = `
      <div class="card" style="border-left: 4px solid var(--danger);">
        <h3 style="color: var(--danger);"><i class="fas fa-exclamation-circle"></i> Error</h3>
        <p>Failed to generate AI analysis: ${error.message}</p>
        <button class="btn btn-primary" onclick="generateAICoaching()" style="margin-top: 12px;">
          <i class="fas fa-sync"></i> Try Again
        </button>
      </div>
    `;
  }
}

// Get exercise-specific coaching tips
async function getExerciseCoaching(exerciseId, exerciseName) {
  showModal(`
    <div style="text-align: center; padding: 40px;">
      <i class="fas fa-dumbbell fa-spin" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
      <h3>Analyzing ${exerciseName}...</h3>
      <p style="color: var(--text-secondary);">Getting personalized coaching tips</p>
    </div>
  `);
  
  try {
    const response = await api(`/ai/coach/exercise/${exerciseId}`);
    
    if (!response.success) {
      showModal(`
        <h2><i class="fas fa-dumbbell"></i> ${exerciseName}</h2>
        <div style="margin-top: 20px;">
          <p style="color: var(--text-secondary);">${response.message || 'Need more workout data for this exercise to provide coaching tips.'}</p>
        </div>
        <button class="btn btn-outline" onclick="closeModal()" style="margin-top: 20px;">Close</button>
      `);
      return;
    }
    
    const coaching = response.coaching;
    
    showModal(`
      <h2><i class="fas fa-dumbbell"></i> ${response.exercise?.name || exerciseName}</h2>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">${response.exercise?.muscle_group || ''}</p>
      
      ${coaching ? `
        <!-- Progress Assessment -->
        ${coaching.progress_assessment ? `
          <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong><i class="fas fa-chart-line"></i> Progress Assessment</strong>
            <p style="margin: 8px 0 0 0; line-height: 1.6;">${coaching.progress_assessment}</p>
          </div>
        ` : ''}
        
        <!-- Next Session Recommendation -->
        ${coaching.next_session_recommendation ? `
          <div style="background: var(--primary-light); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="color: var(--primary);"><i class="fas fa-bullseye"></i> Next Session Target</strong>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; text-align: center;">
              <div>
                <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${formatWeight(coaching.next_session_recommendation.weight_kg)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Weight</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${coaching.next_session_recommendation.sets || 3}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Sets</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${coaching.next_session_recommendation.reps || '8-10'}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Reps</div>
              </div>
            </div>
            ${coaching.next_session_recommendation.notes ? `
              <p style="margin: 12px 0 0 0; font-size: 13px; color: var(--text-secondary);"><i class="fas fa-info-circle"></i> ${coaching.next_session_recommendation.notes}</p>
            ` : ''}
          </div>
        ` : ''}
        
        <!-- Technique Tips -->
        ${coaching.technique_tips && coaching.technique_tips.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <strong><i class="fas fa-clipboard-list"></i> Technique Tips</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
              ${coaching.technique_tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <!-- Common Mistakes -->
        ${coaching.common_mistakes_to_avoid && coaching.common_mistakes_to_avoid.length > 0 ? `
          <div style="background: var(--danger-light); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Mistakes to Avoid</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
              ${coaching.common_mistakes_to_avoid.map(m => `<li>${m}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <!-- Progression Plan -->
        ${coaching.progression_plan ? `
          <div style="margin-bottom: 16px;">
            <strong><i class="fas fa-calendar-alt"></i> 4-Week Progression Plan</strong>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px;">
              ${Object.entries(coaching.progression_plan).map(([week, target]) => `
                <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px; text-align: center;">
                  <div style="font-size: 12px; color: var(--text-secondary); text-transform: capitalize;">${week.replace('_', ' ')}</div>
                  <div style="font-weight: 600; margin-top: 4px;">${target}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      ` : `
        <p style="white-space: pre-wrap; line-height: 1.8;">${response.raw_response || 'No coaching data available'}</p>
      `}
      
      <button class="btn btn-primary" onclick="closeModal()" style="width: 100%; margin-top: 16px;">
        Got It
      </button>
    `);
    
  } catch (error) {
    showModal(`
      <h2><i class="fas fa-exclamation-circle" style="color: var(--danger);"></i> Error</h2>
      <p style="margin: 20px 0;">Failed to get coaching tips: ${error.message}</p>
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    `);
  }
}

// Helper function to escape HTML in chat messages
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// Load saved meals list for the preview section
async function loadSavedMealsList() {
  const container = document.getElementById('saved-meals-list');
  if (!container) return;
  
  try {
    const data = await api('/nutrition/saved-meals');
    const meals = data.saved_meals || [];
    
    if (meals.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 16px; color: var(--gray);">
          <i class="fas fa-heart" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
          <p style="margin: 0;">No saved meals yet</p>
          <p style="font-size: 12px; margin-top: 4px;">Save your favorite meals for quick logging</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = meals.slice(0, 5).map(meal => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--light); border-radius: 8px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px;">${meal.name}</div>
          <div style="font-size: 12px; color: var(--gray);">
            ${Math.round(meal.calories || 0)} cal • ${Math.round(meal.protein_g || 0)}g P • ${Math.round(meal.carbs_g || 0)}g C • ${Math.round(meal.fat_g || 0)}g F
          </div>
        </div>
        <button class="btn btn-primary" onclick="logSavedMeal(${meal.id})" style="padding: 8px 12px; font-size: 12px;">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `).join('') + (meals.length > 5 ? `
      <button class="btn btn-outline" onclick="showSavedMeals()" style="width: 100%; margin-top: 8px;">
        View All (${meals.length})
      </button>
    ` : '');
  } catch (error) {
    container.innerHTML = `<div style="color: var(--danger); padding: 12px;">Error loading saved meals</div>`;
  }
}

// Quick add protein helper
function addQuickProtein(amount) {
  const input = document.getElementById('proteinInput');
  const current = parseFloat(input.value) || 0;
  input.value = current + amount;
}

// Log all quick entries at once
async function logAllQuick() {
  const protein = parseFloat(document.getElementById('proteinInput')?.value) || 0;
  const water = parseFloat(document.getElementById('waterInput')?.value) || 0;
  const creatine = parseFloat(document.getElementById('creatineInput')?.value) || 0;
  
  if (!protein && !water && !creatine) {
    showNotification('Enter at least one value to log', 'warning');
    return;
  }
  
  try {
    const promises = [];
    if (protein > 0) {
      promises.push(api('/nutrition/entries', {
        method: 'POST',
        body: JSON.stringify({ entry_type: 'protein', amount: protein, unit: 'g' })
      }));
    }
    if (water > 0) {
      promises.push(api('/nutrition/entries', {
        method: 'POST',
        body: JSON.stringify({ entry_type: 'water', amount: water, unit: 'ml' })
      }));
    }
    if (creatine > 0) {
      promises.push(api('/nutrition/entries', {
        method: 'POST',
        body: JSON.stringify({ entry_type: 'creatine', amount: creatine, unit: 'g' })
      }));
    }
    
    await Promise.all(promises);
    
    document.getElementById('proteinInput').value = '';
    document.getElementById('waterInput').value = '';
    document.getElementById('creatineInput').value = '';
    
    showNotification('Logged successfully!', 'success');
    loadNutrition();
  } catch (error) {
    showNotification('Error logging: ' + error.message, 'error');
  }
}

// Show saved meals modal
async function showSavedMeals() {
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  openModal('Saved Meals');
  
  try {
    const data = await api('/nutrition/saved-meals');
    const meals = data.saved_meals || [];
    
    modalBody.innerHTML = `
      <div style="margin-bottom: 16px;">
        <button class="btn btn-primary" onclick="showCreateSavedMeal()" style="width: 100%;">
          <i class="fas fa-plus"></i> Create New Saved Meal
        </button>
      </div>
      
      ${meals.length === 0 ? `
        <div style="text-align: center; padding: 40px; color: var(--gray);">
          <i class="fas fa-heart" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
          <p>No saved meals yet</p>
          <p style="font-size: 14px;">Create saved meals for quick logging</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${meals.map(meal => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--light); border-radius: 12px;">
              <div style="flex: 1;">
                <div style="font-weight: 600;">${meal.name}</div>
                <div style="font-size: 13px; color: var(--gray); margin-top: 4px;">
                  ${Math.round(meal.calories || 0)} cal • ${Math.round(meal.protein_g || 0)}g P • ${Math.round(meal.carbs_g || 0)}g C • ${Math.round(meal.fat_g || 0)}g F
                </div>
                ${meal.recipe_url ? `<a href="${meal.recipe_url}" target="_blank" style="font-size: 12px; color: var(--primary);"><i class="fas fa-external-link-alt"></i> Recipe</a>` : ''}
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" onclick="logSavedMeal(${meal.id})" style="padding: 10px 16px;">
                  <i class="fas fa-plus"></i> Log
                </button>
                <button class="btn btn-outline" onclick="editSavedMeal(${meal.id})" style="padding: 10px;">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline" onclick="deleteSavedMeal(${meal.id})" style="padding: 10px; color: var(--danger);">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  } catch (error) {
    modalBody.innerHTML = `<div style="color: var(--danger); padding: 20px;">Error: ${error.message}</div>`;
  }
}

// Create new saved meal modal
function showCreateSavedMeal() {
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="form-group">
        <label>Meal Name *</label>
        <input type="text" id="savedMealName" placeholder="e.g., Chicken and Rice" required>
      </div>
      
      <div class="form-group">
        <label>Meal Type</label>
        <select id="savedMealType">
          <option value="any">Any</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Recipe URL (optional)</label>
        <div style="display: flex; gap: 8px;">
          <input type="url" id="savedMealRecipeUrl" placeholder="https://..." style="flex: 1;">
          <button class="btn btn-outline" onclick="parseRecipeUrl()" style="white-space: nowrap;">
            <i class="fas fa-magic"></i> Parse
          </button>
        </div>
        <div style="font-size: 12px; color: var(--gray); margin-top: 4px;">
          Enter a recipe URL to auto-fill nutrition info
        </div>
      </div>
      
      <div id="recipe-parse-result"></div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <div class="form-group">
          <label>Calories</label>
          <input type="number" id="savedMealCalories" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label>Protein (g)</label>
          <input type="number" id="savedMealProtein" placeholder="0" min="0" step="0.1">
        </div>
        <div class="form-group">
          <label>Carbs (g)</label>
          <input type="number" id="savedMealCarbs" placeholder="0" min="0" step="0.1">
        </div>
        <div class="form-group">
          <label>Fat (g)</label>
          <input type="number" id="savedMealFat" placeholder="0" min="0" step="0.1">
        </div>
      </div>
      
      <div class="form-group">
        <label>Description (optional)</label>
        <textarea id="savedMealDescription" placeholder="Notes about this meal..." rows="2"></textarea>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button class="btn btn-outline" onclick="showSavedMeals()" style="flex: 1;">
          Cancel
        </button>
        <button class="btn btn-primary" onclick="createSavedMeal()" style="flex: 1;">
          <i class="fas fa-save"></i> Save Meal
        </button>
      </div>
    </div>
  `;
  
  openModal('Create Saved Meal');
}

// Parse recipe URL for nutrition info
async function parseRecipeUrl() {
  const url = document.getElementById('savedMealRecipeUrl').value;
  if (!url) {
    showNotification('Please enter a recipe URL', 'warning');
    return;
  }
  
  const resultContainer = document.getElementById('recipe-parse-result');
  resultContainer.innerHTML = '<div style="padding: 12px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Parsing recipe...</div>';
  
  try {
    const data = await api('/nutrition/parse-recipe', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
    
    if (data.recipe) {
      const r = data.recipe;
      
      // Auto-fill the form
      if (r.name && !document.getElementById('savedMealName').value) {
        document.getElementById('savedMealName').value = r.name;
      }
      if (r.calories) document.getElementById('savedMealCalories').value = Math.round(r.calories);
      if (r.protein_g) document.getElementById('savedMealProtein').value = r.protein_g.toFixed(1);
      if (r.carbs_g) document.getElementById('savedMealCarbs').value = r.carbs_g.toFixed(1);
      if (r.fat_g) document.getElementById('savedMealFat').value = r.fat_g.toFixed(1);
      
      resultContainer.innerHTML = `
        <div style="padding: 12px; background: var(--success-light, #d4edda); border-radius: 8px; color: var(--success, #155724);">
          <i class="fas fa-check-circle"></i> ${r.parsed ? 'Recipe parsed successfully!' : 'Could not auto-parse. Please enter nutrition manually.'}
          ${r.servings ? `<br><small>Servings: ${r.servings}</small>` : ''}
        </div>
      `;
    } else {
      resultContainer.innerHTML = `
        <div style="padding: 12px; background: var(--warning-light, #fff3cd); border-radius: 8px; color: var(--warning, #856404);">
          <i class="fas fa-exclamation-triangle"></i> Could not parse recipe. Please enter nutrition manually.
        </div>
      `;
    }
  } catch (error) {
    resultContainer.innerHTML = `
      <div style="padding: 12px; background: var(--danger-light, #f8d7da); border-radius: 8px; color: var(--danger);">
        <i class="fas fa-times-circle"></i> Error: ${error.message}
      </div>
    `;
  }
}

// Create saved meal
async function createSavedMeal() {
  const name = document.getElementById('savedMealName').value.trim();
  if (!name) {
    showNotification('Please enter a meal name', 'warning');
    return;
  }
  
  const meal = {
    name,
    meal_type: document.getElementById('savedMealType').value,
    recipe_url: document.getElementById('savedMealRecipeUrl').value || null,
    calories: parseFloat(document.getElementById('savedMealCalories').value) || 0,
    protein_g: parseFloat(document.getElementById('savedMealProtein').value) || 0,
    carbs_g: parseFloat(document.getElementById('savedMealCarbs').value) || 0,
    fat_g: parseFloat(document.getElementById('savedMealFat').value) || 0,
    description: document.getElementById('savedMealDescription').value || null
  };
  
  try {
    await api('/nutrition/saved-meals', {
      method: 'POST',
      body: JSON.stringify(meal)
    });
    
    showNotification('Meal saved!', 'success');
    showSavedMeals();
    loadSavedMealsList();
  } catch (error) {
    showNotification('Error saving meal: ' + error.message, 'error');
  }
}

// Log a saved meal
async function logSavedMeal(mealId) {
  try {
    const result = await api(`/nutrition/saved-meals/${mealId}/log`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    showNotification(`Logged ${result.logged?.meal_name || 'meal'}!`, 'success');
    closeModal();
    loadNutrition();
  } catch (error) {
    showNotification('Error logging meal: ' + error.message, 'error');
  }
}

// Delete saved meal
async function deleteSavedMeal(mealId) {
  if (!confirm('Delete this saved meal?')) return;
  
  try {
    await api(`/nutrition/saved-meals/${mealId}`, { method: 'DELETE' });
    showNotification('Meal deleted', 'success');
    showSavedMeals();
    loadSavedMealsList();
  } catch (error) {
    showNotification('Error deleting meal: ' + error.message, 'error');
  }
}

// Edit saved meal
async function editSavedMeal(mealId) {
  try {
    const data = await api('/nutrition/saved-meals');
    const meal = (data.saved_meals || []).find(m => m.id === mealId);
    
    if (!meal) {
      showNotification('Meal not found', 'error');
      return;
    }
    
    showCreateSavedMeal();
    
    // Populate form
    setTimeout(() => {
      document.getElementById('savedMealName').value = meal.name || '';
      document.getElementById('savedMealType').value = meal.meal_type || 'any';
      document.getElementById('savedMealRecipeUrl').value = meal.recipe_url || '';
      document.getElementById('savedMealCalories').value = meal.calories || '';
      document.getElementById('savedMealProtein').value = meal.protein_g || '';
      document.getElementById('savedMealCarbs').value = meal.carbs_g || '';
      document.getElementById('savedMealFat').value = meal.fat_g || '';
      document.getElementById('savedMealDescription').value = meal.description || '';
      
      // Update modal title and save button
      document.getElementById('modalTitle').textContent = 'Edit Saved Meal';
      
      // Replace save button with update
      const saveBtn = document.querySelector('#modalBody button.btn-primary');
      if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Meal';
        saveBtn.onclick = () => updateSavedMeal(mealId);
      }
    }, 50);
  } catch (error) {
    showNotification('Error loading meal: ' + error.message, 'error');
  }
}

// Update saved meal
async function updateSavedMeal(mealId) {
  const meal = {
    name: document.getElementById('savedMealName').value.trim(),
    meal_type: document.getElementById('savedMealType').value,
    recipe_url: document.getElementById('savedMealRecipeUrl').value || null,
    calories: parseFloat(document.getElementById('savedMealCalories').value) || 0,
    protein_g: parseFloat(document.getElementById('savedMealProtein').value) || 0,
    carbs_g: parseFloat(document.getElementById('savedMealCarbs').value) || 0,
    fat_g: parseFloat(document.getElementById('savedMealFat').value) || 0,
    description: document.getElementById('savedMealDescription').value || null
  };
  
  try {
    await api(`/nutrition/saved-meals/${mealId}`, {
      method: 'PUT',
      body: JSON.stringify(meal)
    });
    
    showNotification('Meal updated!', 'success');
    showSavedMeals();
    loadSavedMealsList();
  } catch (error) {
    showNotification('Error updating meal: ' + error.message, 'error');
  }
}

// Quick macro entry modal
function showQuickMacroEntry() {
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <p style="color: var(--gray); margin: 0;">Quickly log a meal by entering macros directly</p>
      
      <div class="form-group">
        <label>Meal Name (optional)</label>
        <input type="text" id="quickMacroName" placeholder="e.g., Lunch">
      </div>
      
      <div class="form-group">
        <label>Meal Type</label>
        <select id="quickMacroType">
          <option value="snack">Snack</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
        </select>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <div class="form-group">
          <label>Calories</label>
          <input type="number" id="quickMacroCalories" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label>Protein (g)</label>
          <input type="number" id="quickMacroProtein" placeholder="0" min="0" step="0.1">
        </div>
        <div class="form-group">
          <label>Carbs (g)</label>
          <input type="number" id="quickMacroCarbs" placeholder="0" min="0" step="0.1">
        </div>
        <div class="form-group">
          <label>Fat (g)</label>
          <input type="number" id="quickMacroFat" placeholder="0" min="0" step="0.1">
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn btn-outline" onclick="applyMacroPreset(300, 30, 20, 10)" style="flex: 1;">
          Light<br><small>300cal</small>
        </button>
        <button class="btn btn-outline" onclick="applyMacroPreset(500, 40, 40, 20)" style="flex: 1;">
          Medium<br><small>500cal</small>
        </button>
        <button class="btn btn-outline" onclick="applyMacroPreset(800, 50, 70, 30)" style="flex: 1;">
          Large<br><small>800cal</small>
        </button>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 8px;">
        <button class="btn btn-outline" onclick="closeModal()" style="flex: 1;">Cancel</button>
        <button class="btn btn-primary" onclick="logQuickMacros()" style="flex: 1;">
          <i class="fas fa-plus"></i> Log Meal
        </button>
      </div>
      
      <div style="border-top: 1px solid var(--border); padding-top: 16px; margin-top: 8px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="quickMacroSave">
          <span>Save as favorite meal for quick access</span>
        </label>
      </div>
    </div>
  `;
  
  openModal('Quick Macro Entry');
}

// Apply macro preset
function applyMacroPreset(calories, protein, carbs, fat) {
  document.getElementById('quickMacroCalories').value = calories;
  document.getElementById('quickMacroProtein').value = protein;
  document.getElementById('quickMacroCarbs').value = carbs;
  document.getElementById('quickMacroFat').value = fat;
}

// Log quick macros
async function logQuickMacros() {
  const protein = parseFloat(document.getElementById('quickMacroProtein').value) || 0;
  const calories = parseFloat(document.getElementById('quickMacroCalories').value) || 0;
  const carbs = parseFloat(document.getElementById('quickMacroCarbs').value) || 0;
  const fat = parseFloat(document.getElementById('quickMacroFat').value) || 0;
  const mealType = document.getElementById('quickMacroType').value;
  const mealName = document.getElementById('quickMacroName').value || `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`;
  const saveAsFavorite = document.getElementById('quickMacroSave').checked;
  
  if (!protein && !calories && !carbs && !fat) {
    showNotification('Please enter at least one macro', 'warning');
    return;
  }
  
  try {
    // Log the meal
    await api('/nutrition/meals', {
      method: 'POST',
      body: JSON.stringify({
        meal_type: mealType,
        name: mealName,
        foods: [{
          custom_name: mealName,
          calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat
        }]
      })
    });
    
    // Optionally save as favorite
    if (saveAsFavorite && mealName) {
      await api('/nutrition/saved-meals', {
        method: 'POST',
        body: JSON.stringify({
          name: mealName,
          meal_type: mealType,
          calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat
        })
      });
    }
    
    showNotification('Meal logged!', 'success');
    closeModal();
    loadNutrition();
  } catch (error) {
    showNotification('Error logging meal: ' + error.message, 'error');
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
    const data = await api(`/nutrition/entries?start_date=${today}&end_date=${today}`);
    const entries = data.entries || [];
    
    if (entries.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--gray);">
          <i class="fas fa-inbox"></i>
          <p style="margin-top: 8px;">No entries logged today. Start tracking above!</p>
        </div>
      `;
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
      
      return `
        <div style="margin-bottom: 20px;">
          <h4 style="color: ${color}; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="${icon}"></i> ${entries[0].entry_type.charAt(0).toUpperCase() + entries[0].entry_type.slice(1)} 
            <span style="font-size: 14px; font-weight: normal; color: var(--gray);">(${entries.length} ${entries.length === 1 ? 'entry' : 'entries'})</span>
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
                ${entries.map(entry => `
                  <tr>
                    <td>${formatTime(entry.logged_at)}</td>
                    <td><strong>${entry.amount}${entry.unit}</strong></td>
                    <td>
                      <button class="btn btn-outline" onclick="editNutritionEntry(${entry.id}, '${entry.entry_type}', ${entry.amount})" 
                              style="padding: 4px 8px; font-size: 12px; margin-right: 4px;">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-outline" onclick="deleteNutritionEntry(${entry.id})" 
                              style="padding: 4px 8px; font-size: 12px; color: var(--danger);">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    };
    
    container.innerHTML = `
      ${renderEntries(grouped.protein, 'fas fa-drumstick-bite', 'var(--secondary)')}
      ${renderEntries(grouped.water, 'fas fa-tint', 'var(--primary)')}
      ${renderEntries(grouped.creatine, 'fas fa-flask', '#8b5cf6')}
    `;
    
  } catch (error) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--danger);">
        <i class="fas fa-exclamation-triangle"></i>
        <p style="margin-top: 8px;">Error loading entries: ${error.message}</p>
      </div>
    `;
  }
}

// Edit nutrition entry
function editNutritionEntry(id, type, currentAmount) {
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div class="form-group">
      <label>Type:</label>
      <input type="text" value="${type.charAt(0).toUpperCase() + type.slice(1)}" disabled style="background: var(--light);">
    </div>
    <div class="form-group">
      <label>Amount:</label>
      <input type="number" id="editEntryAmount" value="${currentAmount}" step="0.5" min="0.1">
    </div>
    <button class="btn btn-primary" onclick="saveNutritionEntryEdit(${id})">
      <i class="fas fa-save"></i> Save Changes
    </button>
  `;
  
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
    await api(`/nutrition/entries/${id}`, {
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
    await api(`/nutrition/entries/${id}`, {
      method: 'DELETE'
    });
    
    showNotification('Entry deleted!', 'success');
    loadNutritionEntries();
    loadNutrition();
  } catch (error) {
    showNotification('Error deleting entry: ' + error.message, 'error');
  }
}

// ========== MEAL TRACKING & FOOD DATABASE ==========

// State for meal tracking - only initialize if not already set
if (!state.mealTracking) {
  state.mealTracking = {
    searchResults: [],
    selectedFoods: [],
    currentMealType: 'snack',
    scannerActive: false,
    tempFood: null,
    scannedFood: null,
    scannerStream: null
  };
}

// Show meal logging modal
function showLogMealModal(mealType = 'snack', preserveFoods = false) {
  state.mealTracking.currentMealType = mealType;
  if (!preserveFoods) {
    state.mealTracking.selectedFoods = [];
  }
  
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <div style="margin-bottom: 16px;">
      <label style="font-weight: 600; margin-bottom: 8px; display: block;">Meal Type:</label>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${['breakfast', 'lunch', 'dinner', 'snack'].map(type => `
          <button class="btn ${type === mealType ? 'btn-primary' : 'btn-outline'}" 
                  onclick="selectMealType('${type}')" id="meal-type-${type}">
            ${type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <label style="font-weight: 600; margin-bottom: 8px; display: block;">Search Foods:</label>
      <div style="display: flex; gap: 8px;">
        <input type="text" id="foodSearchInput" placeholder="Search foods..." 
               style="flex: 1;" oninput="debounceSearchFoods(this.value)">
        <button class="btn btn-secondary" onclick="showBarcodeScanner()" title="Scan Barcode">
          <i class="fas fa-barcode"></i>
        </button>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="btn btn-outline" onclick="searchFoodsUSDA()" style="font-size: 12px;">
          <i class="fas fa-database"></i> Search USDA
        </button>
        <button class="btn btn-outline" onclick="loadFavoriteFoods()" style="font-size: 12px;">
          <i class="fas fa-star"></i> Favorites
        </button>
      </div>
    </div>
    
    <div id="foodSearchResults" style="max-height: 200px; overflow-y: auto; margin-bottom: 16px; display: none;">
    </div>
    
    <div id="selectedFoodsList" style="margin-bottom: 16px;">
      <label style="font-weight: 600; margin-bottom: 8px; display: block;">Selected Foods:</label>
      <div id="selectedFoodsContainer" style="color: var(--gray); font-style: italic;">
        No foods selected yet
      </div>
    </div>
    
    <div id="mealTotals" style="background: var(--light); padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none;">
      <div style="font-weight: 600; margin-bottom: 8px;">Meal Totals:</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
        <div><div style="font-size: 18px; font-weight: bold;" id="totalCalories">0</div><div style="font-size: 11px; color: var(--gray);">Calories</div></div>
        <div><div style="font-size: 18px; font-weight: bold; color: var(--secondary);" id="totalProtein">0g</div><div style="font-size: 11px; color: var(--gray);">Protein</div></div>
        <div><div style="font-size: 18px; font-weight: bold; color: var(--primary);" id="totalCarbs">0g</div><div style="font-size: 11px; color: var(--gray);">Carbs</div></div>
        <div><div style="font-size: 18px; font-weight: bold; color: #f59e0b;" id="totalFat">0g</div><div style="font-size: 11px; color: var(--gray);">Fat</div></div>
      </div>
    </div>
    
    <button class="btn btn-primary" onclick="saveMeal()" style="width: 100%;" id="saveMealBtn" disabled>
      <i class="fas fa-check"></i> Log Meal
    </button>
  `;
  
  openModal('Log Meal');
}

function selectMealType(type) {
  state.mealTracking.currentMealType = type;
  ['breakfast', 'lunch', 'dinner', 'snack'].forEach(t => {
    const btn = document.getElementById(`meal-type-${t}`);
    if (btn) {
      btn.className = t === type ? 'btn btn-primary' : 'btn btn-outline';
    }
  });
}

// Debounced food search
let foodSearchTimeout;
function debounceSearchFoods(query) {
  clearTimeout(foodSearchTimeout);
  if (query.length < 2) {
    document.getElementById('foodSearchResults').style.display = 'none';
    return;
  }
  foodSearchTimeout = setTimeout(() => searchFoods(query), 300);
}

// Search foods in local database
async function searchFoods(query) {
  const container = document.getElementById('foodSearchResults');
  container.style.display = 'block';
  container.innerHTML = '<div style="text-align: center; padding: 12px;"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
  
  try {
    const data = await api(`/nutrition/foods/search?q=${encodeURIComponent(query)}`);
    renderFoodSearchResults(data.foods || [], 'local');
  } catch (error) {
    container.innerHTML = `<div style="color: var(--danger); padding: 12px;">Error: ${error.message}</div>`;
  }
}

// Search USDA database
async function searchFoodsUSDA() {
  const query = document.getElementById('foodSearchInput')?.value;
  if (!query || query.length < 2) {
    showNotification('Enter at least 2 characters to search', 'warning');
    return;
  }
  
  const container = document.getElementById('foodSearchResults');
  container.style.display = 'block';
  container.innerHTML = '<div style="text-align: center; padding: 12px;"><i class="fas fa-spinner fa-spin"></i> Searching USDA database...</div>';
  
  try {
    const data = await api(`/nutrition/foods/search/usda?q=${encodeURIComponent(query)}`);
    renderFoodSearchResults(data.foods || [], 'usda');
  } catch (error) {
    container.innerHTML = `<div style="color: var(--danger); padding: 12px;">Error: ${error.message}</div>`;
  }
}

// Load favorite foods
async function loadFavoriteFoods() {
  const container = document.getElementById('foodSearchResults');
  container.style.display = 'block';
  container.innerHTML = '<div style="text-align: center; padding: 12px;"><i class="fas fa-spinner fa-spin"></i> Loading favorites...</div>';
  
  try {
    const data = await api('/nutrition/foods/favorites');
    if (data.foods.length === 0) {
      container.innerHTML = '<div style="padding: 12px; color: var(--gray); text-align: center;">No favorites yet. Add foods to build your favorites!</div>';
    } else {
      renderFoodSearchResults(data.foods, 'favorites');
    }
  } catch (error) {
    container.innerHTML = `<div style="color: var(--danger); padding: 12px;">Error: ${error.message}</div>`;
  }
}

// Render food search results
function renderFoodSearchResults(foods, source) {
  const container = document.getElementById('foodSearchResults');
  
  if (foods.length === 0) {
    container.innerHTML = `
      <div style="padding: 12px; text-align: center; color: var(--gray);">
        No foods found. ${source === 'local' ? '<button class="btn btn-outline" onclick="searchFoodsUSDA()" style="margin-top: 8px;">Try USDA Database</button>' : ''}
      </div>
    `;
    return;
  }
  
  container.innerHTML = foods.map(food => `
    <div style="padding: 12px; border-bottom: 1px solid var(--light); cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
         onclick="selectFood(${JSON.stringify(food).replace(/"/g, '&quot;')})">
      <div style="flex: 1;">
        <div style="font-weight: 600;">${food.name}</div>
        <div style="font-size: 12px; color: var(--gray);">
          ${food.brand ? food.brand + ' • ' : ''}${food.serving_description || food.serving_size + food.serving_unit}
        </div>
        <div style="font-size: 12px; margin-top: 4px;">
          <span style="color: var(--primary);">${Math.round(food.calories)} cal</span> • 
          <span style="color: var(--secondary);">${food.protein_g?.toFixed(1) || 0}g P</span> • 
          <span>${food.carbs_g?.toFixed(1) || 0}g C</span> • 
          <span style="color: #f59e0b;">${food.fat_g?.toFixed(1) || 0}g F</span>
        </div>
      </div>
      <i class="fas fa-plus-circle" style="color: var(--primary); font-size: 20px;"></i>
    </div>
  `).join('');
}

// Select a food to add to meal (from search results)
async function selectFood(food) {
  // If food doesn't have an ID (from external API), save it first
  if (!food.id && food.source && food.source_id) {
    try {
      const result = await api('/nutrition/foods', {
        method: 'POST',
        body: JSON.stringify(food)
      });
      food = result.food;
    } catch (error) {
      showNotification('Error saving food: ' + error.message, 'error');
      return;
    }
  }
  
  // Store the food in state FIRST before rendering
  state.mealTracking.tempFood = food;
  
  // Show quantity selector
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div style="margin-bottom: 16px;">
      <button class="btn btn-outline" onclick="showBarcodeScanner()" style="margin-bottom: 16px;">
        <i class="fas fa-arrow-left"></i> Back
      </button>
      
      <h3 style="margin-bottom: 8px;">${food.name}</h3>
      <p style="color: var(--gray); font-size: 14px; margin-bottom: 16px;">
        ${food.brand ? food.brand + ' • ' : ''}${food.serving_description || food.serving_size + food.serving_unit}
      </p>
      
      <div style="background: var(--light); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
          <div><div style="font-weight: bold;">${Math.round(food.calories)}</div><div style="font-size: 11px; color: var(--gray);">Calories</div></div>
          <div><div style="font-weight: bold; color: var(--secondary);">${food.protein_g?.toFixed(1) || 0}g</div><div style="font-size: 11px; color: var(--gray);">Protein</div></div>
          <div><div style="font-weight: bold; color: var(--primary);">${food.carbs_g?.toFixed(1) || 0}g</div><div style="font-size: 11px; color: var(--gray);">Carbs</div></div>
          <div><div style="font-weight: bold; color: #f59e0b;">${food.fat_g?.toFixed(1) || 0}g</div><div style="font-size: 11px; color: var(--gray);">Fat</div></div>
        </div>
        <div style="font-size: 11px; color: var(--gray); text-align: center; margin-top: 8px;">Per serving</div>
      </div>
      
      <div class="form-group">
        <label>Quantity:</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-outline" onclick="adjustFoodQty(-0.5)">-</button>
          <input type="number" id="foodQuantity" value="1" min="0.25" step="0.25" style="width: 80px; text-align: center;">
          <button class="btn btn-outline" onclick="adjustFoodQty(0.5)">+</button>
          <select id="foodUnit" style="flex: 1;">
            <option value="serving">serving(s)</option>
            <option value="g">grams</option>
            <option value="oz">ounces</option>
            <option value="cup">cup(s)</option>
          </select>
        </div>
      </div>
      
      <button class="btn btn-primary" onclick="addFoodToMeal()" style="width: 100%;">
        <i class="fas fa-plus"></i> Add to Meal
      </button>
    </div>
  `;
  
  openModal('Add Food');
}

function adjustFoodQty(delta) {
  const input = document.getElementById('foodQuantity');
  const newVal = Math.max(0.25, parseFloat(input.value) + delta);
  input.value = newVal;
}

// Add food to current meal
function addFoodToMeal() {
  console.log('=== addFoodToMeal START ===');
  console.log('state.mealTracking:', JSON.stringify(state.mealTracking, null, 2));
  
  const quantity = parseFloat(document.getElementById('foodQuantity')?.value) || 1;
  const unit = document.getElementById('foodUnit')?.value || 'serving';
  const food = state.mealTracking.tempFood;
  
  console.log('quantity:', quantity, 'unit:', unit, 'food:', food);
  
  if (!food) {
    console.error('ERROR: tempFood is null/undefined');
    showNotification('Error: Food not found', 'error');
    return;
  }
  
  const foodEntry = {
    food_id: food.id,
    food: food,
    quantity: quantity,
    unit: unit
  };
  console.log('Adding food entry:', foodEntry);
  
  state.mealTracking.selectedFoods.push(foodEntry);
  console.log('selectedFoods after push:', state.mealTracking.selectedFoods.length, 'items');
  
  showNotification(`Added ${food.name}`, 'success');
  
  // Clear temp food
  state.mealTracking.tempFood = null;
  
  const mealType = state.mealTracking.currentMealType;
  console.log('Calling showLogMealModal with mealType:', mealType, 'preserveFoods: true');
  
  // Go back to meal modal and update display (preserve existing foods)
  showLogMealModal(mealType, true);
  
  console.log('After showLogMealModal, selectedFoods:', state.mealTracking.selectedFoods.length, 'items');
  
  updateSelectedFoodsDisplay();
  console.log('=== addFoodToMeal END ===');
}

// Update the selected foods display
function updateSelectedFoodsDisplay() {
  const container = document.getElementById('selectedFoodsContainer');
  const totalsContainer = document.getElementById('mealTotals');
  const saveBtn = document.getElementById('saveMealBtn');
  
  if (state.mealTracking.selectedFoods.length === 0) {
    container.innerHTML = '<div style="color: var(--gray); font-style: italic;">No foods selected yet</div>';
    totalsContainer.style.display = 'none';
    saveBtn.disabled = true;
    return;
  }
  
  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  
  container.innerHTML = state.mealTracking.selectedFoods.map((item, idx) => {
    const multiplier = item.unit === 'serving' ? item.quantity : (item.quantity / item.food.serving_size);
    const cals = (item.food.calories || 0) * multiplier;
    const protein = (item.food.protein_g || 0) * multiplier;
    const carbs = (item.food.carbs_g || 0) * multiplier;
    const fat = (item.food.fat_g || 0) * multiplier;
    
    totals.calories += cals;
    totals.protein += protein;
    totals.carbs += carbs;
    totals.fat += fat;
    
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--light); border-radius: 8px; margin-bottom: 8px;">
        <div>
          <div style="font-weight: 600;">${item.food.name}</div>
          <div style="font-size: 12px; color: var(--gray);">${item.quantity} ${item.unit} • ${Math.round(cals)} cal</div>
        </div>
        <button class="btn btn-outline" onclick="removeFoodFromMeal(${idx})" style="padding: 4px 8px; color: var(--danger);">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }).join('');
  
  // Update totals
  document.getElementById('totalCalories').textContent = Math.round(totals.calories);
  document.getElementById('totalProtein').textContent = totals.protein.toFixed(1) + 'g';
  document.getElementById('totalCarbs').textContent = totals.carbs.toFixed(1) + 'g';
  document.getElementById('totalFat').textContent = totals.fat.toFixed(1) + 'g';
  
  totalsContainer.style.display = 'block';
  saveBtn.disabled = false;
}

// Remove food from meal
function removeFoodFromMeal(index) {
  state.mealTracking.selectedFoods.splice(index, 1);
  updateSelectedFoodsDisplay();
}

// Save the meal
async function saveMeal() {
  if (state.mealTracking.selectedFoods.length === 0) {
    showNotification('Please add at least one food', 'warning');
    return;
  }
  
  try {
    const mealData = {
      date: new Date().toISOString().split('T')[0],
      meal_type: state.mealTracking.currentMealType,
      foods: state.mealTracking.selectedFoods.map(item => ({
        food_id: item.food_id,
        quantity: item.quantity,
        unit: item.unit
      }))
    };
    
    await api('/nutrition/meals', {
      method: 'POST',
      body: JSON.stringify(mealData)
    });
    
    showNotification('Meal logged successfully!', 'success');
    closeModal();
    loadNutrition();
  } catch (error) {
    showNotification('Error logging meal: ' + error.message, 'error');
  }
}

// ========== BARCODE SCANNER ==========

function showBarcodeScanner() {
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div style="text-align: center;">
      <div id="scanner-container" style="position: relative; width: 100%; max-width: 400px; margin: 0 auto;">
        <video id="scanner-video" style="width: 100%; border-radius: 12px; background: #000;"></video>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    width: 200px; height: 100px; border: 3px solid var(--primary); border-radius: 8px;
                    pointer-events: none;"></div>
      </div>
      
      <p style="margin: 16px 0; color: var(--gray);">Position barcode within the frame</p>
      
      <div style="margin-bottom: 16px;">
        <label style="font-weight: 600;">Or enter barcode manually:</label>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <input type="text" id="manualBarcode" placeholder="Enter UPC/EAN code" style="flex: 1;">
          <button class="btn btn-primary" onclick="lookupBarcode()">
            <i class="fas fa-search"></i> Lookup
          </button>
        </div>
      </div>
      
      <div id="barcode-result" style="display: none; margin-top: 16px;"></div>
      
      <button class="btn btn-outline" onclick="stopBarcodeScanner(); showLogMealModal('${state.mealTracking.currentMealType}', true);" style="margin-top: 16px;">
        <i class="fas fa-arrow-left"></i> Back to Meal
      </button>
    </div>
  `;
  
  openModal('Scan Barcode');
  startBarcodeScanner();
}

async function startBarcodeScanner() {
  const video = document.getElementById('scanner-video');
  if (!video) return;
  
  try {
    // Check for camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      document.getElementById('scanner-container').innerHTML = `
        <div style="padding: 40px; background: var(--light); border-radius: 12px;">
          <i class="fas fa-camera-slash" style="font-size: 48px; color: var(--gray); margin-bottom: 16px;"></i>
          <p>Camera not supported on this device.</p>
          <p style="font-size: 14px; color: var(--gray);">Use manual barcode entry below.</p>
        </div>
      `;
      return;
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    video.srcObject = stream;
    video.play();
    state.mealTracking.scannerStream = stream;
    state.mealTracking.scannerActive = true;
    
    // Start barcode detection
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      detectBarcode(video, detector);
    } else {
      console.log('BarcodeDetector not supported, using manual entry only');
    }
    
  } catch (error) {
    console.error('Camera error:', error);
    // Stop scanner on camera error
    state.mealTracking.scannerActive = false;
    const container = document.getElementById('scanner-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; background: var(--light); border-radius: 12px; text-align: center;">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--warning); margin-bottom: 16px;"></i>
          <p>Camera access denied or unavailable.</p>
          <p style="font-size: 14px; color: var(--gray);">Use manual barcode entry below.</p>
        </div>
      `;
    }
  }
}

async function detectBarcode(video, detector) {
  // Check if scanner is still active and video element exists
  if (!state.mealTracking?.scannerActive || !video || !video.srcObject) {
    return;
  }
  
  // Verify video element is still in DOM and valid
  if (!document.body.contains(video)) {
    state.mealTracking.scannerActive = false;
    return;
  }
  
  // Only detect when video is ready and has valid dimensions
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    if (state.mealTracking.scannerActive) {
      setTimeout(() => detectBarcode(video, detector), 100);
    }
    return;
  }
  
  try {
    const barcodes = await detector.detect(video);
    if (barcodes.length > 0) {
      const barcode = barcodes[0].rawValue;
      stopBarcodeScanner();
      const input = document.getElementById('manualBarcode');
      if (input) input.value = barcode;
      await lookupBarcode(barcode);
      return;
    }
  } catch (error) {
    // Stop scanning on any detection error - video likely invalid
    state.mealTracking.scannerActive = false;
    stopBarcodeScanner();
    return;
  }
  
  // Continue scanning only if still active and video is valid
  if (state.mealTracking.scannerActive && video.srcObject && document.body.contains(video)) {
    setTimeout(() => detectBarcode(video, detector), 50);
  }
}

function stopBarcodeScanner() {
  state.mealTracking.scannerActive = false;
  if (state.mealTracking.scannerStream) {
    state.mealTracking.scannerStream.getTracks().forEach(track => track.stop());
    state.mealTracking.scannerStream = null;
  }
}

// Add scanned food directly to meal (simplified flow - no quantity selector)
async function addScannedFood() {
  // Ensure state exists
  if (!state.mealTracking) {
    state.mealTracking = {
      searchResults: [],
      selectedFoods: [],
      currentMealType: 'snack',
      scannerActive: false,
      tempFood: null,
      scannedFood: null,
      scannerStream: null
    };
  }
  
  let food = state.mealTracking.scannedFood;
  if (!food) {
    showNotification('Error: No food scanned', 'error');
    return;
  }
  
  // If food doesn't have an ID, save it first
  if (!food.id && food.source && food.source_id) {
    try {
      const result = await api('/nutrition/foods', {
        method: 'POST',
        body: JSON.stringify(food)
      });
      food = result.food;
    } catch (error) {
      showNotification('Error saving food: ' + error.message, 'error');
      return;
    }
  }
  
  // Add directly to selectedFoods with default quantity (1 serving)
  state.mealTracking.selectedFoods.push({
    food_id: food.id,
    food: food,
    quantity: 1,
    unit: 'serving'
  });
  
  // Clear scanned food and stop scanner
  state.mealTracking.scannedFood = null;
  stopBarcodeScanner();
  
  showNotification(`Added ${food.name}`, 'success');
  
  // Go back to meal modal with foods preserved
  showLogMealModal(state.mealTracking.currentMealType, true);
  updateSelectedFoodsDisplay();
}

async function lookupBarcode(barcode) {
  barcode = barcode || document.getElementById('manualBarcode')?.value;
  if (!barcode) {
    showNotification('Please enter a barcode', 'warning');
    return;
  }
  
  const resultContainer = document.getElementById('barcode-result');
  resultContainer.style.display = 'block';
  resultContainer.innerHTML = '<div style="padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Looking up barcode...</div>';
  
  try {
    const data = await api(`/nutrition/foods/barcode/${encodeURIComponent(barcode)}`);
    
    if (!data.food) {
      resultContainer.innerHTML = `
        <div style="padding: 20px; background: var(--light); border-radius: 8px;">
          <i class="fas fa-question-circle" style="font-size: 32px; color: var(--gray); margin-bottom: 12px;"></i>
          <p>Product not found for barcode: ${barcode}</p>
          <p style="font-size: 14px; color: var(--gray);">Try searching by name instead.</p>
        </div>
      `;
      return;
    }
    
    const food = data.food;
    
    // Store the scanned food in state immediately
    state.mealTracking.scannedFood = food;
    
    resultContainer.innerHTML = `
      <div style="padding: 16px; background: var(--light); border-radius: 8px; text-align: left;">
        <h3 style="margin-bottom: 8px;">${food.name}</h3>
        <p style="color: var(--gray); font-size: 14px; margin-bottom: 12px;">
          ${food.brand ? food.brand + ' • ' : ''}${food.serving_description || food.serving_size + food.serving_unit}
        </p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; margin-bottom: 12px;">
          <div><div style="font-weight: bold;">${Math.round(food.calories)}</div><div style="font-size: 11px; color: var(--gray);">Cal</div></div>
          <div><div style="font-weight: bold; color: var(--secondary);">${food.protein_g?.toFixed(1) || 0}g</div><div style="font-size: 11px; color: var(--gray);">P</div></div>
          <div><div style="font-weight: bold; color: var(--primary);">${food.carbs_g?.toFixed(1) || 0}g</div><div style="font-size: 11px; color: var(--gray);">C</div></div>
          <div><div style="font-weight: bold; color: #f59e0b;">${food.fat_g?.toFixed(1) || 0}g</div><div style="font-size: 11px; color: var(--gray);">F</div></div>
        </div>
        <button class="btn btn-primary" onclick="addScannedFood()" style="width: 100%;">
          <i class="fas fa-plus"></i> Add to Meal
        </button>
      </div>
    `;
    
  } catch (error) {
    resultContainer.innerHTML = `
      <div style="padding: 20px; background: var(--light); border-radius: 8px; color: var(--danger);">
        Error: ${error.message}
      </div>
    `;
  }
}

// Quick add to today's meal from favorites
async function quickAddFood(foodId, mealType = 'snack') {
  try {
    await api('/nutrition/quick-add', {
      method: 'POST',
      body: JSON.stringify({
        food_id: foodId,
        quantity: 1,
        unit: 'serving',
        meal_type: mealType
      })
    });
    
    showNotification('Food added!', 'success');
    loadNutrition();
  } catch (error) {
    showNotification('Error adding food: ' + error.message, 'error');
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
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDateOnly(dateStr) {
  // Parse date without timezone conversion
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

// Show exercise history with charts and progression
async function showExerciseHistory(exerciseId, exerciseName) {
  try {
    const data = await api(`/analytics/exercise-history/${exerciseId}`);
    const weightUnit = getWeightUnit();
    
    // Create history modal
    const modal = document.createElement('div');
    modal.id = 'exercise-history-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 20000;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    `;
    
    const formatHistoryWeight = (kg) => isImperialSystem() ? (kg * 2.20462).toFixed(1) : kg?.toFixed(1) || '0';
    
    // Build chart data points (last 20 workouts)
    const chartData = (data.progression || []).slice(-20);
    const weights = chartData.map(d => d.max_weight || 0);
    const minWeight = Math.min(...weights) * 0.9 || 0;
    const maxWeight = Math.max(...weights) * 1.05 || 1;
    const weightRange = maxWeight - minWeight || 1;
    
    // SVG line chart dimensions
    const chartWidth = 700;
    const chartHeight = 180;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;
    
    // Generate SVG path for line chart
    let linePath = '';
    let dots = '';
    let labels = '';
    
    if (chartData.length > 1) {
      const points = chartData.map((d, i) => {
        const x = padding.left + (i / (chartData.length - 1)) * graphWidth;
        const y = padding.top + graphHeight - ((d.max_weight - minWeight) / weightRange) * graphHeight;
        return { x, y, data: d };
      });
      
      // Create smooth line path
      linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      
      // Create area fill path
      const areaPath = linePath + ` L ${points[points.length-1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`;
      
      // Create dots and labels
      dots = points.map((p, i) => {
        const date = new Date(p.data.workout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--primary)" stroke="white" stroke-width="2"/>
          <title>${date}: ${formatHistoryWeight(p.data.max_weight)} ${weightUnit}</title>
        `;
      }).join('');
      
      // X-axis labels (show first, middle, last)
      const labelIndices = [0, Math.floor(chartData.length / 2), chartData.length - 1];
      labels = labelIndices.map(i => {
        const p = points[i];
        const date = new Date(chartData[i].workout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `<text x="${p.x}" y="${chartHeight - 5}" text-anchor="middle" fill="var(--text-secondary)" font-size="11">${date}</text>`;
      }).join('');
      
      // Y-axis labels
      const yLabels = [minWeight, (minWeight + maxWeight) / 2, maxWeight].map((val, i) => {
        const y = padding.top + graphHeight - (i * graphHeight / 2);
        return `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-secondary)" font-size="11">${formatHistoryWeight(val)}</text>`;
      }).join('');
      
      labels += yLabels;
      
      // Grid lines
      const gridLines = [0, 1, 2].map(i => {
        const y = padding.top + (i * graphHeight / 2);
        return `<line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="var(--border)" stroke-dasharray="4"/>`;
      }).join('');
      
      var svgChart = `
        <svg width="100%" viewBox="0 0 ${chartWidth} ${chartHeight}" style="max-width: 100%;">
          ${gridLines}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:var(--primary);stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:var(--primary);stop-opacity:0.05" />
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#areaGradient)"/>
          <path d="${linePath}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          ${dots}
          ${labels}
        </svg>
      `;
    }
    
    modal.innerHTML = `
      <div style="background: var(--bg-primary); border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); padding: 20px; border-radius: 16px 16px 0 0; color: white; position: sticky; top: 0; z-index: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="margin: 0 0 4px 0; font-size: 20px; color: white;">${exerciseName}</h2>
              <p style="margin: 0; opacity: 0.9; font-size: 13px;">
                <i class="fas fa-bullseye"></i> ${data.exercise?.muscle_group || 'N/A'} • 
                <i class="fas fa-dumbbell"></i> ${data.exercise?.equipment || 'N/A'}
              </p>
            </div>
            <button onclick="document.getElementById('exercise-history-modal').remove()" 
              style="background: rgba(255,255,255,0.2); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 16px;">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <!-- Personal Records -->
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border);">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: var(--text-secondary);">
            <i class="fas fa-trophy" style="color: gold;"></i> Personal Records
          </h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="background: var(--bg-secondary); padding: 12px; border-radius: 10px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: var(--primary);">${formatHistoryWeight(data.personal_records?.max_weight)} ${weightUnit}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">Max Weight</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 12px; border-radius: 10px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: var(--secondary);">${formatHistoryWeight(data.personal_records?.max_1rm)} ${weightUnit}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">Est. 1RM</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 12px; border-radius: 10px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${data.personal_records?.max_reps || 0}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">Max Reps</div>
            </div>
          </div>
        </div>
        
        <!-- Weight Progression Line Chart -->
        ${chartData.length > 1 ? `
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border);">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: var(--text-secondary);">
            <i class="fas fa-chart-line"></i> Weight Progression (${weightUnit})
          </h3>
          <div style="background: var(--bg-secondary); border-radius: 10px; padding: 12px;">
            ${svgChart}
          </div>
        </div>
        ` : '<div style="padding: 16px 20px; text-align: center; color: var(--text-secondary); border-bottom: 1px solid var(--border);">Not enough data for progression chart</div>'}
        
        <!-- History Table (no inner scroll) -->
        <div style="padding: 16px 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: var(--text-secondary);">
            <i class="fas fa-history"></i> Workout History
          </h3>
          ${data.history && data.history.length > 0 ? `
            <div>
              ${data.history.slice(0, 10).map(workout => `
                <div style="background: var(--bg-secondary); border-radius: 10px; margin-bottom: 10px; overflow: hidden;">
                  <div style="background: var(--primary); color: white; padding: 8px 12px; font-weight: 600; font-size: 13px;">
                    <i class="fas fa-calendar"></i> ${new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style="padding: 10px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                      <thead>
                        <tr style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase;">
                          <th style="text-align: left; padding: 4px 6px;">Set</th>
                          <th style="text-align: right; padding: 4px 6px;">Weight</th>
                          <th style="text-align: right; padding: 4px 6px;">Reps</th>
                          <th style="text-align: right; padding: 4px 6px;">Est. 1RM</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${workout.sets.map(set => `
                          <tr style="border-top: 1px solid var(--border);">
                            <td style="padding: 6px; font-weight: 600;">${set.set_number}</td>
                            <td style="padding: 6px; text-align: right;">${formatHistoryWeight(set.weight_kg)} ${weightUnit}</td>
                            <td style="padding: 6px; text-align: right;">${set.reps}</td>
                            <td style="padding: 6px; text-align: right; color: var(--primary);">${formatHistoryWeight(set.one_rep_max_kg)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p style="text-align: center; color: var(--text-secondary);">No history available for this exercise</p>'}
        </div>
      </div>
    `;
    
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

// Edit a set
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
