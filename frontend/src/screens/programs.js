/**
 * Programs screen — list, view, AI generate, manual builder, activate, delete, rename.
 *
 * Migrated from the legacy programs section (~880 lines spanning multiple
 * functions in public/app.js). Uses the new Modal component, store-backed
 * state for the multi-step builder, and delegated event handling.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { openModal, confirmDialog } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { formatDate } from '@utils/formatters';

// =============================================================================
// Shared helpers
// =============================================================================

const EQUIPMENT_OPTIONS = [
  { value: 'Smith Machine', label: 'Smith Machine', default: true },
  { value: 'Olympic Bar', label: 'Olympic Bar', default: true },
  { value: 'Cable Trainer', label: 'Cable Machine', default: true },
  { value: 'Leg Extension/Curl', label: 'Leg Ext/Curl', default: true },
  { value: 'Pull-up Bar', label: 'Pull-up Bar' },
  { value: 'Landmine', label: 'Landmine' },
  { value: 'Dip Bars', label: 'Dip Bars' },
  { value: 'Rower', label: 'Rower' },
  { value: 'Treadmill', label: 'Treadmill' },
  { value: 'Stationary Bike', label: 'Bike' }
];

const CARDIO_ZONE_CLASS = {
  1: 'cardio-zone-low',
  2: 'cardio-zone-low',
  3: 'cardio-zone-mid',
  4: 'cardio-zone-high',
  5: 'cardio-zone-high'
};

function refreshList() {
  return loadPrograms();
}

// =============================================================================
// Main list view
// =============================================================================

function renderProgramRow(program) {
  const badge = program.active
    ? html`<span class="badge badge-success">ACTIVE</span>`
    : html`<button class="btn btn-outline btn-sm" data-action="activate" data-program-id="${program.id}">Activate</button>`;

  return html`
    <div class="program-row ${program.active ? 'is-active' : ''}" data-action="view" data-program-id="${program.id}">
      <div>
        <strong>${program.name}</strong>
        <div class="text-muted" style="font-size: var(--text-sm); margin-top: 2px;">
          ${program.days_per_week} days/week · ${program.goal} · ${program.ai_generated ? '🤖 AI Generated' : 'Custom'}
        </div>
      </div>
      <div>${badge}</div>
    </div>
  `;
}

export async function loadPrograms() {
  const container = document.getElementById('program');
  if (!container) return;

  container.innerHTML = String(html`
    <div class="stack stack-lg">
      <div class="card">
        <div class="skeleton skeleton-card"></div>
      </div>
    </div>
  `);

  try {
    const data = await api.get('/programs');
    const programs = data.programs || [];
    const active = programs.find((p) => p.active);

    container.innerHTML = String(html`
      <div class="stack stack-lg">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-list-alt"></i> My Programs</h2>
            <div class="cluster">
              <button class="btn btn-primary" data-action="generate">
                <i class="fas fa-magic"></i> AI Generate
              </button>
              <button class="btn btn-secondary" data-action="create-manual">
                <i class="fas fa-plus"></i> Create Custom
              </button>
            </div>
          </div>
        </div>

        ${active
          ? html`
              <div class="card" style="border: 2px solid var(--color-secondary);">
                <div class="card-header">
                  <h2 class="card-title"><i class="fas fa-check-circle"></i> Active Program</h2>
                </div>
                <div data-action="view" data-program-id="${active.id}" style="cursor: pointer;">
                  <h3 style="font-size: var(--text-xl); margin-bottom: var(--space-1);">${active.name}</h3>
                  <p class="text-muted">${active.days_per_week} days per week · ${active.goal}</p>
                </div>
                <div class="cluster" style="margin-top: var(--space-3);">
                  <button class="btn btn-secondary" data-action="view" data-program-id="${active.id}">
                    View Details
                  </button>
                </div>
              </div>
            `
          : ''}

        <div class="card">
          <div class="card-header">
            <h2 class="card-title"><i class="fas fa-folder"></i> All Programs</h2>
          </div>
          ${programs.length > 0
            ? html`<div class="stack stack-sm">${programs.map(renderProgramRow)}</div>`
            : html`
                <div class="empty-state">
                  <div class="empty-state-icon">📋</div>
                  <div class="empty-state-title">No programs yet</div>
                  <div class="empty-state-description">Generate your first program with AI or build one from scratch.</div>
                </div>
              `}
        </div>
      </div>
    `);

    attachListHandlers(container);
  } catch (error) {
    console.error('Error loading programs:', error);
    container.innerHTML = String(html`
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Couldn't load programs</div>
          <div class="empty-state-description">${error.message}</div>
        </div>
      </div>
    `);
  }
}

function attachListHandlers(container) {
  container.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const id = parseInt(target.getAttribute('data-program-id'), 10);

    switch (action) {
      case 'view':
        event.stopPropagation();
        viewProgram(id);
        break;
      case 'activate':
        event.stopPropagation();
        activateProgram(id);
        break;
      case 'generate':
        showGenerateProgram();
        break;
      case 'create-manual':
        showCreateManualProgram();
        break;
    }
  });
}

// =============================================================================
// View program modal
// =============================================================================

function renderStrengthDay(day) {
  return html`
    <strong style="display: block; margin-bottom: var(--space-2);">Warm-up Stretches:</strong>
    <ul style="margin: 0 0 var(--space-4) var(--space-5); line-height: 1.8;">
      ${(day.stretches || []).map(
        (s) => html`<li>${s.name} — ${s.duration_seconds}s (${s.muscle_group})</li>`
      )}
    </ul>

    <strong style="display: block; margin-bottom: var(--space-2);">Exercises:</strong>
    <ol style="margin: 0 0 0 var(--space-5); line-height: 1.8;">
      ${(day.exercises || []).map(
        (ex) => html`
          <li style="margin-bottom: var(--space-4);">
            <div><strong>${ex.name}</strong> — ${ex.target_sets} sets × ${ex.target_reps} reps</div>
            <div class="text-muted" style="font-size: var(--text-sm);">
              Rest: ${ex.rest_seconds}s · ${ex.muscle_group} · ${ex.equipment}
            </div>
            ${ex.tips
              ? html`
                  <details class="exercise-tips">
                    <summary>
                      <i class="fas fa-info-circle"></i> Exercise Tips &amp; Form Cues
                    </summary>
                    <div>
                      ${ex.tips}
                      <div class="exercise-tips-key-points">
                        <strong>Key Points:</strong>
                        <ul>
                          <li>Focus on controlled movement throughout the entire range of motion</li>
                          <li>Maintain proper breathing: exhale on exertion, inhale on the negative</li>
                          <li>Keep core engaged and maintain neutral spine alignment</li>
                          <li>Use a weight that allows you to complete all reps with good form</li>
                        </ul>
                      </div>
                    </div>
                  </details>
                `
              : ''}
          </li>
        `
      )}
    </ol>
  `;
}

function renderCardioDay(day) {
  const sessions = day.cardio_sessions || [];
  return html`
    <strong class="cardio-day-title">
      <i class="fas fa-fire"></i> Cardio Sessions
    </strong>
    <div class="stack stack-sm">
      ${sessions.map((session) => html`
        <div class="cardio-session ${CARDIO_ZONE_CLASS[session.heart_rate_zone] || 'cardio-zone-mid'}">
          <div class="cardio-session-header">
            <strong>${session.name}</strong>
            <span class="cardio-session-duration">
              <i class="fas fa-clock"></i> ${session.duration_minutes} min
            </span>
          </div>
          <div style="font-size: var(--text-sm);">
            <i class="fas fa-heartbeat"></i> Zone ${session.heart_rate_zone}: ${session.zone_name || ''}
          </div>
          <div class="cardio-session-description">${session.zone_description || ''}</div>
          ${session.activity_suggestions
            ? html`<div class="cardio-session-note"><i class="fas fa-lightbulb"></i> ${session.activity_suggestions}</div>`
            : ''}
          ${session.interval_structure
            ? html`<div class="cardio-session-note"><i class="fas fa-stopwatch"></i> ${session.interval_structure}</div>`
            : ''}
        </div>
      `)}
    </div>
    <div class="hr-zone-guide">
      <strong><i class="fas fa-info-circle"></i> Heart Rate Zone Guide</strong>
      <div class="hr-zone-grid">
        <div><span style="color: #10b981; font-weight: 600;">Zone 1–2:</span> 50–70% max HR — Recovery/Fat burn</div>
        <div><span style="color: #f59e0b; font-weight: 600;">Zone 3:</span> 70–80% max HR — Aerobic endurance</div>
        <div><span style="color: #ef4444; font-weight: 600;">Zone 4–5:</span> 80–100% max HR — Threshold/Maximum</div>
      </div>
      <div class="text-muted" style="font-size: var(--text-xs); margin-top: var(--space-2);">
        Max HR ≈ 220 − your age
      </div>
    </div>
  `;
}

function renderProgramDay(day) {
  return html`
    <div class="program-day-card">
      <h4>
        Day ${day.day_number}: ${day.name}
        ${day.is_cardio_day ? html`<span class="badge badge-danger"><i class="fas fa-heartbeat"></i> Cardio</span>` : ''}
      </h4>
      <p class="text-muted" style="margin-bottom: var(--space-3); font-weight: var(--font-medium);">${day.focus}</p>
      ${day.is_cardio_day ? renderCardioDay(day) : renderStrengthDay(day)}
    </div>
  `;
}

export async function viewProgram(programId) {
  try {
    const data = await api.get(`/programs/${programId}`);
    const program = data.program;

    const createdLabel = program.created_at
      ? formatDate(program.created_at, { year: 'numeric', month: 'short', day: 'numeric' })
      : 'Unknown';

    const modalApi = openModal({
      title: 'Program Details',
      size: 'wide',
      content: String(html`
        <div class="cluster cluster-between" style="margin-bottom: var(--space-2);">
          <h3 style="margin: 0;">${program.name}</h3>
          <button class="btn btn-outline btn-sm" data-action="rename">
            <i class="fas fa-edit"></i> Rename
          </button>
        </div>
        <p class="text-muted" style="font-size: var(--text-sm);">
          <i class="fas fa-calendar"></i> Created ${createdLabel} · ${program.days_per_week} days/week · ${program.goal}
        </p>
        <p><em>${program.equipment || ''}</em></p>
        ${program.description
          ? html`<p class="text-muted" style="margin-top: var(--space-2); font-style: italic;">${program.description}</p>`
          : ''}
        ${program.custom_instructions
          ? html`
              <div class="custom-instructions-box">
                <div class="custom-instructions-label">
                  <i class="fas fa-magic"></i> Custom Instructions Used
                </div>
                <div>${program.custom_instructions}</div>
              </div>
            `
          : ''}

        <div class="stack stack-md" style="margin-top: var(--space-5);">
          ${(program.days || []).map(renderProgramDay)}
        </div>
      `),
      actions: [
        { label: 'Start Workout', primary: true, variant: 'btn-primary',
          onClick: (modal) => {
            modal.close();
            startWorkoutFromProgram(programId);
          } },
        ...(!program.active
          ? [{ label: 'Set as Active', variant: 'btn-secondary',
              onClick: async (modal) => {
                await activateProgram(programId, { silent: false });
                modal.close();
              } }]
          : []),
        { label: 'Delete', variant: 'btn-danger',
          onClick: async (modal) => {
            const ok = await confirmDialog('Delete this program? This cannot be undone.', {
              title: 'Delete program?',
              confirmLabel: 'Delete',
              confirmVariant: 'btn-danger'
            });
            if (!ok) return;
            try {
              await api.delete(`/programs/${programId}`);
              toast.success('Program deleted');
              modal.close();
              refreshList();
            } catch (err) {
              toast.error(`Error deleting program: ${err.message}`);
            }
          } }
      ],
      onOpen: ({ element }) => {
        element.querySelector('[data-action="rename"]')?.addEventListener('click', () => {
          showRenameProgramModal(programId, program.name);
        });
      }
    });

    return modalApi;
  } catch (error) {
    toast.error(`Error loading program: ${error.message}`);
  }
}

// =============================================================================
// Rename
// =============================================================================

export function showRenameProgramModal(programId, currentName) {
  const modalApi = openModal({
    title: 'Rename Program',
    size: 'default',
    content: String(html`
      <div class="form-group">
        <label class="form-label" for="rename-input">Program name</label>
        <input type="text" id="rename-input" class="input" value="${currentName}" />
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Save Name',
        primary: true,
        onClick: async (modal) => {
          const newName = modal.element.querySelector('#rename-input').value.trim();
          if (!newName) {
            toast.warning('Please enter a program name');
            return;
          }
          try {
            await api.patch(`/programs/${programId}`, { name: newName });
            toast.success('Program renamed');
            modal.close();
            // Refresh both the underlying list and the view modal
            refreshList();
            viewProgram(programId);
          } catch (err) {
            toast.error(`Failed to rename: ${err.message}`);
          }
        }
      }
    ],
    onOpen: ({ element }) => {
      const input = element.querySelector('#rename-input');
      input?.focus();
      input?.select();
    }
  });
}

// =============================================================================
// Activate / delete
// =============================================================================

export async function activateProgram(programId, opts = {}) {
  try {
    await api.post(`/programs/${programId}/activate`);
    if (!opts.silent) toast.success('Program activated');
    refreshList();
  } catch (err) {
    toast.error(`Error activating program: ${err.message}`);
  }
}

export async function deleteProgram(programId) {
  const ok = await confirmDialog('Are you sure you want to delete this program?', {
    title: 'Delete program?',
    confirmLabel: 'Delete',
    confirmVariant: 'btn-danger'
  });
  if (!ok) return;
  try {
    await api.delete(`/programs/${programId}`);
    toast.success('Program deleted');
    refreshList();
  } catch (err) {
    toast.error(`Error deleting program: ${err.message}`);
  }
}

// =============================================================================
// AI generator
// =============================================================================

export function showGenerateProgram() {
  const modalApi = openModal({
    title: 'Generate AI Program',
    size: 'default',
    content: String(html`
      <div class="stack stack-md">
        <div class="form-group">
          <label class="form-label" for="gen-days">Days per week</label>
          <select id="gen-days" class="select">
            <option value="3">3 days</option>
            <option value="4" selected>4 days</option>
            <option value="5">5 days</option>
            <option value="6">6 days</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="gen-goal">Goal</label>
          <select id="gen-goal" class="select">
            <option value="hypertrophy">Hypertrophy (Muscle Growth)</option>
            <option value="strength">Strength</option>
            <option value="endurance">Endurance</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Available Equipment</label>
          <div class="equipment-grid">
            ${EQUIPMENT_OPTIONS.map((eq) => html`
              <label class="equipment-checkbox">
                <input type="checkbox" name="equipment" value="${eq.value}" ${eq.default ? 'checked' : ''} />
                ${eq.label}
              </label>
            `)}
          </div>
          <div class="form-hint">Equipment exercises prioritized over bodyweight</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="gen-custom">Custom Instructions (optional)</label>
          <textarea id="gen-custom" class="textarea" rows="3" placeholder="E.g., Include 2 push days, 2 pull days, 1 leg day, and a cardio day. Include core workouts on relevant days."></textarea>
          <div class="form-hint">Tell the AI any specific preferences for your program</div>
        </div>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Generate',
        primary: true,
        variant: 'btn-primary',
        onClick: async (modal) => {
          await runGeneration(modal);
        }
      }
    ]
  });
}

async function runGeneration(modal) {
  const el = modal.element;
  const days = parseInt(el.querySelector('#gen-days').value, 10);
  const goal = el.querySelector('#gen-goal').value;
  const custom = el.querySelector('#gen-custom').value.trim();
  const equipment = Array.from(el.querySelectorAll('input[name="equipment"]:checked')).map((cb) => cb.value);

  // Swap modal body to a progress state
  const body = el.querySelector('.modal-body');
  body.innerHTML = String(html`
    <div class="generate-progress">
      <div class="generate-progress-icon">
        <i class="fas fa-magic animate-pulse"></i>
      </div>
      <h3>Generating Your Program</h3>
      <div class="progress-bar" style="margin: var(--space-4) 0;">
        <div class="progress-bar-fill" style="width: 100%; animation: pulse 2s ease-in-out infinite;"></div>
      </div>
      <div class="generate-progress-steps">
        <p><i class="fas fa-check text-success"></i> Analyzing your profile…</p>
        <p><i class="fas fa-check text-success"></i> Consulting AI for optimal exercises…</p>
        <p><i class="fas fa-spinner fa-spin text-primary"></i> Building ${days}-day program…</p>
        <p class="text-muted"><i class="fas fa-clock"></i> Optimizing sets and rest periods…</p>
      </div>
      <p class="text-muted" style="font-size: var(--text-xs); margin-top: var(--space-4);">
        This usually takes 10–30 seconds
      </p>
    </div>
  `);

  // Hide footer during generation
  const footer = el.querySelector('.modal-footer');
  if (footer) footer.style.display = 'none';

  try {
    await api.post('/programs/generate', {
      days_per_week: days,
      goal,
      custom_instructions: custom,
      available_equipment: equipment
    });

    body.innerHTML = String(html`
      <div class="generate-progress">
        <div class="generate-progress-icon text-success">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3>Program Generated Successfully!</h3>
        <p class="text-muted">Your new ${days}-day ${goal} program is ready.</p>
      </div>
    `);

    setTimeout(() => {
      modal.close();
      refreshList();
    }, 1500);
  } catch (err) {
    body.innerHTML = String(html`
      <div class="generate-progress">
        <div class="generate-progress-icon text-danger">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <h3>Generation Failed</h3>
        <p class="text-muted">${err.message}</p>
      </div>
    `);
    if (footer) footer.style.display = '';
  }
}

// =============================================================================
// Manual builder
// =============================================================================

const builderState = {
  name: '',
  days_per_week: 3,
  goal: 'hypertrophy',
  days: [],
  currentDayIndex: 0,
  availableExercises: [],
  modalApi: null
};

export async function showCreateManualProgram() {
  builderState.days = [];
  builderState.currentDayIndex = 0;

  try {
    const data = await api.get('/exercises');
    builderState.availableExercises = data.exercises || [];
  } catch (err) {
    toast.error('Error loading exercises');
    return;
  }

  showBuilderStep1();
}

function showBuilderStep1() {
  if (builderState.modalApi) builderState.modalApi.close();

  builderState.modalApi = openModal({
    title: 'Create Custom Program',
    size: 'wide',
    content: String(html`
      <h3 style="margin-bottom: var(--space-1);">Step 1: Program details</h3>
      <p class="text-muted" style="margin-bottom: var(--space-4);">Name your program and set the basic structure.</p>

      <div class="form-group">
        <label class="form-label" for="builder-name">Program name</label>
        <input type="text" id="builder-name" class="input" placeholder="e.g., My Push/Pull/Legs" value="${builderState.name}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="builder-days">Days per week</label>
        <select id="builder-days" class="select">
          ${[3, 4, 5, 6].map((n) => html`
            <option value="${n}" ${builderState.days_per_week === n ? 'selected' : ''}>${n} days</option>
          `)}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="builder-goal">Goal</label>
        <select id="builder-goal" class="select">
          <option value="hypertrophy" ${builderState.goal === 'hypertrophy' ? 'selected' : ''}>Hypertrophy (Muscle Growth)</option>
          <option value="strength" ${builderState.goal === 'strength' ? 'selected' : ''}>Strength</option>
          <option value="endurance" ${builderState.goal === 'endurance' ? 'selected' : ''}>Endurance</option>
        </select>
      </div>
    `),
    actions: [
      { label: 'Cancel', variant: 'btn-outline' },
      {
        label: 'Next: Configure Days',
        primary: true,
        onClick: (modal) => {
          const name = modal.element.querySelector('#builder-name').value.trim();
          const days = parseInt(modal.element.querySelector('#builder-days').value, 10);
          const goal = modal.element.querySelector('#builder-goal').value;

          if (!name) {
            toast.warning('Please enter a program name');
            return;
          }

          builderState.name = name;
          builderState.days_per_week = days;
          builderState.goal = goal;
          builderState.days = Array.from({ length: days }, (_, i) => ({
            day_number: i + 1,
            name: `Day ${i + 1}`,
            focus: '',
            exercises: []
          }));
          builderState.currentDayIndex = 0;
          showBuilderDayStep();
        }
      }
    ]
  });
}

function showBuilderDayStep() {
  const day = builderState.days[builderState.currentDayIndex];
  const byMuscle = groupExercisesByMuscle(builderState.availableExercises);
  const isLast = builderState.currentDayIndex === builderState.days_per_week - 1;

  if (builderState.modalApi) builderState.modalApi.close();

  builderState.modalApi = openModal({
    title: 'Create Custom Program',
    size: 'wide',
    content: String(html`
      <h3 style="margin-bottom: var(--space-1);">Day ${day.day_number} of ${builderState.days_per_week}</h3>
      <p class="text-muted" style="margin-bottom: var(--space-4);">Configure this workout day.</p>

      <div class="form-group">
        <label class="form-label" for="builder-day-name">Day name</label>
        <input type="text" id="builder-day-name" class="input" placeholder="e.g., Upper Body Push" value="${day.name}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="builder-day-focus">Focus / description</label>
        <input type="text" id="builder-day-focus" class="input" placeholder="e.g., Chest, Shoulders, Triceps" value="${day.focus}" />
      </div>

      <div class="form-group">
        <label class="form-label">Select exercises (<span id="builder-count">${day.exercises.length}</span> selected)</label>
        <div class="exercise-picker" id="builder-exercise-list">
          ${Object.keys(byMuscle).sort().map((muscle) => html`
            <div style="margin-bottom: var(--space-4);">
              <h4 class="exercise-picker-group">${muscle}</h4>
              ${byMuscle[muscle].map((ex) => renderBuilderExercise(ex, day))}
            </div>
          `)}
        </div>
      </div>
    `),
    actions: [
      ...(builderState.currentDayIndex > 0
        ? [{ label: '← Previous Day', variant: 'btn-outline',
            onClick: () => {
              persistCurrentDayFields();
              builderState.currentDayIndex--;
              showBuilderDayStep();
            } }]
        : []),
      { label: 'Cancel', variant: 'btn-ghost' },
      {
        label: isLast ? 'Finish & Save' : 'Next Day →',
        primary: true,
        onClick: async () => {
          persistCurrentDayFields();
          if (day.exercises.length === 0) {
            toast.warning('Please select at least one exercise for this day');
            return;
          }
          if (isLast) {
            await saveBuilderProgram();
          } else {
            builderState.currentDayIndex++;
            showBuilderDayStep();
          }
        }
      }
    ],
    onOpen: ({ element }) => attachBuilderHandlers(element)
  });
}

function persistCurrentDayFields() {
  const el = builderState.modalApi?.element;
  if (!el) return;
  const day = builderState.days[builderState.currentDayIndex];
  const nameInput = el.querySelector('#builder-day-name');
  const focusInput = el.querySelector('#builder-day-focus');
  if (nameInput) day.name = nameInput.value.trim() || `Day ${day.day_number}`;
  if (focusInput) day.focus = focusInput.value.trim();
}

function groupExercisesByMuscle(exercises) {
  const groups = {};
  for (const ex of exercises) {
    const key = ex.muscle_group || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(ex);
  }
  return groups;
}

function renderBuilderExercise(ex, day) {
  const selected = day.exercises.find((e) => e.exercise_id === ex.id);
  return html`
    <div class="exercise-picker-item ${selected ? 'is-selected' : ''}" data-exercise-id="${ex.id}">
      <label>
        <input type="checkbox" data-builder-toggle="${ex.id}" ${selected ? 'checked' : ''} />
        <div class="exercise-picker-body">
          <div class="exercise-picker-name">${ex.name}</div>
          <div class="text-muted" style="font-size: var(--text-xs);">${ex.equipment}</div>
          ${selected
            ? html`
                <div class="exercise-picker-config">
                  <input type="number" class="input" data-builder-config="${ex.id}:sets" value="${selected.sets || 3}" placeholder="Sets" min="1" />
                  <input type="text" class="input" data-builder-config="${ex.id}:reps" value="${selected.reps || '8-12'}" placeholder="Reps" />
                  <input type="number" class="input" data-builder-config="${ex.id}:rest_seconds" value="${selected.rest_seconds || 90}" placeholder="Rest (s)" min="30" step="15" />
                </div>
              `
            : ''}
        </div>
      </label>
    </div>
  `;
}

function attachBuilderHandlers(element) {
  element.addEventListener('change', (event) => {
    const toggle = event.target.closest('[data-builder-toggle]');
    if (toggle) {
      const exerciseId = parseInt(toggle.getAttribute('data-builder-toggle'), 10);
      builderToggleExercise(exerciseId);
      return;
    }

    const config = event.target.closest('[data-builder-config]');
    if (config) {
      const [exerciseId, field] = config.getAttribute('data-builder-config').split(':');
      builderUpdateExercise(parseInt(exerciseId, 10), field, event.target.value);
    }
  });
}

function builderToggleExercise(exerciseId) {
  persistCurrentDayFields();
  const day = builderState.days[builderState.currentDayIndex];
  const index = day.exercises.findIndex((e) => e.exercise_id === exerciseId);

  if (index >= 0) {
    day.exercises.splice(index, 1);
  } else {
    const ex = builderState.availableExercises.find((x) => x.id === exerciseId);
    day.exercises.push({
      exercise_id: exerciseId,
      name: ex?.name || '',
      sets: 3,
      reps: '8-12',
      rest_seconds: 90
    });
  }

  showBuilderDayStep();
}

function builderUpdateExercise(exerciseId, field, value) {
  const day = builderState.days[builderState.currentDayIndex];
  const ex = day.exercises.find((e) => e.exercise_id === exerciseId);
  if (!ex) return;
  if (field === 'reps') {
    ex.reps = value;
  } else {
    ex[field] = parseInt(value, 10) || 0;
  }
}

async function saveBuilderProgram() {
  try {
    await api.post('/programs/manual', {
      name: builderState.name,
      days_per_week: builderState.days_per_week,
      goal: builderState.goal,
      days: builderState.days
    });
    toast.success('Custom program created!');
    builderState.modalApi?.close();
    builderState.modalApi = null;
    refreshList();
  } catch (err) {
    toast.error(`Error creating program: ${err.message}`);
  }
}

// =============================================================================
// Bridge helpers — these need to remain as legacy globals because other
// unmigrated legacy code still calls them by name (e.g. viewProgram called
// by showLogPastWorkout). The bridge will attach them to window.
// =============================================================================

export async function startWorkoutFromProgram(programId) {
  // Delegate to legacy startWorkoutFromProgram for now — will be migrated
  // when the workout screen is done.
  const legacy = window.__legacyStartWorkoutFromProgram;
  if (typeof legacy === 'function') return legacy(programId);
  // Fallback: navigate to the workout tab via switchTab
  if (typeof window.switchTab === 'function') window.switchTab('workout');
}
