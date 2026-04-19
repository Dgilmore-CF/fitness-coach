/**
 * Unified timer system.
 *
 * Replaces two parallel rest-timer implementations from legacy app.js
 * (the original `startRestTimer` at line 2677 and the Phase 4 version at
 * line 10298). Uses end-time-based tracking so the timer survives
 * minimize/restore and tab-background without drift.
 */

import events from '@core/events';

export class Timer {
  /**
   * @param {object} opts
   * @param {number} opts.durationSeconds
   * @param {(remaining: number, total: number) => void} [opts.onTick]
   * @param {() => void} [opts.onComplete]
   * @param {number} [opts.tickIntervalMs=100] - how often to fire `onTick`
   */
  constructor({ durationSeconds, onTick, onComplete, tickIntervalMs = 100 }) {
    this.totalSeconds = durationSeconds;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.tickIntervalMs = tickIntervalMs;
    this.endTime = null;
    this.intervalId = null;
    this.completed = false;
  }

  start() {
    if (this.intervalId) return;
    this.endTime = Date.now() + this.totalSeconds * 1000;
    this.completed = false;
    this._tick(); // fire immediately so UI updates
    this.intervalId = setInterval(() => this._tick(), this.tickIntervalMs);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.endTime = null;
  }

  /** Resume a timer whose endTime is already known (e.g. after modal restore) */
  resumeToEndTime(endTime) {
    if (this.intervalId) clearInterval(this.intervalId);
    this.endTime = endTime;
    const remaining = Math.max(0, Math.floor((this.endTime - Date.now()) / 1000));
    if (remaining <= 0) {
      this._handleComplete();
      return;
    }
    this._tick();
    this.intervalId = setInterval(() => this._tick(), this.tickIntervalMs);
  }

  /** Add or subtract seconds from the end time */
  adjust(deltaSeconds) {
    if (!this.endTime) return;
    this.endTime += deltaSeconds * 1000;
    this.totalSeconds += deltaSeconds;
    this._tick();
  }

  skip() {
    this._handleComplete();
  }

  getRemaining() {
    if (!this.endTime) return 0;
    return Math.max(0, Math.floor((this.endTime - Date.now()) / 1000));
  }

  _tick() {
    const remaining = this.getRemaining();
    this.onTick?.(remaining, this.totalSeconds);

    if (remaining <= 0 && !this.completed) {
      this._handleComplete();
    }
  }

  _handleComplete() {
    if (this.completed) return;
    this.completed = true;
    this.stop();
    this.onComplete?.();
    events.emit('timer:complete', this);
  }
}

/**
 * Long-running workout timer (counts UP from a start time).
 * Use for the "time spent in workout" display at the top of the active modal.
 */
export class StopwatchTimer {
  constructor({ startTime, onTick, tickIntervalMs = 1000 } = {}) {
    this.startTime = startTime ? new Date(startTime).getTime() : Date.now();
    this.onTick = onTick;
    this.tickIntervalMs = tickIntervalMs;
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) return;
    this._tick();
    this.intervalId = setInterval(() => this._tick(), this.tickIntervalMs);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  getElapsedSeconds() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  _tick() {
    this.onTick?.(this.getElapsedSeconds());
  }
}

export default Timer;
