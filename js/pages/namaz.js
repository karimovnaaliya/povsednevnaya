import { h, icon } from '../core/dom.js';
import { state } from '../core/store.js';
import { loadAll, SECTIONS } from '../core/content.js';
import { nextPrayer } from '../core/prayer.js';
import { page, tile, sectionTitle } from '../ui/components.js';

const ICON = { why: 'heart', taharat: 'drop', women: 'flower', prayers: 'clock', 'how-to-pray': 'mosque', rulings: 'list' };

export default async function namaz() {
  const files = await loadAll(SECTIONS.namaz);
  const next = h('span.tile__sub', 'Загрузка…');
  nextPrayer().then(p => { next.textContent = `Следующий: ${p.name} в ${p.time}${p.tomorrow ? ' (завтра)' : ''}`; }).catch(() => { next.textContent = 'Откройте, чтобы загрузить'; });
  return page('Намаз', h('div',
    h('div.stack',
      h('a.tile', { href: '#/prayer-times' }, h('span.tile__icon.tile__icon--gold', icon('clock')), h('span.tile__body', h('span.tile__title', `Время намаза · ${state.settings.city ? state.settings.city.city : 'Ош'}`), next), h('span.tile__end', icon('chevron'))),
      tile({ href: '#/prayers', iconName: 'check', title: 'Трекер намазов и када', sub: 'Отмечайте пять намазов и витр' }),
      tile({ href: '#/qibla', iconName: 'kaaba', title: 'Направление киблы', sub: 'Компас и градусы от вашего города' })),
    ...files.map(({ path, data }) => {
      const key = path.split('/').pop().replace('.json', '');
      return h('section',
        sectionTitle(data.title),
        data.description ? h('p.small.muted', { style: { marginTop: '-6px' } }, data.description) : null,
        h('div.stack', data.topics.map(t => tile({
          href: `#/lesson/${t.id}`, iconName: ICON[key] || 'book', title: t.title, sub: t.subtitle || `${t.minutes || 6} мин`,
          end: state.lessons[t.id] && state.lessons[t.id].done ? h('span.badge.badge--ok', '✓') : null,
        }))));
    }),
    h('p.small.muted', { style: { marginTop: 'var(--s5)' } }, 'Раздел составлен по ханафитскому мазхабу. Для личных вопросов обращайтесь к знающему имаму или устазе.')));
}
