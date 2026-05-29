/**
 * Live workout WebSocket client.
 *
 * Connects to the workout's Durable Object (`GET /api/workouts/:id/live`) and
 * relays set / timer / completion events emitted by *other* devices so the
 * active-workout UI stays in sync across a phone, tablet, etc.
 *
 * Mutations still flow through the normal REST endpoints; this socket is for
 * receiving fan-out. Every mutation the local device makes carries an
 * `X-Origin-Id` header equal to {@link ORIGIN_ID}; the DO echoes it back in
 * the broadcast so we can ignore our own events.
 */

// Stable per-tab identity. Echoed by the server so we can drop our own events.
export const ORIGIN_ID =
  (globalThis.crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2)}`);

let socket = null;
let workoutId = null;
let handlers = {};
let shouldReconnect = false;
let reconnectTimer = null;
let reconnectDelay = 1000;
const MAX_DELAY = 15_000;

function wsUrl(id) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/api/workouts/${id}/live`;
}

/**
 * Open (or re-open) the live socket for a workout.
 * @param {number|string} id
 * @param {{onSet?:Function,onTimer?:Function,onState?:Function,onCompleted?:Function}} h
 */
export function connectLive(id, h = {}) {
  disconnectLive();
  workoutId = id;
  handlers = h;
  shouldReconnect = true;
  reconnectDelay = 1000;
  open();
}

function open() {
  if (!workoutId) return;
  let s;
  try {
    s = new WebSocket(wsUrl(workoutId));
  } catch {
    scheduleReconnect();
    return;
  }
  socket = s;

  s.addEventListener('open', () => {
    reconnectDelay = 1000;
  });
  s.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    dispatch(msg);
  });
  s.addEventListener('close', () => {
    if (socket === s) socket = null;
    if (shouldReconnect) scheduleReconnect();
  });
  s.addEventListener('error', () => {
    try { s.close(); } catch { /* noop */ }
  });
}

function dispatch(msg) {
  switch (msg.type) {
    case 'set:logged':
    case 'set:updated':
    case 'set:deleted':
      handlers.onSet?.(msg);
      break;
    case 'timer:rest':
      handlers.onTimer?.(msg);
      break;
    case 'session:state':
      handlers.onState?.(msg);
      break;
    case 'session:completed':
      handlers.onCompleted?.(msg);
      break;
    default:
      break;
  }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    open();
  }, reconnectDelay);
}

export function disconnectLive() {
  shouldReconnect = false;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (socket) {
    try { socket.close(1000, 'client done'); } catch { /* noop */ }
    socket = null;
  }
  workoutId = null;
  handlers = {};
}

export function isLiveConnected() {
  return !!socket && socket.readyState === WebSocket.OPEN;
}
