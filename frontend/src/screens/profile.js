/**
 * Profile modal — user info (name, age, gender, height, weight, units) +
 * email report preferences.
 *
 * Migrated from legacy showProfile(), saveProfile(), toggleMeasurementInputs(),
 * loadEmailReportPreferences(), saveEmailReportPreferences(), previewReport().
 *
 * Uses the new Modal component instead of the shared #modal element, and
 * delegates events rather than using inline onclick handlers.
 */

import { html } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { openModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLbs,
  lbsToKg
} from '@utils/conversions';

function renderForm(user) {
  const system = user.measurement_system || 'metric';
  const isImperial = system === 'imperial';

  let heightFeet = '';
  let heightInches = '';
  if (isImperial && user.height_cm) {
    const fi = cmToFeetInches(user.height_cm);
    heightFeet = fi.feet;
    heightInches = fi.inches;
  }

  const weightDisplayValue =
    isImperial && user.weight_kg
      ? Math.round(kgToLbs(user.weight_kg) * 10) / 10
      : (user.weight_kg || '');

  return html`
    <div class="stack stack-md">
      <div class="form-group">
        <label class="form-label" for="profile-name">Name</label>
        <input type="text" id="profile-name" class="input" value="${user.name || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="profile-age">Age</label>
        <input type="number" id="profile-age" class="input" value="${user.age || ''}" min="13" max="120" />
      </div>

      <div class="form-group">
        <label class="form-label" for="profile-gender">Gender</label>
        <select id="profile-gender" class="select">
          <option value="not_specified" ${!user.gender || user.gender === 'not_specified' ? 'selected' : ''}>Prefer not to say</option>
          <option value="male" ${user.gender === 'male' ? 'selected' : ''}>Male</option>
          <option value="female" ${user.gender === 'female' ? 'selected' : ''}>Female</option>
        </select>
        <div class="form-hint">
          <i class="fas fa-info-circle"></i> Used by AI to personalize program recommendations
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="profile-system">Measurement System</label>
        <select id="profile-system" class="select" data-action="change-system">
          <option value="metric" ${!isImperial ? 'selected' : ''}>Metric (kg, cm)</option>
          <option value="imperial" ${isImperial ? 'selected' : ''}>Imperial (lbs, feet/inches)</option>
        </select>
      </div>

      <div id="metric-inputs" ${isImperial ? 'hidden' : ''}>
        <div class="form-group">
          <label class="form-label" for="profile-height-cm">Height (cm)</label>
          <input type="number" id="profile-height-cm" class="input" value="${user.height_cm || ''}" step="0.1" min="50" max="300" />
        </div>
        <div class="form-group">
          <label class="form-label" for="profile-weight-kg">Weight (kg)</label>
          <input type="number" id="profile-weight-kg" class="input" value="${user.weight_kg || ''}" step="0.1" min="20" max="500" />
        </div>
      </div>

      <div id="imperial-inputs" ${!isImperial ? 'hidden' : ''}>
        <div class="form-group">
          <label class="form-label">Height</label>
          <div class="cluster gap-2">
            <input type="number" id="profile-height-feet" class="input" value="${heightFeet}" placeholder="Feet" min="2" max="8" style="flex: 1;" />
            <input type="number" id="profile-height-inches" class="input" value="${heightInches}" placeholder="Inches" min="0" max="11" style="flex: 1;" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="profile-weight-lbs">Weight (lbs)</label>
          <input type="number" id="profile-weight-lbs" class="input" value="${weightDisplayValue}" step="0.1" min="40" max="1100" />
        </div>
      </div>

      <div class="divider"></div>

      <div>
        <h3 class="section-title">
          <i class="fas fa-envelope"></i> Email Reports
        </h3>
        <p class="text-muted" style="font-size: var(--text-sm); margin-bottom: var(--space-3);">
          Receive workout summary reports comparing your progress to previous periods.
        </p>

        <div class="stack stack-sm">
          ${[
            { id: 'weekly', label: 'Weekly Report', hint: 'Sent every Monday morning' },
            { id: 'monthly', label: 'Monthly Report', hint: 'Sent on the 1st of each month' },
            { id: 'yearly', label: 'Yearly Report', hint: 'Sent on January 1st' }
          ].map((r) => html`
            <label class="report-pref-row">
              <input type="checkbox" id="profile-report-${r.id}" data-report-toggle="${r.id}" />
              <div>
                <strong>${r.label}</strong>
                <div class="text-muted" style="font-size: var(--text-xs);">${r.hint}</div>
              </div>
            </label>
          `)}
        </div>

        <div class="cluster" style="margin-top: var(--space-3);">
          <button class="btn btn-outline btn-sm" data-action="preview" data-period="weekly">
            <i class="fas fa-eye"></i> Preview Weekly
          </button>
          <button class="btn btn-outline btn-sm" data-action="preview" data-period="monthly">
            <i class="fas fa-eye"></i> Preview Monthly
          </button>
          <button class="btn btn-outline btn-sm" data-action="preview" data-period="yearly">
            <i class="fas fa-eye"></i> Preview Yearly
          </button>
        </div>
      </div>
    </div>
  `;
}

function toggleMeasurementInputs(modalEl) {
  const select = modalEl.querySelector('#profile-system');
  const system = select?.value;
  const metric = modalEl.querySelector('#metric-inputs');
  const imperial = modalEl.querySelector('#imperial-inputs');
  if (!metric || !imperial) return;
  if (system === 'imperial') {
    metric.setAttribute('hidden', '');
    imperial.removeAttribute('hidden');
  } else {
    imperial.setAttribute('hidden', '');
    metric.removeAttribute('hidden');
  }
}

async function loadReportPreferences(modalEl) {
  try {
    const result = await api.get('/reports/preferences');
    const prefs = result.preferences || {};
    const map = {
      weekly: 'weeklyReport',
      monthly: 'monthlyReport',
      yearly: 'yearlyReport'
    };
    for (const [id, key] of Object.entries(map)) {
      const el = modalEl.querySelector(`#profile-report-${id}`);
      if (el) el.checked = !!prefs[key];
    }
  } catch (err) {
    console.error('Failed to load report preferences:', err);
  }
}

async function saveReportPreferences(modalEl) {
  try {
    await api.put('/reports/preferences', {
      weeklyReport: !!modalEl.querySelector('#profile-report-weekly')?.checked,
      monthlyReport: !!modalEl.querySelector('#profile-report-monthly')?.checked,
      yearlyReport: !!modalEl.querySelector('#profile-report-yearly')?.checked
    });
    return true;
  } catch (err) {
    console.error('Failed to save report preferences:', err);
    return false;
  }
}

function previewReport(period) {
  toast.info(`Generating ${period} report preview…`);
  const token = localStorage.getItem('token') || '';
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  window.open(`/api/reports/html/${period}${query}`, '_blank');
}

async function saveProfile(modalEl, api) {
  const name = modalEl.querySelector('#profile-name').value.trim();
  const age = parseInt(modalEl.querySelector('#profile-age').value, 10) || null;
  const gender = modalEl.querySelector('#profile-gender').value;
  const system = modalEl.querySelector('#profile-system').value;

  let height_cm;
  let weight_kg;

  if (system === 'imperial') {
    const feet = parseFloat(modalEl.querySelector('#profile-height-feet').value) || 0;
    const inches = parseFloat(modalEl.querySelector('#profile-height-inches').value) || 0;
    const lbs = parseFloat(modalEl.querySelector('#profile-weight-lbs').value) || 0;
    height_cm = feet || inches ? feetInchesToCm(feet, inches) : null;
    weight_kg = lbs ? lbsToKg(lbs) : null;
  } else {
    height_cm = parseFloat(modalEl.querySelector('#profile-height-cm').value) || null;
    weight_kg = parseFloat(modalEl.querySelector('#profile-weight-kg').value) || null;
  }

  try {
    const result = await api.put('/auth/user', {
      name,
      age,
      gender,
      height_cm,
      weight_kg,
      measurement_system: system
    });

    store.set('user', result.user);
    await saveReportPreferences(modalEl);

    toast.success('Profile updated');

    // Refresh legacy header username (the refactored screens read from store)
    const legacyLoadUser = window.loadUser;
    if (typeof legacyLoadUser === 'function') legacyLoadUser();
  } catch (err) {
    toast.error(`Error saving profile: ${err.message}`);
    throw err;
  }
}

/**
 * Open the profile modal.
 */
export function showProfile() {
  const user = store.get('user') || {};

  const modalApi = openModal({
    title: 'User Profile',
    size: 'default',
    content: String(renderForm(user)),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Save Profile',
        primary: true,
        variant: 'btn-primary',
        onClick: async (modal) => {
          try {
            await saveProfile(modal.element, api);
            modal.close('saved');
          } catch {
            // error toast already shown
          }
        }
      }
    ],
    onOpen: ({ element }) => {
      // Load report prefs after the modal is in the DOM
      loadReportPreferences(element);

      // Delegated event handling
      element.addEventListener('change', (event) => {
        if (event.target.matches('#profile-system')) {
          toggleMeasurementInputs(element);
        }
      });

      element.addEventListener('click', (event) => {
        const previewBtn = event.target.closest('[data-action="preview"]');
        if (previewBtn) {
          event.preventDefault();
          previewReport(previewBtn.getAttribute('data-period'));
        }
      });
    }
  });

  return modalApi;
}
