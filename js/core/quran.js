// Quran data access: bundled surahs (data/quran/sNNN.json) or live API, plus Russian word glosses.
import { loadJSON, tryJSON } from './content.js';
import { buildSurah, alquranSurahUrl, qcomChapterUrl, parseTajweed } from './quran-normalize.js';

export const BUNDLED = new Set([1, 2, 18, 36, 55, 56, 67, ...Array.from({ length: 37 }, (_, i) => 78 + i)]);
const LS_PREFIX = 'quran-surah-';
const mem = new Map();

export async function surahList() { return (await loadJSON('data/quran/surahs.json')).surahs; }
export async function surahMeta(n) { return (await surahList())[n - 1]; }

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Full surah object (see quran-normalize.js). Throws a Russian error message if unavailable. */
export function getSurah(n) {
  n = Number(n);
  if (!mem.has(n)) {
    const p = (async () => {
      if (BUNDLED.has(n)) return loadJSON(`data/quran/s${String(n).padStart(3, '0')}.json`);
      try { const c = localStorage.getItem(LS_PREFIX + n); if (c) return JSON.parse(c); } catch { /* ignore */ }
      try {
        const aq = (await fetchJson(alquranSurahUrl(n))).data;
        const verses = [];
        let page = 1;
        for (;;) {
          const j = await fetchJson(qcomChapterUrl(n, page));
          verses.push(...j.verses);
          if (!j.pagination || !j.pagination.next_page) break;
          page = j.pagination.next_page;
        }
        const s = buildSurah(aq, verses);
        try { localStorage.setItem(LS_PREFIX + n, JSON.stringify(s)); } catch { /* quota: fine, SW also caches API */ }
        return s;
      } catch {
        throw new Error(navigator.onLine === false ? 'Эта сура ещё не сохранена на телефоне. Подключитесь к интернету один раз, и она останется офлайн.' : 'Не удалось загрузить суру. Проверьте интернет и попробуйте ещё раз.');
      }
    })();
    p.catch(() => mem.delete(n));
    mem.set(n, p);
  }
  return mem.get(n);
}

export async function getAyah(key) {
  const [s, a] = String(key).split(':').map(Number);
  const surah = await getSurah(s);
  const ayah = surah.ayahs[a - 1];
  if (!ayah) throw new Error(`Аят ${key} не найден`);
  return { surah, ayah, s, a };
}

const glossCache = new Map();
export function glosses(n) {
  if (!glossCache.has(n)) glossCache.set(n, tryJSON(`data/quran/wbw-ru/s${String(n).padStart(3, '0')}.json`).then(j => (j ? j.words : {})));
  return glossCache.get(n);
}
export async function gloss(s, a, w) {
  const g = await glosses(s);
  const arr = g[`${s}:${a}`];
  return arr ? arr[w - 1] || null : null;
}

export const stripSurahWord = name => String(name || '').replace(/^سُورَةُ\s*/, '');

// Tajweed rules: code -> {name, short, md, cls}
export const TAJWEED = {
  h: { name: 'Хамзат аль-wasl', short: 'Не произносится при слитном чтении', md: 'Соединительная хамза (ٱ). Читается только в начале чтения; при слитном чтении с предыдущим словом не произносится.' },
  s: { name: 'Непроизносимая буква', short: 'Пишется, но не читается', md: 'Буква написана в мусхафе, но в чтении не произносится (например, алиф после вав множественного числа).' },
  l: { name: 'Лям шамсия', short: 'Лям «солнечный» не читается', md: 'Лям артикля «аль-» перед «солнечной» буквой не произносится, а следующая буква удваивается (шадда).' },
  n: { name: 'Мадд табии', short: 'Естественное удлинение: 2 счёта', md: 'Естественное удлинение гласной буквами мадда (ا و ي) без хамзы и сукуна после них: 2 счёта (харакята).' },
  p: { name: 'Мадд джаиз мунфасыль', short: 'Допустимое удлинение: 2, 4 или 5', md: 'Буква мадда в конце слова, а хамза в начале следующего. В чтении Хафса по Шатыбийе обычно тянут на 4–5 счётов (допускается 2 по другим путям).' },
  o: { name: 'Мадд ваджиб муттасыль', short: 'Обязательное удлинение: 4–5', md: 'Буква мадда и хамза в одном слове. Тянется обязательно, на 4–5 счётов.' },
  m: { name: 'Мадд лязим', short: 'Необходимое удлинение: 6', md: 'После буквы мадда идёт постоянный сукун или шадда (например, в ٱلضَّآلِّينَ). Тянется всегда на 6 счётов.' },
  q: { name: 'Калькаля', short: 'Отзвук на ق ط ب ج د с сукуном', md: 'Буквы قطب جد (ق ط ب ج د) с сукуном произносятся с лёгким отзвуком (отскоком), сильнее при остановке.' },
  g: { name: 'Гунна', short: 'Носовой звук нун/мим с шаддой: 2 счёта', md: 'Нун или мим с шаддой (نّ مّ) произносятся с носовым звуком (гунной) длиной 2 счёта.' },
  f: { name: 'Ихфа', short: 'Скрытое произношение нуна', md: 'Нун с сукуном или танвин перед одной из 15 букв ихфа произносится скрыто, через нос, с гунной 2 счёта.' },
  c: { name: 'Ихфа шафави', short: 'Мим с сукуном перед ب', md: 'Мим с сукуном перед буквой ب произносится скрыто, губы слегка сомкнуты, с гунной 2 счёта.' },
  i: { name: 'Икляб', short: 'Нун/танвин перед ب звучит как м', md: 'Нун с сукуном или танвин перед ب превращается в звук «м» с гунной 2 счёта. В мусхафе отмечен маленькой буквой мим.' },
  a: { name: 'Идгам с гунной', short: 'Слияние нуна с ي ن م و с гунной', md: 'Нун с сукуном или танвин перед буквами ي ن م و (в разных словах) сливается со следующей буквой с носовым звуком 2 счёта.' },
  u: { name: 'Идгам без гунны', short: 'Слияние нуна с ل ر без гунны', md: 'Нун с сукуном или танвин перед ل или ر полностью сливается со следующей буквой без носового звука.' },
  w: { name: 'Идгам шафави', short: 'Мим с сукуном перед م', md: 'Мим с сукуном перед мим сливается с ним в один мим с шаддой и гунной 2 счёта.' },
  d: { name: 'Идгам мутаджанисайн', short: 'Слияние букв одного места', md: 'Слияние двух букв с одинаковым местом произношения, но разными свойствами (например, ت в ط). Первая буква не произносится.' },
  b: { name: 'Идгам мутакарибайн', short: 'Слияние близких букв', md: 'Слияние двух букв с близкими местами произношения (например, ل в ر). Первая буква не произносится.' },
};
export const TAJWEED_ORDER = ['n', 'p', 'o', 'm', 'q', 'g', 'f', 'c', 'i', 'a', 'u', 'w', 'h', 's', 'l', 'd', 'b'];

/** list of colored segments of an ayah: [{idx, r, t}] */
export function coloredSegments(tj) {
  let i = -1;
  return parseTajweed(tj).filter(s => s.r).map(s => ({ idx: ++i, r: s.r, t: s.t }));
}
