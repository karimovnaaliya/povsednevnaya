import { h, icon, clear, rich } from '../core/dom.js';
import { state, update, dayStatus, streak, longestStreak, goalSec } from '../core/store.js';
import { dayKey, todayKey, parseKey, addDays, MONTHS, formatDate, fmtMin, hijri, formatHijri } from '../core/time.js';
import { totalSeconds, lessonsDone, learnedSurahs, learnedDuas, quizAccuracy } from '../core/progress.js';
import { page, sheet, sectionTitle, tile } from '../ui/components.js';

const MSG = [
  'Каждая минута с Кораном — благо. Главное — постоянство, а не количество.',
  'Пророк ﷺ сказал: «Самые любимые дела перед Аллахом — постоянные, даже если их немного» (Бухари 6464).',
  'Если день пропущен, ничего страшного. Просто начните снова сегодня.',
  'Маленький шаг каждый день лучше большого рывка раз в месяц.',
];

const STATUS_LABEL = { done: 'Цель выполнена', partial: 'Частично', missed: 'Пропущено — не занималась', special: 'Особые дни', future: 'Впереди', today: 'Сегодня', none: '' };

function svgEl(tag, attrs) { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; }

function minutesChart(days = 14) {
  const W = 340, H = 140, pad = 22;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Минуты занятий за ${days} дней` });
  const vals = [];
  for (let i = days - 1; i >= 0; i--) { const k = dayKey(addDays(new Date(), -i)); vals.push({ k, m: Math.round(((state.days[k] || {}).sec || 0) / 60) }); }
  const goal = goalSec() / 60;
  const max = Math.max(goal, ...vals.map(v => v.m), 1);
  const bw = (W - pad) / days;
  const gy = H - pad - (goal / max) * (H - pad - 8);
  svg.append(svgEl('line', { x1: pad, x2: W, y1: gy, y2: gy, class: 'grid', 'stroke-dasharray': '4 4' }));
  const gl = svgEl('text', { x: 2, y: gy + 3, class: 'axis' }); gl.textContent = String(goal); svg.append(gl);
  vals.forEach((v, i) => {
    const hgt = (v.m / max) * (H - pad - 8);
    svg.append(svgEl('rect', { x: pad + i * bw + 3, y: H - pad - hgt, width: bw - 6, height: Math.max(hgt, v.m ? 2 : 0), rx: 3, class: v.m >= goal ? 'bar-rect bar-rect--goal' : 'bar-rect' }));
    if (i % 2 === (days - 1) % 2) { const t = svgEl('text', { x: pad + i * bw + bw / 2, y: H - 6, class: 'axis', 'text-anchor': 'middle' }); t.textContent = String(parseKey(v.k).getDate()); svg.append(t); }
  });
  return svg;
}

function accuracyChart(weeks = 8) {
  const W = 340, H = 130, pad = 26;
  const pts = [];
  for (let w = weeks - 1; w >= 0; w--) {
    let c = 0, t = 0;
    for (let d = 0; d < 7; d++) { const q = (state.days[dayKey(addDays(new Date(), -(w * 7 + d)))] || {}).quiz; if (q) { c += q.c; t += q.t; } }
    pts.push(t ? c / t : null);
  }
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Точность ответов по неделям' });
  [0, 0.5, 1].forEach(v => {
    const y = H - pad - v * (H - pad - 10);
    svg.append(svgEl('line', { x1: pad, x2: W, y1: y, y2: y, class: 'grid' }));
    const t = svgEl('text', { x: 0, y: y + 3, class: 'axis' }); t.textContent = `${v * 100}%`; svg.append(t);
  });
  const step = (W - pad - 10) / (weeks - 1);
  let d = '';
  pts.forEach((p, i) => {
    if (p == null) return;
    const x = pad + i * step, y = H - pad - p * (H - pad - 10);
    d += `${d ? 'L' : 'M'}${x} ${y} `;
    svg.append(svgEl('circle', { cx: x, cy: y, r: 4, class: 'dot' }));
  });
  if (d) svg.prepend(svgEl('path', { d, class: 'line' }));
  const lbl = svgEl('text', { x: W - 2, y: H - 6, class: 'axis', 'text-anchor': 'end' }); lbl.textContent = 'эта неделя'; svg.append(lbl);
  const lbl2 = svgEl('text', { x: pad, y: H - 6, class: 'axis' }); lbl2.textContent = `${weeks} нед. назад`; svg.append(lbl2);
  return { svg, any: pts.some(p => p != null) };
}

export function daySheet(k, onChange) {
  const d = state.days[k] || {};
  const date = parseKey(k);
  const st = dayStatus(k);
  const isPast = k <= todayKey();
  sheet(formatDate(date, true), close => h('div.stack',
    h('p.muted', { style: { margin: 0 } }, formatHijri(hijri(date, state.settings.hijriOffset || 0))),
    STATUS_LABEL[st] ? h('span', { class: `badge ${st === 'done' ? 'badge--ok' : st === 'partial' ? 'badge--warn' : st === 'missed' ? 'badge--danger' : st === 'special' ? 'badge--special' : ''}` }, STATUS_LABEL[st]) : null,
    h('p', `Занятия: ${fmtMin(d.sec || 0)}`),
    d.lessons && d.lessons.length ? h('p', `Уроков пройдено: ${d.lessons.length}`) : null,
    d.quiz ? h('p', `Ответов: ${d.quiz.t}, верных: ${d.quiz.c}`) : null,
    d.prayers ? h('p', `Намазы: ${Object.values(d.prayers).filter(Boolean).length} из 6`) : null,
    d.journal && (d.journal.learned || d.journal.hard || d.journal.dua) ? h('div.card.card--soft',
      h('div.card__eyebrow', 'Дневник'),
      d.journal.learned ? h('p', h('strong', 'Узнала: '), d.journal.learned) : null,
      d.journal.hard ? h('p', h('strong', 'Было трудно: '), d.journal.hard) : null,
      d.journal.dua ? h('p', { style: { margin: 0 } }, h('strong', 'Дуа / намерение: '), d.journal.dua) : null) : null,
    isPast ? h('button.btn.btn--block', { class: d.special ? 'btn--ghost' : '', style: d.special ? null : { background: 'var(--special-soft)', color: 'var(--special)' }, onclick: () => {
      update(s => { const x = s.days[k] || (s.days[k] = { sec: 0 }); x.special = !x.special; }, 'special');
      close(); onChange();
    } }, icon('flower'), d.special ? 'Снять отметку «Особые дни»' : 'Отметить как «Особые дни»') : null,
    isPast ? h('a.btn.btn--ghost.btn--block', { href: `#/journal?d=${k}`, onclick: close }, icon('journal'), 'Запись в дневнике') : null,
    h('p.small.muted', 'Отметка «Особые дни» хранится только на этом телефоне.')));
}

export default function calendar() {
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth();
  const calHost = h('div');
  const paint = () => {
    clear(calHost);
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const grid = h('div.cal', { role: 'grid', 'aria-label': `${MONTHS[m]} ${y}` }, ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(x => h('div.cal__dow', x)));
    for (let i = 0; i < offset; i++) grid.append(h('div.cal__day.cal__day--empty', { 'aria-hidden': 'true' }));
    for (let dd = 1; dd <= days; dd++) {
      const k = dayKey(new Date(y, m, dd));
      const st = dayStatus(k);
      const d = state.days[k] || {};
      const min = Math.floor((d.sec || 0) / 60);
      const cls = { done: 'done', partial: 'partial', missed: 'missed', special: 'special', future: 'future', today: 'future', none: 'future' }[st];
      const btn = h(`button.cal__day.cal__day--${cls}`, { type: 'button', 'aria-label': `${dd} ${MONTHS[m]}: ${STATUS_LABEL[st] || ''}${min ? `, ${min} мин` : ''}`, onclick: () => daySheet(k, paint) },
        String(dd),
        st === 'partial' ? h('small', `${min}м`) : st === 'missed' ? h('small', '✕') : st === 'special' ? h('small', '✿') : st === 'done' ? h('small', '✓') : null);
      if (k === todayKey()) btn.classList.add('cal__day--today');
      if (d.journal && (d.journal.learned || d.journal.hard || d.journal.dua)) btn.classList.add('cal__day--journal');
      grid.append(btn);
    }
    calHost.append(
      h('div.row.row--between', { style: { marginBottom: 'var(--s3)' } },
        h('button.icon-btn', { 'aria-label': 'Предыдущий месяц', onclick: () => { m--; if (m < 0) { m = 11; y--; } paint(); } }, icon('back')),
        h('h2', { style: { margin: 0, fontSize: 'var(--fs-lg)', textTransform: 'capitalize' } }, `${MONTHS[m]} ${y}`),
        h('button.icon-btn', { 'aria-label': 'Следующий месяц', onclick: () => { m++; if (m > 11) { m = 0; y++; } paint(); } }, icon('chevron'))),
      grid,
      h('div.legend-row', { style: { marginTop: 'var(--s3)' } },
        h('span', h('i', { style: { background: 'var(--success-soft)', border: '1px solid var(--success)' } }), 'Выполнено'),
        h('span', h('i', { style: { background: 'var(--partial-soft)', border: '1px solid var(--partial)' } }), 'Частично'),
        h('span', h('i', { style: { background: 'var(--danger-soft)', border: '1px solid var(--danger)' } }), 'Пропущено — не занималась'),
        h('span', h('i', { style: { background: 'var(--special-soft)', border: '1px solid var(--special)' } }), 'Особые дни')));
  };
  paint();

  const acc = quizAccuracy();
  const accChart = accuracyChart();
  const todaySpecial = !!(state.days[todayKey()] || {}).special;
  return page('Календарь и трекер', h('div',
    h('section.card', calHost),
    h('p.small.muted', { style: { marginTop: 'var(--s3)' } }, 'Нажмите на день, чтобы увидеть подробности, отметить «Особые дни» или открыть дневник.'),
    h('div.callout.callout--tip', h('p', { style: { margin: 0 } }, rich(MSG[now.getDate() % MSG.length]))),
    h('div.stack', { style: { marginTop: 'var(--s4)' } },
      tile({ href: '#/special', iconName: 'flower', title: todaySpecial ? 'Особые дни: включено сегодня' : 'Режим «Особые дни»', sub: 'Хайд и нифас: не считается пропуском и не прерывает серию' }),
      tile({ href: '#/prayers', iconName: 'mosque', title: 'Трекер намазов', sub: 'Пять намазов, витр и счётчик када' }),
      tile({ href: '#/journal', iconName: 'journal', title: 'Дневник занятий', sub: 'Что узнала, что было трудно, дуа и намерение' })),
    sectionTitle('Статистика'),
    h('div.stats',
      [['Всего занятий', fmtMin(totalSeconds())], ['Текущая серия', `${streak()} дн.`], ['Лучшая серия', `${longestStreak()} дн.`], ['Уроков пройдено', lessonsDone()],
        ['Сур выучено', learnedSurahs()], ['Дуа выучено', learnedDuas()], ['Точность ответов', acc == null ? '—' : `${Math.round(acc * 100)}%`],
        ['Дней с занятиями', Object.values(state.days).filter(d => d.sec > 0).length]].map(([l, v]) => h('div.stat', h('div.stat__v', String(v)), h('div.stat__l', l)))),
    sectionTitle('Минуты за 14 дней'),
    h('section.card', minutesChart(14), h('p.small.muted', { style: { margin: '6px 0 0' } }, 'Зелёные столбики — цель дня выполнена; пунктир — ваша цель.')),
    sectionTitle('Точность ответов'),
    h('section.card', accChart.any ? accChart.svg : h('p.muted', { style: { margin: 0 } }, 'Пройдите несколько тестов, и здесь появится график.'))));
}
