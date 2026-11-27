import { h, icon, clear, rich, md, vibrate } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { loadJSON } from '../core/content.js';
import { page, empty, bar, celebrate, audioButton, gradeBadge } from '../ui/components.js';
import { ayahView } from '../ui/arabic.js';

export default async function adhkar(id) {
  const [ad, du] = await Promise.all([loadJSON('data/duas/adhkar.json'), loadJSON('data/duas/duas.json')]);
  const r = ad.routines.find(x => x.id === id);
  if (!r) return page('Азкары', empty('Не найдено.'));
  const byId = new Map(du.duas.map(d => [d.id, d]));
  const items = r.items.map(it => ({ ...it, d: byId.get(it.dua) })).filter(it => it.d);
  const saved = state.adhkar[id] && state.adhkar[id].date === todayKey() ? state.adhkar[id] : null;
  let i = saved ? Math.min(saved.idx || 0, items.length - 1) : 0;
  let counts = saved && saved.counts ? saved.counts : {};
  const host = h('div');
  const persist = (done = false) => update(s => { s.adhkar[id] = { date: todayKey(), idx: i, counts, done: done || !!(s.adhkar[id] && s.adhkar[id].date === todayKey() && s.adhkar[id].done) }; }, 'adhkar');

  const paint = () => {
    clear(host);
    if (i >= items.length) {
      persist(true);
      celebrate();
      host.append(h('div.result.card', h('div.card__eyebrow', r.title), h('div.result__big', '✓'), h('p', 'Азкары завершены. Пусть Аллах примет! Да защитит Он вас и вашу семью.'),
        h('button.btn.btn--ghost.btn--block', { onclick: () => { i = 0; counts = {}; persist(); paint(); } }, 'Начать заново'),
        h('a.btn.btn--primary.btn--block', { href: '#/adhkar', style: { marginTop: '8px' } }, 'К списку')));
      return;
    }
    const it = items[i];
    const d = it.d;
    const need = it.count || d.count || 1;
    const n = counts[i] || 0;
    const qkeys = d.quran ? (() => { const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(d.quran); if (!m) return []; const o = []; for (let a = +m[2]; a <= +(m[3] || m[2]); a++) o.push(`${m[1]}:${a}`); return o; })() : [];
    const tap = h('button.tasbih-btn', { type: 'button', 'aria-label': `Засчитать. ${n} из ${need}`, style: { width: 'min(54vw, 210px)' } },
      h('span', h('span.tasbih-btn__n', { style: { fontSize: '3rem' } }, `${n}`), h('span.tasbih-btn__t', { style: { display: 'block' } }, `из ${need}`)));
    tap.addEventListener('click', () => {
      counts[i] = (counts[i] || 0) + 1;
      vibrate(15);
      if (counts[i] >= need) { vibrate([60, 40, 60]); i++; }
      persist();
      paint();
    });
    host.append(
      h('div.row', { style: { marginBottom: 'var(--s3)' } }, h('div.grow', bar(i / items.length)), h('span.quiz__count', `${i + 1} / ${items.length}`)),
      h('section.card.stack',
        h('div.row.row--between', h('strong', d.title), gradeBadge(d.grade)),
        qkeys.length ? h('div', qkeys.map(k => ayahView(k))) : h('div.arblock',
          h('div.arblock__ar', { lang: 'ar', dir: 'rtl' }, d.ar),
          state.settings.showTr ? h('div.arblock__tr', d.tr) : null,
          h('div.arblock__ru', rich(d.ru)),
          d.audio ? h('div.arblock__foot', audioButton(d.audio)) : null),
        it.note ? h('p.small.muted', { style: { margin: 0 } }, rich(it.note)) : null,
        d.virtue ? h('details', h('summary.small', { style: { fontWeight: 700, minHeight: '40px' } }, 'Достоинство и источник'), md(d.virtue), h('p.small', h('a', { href: d.url, target: '_blank', rel: 'noopener' }, d.source))) : h('p.small.muted', { style: { margin: 0 } }, d.source)),
      tap,
      h('div.row', { style: { justifyContent: 'space-between' } },
        h('button.btn.btn--ghost', { disabled: i === 0, onclick: () => { i--; persist(); paint(); } }, icon('back'), 'Назад'),
        h('button.btn.btn--ghost', { onclick: () => { i++; persist(); paint(); } }, 'Пропустить', icon('chevron'))));
  };
  paint();
  return page(r.title, h('div', r.description ? h('p.muted', r.description) : null, host));
}
