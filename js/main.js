import { h, icon, clear } from './core/dom.js';
import { state, subscribe, isMemoryOnly } from './core/store.js';
import { focus, onFocus, pauseFocus } from './core/session.js';
import { fmtClock } from './core/time.js';
import { mountPlayer, toast, celebrate } from './ui/components.js';
import * as audio from './core/audio.js';

// ---------- routes ----------
const ROUTES = [
  [/^\/?$|^\/home$/, 'home', 'home'],
  [/^\/focus$/, 'focus', 'home'],
  [/^\/calendar$/, 'calendar', 'home'],
  [/^\/quran$/, 'quran', 'quran'],
  [/^\/quran\/level\/(\d)$/, 'level', 'quran'],
  [/^\/test\/(\d)$/, 'level-test', 'quran'],
  [/^\/lesson\/([\w-]+)$/, 'lesson', null],
  [/^\/legend$/, 'legend', 'quran'],
  [/^\/hifz$/, 'hifz', 'quran'],
  [/^\/hifz\/([\w-]+)$/, 'hifz-surah', 'quran'],
  [/^\/reader$/, 'reader-list', 'quran'],
  [/^\/reader\/(\d+)$/, 'reader', 'quran'],
  [/^\/namaz$/, 'namaz', 'namaz'],
  [/^\/prayer-times$/, 'prayer-times', 'namaz'],
  [/^\/prayers$/, 'prayer-tracker', 'namaz'],
  [/^\/qibla$/, 'qibla', 'namaz'],
  [/^\/duas$/, 'duas', 'duas'],
  [/^\/duas\/([\w-]+)$/, 'dua-category', 'duas'],
  [/^\/dua\/([\w-]+)$/, 'dua', 'duas'],
  [/^\/adhkar$/, 'adhkar-list', 'duas'],
  [/^\/adhkar\/([\w-]+)$/, 'adhkar', 'duas'],
  [/^\/tasbih$/, 'tasbih', 'duas'],
  [/^\/names$/, 'names', 'more'],
  [/^\/islam$/, 'islam', 'more'],
  [/^\/islam\/([\w-]+)$/, 'islam-section', 'more'],
  [/^\/revision$/, 'revision', 'more'],
  [/^\/goals$/, 'goals', 'more'],
  [/^\/settings$/, 'settings', 'more'],
  [/^\/more$/, 'more', 'more'],
  [/^\/journal$/, 'journal', 'more'],
  [/^\/habits$/, 'habits', 'more'],
  [/^\/ramadan$/, 'ramadan', 'more'],
  [/^\/special$/, 'special', 'home'],
  [/^\/about$/, 'about', 'more'],
];

const NAV = [
  ['home', '#/home', 'Главная', 'home'],
  ['quran', '#/quran', 'Коран', 'book'],
  ['namaz', '#/namaz', 'Намаз', 'mosque'],
  ['duas', '#/duas', 'Дуа', 'hands'],
  ['more', '#/more', 'Ещё', 'grid'],
];

const view = document.getElementById('view');
const nav = h('nav.bottomnav', { 'aria-label': 'Основные разделы' }, NAV.map(([id, href, label, ic]) =>
  h('a', { href, dataset: { tab: id } }, h('span.bottomnav__icon', icon(ic)), h('span', label))));
document.body.append(nav);

export let navCount = 0;
let renderSeq = 0;
let currentTab = null;

async function render() {
  const seq = ++renderSeq;
  const path = (location.hash || '#/home').slice(1).split('?')[0];
  let match = null;
  for (const [re, page, tab] of ROUTES) { const m = re.exec(path); if (m) { match = { page, tab, params: m.slice(1) }; break; } }
  if (!match) match = { page: 'not-found', tab: null, params: [] };
  try {
    const mod = await import(`./pages/${match.page}.js`);
    const el = await mod.default(...match.params.map(decodeURIComponent));
    if (seq !== renderSeq) return;
    clear(view);
    view.append(el);
    document.body.classList.toggle('no-nav', !!mod.noNav);
    currentTab = match.tab || currentTab;
    nav.querySelectorAll('a').forEach(a => a.setAttribute('aria-current', a.dataset.tab === currentTab ? 'page' : 'false'));
    const t = el.querySelector && el.querySelector('.topbar__title');
    document.title = t && match.page !== 'home' ? `${t.textContent} · Путь к Корану` : 'Путь к Корану';
    if (!location.hash.includes('#keep')) window.scrollTo(0, 0);
    const h1 = el.querySelector('h1');
    if (h1 && navCount > 0) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  } catch (e) {
    console.error(e);
    if (seq !== renderSeq) return;
    clear(view);
    view.append(h('main.page', h('div.error-box', h('h2', 'Не удалось открыть страницу'), h('p', navigator.onLine === false ? 'Нет интернета, а эта страница ещё не сохранена на телефоне.' : 'Попробуйте ещё раз.'), h('button.btn', { onclick: render }, 'Повторить'), ' ', h('a.btn.btn--ghost', { href: '#/home' }, 'На главную'))));
  }
}

addEventListener('hashchange', () => { navCount++; render(); });
export function rerender() { render(); }

// ---------- theme & display settings ----------
const mq = matchMedia('(prefers-color-scheme: dark)');
export function applySettings() {
  const s = state.settings;
  const theme = s.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : s.theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--ar-scale', s.arScale || 1);
  document.body.classList.toggle('no-tajweed', !s.tajweed);
  document.body.classList.toggle('hide-tr', !s.showTr);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#0e171c' : theme === 'sepia' ? '#efe3c8' : '#f6f1e7';
}
mq.addEventListener ? mq.addEventListener('change', applySettings) : mq.addListener(applySettings);
subscribe(topic => { if (topic === 'settings' || topic === 'import') applySettings(); if (topic === 'import') render(); });
applySettings();

// ---------- focus pill (timer visible on other pages) ----------
let pill = null;
onFocus(f => {
  const onFocusPage = location.hash.startsWith('#/focus');
  if (!f.running || onFocusPage) { if (pill) { pill.remove(); pill = null; } return; }
  if (!pill) {
    pill = h('button.focus-pill', { type: 'button', onclick: () => { location.hash = '#/focus'; } });
    document.body.append(pill);
  }
  pill.classList.toggle('is-paused', f.paused);
  const left = Math.max(0, f.target - f.elapsed);
  clear(pill);
  pill.append(icon(f.paused ? 'pause' : 'clock'), f.completed ? `+${fmtClock(f.elapsed - f.target)}` : fmtClock(left));
  pill.setAttribute('aria-label', f.paused ? 'Сессия на паузе, открыть' : `Осталось ${fmtClock(left)}, открыть сессию`);
});
addEventListener('hashchange', () => onFocus(() => {})());

// ---------- global events ----------
mountPlayer();
document.addEventListener('goal-reached', () => { celebrate(); toast('Цель на сегодня выполнена! Барака Ллаху фики 🌿'); });
document.addEventListener('focus-complete', () => {
  import('./pages/focus.js').then(m => m.chime && m.chime());
  if (!location.hash.startsWith('#/focus')) toast('Сессия завершена. Ма ша Аллах!');
});
document.addEventListener('audio-error', e => {
  toast(e.detail.error || 'Аудио не загрузилось', { error: true, action: () => audio.retry(), actionLabel: 'Повторить' });
});
addEventListener('offline', () => toast('Нет интернета: работает то, что уже сохранено на телефоне.'));

if (isMemoryOnly()) setTimeout(() => toast('Браузер не даёт сохранять прогресс (приватный режим?). Сделайте резервную копию в настройках.', { error: true }), 1500);

// ---------- reminders (while the app is open; system push needs a server) ----------
function checkReminder() {
  const s = state.settings;
  if (!s.reminder || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const [hh, mm] = (s.reminderTime || '20:00').split(':').map(Number);
  const key = `rem-${now.toDateString()}`;
  try { if (localStorage.getItem(key)) return; } catch { return; }
  if (now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= mm)) {
    const d = state.days[`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`];
    const goal = (s.dailyGoal || 20) * 60;
    if (!d || d.special || (d.sec || 0) < goal) {
      const body = 'Несколько минут с Кораном сегодня? Даже 5 минут — уже благо.';
      navigator.serviceWorker && navigator.serviceWorker.ready
        ? navigator.serviceWorker.ready.then(r => r.showNotification('Путь к Корану', { body, icon: 'assets/icons/icon-192.png', tag: 'daily' })).catch(() => {})
        : new Notification('Путь к Корану', { body });
    }
    try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
  }
}
setInterval(checkReminder, 60000);
setTimeout(checkReminder, 5000);

// ---------- service worker ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Доступно обновление приложения', { action: () => location.reload(), actionLabel: 'Обновить' });
        });
      });
    }).catch(() => {});
  });
}

document.addEventListener('visibilitychange', () => { if (document.hidden && focus.running && !focus.paused) pauseFocus(true); });

render();
