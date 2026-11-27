import { h } from '../core/dom.js';
import { page, tile, sectionTitle } from '../ui/components.js';

export default function more() {
  return page('Ещё', h('div',
    h('div.stack',
      tile({ href: '#/revision', iconName: 'refresh', gold: true, title: 'Повторение и тесты', sub: 'Ошибки возвращаются, пока не закрепятся' }),
      tile({ href: '#/islam', iconName: 'layers', title: 'Основы ислама', sub: 'Акида, история, сунна, пост, закят, хадж, ахляк, праздники' }),
      tile({ href: '#/names', iconName: 'star', title: '99 имён Аллаха', sub: 'Значения, карточки, игра' })),
    sectionTitle('Каждый день'),
    h('div.stack',
      tile({ href: '#/focus', iconName: 'clock', title: 'Сессия занятий', sub: 'Таймер 10, 20, 30 или 45 минут' }),
      tile({ href: '#/calendar', iconName: 'calendar', title: 'Календарь и статистика' }),
      tile({ href: '#/goals', iconName: 'target', title: 'Мои цели и награды' }),
      tile({ href: '#/habits', iconName: 'check', title: 'Привычки сунны', sub: 'Маленькие ежедневные дела' }),
      tile({ href: '#/journal', iconName: 'journal', title: 'Дневник' }),
      tile({ href: '#/tasbih', iconName: 'beads', title: 'Тасбих' }),
      tile({ href: '#/adhkar', iconName: 'sun', title: 'Азкары утром и вечером' }),
      tile({ href: '#/ramadan', iconName: 'ramadan', title: 'Рамадан', sub: 'Трекер поста, сухур и ифтар, план чтения' }),
      tile({ href: '#/special', iconName: 'flower', title: 'Особые дни', sub: 'Хайд и нифас: что можно делать' })),
    sectionTitle('Приложение'),
    h('div.stack',
      tile({ href: '#/settings', iconName: 'settings', title: 'Настройки', sub: 'Тема, шрифт, чтец, резервная копия' }),
      tile({ href: '#/about', iconName: 'info', title: 'О приложении' }))));
}
