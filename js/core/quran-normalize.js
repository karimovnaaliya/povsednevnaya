// Shared between the browser app and tools/fetch-quran.mjs.
// Turns API responses (alquran.cloud + quran.com v4) into the app's compact surah format.

/** Parse alquran.cloud tajweed markup like "مِ[f:14679[ن ش]َرِّ" into segments. */
export function parseTajweed(markup) {
  const segs = [];
  let i = 0;
  let buf = '';
  const push = (t, r) => { if (t) segs.push(r ? { t, r } : { t }); };
  while (i < markup.length) {
    const ch = markup[i];
    if (ch === '[') {
      // [code[ or [code:123[
      const m = /^\[([a-z])(?::\d+)?\[/.exec(markup.slice(i));
      if (m) {
        push(buf); buf = '';
        const start = i + m[0].length;
        const end = markup.indexOf(']', start);
        if (end === -1) { buf += markup.slice(start); break; }
        push(markup.slice(start, end), m[1]);
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  push(buf);
  // merge adjacent plain segments
  const out = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && !last.r && !s.r) last.t += s.t; else out.push({ ...s });
  }
  return out;
}

const WAQF_ONLY = /^[ۖ-ۭؕ-ؚ࣓-ࣿ۞۩\s]+$/u;

/** Split segment list into words on spaces; waqf-only tokens are glued to the previous word. */
export function splitTajweedWords(segs) {
  const words = [[]];
  for (const s of segs) {
    const parts = s.t.split(' ');
    parts.forEach((p, idx) => {
      if (idx > 0) words.push([]);
      if (p) words[words.length - 1].push({ ...s, t: p });
    });
  }
  const clean = words.filter(w => w.length);
  const merged = [];
  let pending = null; // waqf/hizb mark at the very start, glued to the following word
  for (const w of clean) {
    const text = w.map(x => x.t).join('');
    if (WAQF_ONLY.test(text)) {
      if (merged.length) merged[merged.length - 1].push(...w);
      else pending = [...(pending || []), ...w, { t: ' ' }];
    } else {
      merged.push(pending ? [...pending, ...w] : w);
      pending = null;
    }
  }
  return merged;
}

/** Serialize segments back to compact markup "[r[text]" (ids dropped). */
export function segsToMarkup(segs) {
  return segs.map(s => (s.r ? `[${s.r}[${s.t}]` : s.t)).join('');
}

/**
 * Build a surah object.
 * aq: array of 4 alquran.cloud editions [uthmani, tajweed, ru.kuliev, en.transliteration] (surah endpoint data)
 * qc: array of quran.com v4 verses (with words)
 */
export function buildSurah(aq, qcVerses) {
  const [uth, tj, ru, tr] = aq;
  const surahNo = uth.number;
  const ayahs = uth.ayahs.map((a, idx) => {
    let ar = a.text.replace(/\uFEFF/g, '').trim();
    const tjm = tj.ayahs[idx].text.replace(/\uFEFF/g, '').trim();
    // alquran.cloud's uthmani edition prefixes the basmala to ayah 1 of every surah except 1 and 9
    // (the tajweed edition does not), so drop the first 4 words when the counts differ by 4.
    if (a.numberInSurah === 1 && surahNo !== 1 && surahNo !== 9) {
      const w = ar.split(' ');
      // first word of the basmala (bismi) — detection only, the text itself comes from the API
      if (w.length > 4 && w[0] === '\u0628\u0650\u0633\u0652\u0645\u0650') ar = w.slice(4).join(' ');
    }
    const key = `${surahNo}:${a.numberInSurah}`;
    const v = qcVerses ? qcVerses.find(x => x.verse_key === key) : null;
    const qcWords = v ? v.words.filter(w => w.char_type_name === 'word') : [];
    const tjWords = splitTajweedWords(parseTajweed(tjm));
    const aligned = qcWords.length === tjWords.length;
    const words = qcWords.map((w, wi) => ({
      ar: w.text_uthmani,
      tr: w.transliteration && w.transliteration.text ? w.transliteration.text : '',
      a: w.audio_url ? w.audio_url.replace(/^wbw\//, '') : null,
      ...(aligned ? { tj: segsToMarkup(tjWords[wi]) } : {}),
    }));
    return {
      n: a.numberInSurah,
      ar,
      tj: segsToMarkup(parseTajweed(tjm)),
      tr: tr.ayahs[idx].text,
      ru: ru.ayahs[idx].text,
      juz: a.juz,
      page: a.page,
      sajda: !!a.sajda,
      words,
    };
  });
  return {
    surah: surahNo,
    nameAr: uth.name,
    nameEn: uth.englishName,
    revelation: uth.revelationType === 'Meccan' ? 'mecca' : 'medina',
    count: uth.numberOfAyahs,
    ayahs,
  };
}

export const ALQURAN_EDITIONS = ['quran-uthmani', 'quran-tajweed', 'ru.kuliev', 'en.transliteration'];

export function alquranSurahUrl(n) {
  return `https://api.alquran.cloud/v1/surah/${n}/editions/${ALQURAN_EDITIONS.join(',')}`;
}
export function qcomChapterUrl(n, page = 1) {
  return `https://api.quran.com/api/v4/verses/by_chapter/${n}?words=true&word_fields=text_uthmani&per_page=50&page=${page}`;
}
