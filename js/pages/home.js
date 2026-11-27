import { h, icon, rich, clear } from '../core/dom.js';
import { state, day, goalSec, streak, update } from '../core/store.js';
import { todayKey, formatDate, hijri, formatHijri, fmtMin } from '../core/time.js';
import { nextLesson, ayahOfDay, duaOfDay } from '../core/progress.js';
import { nextPrayer } from '../core/prayer.js';
import { tryJSON } from '../core/content.js';
import { ring, sectionTitle, audioButton, gradeBadge } from '../ui/components.js';
import { ayahView } from '../ui/arabic.js';

function greeting() {
  const hr = new Date().getHours();
  const part = hr < 5 ? 'Доброй ночи' : hr < 12 ? 'Доброе утро' : hr < 18 ? 'Добрый день' : 'Добрый вечер';
  return part;
}

async function islamicDayNote(hj) {
  const j = await tryJSON('data/misc/islamic-days.json', null);
  const out = [];
  if (j) {
    for (const d of j.days || []) if (d.hijriMonth === hj.month && (!d.hijriDay || d.hijriDay === hj.day)) out.push(d.title);
    const dow = new Date().getDay();
    for (const w of j.weekly || []) if (w.weekday === dow) out.push(w.title);
  }
  if ([13, 14, 15].includes(hj.day)) out.push('Белые дни: сунна поста 13, 14 и 15 числа');
  return [...new Set(out)];
}

export default async function home() {
  const d = day();
  const sec = d.sec || 0;
  const goal = goalSec();
  const st = streak();
  const now = new Date();
  const hj = hijri(now, state.settings.hijriOffset || 0);
  const special = !!d.special;

  const prayerBox = h('a.tile', { href: '#/prayer-times' }, h('span.tile__icon', icon('clock')), h('span.tile__body', h('span.tile__title', 'Время намаза'), h('span.tile__sub', 'Загрузка…')), h('span.tile__end', icon('chevron')));
  nextPrayer().then(p => {
    const hrs = Math.floor(p.inMin / 60), m = p.inMin % 60;
    prayerBox.querySelector('.tile__title').textContent = `Следующий намаз: ${p.name} в ${p.time}`;
    prayerBox.querySelector('.tile__sub').textContent = `${p.tomorrow ? 'завтра, ' : ''}через ${hrs ? `${hrs} ч ` : ''}${m} мин · ${state.settings.city ? state.settings.city.city : 'Ош'}`;
  }).catch(() => { prayerBox.querySelector('.tile__sub').textContent = 'Откройте, чтобы загрузить расписание'; });

  const nextBox = h('div');
  nextLesson().then(n => {
    if (!n) { nextBox.append(h('a.tile', { href: '#/quran' }, h('span.tile__icon', icon('book')), h('span.tile__body', h('span.tile__title', 'Курс чтения Корана'), h('span.tile__sub', 'Выберите урок')), h('span.tile__end', icon('chevron')))); return; }
    if (n.test) nextBox.append(h('a.tile', { href: `#/test/${n.level.level}` }, h('span.tile__icon.tile__icon--gold', icon('medal')), h('span.tile__body', h('span.tile__title', `Тест уровня ${n.level.level}`), h('span.tile__sub', n.level.title)), h('span.tile__end', icon('chevron'))));
    else nextBox.append(h('a.tile', { href: `#/lesson/${n.lesson.id}` }, h('span.tile__icon', icon('book')), h('span.tile__body', h('span.tile__title', n.lesson.title), h('span.tile__sub', `Уровень ${n.level.level} · ${n.level.title}`)), h('span.tile__end', icon('chevron'))));
  }).catch(() => {});

  const ayahBox = h('div');
  ayahOfDay(now).then(k => ayahBox.append(ayahView(k, { big: true }))).catch(() => {});

  const duaBox = h('div');
  duaOfDay(now).then(du => {
    if (!du) return;
    duaBox.append(h('a', { href: `#/dua/${du.id}`, style: { textDecoration: 'none', color: 'inherit' } },
      h('div.card__eyebrow', du.title),
      h('p.ar', { lang: 'ar', style: { fontSize: 'var(--fs-ar)', textAlign: 'center', margin: '4px 0' } }, du.ar),
      state.settings.showTr ? h('p.tr.center', { style: { marginBottom: '4px' } }, du.tr) : null,
      h('p.center', rich(du.ru))),
      h('div.row', { style: { justifyContent: 'space-between' } }, gradeBadge(du.grade), h('a.btn.btn--sm.btn--ghost', { href: `#/dua/${du.id}` }, 'Открыть')));
  });

  const dayNotes = h('div');
  islamicDayNote(hj).then(list => { if (list.length) dayNotes.append(h('div.callout.callout--tip', h('div.callout__title', icon('moon'), 'Сегодня'), h('ul', { style: { margin: 0 } }, list.map(x => h('li', x))))); });

  const goalCard = special
    ? h('section.card.card--soft', { style: { borderColor: 'var(--special)' } },
      h('div.card__eyebrow', { style: { color: 'var(--special)' } }, 'Особые дни'),
      h('p', 'Сегодня отмечен как особый день. Серия не прервётся. Вы можете слушать Коран, делать зикр, читать дуа и изучать знания.'),
      h('div.row.row--wrap', h('a.btn.btn--primary', { href: '#/special' }, 'Что можно делать'), h('button.btn.btn--ghost', { onclick: () => { update(s => { s.days[todayKey()].special = false; }); location.reload(); } }, 'Снять отметку')))
    : h('section.card.card--primary',
      h('div.row', { style: { alignItems: 'center', gap: 'var(--s4)' } },
        ring(sec / goal, { size: 112, stroke: 10, label: `${Math.floor(sec / 60)}`, sub: `из ${state.settings.dailyGoal} мин` }),
        h('div.grow',
          h('div.card__eyebrow', 'Цель на сегодня'),
          h('p', { style: { fontWeight: 700, margin: '0 0 6px', fontSize: 'var(--fs-lg)' } }, sec >= goal ? 'Цель выполнена! Ма ша Аллах' : `${state.settings.dailyGoal} минут с Кораном`),
          h('p.muted.small', { style: { margin: 0 } }, icon('flame'), ` Серия: ${st} ${st % 10 === 1 && st % 100 !== 11 ? 'день' : st % 10 >= 2 && st % 10 <= 4 && (st % 100 < 12 || st % 100 > 14) ? 'дня' : 'дней'}`))),
      h('a.btn.btn--gold.btn--lg.btn--block', { href: '#/focus', style: { marginTop: 'var(--s4)' } }, icon('play'), sec > 0 ? 'Продолжить занятие' : 'Начать занятие'));

  return h('div',
    h('main.page', { id: 'main' },
      h('header', { style: { margin: 'var(--s2) 0 var(--s4)' } },
        h('p.muted.small', { style: { margin: 0 } }, `${formatDate(now, true)} · ${formatHijri(hj)}`),
        h('h1', { style: { margin: '2px 0 0' } }, `${greeting()}${state.settings.name ? `, ${state.settings.name}` : ''}`),
        h('p.ar-inline', { lang: 'ar', style: { color: 'var(--gold)', margin: 0, display: 'block' } }, 'السَّلَامُ عَلَيْكُمْ')),
      h('div.stack', goalCard, dayNotes),
      h('nav.quick', { style: { marginTop: 'var(--s4)' }, 'aria-label': 'Быстрые действия' },
        h('a', { href: '#/quran' }, icon('book'), 'Урок'),
        h('a', { href: '#/revision' }, icon('refresh'), 'Повторение'),
        h('a', { href: '#/duas' }, icon('hands'), 'Дуа'),
        h('a', { href: '#/namaz' }, icon('mosque'), 'Намаз')),
      sectionTitle('Дальше по плану'),
      h('div.stack', nextBox, prayerBox,
        h('a.tile', { href: '#/calendar' }, h('span.tile__icon.tile__icon--gold', icon('calendar')), h('span.tile__body', h('span.tile__title', 'Календарь и статистика'), h('span.tile__sub', `Сегодня: ${fmtMin(sec)}`)), h('span.tile__end', icon('chevron')))),
      sectionTitle('Аят дня'),
      h('section.card', ayahBox),
      sectionTitle('Дуа дня'),
      h('section.card', duaBox)));
}
