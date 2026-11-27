import { h, md } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey, dayKey, addDays } from '../core/time.js';
import { tryJSON } from '../core/content.js';
import { page, checkRow, empty, sheet, bar } from '../ui/components.js';

export default async function habits() {
  const j = await tryJSON('data/misc/habits.json', null);
  if (!j || !j.habits || !j.habits.length) return page('Привычки сунны', empty('Список привычек загружается. Проверьте интернет и откройте страницу снова.'));
  const k = todayKey();
  const done = () => Object.values((state.days[k] || {}).habits || {}).filter(Boolean).length;
  const progress = h('div');
  const paintProgress = () => { progress.replaceChildren(h('div.row.row--between', h('strong', `Сегодня: ${done()} из ${j.habits.length}`)), h('div', { style: { marginTop: '8px' } }, bar(done() / j.habits.length, true))); };
  paintProgress();
  const week = j.habits.map(hb => {
    let n = 0;
    for (let i = 0; i < 7; i++) if (((state.days[dayKey(addDays(new Date(), -i))] || {}).habits || {})[hb.id]) n++;
    return n;
  });
  return page('Привычки сунны', h('div.stack',
    h('p.muted', 'Отмечайте маленькие сунны в течение дня. Пророк ﷺ сказал: «Самые любимые дела перед Аллахом — постоянные, даже если их немного» (Бухари 6464).'),
    h('section.card', progress),
    h('div.checks', j.habits.map((hb, i) => h('div.row', { style: { gap: '6px' } },
      h('div.grow', checkRow(hb.title, ((state.days[k] || {}).habits || {})[hb.id], v => { update(s => { const d = s.days[k] || (s.days[k] = { sec: 0 }); d.habits = { ...(d.habits || {}), [hb.id]: v }; }, 'habits'); paintProgress(); }, `за 7 дней: ${week[i]}`)),
      h('button.icon-btn', { 'aria-label': `Почему: ${hb.title}`, onclick: () => sheet(hb.title, h('div', hb.md ? md(hb.md) : null, h('p.small', 'Источник: ', hb.url ? h('a', { href: hb.url, target: '_blank', rel: 'noopener' }, hb.source) : hb.source))) }, '?'))))));
}
