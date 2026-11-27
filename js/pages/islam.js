import { h } from '../core/dom.js';
import { state } from '../core/store.js';
import { loadAll, SECTIONS } from '../core/content.js';
import { page, tile } from '../ui/components.js';

export const ISLAM_ICON = { aqida: 'star', history: 'book', sunnah: 'heart', pillars: 'kaaba', akhlaq: 'hands', calendar: 'moon' };

export default async function islam() {
  const files = await loadAll(SECTIONS.islam);
  return page('Основы ислама', h('div.stack',
    h('p.muted', 'Короткие уроки по темам: прочитайте, повторите главное и проверьте себя тестом.'),
    ...files.map(({ data }) => {
      const done = data.topics.filter(t => state.lessons[t.id] && state.lessons[t.id].done).length;
      return tile({ href: `#/islam/${data.id}`, iconName: ISLAM_ICON[data.icon] || ISLAM_ICON[data.id.replace('isl-', '')] || 'book', title: data.title, sub: `${data.topics.length} тем · пройдено ${done}` });
    }),
    tile({ href: '#/names', iconName: 'star', gold: true, title: '99 имён Аллаха', sub: 'Список, карточки и игра' })));
}
