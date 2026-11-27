import { h } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { page, switchRow, sourcesBlock } from '../ui/components.js';
import { legendList, ayahView } from '../ui/arabic.js';

export default function legend() {
  return page('Цвета таджвида', h('div.stack',
    h('p', 'Цвета в арабском тексте показывают правила таджвида. Система основана на цветном мусхафе таджвида издательства Dar al-Maarifah. Нажмите на правило, чтобы прочитать объяснение. В тексте аята нажмите на слово: внизу будут правила, которые в нём есть.'),
    h('section.card', switchRow('Показывать цвета таджвида', state.settings.tajweed, v => update(s => { s.settings.tajweed = v; }, 'settings'))),
    legendList(),
    h('h2', { style: { fontSize: 'var(--fs-lg)' } }, 'Пример: сура Аль-Ихлас'),
    ...[1, 2, 3, 4].map(a => ayahView(`112:${a}`)),
    sourcesBlock([
      { title: 'AlQuran Cloud API: издание quran-tajweed (разметка правил)', url: 'https://alquran.cloud/tajweed-guide' },
      { title: 'Dar al-Maarifah: цветной мусхаф таджвида', url: 'https://www.daralmaarifah.com' },
      { title: 'Quran.com', url: 'https://quran.com/112' },
    ])));
}
