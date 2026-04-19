/**
 * Achievements screen — stats overview, recent PRs, earned badges, streak.
 *
 * Ported from the legacy loadAchievements() function (164 lines) in
 * public/app.js. Behaviour preserved; markup uses the new component classes
 * and design tokens rather than inline gradients.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { formatDate } from '@utils/formatters';
import { formatWeight } from '@utils/formatters';

const CATEGORY_ICONS = {
  consistency: '🔥',
  strength: '💪',
  volume: '📊',
  milestone: '⭐'
};

const CATEGORY_LABELS = {
  consistency: 'Consistency',
  strength: 'Strength',
  volume: 'Volume',
  milestone: 'Milestones'
};

const TIER_CLASSES = {
  bronze: 'tier-bronze',
  silver: 'tier-silver',
  gold: 'tier-gold',
  platinum: 'tier-platinum'
};

function groupByCategory(earned) {
  const groups = {};
  for (const ach of earned) {
    const key = ach.category || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(ach);
  }
  return groups;
}

function computeImprovement(record, previous) {
  if (!previous || previous === 0) {
    return { text: 'First PR!', isFirst: true };
  }
  const pct = ((record - previous) / previous) * 100;
  return {
    text: `+${pct.toFixed(1)}%`,
    isFirst: false
  };
}

function renderStatsGrid({ currentWeeks, longestWeeks, totalWorkouts, totalPRs, earnedCount }) {
  return html`
    <div class="grid grid-cols-auto">
      <div class="stat-card stat-card-gradient-1">
        <div class="stat-icon">🔥</div>
        <div class="stat-value">${currentWeeks}</div>
        <div class="stat-label">Week Streak</div>
        <div class="stat-meta">Best: ${longestWeeks} weeks</div>
      </div>
      <div class="stat-card stat-card-gradient-2">
        <div class="stat-icon">💪</div>
        <div class="stat-value">${totalWorkouts}</div>
        <div class="stat-label">Total Workouts</div>
      </div>
      <div class="stat-card stat-card-gradient-3">
        <div class="stat-icon">📈</div>
        <div class="stat-value">${totalPRs}</div>
        <div class="stat-label">Personal Records</div>
      </div>
      <div class="stat-card stat-card-gradient-4">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">${earnedCount}</div>
        <div class="stat-label">Achievements Earned</div>
      </div>
    </div>
  `;
}

function renderPRTable(prs) {
  if (!prs || prs.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-icon">🏋️</div>
        <div class="empty-state-title">No personal records yet</div>
        <div class="empty-state-description">Complete workouts to start setting PRs.</div>
      </div>
    `;
  }

  return html`
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Type</th>
            <th>Record</th>
            <th>Previous</th>
            <th>Improvement</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${prs.map((pr) => {
            const { text: improvement, isFirst } = computeImprovement(pr.record_value, pr.previous_value);
            return html`
              <tr>
                <td><strong>${pr.exercise_name}</strong></td>
                <td><span class="badge">${String(pr.record_type || '').toUpperCase()}</span></td>
                <td><strong class="text-success">${formatWeight(pr.record_value)}</strong></td>
                <td>${pr.previous_value ? formatWeight(pr.previous_value) : '—'}</td>
                <td>
                  <span class="${isFirst ? 'text-primary' : 'text-success'}" style="font-weight: var(--font-bold);">
                    ${improvement}
                  </span>
                </td>
                <td>${formatDate(pr.achieved_at)}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}

function renderAchievementGroups(groups) {
  const categories = Object.keys(groups);
  if (categories.length === 0) {
    return html`
      <div class="empty-state">
        <div class="empty-state-icon">🏆</div>
        <div class="empty-state-title">No achievements yet</div>
        <div class="empty-state-description">Complete workouts to unlock your first achievement.</div>
      </div>
    `;
  }

  return html`
    <div class="stack stack-lg">
      ${categories.map((category) => {
        const achievements = groups[category];
        return html`
          <div>
            <h4 class="achievements-category-title">
              <span>${CATEGORY_ICONS[category] || '⭐'}</span>
              ${CATEGORY_LABELS[category] || category}
            </h4>
            <div class="grid grid-cols-auto">
              ${achievements.map((ach) => html`
                <div class="achievement-card ${TIER_CLASSES[ach.tier] || ''}">
                  <div class="achievement-icon">${ach.icon || '🏅'}</div>
                  <div class="achievement-name">${ach.name}</div>
                  <div class="achievement-description">${ach.description}</div>
                  <div class="achievement-date">
                    <i class="fas fa-calendar"></i> ${formatDate(ach.earned_at)}
                  </div>
                </div>
              `)}
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

function renderStreakCard(streak, currentWeeks, longestWeeks) {
  if (!streak.current_streak || streak.current_streak <= 0) return '';

  return html`
    <div class="streak-card">
      <div class="streak-row">
        <div class="streak-metric">
          <div class="stat-label">Current Streak</div>
          <div class="streak-value text-primary">
            ${currentWeeks} ${currentWeeks === 1 ? 'Week' : 'Weeks'}
          </div>
        </div>
        <div class="streak-metric">
          <div class="stat-label">Longest Streak</div>
          <div class="streak-value text-success">
            ${longestWeeks} ${longestWeeks === 1 ? 'Week' : 'Weeks'}
          </div>
        </div>
        <div class="streak-metric">
          <div class="stat-label">Since</div>
          <div class="streak-value-small">${formatDate(streak.streak_start_date)}</div>
        </div>
      </div>
      ${streak.last_workout_date
        ? html`<div class="text-muted" style="font-size: var(--text-sm);">
            Last workout: ${formatDate(streak.last_workout_date)}
          </div>`
        : ''}
    </div>
  `;
}

function renderErrorState(message) {
  return html`
    <div class="card">
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Couldn't load achievements</div>
        <div class="empty-state-description">${message}</div>
      </div>
    </div>
  `;
}

function renderLoadingState() {
  return html`
    <div class="card">
      <div class="grid grid-cols-auto">
        ${[1, 2, 3, 4].map(() => html`<div class="skeleton skeleton-card"></div>`)}
      </div>
    </div>
  `;
}

/**
 * Main entry — fetches data and renders into the #achievements container.
 */
export async function loadAchievements() {
  const container = document.getElementById('achievements');
  if (!container) return;

  container.innerHTML = String(renderLoadingState());

  try {
    const [achievementsData, prsData, streakData] = await Promise.all([
      api.get('/achievements'),
      api.get('/achievements/prs?limit=10'),
      api.get('/achievements/streak')
    ]);

    const earned = achievementsData.earned || [];
    const stats = achievementsData.stats || { totalWorkouts: 0, totalPRs: 0 };
    const prs = prsData.prs || [];
    const streak = streakData.streak || {};

    const currentWeeks = Math.floor((streak.current_streak || 0) / 7);
    const longestWeeks = Math.floor((streak.longest_streak || 0) / 7);

    const groups = groupByCategory(earned);

    container.innerHTML = String(html`
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <i class="fas fa-trophy"></i> Achievements &amp; Challenges
          </h2>
        </div>

        ${renderStatsGrid({
          currentWeeks,
          longestWeeks,
          totalWorkouts: stats.totalWorkouts || 0,
          totalPRs: stats.totalPRs || 0,
          earnedCount: earned.length
        })}

        <div class="divider"></div>

        <section class="stack-md">
          <h3 class="section-title">
            <i class="fas fa-medal"></i> Recent Personal Records
          </h3>
          ${renderPRTable(prs)}
        </section>

        <div class="divider"></div>

        <section class="stack-md">
          <h3 class="section-title">
            <i class="fas fa-award"></i> Earned Achievements
          </h3>
          ${renderAchievementGroups(groups)}
        </section>

        ${streak.current_streak > 0
          ? html`
              <div class="divider"></div>
              <section class="stack-md">
                <h3 class="section-title">
                  <i class="fas fa-fire"></i> Workout Streak
                </h3>
                ${renderStreakCard(streak, currentWeeks, longestWeeks)}
              </section>
            `
          : ''}
      </div>
    `);
  } catch (error) {
    console.error('Error loading achievements:', error);
    container.innerHTML = String(renderErrorState(error.message));
  }
}
