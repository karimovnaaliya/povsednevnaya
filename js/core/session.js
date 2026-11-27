// Study-time tracking.
// - Focus session: explicit timer (10/20/30/45 min); pauses when the app is hidden.
// - Passive: time on study pages counts too (only while visible and the user interacted in the last 2 min).
import { addStudySeconds, state, update } from './store.js';

const STUDY_ROUTES = /^#\/(quran|lesson|test|hifz|namaz|duas|dua|islam|revision|adhkar|names|reader|legend|focus|tasbih)/;
const IDLE_MS = 120000;
let lastInput = Date.now();
let pending = 0;
const subs = new Set();

export const focus = {
  running: false, paused: false, target: 20 * 60, elapsed: 0, completed: false,
};
try { const saved = JSON.parse(sessionStorage.getItem('focus') || 'null'); if (saved && saved.running) Object.assign(focus, saved, { paused: true }); } catch { /* ignore */ }

const persist = () => { try { sessionStorage.setItem('focus', JSON.stringify(focus)); } catch { /* ignore */ } };
const emit = () => { persist(); for (const f of subs) f(focus); };
export function onFocus(fn) { subs.add(fn); fn(focus); return () => subs.delete(fn); }

export function startFocus(min) {
  Object.assign(focus, { running: true, paused: false, target: min * 60, elapsed: 0, completed: false });
  update(s => { s.settings.focusLen = min; });
  emit();
}
export function pauseFocus(v = true) { if (focus.running) { focus.paused = v; emit(); } }
export function stopFocus() { flush(); Object.assign(focus, { running: false, paused: false, elapsed: 0, completed: false }); emit(); }

for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart']) addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (focus.running && !focus.paused) { focus.paused = true; focus.autoPaused = true; emit(); } flush(); }
  else if (focus.autoPaused) { focus.autoPaused = false; emit(); } // stays paused until she taps "continue"
});

function flush() { if (pending > 0) { const p = pending; pending = 0; addStudySeconds(p); } }

setInterval(() => {
  if (document.hidden) return;
  if (focus.running && !focus.paused) {
    focus.elapsed++;
    pending++;
    if (!focus.completed && focus.elapsed >= focus.target) {
      focus.completed = true;
      document.dispatchEvent(new CustomEvent('focus-complete'));
    }
    emit();
  } else if (!focus.running && STUDY_ROUTES.test(location.hash) && Date.now() - lastInput < IDLE_MS) {
    pending++;
  }
  if (pending >= 15) flush();
}, 1000);
addEventListener('pagehide', flush);
export { flush, state };
