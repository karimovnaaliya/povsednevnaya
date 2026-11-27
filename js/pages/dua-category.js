import { h } from '../core/dom.js';
import { state } from '../core/store.js';
import { loadJSON } from '../core/content.js';
import { page, tile, empty, gradeBadge } from '../ui/components.js';
import { runQuiz } from '../ui/quiz.js';
import { shuffle } from '../core/dom.js';

export default async function duaCategory(id) {
  const { categories, duas } = await loadJSON('data/duas/duas.json');
  const cat = categories.find(c => c.id === id);
  if (!cat) return page('Дуа', empty('Категория не найдена.'));
  const list = duas.filter(d => d.category === id);
  const quizHost = h('div');
  const startQuiz = () => {
    const qs = shuffle(list).slice(0, 8).map(d => {
      const others = shuffle(duas.filter(x => x.id !== d.id && x.ru !== d.ru)).slice(0, 3).map(x => x.title);
      const opts = shuffle([d.title, ...others]);
      return { id: `q-gen-dua-${d.id}`, type: 'mcq', prompt: 'Когда читают это дуа?', promptAr: d.ar.length < 260 ? d.ar : null, options: opts, answer: opts.indexOf(d.title), explain: `${d.title}. ${d.ru}` };
    });
    runQuiz(quizHost, qs, { title: cat.title });
  };
  return page(cat.title, h('div.stack',
    cat.description ? h('p.muted', cat.description) : null,
    ...list.map(d => tile({ href: `#/dua/${d.id}`, iconName: state.duas[d.id] && state.duas[d.id].learned ? 'check' : 'hands', gold: !!(state.duas[d.id] && state.duas[d.id].learned), title: d.title, sub: d.when, end: d.grade === 'daif' ? gradeBadge('daif') : null })),
    list.length >= 4 ? h('div.card.card--gold', h('div.card__eyebrow', 'Проверить себя'), quizHost.childElementCount ? quizHost : h('div', quizHost, h('button.btn.btn--block', { onclick: e => { e.target.remove(); startQuiz(); } }, 'Тест по этой категории'))) : null));
}
