import { h, icon, clear } from '../core/dom.js';
import { state } from '../core/store.js';
import { focus, onFocus, startFocus, pauseFocus, stopFocus } from '../core/session.js';
import { fmtClock } from '../core/time.js';
import { ring, seg, confirmSheet, celebrate } from '../ui/components.js';

export const noNav = true;

let ctx = null;
/** Gentle synthesized bell (no music). Uses Web Audio only for this short chime. */
export function chime() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.35);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.35 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.35 + 2.4);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + i * 0.35); o.stop(t0 + i * 0.35 + 2.5);
    });
  } catch { /* no audio context */ }
  try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch { /* unsupported */ }
}
function unlockAudio() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); } catch { /* ignore */ } }

const ACTIVITIES = [
  ['#/quran', 'book', 'Урок чтения'],
  ['#/hifz', 'brain', 'Заучивание суры'],
  ['#/revision', 'refresh', 'Повторение'],
  ['#/reader/1', 'volume', 'Слушать и читать'],
  ['#/adhkar', 'sun', 'Азкары'],
  ['#/names', 'star', '99 имён Аллаха'],
];

export default function focusPage() {
  const root = h('div.focus', { role: 'region', 'aria-label': 'Сессия занятий' });
  const orbs = [
    h('div.focus__orb', { style: { width: '320px', height: '320px', background: '#2f7d62', top: '-60px', left: '-80px' } }),
    h('div.focus__orb', { style: { width: '260px', height: '260px', background: '#a87a2e', bottom: '-40px', right: '-60px', animationDelay: '-6s' } }),
  ];
  let len = state.settings.focusLen || 20;
  const body = h('div', { style: { position: 'relative', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s5)' } });
  root.append(...orbs, body);

  const render = () => {
    clear(body);
    const close = h('a.btn.btn--ghost.btn--sm', { href: '#/home', style: { alignSelf: 'flex-start' } }, icon('back'), 'Выйти');
    if (!focus.running) {
      body.append(close,
        h('h1', { style: { margin: 0, color: '#f1ead9' } }, 'Время с Кораном'),
        h('p', { style: { opacity: .8, margin: 0 } }, 'Спокойно, без спешки. Выберите длительность. Если вы выйдете из приложения, таймер встанет на паузу.'),
        seg([10, 20, 30, 45].map(v => ({ value: v, label: `${v} мин` })), len, v => { len = v; }),
        h('button.btn.btn--gold.btn--lg.btn--block', { onclick: () => { unlockAudio(); startFocus(len); } }, icon('play'), 'Начать'),
        h('p.ar-inline', { lang: 'ar', style: { color: '#dcb56c', fontSize: '1.6rem' } }, 'رَبِّ زِدْنِي عِلْمًا'),
        h('p.small', { style: { opacity: .75, margin: 0 } }, '«Господи, приумножь мои знания» (Коран, 20:114)'));
      return;
    }
    const left = Math.max(0, focus.target - focus.elapsed);
    const big = h('div.focus__time', { 'aria-live': 'off' }, focus.completed ? fmtClock(focus.elapsed) : fmtClock(left));
    body.append(close,
      ring(Math.min(1, focus.elapsed / focus.target), { size: 220, stroke: 12, label: '' }),
      big,
      h('p', { style: { margin: 0, opacity: .85 } }, focus.completed ? 'Цель сессии достигнута. Можно продолжать: время продолжает считаться.' : focus.paused ? 'Пауза' : 'Идёт занятие'),
      h('div.row', { style: { width: '100%' } },
        h('button.btn.btn--gold.grow', { onclick: () => pauseFocus(!focus.paused) }, icon(focus.paused ? 'play' : 'pause'), focus.paused ? 'Продолжить' : 'Пауза'),
        h('button.btn.btn--ghost.grow', { onclick: () => confirmSheet('Завершить сессию?', 'Всё время, которое вы уже занимались, сохранится в календаре.', 'Завершить', () => { stopFocus(); location.hash = '#/home'; }) }, icon('stop'), 'Завершить')),
      h('p.small', { style: { opacity: .75, margin: 'var(--s2) 0 0' } }, 'Чем заняться в эту сессию? Таймер останется вверху экрана.'),
      h('div.focus__acts', ACTIVITIES.map(([href, ic, t]) => h('a', { href }, icon(ic), t))));
    // place ring label over: put time inside ring visually
    const r = body.querySelector('.ring');
    r.querySelector('.ring__label').replaceChildren(big);
  };

  let last = null;
  const unsub = onFocus(f => {
    if (!root.isConnected && last !== null) { unsub(); return; }
    const sig = `${f.running}|${f.paused}|${f.completed}`;
    if (sig !== last) { last = sig; render(); }
    else {
      const t = root.querySelector('.focus__time');
      if (t) t.textContent = f.completed ? fmtClock(f.elapsed) : fmtClock(Math.max(0, f.target - f.elapsed));
      const v = root.querySelector('.ring__value');
      if (v) { const c = +v.getAttribute('stroke-dasharray'); v.setAttribute('stroke-dashoffset', c * (1 - Math.min(1, f.elapsed / f.target))); }
    }
  });
  document.addEventListener('focus-complete', () => { if (root.isConnected) celebrate(); }, { once: true });
  return root;
}
