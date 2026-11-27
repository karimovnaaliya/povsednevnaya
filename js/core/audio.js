// One reusable audio engine for the whole app (see AUDIO.md).
// - a single <audio> element (iOS unlocks one element after a tap)
// - source chain main -> backup -> backup2 -> fallback reciter, with load timeout
// - repeat N times, sequences of ayahs, playback speed, visible error + retry
import { state } from './store.js';
import { loadJSON } from './content.js';

const DEFAULT_RECITERS = {
  default: 'alafasy',
  reciters: [{ id: 'alafasy', name: 'Мишари Аль-Афаси', ayah: { main: 'https://everyayah.com/data/Alafasy_128kbps/{sss}{aaa}.mp3', backup: 'https://verses.quran.com/Alafasy/mp3/{sss}{aaa}.mp3', backup2: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/{global}.mp3' } }],
  word: { main: 'https://audio.qurancdn.com/wbw/{sss}_{aaa}_{www}.mp3', backup: 'https://verses.quran.com/wbw/{sss}_{aaa}_{www}.mp3' },
};

let cfg = DEFAULT_RECITERS;
let counts = null; // ayah counts per surah for global numbering
export const ready = Promise.all([
  loadJSON('data/misc/reciters.json').then(j => { cfg = j; }).catch(() => {}),
  loadJSON('data/quran/surahs.json').then(j => { counts = j.surahs.map(s => s.count); }).catch(() => {}),
]);

export function reciters() { return cfg.reciters; }
export function reciterName(id) { const r = cfg.reciters.find(x => x.id === id); return r ? r.name : ''; }

const p3 = n => String(n).padStart(3, '0');
function globalNo(s, a) {
  if (!counts) return null;
  let g = 0;
  for (let i = 0; i < s - 1; i++) g += counts[i];
  return g + a;
}
function fill(tpl, s, a, w) {
  if (!tpl) return null;
  if (tpl.includes('{global}')) { const g = globalNo(s, a); if (!g) return null; tpl = tpl.replace('{global}', g); }
  return tpl.replace('{sss}', p3(s)).replace('{aaa}', p3(a)).replace('{www}', p3(w || 0));
}

const badHosts = new Set();
const hostOf = u => { try { return new URL(u).host; } catch { return ''; } };

/** Ordered candidate URLs for an ayah or a word. */
export function sourcesFor(ref) {
  const out = [];
  if (ref.kind === 'word') {
    const [s, a, w] = ref.key.split(':').map(Number);
    // word file number = word position in the ayah (AUDIO.md: API audio_url is wrong with pause marks)
    out.push(fill(cfg.word.main, s, a, w), fill(cfg.word.backup, s, a, w));
  } else if (ref.kind === 'ayah') {
    const [s, a] = ref.key.split(':').map(Number);
    const chain = [];
    let r = cfg.reciters.find(x => x.id === (ref.reciter || state.settings.reciter)) || cfg.reciters[0];
    const seen = new Set();
    while (r && !seen.has(r.id)) {
      seen.add(r.id);
      chain.push(r.ayah.main, r.ayah.backup, r.ayah.backup2);
      r = r.fallbackReciter ? cfg.reciters.find(x => x.id === r.fallbackReciter) : null;
    }
    if (!seen.has('alafasy')) { const al = cfg.reciters.find(x => x.id === 'alafasy'); if (al) chain.push(al.ayah.main, al.ayah.backup); }
    for (const t of chain) out.push(fill(t, s, a));
  } else if (ref.kind === 'url') {
    out.push(ref.src, ref.fallback);
  }
  const list = [...new Set(out.filter(Boolean))];
  // known-bad hosts go last (not removed: they may recover)
  return [...list.filter(u => !badHosts.has(hostOf(u))), ...list.filter(u => badHosts.has(hostOf(u)))];
}

/** Expand {kind:'ayahs'} into ayah refs. */
export function expand(ref) {
  if (ref.kind !== 'ayahs') return [ref];
  const [s1, a1] = ref.from.split(':').map(Number);
  const [, a2] = ref.to.split(':').map(Number);
  const out = [];
  for (let a = a1; a <= a2; a++) out.push({ kind: 'ayah', key: `${s1}:${a}` });
  return out;
}

// ---------- engine ----------
const el = new Audio();
el.preload = 'none';
el.setAttribute('playsinline', '');
el.setAttribute('webkit-playsinline', '');
try { el.preservesPitch = true; el.webkitPreservesPitch = true; } catch { /* old browsers */ }

const subs = new Set();
let job = null; // {id, items:[ref], i, rep, repeat, label, srcIdx, sources, onItem, onDone}
let timer = null;
let jobSeq = 0;
export const status = { state: 'idle', jobId: null, ref: null, label: '', error: null, index: 0, total: 0, rep: 0, repeat: 1 };

function emit() { for (const f of subs) { try { f(status); } catch (e) { console.warn(e); } } }
export function onStatus(fn) { subs.add(fn); fn(status); return () => subs.delete(fn); }
const set = patch => { Object.assign(status, patch); emit(); };

function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
function armTimer() {
  clearTimer();
  timer = setTimeout(() => { if (job && status.state === 'loading') nextSource('timeout'); }, navigator.connection && /2g|3g/.test(navigator.connection.effectiveType || '') ? 20000 : 12000);
}

function loadCurrent() {
  const ref = job.items[job.i];
  job.sources = sourcesFor(ref);
  job.srcIdx = 0;
  set({ state: 'loading', ref, error: null, index: job.i, total: job.items.length, rep: job.rep, repeat: job.repeat });
  if (job.onItem) job.onItem(ref, job.i);
  startSource();
}

function startSource() {
  const url = job.sources[job.srcIdx];
  if (!url) return fail();
  el.src = url;
  el.playbackRate = state.settings.speed || 1;
  armTimer();
  const p = el.play();
  if (p && p.catch) p.catch(err => {
    if (!job) return;
    if (err && err.name === 'NotAllowedError') { clearTimer(); set({ state: 'blocked', error: 'Нажмите ▶, чтобы включить звук' }); return; }
    if (err && err.name === 'AbortError') return; // src replaced
    nextSource(err && err.name);
  });
}

function nextSource() {
  if (!job) return;
  const bad = job.sources[job.srcIdx];
  if (bad) badHosts.add(hostOf(bad));
  job.srcIdx++;
  if (job.srcIdx < job.sources.length) startSource(); else fail();
}

function fail() {
  clearTimer();
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  set({ state: 'error', error: offline ? 'Нет интернета. Аудио, которое вы уже слушали, доступно офлайн; это ещё не скачано.' : 'Не удалось загрузить аудио. Проверьте интернет и нажмите «Повторить».' });
  document.dispatchEvent(new CustomEvent('audio-error', { detail: { ...status } }));
}

el.addEventListener('playing', () => {
  clearTimer();
  if (!job) return;
  el.playbackRate = state.settings.speed || 1;
  set({ state: 'playing', error: null });
  const u = el.currentSrc || el.src;
  // ask the service worker to keep a full copy for offline use
  try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'cache-audio', url: u }); } catch { /* no SW */ }
});
el.addEventListener('loadedmetadata', () => { el.playbackRate = state.settings.speed || 1; });
el.addEventListener('waiting', () => { if (job && status.state === 'playing') set({ state: 'loading' }); armTimer(); });
el.addEventListener('pause', () => { if (job && status.state === 'playing' && !el.ended) set({ state: 'paused' }); });
el.addEventListener('error', () => { if (job && el.src) nextSource('error'); });
el.addEventListener('ended', () => {
  if (!job) return;
  if (job.rep + 1 < job.repeat) {
    job.rep++;
    set({ rep: job.rep });
    el.currentTime = 0;
    const p = el.play(); if (p && p.catch) p.catch(() => nextSource());
    return;
  }
  job.rep = 0;
  if (job.i + 1 < job.items.length) {
    job.i++;
    if (job.gap) { set({ state: 'loading' }); setTimeout(() => { if (job) loadCurrent(); }, job.gap); } else loadCurrent();
    return;
  }
  const done = job.onDone;
  stop();
  if (done) done();
});

/**
 * Play a ref (ayah | ayahs | word | url) or an array of refs. Must be called from a tap handler.
 * opts: {repeat, label, onItem(ref, i), onDone(), gap(ms between items)}
 */
export function play(refOrList, opts = {}) {
  const items = (Array.isArray(refOrList) ? refOrList : [refOrList]).flatMap(expand);
  if (!items.length) return null;
  clearTimer();
  job = { id: ++jobSeq, items, i: 0, rep: 0, repeat: Math.max(1, opts.repeat || 1), label: opts.label || '', onItem: opts.onItem, onDone: opts.onDone, gap: opts.gap || 0 };
  set({ jobId: job.id, label: job.label });
  loadCurrent();
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: opts.label || 'Коран', artist: reciterName(state.settings.reciter) }); } catch { /* unsupported */ }
  }
  return job.id;
}

export function toggle() {
  if (!job) return;
  if (status.state === 'playing' || status.state === 'loading') { el.pause(); clearTimer(); set({ state: 'paused' }); }
  else if (status.state === 'error') retry();
  else { const p = el.play(); if (p && p.catch) p.catch(() => retry()); set({ state: 'loading' }); armTimer(); }
}
export function retry() {
  if (!job) return;
  badHosts.clear();
  loadCurrent();
}
export function stop() {
  clearTimer();
  job = null;
  try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* ignore */ }
  set({ state: 'idle', jobId: null, ref: null, label: '', error: null, index: 0, total: 0, rep: 0 });
}
export function setSpeed(v) { el.playbackRate = v; }
export const isActive = id => status.jobId === id && status.state !== 'idle';
export const sameRef = (a, b) => !!a && !!b && a.kind === b.kind && a.key === b.key && a.src === b.src;
