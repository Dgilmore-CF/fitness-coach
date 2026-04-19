# Database Migrations

Cloudflare D1 migrations for the fitness-coach database. Applied via
`wrangler d1 migrations apply fitness-coach-db` (prod) or
`wrangler d1 migrations apply fitness-coach-db --local` (dev).

## ⚠ Known Issue: Duplicate Migration Numbers

There are three pairs of migrations sharing the same numeric prefix:

| # | Files                                                               |
|---|---------------------------------------------------------------------|
| 2 | `0002_nutrition_entries.sql`, `0002_seed_exercises.sql`              |
| 3 | `0003_add_incline_exercises.sql`, `0003_add_measurement_system.sql`  |
| 4 | `0004_add_creatine_tracking.sql`, `0004_add_landmine_exercises.sql`  |

**The files are NOT renamed** even though renaming would be cleaner, because
D1 tracks applied migrations by filename. Renaming would cause the system to
re-apply them, which would:

- Duplicate `INSERT INTO exercises` rows
- Fail on `ALTER TABLE ADD COLUMN` for already-added columns

**Effective execution order** is filename-alphabetical within each number:

- `0002_nutrition_entries.sql` runs before `0002_seed_exercises.sql`
- `0003_add_incline_exercises.sql` runs before `0003_add_measurement_system.sql`
- `0004_add_creatine_tracking.sql` runs before `0004_add_landmine_exercises.sql`

None of the pairs depend on each other (different tables/operations), so the
alphabetical order is safe. New migrations should use unique numbers going
forward.

## Migration Index

| # | File | Purpose |
|---|------|---------|
| 0001 | initial_schema | Core tables: users, programs, workouts, exercises, sets |
| 0002a | nutrition_entries | Timestamped protein/water/creatine entries |
| 0002b | seed_exercises | Exercise library seed data |
| 0003a | add_incline_exercises | Additional incline exercises |
| 0003b | add_measurement_system | `users.measurement_system` column |
| 0004a | add_creatine_tracking | `nutrition_log.creatine_grams` column |
| 0004b | add_landmine_exercises | Landmine exercise variations |
| 0005 | add_achievements_system | achievement_definitions, user_achievements, workout_streaks, personal_records |
| 0006 | add_gender_field | `users.gender` column |
| 0007 | add_program_description | `programs.description` column |
| 0008 | fix_personal_records_cascade | Recreate personal_records with proper CASCADE |
| 0009 | add_ai_recommendations | Redefine ai_recommendations table (drop & recreate) |
| 0010 | add_perceived_exertion | `workouts.perceived_exertion` column |
| 0011 | add_cable_arm_exercises | More exercise variations |
| 0012 | add_core_and_tricep_exercises | More exercise variations |
| 0013 | add_cardio_exercises | Cardio exercises |
| 0014 | add_cardio_tracking_fields | Cardio fields on sets table |
| 0015 | add_ai_coach_conversations | AI coach chat history table |
| 0016 | add_reverse_cable_fly | Single exercise addition |
| 0017 | add_email_reports | email_report_preferences table |
| 0018 | add_bodyweight_exercises | Bodyweight exercise variations |
| 0019 | add_program_custom_instructions | `programs.custom_instructions` column |
| 0020 | add_cardio_day_support | `program_days.is_cardio_day` + `program_day_cardio_sessions` |
| 0021 | remove_duplicate_exercises | Cleanup pass 1 |
| 0022 | remove_all_duplicate_exercises | Cleanup pass 2 |
| 0023 | nutrition_tracking_schema | foods, meals, meal_foods, macro_targets, food_densities, etc. |
| 0024 | nutrition_seed_data | Seed nutrition database |
| 0025 | saved_meals | saved_meals + saved_meal_foods tables |
| 0026 | schema_cleanup | Indexes, UNIQUE constraints, FK cascade fixes (Phase 2 refactor) |

## Creating New Migrations

```bash
wrangler d1 migrations create fitness-coach-db "your_migration_name"
```

Use unique sequential numbers (next available: 0027).
