import { h } from '../core/dom.js';
import { page, empty } from '../ui/components.js';

export default function notFound() {
  return page('Страница не найдена', empty('Такой страницы нет. Возможно, ссылка устарела.', 'compass', h('a.btn.btn--primary', { href: '#/home' }, 'На главную')));
}
