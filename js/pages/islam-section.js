import { h } from '../core/dom.js';
import { state } from '../core/store.js';
import { loadAll, SECTIONS } from '../core/content.js';
import { page, tile, empty } from '../ui/components.js';
import { runQuiz } from '../ui/quiz.js';
import { shuffle } from '../core/dom.js';

export default async function islamSection(id) {
  const files = await loadAll(SECTIONS.islam);
  const f = files.find(x => x.data.id === id);
  if (!f) return page('Основы ислама', empty('Раздел не найден.'));
  const s = f.data;
  const all = s.topics.flatMap(t => t.quiz || []);
  const quizHost = h('div');
  return page(s.title, h('div.stack',
    s.description ? h('p.muted', s.description) : null,
    ...s.topics.map((t, i) => tile({ href: `#/lesson/${t.id}`, iconText: String(i + 1), title: t.title, sub: t.subtitle || `${t.minutes || 6} мин`, end: state.lessons[t.id] && state.lessons[t.id].done ? h('span.badge.badge--ok', '✓') : null })),
    all.length >= 5 ? h('section.card.card--gold', h('div.card__eyebrow', 'Общий тест по разделу'), quizHost,
      h('button.btn.btn--block', { onclick: e => { e.target.remove(); runQuiz(quizHost, shuffle(all).slice(0, 15), { title: s.title }); } }, `15 случайных вопросов из ${all.length}`)) : null));
}
