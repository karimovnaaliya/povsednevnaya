// Renders Lesson objects (CONTENT_SCHEMA.md) into DOM.
import { h, icon, md, rich, clear } from '../core/dom.js';
import { state } from '../core/store.js';
import { ayahView, tajweedHint } from './arabic.js';
import { audioButton, sourcesBlock, sheet, callout } from './components.js';
import { runQuiz } from './quiz.js';

const CALLOUT_TITLE = { info: 'Важно', tip: 'Совет', warn: 'Внимание', hanafi: 'Ханафитский мазхаб', note: 'Примечание' };

// Schematic vocal tract (no face): throat column, tongue, palate, teeth, lips, nasal cavity.
const MAKHRAJ_ZONES = {
  jawf: 'M70 40 Q100 30 120 60 Q125 90 110 110 Q90 120 75 100 Z',
  'throat-deep': 'M38 128 h16 v14 h-16z',
  'throat-mid': 'M38 108 h16 v14 h-16z',
  'throat-top': 'M40 88 h16 v14 h-16z',
  'tongue-back': 'M60 78 q10 -10 20 -6 l-4 12 q-8 -2 -14 2z',
  'tongue-mid': 'M84 70 q12 -4 22 0 l-2 10 q-9 -3 -18 0z',
  'tongue-edge': 'M104 76 q10 2 16 8 l-6 8 q-6 -6 -12 -6z',
  'tongue-tip': 'M120 80 q8 2 12 6 l-6 7 q-4 -3 -9 -5z',
  teeth: 'M134 70 h8 v20 h-8z',
  lips: 'M146 66 q10 4 10 14 q0 10 -10 14 l-2 -4 q6 -4 6 -10 q0 -6 -6 -10z',
  nose: 'M88 34 q30 -6 52 4 l-4 8 q-22 -8 -46 -4z',
};
function makhrajSvg(point) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 180 160');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Схема места произношения');
  svg.innerHTML = `
    <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".55">
      <path d="M36 150 V86 Q40 60 70 50 Q110 38 140 50 Q150 56 150 66"/>
      <path d="M58 150 V96 Q62 82 80 76 Q110 66 128 80 Q134 86 132 92"/>
      <path d="M86 32 Q120 22 150 36"/>
      <path d="M138 64 V92"/>
      <path d="M150 64 q12 6 12 16 q0 10 -12 16"/>
    </g>`;
  const zone = document.createElementNS(ns, 'path');
  zone.setAttribute('d', MAKHRAJ_ZONES[point] || MAKHRAJ_ZONES.jawf);
  zone.setAttribute('class', 'hot');
  svg.append(zone);
  return svg;
}
const MAKHRAJ_NAME = {
  'throat-deep': 'Глубина горла', 'throat-mid': 'Середина горла', 'throat-top': 'Верх горла (ближе ко рту)', 'tongue-back': 'Корень языка', 'tongue-mid': 'Середина языка',
  'tongue-edge': 'Боковой край языка', 'tongue-tip': 'Кончик языка', teeth: 'Зубы и кончик языка', lips: 'Губы', nose: 'Носовая полость (гунна)', jawf: 'Полость рта и горла (буквы мадда)',
};

function letterSheet(it) {
  sheet(it.name, h('div.stack',
    h('div.arblock', h('div.arblock__ar.arblock__ar--xl', { lang: 'ar' }, it.ar), it.tr ? h('div.arblock__tr', it.tr) : null),
    it.forms ? h('div.forms', ['isolated', 'initial', 'medial', 'final'].map(f => h('div', h('span.ar-inline', { lang: 'ar' }, it.forms[f] || '—'), h('small', { isolated: 'отдельно', initial: 'в начале', medial: 'в середине', final: 'в конце' }[f])))) : null,
    it.makhraj ? h('p', h('strong', 'Место произношения: '), it.makhraj) : null,
    it.note ? md(it.note) : null,
    it.audio ? h('div.row', audioButton(it.audio, { label: `Послушать: ${it.name}`, title: it.name }), h('span.small.muted', 'Пример звучания')) : null));
}

function flashcards(cards) {
  let i = 0;
  const host = h('div.flash');
  const counter = h('span.small.muted');
  const render = () => {
    clear(host);
    const c = cards[i];
    const card = h('button.flash__card', { type: 'button', 'aria-label': 'Перевернуть карточку' },
      h('div.flash__face', c.frontAr ? h('span.ar-inline', { lang: 'ar' }, c.front) : rich(c.front), h('span.small.muted', { style: { marginTop: '8px' } }, 'нажмите, чтобы перевернуть')),
      h('div.flash__face.flash__face--back', rich(c.back)));
    card.addEventListener('click', () => card.classList.toggle('is-flipped'));
    host.append(card);
    counter.textContent = `${i + 1} из ${cards.length}`;
  };
  render();
  return h('div', host, h('div.flash__nav',
    h('button.icon-btn', { 'aria-label': 'Предыдущая', onclick: () => { i = (i - 1 + cards.length) % cards.length; render(); } }, icon('back')),
    counter,
    h('button.icon-btn', { 'aria-label': 'Следующая', onclick: () => { i = (i + 1) % cards.length; render(); } }, icon('chevron'))));
}

export function renderBlock(b) {
  switch (b.type) {
    case 'heading': return h('h2', { style: { fontSize: 'var(--fs-lg)', marginTop: 'var(--s5)' } }, rich(b.text));
    case 'text': return md(b.md);
    case 'callout': return callout(b.tone, b.title || CALLOUT_TITLE[b.tone], b.md);
    case 'arabic': return h('div.arblock',
      h(`div.arblock__ar${b.size === 'l' ? '.arblock__ar--l' : b.size === 'xl' ? '.arblock__ar--xl' : ''}`, { lang: 'ar', dir: 'rtl' }, b.ar),
      state.settings.showTr ? h('div.arblock__tr', b.tr) : null,
      h('div.arblock__ru', rich(b.ru)),
      b.note ? h('p.small.muted.center', { style: { margin: '6px 0 0' } }, rich(b.note)) : null,
      b.audio ? h('div.arblock__foot', audioButton(b.audio, { label: 'Послушать', title: b.ru })) : null);
    case 'ayah': return h('div', ayahView(b.key, { note: b.note, big: true }));
    case 'ayahs': {
      const [s, a1] = b.from.split(':').map(Number);
      const a2 = Number(b.to.split(':')[1]);
      const list = h('div');
      for (let a = a1; a <= a2; a++) list.append(ayahView(`${s}:${a}`));
      return h('div', tajweedHint(), list, b.note ? h('p.small.muted', rich(b.note)) : null,
        a2 > a1 ? h('div.row', { style: { marginTop: 'var(--s2)' } }, audioButton({ kind: 'ayahs', from: b.from, to: b.to }, { label: 'Слушать все аяты подряд', title: `Аяты ${b.from}–${a2}` }), h('span.small.muted', 'Слушать все аяты подряд')) : null);
    }
    case 'quran-words': return h('div.card.card--soft',
      b.rule ? h('div.card__eyebrow', rich(b.rule)) : null,
      ayahView(b.key, { words: b.words, big: true }),
      b.note ? h('p.small', { style: { margin: 0 } }, rich(b.note)) : null);
    case 'letters': return h('div.letters', b.items.map(it => h('button.letter', { type: 'button', onclick: () => letterSheet(it), 'aria-label': it.name },
      h('span.letter__ar', { lang: 'ar' }, it.ar), h('span.letter__name', it.name))));
    case 'table': return h('div.tbl-wrap', h('table.tbl', h('thead', h('tr', b.head.map(c => h('th', rich(c))))), h('tbody', b.rows.map(r => h('tr', r.map(c => h('td', rich(c))))))));
    case 'keypoints': return h('div.keypoints', h('strong', { style: { display: 'block', marginBottom: '8px' } }, 'Главное'), h('ul', b.items.map(x => h('li', h('span', rich(x))))));
    case 'steps': return h('ol.steps', b.items.map(st => h('li.step',
      h('div.step__title', rich(st.title)),
      st.figure ? h('img.step__fig', { src: st.figure, alt: st.title, loading: 'lazy', width: 140, height: 140 }) : null,
      st.md ? md(st.md) : null,
      st.ar ? h('div.arblock', { style: { margin: '8px 0' } }, h('div.arblock__ar', { lang: 'ar', dir: 'rtl' }, st.ar), state.settings.showTr ? h('div.arblock__tr', st.tr) : null, h('div.arblock__ru', rich(st.ru)),
        st.audio ? h('div.arblock__foot', audioButton(st.audio, { label: 'Послушать' })) : null) : null,
      st.why ? h('div.step__why', h('b', 'Смысл: '), rich(st.why)) : null)));
    case 'figure': return h('figure.figure', h('img', { src: b.src, alt: b.alt, loading: 'lazy', width: 200, height: 200 }), h('figcaption', rich(b.caption)));
    case 'flashcards': return flashcards(b.cards);
    case 'reveal': {
      const ans = h('div.reveal__ans', rich(b.answer));
      const btn = h('button.btn.btn--sm.btn--ghost', { type: 'button' }, icon('eye'), 'Показать ответ');
      const box = h('div.reveal', h('div', { style: { fontWeight: 700, marginBottom: '8px' } }, rich(b.prompt)), btn);
      btn.addEventListener('click', () => { btn.replaceWith(ans); });
      return box;
    }
    case 'practice': {
      const host = h('div');
      const start = h('button.btn.btn--gold.btn--block', { type: 'button' }, icon('quiz'), `Упражнение (${b.questions.length})`);
      start.addEventListener('click', () => runQuiz(host, b.questions, { title: 'Упражнение' }));
      host.append(start);
      return h('div.card.card--gold', h('div.card__eyebrow', 'Практика'), host);
    }
    case 'makhraj': return h('div.card.card--soft.makhraj',
      makhrajSvg(b.point),
      h('div', h('div.card__eyebrow', MAKHRAJ_NAME[b.point] || 'Место произношения'), b.letters ? h('div.ar-inline', { lang: 'ar', style: { fontSize: '1.8rem' } }, Array.isArray(b.letters) ? b.letters.join(' ') : b.letters) : null, md(b.md)));
    default: return null;
  }
}

/** Full lesson view. opts: {onComplete(score), quizTitle} */
export function renderLesson(lesson, opts = {}) {
  const root = h('article.stack-lg');
  root.append(h('div.lesson-head',
    lesson.subtitle ? h('p.muted', rich(lesson.subtitle)) : null,
    lesson.minutes ? h('span.badge', icon('clock'), `${lesson.minutes} мин`) : null));
  for (const b of lesson.blocks || []) { const el = renderBlock(b); if (el) root.append(el); }
  if (lesson.keyPoints && lesson.keyPoints.length) root.append(renderBlock({ type: 'keypoints', items: lesson.keyPoints }));
  const quizHost = h('div');
  if (lesson.quiz && lesson.quiz.length) {
    const start = h('button.btn.btn--primary.btn--lg.btn--block', { type: 'button' }, icon('quiz'), `Проверить себя (${lesson.quiz.length})`);
    start.addEventListener('click', () => runQuiz(quizHost, lesson.quiz, { title: opts.quizTitle || 'Тест по уроку', onFinish: r => opts.onComplete && opts.onComplete(r.ratio) }));
    quizHost.append(start);
    root.append(h('section', h('h2', { style: { fontSize: 'var(--fs-lg)' } }, 'Проверка'), quizHost));
  } else if (opts.onComplete) {
    root.append(h('button.btn.btn--primary.btn--lg.btn--block', { type: 'button', onclick: e => { opts.onComplete(1); e.target.disabled = true; e.target.textContent = 'Урок отмечен как пройденный'; } }, icon('check'), 'Отметить как пройденный'));
  }
  root.append(sourcesBlock(lesson.sources));
  return root;
}
