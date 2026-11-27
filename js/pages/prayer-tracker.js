import { h, icon, clear } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey, dayKey, addDays, formatDate, parseKey } from '../core/time.js';
import { page, checkRow, sectionTitle, confirmSheet } from '../ui/components.js';

const LIST = [['fajr', 'Фаджр', '2 ракаата фард'], ['dhuhr', 'Зухр', '4 ракаата фард'], ['asr', 'Аср', '4 ракаата фард'], ['maghrib', 'Магриб', '3 ракаата фард'], ['isha', 'Иша', '4 ракаата фард'], ['witr', 'Витр', '3 ракаата, ваджиб']];

export default function prayerTracker() {
  let k = todayKey();
  const host = h('div');
  const paint = () => {
    clear(host);
    const d = state.days[k] || {};
    const special = !!d.special;
    host.append(h('div.row.row--between', { style: { marginBottom: 'var(--s3)' } },
      h('button.icon-btn', { 'aria-label': 'Предыдущий день', onclick: () => { k = dayKey(addDays(parseKey(k), -1)); paint(); } }, icon('back')),
      h('strong', k === todayKey() ? `Сегодня, ${formatDate(parseKey(k))}` : formatDate(parseKey(k), true)),
      h('button.icon-btn', { 'aria-label': 'Следующий день', disabled: k >= todayKey(), onclick: () => { k = dayKey(addDays(parseKey(k), 1)); paint(); } }, icon('chevron'))));
    if (special) host.append(h('p.callout.callout--note', 'Этот день отмечен как «Особый день»: намаз в эти дни не совершается и не восполняется.'));
    host.append(h('div.checks', LIST.map(([id, name, sub]) => checkRow(name, d.prayers && d.prayers[id], v => update(s => {
      const x = s.days[k] || (s.days[k] = { sec: 0 });
      x.prayers = { ...(x.prayers || {}), [id]: v };
    }, 'prayers'), sub))));
  };
  paint();

  const qadaHost = h('div');
  const paintQada = () => {
    clear(qadaHost);
    const total = Object.values(state.qada).reduce((a, b) => a + b, 0);
    qadaHost.append(h('p', `Всего осталось восполнить: `, h('strong', String(total))));
    for (const [id, name] of LIST) {
      const n = state.qada[id] || 0;
      const set = v => { update(s => { s.qada[id] = Math.max(0, v); }, 'qada'); paintQada(); };
      qadaHost.append(h('div.ptime', { style: { marginBottom: '6px' } },
        h('span', name),
        h('div.row', { style: { gap: '6px' } },
          h('button.icon-btn', { 'aria-label': `${name}: восполнила один`, onclick: () => set(n - 1) }, icon('minus')),
          h('b', { style: { minWidth: '3ch', textAlign: 'center' } }, String(n)),
          h('button.icon-btn', { 'aria-label': `${name}: добавить один`, onclick: () => set(n + 1) }, icon('plus')))));
    }
    qadaHost.append(h('button.btn.btn--ghost.btn--sm', { onclick: () => confirmSheet('Обнулить счётчик када?', 'Все числа станут нулём.', 'Обнулить', () => { update(s => { for (const x of Object.keys(s.qada)) s.qada[x] = 0; }); paintQada(); }, true) }, icon('trash'), 'Обнулить'));
  };
  paintQada();

  return page('Трекер намазов', h('div',
    h('section.card', host),
    h('p.small.muted', { style: { marginTop: '8px' } }, 'Отмечайте прочитанные намазы. Это только для вас: никто, кроме вас, этого не видит.'),
    sectionTitle('Счётчик када (пропущенные намазы)'),
    h('section.card', qadaHost),
    h('p.small.muted', { style: { marginTop: '8px' } }, 'По ханафитскому мазхабу пропущенные фард-намазы и витр нужно восполнить. Нажимайте «−», когда восполнили один. Подробнее: раздел «Намаз» → «Правила намаза».'),
    h('a.btn.btn--ghost.btn--block', { href: '#/prayer-times', style: { marginTop: 'var(--s3)' } }, icon('clock'), 'Время намаза')));
}
