import { h, icon } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { levels, levelUnlocked } from '../core/progress.js';
import { page, tile, confirmSheet, empty } from '../ui/components.js';

export default async function level(n) {
  n = Number(n);
  const lv = (await levels()).find(l => l.level === n);
  if (!lv) return page('Уровень', empty('Этот уровень не найден.'));
  const open = levelUnlocked(n);
  const st = state.levels[n] || {};
  const unlockBtn = !open ? h('div.card.card--gold.stack',
    h('p', { style: { margin: 0 } }, `Уровень откроется после теста уровня ${n - 1}. Если вы уже знаете этот материал, можно открыть его сразу.`),
    h('button.btn.btn--block', { onclick: () => confirmSheet('Открыть уровень без теста?', 'Вы всегда сможете вернуться к предыдущим урокам и тестам.', 'Открыть', () => { update(s => { s.levels[n] = { ...(s.levels[n] || {}), opened: true }; for (let i = 1; i < n; i++) if (!s.levels[i] || !s.levels[i].passed) s.levels[i] = { ...(s.levels[i] || {}), skipped: true, at: todayKey() }; }); location.reload(); }) }, icon('lock'), 'Открыть без теста')) : null;
  return page(`Уровень ${n}`, h('div.stack',
    h('div', h('h2', lv.title), h('p.muted', lv.description)),
    unlockBtn,
    h('div.stack', lv.lessons.map((l, i) => {
      const done = state.lessons[l.id] && state.lessons[l.id].done;
      return tile({ href: `#/lesson/${l.id}`, iconText: done ? null : String(i + 1), iconName: done ? 'check' : null, gold: done, title: l.title, sub: `${l.subtitle ? `${l.subtitle} · ` : ''}${l.minutes || 7} мин`, disabled: !open });
    })),
    h('a.btn.btn--lg.btn--block', { class: st.passed ? 'btn--ghost' : 'btn--primary', href: `#/test/${n}`, style: !open ? { pointerEvents: 'none', opacity: .5 } : null }, icon('medal'), st.passed ? `Тест сдан (${Math.round((st.score || 0) * 100)}%) · пройти ещё раз` : `Итоговый тест уровня (${lv.test.length} вопросов)`)));
}
