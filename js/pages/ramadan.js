import { h, icon, clear, rich } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { hijri, addDays, formatDate, dayKey } from '../core/time.js';
import { tryJSON } from '../core/content.js';
import { month as prayerMonth } from '../core/prayer.js';
import { page, sectionTitle, tile, bar, gradeBadge } from '../ui/components.js';

function daysUntilRamadan(offset) {
  for (let i = 0; i < 400; i++) { const hj = hijri(addDays(new Date(), i), offset); if (hj.month === 9 && hj.day === 1) return { days: i, year: hj.year }; }
  return null;
}

export default async function ramadan() {
  const off = state.settings.hijriOffset || 0;
  const hj = hijri(new Date(), off);
  const inRamadan = hj.month === 9;
  const next = inRamadan ? null : daysUntilRamadan(off);
  const year = inRamadan ? hj.year : next ? next.year : hj.year;
  const rec = () => state.ramadan[year] || { fast: {}, juz: {} };
  const save = fn => update(s => { const r = s.ramadan[year] || (s.ramadan[year] = { fast: {}, juz: {} }); fn(r); }, 'ramadan');

  // fasting grid: 30 days, tap cycles: none -> fasted -> missed (to make up) -> none
  const grid = h('div.cal');
  const paintGrid = () => {
    clear(grid);
    for (let d = 1; d <= 30; d++) {
      const v = rec().fast[d];
      const cls = v === 'fasted' ? 'done' : v === 'missed' ? 'special' : (inRamadan && d === hj.day ? 'future' : 'future');
      const b = h(`button.cal__day.cal__day--${cls}`, { type: 'button', 'aria-label': `${d} рамадана: ${v === 'fasted' ? 'постилась' : v === 'missed' ? 'пропущен, восполнить' : 'не отмечено'}`, onclick: () => {
        save(r => { const cur = r.fast[d]; r.fast[d] = !cur ? 'fasted' : cur === 'fasted' ? 'missed' : undefined; if (!r.fast[d]) delete r.fast[d]; });
        paintGrid();
      } }, String(d), v === 'fasted' ? h('small', '✓') : v === 'missed' ? h('small', 'када') : null);
      if (inRamadan && d === hj.day) b.classList.add('cal__day--today');
      grid.append(b);
    }
  };
  paintGrid();
  const fastedN = () => Object.values(rec().fast).filter(v => v === 'fasted').length;
  const missedN = () => Object.values(rec().fast).filter(v => v === 'missed').length;

  // juz plan
  const juzGrid = h('div.grid-4');
  const juzBar = h('div');
  const paintJuz = () => {
    clear(juzGrid);
    const n = Object.values(rec().juz).filter(Boolean).length;
    juzBar.replaceChildren(h('div.row.row--between', h('strong', `Прочитано джузов: ${n} из 30`)), h('div', { style: { marginTop: '6px' } }, bar(n / 30, true)));
    for (let j = 1; j <= 30; j++) {
      const on = !!rec().juz[j];
      juzGrid.append(h('button.chip', { type: 'button', 'aria-pressed': String(on), style: { justifyContent: 'center' }, onclick: () => { save(r => { r.juz[j] = !r.juz[j]; }); paintJuz(); } }, `${j}`));
    }
  };
  paintJuz();

  // suhoor / iftar today (Fajr = end of suhoor, Maghrib = iftar)
  const times = h('div.ptimes');
  try {
    const now = new Date();
    const m = await prayerMonth(now.getFullYear(), now.getMonth() + 1);
    const t = m.days[dayKey(now)];
    times.append(h('div.ptime', h('span', 'Конец сухура (Фаджр)'), h('b', t.fajr)), h('div.ptime.is-next', h('span', 'Ифтар (Магриб)'), h('b', t.maghrib)));
  } catch { times.append(h('p.muted', 'Время сухура и ифтара появится, когда будет интернет.')); }

  const duas = await tryJSON('data/duas/duas.json', { duas: [] });
  const fastingDuas = duas.duas.filter(d => /iftar|fast|sawm|ramadan|qadr|laylat/i.test(d.id));

  return page('Рамадан', h('div',
    h('section.card.card--primary', { style: { textAlign: 'center' } },
      h('div.card__eyebrow', inRamadan ? `${hj.day} рамадана ${hj.year} г. х.` : 'До Рамадана'),
      h('div', { style: { fontSize: 'var(--fs-2xl)', fontWeight: 800 } }, inRamadan ? 'Рамадан мубарак!' : next ? `${next.days} дн.` : '—'),
      !inRamadan && next ? h('p', { style: { margin: 0 } }, `ориентировочно с ${formatDate(addDays(new Date(), next.days))}. Точную дату объявляет муфтият.`) : h('p', { style: { margin: 0 } }, 'Пусть Аллах примет ваш пост и молитвы.')),
    sectionTitle('Сегодня: сухур и ифтар'),
    times,
    h('p.small.muted', { style: { marginTop: '6px' } }, 'Сухур заканчивается с началом времени Фаджра; многие мечети советуют закончить за несколько минут до него.'),
    sectionTitle('Трекер поста'),
    h('p.small.muted', 'Нажмите на день: один раз — «постилась» (зелёный), ещё раз — «пропущен, восполнить» (сиреневый), третий раз — снять отметку.'),
    h('section.card', grid, h('p', { style: { margin: 'var(--s3) 0 0' } }, `Постилась: ${fastedN()} · восполнить: ${missedN()}`)),
    h('p.small.muted', 'Дни хайда и нифаса отмечайте как «пропущен»: по ханафитскому мазхабу эти посты восполняются после Рамадана.'),
    sectionTitle('План чтения: джуз в день'),
    h('section.card.stack', juzBar, juzGrid, h('a.btn.btn--ghost.btn--block', { href: '#/reader' }, icon('book'), 'Открыть Коран')),
    fastingDuas.length ? h('div', sectionTitle('Дуа для поста'), h('div.stack', fastingDuas.map(d => tile({ href: `#/dua/${d.id}`, iconName: 'hands', title: d.title, sub: d.when, end: gradeBadge(d.grade) })))) : null,
    h('div.stack', { style: { marginTop: 'var(--s4)' } },
      tile({ href: '#/islam/isl-pillars', iconName: 'kaaba', title: 'Правила поста (ханафитский мазхаб)', sub: 'Что нарушает пост, кто освобождён, восполнение' }))));
}
