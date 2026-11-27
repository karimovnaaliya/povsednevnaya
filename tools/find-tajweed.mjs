// Lists real examples of a tajweed rule from bundled Quran data.
// Usage: node tools/find-tajweed.mjs <code> [surah] [limit]
import { readFile, readdir } from 'node:fs/promises';
import { parseTajweed, splitTajweedWords } from '../js/core/quran-normalize.js';
const [code, surahArg, limitArg] = process.argv.slice(2);
if (!code) { console.log('usage: node tools/find-tajweed.mjs <code> [surah] [limit]'); process.exit(1); }
const limit = +(limitArg || 40);
const dir = new URL('../data/quran/', import.meta.url);
const files = (await readdir(dir)).filter(f => /^s\d{3}\.json$/.test(f)).filter(f => !surahArg || f === `s${String(surahArg).padStart(3, '0')}.json`).sort().reverse();
let shown = 0;
for (const f of files) {
  const s = JSON.parse(await readFile(new URL(f, dir), 'utf8'));
  for (const a of s.ayahs) {
    const segs = parseTajweed(a.tj);
    let seg = -1;
    const segs2 = segs.map(x => (x.r ? { ...x, idx: ++seg } : x));
    const words = splitTajweedWords(segs2);
    for (const x of segs2) {
      if (x.r !== code) continue;
      const wi = words.findIndex(w => w.some(p => p.idx === x.idx));
      if (shown < limit) console.log(`${s.surah}:${a.n}\tsegment=${x.idx}\tword=${wi + 1}\t«${x.t}»\t${a.words[wi] ? a.words[wi].ar : ''}`);
      shown++;
    }
  }
}
console.log(`total found: ${shown}`);
