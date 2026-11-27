// Flags hand-typed Arabic (arabic blocks, steps, flashcards, options, duas without "quran" key)
// that matches Quran text (4+ consecutive words, diacritics ignored). Quran must come from data blocks.
import { readFile, readdir } from 'node:fs/promises';
const strip = s => s.replace(/[ً-ٰٟۖ-ۭـٰۡ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي ]/g, ' ').replace(/\s+/g, ' ').trim();
const qdir = new URL('../data/quran/', import.meta.url);
const ayahs = [];
for (const f of (await readdir(qdir)).filter(f => /^s\d{3}\.json$/.test(f))) {
  const s = JSON.parse(await readFile(new URL(f, qdir), 'utf8'));
  for (const a of s.ayahs) ayahs.push({ key: `${s.surah}:${a.n}`, t: ` ${strip(a.ar)} ` });
}
const hits = [];
async function walkFile(path) {
  const j = JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
  const visit = (o, where, inQuranDua) => {
    if (Array.isArray(o)) return o.forEach((x, i) => visit(x, `${where}[${i}]`, inQuranDua));
    if (!o || typeof o !== 'object') return;
    const qd = inQuranDua || !!o.quran;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && /[ء-ي]/.test(v) && !qd) {
        const w = strip(v).split(' ');
        if (w.length >= 4) {
          for (let i = 0; i + 4 <= w.length; i++) {
            const frag = ` ${w.slice(i, i + 4).join(' ')} `;
            const m = ayahs.find(a => a.t.includes(frag));
            if (m) { hits.push(`${path} ${where}.${k}: "${v.slice(0, 50)}" ~ ${m.key}`); break; }
          }
        }
      } else visit(v, `${where}.${k}`, qd);
    }
  };
  visit(j, '', false);
}
const files = [];
for (const d of ['curriculum', 'namaz', 'islam', 'duas', 'hifz', 'misc']) for (const f of await readdir(new URL(`../data/${d}/`, import.meta.url))) if (f.endsWith('.json')) files.push(`data/${d}/${f}`);
for (const f of files) await walkFile(f);
console.log(hits.join('\n') || 'no typed Quran found');
console.log(`${hits.length} possible hand-typed Quran fragments`);
