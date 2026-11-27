import { h, icon, clear, md, shuffle } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { loadJSON } from '../core/content.js';
import * as srs from '../core/srs.js';
import { getSurah } from '../core/quran.js';
import * as audio from '../core/audio.js';
import { page, empty, seg, sourcesBlock, toast, celebrate, sheet } from '../ui/components.js';
import { ayahView, tajweedHint } from '../ui/arabic.js';
import { runQuiz } from '../ui/quiz.js';
import { STATUS } from './hifz.js';
import { checkBadges } from '../core/progress.js';

const TABS = [['read', 'Читать'], ['repeat', 'Повтор'], ['hide', 'Скрыть слова'], ['fill', 'Пропуск'], ['order', 'Порядок'], ['recite', 'Слушай и повтори'], ['review', 'Статус']];

export default async function hifzSurah(id) {
  const { surahs } = await loadJSON('data/hifz/surahs.json');
  const s = surahs.find(x => x.id === id);
  if (!s) return page('Сура', empty('Сура не найдена.'));
  const data = await getSurah(s.surah);
  const from = s.range ? s.range.from : 1;
  const to = s.range ? s.range.to : data.count;
  const keys = [];
  for (let a = from; a <= to; a++) keys.push(`${s.surah}:${a}`);
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  let tab = TABS.some(t => t[0] === params.get('tab')) ? params.get('tab') : 'read';
  const tabsEl = h('div.tabs', { role: 'tablist' });
  const body = h('div');
  const showBasmala = s.surah !== 1 && s.surah !== 9 && from === 1;
  const basmalaText = showBasmala ? (await getSurah(1)).ayahs[0].ar : '';
  const basmala = () => (showBasmala ? h('p.bismillah', { lang: 'ar' }, basmalaText) : null);

  const setStatus = st => update(x => {
    const cur = x.hifz[s.id] || {};
    x.hifz[s.id] = { ...cur, status: st, at: todayKey(), srs: st === 'learned' || st === 'review' ? (cur.srs || srs.next(null, 4)) : cur.srs };
    if (st === 'learning') x.last.surah = s.id;
  }, 'hifz');

  const renderTab = () => {
    audio.stop();
    clear(tabsEl);
    for (const [t, label] of TABS) tabsEl.append(h('button', { role: 'tab', 'aria-selected': String(t === tab), onclick: () => { tab = t; renderTab(); } }, label));
    clear(body);
    const make = TABS_IMPL[tab];
    body.append(make());
  };

  const TABS_IMPL = {
    read: () => h('div',
      tajweedHint(),
      h('div.row', { style: { margin: 'var(--s2) 0' } }, h('button.btn.btn--primary', { onclick: () => audio.play(keys.map(k => ({ kind: 'ayah', key: k })), { label: s.nameRu }) }, icon('play'), 'Слушать всю')),
      basmala(),
      ...keys.map(k => ayahView(k))),
    repeat: () => {
      let n = 3;
      let idx = 0;
      const host = h('div');
      const paint = () => {
        clear(host);
        host.append(ayahView(keys[idx], { big: true }),
          h('div.row', { style: { justifyContent: 'space-between', marginTop: 'var(--s3)' } },
            h('button.icon-btn', { 'aria-label': 'Предыдущий аят', disabled: idx === 0, onclick: () => { idx--; paint(); } }, icon('back')),
            h('span.small.muted', `Аят ${idx + 1} из ${keys.length}`),
            h('button.icon-btn', { 'aria-label': 'Следующий аят', disabled: idx === keys.length - 1, onclick: () => { idx++; paint(); } }, icon('chevron'))),
          h('button.btn.btn--primary.btn--lg.btn--block', { style: { marginTop: 'var(--s3)' }, onclick: () => audio.play({ kind: 'ayah', key: keys[idx] }, { repeat: n, label: `Аят ${keys[idx]}` }) }, icon('repeat'), `Повторить аят ${n} раз`));
      };
      paint();
      return h('div', h('p', 'Слушайте один аят несколько раз подряд и повторяйте за чтецом. Сколько раз?'),
        seg([1, 3, 5, 10, 20].map(v => ({ value: v, label: `×${v}` })), n, v => { n = v; paint(); }),
        h('div', { style: { marginTop: 'var(--s4)' } }, host));
    },
    hide: () => {
      let level = 1;
      const host = h('div');
      const paint = () => {
        clear(host);
        host.append(basmala());
        keys.forEach((k, ai) => {
          const nWords = data.ayahs[+k.split(':')[1] - 1].words.length;
          const order = shuffle([...Array(nWords).keys()].map(i => i + 1), 7919 * (ai + 1));
          const hidden = new Set(order.slice(0, Math.round(nWords * level / 4)));
          host.append(ayahView(k, { hide: hidden, noRu: level >= 2, onWord: (w, span) => { span.classList.toggle('is-hidden'); } }));
        });
      };
      paint();
      return h('div', h('p', 'Часть слов скрыта. Прочитайте аят по памяти, затем нажмите на скрытое слово, чтобы проверить себя.'),
        seg([{ value: 0, label: '0%' }, { value: 1, label: '25%' }, { value: 2, label: '50%' }, { value: 3, label: '75%' }, { value: 4, label: 'Всё' }], level, v => { level = v; paint(); }),
        h('div', { style: { marginTop: 'var(--s3)' } }, host));
    },
    fill: () => {
      const host = h('div');
      const qs = [];
      const allWords = keys.flatMap(k => data.ayahs[+k.split(':')[1] - 1].words.map(w => w.ar));
      for (const k of shuffle(keys).slice(0, 10)) {
        const a = data.ayahs[+k.split(':')[1] - 1];
        if (a.words.length < 2) continue;
        const wi = Math.floor(Math.random() * a.words.length);
        const right = a.words[wi].ar;
        const wrong = shuffle([...new Set(allWords.filter(w => w !== right))]).slice(0, 3);
        if (wrong.length < 2) continue;
        const opts = shuffle([right, ...wrong]);
        qs.push({ id: `q-hifz-fill-${k.replace(':', '-')}-${wi}`, type: 'fill', prompt: `Аят ${k}: какое слово пропущено?`, promptAr: a.words.map((w, i) => (i === wi ? '___' : w.ar)).join(' '), options: opts, answer: opts.indexOf(right), explain: `Правильно: ${right}. Перевод аята: ${a.ru}`, audio: { kind: 'ayah', key: k } });
      }
      if (!qs.length) return h('p.muted', 'В этом отрывке слишком мало слов для упражнения.');
      runQuiz(host, qs, { title: 'Пропущенное слово' });
      return host;
    },
    order: () => {
      const host = h('div');
      let q;
      if (keys.length >= 3) {
        const start = Math.floor(Math.random() * Math.max(1, keys.length - 5));
        const part = keys.slice(start, start + Math.min(6, keys.length));
        q = { id: `q-hifz-order-${s.id}-${start}`, type: 'order', prompt: 'Расставьте аяты по порядку', items: part.map(k => data.ayahs[+k.split(':')[1] - 1].ar), explain: 'Аяты идут в том порядке, в котором они записаны в мусхафе.' };
      } else {
        const a = data.ayahs[from - 1];
        const words = a.words.slice(0, 8);
        q = { id: `q-hifz-worder-${s.id}`, type: 'order', prompt: 'Расставьте слова аята по порядку (начало аята сверху)', items: words.map(w => w.ar), explain: `Аят ${s.surah}:${from}. ${a.ru}` };
      }
      runQuiz(host, [q], { title: 'Порядок' });
      return h('div', h('p.small.muted', 'Перетащите карточки пальцем. Каждый раз выбирается новый отрывок.'), host);
    },
    recite: () => {
      let idx = 0;
      let running = false;
      const status = h('p', { 'aria-live': 'polite', style: { fontWeight: 700, minHeight: '1.6em' } }, 'Нажмите «Начать»: чтец прочитает аят, затем будет пауза, чтобы вы повторили вслух.');
      const view = h('div');
      const startBtn = h('button.btn.btn--primary.btn--lg.btn--block', { type: 'button' }, icon('play'), 'Начать');
      let timer = null;
      const stopAll = () => { running = false; clearInterval(timer); audio.stop(); startBtn.replaceChildren(icon('play'), 'Начать'); };
      const step = () => {
        if (!running) return;
        clear(view); view.append(ayahView(keys[idx], { big: true }));
        status.textContent = `Слушайте аят ${idx + 1} из ${keys.length}…`;
        audio.play({ kind: 'ayah', key: keys[idx] }, {
          label: `Аят ${keys[idx]}`,
          onDone: () => {
            if (!running) return;
            const words = data.ayahs[+keys[idx].split(':')[1] - 1].words.length;
            let left = Math.max(3, Math.round(words * 0.9));
            status.textContent = `Теперь повторите вслух: ${left} с`;
            timer = setInterval(() => {
              left--;
              if (left > 0) { status.textContent = `Теперь повторите вслух: ${left} с`; return; }
              clearInterval(timer);
              idx++;
              if (idx >= keys.length) { stopAll(); idx = 0; status.textContent = 'Готово! Ма ша Аллах. Можно пройти ещё раз.'; celebrate(); return; }
              step();
            }, 1000);
          },
        });
      };
      startBtn.addEventListener('click', () => { if (running) { stopAll(); status.textContent = 'Остановлено.'; return; } running = true; startBtn.replaceChildren(icon('stop'), 'Остановить'); step(); });
      return h('div', status, startBtn, h('div', { style: { marginTop: 'var(--s3)' } }, view));
    },
    review: () => {
      const cur = state.hifz[s.id] || {};
      const st = cur.status || 'new';
      return h('div.stack',
        h('p', 'Отметьте, на каком вы этапе. Выученные суры приложение будет предлагать повторять: сначала через день, потом всё реже (интервальное повторение).'),
        seg(Object.entries(STATUS).map(([v, label]) => ({ value: v, label })), st, v => { setStatus(v); if (v === 'learned') { celebrate(); checkBadges(); } toast(`Статус: ${STATUS[v]}`); }),
        cur.srs ? h('p.small.muted', `Следующее повторение: ${cur.srs.due}`) : null,
        st === 'learned' || st === 'review' ? h('div.card.card--soft.stack',
          h('strong', 'Повторила сегодня. Как прошло?'),
          h('div.row',
            ...[['Трудно', 2], ['Нормально', 4], ['Легко', 5]].map(([label, q]) => h('button.btn.grow', { onclick: () => {
              update(x => { const c = x.hifz[s.id]; c.srs = srs.next(c.srs, q); c.status = 'review'; c.reps = (c.reps || 0) + 1; }, 'hifz');
              toast(q < 3 ? 'Повторим завтра. Терпение приносит плоды.' : `Отлично! Следующее повторение: ${state.hifz[s.id].srs.due}`);
              renderTab();
            } }, label)))) : null);
    },
  };

  renderTab();
  const status = (state.hifz[s.id] || {}).status || 'new';
  const intro = h('details.card', { open: status === 'new' },
    h('summary', { style: { fontWeight: 800, minHeight: '44px', cursor: 'pointer' } }, 'О суре'),
    h('p.small.muted', `${s.revelation === 'mecca' ? 'Мекканская' : 'Мединская'} · ${s.ayahs} ${s.ayahs === 1 ? 'аят' : 'аятов'}${s.range ? ` (аяты ${s.range.from}–${s.range.to} суры ${s.surah})` : ''}`),
    md(s.about),
    s.context ? h('div', h('strong', 'Когда и почему ниспослана'), md(s.context)) : null,
    s.virtues && s.virtues.length ? h('div', h('strong', 'Достоинства'), h('ul', s.virtues.map(v => h('li', md(v.md), h('a.small', { href: v.url, target: '_blank', rel: 'noopener' }, v.source))))) : null);
  return page(s.nameRu, h('div',
    h('p.ar-inline', { lang: 'ar', style: { display: 'block', textAlign: 'center', fontSize: '2rem', color: 'var(--primary)', margin: '0 0 var(--s2)' } }, data.nameAr.replace(/^سُورَةُ\s*/, '')),
    h('p.center.muted', { style: { marginTop: 0 } }, s.meaningRu),
    intro,
    h('div', { style: { marginTop: 'var(--s4)' } }, tabsEl, body),
    sourcesBlock(s.sources)));
}

export { sheet };
