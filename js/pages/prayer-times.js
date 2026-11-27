import { h, icon, clear } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey, dayKey, addDays, formatDate, parseKey } from '../core/time.js';
import { PRAYERS, today, nextPrayer, config, month, adjust } from '../core/prayer.js';
import { tryJSON } from '../core/content.js';
import { page, errorBox, sheet, toast, sectionTitle } from '../ui/components.js';

const CITIES = [
  { city: 'Ош', lat: 40.5283, lon: 72.7985 }, { city: 'Бишкек', lat: 42.8746, lon: 74.5698 }, { city: 'Джалал-Абад', lat: 40.9333, lon: 73.0 },
  { city: 'Баткен', lat: 40.0625, lon: 70.8194 }, { city: 'Узген', lat: 40.7697, lon: 73.3006 }, { city: 'Кара-Суу', lat: 40.7039, lon: 72.8667 },
  { city: 'Нарын', lat: 41.4287, lon: 75.9911 }, { city: 'Талас', lat: 42.5228, lon: 72.2427 }, { city: 'Каракол', lat: 42.4907, lon: 78.3936 },
  { city: 'Токмок', lat: 42.8421, lon: 75.3015 }, { city: 'Кызыл-Кия', lat: 40.2567, lon: 72.1278 },
];

function citySheet() {
  sheet('Выберите город', close => h('div.stack',
    h('p.small.muted', 'Метод расчёта и поправки остаются как для Кыргызстана; меняются только координаты.'),
    ...CITIES.map(c => h('button.tile', { type: 'button', onclick: () => {
      update(s => { s.settings.city = c.city === 'Ош' ? null : { ...c }; }, 'settings');
      close(); location.reload();
    } }, h('span.tile__icon', icon('compass')), h('span.tile__body', h('span.tile__title', c.city)), h('span.tile__end', (state.settings.city ? state.settings.city.city : 'Ош') === c.city ? icon('check') : null))),
    'geolocation' in navigator ? h('button.btn.btn--ghost.btn--block', { onclick: () => {
      navigator.geolocation.getCurrentPosition(p => {
        update(s => { s.settings.city = { city: 'Моё место', lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4) }; }, 'settings');
        close(); location.reload();
      }, () => toast('Не удалось определить местоположение', { error: true }), { timeout: 10000 });
    } }, icon('compass'), 'Определить моё местоположение') : null));
}

function adjustSheet() {
  const adj = { ...(state.settings.prayerAdjust || {}) };
  sheet('Поправка времени', close => h('div.stack',
    h('p.small.muted', 'Если ваша мечеть публикует время на несколько минут иначе, добавьте поправку (в минутах).'),
    ...PRAYERS.map(p => h('label.row.row--between', h('span', p.name), h('input.input', { type: 'number', min: -30, max: 30, step: 1, value: adj[p.id] || 0, style: { width: '96px' }, onchange: e => { adj[p.id] = Math.max(-30, Math.min(30, parseInt(e.target.value, 10) || 0)); } }))),
    h('button.btn.btn--primary.btn--block', { onclick: () => { update(s => { s.settings.prayerAdjust = adj; }, 'settings'); close(); location.reload(); } }, 'Сохранить')));
}

export default async function prayerTimes() {
  const host = h('div');
  const cfg = await config();
  const note = await tryJSON('data/misc/prayer-config.json', {});
  try {
    const { times, source } = await today();
    const nx = await nextPrayer();
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const toMin = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
    host.append(
      h('section.card.card--primary', { style: { textAlign: 'center' } },
        h('div.card__eyebrow', 'Следующий намаз'),
        h('div', { style: { fontSize: 'var(--fs-2xl)', fontWeight: 800 } }, `${nx.name} · ${nx.time}`),
        h('p', { style: { margin: 0 } }, `${nx.tomorrow ? 'завтра, ' : ''}через ${Math.floor(nx.inMin / 60) ? `${Math.floor(nx.inMin / 60)} ч ` : ''}${nx.inMin % 60} мин`)),
      h('p.muted.center', { style: { margin: 'var(--s3) 0' } }, `Сегодня, ${formatDate(now, true)}`),
      h('div.ptimes', PRAYERS.map(p => h('div.ptime', { class: p.id === nx.id && !nx.tomorrow ? 'is-next' : toMin(times[p.id]) <= cur ? 'is-past' : '' }, h('span', p.name, p.noPrayer ? h('span.small', { style: { opacity: .7 } }, ' (не намаз)') : null), h('b', times[p.id])))),
      source === 'local' ? h('p.callout.callout--note', { style: { marginTop: 'var(--s3)' } }, 'Нет интернета: время рассчитано на телефоне по тем же параметрам. Может отличаться на 1–2 минуты.') : null);
    // week ahead
    const week = h('div.tbl-wrap', h('table.tbl', h('thead', h('tr', h('th', 'Дата'), ...PRAYERS.filter(p => !p.noPrayer).map(p => h('th', p.name)))), h('tbody')));
    const tb = week.querySelector('tbody');
    for (let i = 1; i <= 7; i++) {
      const d = addDays(now, i);
      const mth = await month(d.getFullYear(), d.getMonth() + 1);
      const t = adjust(mth.days[dayKey(d)]);
      if (t) tb.append(h('tr', h('td', formatDate(d)), ...PRAYERS.filter(p => !p.noPrayer).map(p => h('td', t[p.id]))));
    }
    host.append(sectionTitle('На неделю вперёд'), week);
  } catch (e) {
    host.append(errorBox('Не удалось получить время намаза. Проверьте интернет.', () => location.reload()));
  }
  return page('Время намаза', h('div',
    h('div.row.row--between', { style: { marginBottom: 'var(--s3)' } }, h('strong', icon('compass'), ` ${cfg.city}`), h('div.row', { style: { gap: '6px' } }, h('button.btn.btn--sm.btn--ghost', { onclick: adjustSheet }, '± мин'), h('button.btn.btn--sm.btn--ghost', { onclick: citySheet }, 'Сменить город'))),
    host,
    h('p.small.muted', { style: { marginTop: 'var(--s4)' } }, `Аср по ханафитскому мазхабу (тень в два раза длиннее предмета). ${note.note || ''} Расписание за месяц сохраняется на телефоне и доступно без интернета.`),
    h('p.small.muted', 'Источник: ', h('a', { href: 'https://aladhan.com/prayer-times-api', target: '_blank', rel: 'noopener' }, 'Aladhan API'), '. Если ваша мечеть публикует другое время, ориентируйтесь на неё.')));
}
