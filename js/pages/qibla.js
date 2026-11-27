import { h, icon } from '../core/dom.js';
import { config, qiblaBearing } from '../core/prayer.js';
import { page, toast } from '../ui/components.js';

const DIRS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];

export default async function qibla() {
  const c = await config();
  const bearing = qiblaBearing(c.lat, c.lon);
  const pos = [{ top: '6px', left: '50%' }, { top: '50%', right: '8px' }, { bottom: '6px', left: '50%' }, { top: '50%', left: '8px' }];
  const dial = h('div.compass__dial', ['С', 'В', 'Ю', 'З'].map((t, i) => h('span', { style: { ...pos[i], transform: i % 2 ? 'translateY(-50%)' : 'translateX(-50%)' } }, t)));
  const kaaba = h('div.compass__kaaba', { 'aria-hidden': 'true' });
  const pointer = h('div', { style: { position: 'absolute', inset: 0, transform: `rotate(${bearing}deg)`, transition: 'transform .25s linear' } }, kaaba);
  const compass = h('div.compass', { role: 'img', 'aria-label': `Кибла: ${Math.round(bearing)} градусов от севера` }, dial, pointer, h('div.compass__center'));
  const status = h('p.center', { 'aria-live': 'polite' }, 'Схема: север сверху. Кибла показана чёрным квадратом.');
  let live = false;
  const onOrient = e => {
    let heading = null;
    if (typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading;
    else if (e.absolute && typeof e.alpha === 'number') heading = 360 - e.alpha;
    if (heading == null) return;
    live = true;
    dial.style.transform = `rotate(${-heading}deg)`;
    pointer.style.transform = `rotate(${bearing - heading}deg)`;
    const diff = Math.abs(((bearing - heading + 540) % 360) - 180);
    status.textContent = diff < 5 ? 'Вы смотрите в сторону киблы ✓' : 'Поворачивайтесь, пока чёрный квадрат не окажется сверху.';
  };
  const start = async () => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== 'granted') { toast('Без доступа к датчикам используйте градусы и схему.'); return; }
      }
      addEventListener('deviceorientationabsolute', onOrient);
      addEventListener('deviceorientation', onOrient);
      setTimeout(() => { if (!live) status.textContent = 'Компас на этом устройстве недоступен. Используйте градусы: встаньте лицом на север и повернитесь по часовой стрелке на указанный угол.'; }, 2500);
    } catch { toast('Компас недоступен на этом устройстве.'); }
  };
  addEventListener('hashchange', () => { removeEventListener('deviceorientationabsolute', onOrient); removeEventListener('deviceorientation', onOrient); }, { once: true });
  return page('Кибла', h('div.stack',
    h('section.card.center',
      h('div.card__eyebrow', c.city),
      h('div', { style: { fontSize: 'var(--fs-2xl)', fontWeight: 800 } }, `${Math.round(bearing)}°`),
      h('p.muted', { style: { margin: 0 } }, `от севера по часовой стрелке (${DIRS[Math.round(bearing / 45) % 8]})`)),
    compass,
    status,
    h('button.btn.btn--primary.btn--block', { onclick: start }, icon('compass'), 'Включить компас'),
    h('p.small.muted', 'Держите телефон горизонтально, вдали от металла и магнитов. Если показания прыгают, проведите телефоном «восьмёркой» для калибровки. Направление рассчитано по кратчайшему пути до Каабы (21,4225° с. ш., 39,8262° в. д.).')));
}
