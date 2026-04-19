/**
 * Entry point for the refactored frontend.
 *
 * Two modes:
 *   1. Vite dev server (`npm run dev:frontend`) — shows a scaffolding status
 *      page so we can verify tooling. The legacy `public/app.js` is NOT
 *      served here because the Vite dev server serves `frontend/index.html`.
 *
 *   2. Production (served from the Worker) — runs alongside the legacy
 *      `public/app.js`. The bridge installs modular screen handlers on top
 *      of legacy globals so individual tabs can be migrated one at a time
 *      without breaking the others.
 */

import '../css/design-system.css';
import '../css/animations.css';
import '../css/layouts.css';
import '../css/components.css';
import '../css/active-workout.css';
// Shell CSS loads LAST so its legacy-compatible classes (container, header,
// tabs, .tab-content, mobile-nav, mobile-menu-*, #modal) take precedence
// over any conflicting utility classes.
import '../css/shell.css';

import { html } from '@core/html';
import { store } from '@core/state';
import { api } from '@core/api';
import { toast } from '@ui/Toast';
import { openModal, confirmDialog } from '@ui/Modal';
import { progressRing } from '@ui/ProgressRing';

import { initBridge, registerScreen } from './bridge.js';
import { loadLearn } from './screens/learn.js';
import { loadAchievements } from './screens/achievements.js';
import { loadDashboard } from './screens/dashboard.js';
import { showProfile } from './screens/profile.js';
import {
  loadPrograms,
  viewProgram,
  activateProgram,
  deleteProgram,
  showGenerateProgram,
  showCreateManualProgram,
  showRenameProgramModal
} from './screens/programs.js';
import { loadAnalytics } from './screens/analytics.js';
import { loadNutrition } from './screens/nutrition.js';
import { loadInsights } from './screens/insights.js';
import { loadWorkout } from './screens/workout.js';
import { showWorkoutPreview } from './features/ai-coach/WorkoutPreview.js';
import { liveCoach } from './features/ai-coach/LiveCoachOverlay.js';
import activeWorkout from './features/active-workout/controller.js';
import { showLogPastWorkout } from './features/past-workout/controller.js';
import { showExerciseHistory } from './features/exercise-history.js';
import { loadWorkoutCalendar, loadWorkoutHistory } from './features/workout-calendar.js';
import { viewWorkout } from './features/view-workout.js';
import {
  startWorkout,
  startWorkoutFromProgram,
  startWorkoutDay
} from './features/start-workout.js';
import { openUnifiedExporter } from './features/analytics/export-center.js';
import {
  loadAdvancedAnalytics,
  generateRecommendations,
  applyRecommendation,
  dismissRecommendation,
  viewRecommendationDetails,
  toggleAutoApply,
  toggleWeeklyAnalysis,
  toggleRealtimeSuggestions
} from './features/analytics/advanced-analytics.js';
import {
  generateAICoaching,
  getExerciseCoaching,
  sendAIChat,
  askQuickQuestion
} from './features/ai-coach/coaching-modals.js';
import {
  showLogMealModal,
  showBarcodeScanner,
  selectMealType,
  quickAddFood
} from './features/nutrition/meal-logger.js';
import {
  loadSavedMealsList,
  showSavedMeals,
  showCreateSavedMeal,
  editSavedMeal,
  logSavedMeal,
  deleteSavedMeal,
  updateSavedMeal,
  parseRecipeUrl,
  createSavedMeal,
  showQuickMacroEntry,
  applyMacroPreset,
  logProtein,
  logWater,
  logCreatine,
  addQuickProtein,
  logAllQuick,
  loadNutritionEntries,
  editNutritionEntry,
  saveNutritionEntryEdit,
  deleteNutritionEntry,
  editNutritionLog,
  saveNutritionEdit,
  deleteNutritionLog,
  exportNutritionCSV,
  exportNutritionReport,
  filterWeeklyTrends,
  sortWeeklyTrends,
  sortWeeklyTrendsByColumn
} from './features/nutrition/saved-meals.js';

// Expose for debugging and for legacy-code bridging
window.__fitnessApp = {
  store,
  api,
  toast,
  openModal,
  confirmDialog
};

// -----------------------------------------------------------------------------
// Phase 4: Real-time AI coaching — expose to legacy workout code via globals.
// The legacy active-workout modal calls these at key moments:
//   - BEFORE starting a workout: await window.aiCoach.showPreview(programDayId)
//   - WHEN workout opens:        window.aiCoach.initLive()
//   - AFTER a set is logged:     window.aiCoach.analyzeSet({currentSets, targetReps, targetSets})
//   - WHEN workout ends:         window.aiCoach.destroyLive()
// -----------------------------------------------------------------------------
window.aiCoach = {
  showPreview: showWorkoutPreview,
  initLive: liveCoach.init,
  destroyLive: liveCoach.destroy,
  analyzeSet: liveCoach.analyzeSet
};

// Active workout modal — replaces legacy show/resume/start functions
window.activeWorkout = activeWorkout;
window.showWorkoutWarmupScreen = activeWorkout.showWarmup;
window.resumeWorkoutModal = activeWorkout.resume;
window.startWorkoutExercises = activeWorkout.startExercises;

// -----------------------------------------------------------------------------
// Register modular screens that replace legacy `load*` functions.
// Each registered screen takes over its tab; unregistered tabs fall back
// to the legacy implementation.
// -----------------------------------------------------------------------------
registerScreen('learn', 'loadLearn', loadLearn);
registerScreen('achievements', 'loadAchievements', loadAchievements);
registerScreen('dashboard', 'loadDashboard', loadDashboard);

// showProfile is a modal opener, not a tab loader — override directly.
// The bridge's initBridge() will pick up the legacy override pattern.
registerScreen('profile', 'showProfile', showProfile);

// Programs suite — one tab loader plus several modal openers.
registerScreen('program', 'loadPrograms', loadPrograms);
registerScreen('programs:view', 'viewProgram', viewProgram);
registerScreen('programs:activate', 'activateProgram', activateProgram);
registerScreen('programs:delete', 'deleteProgram', deleteProgram);
registerScreen('programs:generate', 'showGenerateProgram', showGenerateProgram);
registerScreen('programs:manual', 'showCreateManualProgram', showCreateManualProgram);
registerScreen('programs:rename', 'showRenameProgramModal', showRenameProgramModal);

// Analytics main view (export/PDF/calendar remain in legacy for now)
registerScreen('analytics', 'loadAnalytics', loadAnalytics);

// Nutrition main view (meal logger modal, barcode scanner, saved meals
// editor all remain in legacy for now and are called via window globals)
registerScreen('nutrition', 'loadNutrition', loadNutrition);

// AI Coach main view with chat (full analysis and advanced analytics modals
// remain in legacy for now)
registerScreen('insights', 'loadInsights', loadInsights);

// Workout tab overview (active workout takeover handled by activeWorkout.resume)
registerScreen('workout', 'loadWorkout', loadWorkout);

// Log past workout modal (modal opener, not a tab)
registerScreen('past-workout', 'showLogPastWorkout', showLogPastWorkout);

// Exercise history modal (called from workouts, active workout, analytics)
registerScreen('exercise-history', 'showExerciseHistory', showExerciseHistory);

// Workout calendar (injected into #workoutCalendarContainer by Analytics)
registerScreen('workout-calendar', 'loadWorkoutHistory', loadWorkoutHistory);

// View completed workout modal
registerScreen('view-workout', 'viewWorkout', viewWorkout);

// Start workout flows
registerScreen('start-workout', 'startWorkout', startWorkout);
registerScreen('start-workout-program', 'startWorkoutFromProgram', startWorkoutFromProgram);
registerScreen('start-workout-day', 'startWorkoutDay', startWorkoutDay);

// Export Center (called from Analytics screen)
registerScreen('export-center', 'openUnifiedExporter', openUnifiedExporter);
registerScreen('export-center-alias', 'openReportBuilder', openUnifiedExporter);

// Advanced Analytics (rendered into #advancedAnalyticsSection by Insights)
registerScreen('advanced-analytics', 'loadAdvancedAnalytics', loadAdvancedAnalytics);
registerScreen('ai-recs-generate', 'generateRecommendations', generateRecommendations);
registerScreen('ai-recs-apply', 'applyRecommendation', applyRecommendation);
registerScreen('ai-recs-dismiss', 'dismissRecommendation', dismissRecommendation);
registerScreen('ai-recs-details', 'viewRecommendationDetails', viewRecommendationDetails);
registerScreen('ai-toggle-auto', 'toggleAutoApply', toggleAutoApply);
registerScreen('ai-toggle-weekly', 'toggleWeeklyAnalysis', toggleWeeklyAnalysis);
registerScreen('ai-toggle-realtime', 'toggleRealtimeSuggestions', toggleRealtimeSuggestions);

// AI coaching modals and chat
registerScreen('ai-coaching', 'generateAICoaching', generateAICoaching);
registerScreen('ai-exercise-coaching', 'getExerciseCoaching', getExerciseCoaching);
registerScreen('ai-send-chat', 'sendAIChat', sendAIChat);
registerScreen('ai-quick-q', 'askQuickQuestion', askQuickQuestion);

// Nutrition meal logger + barcode scanner
registerScreen('meal-logger', 'showLogMealModal', showLogMealModal);
registerScreen('barcode-scanner', 'showBarcodeScanner', showBarcodeScanner);
registerScreen('meal-type-select', 'selectMealType', selectMealType);
registerScreen('quick-add-food', 'quickAddFood', quickAddFood);

// Nutrition: saved meals, quick macros, entries, logs
registerScreen('saved-meals-list', 'loadSavedMealsList', loadSavedMealsList);
registerScreen('saved-meals-show', 'showSavedMeals', showSavedMeals);
registerScreen('saved-meals-create', 'showCreateSavedMeal', showCreateSavedMeal);
registerScreen('saved-meals-edit', 'editSavedMeal', editSavedMeal);
registerScreen('saved-meals-log', 'logSavedMeal', logSavedMeal);
registerScreen('saved-meals-delete', 'deleteSavedMeal', deleteSavedMeal);
registerScreen('saved-meals-update', 'updateSavedMeal', updateSavedMeal);
registerScreen('parse-recipe', 'parseRecipeUrl', parseRecipeUrl);
registerScreen('create-saved-meal', 'createSavedMeal', createSavedMeal);
registerScreen('quick-macro-entry', 'showQuickMacroEntry', showQuickMacroEntry);
registerScreen('macro-preset', 'applyMacroPreset', applyMacroPreset);
registerScreen('log-protein', 'logProtein', logProtein);
registerScreen('log-water', 'logWater', logWater);
registerScreen('log-creatine', 'logCreatine', logCreatine);
registerScreen('add-quick-protein', 'addQuickProtein', addQuickProtein);
registerScreen('log-all-quick', 'logAllQuick', logAllQuick);
registerScreen('nutrition-entries', 'loadNutritionEntries', loadNutritionEntries);
registerScreen('edit-nutrition-entry', 'editNutritionEntry', editNutritionEntry);
registerScreen('save-nutrition-entry', 'saveNutritionEntryEdit', saveNutritionEntryEdit);
registerScreen('delete-nutrition-entry', 'deleteNutritionEntry', deleteNutritionEntry);
registerScreen('edit-nutrition-log', 'editNutritionLog', editNutritionLog);
registerScreen('save-nutrition-edit', 'saveNutritionEdit', saveNutritionEdit);
registerScreen('delete-nutrition-log', 'deleteNutritionLog', deleteNutritionLog);
registerScreen('export-nutrition-csv', 'exportNutritionCSV', exportNutritionCSV);
registerScreen('export-nutrition-report', 'exportNutritionReport', exportNutritionReport);
registerScreen('filter-weekly-trends', 'filterWeeklyTrends', filterWeeklyTrends);
registerScreen('sort-weekly-trends', 'sortWeeklyTrends', sortWeeklyTrends);
registerScreen('sort-weekly-trends-col', 'sortWeeklyTrendsByColumn', sortWeeklyTrendsByColumn);

// Install overrides once legacy globals are defined.
// (In Vite dev mode there are no legacy globals, so this is a no-op.)
initBridge();

// -----------------------------------------------------------------------------
// Dev-only scaffolding status page (runs under `vite dev` on :3000 only)
// -----------------------------------------------------------------------------
function mountScaffoldingStatus() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = html`
    <div class="app-shell">
      <header class="app-header">
        <div class="cluster cluster-between">
          <div class="cluster gap-2">
            <i class="fas fa-dumbbell text-primary" style="font-size: 24px;"></i>
            <div>
              <div class="card-title" style="font-size: var(--text-lg);">AI Fitness Coach</div>
              <div class="text-muted" style="font-size: var(--text-xs);">v2 Refactor Scaffolding</div>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" data-action="toggle-theme">
            <i class="fas fa-circle-half-stroke"></i> Theme
          </button>
        </div>
      </header>

      <main class="app-main">
        <div class="stack stack-lg container container-narrow">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title"><i class="fas fa-check-circle"></i> Foundation Ready</h2>
            </div>
            <p class="text-secondary">
              The v2 foundation is installed. Migrated screens:
              <strong>${['Learn'].join(', ')}</strong>.
            </p>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title"><i class="fas fa-vial"></i> Component Smoke Tests</h2>
            </div>
            <div class="cluster">
              <button class="btn btn-primary" data-action="test-toast">
                <i class="fas fa-bell"></i> Test Toast
              </button>
              <button class="btn btn-outline" data-action="test-modal">
                <i class="fas fa-layer-group"></i> Test Modal
              </button>
              <button class="btn btn-outline" data-action="test-confirm">
                <i class="fas fa-question-circle"></i> Test Confirm
              </button>
              <button class="btn btn-outline" data-action="test-ring">
                <i class="fas fa-circle-notch"></i> Test Progress Ring
              </button>
              <button class="btn btn-outline" data-action="test-learn">
                <i class="fas fa-graduation-cap"></i> Test Learn Screen
              </button>
            </div>
          </div>

          <div id="learn-preview" class="card" style="display: none;">
            <div class="card-header">
              <h2 class="card-title">Learn screen preview</h2>
              <button class="btn btn-ghost btn-sm" data-action="hide-learn">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div id="learn"></div>
          </div>
        </div>
      </main>
    </div>
  `;

  appEl.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.getAttribute('data-action');
    if (!action) return;

    switch (action) {
      case 'toggle-theme': {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        store.set('ui.theme', next);
        toast.success(`Switched to ${next} mode`);
        break;
      }
      case 'test-toast':
        toast.success('Toast notifications are working!');
        setTimeout(() => toast.info('Stacking works too'), 300);
        break;
      case 'test-modal':
        openModal({
          title: 'Modal Test',
          content: html`
            <p>This modal includes:</p>
            <ul style="padding-left: var(--space-5); color: var(--color-text-secondary); margin-top: var(--space-2);">
              <li>Focus trap</li>
              <li>ESC to dismiss</li>
              <li>Click-outside to dismiss</li>
              <li>Bottom-sheet on mobile</li>
            </ul>
          `,
          actions: [
            { label: 'Cancel', variant: 'btn-outline' },
            { label: 'OK', primary: true, onClick: (api) => api.close('ok') }
          ]
        });
        break;
      case 'test-confirm': {
        const confirmed = await confirmDialog('Delete this workout? This cannot be undone.', {
          title: 'Delete workout?',
          confirmLabel: 'Delete',
          confirmVariant: 'btn-danger'
        });
        toast.show(confirmed ? 'Confirmed!' : 'Cancelled', {
          type: confirmed ? 'success' : 'info'
        });
        break;
      }
      case 'test-ring':
        openModal({
          title: 'Progress Rings',
          content: html`
            <div class="cluster" style="justify-content: center; gap: var(--space-6);">
              <div style="text-align: center;">
                ${progressRing({ value: 85, max: 160, size: 120, unit: 'g', color: 'var(--color-secondary)' })}
                <div class="stat-label" style="margin-top: var(--space-2);">Protein</div>
              </div>
              <div style="text-align: center;">
                ${progressRing({ value: 1800, max: 2500, size: 120, unit: 'ml', color: 'var(--color-primary)' })}
                <div class="stat-label" style="margin-top: var(--space-2);">Water</div>
              </div>
              <div style="text-align: center;">
                ${progressRing({ value: 5, max: 5, size: 120, unit: 'g', color: 'var(--color-warning)' })}
                <div class="stat-label" style="margin-top: var(--space-2);">Creatine</div>
              </div>
            </div>
          `
        });
        break;
      case 'test-learn':
        document.getElementById('learn-preview').style.display = '';
        loadLearn();
        break;
      case 'hide-learn':
        document.getElementById('learn-preview').style.display = 'none';
        break;
    }
  });
}

// The scaffolding status page is only used if the #app element exists
// AND Vite dev mode is active. In production, the HTML shell owns the
// full UI and the bridge takes over load* functions.
if (import.meta.env && import.meta.env.DEV) {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app')) {
      mountScaffoldingStatus();
    }
  });
}

export { store, api, toast, openModal, confirmDialog };
