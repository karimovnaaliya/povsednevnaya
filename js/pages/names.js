import { h, icon, clear, shuffle } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { loadJSON } from '../core/content.js';
import * as srs from '../core/srs.js';
import { page, sheet, sourcesBlock, bar, celebrate } from '../ui/components.js';
import { ayahView } from '../ui/arabic.js';
import { runQuiz } from '../ui/quiz.js';

export default async function names() {
  const { names: list, sources } = await loadJSON('data/misc/names99.json');
  const known = () => list.filter(n => state.names[n.n] && state.names[n.n].known).length;
  let tab = 'list';
  const tabs = h('div.tabs', { role: 'tablist' });
  const body = h('div');

  const nameSheet = n => sheet(`${n.n}. ${n.tr}`, h('div.stack',
    h('div.arblock', h('div.arblock__ar.arblock__ar--xl', { lang: 'ar' }, n.ar), h('div.arblock__tr', n.tr), h('div.arblock__ru', { style: { fontWeight: 700 } }, n.ru)),
    h('p', n.explain),
    n.ref ? h('div', h('p.small.muted', { style: { margin: 0 } }, 'Где встречается в Коране:'), ayahView(n.ref, { noTr: true })) : null));

  const render = () => {
    clear(tabs);
    for (const [t, label] of [['list', 'Список'], ['cards', 'Карточки'], ['game', 'Игра']]) tabs.append(h('button', { role: 'tab', 'aria-selected': String(t === tab), onclick: () => { tab = t; render(); } }, label));
    clear(body);
    if (tab === 'list') {
      body.append(h('div.stack', list.map(n => h('button.tile', { type: 'button', onclick: () => nameSheet(n) },
        h('span.tile__icon', { style: { fontWeight: 800 } }, String(n.n)),
        h('span.tile__body', h('span.tile__title', n.tr), h('span.tile__sub', n.ru)),
        h('span.tile__end', h('span.ar-inline', { lang: 'ar' }, n.ar), state.names[n.n] && state.names[n.n].known ? icon('check') : null)))));
    } else if (tab === 'cards') {
      // due cards first, then unknown
      const due = list.filter(n => state.names[n.n] && state.names[n.n].srs && srs.isDue(state.names[n.n].srs));
      const fresh = list.filter(n => !state.names[n.n]);
      const deck = [...due, ...fresh].slice(0, 15);
      let i = 0;
      const host = h('div');
      const paint = () => {
        clear(host);
        if (i >= deck.length || !deck.length) {
          host.append(h('div.result.card', h('div.result__big', '✓'), h('p', deck.length ? 'Карточки на сегодня пройдены!' : 'Все карточки повторены. Приходите завтра.'), h('button.btn.btn--ghost', { onclick: () => { tab = 'list'; render(); } }, 'К списку')));
          if (deck.length) celebrate();
          return;
        }
        const n = deck[i];
        const card = h('button.flash__card', { type: 'button', 'aria-label': 'Перевернуть' },
          h('div.flash__face', h('span.ar-inline', { lang: 'ar' }, n.ar), h('span.small.muted', { style: { marginTop: '6px' } }, 'вспомните значение и нажмите')),
          h('div.flash__face.flash__face--back', h('strong', n.tr), h('span', n.ru)));
        const grade = q => {
          update(s => { const cur = s.names[n.n] || {}; const it = srs.next(cur.srs, q); s.names[n.n] = { srs: it, known: q >= 4 || !!cur.known && q >= 3 }; }, 'names');
          i++; paint();
        };
        const answers = h('div.row', { style: { marginTop: 'var(--s3)', visibility: 'hidden' } },
          h('button.btn.grow', { onclick: () => grade(1) }, 'Не помню'),
          h('button.btn.grow', { onclick: () => grade(3) }, 'С трудом'),
          h('button.btn.btn--primary.grow', { onclick: () => grade(5) }, 'Знаю'));
        card.addEventListener('click', () => { card.classList.toggle('is-flipped'); answers.style.visibility = 'visible'; });
        host.append(h('p.small.muted', `Карточка ${i + 1} из ${deck.length}`), h('div.flash', card), answers);
      };
      paint();
      body.append(host);
    } else {
      const host = h('div');
      const pick = shuffle(list).slice(0, 20);
      const qs = [];
      for (let k = 0; k + 4 <= pick.length && qs.length < 3; k += 4) qs.push({ id: `q-gen-names-connect-${pick[k].n}`, type: 'connect', prompt: 'Соедините имя с его значением', pairs: pick.slice(k, k + 4).map(n => [n.ar, n.ru.split(' (')[0]]), explain: pick.slice(k, k + 4).map(n => `${n.tr} — ${n.ru}`).join('; ') });
      for (const n of pick.slice(12, 18)) {
        const opts = shuffle([n, ...shuffle(list.filter(x => x.n !== n.n)).slice(0, 3)]);
        qs.push({ id: `q-gen-names-mcq-${n.n}`, type: 'mcq', prompt: 'Что означает это имя?', promptAr: n.ar, options: opts.map(x => x.ru.split(' (')[0]), answer: opts.indexOf(n), explain: `${n.tr}: ${n.explain}` });
      }
      runQuiz(host, shuffle(qs), { title: '99 имён' });
      body.append(host);
    }
  };
  render();
  return page('99 имён Аллаха', h('div',
    h('p.muted', 'Пророк ﷺ сказал: «У Аллаха девяносто девять имён. Кто запомнит их (и будет жить согласно им), войдёт в Рай» (Бухари 2736, Муслим 2677).'),
    h('section.card', h('div.row.row--between', h('strong', `Знаю: ${known()} из 99`)), h('div', { style: { marginTop: '8px' } }, bar(known() / 99, true))),
    h('div', { style: { marginTop: 'var(--s4)' } }, tabs, body),
    sourcesBlock(sources)));
}
