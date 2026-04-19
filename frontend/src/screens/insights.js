/**
 * AI Coach / Insights screen — header, chat interface, quick questions.
 *
 * Migrated main view from legacy loadInsights(). The advanced analytics
 * (loadAdvancedAnalytics) and full coaching analysis (generateAICoaching)
 * remain in legacy for now. Phase 4 will add real-time in-workout coaching
 * and pre-workout briefings — this screen focuses on the chat experience.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { delegate } from '@core/delegate';
import { toast } from '@ui/Toast';

const QUICK_QUESTIONS = [
  'How should I progress my bench press?',
  'Am I training with enough volume?',
  'What muscle groups am I neglecting?',
  'Should I take a deload week?',
  'How do I break through a plateau?',
  'Is my training frequency optimal?'
];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function renderMessages(conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return html`
      <div class="chat-empty-state">
        <i class="fas fa-robot"></i>
        <p>Ask your AI Coach anything about your training.</p>
      </div>
    `;
  }

  return html`
    ${conversationHistory.map((msg) => html`
      <div class="chat-message chat-message-${msg.role}">
        <div class="chat-message-avatar">
          <i class="fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="chat-message-body">${raw(formatMessageContent(msg.content))}</div>
      </div>
    `)}
  `;
}

/**
 * Format AI chat content with simple markdown-style rendering:
 * - Bold **text**
 * - Bullets (- item)
 * - Line breaks
 * Escapes any raw HTML in the content first.
 */
function formatMessageContent(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);
  // Bold
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Bullets (lines starting with -)
  escaped = escaped.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li>s in <ul>
  escaped = escaped.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // Preserve line breaks not already in list elements
  escaped = escaped.replace(/\n(?!<\/?(ul|li)>)/g, '<br />');
  return escaped;
}

async function sendMessage(message) {
  const history = store.get('aiCoach.conversationHistory') || [];

  // Optimistically render the user message
  const newHistory = [...history, { role: 'user', content: message }];
  store.set('aiCoach.conversationHistory', newHistory);
  renderMessagesInDOM();

  // Show typing indicator
  const messagesEl = document.getElementById('ai-chat-messages');
  if (messagesEl) {
    messagesEl.insertAdjacentHTML('beforeend', String(html`
      <div class="chat-message chat-message-assistant" id="chat-typing">
        <div class="chat-message-avatar"><i class="fas fa-robot"></i></div>
        <div class="chat-message-body">
          <div class="chat-typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    `));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  try {
    const result = await api.post('/ai/coach/chat', {
      message,
      conversationHistory: history.slice(-6)
    });

    document.getElementById('chat-typing')?.remove();

    const assistantMessage = { role: 'assistant', content: result.response || 'Sorry, I could not generate a response.' };
    store.set('aiCoach.conversationHistory', [...newHistory, assistantMessage]);
    renderMessagesInDOM();
  } catch (err) {
    document.getElementById('chat-typing')?.remove();
    toast.error(`AI Coach error: ${err.message}`);
  }
}

function renderMessagesInDOM() {
  const el = document.getElementById('ai-chat-messages');
  if (!el) return;
  const history = store.get('aiCoach.conversationHistory') || [];
  el.innerHTML = String(renderMessages(history));
  el.scrollTop = el.scrollHeight;
}

function attachInsightsHandlers(container) {
  // Form submission
  const form = container.querySelector('#ai-chat-form');
  if (form) {
    delegate(form, 'submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('#ai-chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      sendMessage(msg);
    });
  }

  delegate(container, 'click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    switch (action) {
      case 'quick-question':
        sendMessage(target.getAttribute('data-question'));
        break;
      case 'clear-chat':
        store.set('aiCoach.conversationHistory', []);
        renderMessagesInDOM();
        break;
      case 'open-analysis':
        if (typeof window.generateAICoaching === 'function') {
          window.generateAICoaching();
        } else {
          toast.info('Full analysis is not yet available.');
        }
        break;
      case 'open-advanced':
        if (typeof window.loadAdvancedAnalytics === 'function') {
          window.loadAdvancedAnalytics();
        } else {
          toast.info('Advanced analytics is not yet available.');
        }
        break;
    }
  });
}

function renderLoadingState() {
  return html`
    <div class="card chat-loading">
      <i class="fas fa-robot fa-spin"></i>
      <h3>Analyzing your training data…</h3>
      <p class="text-muted">Your AI Coach is reviewing your workout history.</p>
    </div>
  `;
}

function renderNoDataState() {
  return html`
    <div class="card ai-coach-hero">
      <div class="ai-coach-hero-content">
        <h2><i class="fas fa-robot"></i> AI Fitness Coach</h2>
        <p>Your personal AI-powered strength coach.</p>
      </div>
    </div>
    <div class="card empty-state-card">
      <div class="empty-state-icon">🏋️</div>
      <h3>Complete some workouts first</h3>
      <p class="text-muted">Your AI Coach needs workout data to provide personalized recommendations. Complete at least 3 workouts to unlock AI coaching features.</p>
      <button class="btn btn-primary" data-action="go-workout">
        <i class="fas fa-play"></i> Start a Workout
      </button>
    </div>
  `;
}

function renderErrorState(message) {
  return html`
    <div class="card">
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Couldn't load AI Coach</div>
        <div class="empty-state-description">${message}</div>
      </div>
    </div>
  `;
}

export async function loadInsights() {
  const container = document.getElementById('insights');
  if (!container) return;

  container.innerHTML = String(renderLoadingState());

  try {
    const response = await api.get('/ai/coach/analysis?days=90');
    const data = response.data;

    if (!data || (data.summary?.total_workouts || 0) < 1) {
      container.innerHTML = String(renderNoDataState());
      container.querySelector('[data-action="go-workout"]')?.addEventListener('click', () => {
        if (typeof window.switchTab === 'function') window.switchTab('workout');
      });
      return;
    }

    // Cache the data for chat context / other screens
    store.set('aiCoach.lastInsight', data);

    const history = store.get('aiCoach.conversationHistory') || [];

    container.innerHTML = String(html`
      <div class="stack stack-lg">
        <div class="card ai-coach-hero">
          <div class="ai-coach-hero-content">
            <h2><i class="fas fa-robot"></i> AI Fitness Coach</h2>
            <p>Science-based coaching from ${data.summary.total_workouts} workout${data.summary.total_workouts === 1 ? '' : 's'}.</p>
          </div>
          <div class="cluster">
            <button class="btn btn-outline btn-sm" data-action="open-analysis">
              <i class="fas fa-chart-line"></i> Full Analysis
            </button>
            <button class="btn btn-outline btn-sm" data-action="open-advanced">
              <i class="fas fa-magic"></i> Advanced Analytics
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title" style="font-size: var(--text-lg);">
              <i class="fas fa-comments"></i> Ask Your AI Coach
            </h3>
            ${history.length > 0
              ? html`<button class="btn btn-ghost btn-sm" data-action="clear-chat"><i class="fas fa-trash"></i> Clear</button>`
              : ''}
          </div>

          <div class="chat-messages" id="ai-chat-messages">${renderMessages(history)}</div>

          <form id="ai-chat-form" class="chat-form">
            <input type="text" id="ai-chat-input" class="input" placeholder="Ask about training, plateaus, nutrition, etc." autocomplete="off" />
            <button type="submit" class="btn btn-primary" aria-label="Send">
              <i class="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title" style="font-size: var(--text-lg);">
              <i class="fas fa-lightbulb"></i> Quick Questions
            </h3>
          </div>
          <div class="quick-questions-grid">
            ${QUICK_QUESTIONS.map((q) => html`
              <button class="quick-question-btn" data-action="quick-question" data-question="${q}">
                ${q}
              </button>
            `)}
          </div>
        </div>
      </div>
    `);

    attachInsightsHandlers(container);
  } catch (err) {
    console.error('Error loading AI coach:', err);
    container.innerHTML = String(renderErrorState(err.message));
  }
}
