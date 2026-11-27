import { h, icon } from '../core/dom.js';
import { state } from '../core/store.js';
import { getLessonIndex } from '../core/content.js';
import { markLesson, levelUnlocked } from '../core/progress.js';
import { page, empty, toast } from '../ui/components.js';
import { renderLesson } from '../ui/lesson.js';

const BACK = { curriculum: p => `#/quran/level/${p.level}`, namaz: () => '#/namaz', islam: p => `#/islam/${p.id}` };

export default async function lessonPage(id) {
  const idx = await getLessonIndex();
  const entry = idx.get(id);
  if (!entry) return page('Урок', empty('Урок не найден. Возможно, он был переименован.', 'book', h('a.btn.btn--primary', { href: '#/quran' }, 'К урокам')));
  const { lesson, parent, kind } = entry;
  if (kind === 'curriculum' && !levelUnlocked(parent.level)) {
    return page(lesson.title, empty(`Этот урок из уровня ${parent.level}, который ещё закрыт.`, 'lock', h('a.btn.btn--primary', { href: `#/quran/level/${parent.level}` }, 'Открыть уровень')));
  }
  const siblings = kind === 'curriculum' ? parent.lessons : parent.topics;
  const i = siblings.findIndex(x => x.id === id);
  const prev = siblings[i - 1];
  const next = siblings[i + 1];
  const done = state.lessons[id] && state.lessons[id].done;
  const body = renderLesson(lesson, {
    onComplete: score => {
      markLesson(id, score);
      if (score >= 0.5) toast(next ? 'Урок пройден! Можно переходить к следующему.' : 'Урок пройден!');
    },
  });
  const navRow = h('div.row', { style: { marginTop: 'var(--s5)' } },
    prev ? h('a.btn.btn--ghost.grow', { href: `#/lesson/${prev.id}` }, icon('back'), 'Назад') : null,
    next ? h('a.btn.btn--primary.grow', { href: `#/lesson/${next.id}` }, 'Следующий', icon('chevron'))
      : kind === 'curriculum' ? h('a.btn.btn--gold.grow', { href: `#/test/${parent.level}` }, icon('medal'), 'Тест уровня')
        : h('a.btn.btn--ghost.grow', { href: BACK[kind](parent) }, 'К списку тем'));
  return page(lesson.title, h('div',
    h('p.small.muted', { style: { margin: '0 0 var(--s2)' } }, kind === 'curriculum' ? `Уровень ${parent.level} · урок ${i + 1} из ${siblings.length}` : `${parent.title} · ${i + 1} из ${siblings.length}`, done ? ' · ✓ пройден' : ''),
    body, navRow));
}
