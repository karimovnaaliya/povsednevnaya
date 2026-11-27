import { h, icon } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { page, tile, callout, sectionTitle, sourcesBlock } from '../ui/components.js';

export default function special() {
  const on = !!(state.days[todayKey()] || {}).special;
  const btn = h('button.btn.btn--lg.btn--block', {
    style: on ? null : { background: 'var(--special)', color: '#fff' },
    class: on ? 'btn--ghost' : '',
    onclick: () => { update(s => { const d = s.days[todayKey()] || (s.days[todayKey()] = { sec: 0 }); d.special = !d.special; }, 'special'); location.hash = '#/home'; },
  }, icon('flower'), on ? 'Снять отметку на сегодня' : 'Отметить сегодня как «Особый день»');

  return page('Особые дни', h('div.stack',
    h('p', 'Этот режим для дней хайда и нифаса. Отмеченные дни показываются в календаре мягким сиреневым цветом, не считаются пропуском и не прерывают серию. Отметка хранится только на вашем телефоне.'),
    btn,
    h('p.small.muted', 'Прошлые дни можно отметить в календаре: нажмите на день.'),
    sectionTitle('Что можно делать в эти дни'),
    callout('hanafi', 'По ханафитскому мазхабу', [
      '- Слушать чтение Корана',
      '- Зикр: тасбих, тахмид, тахлиль, такбир, истигфар, салават',
      '- Дуа на любом языке, в том числе коранические дуа с намерением мольбы (а не чтения Корана)',
      '- Утренние и вечерние азкары',
      '- Изучать знания: акиду, историю, сунну, правила таджвида в теории',
      '- Повторять тесты и карточки, где нет чтения аятов вслух',
    ].join('\n')),
    callout('warn', 'Что не совершается в эти дни', [
      '- Намаз (его не восполняют)',
      '- Пост (пропущенные дни Рамадана восполняют позже)',
      '- Касание мусхафа и чтение Корана вслух с намерением чтения',
      '- Пребывание в мечети, таваф',
    ].join('\n')),
    h('div.stack',
      tile({ href: '#/reader/1', iconName: 'volume', title: 'Слушать Коран', sub: 'Выберите суру и слушайте чтеца' }),
      tile({ href: '#/adhkar', iconName: 'sun', title: 'Азкары', sub: 'Утро, вечер, перед сном' }),
      tile({ href: '#/tasbih', iconName: 'beads', title: 'Тасбих', sub: 'Счётчик зикра' }),
      tile({ href: '#/duas', iconName: 'hands', title: 'Дуа', sub: 'Мольбы на каждый день' }),
      tile({ href: '#/names', iconName: 'star', title: '99 имён Аллаха', sub: 'Карточки и игра' }),
      tile({ href: '#/islam', iconName: 'layers', title: 'Основы ислама', sub: 'Акида, история, сунна' }),
      tile({ href: '#/namaz', iconName: 'drop', title: 'Подробно о хайде и нифасе', sub: 'Раздел «Намаз» → «Женские вопросы»' })),
    callout('note', null, 'Если у вас есть личный вопрос о хайде или истихаде, обратитесь к знающей устазе или имаму.'),
    sourcesBlock([
      { title: 'Нур аль-Идах (аш-Шурунбуляли), глава о хайде и нифасе', url: 'https://archive.org/details/NurAlIdahArabicEnglish' },
      { title: 'SeekersGuidance: что можно делать женщине во время менструации (ханафитский мазхаб)', url: 'https://seekersguidance.org/answers/hanafi-fiqh/' },
    ])));
}
