// Derived progress: next lesson, unlocks, counts, badges.
import { loadAll, SECTIONS, tryJSON } from './content.js';
import { state, update, streak, longestStreak } from './store.js';
import { todayKey } from './time.js';

export async function levels() {
  const files = await loadAll(SECTIONS.curriculum);
  return files.map(f => f.data).sort((a, b) => a.level - b.level);
}

export function levelUnlocked(n) {
  if (n <= 1) return true;
  const prev = state.levels[n - 1];
  return !!(prev && (prev.passed || prev.skipped)) || !!(state.levels[n] && (state.levels[n].skipped || state.levels[n].opened));
}

export async function nextLesson() {
  for (const lv of await levels()) {
    if (!levelUnlocked(lv.level)) return null;
    const l = lv.lessons.find(x => !(state.lessons[x.id] && state.lessons[x.id].done));
    if (l) return { lesson: l, level: lv };
    if (!(state.levels[lv.level] && state.levels[lv.level].passed)) return { test: true, level: lv };
  }
  return null;
}

export function markLesson(id, score = 1) {
  update(s => {
    const prev = s.lessons[id] || {};
    s.lessons[id] = { done: true, at: prev.at || todayKey(), score: Math.max(prev.score || 0, score) };
    s.last.lesson = id;
    const d = s.days[todayKey()] || (s.days[todayKey()] = { sec: 0 });
    d.lessons = [...new Set([...(d.lessons || []), id])];
  }, 'lesson');
  checkBadges();
}

export function lessonsThisWeek() {
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); start.setHours(0, 0, 0, 0);
  let n = 0;
  for (const [k, d] of Object.entries(state.days)) {
    const [y, m, dd] = k.split('-').map(Number);
    if (new Date(y, m - 1, dd) >= start && d.lessons) n += d.lessons.length;
  }
  return n;
}

export const learnedSurahs = () => Object.values(state.hifz).filter(x => x.status === 'learned' || x.status === 'review').length;
export const learnedDuas = () => Object.values(state.duas).filter(x => x.learned).length;
export const totalSeconds = () => Object.values(state.days).reduce((a, d) => a + (d.sec || 0), 0);
export const lessonsDone = () => Object.values(state.lessons).filter(x => x.done).length;
export function quizAccuracy() {
  let c = 0, t = 0;
  for (const d of Object.values(state.days)) if (d.quiz) { c += d.quiz.c; t += d.quiz.t; }
  return t ? c / t : null;
}

export const BADGES = [
  { id: 'first-lesson', title: 'Первый шаг', desc: 'Пройден первый урок', test: () => lessonsDone() >= 1 },
  { id: 'lessons-10', title: 'Ученица', desc: '10 пройденных уроков', test: () => lessonsDone() >= 10 },
  { id: 'lessons-30', title: 'Усердие', desc: '30 пройденных уроков', test: () => lessonsDone() >= 30 },
  { id: 'streak-3', title: 'Три дня подряд', desc: 'Цель выполнена 3 дня подряд', test: () => longestStreak() >= 3 },
  { id: 'streak-7', title: 'Неделя', desc: 'Цель выполнена 7 дней подряд', test: () => longestStreak() >= 7 },
  { id: 'streak-30', title: 'Месяц постоянства', desc: '30 дней подряд', test: () => longestStreak() >= 30 },
  { id: 'surah-1', title: 'Первая сура', desc: 'Выучена первая сура', test: () => learnedSurahs() >= 1 },
  { id: 'surah-10', title: 'Десять сур', desc: 'Выучено 10 сур', test: () => learnedSurahs() >= 10 },
  { id: 'dua-10', title: 'Десять дуа', desc: 'Выучено 10 дуа', test: () => learnedDuas() >= 10 },
  { id: 'hours-10', title: '10 часов знаний', desc: 'Всего 10 часов занятий', test: () => totalSeconds() >= 36000 },
  { id: 'level-1', title: 'Алфавит повторён', desc: 'Пройден тест 1 уровня', test: () => !!(state.levels[1] && state.levels[1].passed) },
  { id: 'level-4', title: 'Основы таджвида', desc: 'Пройден тест 4 уровня', test: () => !!(state.levels[4] && state.levels[4].passed) },
];

export function checkBadges() {
  const fresh = BADGES.filter(b => !state.badges[b.id] && b.test());
  if (fresh.length) {
    update(s => { for (const b of fresh) s.badges[b.id] = todayKey(); }, 'badges');
    import('../ui/components.js').then(c => fresh.forEach(b => c.toast(`Новая награда: «${b.title}»`)));
  }
}

export async function ayahOfDay(date = new Date()) {
  const j = await tryJSON('data/misc/ayah-of-day.json', { keys: ['2:286'] });
  const n = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
  const key = j.keys[n % j.keys.length];
  // offline and that surah is not saved yet: pick a key from a bundled surah instead
  const { BUNDLED, getAyah } = await import('./quran.js');
  try { await getAyah(key); return key; } catch {
    const local = j.keys.filter(k => BUNDLED.has(+k.split(':')[0]));
    return local.length ? local[n % local.length] : '1:2';
  }
}
export async function duaOfDay(date = new Date()) {
  const j = await tryJSON('data/duas/duas.json', null);
  if (!j || !j.duas.length) return null;
  const n = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
  const pool = j.duas.filter(d => d.grade !== 'daif');
  return pool[(n * 7) % pool.length];
}
export { streak };
