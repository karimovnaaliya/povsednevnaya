import { h, icon, clear, vibrate } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { page, confirmSheet } from '../ui/components.js';

// Short dhikr phrases (well-known formulas: Muslim 2137, Bukhari 6405, Bukhari 6307, Muslim 408)
export const PRESETS = [
  { id: 'subhanallah', ar: 'سُبْحَانَ اللهِ', tr: 'SubhanAllah', ru: 'Пречист Аллах', target: 33 },
  { id: 'alhamdulillah', ar: 'الْحَمْدُ لِلّٰهِ', tr: 'Alhamdulillah', ru: 'Хвала Аллаху', target: 33 },
  { id: 'allahuakbar', ar: 'اللهُ أَكْبَرُ', tr: 'Allahu akbar', ru: 'Аллах велик', target: 34 },
  { id: 'tahlil', ar: 'لَا إِلٰهَ إِلَّا اللهُ', tr: 'La ilaha illallah', ru: 'Нет божества, кроме Аллаха', target: 100 },
  { id: 'istighfar', ar: 'أَسْتَغْفِرُ اللهَ', tr: 'Astaghfirullah', ru: 'Прошу прощения у Аллаха', target: 100 },
  { id: 'salawat', ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', tr: 'Allahumma salli \'ala Muhammad', ru: 'О Аллах, благослови Мухаммада', target: 100 },
];

export default function tasbih() {
  let preset = PRESETS[0];
  let n = 0;
  const host = h('div');
  const dayTotals = () => ((state.days[todayKey()] || {}).tasbih || {});
  const save = () => update(s => { const d = s.days[todayKey()] || (s.days[todayKey()] = { sec: 0 }); d.tasbih = { ...(d.tasbih || {}), [preset.id]: ((d.tasbih || {})[preset.id] || 0) + 1 }; }, 'tasbih');

  const paint = () => {
    clear(host);
    const totals = dayTotals();
    const chips = h('div.chips', { role: 'group', 'aria-label': 'Зикр' }, PRESETS.map(p => h('button.chip', { type: 'button', 'aria-pressed': String(p.id === preset.id), onclick: () => { preset = p; n = 0; paint(); } }, p.tr)));
    const numEl = h('span.tasbih-btn__n', String(n));
    const lapEl = h('span.tasbih-btn__t', `цель ${preset.target}`);
    const btn = h('button.tasbih-btn', { type: 'button', 'aria-label': `${preset.tr}: ${n}` }, h('span', numEl, h('span', { style: { display: 'block' } }, lapEl)));
    const totalEl = h('span');
    const paintTotal = () => { totalEl.textContent = `Сегодня: ${dayTotals()[preset.id] || 0}`; };
    paintTotal();
    btn.addEventListener('click', () => {
      n++;
      save();
      numEl.textContent = String(n);
      btn.setAttribute('aria-label', `${preset.tr}: ${n}`);
      if (n % 100 === 0) vibrate([80, 60, 80, 60, 80]);
      else if (n % 33 === 0 || n === preset.target) vibrate([70, 50, 70]);
      else vibrate(12);
      if (n === preset.target) lapEl.textContent = 'цель достигнута ✓';
      paintTotal();
    });
    const sum = Object.entries(totals).map(([k, v]) => { const p = PRESETS.find(x => x.id === k); return p ? `${p.tr}: ${v}` : null; }).filter(Boolean);
    host.append(chips,
      h('div.center', { style: { marginTop: 'var(--s4)' } },
        h('p.ar-inline', { lang: 'ar', style: { display: 'block', fontSize: '2.2rem' } }, preset.ar),
        h('p', { style: { margin: 0 } }, h('strong', preset.tr), ' — ', preset.ru)),
      btn,
      h('div.row', { style: { justifyContent: 'center' } },
        h('button.btn.btn--ghost', { onclick: () => { n = 0; paint(); } }, icon('refresh'), 'Сбросить счёт'),
        h('span.badge', totalEl)),
      h('p.small.muted.center', { style: { marginTop: 'var(--s3)' } }, 'Телефон вибрирует на каждом 33-м и 100-м нажатии.'),
      sum.length ? h('section.card.card--soft', { style: { marginTop: 'var(--s4)' } }, h('div.card__eyebrow', 'Итого за сегодня'), h('ul', { style: { margin: 0 } }, sum.map(s => h('li', s))),
        h('button.btn.btn--sm.btn--ghost', { onclick: () => confirmSheet('Очистить итоги дня?', 'Счётчики за сегодня обнулятся.', 'Очистить', () => { update(s => { if (s.days[todayKey()]) s.days[todayKey()].tasbih = {}; }); paint(); }, true) }, 'Очистить')) : null,
      h('section.card.card--gold', { style: { marginTop: 'var(--s4)' } },
        h('div.card__eyebrow', 'Тасбих Фатимы'),
        h('p', { style: { margin: 0 } }, 'Пророк ﷺ научил дочь Фатиму (р.а.) перед сном говорить 33 раза «Субханаллах», 33 раза «Альхамдулиллях» и 34 раза «Аллаху акбар», и сказал, что это лучше для неё, чем служанка (Бухари 3705, Муслим 2727). Это помогает при усталости от домашних забот.'),
        h('a.small', { href: 'https://sunnah.com/bukhari:3705', target: '_blank', rel: 'noopener' }, 'sunnah.com: Бухари 3705')));
  };
  paint();
  return page('Тасбих', host);
}
