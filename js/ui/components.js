import { h, icon, rich, md, clear } from '../core/dom.js';
import * as audio from '../core/audio.js';

// ---------- page frame ----------
export function topbar(title, { back = true, actions = [] } = {}) {
  return h('header.topbar',
    back ? h('button.topbar__btn', { 'aria-label': 'Назад', onclick: () => goBack() }, icon('back')) : null,
    h('h1.topbar__title', title),
    ...actions,
  );
}
let navs = 0;
addEventListener('hashchange', () => { navs++; });
export function goBack(fallback = '#/home') {
  if (navs > 0) { navs -= 2; history.back(); } else location.hash = fallback;
}

export function tile({ href, onclick, iconName, iconText, gold, title, sub, end, disabled }) {
  const tag = href ? 'a.tile' : 'button.tile';
  return h(tag, { href: disabled ? undefined : href, onclick: disabled ? null : onclick, type: href ? undefined : 'button', 'aria-disabled': disabled ? 'true' : null },
    (iconName || iconText) ? h(`span.tile__icon${gold ? '.tile__icon--gold' : ''}${iconText ? '.tile__icon--ar' : ''}`, iconText ? rich(iconText) : icon(iconName)) : null,
    h('span.tile__body', h('span.tile__title', title), sub ? h('span.tile__sub', { style: { display: 'block' } }, sub) : null),
    h('span.tile__end', end ?? null, disabled ? icon('lock') : icon('chevron')),
  );
}

export function sectionTitle(text, link) {
  return h('div.section-title', h('h2', text), link || null);
}

export function ring(value, { size = 120, stroke = 10, label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('aria-hidden', 'true');
  const mk = (cls, off) => {
    const ci = document.createElementNS(svgNS, 'circle');
    ci.setAttribute('cx', size / 2); ci.setAttribute('cy', size / 2); ci.setAttribute('r', r);
    ci.setAttribute('fill', 'none'); ci.setAttribute('stroke-width', stroke); ci.setAttribute('class', cls);
    ci.setAttribute('stroke-linecap', 'round');
    if (off != null) { ci.setAttribute('stroke-dasharray', c); ci.setAttribute('stroke-dashoffset', off); }
    return ci;
  };
  svg.append(mk('ring__track'), mk('ring__value', c * (1 - v)));
  return h('div.ring', { role: 'img', 'aria-label': `${label} ${sub}`.trim() }, svg,
    h('div.ring__label', h('span', label, sub ? h('small', sub) : null)));
}

export function bar(value, gold = false) {
  const v = Math.max(0, Math.min(1, value || 0));
  return h(`div.bar${gold ? '.bar--gold' : ''}`, { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(v * 100) }, h('span', { style: { width: `${v * 100}%` } }));
}

export function seg(options, value, onChange) {
  const wrap = h('div.seg', { role: 'group' });
  const render = cur => {
    clear(wrap);
    for (const o of options) {
      wrap.append(h('button', { type: 'button', 'aria-pressed': String(o.value === cur), onclick: () => { render(o.value); onChange(o.value); } }, o.label));
    }
  };
  render(value);
  return wrap;
}

export function switchRow(label, checked, onChange, hint) {
  const id = `sw-${Math.random().toString(36).slice(2, 8)}`;
  return h('label.switch', { for: id },
    h('span', h('span', { style: { fontWeight: 650 } }, label), hint ? h('span.field__hint', { style: { display: 'block' } }, hint) : null),
    h('input', { id, type: 'checkbox', checked, role: 'switch', onchange: e => onChange(e.target.checked) }));
}

export function checkRow(label, checked, onToggle, sub) {
  const btn = h('button.check', { type: 'button', role: 'checkbox', 'aria-checked': String(!!checked) },
    h('span.check__box', icon('check')), h('span', label, sub ? h('span.check__sub', sub) : null));
  btn.addEventListener('click', () => {
    const v = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(v));
    onToggle(v);
  });
  return btn;
}

export function empty(text, iconName = 'sparkle', action) {
  return h('div.empty', icon(iconName), h('p', text), action || null);
}
export function errorBox(msg, onRetry) {
  return h('div.error-box', { role: 'alert' }, h('p', msg), onRetry ? h('button.btn.btn--sm', { onclick: onRetry }, icon('refresh'), 'Повторить') : null);
}
export const skeleton = (n = 3) => h('div.stack', Array.from({ length: n }, () => h('div.skeleton')));

// ---------- sheet (modal) ----------
export function sheet(title, content, { onClose } = {}) {
  const prevFocus = document.activeElement;
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const box = h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div.sheet__grip'),
    h('div.sheet__head', h('h2', title), h('button.icon-btn', { 'aria-label': 'Закрыть', onclick: close }, icon('close'))),
    typeof content === 'function' ? content(close) : content);
  const backdrop = h('div.sheet-backdrop', { onclick: e => { if (e.target === backdrop) close(); } }, box);
  document.body.append(backdrop);
  document.addEventListener('keydown', onKey);
  setTimeout(() => { const f = box.querySelector('button, a, input'); if (f) f.focus({ preventScroll: true }); }, 50);
  return close;
}

export function confirmSheet(title, text, okLabel, onOk, danger = false) {
  sheet(title, close => h('div.stack', h('p', text), h('div.row',
    h('button.btn.btn--ghost.grow', { onclick: close }, 'Отмена'),
    h(`button.btn.grow${danger ? '.btn--danger' : '.btn--primary'}`, { onclick: () => { close(); onOk(); } }, okLabel))));
}

// ---------- toast ----------
let toastWrap = null;
export function toast(msg, { error = false, action, actionLabel, ms = 3500 } = {}) {
  if (!toastWrap) { toastWrap = h('div.toast-wrap', { 'aria-live': 'polite' }); document.body.append(toastWrap); }
  const t = h(`div.toast${error ? '.toast--error' : ''}`, { role: error ? 'alert' : 'status' }, h('span.toast__msg', msg));
  let timer;
  const close = () => { clearTimeout(timer); t.remove(); };
  if (action) t.append(h('button.btn', { onclick: () => { close(); action(); } }, actionLabel || 'OK'));
  toastWrap.append(t);
  timer = setTimeout(close, action ? Math.max(ms, 7000) : ms);
  return close;
}

export function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wrap = h('div.celebrate', { 'aria-hidden': 'true' });
  for (let i = 0; i < 26; i++) {
    const colors = ['var(--gold)', 'var(--primary)', 'var(--primary-2)', 'var(--gold-soft)'];
    wrap.append(h('i', { style: { left: `${Math.random() * 100}%`, background: colors[i % 4], animationDelay: `${Math.random() * .6}s`, width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px` } }));
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 3200);
}

// ---------- audio button ----------
/** Round button that plays a ref; reflects loading/playing/error states. */
export function audioButton(ref, { label = 'Слушать', repeat, small = false, title } = {}) {
  if (!ref) return null;
  const spin = icon('spinner', 'spin');
  const btn = h('button.icon-btn.abtn', { type: 'button', 'aria-label': label, title: label, style: small ? { width: '40px', height: '40px' } : null }, icon('volume'), spin);
  let myJob = null;
  const unsub = audio.onStatus(st => {
    if (!btn.isConnected && myJob) { unsub(); return; }
    const mine = myJob && st.jobId === myJob;
    btn.classList.toggle('is-loading', mine && st.state === 'loading');
    btn.classList.toggle('is-playing', mine && st.state === 'playing');
    btn.classList.toggle('is-error', mine && st.state === 'error');
    btn.setAttribute('aria-pressed', String(mine && st.state === 'playing'));
  });
  btn.addEventListener('click', () => {
    if (myJob && audio.status.jobId === myJob && audio.status.state !== 'idle') {
      if (audio.status.state === 'error') audio.retry(); else audio.stop();
      return;
    }
    myJob = audio.play(ref, { repeat: typeof repeat === 'function' ? repeat() : repeat, label: title || label });
  });
  return btn;
}

/** Global mini player shown while audio plays (stop / pause / retry). */
export function mountPlayer() {
  let bar = null;
  audio.onStatus(st => {
    if (st.state === 'idle') { if (bar) { bar.remove(); bar = null; } return; }
    if (!bar) { bar = h('div.player', { role: 'region', 'aria-label': 'Аудиоплеер' }); document.body.append(bar); }
    clear(bar);
    const label = st.state === 'error' || st.state === 'blocked' ? st.error
      : `${st.label || 'Аудио'}${st.total > 1 ? ` · ${st.index + 1}/${st.total}` : ''}${st.repeat > 1 ? ` · повтор ${st.rep + 1}/${st.repeat}` : ''}${st.state === 'loading' ? ' · загрузка…' : ''}`;
    bar.append(h('span.player__label', { 'aria-live': 'polite' }, label));
    if (st.state === 'error') bar.append(h('button', { 'aria-label': 'Повторить', onclick: () => audio.retry() }, icon('refresh')));
    else bar.append(h('button', { 'aria-label': st.state === 'playing' || st.state === 'loading' ? 'Пауза' : 'Продолжить', onclick: () => audio.toggle() }, icon(st.state === 'playing' || st.state === 'loading' ? 'pause' : 'play')));
    bar.append(h('button', { 'aria-label': 'Остановить', onclick: () => audio.stop() }, icon('close')));
  });
}

// ---------- sources ----------
export function sourcesBlock(sources) {
  if (!sources || !sources.length) return null;
  return h('details.sources.card.card--soft',
    h('summary', `Источники (${sources.length})`),
    h('ol', sources.map(s => h('li', h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title)))));
}

export function callout(tone, title, text) {
  return h(`div.callout.callout--${tone}`, title ? h('div.callout__title', title) : null, md(text));
}

/** Standard page: topbar + <main class="page">. */
export function page(title, children, { back = true, actions = [], bare = false } = {}) {
  return h('div',
    title != null ? topbar(title, { back, actions }) : null,
    h(`main.page${bare ? '.page--bare' : ''}`, { id: 'main' }, children));
}

/** Grade badge for duas/hadith. */
export function gradeBadge(g) {
  const m = { quran: ['Коран', 'badge--gold'], sahih: ['Достоверный (сахих)', 'badge--ok'], hasan: ['Хороший (хасан)', 'badge--ok'], daif: ['Слабый (даиф)', 'badge--warn'] }[g];
  return m ? h(`span.badge.${m[1]}`, m[0]) : null;
}
