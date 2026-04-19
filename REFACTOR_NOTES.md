# v2 Refactor Notes

This document captures the final architecture, conventions, and completed
work of the v2 modernization refactor (branch: `refactor/v2-modernization`).

## TL;DR

- **Goal**: Professional, modular, AI-first fitness coaching app.
- **Strategy**: Complete rewrite of the monolithic `public/app.js` into a
  modular frontend; backend hardening; database schema cleanup; Cloudflare
  Static Assets migration.
- **Status**: **Complete.** All 10 screens migrated, all sub-modals
  migrated, Hono v3 → v4 upgraded, Cloudflare Static Assets active,
  real-time AI coaching fully integrated.
- **Tests**: 81 passing unit tests; Playwright E2E smoke tests ready.

## Final metrics

| Metric                        | Before       | After        | Change  |
|-------------------------------|--------------|--------------|---------|
| Legacy `public/app.js`        | 12,732 lines | 313 lines    | −97%    |
| Legacy bundle size            | 615 KB       | 11 KB        | −98%    |
| Worker deploy bundle          | 1,020 KB     | 337 KB       | −67%    |
| Worker gzipped                | 201 KB       | 69 KB        | −66%    |
| Unit tests                    | 0            | 81 passing   | —       |
| Hono version                  | 3.11.7       | 4.12.14      | +22 CVEs fixed |
| Database indexes              | —            | +15 added    | —       |

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                        User browser                          │
│                                                              │
│   HTML shell (frontend/index.html)                           │
│       │                                                      │
│       ├─► /app.js (313-line compat shim)                     │
│       │       — theme, tabs, mobile menu, bootstrap          │
│       │                                                      │
│       └─► /assets/index-*.js (Vite bundle)                   │
│                — modular screens, features, UI components    │
│                                                              │
│   Runtime: bridge.js overrides window.loadDashboard,         │
│   window.loadPrograms, etc. with modular implementations.    │
└──────────────────────────────────────────────────────────────┘
                           │
                   /api/* requests
                           ▼
┌──────────────────────────────────────────────────────────────┐
│   Cloudflare Worker (Hono 4)                                 │
│       ├─► routes/auth.js, programs.js, workouts.js, …        │
│       ├─► services/ai-coach.js, ai-realtime.js, …            │
│       ├─► utils/api-response.js, query-builder.js, csv.js    │
│       └─► middleware/auth.js, error-handler.js, ownership.js │
└──────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    D1 (SQLite)      Workers AI       R2 Storage
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│   Cloudflare Static Assets                                   │
│   Serves /, /index.html, /app.js, /assets/* from frontend-dist│
└──────────────────────────────────────────────────────────────┘
```

## Directory layout

```
fitness-builder/
├── frontend/                    # Modular frontend source (Vite root)
│   ├── index.html               # Clean HTML shell, uses data-action delegation
│   ├── public/
│   │   └── app.js               # 313-line legacy compat shim
│   ├── content/
│   │   └── learn.html           # Extracted static content
│   ├── css/                     # Design system + component styles
│   └── src/
│       ├── main.js              # Vite entry, registers screens with bridge
│       ├── bridge.js            # Runtime override system for legacy globals
│       ├── core/                # Component, state, api, router, events, html
│       ├── utils/               # conversions, formatters, validators, audio, volume
│       ├── ui/                  # Modal, Toast, LoadingOverlay, ProgressRing, Chart, Timer
│       ├── screens/             # 10 migrated main-tab screens
│       └── features/
│           ├── active-workout/  # Full exercise modal with 5 files
│           ├── past-workout/    # Log past workout flow
│           ├── ai-coach/        # Pre-workout preview + live overlay + analysis modals
│           ├── analytics/       # Export center + advanced analytics
│           ├── nutrition/       # Meal logger, saved meals, barcode scanner
│           ├── workout-calendar.js
│           ├── view-workout.js
│           ├── exercise-history.js
│           └── start-workout.js (incl. cardio)
│
├── src/                         # Cloudflare Worker backend
│   ├── index.js                 # Hono v4 app entry
│   ├── middleware/              # auth, error-handler, ownership
│   ├── routes/                  # 11 API route files
│   ├── services/
│   │   ├── ai-coach.js          # Post-workout analysis
│   │   ├── ai-realtime.js       # Pre/mid-workout AI helpers
│   │   ├── achievements.js
│   │   └── email-reports.js
│   └── utils/                   # Shared utilities
│       ├── api-response.js      # Canonical response envelope
│       ├── query-builder.js     # filter() + buildQuery() + partial UPDATE
│       ├── csv.js               # csvResponse() helper
│       ├── ai-parser.js         # parseAIJsonResponse() + callAI()
│       └── volume.js            # Unilateral-aware SQL fragment
│
├── tests/
│   ├── unit/                    # 81 passing Vitest tests
│   └── e2e/                     # Playwright smoke tests
│
├── migrations/                  # 26 D1 SQL migrations
│   ├── README.md                # Explains duplicate numbers + nutrition model
│   └── 0026_schema_cleanup.sql  # Indexes, FK cascades, UNIQUE constraints
│
├── vite.config.js               # Vite config + dev proxy
├── vitest.config.js             # Vitest config
├── playwright.config.js         # Playwright config
├── wrangler.toml                # Now includes [assets] binding + Hono 4 compat
└── frontend-dist/               # Vite build output (gitignored)
```

## Build pipeline

```
npm run build
  └── vite build
        ├── Bundles frontend/src/ → frontend-dist/assets/index-*.js + index-*.css
        ├── Copies frontend/public/app.js → frontend-dist/app.js
        └── Generates frontend-dist/index.html with asset refs

npm run deploy:direct
  ├── npm run build
  └── wrangler deploy
        ├── Bundles src/index.js (Worker) → 337 KB
        └── Uploads frontend-dist/ as Static Assets
```

## The bridge pattern

The bridge lets the Vite bundle take over legacy global functions. It's
still present and used by the compat shim in `frontend/public/app.js`
(which calls `window.loadDashboard`, `window.loadPrograms`, etc.), but
now every screen registers a modular implementation.

```js
// frontend/src/main.js
registerScreen('dashboard', 'loadDashboard', loadDashboard);
registerScreen('program', 'loadPrograms', loadPrograms);
// … 40+ registrations total
initBridge(); // installs overrides on DOMContentLoaded
```

## Migration status — all complete

| Area | Status |
|---|---|
| Learn | ✅ migrated |
| Achievements | ✅ migrated |
| Dashboard | ✅ migrated |
| Profile | ✅ migrated (uses new Modal) |
| Programs (list/view/AI/builder/rename) | ✅ migrated |
| Analytics main view | ✅ migrated |
| Nutrition main view | ✅ migrated (progress rings) |
| AI Coach / Insights | ✅ migrated (chat UI) |
| Workout tab overview | ✅ migrated |
| Active Workout Modal | ✅ migrated (5-file feature dir) |
| Log Past Workout | ✅ migrated |
| Workout Calendar + View Workout | ✅ migrated |
| Exercise History | ✅ migrated |
| Start Workout + Cardio | ✅ migrated |
| Export Center + PDF Reports | ✅ migrated |
| Advanced Analytics + AI Coaching Analysis | ✅ migrated |
| Meal Logger + Food Search + Barcode Scanner | ✅ migrated |
| Saved Meals + Quick Macros + Entries Editor | ✅ migrated |

## Phase 4: Real-time AI coaching (fully integrated)

- `GET /api/ai/realtime/preview/:dayId` — Pre-workout briefing (readiness + weights)
- `GET /api/ai/realtime/predict/:exId`  — Smart next-set prediction
- `POST /api/ai/realtime/analyze`       — Post-set coaching tips
- Pre-workout briefing modal fires before the warmup screen
- Live AI coach overlay stays mounted during workouts and analyzes every set
- 13 unit tests for the realtime AI logic

## Database improvements

Migration `0026_schema_cleanup.sql`:
- 15 missing indexes added (workouts, exercises, sets, nutrition, meals, AI recs)
- Dropped `idx_programs_description` (useless free-text index)
- `UNIQUE(name, equipment)` on exercises prevents duplicates
- `ON DELETE CASCADE` added to `user_achievements` and `workout_streaks`

Fixed broken queries in `src/routes/exports.js` (referenced columns that
don't exist: `recorded_at`, `is_active`, `is_warmup`).

Fixed migration `0022_remove_all_duplicate_exercises.sql` which referenced
`ai_recommendations.exercise_id` (dropped by migration 0009) — was silently
failing in CI.

## Security & compliance

- **Hono 3 → 4 upgrade** closes all 22 known Hono CVEs.
- **HTML escaping**: all user data goes through the `html\`\`` tagged template
  which auto-escapes interpolations. The legacy `innerHTML = \`${userdata}\``
  pattern is completely eliminated.
- **No inline event handlers** in the HTML shell — everything uses
  `data-action` delegation.

## Commands

```bash
# Development
npm run dev                  # Vite dev + wrangler dev in parallel
npm run dev:frontend         # just Vite (:3000)
npm run dev:worker           # just wrangler (:8787)

# Build + deploy
npm run build                # Vite build → frontend-dist/
npm run deploy:direct        # Build + wrangler deploy

# Tests
npm test                     # 81 unit tests
npm run test:watch           # Watch mode
npm run test:ui              # Vitest UI
npm run test:e2e             # Playwright E2E
npm run test:coverage        # Coverage report

# Database
npm run db:migrate:local     # Apply migrations to local D1
npm run db:migrate           # Apply migrations to remote D1
```

## Future work (not blocking)

- Bump wrangler to v4.83+ (current 4.77 works; just dev-dependency refresh)
- Upgrade Vite to v6 (closes esbuild dev-only CVE; requires some config tweaks)
- Add Playwright tests covering the full workout → rest → PR celebration flow
- Consider dropping jsPDF + html2canvas CDN deps in favor of a Worker-side
  PDF generation service
