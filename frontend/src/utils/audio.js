/**
 * Unified Web Audio API wrapper.
 *
 * Replaces three near-identical implementations from legacy app.js:
 *   - `playAlarm()`       — rest timer complete
 *   - `playRestCompleteSound()` — Phase 4 rest timer complete
 *   - `playPRSound()`     — PR celebration chord
 *
 * Lazily creates a single shared AudioContext. Respects the user's reduced
 * motion / muted preferences via the `soundEnabled` flag.
 */

let ctx = null;
let soundEnabled = true;

function getContext() {
  if (!soundEnabled) return null;
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!ctx) ctx = new AudioCtx();
  // Browsers may auto-suspend the context; resume on first play
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Enable or disable all audio playback.
 * @param {boolean} enabled
 */
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

/**
 * Play a single tone.
 * @param {object} opts
 * @param {number} opts.frequency - Hz
 * @param {number} opts.duration - seconds
 * @param {number} [opts.volume=0.3] - 0..1
 * @param {OscillatorType} [opts.type='sine']
 * @param {number} [opts.delay=0] - seconds before start
 */
export function playTone({ frequency, duration, volume = 0.3, type = 'sine', delay = 0 }) {
  const ac = getContext();
  if (!ac) return;

  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ac.destination);

  const startAt = ac.currentTime + delay;
  const endAt = startAt + duration;

  // Simple attack/release envelope to avoid clicks
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.setValueAtTime(volume, endAt - 0.05);
  gain.gain.linearRampToValueAtTime(0, endAt);

  osc.start(startAt);
  osc.stop(endAt);
}

/**
 * Play a sequence of tones.
 * @param {Array<{ frequency: number, duration: number, gap?: number, volume?: number }>} tones
 */
export function playSequence(tones) {
  let delay = 0;
  for (const tone of tones) {
    playTone({ ...tone, delay });
    delay += tone.duration + (tone.gap || 0);
  }
}

// -------- preset sounds --------

/** Double-beep for rest timer completion */
export function playRestComplete() {
  playSequence([
    { frequency: 800, duration: 0.15, gap: 0.08 },
    { frequency: 1000, duration: 0.15 }
  ]);
}

/** Ascending C-major chord arpeggio for PR celebration */
export function playPRCelebration() {
  playSequence([
    { frequency: 523.25, duration: 0.18, gap: 0.02, volume: 0.4 }, // C5
    { frequency: 659.25, duration: 0.18, gap: 0.02, volume: 0.4 }, // E5
    { frequency: 783.99, duration: 0.18, gap: 0.02, volume: 0.4 }, // G5
    { frequency: 1046.5, duration: 0.45, volume: 0.5 }             // C6
  ]);
}

/** Short confirmation beep for set logged */
export function playSetLogged() {
  playTone({ frequency: 600, duration: 0.08, volume: 0.2 });
}

/** Warning tone for form-warning alerts */
export function playWarning() {
  playSequence([
    { frequency: 400, duration: 0.12, gap: 0.05, volume: 0.3 },
    { frequency: 400, duration: 0.12, volume: 0.3 }
  ]);
}

/**
 * Short ascending 2-tone chirp when a barcode is successfully decoded.
 * Deliberately quick (~150ms) so it overlaps with the lookup API call
 * without dragging the UX.
 */
export function playBarcodeDetected() {
  playSequence([
    { frequency: 880, duration: 0.06, gap: 0.01, volume: 0.25 },  // A5
    { frequency: 1318, duration: 0.09, volume: 0.3 }              // E6
  ]);
}
