/**
 * Learn screen — Training Education Center.
 *
 * Previously 1,792 lines of inline HTML in a single `loadLearn()` function.
 * Now the HTML content lives in `frontend/content/learn.html` and gets
 * imported as a string via Vite's `?raw` suffix. This keeps the content
 * out of the JS source while still bundling it into the Worker artifact.
 *
 * The content is fully static so there's no need for a full Component class
 * — a simple render function is sufficient.
 */

import { delegate } from '@core/delegate';
import learnHtmlRaw from '../../content/learn.html?raw';

const QUICK_NAV_SELECTORS = {
  hypertrophy: '#hypertrophy-section',
  strength: '#strength-section',
  endurance: '#endurance-section',
  cardio: '#cardio-section',
  comparison: '#comparison-section',
  variables: '#variables-section'
};

/**
 * Render the Learn screen into the given container.
 * @param {HTMLElement} container
 */
export function renderLearn(container) {
  container.innerHTML = learnHtmlRaw;

  // The legacy content used inline `onclick="document.getElementById(...).scrollIntoView"`
  // calls. These still work in the DOM since the HTML is unchanged, but we
  // also set up event delegation for data-action buttons to smooth out
  // future cleanup.
  delegate(container, 'click', (event) => {
    const target = event.target.closest('[data-learn-scroll]');
    if (!target) return;
    event.preventDefault();
    const sectionId = target.getAttribute('data-learn-scroll');
    const selector = QUICK_NAV_SELECTORS[sectionId];
    if (!selector) return;
    container.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/**
 * Screen handler suitable for the legacy-bridge registration.
 * Matches the signature the legacy `loadLearn()` was called with.
 */
export function loadLearn() {
  const container = document.getElementById('learn');
  if (!container) return;
  renderLearn(container);
}
