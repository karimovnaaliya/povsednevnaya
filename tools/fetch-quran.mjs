// Downloads Quran surahs from alquran.cloud + quran.com and writes data/quran/sNNN.json.
// Usage: node tools/fetch-quran.mjs 1 78-114 2 36 67
import { writeFile, mkdir } from 'node:fs/promises';
import { buildSurah, alquranSurahUrl, qcomChapterUrl } from '../js/core/quran-normalize.js';

const args = process.argv.slice(2);
const list = [];
for (const a of args.length ? args : ['1', '78-114']) {
  const m = /^(\d+)-(\d+)$/.exec(a);
  if (m) for (let i = +m[1]; i <= +m[2]; i++) list.push(i); else list.push(+a);
}

async function getJson(url, tries = 4) {
  for (let t = 1; t <= tries; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (t === tries) throw new Error(`${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 800 * t));
    }
  }
}

await mkdir(new URL('../data/quran/', import.meta.url), { recursive: true });
const report = [];
for (const n of list) {
  const aq = (await getJson(alquranSurahUrl(n))).data;
  const verses = [];
  let page = 1;
  for (;;) {
    const j = await getJson(qcomChapterUrl(n, page));
    verses.push(...j.verses);
    if (!j.pagination.next_page) break;
    page = j.pagination.next_page;
  }
  const s = buildSurah(aq, verses);
  const unaligned = s.ayahs.filter(a => a.words.length && !a.words[0].tj).map(a => a.n);
  const noWords = s.ayahs.filter(a => !a.words.length).map(a => a.n);
  const file = new URL(`../data/quran/s${String(n).padStart(3, '0')}.json`, import.meta.url);
  await writeFile(file, JSON.stringify(s));
  report.push(`${n} ${s.nameEn}: ${s.count} ayahs; unaligned tajweed words: ${unaligned.length ? unaligned.join(',') : 'none'}; missing words: ${noWords.length ? noWords.join(',') : 'none'}`);
  console.log(report[report.length - 1]);
}
