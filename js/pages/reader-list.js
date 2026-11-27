import { h, icon, clear } from '../core/dom.js';
import { surahList, BUNDLED, stripSurahWord } from '../core/quran.js';
import { page } from '../ui/components.js';

export default async function readerList() {
  const list = await surahList();
  const host = h('div.stack');
  const input = h('input.input', { type: 'search', placeholder: 'Поиск: название или номер', 'aria-label': 'Поиск суры' });
  const paint = () => {
    const q = input.value.trim().toLowerCase();
    clear(host);
    for (const s of list) {
      if (q && !(String(s.n) === q || s.ru.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q) || s.tr.toLowerCase().includes(q))) continue;
      host.append(h('a.tile', { href: `#/reader/${s.n}` },
        h('span.tile__icon', { style: { fontWeight: 800 } }, String(s.n)),
        h('span.tile__body', h('span.tile__title', s.ru), h('span.tile__sub', `${s.meaning} · ${s.count} аятов · ${s.rev === 'mecca' ? 'мекканская' : 'мединская'}${BUNDLED.has(s.n) ? '' : ' · по интернету'}`)),
        h('span.tile__end', h('span.ar-inline', { lang: 'ar' }, stripSurahWord(s.ar)))));
    }
    if (!host.children.length) host.append(h('p.muted', 'Ничего не найдено.'));
  };
  input.addEventListener('input', paint);
  paint();
  return page('Читать и слушать', h('div.stack',
    h('p.small.muted', 'Суры, отмеченные «по интернету», загружаются при первом открытии и потом доступны офлайн.'),
    input, host));
}
