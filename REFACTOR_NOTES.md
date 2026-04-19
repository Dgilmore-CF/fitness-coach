# v2 Refactor Notes

This document captures the architecture, migration status, and conventions
introduced by the v2 modernization refactor (branch: `refactor/v2-modernization`).

## TL;DR

- **Goal**: Professional, modular, AI-first fitness coaching app.
- **Strategy**: Incremental migration — legacy monolithic `public/app.js` and
  the new modular `frontend/src/` coexist via a runtime "bridge".
- **Status**: 7 of the 10 main screens migrated, real-time AI coaching fully
  integrated, backend shared utilities and database cleanup complete.
- **Tests**: 81 passing unit tests; Playwright configured for E2E.

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker (Hono)                  │
│                                                              │
│  /api/*  →  routes/  →  services/  →  D1 / R2 / Workers AI   │
│                                                              │
│  /       →  static.js  →  inlines frontend.js into HTML      │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      Browser runtime                         │
│                                                              │
│   Vite bundle (frontend/src/)   ──registers──►  bridge       │
│                                                              │
│   Legacy app.js (public/app.js) ──overridden by──► bridge    │
│                                                              │
│   Result: each screen tab uses EITHER the modular            │
│   implementation OR the legacy implementation, chosen at     │
│   runtime by the bridge.                                     │
└──────────────────────────────────────────────────────────────┘
```

## Directory layout

```
fitness-builder/
├── frontend/                    # NEW — modular frontend source (Vite root)
│   ├── index.html               # Clean HTML shell (dev server only)
│   ├── content/
│   │   └── learn.html           # Extracted static content
│   ├── css/
│   │   ├── design-system.css    # Tokens (colors, spacing, typography)
│   │   ├── layouts.css          # Layout primitives
│   │   ├── components.css       # Component styles
│   │   └── animations.css       # Keyframes
│   └── src/
│       ├── main.js              # Vite entry — registers screens with bridge
│       ├── bridge.js            # Runtime override system for legacy globals
│       ├── core/                # Component, state, api, router, events, html
│       ├── utils/               # conversions, formatters, validators, audio, volume
│       ├── ui/                  # Modal, Toast, LoadingOverlay, ProgressRing, Chart, Timer
│       ├── screens/             # Per-tab screens (dashboard, programs, nutrition, …)
│       └── features/
│           └── ai-coach/        # Pre-workout preview, live coach overlay
│
├── public/                      # LEGACY — shrinking monolith
│   └── app.js                   # Still contains unmigrated screens
│
├── src/                         # BACKEND — Cloudflare Worker
│   ├── index.js                 # Hono app entry
│   ├── frontend.js              # Auto-generated bundle (JS + CSS as strings)
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── static.js            # Serves the HTML shell + inlined bundles
│   │   ├── error-handler.js     # NEW — unified error responses
│   │   └── ownership.js         # NEW — resource ownership guards
│   ├── routes/                  # API endpoints
│   ├── services/
│   │   ├── ai-coach.js          # Existing — post-workout analysis
│   │   └── ai-realtime.js       # NEW — readiness, predictions, post-set tips
│   └── utils/                   # NEW — shared utilities
│       ├── api-response.js      # Canonical response envelope
│       ├── query-builder.js     # filter() + buildQuery() + partial UPDATE
│       ├── csv.js               # csvResponse() helper
│       ├── ai-parser.js         # parseAIJsonResponse() + callAI()
│       └── volume.js            # Unilateral-aware SQL fragment
│
├── tests/
│   ├── unit/                    # Vitest — 81 passing tests
│   └── e2e/                     # Playwright — configured, minimal tests
│
├── migrations/                  # D1 SQL migrations (26 total)
│   ├── README.md                # Explains duplicate-number issue
│   └── 0026_schema_cleanup.sql  # NEW — indexes, FK cascades, UNIQUE
│
├── vite.config.js               # NEW — Vite config
├── vitest.config.js             # NEW — Vitest config
├── playwright.config.js         # NEW — Playwright config
└── build-frontend.js            # UPDATED — combines Vite output + legacy
```

## Build pipeline

```
npm run build
├── npm run build:frontend    →  Vite builds frontend/src/ → frontend-dist/
└── npm run build:legacy      →  build-frontend.js reads frontend-dist/ + public/app.js
                                  and writes src/frontend.js as a template-literal export
```

The Worker deploy model is unchanged: wrangler bundles `src/index.js` with all
its imports (including the generated `src/frontend.js`) into one Worker.

## The bridge pattern

Both the Vite bundle and the legacy `public/app.js` run in the same browser
scope. The Vite bundle executes first (it's concatenated first by the build
script) and registers screen handlers; the legacy code runs next and defines
its own `loadDashboard`, `loadNutrition`, etc.

On `DOMContentLoaded`, `frontend/src/bridge.js` walks its registry and
overrides each legacy global with the modular implementation:

```js
import { registerScreen, initBridge } from './bridge.js';
import { loadDashboard } from './screens/dashboard.js';

registerScreen('dashboard', 'loadDashboard', loadDashboard);
initBridge(); // swaps window.loadDashboard on DOMContentLoaded
```

This lets us migrate screens **one at a time** without breaking others.
Screens not yet migrated continue to use their legacy implementations.

## Migration status

| Screen              | Status         | Legacy file size impact            |
|---------------------|----------------|-------------------------------------|
| Learn               | ✅ migrated    | −1,786 lines (static HTML → file)   |
| Achievements        | ✅ migrated    | −164 lines                          |
| Dashboard           | ✅ migrated    | −144 lines                          |
| Profile             | ✅ migrated    | −183 lines (uses new Modal)         |
| Programs            | ✅ migrated    | −715 lines (list/view/AI/builder)   |
| Analytics main view | ✅ migrated    | −252 lines                          |
| Nutrition main view | ✅ migrated    | −367 lines (now with progress rings)|
| AI Coach / Insights | ✅ migrated    | −234 lines                          |
| Workout tab         | ⏳ legacy      | —                                   |
| Active Workout Modal| ⏳ legacy (+AI hooks) | See Phase 4               |
| Log Past Workout    | ⏳ legacy      | —                                   |

**Legacy `public/app.js` size**: 12,732 → 8,871 lines (−30% reduction).

### Complex sub-modals still in legacy

To keep the migration focused, these sub-systems weren't migrated in this
pass but get a cleaner wrapping via the new main screens:

- `loadWorkoutHistory` + calendar rendering (called by Analytics)
- `openUnifiedExporter` + PDF generation (called by Analytics)
- `showLogMealModal` + `showBarcodeScanner` + `showCreateSavedMeal` (called by Nutrition)
- `generateAICoaching` + `loadAdvancedAnalytics` (called by AI Coach)
- `showExerciseHistory` (called from multiple places)

These are marked with `TODO: migrate` comments and can be migrated in
follow-up PRs without touching any of the already-migrated screens.

## Phase 4: real-time AI coaching

### New backend endpoints

| Endpoint                               | Purpose                                  |
|----------------------------------------|------------------------------------------|
| `GET /api/ai/realtime/preview/:dayId`  | Pre-workout readiness + suggested weights|
| `GET /api/ai/realtime/predict/:exId`   | Smart weight/rep suggestion              |
| `POST /api/ai/realtime/analyze`        | Post-set coaching tip                    |

All three are rule-based by default for sub-second latency. The logic lives in
`src/services/ai-realtime.js` with 13 unit tests in `tests/unit/ai-realtime.test.js`.

### New frontend features

- **Pre-workout briefing**: A modal shown before the warmup screen that shows
  a 0–100 readiness score, rationale, target muscles, and AI-suggested
  starting weights per exercise.
- **Live coach overlay**: A collapsible bottom-sheet that stays mounted for
  the duration of the workout. After every logged set, it calls
  `/api/ai/realtime/analyze` and surfaces contextual tips (progression,
  form warning, load warning, completion celebration).
- Exposed as `window.aiCoach.{showPreview, initLive, destroyLive, analyzeSet}`
  so the legacy Active Workout modal can call them at the right lifecycle
  points.

### Integration points in legacy code

```js
// public/app.js

async function startWorkoutDay(...) {
  // …create workout…
  await window.aiCoach.showPreview(programDayId); // Phase 4
  showWorkoutWarmupScreen(workout);
}

async function startWorkoutExercises() {
  // …initialize workout…
  window.aiCoach.initLive({ onAction: (action) => /* apply tip */ });
}

async function addExerciseSet(exerciseId) {
  // …log set to backend…
  window.aiCoach.analyzeSet({ currentSets, targetReps, targetSets });
}

async function finishWorkoutSummary() {
  // …clear state…
  window.aiCoach.destroyLive();
}
```

## Database cleanup (Phase 2)

Migration `0026_schema_cleanup.sql` added:

- 15 new indexes (workouts, workout_exercises, exercises, sets, nutrition_*, meals, ai_recommendations)
- Dropped `idx_programs_description` (useless TEXT equality index)
- `uniq_exercises_name_equipment` UNIQUE index to prevent future duplicates
- Proper `ON DELETE CASCADE` on `user_achievements` and `workout_streaks`
  via the standard SQLite recreate-and-copy pattern

Also fixed a pre-existing bug in `migrations/0022_remove_all_duplicate_exercises.sql`
where it referenced `ai_recommendations.exercise_id` (dropped by migration
0009). The original had been silently failing in CI via `continue-on-error`.

Also fixed four column-name bugs in `src/routes/exports.js` that referenced
columns that don't exist in the schema (`recorded_at`, `is_active`, `is_warmup`,
etc.).

## Conventions introduced

### Frontend

- **No inline `onclick=` attributes.** Use `data-action="…"` and delegate in
  the component.
- **No inline `style="…"` attributes** for new code. Use component classes.
- **No `innerHTML = <string>` with user data.** Use the `html\`…\`` tagged
  template from `@core/html` which auto-escapes interpolations.
- **State lives in `store`** (`@core/state`). No ad-hoc globals.
- **Modals use `openModal()`** from `@ui/Modal` (not the legacy `#modal` element).
- **Toasts use `toast.*`** from `@ui/Toast` (not `showNotification`).

### Backend

- **Responses go through `ApiResponse`** (`src/utils/api-response.js`):
  ```js
  return c.json(ApiResponse.success(data));
  return c.json(...ApiResponse.error('Not found', { status: 404 }));
  ```
  Legacy routes continue to use the flat shape for backward compat.

- **Filtered queries use `buildQuery`** (`src/utils/query-builder.js`):
  ```js
  const { sql, params } = buildQuery(
    'SELECT * FROM workouts',
    [filter('user_id = ?', user.id), filter('completed = ?', 1)],
    { orderBy: 'start_time DESC', limit: 20 }
  );
  ```

- **Ownership checks use `assertOwnership`** (`src/middleware/ownership.js`):
  ```js
  const workout = await assertOwnership(db, 'workouts', workoutId, user.id);
  // throws NotFoundError → handled by errorHandler middleware
  ```

- **CSV exports use `csvResponse`** (`src/utils/csv.js`):
  ```js
  return csvResponse({
    filename: 'workouts.csv',
    columns: [{ header: 'Date', get: (r) => r.date }],
    rows
  });
  ```

## Commands

```bash
# Development (runs Vite dev server + wrangler in parallel)
npm run dev

# Run only the Vite dev server (http://localhost:3000) — no API
npm run dev:frontend

# Run only the legacy Cloudflare Worker (http://localhost:8787)
npm run dev:worker

# Legacy-only dev (old build path, Vite not involved)
npm run dev:legacy

# Build for deployment
npm run build

# Tests
npm test                     # run all unit tests once
npm run test:watch           # watch mode
npm run test:ui              # Vitest UI
npm run test:e2e             # Playwright E2E
npm run test:coverage        # coverage report

# Database
npm run db:migrate:local     # apply migrations to local D1
npm run db:migrate           # apply migrations to remote D1
```

## Known remaining work

1. **Complete screen migrations** — the three complex remaining tabs (Workout,
   Active Workout Modal, Log Past Workout) plus the sub-modals listed above.
2. **Remove `onclick` attributes from legacy HTML** that references legacy
   globals, replacing with the bridge-aware event delegation.
3. **Hono v3 → v4 upgrade** — v3 has several CVE advisories we don't currently
   trigger, but upgrading to v4 closes the door.
4. **Replace the bundled-as-string deploy** with Cloudflare Static Assets
   (requires bumping `compatibility_date` to `2024-09-19+` and adding
   `[assets]` binding in `wrangler.toml`).
5. **Replace the three overlapping nutrition systems** — `nutrition_log`,
   `nutrition_entries`, and the newer `meals`/`meal_foods`/`foods` — with a
   single canonical model. All three are still in use.
