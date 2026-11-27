import { h, icon } from '../core/dom.js';
import { state } from '../core/store.js';
import { levels, levelUnlocked, nextLesson } from '../core/progress.js';
import { page, tile, bar, sectionTitle } from '../ui/components.js';

const LEVEL_ICON = { alphabet: 'letter', vowels: 'sparkle', words: 'book', tajweed: 'palette', ayahs: 'layers', advanced: 'star' };

export default async function quran() {
  const lv = await levels();
  const next = await nextLesson();
  const list = h('div.stack', lv.map(l => {
    const done = l.lessons.filter(x => state.lessons[x.id] && state.lessons[x.id].done).length;
    const st = state.levels[l.level] || {};
    const open = levelUnlocked(l.level);
    return h('a.card', { href: `#/quran/level/${l.level}`, style: { display: 'block', textDecoration: 'none', color: 'inherit', opacity: open ? 1 : 0.7 } },
      h('div.row', { style: { alignItems: 'flex-start' } },
        h('span.tile__icon', { class: st.passed ? 'tile__icon--gold' : '' }, icon(open ? (LEVEL_ICON[l.icon] || 'book') : 'lock')),
        h('div.grow',
          h('div.card__eyebrow', `Уровень ${l.level}`),
          h('div.card__title', l.title),
          h('p.small.muted', { style: { margin: '0 0 8px' } }, l.description),
          bar(done / Math.max(1, l.lessons.length)),
          h('div.row.row--between', { style: { marginTop: '6px' } },
            h('span.small.muted', `${done} из ${l.lessons.length} уроков`),
            st.passed ? h('span.badge.badge--ok', icon('check'), 'Тест сдан') : st.skipped ? h('span.badge', 'Пропущен') : !open ? h('span.badge', 'Закрыт') : null))));
  }));
  return page('Коран', h('div',
    next ? h('section.card.card--primary', { style: { marginBottom: 'var(--s4)' } },
      h('div.card__eyebrow', 'Продолжить'),
      h('div.card__title', next.test ? `Тест уровня ${next.level.level}` : next.lesson.title),
      h('p.muted', { style: { margin: '0 0 12px' } }, `Уровень ${next.level.level} · ${next.level.title}`),
      h('a.btn.btn--gold.btn--block', { href: next.test ? `#/test/${next.level.level}` : `#/lesson/${next.lesson.id}` }, icon('play'), 'Открыть')) : null,
    h('div.stack',
      tile({ href: '#/hifz', iconName: 'brain', gold: true, title: 'Суры для заучивания', sub: 'От Аль-Фатихи до Йа Син, с инструментами заучивания' }),
      tile({ href: '#/reader', iconName: 'book', title: 'Читать и слушать Коран', sub: 'Все 114 сур: таджвид, перевод, пословный режим' }),
      tile({ href: '#/legend', iconName: 'palette', title: 'Легенда цветов таджвида', sub: 'Что означает каждый цвет' })),
    sectionTitle('Курс чтения: 6 уровней'),
    lv.length ? list : h('p.muted', 'Уроки загружаются…')));
}
