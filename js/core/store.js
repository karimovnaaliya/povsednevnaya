// Progress & settings in localStorage (every access wrapped in try/catch) with in-memory fallback.
import { todayKey, dayKey, addDays, parseKey } from './time.js';

const KEY = 'quran-path-v1';
const listeners = new Set();
let memoryOnly = false;

export const DEFAULT_SETTINGS = {
  theme: 'auto', // auto | light | dark | sepia
  arScale: 1,
  showTr: true,
  showRu: true,
  tajweed: true,
  reciter: 'alafasy',
  speed: 1,
  dailyGoal: 20,
  weeklyLessons: 5,
  surahGoal: 5,
  duaGoal: 20,
  name: '',
  reminder: false,
  reminderTime: '20:00',
  hijriOffset: 0,
  city: null, // overrides data/misc/prayer-config.json
  focusLen: 20,
};

function fresh() {
  return {
    v: 1,
    created: todayKey(),
    settings: { ...DEFAULT_SETTINGS },
    days: {}, // 'YYYY-MM-DD': {sec, special, prayers:{}, habits:{}, tasbih:{}, journal, lessons:[], quiz:{c,t}, fast}
    lessons: {}, // id: {done, at, score}
    levels: {}, // n: {passed, skipped, score, at}
    hifz: {}, // id: {status, srs, at, reps}
    duas: {}, // id: {learned, at}
    names: {}, // n: {known, srs}
    quiz: {}, // qid: {c, w, srs:{due, iv, ef, n}}
    qada: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
    ramadan: {}, // year: {d: {fasted, juz}}
    badges: {},
    adhkar: {}, // routineId: {date, idx, counts}
    last: { lesson: null, surah: null },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return migrate(JSON.parse(raw));
  } catch {
    memoryOnly = true;
    return fresh();
  }
}

function migrate(s) {
  const base = fresh();
  const out = { ...base, ...s };
  out.settings = { ...base.settings, ...(s.settings || {}) };
  for (const k of Object.keys(base)) if (out[k] == null) out[k] = base[k];
  return out;
}

export let state = load();

let saveTimer = null;
export function save(now = false) {
  const write = () => {
    saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify(state)); memoryOnly = false; } catch { memoryOnly = true; }
  };
  if (now) { clearTimeout(saveTimer); write(); } else if (!saveTimer) saveTimer = setTimeout(write, 300);
}
export const isMemoryOnly = () => memoryOnly;

/** Mutate state and notify. */
export function update(fn, topic = 'state') {
  fn(state);
  save();
  for (const l of listeners) { try { l(topic); } catch (e) { console.warn(e); } }
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function day(k = todayKey()) {
  if (!state.days[k]) state.days[k] = { sec: 0 };
  return state.days[k];
}
export const peekDay = (k = todayKey()) => state.days[k] || null;

export function goalSec() { return Math.max(5, state.settings.dailyGoal || 20) * 60; }

/** status of a day: done | partial | missed | special | future | today | none (before start) */
export function dayStatus(k) {
  const t = todayKey();
  const d = state.days[k];
  if (d && d.special) return 'special';
  const sec = d ? d.sec || 0 : 0;
  if (sec >= goalSec()) return 'done';
  if (k > t) return 'future';
  if (k === t) return sec > 0 ? 'partial' : 'today';
  if (k < state.created) return 'none';
  return sec > 0 ? 'partial' : 'missed';
}

/** Streak: consecutive done days ending today (or yesterday if today not yet done); special days are skipped, not broken. */
export function streak() {
  let n = 0;
  let cur = new Date();
  const tk = todayKey();
  if (dayStatus(tk) !== 'done') cur = addDays(cur, -1);
  for (let i = 0; i < 3660; i++) {
    const k = dayKey(cur);
    if (k < state.created && !state.days[k]) break;
    const st = dayStatus(k);
    if (st === 'done') n++;
    else if (st !== 'special') break;
    cur = addDays(cur, -1);
  }
  return n;
}

export function longestStreak() {
  const keys = Object.keys(state.days).sort();
  if (!keys.length) return 0;
  let best = 0, run = 0;
  let cur = parseKey(keys[0]);
  const end = new Date();
  while (dayKey(cur) <= dayKey(end)) {
    const st = dayStatus(dayKey(cur));
    if (st === 'done') { run++; best = Math.max(best, run); } else if (st !== 'special') run = 0;
    cur = addDays(cur, 1);
  }
  return best;
}

export function addStudySeconds(sec, k = todayKey()) {
  if (!(sec > 0)) return;
  const before = day(k).sec || 0;
  update(s => { const d = s.days[k] || (s.days[k] = { sec: 0 }); d.sec = (d.sec || 0) + sec; }, 'time');
  if (before < goalSec() && before + sec >= goalSec()) document.dispatchEvent(new CustomEvent('goal-reached'));
}

export function exportBackup() {
  return JSON.stringify({ app: 'quran-path', exported: new Date().toISOString(), state }, null, 1);
}
export function importBackup(text) {
  const j = JSON.parse(text);
  const s = j && j.app === 'quran-path' ? j.state : j;
  if (!s || typeof s !== 'object' || !s.settings || !s.days) throw new Error('Это не файл резервной копии приложения');
  state = migrate(s);
  save(true);
  for (const l of listeners) l('import');
}
export function resetAll() {
  state = fresh();
  save(true);
  for (const l of listeners) l('import');
}
