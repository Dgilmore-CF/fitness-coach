# AI Fitness Coach

> A comprehensive AI-driven fitness coaching application built on Cloudflare Workers with D1 database, R2 storage, and Workers AI.

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [GitHub Integration & CI/CD](#github-integration--cicd)
- [Deployment Guide](#deployment-guide)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Feature Documentation](#feature-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

AI Fitness Coach is a production-ready, serverless fitness tracking application that leverages cutting-edge technologies to provide personalized workout programs, real-time tracking, and intelligent progression recommendations. Built entirely on Cloudflare's edge network for global performance and scalability.

### Technology Stack

- **Backend**: Cloudflare Workers (Hono framework)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **AI**: Cloudflare Workers AI (Llama 3)
- **Authentication**: Cloudflare Access (JWT)
- **Frontend**: Vanilla JavaScript + Modern CSS

### Equipment Supported

- Smith Machine
- Olympic Bar and Plates
- Functional Cable Trainer
- Leg Extension/Curl Machine
- Rower

---

## Features

### ✅ Complete Feature Set (15/15 Implemented)

1. **Multi-user Support** - Cloudflare Access JWT authentication with SSO
2. **AI-Generated Programs** - Hypertrophy-based programs using Llama 3
3. **Workout Warm-ups** - Auto-matched stretches for each workout day
4. **Exercise Tips** - 40+ exercises with detailed form instructions
5. **Smart Timers** - Set timer, rest timer with audio alarms
6. **Workout Tracking** - Complete set/rep/weight recording
7. **Progress Analytics** - Charts, graphs, and body heat maps
8. **One Rep Max Calculator** - Automatic 1RM using Epley formula
9. **AI Recommendations** - Smart progression suggestions
10. **Historical Data** - Track total volume lifted over time
11. **Apple Health Integration** - API ready for heart rate & calories
12. **Exercise Notes** - Per-exercise note-taking during workouts
13. **Unilateral Exercise Handling** - Proper weight doubling
14. **Nutrition Tracking** - Protein and water with smart goals
15. **Body Map Visualization** - Muscle activation heat maps

### Additional Features

- Responsive mobile-first design
- Real-time timers with Web Audio API
- Program templates (3-7 day splits)
- Historical workout comparison
- Personal records tracking
- Global edge deployment (sub-100ms latency)

---

## Quick Start

Get your AI Fitness Coach up and running in **10 minutes**!

### Prerequisites

- **Cloudflare account** (free tier works!)
- **Node.js 18+** installed
- **GitHub account** (if using CI/CD)
- **10 minutes** of your time

### Choose Your Deployment Method

**Option A: GitHub Actions (Recommended)** - Automatic deployments on every push
**Option B: Manual Deployment** - Deploy directly from your local machine

---

### Option A: GitHub Actions Deployment (Recommended)

**Step 1: Set Up Cloudflare Resources**

```bash
# 1. Navigate to project directory
cd fitness-builder

# 2. Install dependencies
npm install

# 3. Login to Cloudflare
npx wrangler login

# 4. Create D1 database
npx wrangler d1 create fitness-coach-db
# Copy the database_id from output

# 5. Update wrangler.toml with your database_id
# Edit: [[d1_databases]] database_id = "YOUR_ID_HERE"

# 6. Create R2 storage bucket
npx wrangler r2 bucket create fitness-coach-storage
```

> ⚠️ **Note**: Don't set JWT_SECRET yet - the Worker doesn't exist until first deployment!

**Step 2: Set Up GitHub Repository**

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: AI Fitness Coach"

# Create GitHub repository (via GitHub CLI or web)
gh repo create fitness-coach --public --source=. --remote=origin

# Push to GitHub
git push -u origin main
```

**Step 3: Add GitHub Secrets**

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

   **CLOUDFLARE_API_TOKEN**
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Select **"Create Custom Token"**
   - Configure the following permissions:
     
     **Account Permissions:**
     - `Workers Scripts` → **Edit**
     - `D1` → **Edit**
     - `Workers R2 Storage` → **Edit**
     
     **Account Resources:**
     - Include → **All accounts** (or select your specific account)
     
     **TTL (Time to Live):**
     - Leave as default or set expiration as needed
   
   - Click "Continue to summary" → "Create Token"
   - Copy the token immediately (shown only once!)
   - Paste as secret value in GitHub

   **CLOUDFLARE_ACCOUNT_ID**
   - Go to https://dash.cloudflare.com/
   - Copy "Account ID" from right sidebar
   - Paste as secret value

**Step 4: Trigger Initial Deployment**

```bash
# Push to trigger first deployment (creates the Worker)
git commit --allow-empty -m "Initial deployment"
git push
```

Watch the deployment in GitHub **Actions** tab. Wait for it to complete successfully.

**Step 5: Set JWT Secret (After Worker Exists)**

Now that the Worker has been created by GitHub Actions:

```bash
# Generate secure secret
openssl rand -base64 32

# Set the secret (Worker now exists!)
npx wrangler secret put JWT_SECRET
# Paste the generated secret when prompted
```

🎉 **Your app is now fully deployed!** 

- Visit: `https://ai-fitness-coach.YOUR-SUBDOMAIN.workers.dev`
- Future pushes will automatically deploy updates

---

### Option B: Manual Deployment

**Complete Setup:**

```bash
# 1. Navigate to project directory
cd fitness-builder

# 2. Install dependencies
npm install

# 3. Login to Cloudflare
npx wrangler login

# 4. Create D1 database
npx wrangler d1 create fitness-coach-db
# Copy the database_id from output

# 5. Update wrangler.toml with your database_id
# Edit: [[d1_databases]] database_id = "YOUR_ID_HERE"

# 6. Run database migrations
npx wrangler d1 migrations apply fitness-coach-db

# 7. Create R2 storage bucket
npx wrangler r2 bucket create fitness-coach-storage

# 8. Deploy (creates the Worker)
npm run deploy
```

🎉 **Worker created!** Now set the JWT secret:

```bash
# Generate secure secret
openssl rand -base64 32

# Set the secret (Worker now exists!)
npx wrangler secret put JWT_SECRET
# Paste the generated secret when prompted
```

� **Your app is now live!** Visit `https://ai-fitness-coach.YOUR-SUBDOMAIN.workers.dev`

**Future deployments:**
```bash
npm run deploy
```

### First-Time Setup

1. **Configure Cloudflare Access** (for authentication)
   - Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
   - Navigate to Access > Applications > Add an Application
   - Select "Self-hosted" and enter your Worker URL
   - Choose authentication method (Google, GitHub, Email)
   - Create Access Policy

2. **Set Up Your Profile**
   - Click "Profile" button
   - Enter age, height, weight (for AI program generation)

3. **Generate Your First Program**
   - Click "Generate New Program"
   - Select days per week (3-5 recommended)
   - Choose goal (Hypertrophy for muscle growth)
   - Wait 10-15 seconds for AI generation

4. **Start Your First Workout**
   - Go to "Workout" tab
   - Click "Start Workout"
   - Follow warm-up stretches
   - Record sets with weight and reps
   - Use rest timers between sets

---

## GitHub Integration & CI/CD

> 💡 **See [Quick Start - Option A](#option-a-github-actions-deployment-recommended)** for complete setup instructions.

### How It Works

The `.github/workflows/deploy.yml` workflow automatically:

1. **Triggers on**:
   - Every push to `main` branch
   - Pull requests to `main` branch

2. **Deployment steps**:
   - ✅ Checks out your code
   - ✅ Sets up Node.js environment
   - ✅ Installs dependencies (`npm ci`)
   - ✅ Runs database migrations
   - ✅ Deploys Worker to Cloudflare

3. **Authentication**:
   - Uses GitHub Secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
   - Secrets are encrypted and never exposed in logs

### The Workflow File

Already included at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx wrangler d1 migrations apply fitness-coach-db
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - run: npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Key Benefits

- 🚀 **Automatic deployments** - Push to main = instant deployment
- 🔄 **Database migrations** - Automatically applied on each deploy
- ✅ **No manual steps** - Set up once, deploy forever
- 🔒 **Secure** - Secrets never exposed in code or logs
- 📊 **Visibility** - Watch deployments in GitHub Actions tab

### Branch Protection (Recommended)

```bash
# Protect main branch
# GitHub Settings > Branches > Add rule
# - Require pull request reviews
# - Require status checks (GitHub Actions)
# - Require branches to be up to date
```

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/new-feature

# Create Pull Request on GitHub
# CI/CD will run tests and preview deployment

# After approval, merge to main
# Automatic production deployment triggered!
```

---

## Deployment Details

> 💡 **For step-by-step setup**, see [Quick Start](#quick-start) above.

This section covers deployment specifics, configuration details, and advanced topics.

### Understanding the Deployment Process

**What happens when you deploy:**

1. **Code bundling** - Hono app bundled with all routes
2. **Worker upload** - JavaScript uploaded to Cloudflare edge
3. **Binding configuration** - D1, R2, AI bindings connected
4. **Global distribution** - Deployed to 200+ data centers worldwide

### Cloudflare Resources Required

**D1 Database:**
- Stores all user data, workouts, programs
- SQLite-compatible, serverless
- Migrations auto-applied on deploy (with GitHub Actions)

**R2 Storage:**
- Currently unused (reserved for future media uploads)
- Object storage compatible with S3 API

**Workers AI:**
- Used for program generation (Llama 3 model)
- Falls back to templates if unavailable

**Secrets:**
- `JWT_SECRET` - For custom JWT validation (optional)

### Local Development

```bash
# Create local database
wrangler d1 migrations apply fitness-coach-db --local

# Start dev server
npm run dev

# Visit http://localhost:8787
```

**Note**: Cloudflare Access won't work locally. For testing, temporarily modify `src/middleware/auth.js`:

```javascript
export async function authMiddleware(c, next) {
  // DEVELOPMENT ONLY - REMOVE FOR PRODUCTION
  const testUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    age: 30,
    height_cm: 175,
    weight_kg: 75
  };
  
  c.set('user', testUser);
  await next();
}
```

### Environment Variables

Set in `wrangler.toml` under `[vars]`:

```toml
[vars]
ENVIRONMENT = "production"  # or "development"
```

### Monitoring & Logs

```bash
# View live logs
wrangler tail

# Query database
wrangler d1 execute fitness-coach-db --command "SELECT * FROM users"

# Backup database
wrangler d1 execute fitness-coach-db --command ".dump" > backup.sql
```

### Updating Deployment

```bash
# Deploy updates
npm run deploy

# Create new migration
wrangler d1 migrations create fitness-coach-db add_new_feature

# Edit migration file in migrations/
# Then apply:
wrangler d1 migrations apply fitness-coach-db
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Edge Network                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌───────────────┐           │
│  │  Cloudflare  │────────>│  Cloudflare   │           │
│  │   Access     │   JWT   │   Workers     │           │
│  │   (Auth)     │         │   (Hono API)  │           │
│  └──────────────┘         └───────────────┘           │
│                                    │                    │
│              ┌─────────────────────┼────────────────┐  │
│              │                     │                │  │
│              ▼                     ▼                ▼  │
│      ┌──────────────┐     ┌──────────────┐  ┌─────────┐
│      │  Cloudflare  │     │  Cloudflare  │  │   R2    │
│      │     D1       │     │ Workers AI   │  │ Storage │
│      │  (SQLite)    │     │  (Llama 3)   │  │         │
│      └──────────────┘     └──────────────┘  └─────────┘
│                                                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   Web Browser    │
                  │  (SPA Frontend)  │
                  └──────────────────┘
```

### Request Flow

**1. Authentication Flow**
```
User → Cloudflare Access → JWT Generated → Worker validates
  → Creates/fetches user in D1 → Processes API request
```

**2. Program Generation Flow**
```
User requests → Validate input → Fetch exercises from D1
  → Call Workers AI (Llama 3) → Parse response
  → Create program in D1 → Return to user
```

**3. Workout Recording Flow**
```
Start workout → Load exercises → Record sets (with 1RM calc)
  → Complete workout → Calculate totals → AI analysis
  → Generate recommendations
```

### Database Schema

**12 Tables with Full Relational Integrity**

#### Core Tables
- `users` - User profiles (email, name, age, height, weight)
- `programs` - Workout programs (name, days_per_week, goal)
- `program_days` - Days within programs (name, focus)
- `exercises` - Exercise library (40+ exercises)
- `program_exercises` - Exercises assigned to days
- `stretches` - Stretch library (16 stretches)

#### Tracking Tables
- `workouts` - Workout sessions
- `workout_exercises` - Exercises in workouts
- `sets` - Individual sets (weight, reps, 1RM)
- `health_data` - Heart rate, calories
- `nutrition_log` - Daily protein/water
- `ai_recommendations` - AI suggestions

### Frontend Architecture

**State Management:**
```javascript
const state = {
  user: null,
  currentWorkout: null,
  currentProgram: null,
  workoutTimer: null,
  restTimer: null,
  audioContext: null
};
```

**Components:**
- Dashboard (progress stats, quick actions)
- Programs (AI generation, list, details)
- Workout (live tracking, timers, set recording)
- Analytics (charts, body map, trends)
- Nutrition (daily tracking, goals)

### Performance

- **Serverless architecture** - No servers to manage
- **Edge computing** - Global deployment
- **Sub-100ms latency** - Worldwide
- **Auto-scaling** - Handles traffic spikes
- **99.9%+ uptime** - Cloudflare SLA

---

## API Reference

### Base URL

```
https://your-worker.workers.dev/api
```

### Authentication

All API endpoints (except `/auth/login`) require JWT authentication via Cloudflare Access.

**Header:**
```
Cf-Access-Jwt-Assertion: <jwt_token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - Verify JWT and create session
- `GET /api/auth/user` - Get current user profile
- `PUT /api/auth/user` - Update user profile

#### Programs
- `POST /api/programs/generate` - Generate AI workout program
- `GET /api/programs` - List user programs
- `GET /api/programs/:id` - Get program details
- `POST /api/programs/:id/activate` - Set as active program
- `DELETE /api/programs/:id` - Delete program

#### Workouts
- `GET /api/workouts` - List workouts (with pagination)
- `GET /api/workouts/:id` - Get workout details
- `POST /api/workouts` - Start new workout
- `PUT /api/workouts/:id` - Update workout notes
- `POST /api/workouts/:id/complete` - Complete workout
- `POST /api/workouts/:id/exercises` - Add exercise to workout
- `POST /api/workouts/:workoutId/exercises/:exerciseId/sets` - Record set
- `PUT /api/workouts/:workoutId/exercises/:exerciseId/sets/:setId` - Update set
- `DELETE /api/workouts/:workoutId/exercises/:exerciseId/sets/:setId` - Delete set
- `PUT /api/workouts/:workoutId/exercises/:exerciseId/notes` - Update exercise notes

#### Exercises
- `GET /api/exercises` - List all exercises
- `GET /api/exercises/:id` - Get exercise details
- `GET /api/exercises/:id/history` - Get exercise history
- `GET /api/exercises/:id/records` - Get personal records
- `GET /api/exercises/stretches/all` - List all stretches

#### Analytics
- `GET /api/analytics/progress?days=30` - Get progress overview
- `GET /api/analytics/1rm?exercise_id=1` - Get 1RM history
- `GET /api/analytics/volume?days=90&group_by=week` - Get volume trends
- `GET /api/analytics/bodymap?days=7` - Get muscle activation data
- `GET /api/analytics/recommendations` - Get AI recommendations
- `POST /api/analytics/recommendations/:id/respond` - Accept/reject recommendation

#### Nutrition
- `POST /api/nutrition/protein` - Log protein intake
- `POST /api/nutrition/water` - Log water intake
- `GET /api/nutrition/daily?date=2024-01-01` - Get daily nutrition
- `GET /api/nutrition/history?days=30` - Get nutrition history
- `PUT /api/nutrition/daily` - Update daily nutrition

#### Health (Apple Health Integration)
- `POST /api/health/heartrate` - Sync single heart rate reading
- `POST /api/health/heartrate/bulk` - Sync multiple heart rate readings
- `POST /api/health/calories` - Sync calories burned
- `GET /api/health/workout/:id` - Get health data for workout
- `GET /api/health/history?data_type=heart_rate&days=30` - Get health history
- `GET /api/health/stats?days=30` - Get health statistics

### Example API Calls

**Generate AI Program:**
```bash
curl -X POST https://your-worker.workers.dev/api/programs/generate \
  -H "Cf-Access-Jwt-Assertion: YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_per_week": 4, "goal": "hypertrophy"}'
```

**Record a Set:**
```bash
curl -X POST https://your-worker.workers.dev/api/workouts/1/exercises/1/sets \
  -H "Cf-Access-Jwt-Assertion: YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weight_kg": 80, "reps": 10, "rest_seconds": 90}'
```

**Log Protein:**
```bash
curl -X POST https://your-worker.workers.dev/api/nutrition/protein \
  -H "Cf-Access-Jwt-Assertion: YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"grams": 30}'
```

### Response Format

**Success:**
```json
{
  "data": {},
  "message": "Success message"
}
```

**Error:**
```json
{
  "error": "Error message"
}
```

### Rate Limits

- **Free tier**: 100,000 requests/day
- **Paid tier**: Unlimited (usage-based pricing)

---

## Feature Documentation

### 1. Multi-User Support with SSO

**Implementation:**
- Cloudflare Access intercepts all requests
- JWT token contains user email and identity
- Backend auto-creates user accounts on first login
- All data isolated by user ID

**Files:**
- `src/middleware/auth.js`
- `src/routes/auth.js`

### 2. AI-Generated Programs

**How it works:**
- Uses Cloudflare Workers AI (Llama 3)
- Considers user age, height, weight, days per week
- Generates customized workout splits
- Falls back to proven templates if AI unavailable
- Equipment-specific exercises only

**Customization:**
- Days per week: 3-7
- Goals: Hypertrophy, Strength, Endurance
- User parameters for personalization

**Files:**
- `src/services/ai.js`
- `src/routes/programs.js`

### 3. Workout-Specific Warm-ups

**Features:**
- Each program day includes 5 stretches
- Auto-matched to workout muscle groups
- 16 total stretches in database
- Duration and instructions included

**Database:** `stretches` table

### 4. Exercise Tips & Instructions

**Features:**
- 40+ exercises with detailed tips
- Form, technique, and safety guidance
- Collapsible tips in workout interface
- Professional coaching included

**Database:** `exercises.tips` column

### 5. Smart Timers with Alarms

**Features:**
- **Workout Timer**: Tracks total session duration
- **Rest Timer**: Configurable (60s/90s/120s/custom)
- **Auto-start**: Begins after recording set
- **Audio Alarm**: Web Audio API beep when complete
- **AI Rest Times**: Program includes optimal rest per exercise

**Implementation:**
- `startWorkoutTimer()` - Total workout time
- `startRestTimer(seconds)` - Countdown timer
- `playAlarm()` - Audio notification

### 6. Complete Workout Tracking

**Features:**
- Record weight, reps, rest time per set
- Edit and delete sets
- Historical view of all sets
- Set-by-set progression tracking

**Database:** `sets` table

### 7. One Rep Max Calculator

**Formula:** Epley Formula
```javascript
1RM = weight × (1 + reps/30)
```

**Features:**
- Auto-calculated for every set
- Stored in database
- Tracked over time
- Used for progression analysis

**Database:** `sets.one_rep_max_kg`

### 8. AI Progression Recommendations

**Types:**
- **increase_weight**: When hitting 12+ reps consistently
- **decrease_weight**: When struggling with low reps (<6)
- **increase_volume**: When not enough sets performed

**Analysis:**
- Analyzes completed workouts
- Compares to historical data
- Provides reasoning for each suggestion

**Database:** `ai_recommendations` table

### 9. Total Weight Tracking

**Features:**
- Calculates sum of (weight × reps) for all sets
- **Unilateral exercises**: Automatically doubles weight
- Stored with each workout
- Used for historical comparison

**Formula:**
```javascript
if (exercise.is_unilateral) {
  volume = weight * reps * 2;
} else {
  volume = weight * reps;
}
```

### 10. Charts, Graphs & Body Maps

**Features:**
- **Volume Trends**: Weekly/monthly charts
- **Frequency Chart**: Workout frequency over time
- **Top Exercises**: Ranked by total volume
- **Body Heat Map**: Visual muscle activation
  - Color intensity based on volume
  - Shows sets per muscle group
  - Configurable time range (7/30/90 days)

**Files:** `src/routes/analytics.js`

### 11. Exercise Notes

**Features:**
- Add notes to any exercise during workout
- Notes saved with workout session
- View historical notes
- Track form cues and adjustments

**Database:** `workout_exercises.notes`

### 12. Apple Health Integration

**Status:** API Ready (iOS app required)

**Endpoints:**
- `POST /api/health/heartrate/bulk` - Sync heart rate
- `POST /api/health/calories` - Sync calories
- `GET /api/health/workout/:id` - Get workout health data

**Implementation Required:**
- iOS app with HealthKit
- Real-time syncing during workout
- Background data collection

### 13. Unilateral Exercise Handling

**Features:**
- Exercises marked as `is_unilateral` in database
- Weight automatically doubled in calculations
- Accurate volume tracking
- Clearly labeled in UI

**Examples:**
- Single Leg Extension
- Single Leg Curl
- Cable Single Arm Row
- Cable Lateral Raise
- Smith Machine Lunges

### 14. Nutrition Tracking

**Features:**
- Daily protein tracking (grams)
- Daily water tracking (ml)
- Auto-calculated goals:
  - Protein: 2g per kg body weight
  - Water: 35ml per kg body weight
- Quick-add buttons
- Progress bars
- Historical tracking

**Database:** `nutrition_log` table

### 15. Body Map Visualization

**Features:**
- Visual heat map of muscle activation
- Color intensity based on workout volume
- Shows exercise count per muscle group
- Configurable time range
- Identifies muscle imbalances

---

## Troubleshooting

### Common Issues

#### "Unauthorized - No JWT token"

**Solution:**
- Ensure Cloudflare Access is configured
- Check Worker domain is protected by Access
- Verify you're signed in through Access
- Test JWT header: `curl -I https://your-worker.workers.dev`

#### "Database not found"

**Solutions:**
```bash
# Check database exists
npx wrangler d1 list

# Verify database_id in wrangler.toml
cat wrangler.toml | grep database_id

# Re-run migrations
npx wrangler d1 migrations apply fitness-coach-db
```

#### "Cannot find exercise"

**Solution:**
```bash
# Re-seed exercises
npx wrangler d1 execute fitness-coach-db --file migrations/0002_seed_exercises.sql
```

#### AI Program Generation Fails

**Solution:**
- App automatically falls back to proven templates
- Check Cloudflare Workers AI is enabled in account
- Verify AI binding in wrangler.toml
- Templates are fully functional

#### npm install warnings

**Safe to ignore:**
- Deprecated package warnings (transitive dependencies)
- Security vulnerabilities in dev dependencies
- These don't affect production Workers

**Do NOT run:** `npm audit fix --force` (can cause breaking changes)

#### Local development without Cloudflare Access

**Solution:**
Temporarily modify `src/middleware/auth.js`:
```javascript
export async function authMiddleware(c, next) {
  // DEVELOPMENT ONLY
  c.set('user', {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    age: 30,
    height_cm: 175,
    weight_kg: 75
  });
  await next();
}
```

**Remember:** Remove this before production deployment!

### Debugging Commands

```bash
# View live logs
wrangler tail

# Test database connection
wrangler d1 execute fitness-coach-db --command "SELECT * FROM users LIMIT 5"

# Check D1 migrations status
wrangler d1 migrations list fitness-coach-db

# Test API endpoint
curl -X GET https://your-worker.workers.dev/api/exercises

# Backup database
wrangler d1 execute fitness-coach-db --command ".dump" > backup-$(date +%Y%m%d).sql

# Restore database
wrangler d1 execute fitness-coach-db --file backup.sql
```

### Performance Issues

**Check:**
- Database indexes (already optimized in schema)
- Query efficiency in `wrangler tail`
- Cloudflare Analytics dashboard
- CPU time per request

**Optimize:**
- Use pagination for large datasets
- Cache static data (exercises, stretches)
- Batch database operations
- Use proper indexes

### Getting Help

1. **Check logs**: `wrangler tail`
2. **Review database**: Query D1 directly
3. **Test endpoints**: Use curl or Postman
4. **GitHub Issues**: Report bugs with logs
5. **Cloudflare Discord**: Community support

---

## Contributing

### Development Setup

```bash
# Fork repository on GitHub
gh repo fork YOUR_USERNAME/fitness-coach

# Clone your fork
git clone https://github.com/YOUR_USERNAME/fitness-coach.git
cd fitness-coach

# Install dependencies
npm install

# Create feature branch
git checkout -b feature/amazing-feature

# Set up local database
npx wrangler d1 migrations apply fitness-coach-db --local

# Start dev server
npm run dev
```

### Coding Standards

- **JavaScript**: ES6+ syntax
- **Formatting**: Consistent indentation (2 spaces)
- **Comments**: Document complex logic
- **Commits**: Descriptive commit messages
- **Testing**: Test changes locally

### Pull Request Process

1. **Update documentation** if needed
2. **Test thoroughly** in local environment
3. **Commit with clear messages**:
   ```bash
   git commit -m "feat: Add exercise video support"
   ```
4. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Create Pull Request** on GitHub
6. **Describe changes** clearly in PR description
7. **Wait for review** and CI/CD checks

### Feature Requests

Open an issue with:
- Clear description of feature
- Use case / benefit
- Implementation ideas (optional)

### Bug Reports

Include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable
- Environment (browser, OS)

---

## Costs & Pricing

### Cloudflare Free Tier (Sufficient for Personal Use)

- **Workers**: 100,000 requests/day
- **D1 Database**: 5GB storage, 5M reads/day, 100K writes/day
- **R2 Storage**: 10GB storage, 1M Class A operations/month
- **Workers AI**: Beta pricing (check current rates)

### Paid Tiers (If Needed)

- **Workers**: $5/month for 10M requests
- **D1**: $0.50/month per million reads (beyond free tier)
- **R2**: $0.015/GB storage per month
- **Workers AI**: Pay-per-request (varies by model)

### Estimated Costs for Different Usage

**Single User:**
- Free tier sufficient
- $0/month

**Small Team (5-10 users):**
- Likely stays in free tier
- $0-5/month

**Growing Community (50+ users):**
- May exceed free tier on some services
- $10-20/month estimated

### Cost Optimization Tips

1. **Use caching** - Reduce database queries
2. **Batch operations** - Group multiple writes
3. **Optimize AI calls** - Use template fallbacks
4. **Monitor usage** - Cloudflare Analytics dashboard

---

## Project Structure

```
fitness-builder/
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline
├── migrations/
│   ├── 0001_initial_schema.sql  # Database schema
│   └── 0002_seed_exercises.sql  # Exercise & stretch data
├── public/
│   └── app.js                   # Frontend application (4000+ lines)
├── src/
│   ├── index.js                 # Main Worker entry point
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── static.js            # Serve frontend HTML
│   ├── routes/
│   │   ├── auth.js              # User authentication
│   │   ├── programs.js          # Program management
│   │   ├── workouts.js          # Workout tracking
│   │   ├── exercises.js         # Exercise library
│   │   ├── analytics.js         # Progress analytics
│   │   ├── nutrition.js         # Nutrition tracking
│   │   └── health.js            # Apple Health sync
│   └── services/
│       └── ai.js                # AI program generation
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── wrangler.toml                # Cloudflare configuration
└── README.md                    # This file
```

---

## Security Considerations

### Authentication
- ✅ Cloudflare Access for primary auth
- ✅ JWT validation on all API requests
- ✅ User data isolation (all queries filtered by user_id)
- ✅ SQL injection protection (parameterized queries)

### Best Practices
- ✅ Input validation on all endpoints
- ✅ Rate limiting (via Cloudflare)
- ✅ HTTPS only (enforced by Workers)
- ✅ No sensitive data in logs
- ✅ Secrets stored in Wrangler secrets (not in code)

### Recommendations
- Use strong JWT secret (32+ characters)
- Enable Cloudflare Access for production
- Regularly backup D1 database
- Monitor logs for suspicious activity
- Keep dependencies updated

---

## Roadmap & Future Enhancements

### Planned Features
- [ ] Exercise demonstration videos
- [ ] Social features (share workouts, follow friends)
- [ ] Advanced analytics (machine learning predictions)
- [ ] Meal planning and macro tracking
- [ ] Native mobile apps (iOS/Android)
- [ ] Integration with fitness wearables (Fitbit, Garmin)
- [ ] Form check AI using computer vision
- [ ] Workout challenges and achievements
- [ ] Export data to CSV/PDF
- [ ] Progressive Web App (PWA) support

### Community Requests
- Open issues on GitHub to suggest features
- Vote on existing feature requests
- Contribute implementations via PRs

---

## License

MIT License

Copyright (c) 2024 AI Fitness Coach

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Acknowledgments

- **Cloudflare** - For the amazing edge platform
- **Hono** - Lightweight and fast web framework
- **Font Awesome** - Beautiful icons
- **Community** - For feedback and contributions

---

## Support & Contact

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/fitness-coach/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/fitness-coach/discussions)
- **Email**: your-email@example.com

---

**🎯 Start your fitness journey with AI-powered coaching today!**

Train smart. Track progress. Achieve your goals. 💪
