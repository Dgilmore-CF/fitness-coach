/**
 * Legacy compatibility shim (v2 refactor — final).
 *
 * This file used to be 12,732 lines. Everything has been migrated to
 * frontend/src/. What remains is a thin compat layer that:
 *
 *   1. Handles the HTML shell's data-action buttons (theme, tabs,
 *      mobile menu, profile, modal close).
 *   2. Bootstraps the page on DOMContentLoaded by calling into the
 *      modular code.
 *   3. Exposes a handful of legacy-call forwarders that unmigrated
 *      legacy HTML strings (inside screens) may still reference.
 */

/* global window, document, localStorage */

// -----------------------------------------------------------------------------
// Theme (shared with modular code via localStorage + data-theme)
// -----------------------------------------------------------------------------

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  const menuThemeIcon = document.getElementById('menuThemeIcon');
  if (menuThemeIcon) menuThemeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light');
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('theme', next);
  window.__fitnessApp?.toast?.success(`Switched to ${next} mode`);
}
window.toggleTheme = toggleTheme;

// -----------------------------------------------------------------------------
// Global notification shim (any remaining legacy callers)
// -----------------------------------------------------------------------------

window.showNotification = function showNotification(message, type = 'success') {
  const toast = window.__fitnessApp?.toast;
  if (!toast) return;
  if (typeof toast[type] === 'function') toast[type](message);
  else toast.show(message, { type });
};

// -----------------------------------------------------------------------------
// Legacy modal close (unmigrated screens still use the shared #modal element)
// -----------------------------------------------------------------------------

function closeLegacyModal() {
  const modal = document.getElementById('modal');
  if (modal?.classList?.contains('active')) {
    modal.classList.remove('active');
    modal.onclick = null;
  }
}
window.closeModal = closeLegacyModal;

// -----------------------------------------------------------------------------
// Tab routing
// -----------------------------------------------------------------------------

const TAB_LOADERS = {
  dashboard: 'loadDashboard',
  program: 'loadPrograms',
  workout: 'loadWorkout',
  analytics: 'loadAnalytics',
  insights: 'loadInsights',
  achievements: 'loadAchievements',
  nutrition: 'loadNutrition',
  learn: 'loadLearn'
};

function switchTab(tabName) {
  // Update desktop tab buttons
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');

  // Update mobile nav
  document.querySelectorAll('.mobile-nav-item').forEach((item) => item.classList.remove('active'));
  const mobileItem = document.querySelector(`.mobile-nav-item[data-tab="${tabName}"]`);
  if (mobileItem) {
    mobileItem.classList.add('active');
  } else {
    const menuBtn = document.querySelector('.mobile-nav-item[data-tab="menu"]');
    if (menuBtn && ['program', 'insights', 'achievements', 'learn'].includes(tabName)) {
      menuBtn.classList.add('active');
    }
  }

  // Show the correct content panel
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
  document.getElementById(tabName)?.classList.add('active');

  // Dispatch to the loader (modular functions overridden by bridge)
  const loader = window[TAB_LOADERS[tabName] || 'loadDashboard'];
  if (typeof loader === 'function') {
    Promise.resolve().then(() => loader()).catch((err) => {
      console.error(`Tab loader failed:`, err);
    });
  }

  window.__fitnessApp?.store?.set('currentTab', tabName);
}
window.switchTab = switchTab;

// -----------------------------------------------------------------------------
// Mobile menu drawer
// -----------------------------------------------------------------------------

const MOBILE_MENU_ITEMS = [
  { id: 'dashboard', icon: 'fa-home', label: 'Home', color: '#3b82f6' },
  { id: 'workout', icon: 'fa-dumbbell', label: 'Workout', color: '#10b981' },
  { id: 'nutrition', icon: 'fa-apple-alt', label: 'Nutrition', color: '#f59e0b' },
  { id: 'program', icon: 'fa-list', label: 'Programs', color: '#8b5cf6' },
  { id: 'analytics', icon: 'fa-chart-line', label: 'Analytics', color: '#ec4899' },
  { id: 'insights', icon: 'fa-robot', label: 'AI Coach', color: '#06b6d4' },
  { id: 'achievements', icon: 'fa-trophy', label: 'Achievements', color: '#eab308' },
  { id: 'learn', icon: 'fa-graduation-cap', label: 'Learn', color: '#14b8a6' }
];

function openMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const drawer = document.getElementById('mobileMenuDrawer');
  const grid = document.getElementById('mobileMenuGrid');
  if (!overlay || !drawer || !grid) return;

  const currentTab = window.__fitnessApp?.store?.get('currentTab') || 'dashboard';

  grid.innerHTML = MOBILE_MENU_ITEMS.map((item) => `
    <button class="mobile-menu-item ${currentTab === item.id ? 'active' : ''}" data-action="menu-switch-tab" data-tab="${item.id}">
      <div class="mobile-menu-icon" style="color: ${item.color};">
        <i class="fas ${item.icon}"></i>
      </div>
      <span class="mobile-menu-label">${item.label}</span>
    </button>
  `).join('');

  overlay.classList.add('active');
  setTimeout(() => drawer.classList.add('active'), 10);
  document.body.style.overflow = 'hidden';
}
window.openMobileMenu = openMobileMenu;

function closeMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const drawer = document.getElementById('mobileMenuDrawer');
  if (!drawer || !overlay) return;
  drawer.classList.remove('active');
  setTimeout(() => {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }, 300);
}
window.closeMobileMenu = closeMobileMenu;
window.showMobileMoreMenu = openMobileMenu;

// Note: Do NOT define a local showProfile placeholder. The modular bridge
// sets window.showProfile when screens register, and we call it via
// window.showProfile() below. If the bridge hasn't fired yet, we wait.
function dispatchShowProfile() {
  if (typeof window.showProfile === 'function' && !window.showProfile.__isLegacyStub) {
    window.showProfile();
  } else {
    // Retry on next tick — bridge may not have installed the override yet
    setTimeout(dispatchShowProfile, 50);
  }
}

// -----------------------------------------------------------------------------
// Event delegation for the HTML shell
// -----------------------------------------------------------------------------

function handleShellAction(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');

  switch (action) {
    case 'toggle-theme':
      toggleTheme();
      break;
    case 'switch-tab':
      switchTab(target.getAttribute('data-tab'));
      break;
    case 'show-profile':
      dispatchShowProfile();
      break;
    case 'open-mobile-menu':
      openMobileMenu();
      break;
    case 'close-mobile-menu':
      closeMobileMenu();
      break;
    case 'menu-switch-tab':
      closeMobileMenu();
      switchTab(target.getAttribute('data-tab'));
      break;
    case 'show-profile-from-menu':
      closeMobileMenu();
      dispatchShowProfile();
      break;
    case 'toggle-theme-from-menu':
      closeMobileMenu();
      toggleTheme();
      break;
    case 'close-modal':
      closeLegacyModal();
      break;
  }
}

// -----------------------------------------------------------------------------
// Legacy helpers still referenced from a few places
// -----------------------------------------------------------------------------

window.toggleWorkoutDetails = function toggleWorkoutDetails(workoutId) {
  const details = document.getElementById(`workout-details-${workoutId}`);
  const chevron = document.getElementById(`workout-chevron-${workoutId}`);
  if (!details) return;
  const isHidden = details.hasAttribute('hidden') || details.style.display === 'none';
  if (isHidden) {
    details.removeAttribute('hidden');
    details.style.display = 'block';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    details.setAttribute('hidden', '');
    details.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
};

window.deleteDashboardWorkout = async function deleteDashboardWorkout(workoutId) {
  const { api, toast, confirmDialog } = window.__fitnessApp || {};
  if (!api || !confirmDialog) return;
  const ok = await confirmDialog('Delete this workout? This cannot be undone.', {
    title: 'Delete workout?',
    confirmLabel: 'Delete',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;
  try {
    await api.delete(`/workouts/${workoutId}`);
    toast?.success('Workout deleted');
    if (typeof window.loadDashboard === 'function') window.loadDashboard();
  } catch (err) {
    toast?.error(`Error: ${err.message}`);
  }
};

window.deleteAnalyticsWorkout = async function deleteAnalyticsWorkout(workoutId) {
  const { api, toast, confirmDialog } = window.__fitnessApp || {};
  if (!api || !confirmDialog) return;
  const ok = await confirmDialog('Delete this workout? This cannot be undone.', {
    title: 'Delete workout?',
    confirmLabel: 'Delete',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;
  try {
    await api.delete(`/workouts/${workoutId}`);
    toast?.success('Workout deleted');
    if (typeof window.loadAnalytics === 'function') window.loadAnalytics();
  } catch (err) {
    toast?.error(`Error: ${err.message}`);
  }
};

// -----------------------------------------------------------------------------
// Loading overlay (legacy API)
// -----------------------------------------------------------------------------

window.showLoadingOverlay = function showLoadingOverlay(message = 'Loading…') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    document.body.appendChild(overlay);
  }
  const safeMessage = String(message).replace(/[<>]/g, '');
  overlay.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <div class="loading-overlay-message">${safeMessage}</div>
  `;
};

window.hideLoadingOverlay = function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
};

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------

async function bootstrap() {
  initTheme();

  const api = window.__fitnessApp?.api;
  const store = window.__fitnessApp?.store;

  if (api && store) {
    try {
      const data = await api.get('/auth/user');
      store.set('user', data.user);
      const nameEl = document.getElementById('userName');
      if (nameEl) nameEl.textContent = data.user.name || data.user.email;
    } catch (err) {
      console.error('Failed to load user:', err);
      const nameEl = document.getElementById('userName');
      if (nameEl) nameEl.textContent = 'Error';
      window.__fitnessApp?.toast?.error('Failed to load user. Please refresh.');
    }
  }

  if (typeof window.loadDashboard === 'function') {
    try {
      await window.loadDashboard();
    } catch (err) {
      console.error('Initial dashboard load failed:', err);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Attach shell-level delegation
  document.body.addEventListener('click', handleShellAction);
  // Wait a tick so the Vite bundle's initBridge has installed its overrides
  setTimeout(bootstrap, 0);
});
