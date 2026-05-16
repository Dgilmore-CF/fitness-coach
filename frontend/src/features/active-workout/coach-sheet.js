/**
 * Bottom-sheet coach chat — opened from the workout footer "Ask Coach" button
 * and from the inline flag-card "Ask coach" action.
 *
 * Thin wrapper around the existing `POST /api/ai/coach/chat` endpoint (which
 * is already unit-aware — it reads the user's measurement_system and
 * instructs the LLM to respond in the right unit).
 *
 * The conversation history is shared with the Insights screen via the
 * `aiCoach.conversationHistory` store key, so questions asked here continue
 * naturally on the Insights tab and vice versa.
 */

import { html, raw } from '@core/html';
import { api } from '@core/api';
import { store } from '@core/state';
import { openModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { formatWeight } from '@utils/formatters';

const MAX_HISTORY = 6; // matches insights.js — what gets sent to the LLM

/**
 * Open the chat sheet. If `prefillMessage` is provided, it's placed in the
 * input box (not auto-sent) so the user can edit or send-as-is.
 *
 * @param {Object} [opts]
 * @param {string} [opts.prefillMessage] — pre-filled message in the input
 * @param {string} [opts.title]          — modal title override
 */
export function openCoachSheet({ prefillMessage = '', title = 'Ask Coach' } = {}) {
  let isSending = false;

  const modal = openModal({
    title,
    size: 'default',
    content: String(html`
      <div class="aw-coach-sheet">
        <div id="aw-coach-messages" class="aw-coach-messages"></div>
        <form id="aw-coach-form" class="aw-coach-form" autocomplete="off">
          <textarea id="aw-coach-input" class="textarea"
                    rows="2"
                    placeholder="Ask anything about your training…"
                    aria-label="Question for the coach"></textarea>
          <button type="submit" class="btn btn-primary" id="aw-coach-send">
            <i class="fas fa-paper-plane"></i>
            <span class="hide-mobile">Send</span>
          </button>
        </form>
      </div>
    `),
    actions: [{ label: 'Close', variant: 'btn-outline' }],
    onOpen: ({ element }) => {
      renderMessages(element);

      const input = element.querySelector('#aw-coach-input');
      const form = element.querySelector('#aw-coach-form');

      if (prefillMessage && input) {
        input.value = prefillMessage;
        // Focus + place cursor at end so the user can append/edit.
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }, 50);
      } else if (input) {
        setTimeout(() => input.focus(), 50);
      }

      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isSending) return;
        const message = (input?.value || '').trim();
        if (!message) return;
        input.value = '';
        isSending = true;
        try {
          await sendMessageAndRender(element, message);
        } finally {
          isSending = false;
        }
      });

      // Enter to send, Shift-Enter for newline (matches common chat UX).
      input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          form?.dispatchEvent(new Event('submit'));
        }
      });
    }
  });

  return modal;
}

/**
 * Build a pre-fill string from the most recent flag-card insight so the
 * "Ask coach about this" button can hand the LLM specific context. Falls
 * back to a generic prompt when called with nothing.
 */
export function buildPrefillFromFlag(insight, exercise) {
  if (!insight) return '';
  const exName = exercise?.name ? ` on ${exercise.name}` : '';
  switch (insight.flag) {
    case 'stalled':
      return `My ${exercise?.name || 'lifts'} have stalled — same weight for several sessions. What should I try?`;
    case 'form_breakdown':
      return `My reps dropped sharply between sets${exName}. What's going on?`;
    case 'load_warning':
      return `I'm hitting RPE 9+ early in my sets${exName}. How should I adjust?`;
    case 'target_miss':
      return `I'm missing my target reps${exName}. Should I drop the weight or extend rest?`;
    default:
      return `Question about my last set${exName}.`;
  }
}

/**
 * Pre-fill seeded from the current workout state (footer button entry point).
 * Mentions the active exercise and most recent sets so the LLM has context.
 */
export function buildPrefillFromWorkout({ exercise, currentSets = [] } = {}) {
  if (!exercise) return '';
  const recent = currentSets
    .slice(-3)
    .map((s) => `${formatWeight(s.weight_kg)} × ${s.reps}`)
    .filter(Boolean)
    .join(', ');
  if (!recent) return `Question about ${exercise.name}.`;
  return `On ${exercise.name} today: ${recent}. `;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function getHistory() {
  return store.get('aiCoach.conversationHistory') || [];
}

function setHistory(next) {
  store.set('aiCoach.conversationHistory', next);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Same lightweight markdown rendering used on the Insights screen.
function formatMessageContent(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
  escaped = escaped.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  escaped = escaped.replace(/\n(?!<\/?(ul|li)>)/g, '<br />');
  return escaped;
}

function renderMessages(rootEl) {
  const messagesEl = rootEl.querySelector('#aw-coach-messages');
  if (!messagesEl) return;

  const history = getHistory();
  if (history.length === 0) {
    messagesEl.innerHTML = String(html`
      <div class="aw-coach-empty">
        <i class="fas fa-robot"></i>
        <p>Ask anything about your training — form, programming, recovery.</p>
        <p class="text-muted" style="font-size: var(--text-xs);">
          Powered by /coach/chat. Conversation is shared with the Insights tab.
        </p>
      </div>
    `);
    return;
  }

  messagesEl.innerHTML = String(html`
    ${history.map((msg) => html`
      <div class="aw-coach-message aw-coach-message-${msg.role}">
        <div class="aw-coach-message-avatar">
          <i class="fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="aw-coach-message-body">${raw(formatMessageContent(msg.content))}</div>
      </div>
    `)}
  `);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessageAndRender(rootEl, message) {
  const history = getHistory();

  // Optimistically append user message
  const newHistory = [...history, { role: 'user', content: message }];
  setHistory(newHistory);
  renderMessages(rootEl);

  // Typing indicator
  const messagesEl = rootEl.querySelector('#aw-coach-messages');
  if (messagesEl) {
    messagesEl.insertAdjacentHTML('beforeend', String(html`
      <div class="aw-coach-message aw-coach-message-assistant" id="aw-coach-typing">
        <div class="aw-coach-message-avatar"><i class="fas fa-robot"></i></div>
        <div class="aw-coach-message-body">
          <span class="aw-coach-typing-dots"><span></span><span></span><span></span></span>
        </div>
      </div>
    `));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  try {
    const result = await api.post('/ai/coach/chat', {
      message,
      conversationHistory: newHistory.slice(-MAX_HISTORY)
    });

    document.getElementById('aw-coach-typing')?.remove();

    const reply = result?.response || 'Sorry, I could not generate a response.';
    setHistory([...newHistory, { role: 'assistant', content: reply }]);
    renderMessages(rootEl);
  } catch (err) {
    document.getElementById('aw-coach-typing')?.remove();
    toast.error(`AI Coach error: ${err.message}`);
    // Roll back the user message so they can retry without duplicating.
    setHistory(history);
    renderMessages(rootEl);
  }
}
