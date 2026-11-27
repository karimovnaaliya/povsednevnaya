import { h, icon, clear, $$ } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { getSurah, surahMeta, stripSurahWord } from '../core/quran.js';
import * as audio from '../core/audio.js';
import { page, errorBox, toast, seg, switchRow, sheet } from '../ui/components.js';
import { ayahView, tajweedHint } from '../ui/arabic.js';

export default async function reader(n) {
  n = Number(n);
  if (!(n >= 1 && n <= 114)) return page('Сура', errorBox('Такой суры нет.'));
  const meta = await surahMeta(n);
  let data;
  try { data = await getSurah(n); } catch (e) { return page(meta.ru, errorBox(e.message, () => location.reload())); }
  const list = h('div');
  const basmala = n !== 1 && n !== 9 ? h('p.bismillah', { lang: 'ar' }, (await getSurah(1)).ayahs[0].ar) : null;
  // render progressively for long surahs
  let shown = 0;
  const more = h('button.btn.btn--ghost.btn--block', { type: 'button' }, 'Показать ещё');
  const renderMore = () => {
    const end = Math.min(data.count, shown + 40);
    for (let a = shown + 1; a <= end; a++) list.append(ayahView(`${n}:${a}`, { tools: [h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: () => playFrom(a) }, icon('play'), 'Отсюда')] }));
    shown = end;
    if (shown >= data.count) more.remove();
  };
  more.addEventListener('click', renderMore);
  renderMore();

  const highlight = ref => {
    $$('.ayah.is-playing', list).forEach(x => x.classList.remove('is-playing'));
    if (!ref) return;
    const a = +ref.key.split(':')[1];
    while (a > shown) renderMore();
    const el = list.querySelector(`[data-key="${ref.key}"]`);
    if (el) { el.classList.add('is-playing'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  };
  const playFrom = start => {
    const refs = [];
    for (let a = start; a <= data.count; a++) refs.push({ kind: 'ayah', key: `${n}:${a}` });
    audio.play(refs, { label: meta.ru, onItem: r => highlight(r), onDone: () => highlight(null) });
  };

  const download = () => {
    const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!sw) { toast('Офлайн-режим заработает после установки приложения на телефон (или после перезагрузки страницы).'); return; }
    const urls = [];
    for (let a = 1; a <= data.count; a++) { const src = audio.sourcesFor({ kind: 'ayah', key: `${n}:${a}` }).find(u => !u.includes('cdn.islamic.network')); if (src) urls.push(src); }
    sw.postMessage({ type: 'cache-audio-list', urls });
    toast(`Скачиваю ${urls.length} аудиофайлов в фоне. Не закрывайте приложение пару минут.`);
  };

  const settingsSheet = () => sheet('Вид текста', h('div',
    switchRow('Цвета таджвида', state.settings.tajweed, v => update(s => { s.settings.tajweed = v; }, 'settings')),
    switchRow('Транслитерация', state.settings.showTr, v => update(s => { s.settings.showTr = v; }, 'settings')),
    switchRow('Перевод', state.settings.showRu !== false, v => update(s => { s.settings.showRu = v; }, 'settings')),
    h('label.field', { style: { marginTop: 'var(--s3)' } }, h('span.field__label', 'Размер арабского шрифта'),
      h('input', { type: 'range', min: 0.8, max: 1.8, step: 0.1, value: state.settings.arScale, oninput: e => update(s => { s.settings.arScale = +e.target.value; }, 'settings') })),
    h('p.small.muted', 'Изменения применятся после закрытия этого окна.')), { onClose: () => location.reload() });

  return page(meta.ru, h('div',
    h('header.center', { style: { marginBottom: 'var(--s3)' } },
      h('p.ar-inline', { lang: 'ar', style: { display: 'block', fontSize: '2.2rem', color: 'var(--primary)' } }, stripSurahWord(meta.ar)),
      h('p.muted', { style: { margin: 0 } }, `${meta.meaning} · ${meta.count} аятов · ${meta.rev === 'mecca' ? 'мекканская' : 'мединская'}`)),
    h('div.row.row--wrap', { style: { justifyContent: 'center', marginBottom: 'var(--s3)' } },
      h('button.btn.btn--primary', { onclick: () => playFrom(1) }, icon('play'), 'Слушать всю'),
      h('button.btn.btn--ghost', { onclick: download }, icon('download'), 'Скачать аудио')),
    tajweedHint(),
    h('p.small.muted', 'Кнопка «Отсюда» у аята включает чтение с этого места до конца суры. Перевод смыслов: Эльмир Кулиев.'),
    basmala, list, more,
    h('div.row', { style: { justifyContent: 'space-between', marginTop: 'var(--s5)' } },
      n > 1 ? h('a.btn.btn--ghost', { href: `#/reader/${n - 1}` }, icon('back'), 'Предыдущая') : h('span'),
      n < 114 ? h('a.btn.btn--ghost', { href: `#/reader/${n + 1}` }, 'Следующая', icon('chevron')) : h('span'))), {
    actions: [h('button.topbar__btn', { 'aria-label': 'Вид текста', onclick: settingsSheet }, icon('settings'))],
  });
}
