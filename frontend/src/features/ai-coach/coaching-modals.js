/**
 * AI Coach extras — full coaching analysis modal, per-exercise coaching,
 * saved conversations, chat send.
 *
 * Migrated from sendAIChat, askQuickQuestion, generateAICoaching,
 * getExerciseCoaching.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { openModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { withLoading } from '@ui/LoadingOverlay';

function formatText(text) {
  if (!text) return '';
  // Simple markdown-like formatting
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  formatted = formatted.replace(/\n(?!<\/?(ul|li)>)/g, '<br>');
  return formatted;
}

/**
 * Full AI coaching analysis modal — displays comprehensive analysis from
 * the /api/ai/coach/generate endpoint.
 */
export async function generateAICoaching() {
  try {
    const analysis = await withLoading('Generating coaching analysis…', async () => {
      return await api.post('/ai/coach/generate');
    });

    const data = analysis.data || {};

    openModal({
      title: 'Your AI Coaching Analysis',
      size: 'wide',
      content: String(html`
        <div class="stack stack-lg">
          ${data.overall_assessment
            ? html`
                <div class="ai-coaching-section ai-coaching-hero">
                  <h3><i class="fas fa-brain"></i> Overall Assessment</h3>
                  <div class="ai-coaching-content">${raw(formatText(data.overall_assessment))}</div>
                </div>
              `
            : ''}

          ${data.strengths?.length
            ? html`
                <div class="ai-coaching-section">
                  <h3 class="text-success"><i class="fas fa-check-circle"></i> Your Strengths</h3>
                  <ul>${data.strengths.map((s) => html`<li>${s}</li>`)}</ul>
                </div>
              `
            : ''}

          ${data.recommendations?.length
            ? html`
                <div class="ai-coaching-section">
                  <h3 class="text-primary"><i class="fas fa-lightbulb"></i> Recommendations</h3>
                  <div class="stack stack-sm">
                    ${data.recommendations.map((r) => html`
                      <div class="insight-card insight-${r.priority || 'medium'}">
                        <strong>${r.title}</strong>
                        <p class="text-muted" style="margin-top: var(--space-1); font-size: var(--text-sm);">${r.description}</p>
                        ${r.action ? html`<p class="text-primary" style="margin-top: var(--space-2); font-size: var(--text-sm);"><i class="fas fa-arrow-right"></i> ${r.action}</p>` : ''}
                      </div>
                    `)}
                  </div>
                </div>
              `
            : ''}

          ${data.action_steps?.length
            ? html`
                <div class="ai-coaching-section">
                  <h3 class="text-warning"><i class="fas fa-tasks"></i> Action Steps</h3>
                  <ol>${data.action_steps.map((s) => html`<li>${s}</li>`)}</ol>
                </div>
              `
            : ''}
        </div>
      `),
      actions: [
        { label: 'Close', primary: true, variant: 'btn-primary' }
      ]
    });
  } catch (err) {
    toast.error(`Coaching analysis failed: ${err.message}`);
  }
}

/**
 * Per-exercise coaching modal — AI analysis of a specific exercise progression.
 */
export async function getExerciseCoaching(exerciseId, exerciseName) {
  try {
    const result = await withLoading(`Analyzing ${exerciseName}…`, async () => {
      return await api.get(`/ai/coach/exercise/${exerciseId}`);
    });
    const data = result.data || {};

    openModal({
      title: `Coaching: ${exerciseName}`,
      size: 'default',
      content: String(html`
        <div class="stack stack-md">
          ${data.analysis
            ? html`
                <div class="ai-coaching-section">
                  <h3><i class="fas fa-chart-line"></i> Analysis</h3>
                  <div class="ai-coaching-content">${raw(formatText(data.analysis))}</div>
                </div>
              `
            : ''}

          ${data.form_cues?.length
            ? html`
                <div class="ai-coaching-section">
                  <h3 class="text-primary"><i class="fas fa-dumbbell"></i> Form Cues</h3>
                  <ul>${data.form_cues.map((c) => html`<li>${c}</li>`)}</ul>
                </div>
              `
            : ''}

          ${data.progression_plan
            ? html`
                <div class="ai-coaching-section">
                  <h3 class="text-success"><i class="fas fa-arrow-up"></i> Progression Plan</h3>
                  <div class="ai-coaching-content">${raw(formatText(data.progression_plan))}</div>
                </div>
              `
            : ''}

          ${data.warnings?.length
            ? html`
                <div class="ai-coaching-section">
                  <h3 class="text-danger"><i class="fas fa-exclamation-triangle"></i> Warnings</h3>
                  <ul>${data.warnings.map((w) => html`<li>${w}</li>`)}</ul>
                </div>
              `
            : ''}
        </div>
      `),
      actions: [
        { label: 'Close', primary: true }
      ]
    });
  } catch (err) {
    toast.error(`Exercise coaching failed: ${err.message}`);
  }
}

/**
 * Send AI chat message (compat for legacy onclick="sendAIChat()" from HTML forms)
 */
export async function sendAIChat() {
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;
  input.value = '';

  const history = store.get('aiCoach.conversationHistory') || [];
  const newHistory = [...history, { role: 'user', content: message }];
  store.set('aiCoach.conversationHistory', newHistory);

  try {
    const result = await api.post('/ai/coach/chat', {
      message,
      conversationHistory: history.slice(-6)
    });
    store.set('aiCoach.conversationHistory', [
      ...newHistory,
      { role: 'assistant', content: result.response || 'Sorry, I could not generate a response.' }
    ]);
  } catch (err) {
    toast.error(`Chat failed: ${err.message}`);
  }
}

export function askQuickQuestion(question) {
  const input = document.getElementById('ai-chat-input');
  if (input) {
    input.value = question;
    sendAIChat();
  }
}
