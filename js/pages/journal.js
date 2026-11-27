import { h, icon } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey, parseKey, formatDate } from '../core/time.js';
import { page, toast, sectionTitle } from '../ui/components.js';

export default function journal() {
  const q = new URLSearchParams((location.hash.split('?')[1] || ''));
  const k = /^\d{4}-\d{2}-\d{2}$/.test(q.get('d') || '') && q.get('d') <= todayKey() ? q.get('d') : todayKey();
  const j = (state.days[k] || {}).journal || {};
  const field = (name, label, hint) => h('label.field', h('span.field__label', label), h('textarea.textarea', { name, placeholder: hint }, j[name] || ''));
  const form = h('form.stack',
    field('learned', 'Что я сегодня узнала', 'Например: правило икляб, смысл суры Аль-Ихлас…'),
    field('hard', 'Что было трудно', 'Например: буква ع, порядок аятов…'),
    field('dua', 'Дуа или намерение', 'Например: Аллах, облегчи мне заучивание…'),
    h('button.btn.btn--primary.btn--block', { type: 'submit' }, icon('check'), 'Сохранить'));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    update(s => { const d = s.days[k] || (s.days[k] = { sec: 0 }); d.journal = { learned: data.learned.trim(), hard: data.hard.trim(), dua: data.dua.trim() }; }, 'journal');
    toast('Запись сохранена');
  });
  const entries = Object.entries(state.days).filter(([, d]) => d.journal && (d.journal.learned || d.journal.hard || d.journal.dua)).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 60);
  return page('Дневник', h('div',
    h('p.muted', k === todayKey() ? `Сегодня, ${formatDate(parseKey(k))}` : formatDate(parseKey(k), true)),
    form,
    sectionTitle('Прошлые записи'),
    entries.length ? h('div.stack', entries.map(([dk, d]) => h('a.card', { href: `#/journal?d=${dk}`, style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
      h('div.card__eyebrow', formatDate(parseKey(dk), true)),
      d.journal.learned ? h('p', { style: { margin: '0 0 4px' } }, h('strong', 'Узнала: '), d.journal.learned) : null,
      d.journal.hard ? h('p', { style: { margin: '0 0 4px' } }, h('strong', 'Трудно: '), d.journal.hard) : null,
      d.journal.dua ? h('p', { style: { margin: 0 } }, h('strong', 'Дуа: '), d.journal.dua) : null)))
      : h('p.muted', 'Записей пока нет. После занятия напишите пару слов: так легче видеть свой путь.')));
}
