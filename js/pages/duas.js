import { h, icon, clear } from '../core/dom.js';
import { state } from '../core/store.js';
import { loadJSON } from '../core/content.js';
import { page, tile, sectionTitle, bar } from '../ui/components.js';

export const CAT_ICON = { 'morning-evening': 'sun', sleep: 'moon', food: 'heart', 'kitchen-home': 'home', housework: 'sparkle', 'home-bathroom-mosque': 'mosque', dressing: 'layers', family: 'heart', distress: 'drop', travel: 'compass', rain: 'drop', guests: 'home', general: 'star' };

export default async function duas() {
  const { categories, duas: all } = await loadJSON('data/duas/duas.json');
  const learned = all.filter(d => state.duas[d.id] && state.duas[d.id].learned).length;
  const results = h('div.stack');
  const input = h('input.input', { type: 'search', placeholder: 'Поиск дуа', 'aria-label': 'Поиск дуа' });
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    clear(results);
    if (q.length < 2) return;
    const found = all.filter(d => `${d.title} ${d.ru} ${d.when} ${d.tr}`.toLowerCase().includes(q)).slice(0, 30);
    results.append(...found.map(d => tile({ href: `#/dua/${d.id}`, iconName: 'hands', title: d.title, sub: d.when })));
    if (!found.length) results.append(h('p.muted', 'Ничего не найдено.'));
  });
  return page('Дуа', h('div',
    h('section.card', h('div.row.row--between', h('strong', `Выучено: ${learned} из ${all.length}`), h('span.small.muted', `цель: ${state.settings.duaGoal}`)), h('div', { style: { marginTop: '8px' } }, bar(learned / Math.max(1, state.settings.duaGoal), true))),
    h('div.stack', { style: { marginTop: 'var(--s3)' } },
      tile({ href: '#/adhkar', iconName: 'sun', gold: true, title: 'Утренние и вечерние азкары', sub: 'Пошагово, со счётчиком' }),
      tile({ href: '#/tasbih', iconName: 'beads', title: 'Тасбих', sub: 'Счётчик зикра' }),
      input, results),
    sectionTitle('Категории'),
    h('div.stack', categories.map(c => {
      const n = all.filter(d => d.category === c.id).length;
      return n ? tile({ href: `#/duas/${c.id}`, iconName: CAT_ICON[c.id] || 'hands', title: c.title, sub: `${c.description ? `${c.description} · ` : ''}${n} дуа` }) : null;
    }))));
}
