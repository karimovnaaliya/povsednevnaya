import { h, plural } from '../core/dom.js';
import { state } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { tryJSON } from '../core/content.js';
import { page, tile, empty } from '../ui/components.js';

const ICON = { morning: 'sun', evening: 'moon', sleep: 'moon' };

export default async function adhkarList() {
  const j = await tryJSON('data/duas/adhkar.json', null);
  if (!j || !j.routines || !j.routines.length) return page('Азкары', empty('Азкары ещё загружаются. Проверьте подключение к интернету и откройте страницу снова.', 'sun'));
  const hr = new Date().getHours();
  return page('Азкары', h('div.stack',
    h('p.muted', 'Пошаговые азкары: на экране одно поминание, нажимайте на большую кнопку, пока не наберётся нужное число.'),
    hr >= 4 && hr < 12 ? h('p.callout.callout--tip', 'Сейчас время утренних азкаров (после Фаджра до восхода и утром).') : hr >= 15 && hr < 20 ? h('p.callout.callout--tip', 'Сейчас время вечерних азкаров (после Асра до Магриба).') : null,
    ...j.routines.map(r => {
      const p = state.adhkar[r.id];
      const doneToday = p && p.date === todayKey() && p.done;
      const key = Object.keys(ICON).find(k => r.id.includes(k));
      return tile({ href: `#/adhkar/${r.id}`, iconName: ICON[key] || 'sun', gold: doneToday, title: r.title, sub: `${r.time || ''}${r.time ? ' · ' : ''}${r.items.length} ${plural(r.items.length, 'поминание', 'поминания', 'поминаний')}${doneToday ? ' · ✓ сегодня' : ''}` });
    })));
}
