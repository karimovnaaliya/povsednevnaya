import { h, icon } from '../core/dom.js';
import { state, update, exportBackup, importBackup, resetAll } from '../core/store.js';
import { todayKey, hijri, formatHijri } from '../core/time.js';
import * as audio from '../core/audio.js';
import { getSurah } from '../core/quran.js';
import { page, seg, switchRow, sectionTitle, toast, confirmSheet, audioButton } from '../ui/components.js';

const set = (fn, topic = 'settings') => update(s => fn(s.settings), topic);

export default async function settings() {
  await audio.ready;
  let sample = '';
  try { sample = (await getSurah(1)).ayahs[1].ar; } catch { /* offline */ }
  const arPreview = h('p.ar', { lang: 'ar', style: { fontSize: 'var(--fs-ar)', textAlign: 'center', margin: '8px 0' } }, sample);
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      confirmSheet('Восстановить из копии?', 'Текущий прогресс на этом телефоне будет заменён данными из файла.', 'Восстановить', () => {
        try { importBackup(text); toast('Прогресс восстановлен'); } catch (e) { toast(e.message || 'Файл повреждён', { error: true }); }
      });
    } catch { toast('Не удалось прочитать файл', { error: true }); }
    fileInput.value = '';
  });
  const doExport = () => {
    try {
      const blob = new Blob([exportBackup()], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `put-k-koranu-${todayKey()}.json` });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Файл копии сохранён. Храните его в надёжном месте (например, отправьте себе в мессенджер).');
    } catch { toast('Не удалось создать файл', { error: true }); }
  };
  const notif = async v => {
    if (v && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') { toast('Уведомления не разрешены в браузере', { error: true }); set(s => { s.reminder = false; }); return; }
    }
    if (v && !('Notification' in window)) { toast('Этот браузер не поддерживает уведомления', { error: true }); return; }
    set(s => { s.reminder = v; });
  };

  return page('Настройки', h('div',
    sectionTitle('Оформление'),
    h('section.card.stack',
      h('div', h('div.field__label', 'Тема'), seg([{ value: 'auto', label: 'Авто' }, { value: 'light', label: 'Светлая' }, { value: 'dark', label: 'Тёмная' }, { value: 'sepia', label: 'Сепия' }], state.settings.theme, v => set(s => { s.theme = v; }))),
      h('label.field', { style: { margin: 0 } }, h('span.field__label', 'Размер арабского шрифта'),
        h('input', { type: 'range', min: 0.8, max: 1.8, step: 0.1, value: state.settings.arScale, 'aria-label': 'Размер арабского шрифта', oninput: e => set(s => { s.arScale = +e.target.value; }) }), arPreview),
      h('label.field', { style: { margin: 0 } }, h('span.field__label', 'Ваше имя (для приветствия)'),
        h('input.input', { value: state.settings.name, maxlength: 40, placeholder: 'Например: Айгуль', onchange: e => set(s => { s.name = e.target.value.trim(); }) }))),
    sectionTitle('Текст Корана'),
    h('section.card',
      switchRow('Цвета таджвида', state.settings.tajweed, v => set(s => { s.tajweed = v; })),
      switchRow('Транслитерация (латиницей)', state.settings.showTr, v => set(s => { s.showTr = v; })),
      switchRow('Перевод смыслов (Кулиев)', state.settings.showRu !== false, v => set(s => { s.showRu = v; }))),
    sectionTitle('Аудио'),
    h('section.card.stack',
      h('label.field', { style: { margin: 0 } }, h('span.field__label', 'Чтец'),
        h('select.select', { onchange: e => { set(s => { s.reciter = e.target.value; }); audio.stop(); } }, audio.reciters().map(r => h('option', { value: r.id, selected: r.id === state.settings.reciter }, r.name))),
        h('span.field__hint', 'Для начинающих удобны Аль-Хусари и обучающие записи (муаллим).')),
      h('div.row', audioButton({ kind: 'ayah', key: '1:2' }, { label: 'Проверить звук', title: 'Проверка: 1:2' }), h('span.small.muted', 'Проверить звук: Аль-Фатиха, аят 2')),
      h('div', h('div.field__label', 'Скорость'), seg([0.75, 0.9, 1, 1.25].map(v => ({ value: v, label: `${v}×` })), state.settings.speed, v => { set(s => { s.speed = v; }); audio.setSpeed(v); }))),
    sectionTitle('Напоминания и дата'),
    h('section.card.stack',
      switchRow('Ежедневное напоминание', state.settings.reminder, notif, 'Работает, пока приложение открыто или установлено на телефоне и браузер разрешает уведомления.'),
      h('label.field', { style: { margin: 0 } }, h('span.field__label', 'Время напоминания'), h('input.input', { type: 'time', value: state.settings.reminderTime, onchange: e => set(s => { s.reminderTime = e.target.value; }) })),
      h('div', h('div.field__label', 'Поправка даты по хиджре'), seg([-2, -1, 0, 1, 2].map(v => ({ value: v, label: v > 0 ? `+${v}` : String(v) })), state.settings.hijriOffset || 0, v => set(s => { s.hijriOffset = v; })),
        h('p.field__hint', `Сегодня: ${formatHijri(hijri(new Date(), state.settings.hijriOffset || 0))}. Если муфтият объявил другую дату (по луне), поправьте на 1–2 дня.`))),
    sectionTitle('Резервная копия'),
    h('section.card.stack',
      h('p', { style: { margin: 0 } }, 'Весь прогресс хранится только на этом телефоне. Раз в неделю сохраняйте копию в файл: так вы его никогда не потеряете.'),
      h('button.btn.btn--primary.btn--block', { onclick: doExport }, icon('download'), 'Сохранить копию в файл'),
      h('button.btn.btn--ghost.btn--block', { onclick: () => fileInput.click() }, icon('upload'), 'Восстановить из файла'),
      fileInput),
    sectionTitle('Прочее'),
    h('div.stack',
      h('a.tile', { href: '#/about' }, h('span.tile__icon', icon('info')), h('span.tile__body', h('span.tile__title', 'О приложении')), h('span.tile__end', icon('chevron'))),
      h('button.btn.btn--danger.btn--block', { onclick: () => confirmSheet('Удалить весь прогресс?', 'Это действие нельзя отменить. Сначала сохраните копию в файл.', 'Удалить', () => { resetAll(); toast('Прогресс удалён'); location.hash = '#/home'; }, true) }, icon('trash'), 'Сбросить прогресс'))));
}
