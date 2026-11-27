// Quiz engine: mcq, truefalse, listen, fill, match, connect, order, sort, tajweed.
import { h, icon, rich, clear, shuffle, isMostlyArabic, vibrate } from '../core/dom.js';
import { state, update, day } from '../core/store.js';
import { todayKey } from '../core/time.js';
import * as srs from '../core/srs.js';
import * as audio from '../core/audio.js';
import { getAyah, coloredSegments } from '../core/quran.js';
import { tajweedNodes } from './arabic.js';
import { audioButton, bar, celebrate } from './components.js';
import { sortable, bucketSorter } from './dnd.js';

export const TYPE_LABEL = {
  mcq: 'Выберите ответ', truefalse: 'Верно или нет?', listen: 'Послушайте и выберите', fill: 'Заполните пропуск',
  match: 'Найдите пары', connect: 'Соедините линиями', order: 'Расставьте по порядку', sort: 'Разложите по группам',
  tajweed: 'Какое это правило таджвида?',
};

const optText = t => (isMostlyArabic(t) ? h('span.ar-inline', { lang: 'ar' }, t) : rich(t));

/** Record an answer in progress + spaced repetition. */
export function record(q, ok) {
  update(s => {
    const it = s.quiz[q.id] || { c: 0, w: 0 };
    if (ok) it.c++; else it.w++;
    it.srs = srs.next(it.srs, ok ? 4 : 1);
    it.at = todayKey();
    s.quiz[q.id] = it;
    const d = s.days[todayKey()] || (s.days[todayKey()] = { sec: 0 });
    d.quiz = d.quiz || { c: 0, t: 0 };
    d.quiz.t++; if (ok) d.quiz.c++;
  }, 'quiz');
}

// ---------- renderers: each returns {el, auto?:bool, check(): {ok}, ready(): bool} ----------
function choiceQ(q, onAnswer) {
  const order = shuffle(q.options.map((t, i) => ({ t, i })));
  const ar = order.every(o => isMostlyArabic(o.t));
  const wrap = h('div.opts');
  const btns = order.map(o => {
    const b = h(`button.opt${ar ? '.opt--ar' : ''}`, { type: 'button' }, optText(o.t));
    b.addEventListener('click', () => {
      btns.forEach(x => { x.disabled = true; });
      const ok = o.i === q.answer;
      b.classList.add(ok ? 'is-correct' : 'is-wrong');
      if (!ok) btns[order.findIndex(x => x.i === q.answer)].classList.add('is-correct');
      onAnswer(ok);
    });
    return b;
  });
  wrap.append(...btns);
  return wrap;
}

function renderMcq(q, onAnswer) {
  return { el: h('div', q.promptAr ? h('div.q__ar', { lang: 'ar' }, q.promptAr) : null, q.audio ? h('div.row', { style: { justifyContent: 'center', marginBottom: 'var(--s3)' } }, audioButton(q.audio, { label: 'Послушать' })) : null, choiceQ(q, onAnswer)), auto: true };
}

function renderTF(q, onAnswer) {
  const yes = h('button.opt', { type: 'button' }, icon('check'), 'Верно');
  const no = h('button.opt', { type: 'button' }, icon('x'), 'Неверно');
  const pick = (v, b) => {
    yes.disabled = no.disabled = true;
    const ok = v === q.answer;
    b.classList.add(ok ? 'is-correct' : 'is-wrong');
    if (!ok) (q.answer ? yes : no).classList.add('is-correct');
    onAnswer(ok);
  };
  yes.addEventListener('click', () => pick(true, yes));
  no.addEventListener('click', () => pick(false, no));
  return { el: h('div', q.promptAr ? h('div.q__ar', { lang: 'ar' }, q.promptAr) : null, h('div.tf', yes, no)), auto: true };
}

function renderListen(q, onAnswer) {
  const big = audioButton(q.audio, { label: 'Послушать ещё раз' });
  big.style.width = big.style.height = '72px';
  return { el: h('div', h('div.row', { style: { justifyContent: 'center', margin: 'var(--s2) 0 var(--s4)' } }, big), h('p.small.muted.center', 'Нажмите на динамик, чтобы послушать (можно несколько раз).'), choiceQ(q, onAnswer)), auto: true };
}

function renderFill(q, onAnswer) {
  const src = q.promptAr || '';
  const shown = h('div.q__ar', { lang: 'ar' });
  const paint = fillWith => {
    clear(shown);
    const parts = src.split('___');
    parts.forEach((p, i) => { shown.append(p); if (i < parts.length - 1) shown.append(fillWith ? h('span', { style: { color: 'var(--success)' } }, fillWith) : h('span', { style: { display: 'inline-block', minWidth: '2.2em', borderBottom: '3px solid var(--gold)', margin: '0 .2em' } }, ' ')); });
  };
  paint();
  const el = h('div', src ? shown : null, choiceQ(q, ok => { if (src) paint(q.options[q.answer]); onAnswer(ok); }));
  return { el, auto: true };
}

function renderTajweed(q, onAnswer) {
  const view = h('div.q__ar', { lang: 'ar' }, h('span.muted.small', 'Загрузка аята…'));
  const paint = tj => { clear(view); view.append(tajweedNodes(tj, { markIdx: q.segment })); };
  if (q.tj) paint(q.tj);
  else getAyah(q.key).then(({ ayah }) => paint(ayah.tj)).catch(() => { clear(view); view.append(h('span.small', 'Не удалось загрузить аят. Проверьте интернет.')); });
  return { el: h('div', h('p.small.muted', 'Обведённый пунктиром фрагмент: какое правило он показывает?'), view, choiceQ(q, onAnswer)), auto: true };
}

function renderMatch(q, onAnswer) {
  const left = shuffle(q.pairs.map((p, i) => ({ t: p[0], i })));
  const right = shuffle(q.pairs.map((p, i) => ({ t: p[1], i })));
  let sel = null;
  let mistakes = 0;
  let done = 0;
  const colL = h('div.match__col');
  const colR = h('div.match__col');
  const mk = (o, side) => {
    const b = h('button.opt', { type: 'button', dataset: { i: o.i, side } }, optText(o.t));
    b.addEventListener('click', () => {
      if (b.classList.contains('is-done')) return;
      if (!sel || sel.dataset.side === side) {
        if (sel) sel.classList.remove('is-selected');
        sel = sel === b ? null : b;
        if (sel) sel.classList.add('is-selected');
        return;
      }
      const ok = sel.dataset.i === b.dataset.i;
      if (ok) {
        sel.classList.remove('is-selected');
        sel.classList.add('is-done'); b.classList.add('is-done');
        sel.disabled = b.disabled = true;
        done++;
        sel = null;
        if (done === q.pairs.length) onAnswer(mistakes === 0, mistakes ? `Пары найдены, ошибок: ${mistakes}.` : null);
      } else {
        mistakes++;
        vibrate(40);
        const a = sel;
        a.classList.add('is-wrong'); b.classList.add('is-wrong');
        setTimeout(() => { a.classList.remove('is-wrong', 'is-selected'); b.classList.remove('is-wrong'); }, 450);
        sel = null;
      }
    });
    return b;
  };
  left.forEach(o => colL.append(mk(o, 'l')));
  right.forEach(o => colR.append(mk(o, 'r')));
  return { el: h('div.match', colL, colR), auto: true };
}

function renderConnect(q, onAnswer, ctx) {
  const left = shuffle(q.pairs.map((p, i) => ({ t: p[0], i })));
  const right = shuffle(q.pairs.map((p, i) => ({ t: p[1], i })));
  const links = new Map(); // leftIdx -> rightIdx
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'connect__lines');
  const colL = h('div.connect__col.connect__col--l');
  const colR = h('div.connect__col.connect__col--r');
  const box = h('div.connect', colL, h('div'), colR, svg);
  const lItems = left.map(o => h('div.connect__item', { dataset: { i: o.i, side: 'l' }, role: 'button', tabindex: '0' }, optText(o.t)));
  const rItems = right.map(o => h('div.connect__item', { dataset: { i: o.i, side: 'r' }, role: 'button', tabindex: '0' }, optText(o.t)));
  colL.append(...lItems); colR.append(...rItems);
  let locked = false;
  let active = null;
  let temp = null;

  const anchor = (el, side) => {
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: (side === 'l' ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top };
  };
  const line = (a, b, cls = '') => {
    const l = document.createElementNS(svgNS, 'line');
    l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
    if (cls) l.setAttribute('class', cls);
    return l;
  };
  const draw = (results) => {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    for (const [li, ri] of links) {
      const le = lItems.find(x => +x.dataset.i === li);
      const re = rItems.find(x => +x.dataset.i === ri);
      svg.append(line(anchor(le, 'l'), anchor(re, 'r'), results ? (li === ri ? 'is-correct' : 'is-wrong') : ''));
    }
    if (temp) svg.append(temp);
    lItems.forEach(x => x.classList.toggle('is-linked', links.has(+x.dataset.i)));
    rItems.forEach(x => x.classList.toggle('is-linked', [...links.values()].includes(+x.dataset.i)));
    ctx.setReady(links.size === q.pairs.length);
  };
  const link = (a, b) => {
    const l = a.dataset.side === 'l' ? a : b;
    const r = a.dataset.side === 'l' ? b : a;
    const li = +l.dataset.i, ri = +r.dataset.i;
    for (const [k, v] of links) if (v === ri) links.delete(k);
    links.set(li, ri);
  };
  const setActive = el => { if (active) active.classList.remove('is-active'); active = el; if (el) el.classList.add('is-active'); };

  const onDown = e => {
    if (locked) return;
    const it = e.target.closest('.connect__item');
    if (!it) return;
    e.preventDefault();
    if (active && active.dataset.side !== it.dataset.side) { link(active, it); setActive(null); draw(); return; }
    setActive(it);
    const side = it.dataset.side;
    const start = anchor(it, side);
    const move = ev => {
      const b = box.getBoundingClientRect();
      temp = line(start, { x: ev.clientX - b.left, y: ev.clientY - b.top }, 'is-temp');
      draw();
    };
    const up = ev => {
      box.removeEventListener('pointermove', move);
      box.removeEventListener('pointerup', up);
      box.removeEventListener('pointercancel', up);
      temp = null;
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const target = under && under.closest('.connect__item');
      if (target && target !== it && target.dataset.side !== side) { link(it, target); setActive(null); }
      draw();
    };
    try { box.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', up);
  };
  box.addEventListener('pointerdown', onDown);
  box.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const it = e.target.closest('.connect__item'); if (!it || locked) return;
    e.preventDefault();
    if (active && active.dataset.side !== it.dataset.side) { link(active, it); setActive(null); draw(); } else setActive(it);
  });
  const ro = new ResizeObserver(() => draw());
  ro.observe(box);
  ctx.setReady(false);
  return {
    el: h('div', h('p.small.muted', 'Проведите пальцем от слова слева к его переводу справа (или нажмите на оба по очереди).'), box),
    check: () => {
      locked = true;
      ro.disconnect();
      let ok = true;
      for (const [li, ri] of links) if (li !== ri) ok = false;
      lItems.forEach(x => { const li = +x.dataset.i; x.classList.add(links.get(li) === li ? 'is-correct' : 'is-wrong'); });
      draw(true);
      return { ok };
    },
  };
}

function renderOrder(q, onAnswer, ctx) {
  let items = shuffle(q.items.map((t, i) => ({ id: String(i), node: optText(t) })));
  if (items.every((x, i) => x.id === String(i))) items = items.reverse();
  const s = sortable(items);
  ctx.setReady(true);
  return {
    el: h('div', h('p.small.muted', 'Перетащите карточки пальцем за значок слева или используйте стрелки.'), s.el),
    check: () => {
      s.lock();
      const ord = s.order();
      const ok = ord.every((id, i) => id === String(i));
      s.rows().forEach((r, i) => r.classList.add(r.dataset.id === String(i) ? 'is-correct' : 'is-wrong'));
      return { ok, detail: ok ? null : h('ol', q.items.map(t => h('li', optText(t)))) };
    },
  };
}

function renderSort(q, onAnswer, ctx) {
  const items = shuffle(q.items.map((it, i) => ({ id: String(i), node: optText(it.text) })));
  const buckets = q.buckets.map((t, i) => ({ id: String(i), title: t }));
  const b = bucketSorter(items, buckets, { onChange: () => ctx.setReady(b.allPlaced()) });
  ctx.setReady(false);
  return {
    el: h('div', h('p.small.muted', 'Перетащите каждую карточку в нужную группу (или нажмите карточку, затем группу).'), b.el),
    check: () => {
      b.lock();
      const pl = b.placement();
      let ok = true;
      for (const c of b.chips()) {
        const right = String(q.items[+c.dataset.id].bucket) === pl[c.dataset.id];
        c.classList.add(right ? 'is-correct' : 'is-wrong');
        if (!right) ok = false;
      }
      return { ok, detail: ok ? null : h('ul', q.items.map(it => h('li', optText(it.text), ' → ', q.buckets[it.bucket]))) };
    },
  };
}

const RENDER = { mcq: renderMcq, truefalse: renderTF, listen: renderListen, fill: renderFill, tajweed: renderTajweed, match: renderMatch, connect: renderConnect, order: renderOrder, sort: renderSort };

/**
 * Run a quiz inside `root`.
 * opts: {title, onFinish({correct,total,wrong:[q]}), passMark (0..1), retryLabel, exitHref, shuffleQ}
 */
export function runQuiz(root, questions, opts = {}) {
  const qs = (opts.shuffleQ ? shuffle(questions) : questions).filter(q => RENDER[q.type]);
  let i = 0;
  let correct = 0;
  const wrong = [];
  clear(root);
  const wrap = h('div.quiz');
  root.append(wrap);

  const show = () => {
    audio.stop();
    clear(wrap);
    if (i >= qs.length) return finish();
    const q = qs[i];
    const top = h('div.quiz__top', h('div.grow', bar(i / qs.length)), h('span.quiz__count', `${i + 1} / ${qs.length}`));
    const fb = h('div');
    const actions = h('div.quiz__actions');
    let answered = false;
    const checkBtn = h('button.btn.btn--primary', { type: 'button', disabled: true }, 'Проверить');
    const ctx = { setReady: v => { if (!answered) checkBtn.disabled = !v; } };
    const onAnswer = (ok, note) => {
      if (answered) return;
      answered = true;
      checkBtn.remove();
      record(q, ok);
      if (ok) correct++; else { wrong.push(q); vibrate(60); }
      fb.append(h(`div.feedback.${ok ? 'feedback--ok' : 'feedback--bad'}`, { role: 'status' },
        h('div.feedback__title', ok ? 'Верно! Ма ша Аллах' : 'Не совсем так'),
        note ? h('p', note) : null,
        q.explain ? h('p', { style: { margin: 0 } }, rich(q.explain)) : null,
        r.detailNode || null));
      actions.append(h('button.btn.btn--primary', { type: 'button', onclick: () => { i++; show(); } }, i + 1 < qs.length ? 'Дальше' : 'Результат', icon('chevron')));
      actions.lastChild.focus({ preventScroll: true });
      fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    const r = RENDER[q.type](q, onAnswer, ctx);
    if (!r.auto) {
      checkBtn.addEventListener('click', () => {
        const res = r.check();
        r.detailNode = res.detail ? h('div', h('p.small', { style: { margin: '8px 0 4px', fontWeight: 700 } }, 'Правильно так:'), res.detail) : null;
        onAnswer(res.ok);
      });
      actions.append(checkBtn);
    }
    wrap.append(top, h('div.q',
      h('div.q__type', TYPE_LABEL[q.type]),
      h('div.q__prompt', rich(q.prompt || '')),
      r.el, fb, actions));
    wrap.scrollIntoView({ block: 'start' });
  };

  const finish = () => {
    const total = qs.length;
    const ratio = total ? correct / total : 0;
    const passed = opts.passMark == null || ratio >= opts.passMark;
    if (passed && ratio >= 0.8) celebrate();
    const res = { correct, total, wrong, ratio, passed };
    const msg = ratio === 1 ? 'Превосходно! Все ответы верные.' : ratio >= 0.8 ? 'Очень хорошо! Так держать.' : ratio >= 0.5 ? 'Хороший результат. Ошибки вернутся в повторении.' : 'Ничего страшного: повторите материал и попробуйте ещё раз. Знания приходят постепенно.';
    clear(wrap);
    wrap.append(h('div.result.card',
      h('div.card__eyebrow', opts.title || 'Результат'),
      h('div.result__big', `${correct} / ${total}`),
      h('p', msg),
      opts.passMark != null ? h('p', { class: passed ? 'badge badge--ok' : 'badge badge--warn' }, passed ? 'Тест пройден' : `Нужно ${Math.round(opts.passMark * 100)}% правильных`) : null,
      wrong.length ? h('details', { style: { textAlign: 'start', marginTop: 'var(--s3)' } }, h('summary', { style: { fontWeight: 700, minHeight: '44px' } }, `Ошибки (${wrong.length})`),
        h('ul', wrong.map(q => h('li', rich(q.prompt || q.promptAr || ''), h('br'), h('span.small.muted', rich(q.explain || '')))))) : null,
      h('div.stack', { style: { marginTop: 'var(--s4)' } },
        wrong.length ? h('button.btn.btn--primary.btn--block', { onclick: () => runQuiz(root, wrong, { ...opts, title: 'Работа над ошибками' }) }, icon('refresh'), 'Повторить ошибки') : null,
        h('button.btn.btn--ghost.btn--block', { onclick: () => runQuiz(root, questions, opts) }, 'Пройти заново'),
        opts.exitHref ? h('a.btn.btn--ghost.btn--block', { href: opts.exitHref }, opts.exitLabel || 'Готово') : null)));
    if (opts.onFinish) opts.onFinish(res);
  };

  if (!qs.length) wrap.append(h('p.muted', 'Вопросов пока нет.'));
  else show();
  return { restart: () => runQuiz(root, questions, opts) };
}

/** Generate tajweed-color questions from an ayah (for the revision hub). */
export async function tajweedQuestionsFor(key, max = 2) {
  const { TAJWEED } = await import('../core/quran.js');
  const { ayah } = await getAyah(key);
  const segs = coloredSegments(ayah.tj).filter(s => !['d', 'b', 's'].includes(s.r));
  const pool = Object.keys(TAJWEED).filter(c => !['d', 'b', 's'].includes(c));
  return shuffle(segs).slice(0, max).map(sg => {
    const wrongs = shuffle(pool.filter(c => c !== sg.r)).slice(0, 3);
    const opts = shuffle([sg.r, ...wrongs]);
    return {
      id: `q-gen-tj-${key.replace(':', '-')}-${sg.idx}`,
      type: 'tajweed', key, segment: sg.idx,
      prompt: `Аят ${key}`,
      options: opts.map(c => TAJWEED[c].name),
      answer: opts.indexOf(sg.r),
      explain: `${TAJWEED[sg.r].name}: ${TAJWEED[sg.r].md}`,
    };
  });
}

export { day };
