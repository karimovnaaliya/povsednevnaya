import { h, icon } from '../core/dom.js';
import { state, update, day, goalSec } from '../core/store.js';
import { BADGES, lessonsThisWeek, learnedSurahs, learnedDuas, checkBadges } from '../core/progress.js';
import { page, bar, sectionTitle } from '../ui/components.js';

function goalRow(label, value, target, key, opts) {
  const valEl = h('span');
  const sel = h('select.select', { 'aria-label': `${label}: цель`, onchange: e => { update(s => { s.settings[key] = +e.target.value; }, 'settings'); location.reload(); } },
    opts.map(o => h('option', { value: o, selected: o === target }, String(o))));
  valEl.textContent = `${value} / ${target}`;
  return h('section.card.stack',
    h('div.row.row--between', h('strong', label), valEl),
    bar(value / Math.max(1, target), value >= target),
    h('label.row', h('span.small.muted.grow', 'Цель:'), h('span', { style: { width: '110px' } }, sel)));
}

export default function goals() {
  checkBadges();
  const today = Math.floor((day().sec || 0) / 60);
  return page('Мои цели', h('div',
    h('p.muted', 'Цели помогают держать ритм. Ставьте реальные цели: постоянство важнее количества.'),
    h('div.stack',
      goalRow('Минут в день', today, state.settings.dailyGoal, 'dailyGoal', [5, 10, 15, 20, 25, 30, 45, 60]),
      goalRow('Уроков на этой неделе', lessonsThisWeek(), state.settings.weeklyLessons, 'weeklyLessons', [1, 2, 3, 4, 5, 7, 10, 14]),
      goalRow('Выученных сур', learnedSurahs(), state.settings.surahGoal, 'surahGoal', [1, 3, 5, 10, 15, 20, 30, 45]),
      goalRow('Выученных дуа', learnedDuas(), state.settings.duaGoal, 'duaGoal', [5, 10, 20, 30, 50, 75, 100])),
    sectionTitle('Награды'),
    h('div.grid-2', BADGES.map(b => {
      const got = state.badges[b.id];
      return h('div.stat', { style: { opacity: got ? 1 : 0.55 } },
        h('div.row', { style: { gap: '8px' } }, h('span', { style: { color: got ? 'var(--gold)' : 'var(--text-3)' } }, icon(got ? 'medal' : 'lock')), h('strong', { style: { fontSize: 'var(--fs-sm)' } }, b.title)),
        h('div.stat__l', { style: { marginTop: '4px' } }, b.desc),
        got ? h('div.small', { style: { color: 'var(--gold)', fontWeight: 700 } }, `получено ${got}`) : null);
    })),
    h('p.small.muted', { style: { marginTop: 'var(--s4)' } }, `Сегодня: ${today} из ${goalSec() / 60} минут.`)));
}
