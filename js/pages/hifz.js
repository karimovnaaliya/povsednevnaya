import { h, icon, clear, plural } from '../core/dom.js';
import { state } from '../core/store.js';
import { loadJSON } from '../core/content.js';
import { isDue } from '../core/srs.js';
import { page, tile, sectionTitle, bar, seg } from '../ui/components.js';

export const STATUS = { new: 'Не начато', learning: 'Учу', learned: 'Выучено', review: 'На повторении' };
export const STATUS_BADGE = { new: '', learning: 'badge--warn', learned: 'badge--ok', review: 'badge--gold' };

export default async function hifz() {
  const { surahs } = await loadJSON('data/hifz/surahs.json');
  const list = surahs.slice().sort((a, b) => a.order - b.order);
  const due = list.filter(s => { const x = state.hifz[s.id]; return x && (x.status === 'learned' || x.status === 'review') && isDue(x.srs); });
  const learned = list.filter(s => ['learned', 'review'].includes((state.hifz[s.id] || {}).status)).length;
  let filter = 'all';
  const host = h('div.stack');
  const paint = () => {
    clear(host);
    for (const s of list) {
      const st = (state.hifz[s.id] || {}).status || 'new';
      if (filter !== 'all' && !(filter === st || (filter === 'learned' && st === 'review'))) continue;
      host.append(tile({
        href: `#/hifz/${s.id}`, iconText: String(s.order), title: s.nameRu,
        sub: `${s.meaningRu} · ${s.ayahs} ${plural(s.ayahs, 'аят', 'аята', 'аятов')} · сложность ${'●'.repeat(s.difficulty)}${'○'.repeat(5 - s.difficulty)}`,
        end: st !== 'new' ? h('span', { class: `badge ${STATUS_BADGE[st]}` }, STATUS[st]) : null,
      }));
    }
    if (!host.children.length) host.append(h('p.muted', 'Здесь пока пусто.'));
  };
  paint();
  return page('Заучивание сур', h('div',
    h('section.card', h('div.row.row--between', h('strong', `Выучено: ${learned} из ${list.length}`), h('span.small.muted', `цель: ${state.settings.surahGoal}`)), h('div', { style: { marginTop: '8px' } }, bar(learned / list.length, true))),
    due.length ? h('div.callout.callout--tip', { style: { marginTop: 'var(--s3)' } }, h('div.callout__title', icon('refresh'), 'Пора повторить'),
      h('div.stack', due.map(s => tile({ href: `#/hifz/${s.id}?tab=review`, iconName: 'refresh', title: s.nameRu, sub: 'Интервальное повторение: сегодня' })))) : null,
    h('p.small.muted', { style: { marginTop: 'var(--s3)' } }, 'Суры расположены от самых лёгких к более длинным. Начните сверху: Аль-Фатиха, затем короткие суры.'),
    h('div', { style: { margin: 'var(--s3) 0' } }, seg([{ value: 'all', label: 'Все' }, { value: 'learning', label: 'Учу' }, { value: 'learned', label: 'Выучено' }], filter, v => { filter = v; paint(); })),
    host));
}
