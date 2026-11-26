// Validates every content JSON file in data/ against CONTENT_SCHEMA.md.
// Usage: node tools/validate.mjs [path-substring]
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const filter = process.argv[2] || '';
const errors = [];
const warnings = [];
const ids = new Map();
const stats = { lessons: 0, questions: 0, duas: 0, files: 0 };
const quranCache = new Map();

const BLOCKS = {
  heading: ['text'], text: ['md'], callout: ['tone', 'md'], arabic: ['ar', 'tr', 'ru'],
  ayah: ['key'], ayahs: ['from', 'to'], 'quran-words': ['key', 'words'], letters: ['items'],
  table: ['head', 'rows'], keypoints: ['items'], steps: ['items'], figure: ['src', 'caption', 'alt'],
  flashcards: ['cards'], reveal: ['prompt', 'answer'], practice: ['questions'], makhraj: ['point', 'md'],
};
const TONES = ['info', 'tip', 'warn', 'hanafi', 'note'];
const MAKHRAJ = ['throat-deep', 'throat-mid', 'throat-top', 'tongue-back', 'tongue-mid', 'tongue-edge', 'tongue-tip', 'teeth', 'lips', 'nose', 'jawf'];
const QTYPES = ['mcq', 'truefalse', 'listen', 'fill', 'match', 'connect', 'order', 'sort', 'tajweed'];
const FORBIDDEN = /\b(TODO|TBD|lorem ipsum|FIXME)\b|скоро будет|coming soon|в разработке/i;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir)) {
    const p = join(dir, e);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p)); else if (p.endsWith('.json')) out.push(p);
  }
  return out;
}

function err(file, path, msg) { errors.push(`${file} ${path}: ${msg}`); }
function warn(file, path, msg) { warnings.push(`${file} ${path}: ${msg}`); }

function regId(file, path, id) {
  if (!id || typeof id !== 'string') return err(file, path, 'missing id');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) err(file, path, `bad id "${id}" (kebab-case latin)`);
  if (ids.has(id)) err(file, path, `duplicate id "${id}" (also in ${ids.get(id)})`);
  ids.set(id, file);
}

async function surah(n) {
  if (quranCache.has(n)) return quranCache.get(n);
  let s = null;
  try { s = JSON.parse(await readFile(join(ROOT, `data/quran/s${String(n).padStart(3, '0')}.json`), 'utf8')); } catch { /* not bundled */ }
  quranCache.set(n, s);
  return s;
}

async function checkKey(file, path, key, wordList) {
  const m = /^(\d+):(\d+)(?::(\d+))?$/.exec(String(key));
  if (!m) return err(file, path, `bad ayah key "${key}"`);
  const [sn, an, wn] = [+m[1], +m[2], m[3] ? +m[3] : null];
  if (sn < 1 || sn > 114) return err(file, path, `surah out of range "${key}"`);
  const s = await surah(sn);
  if (!s) { warn(file, path, `surah ${sn} not bundled (will load from API at runtime)`); return; }
  const a = s.ayahs[an - 1];
  if (!a) return err(file, path, `ayah ${key} does not exist (surah has ${s.count})`);
  const check = wn ? [wn] : (wordList || []);
  for (const w of check) if (w < 1 || w > a.words.length) err(file, path, `word ${w} out of range for ${sn}:${an} (has ${a.words.length})`);
}

async function checkAudio(file, path, a) {
  if (a == null) return;
  if (typeof a !== 'object') return err(file, path, 'audio must be object');
  if (a.kind === 'ayah' || a.kind === 'word') await checkKey(file, path, a.key);
  else if (a.kind === 'ayahs') { await checkKey(file, path, a.from); await checkKey(file, path, a.to); }
  else if (a.kind === 'url') { if (!/^https:\/\//.test(a.src || '')) err(file, path, 'audio url must be https'); }
  else err(file, path, `unknown audio kind "${a.kind}"`);
}

function checkStrings(file, path, obj) {
  const s = JSON.stringify(obj);
  if (FORBIDDEN.test(s)) err(file, path, 'contains placeholder text (TODO/lorem/скоро)');
  if (/<\/?(script|div|span|p|b|i|br)\b/i.test(s)) err(file, path, 'raw HTML is not allowed in content');
}

function checkSources(file, path, src, required = true) {
  if (!Array.isArray(src) || !src.length) { if (required) err(file, path, 'sources missing/empty'); return; }
  src.forEach((s, i) => {
    if (!s.title) err(file, `${path}.sources[${i}]`, 'source title missing');
    if (!/^https?:\/\//.test(s.url || '')) err(file, `${path}.sources[${i}]`, 'source url missing/invalid');
  });
}

async function checkQuestion(file, path, q) {
  stats.questions++;
  regId(file, path, q.id);
  if (!QTYPES.includes(q.type)) return err(file, path, `unknown question type "${q.type}"`);
  if (!q.prompt && !q.promptAr) err(file, path, 'prompt missing');
  if (!q.explain) err(file, path, 'explain missing');
  await checkAudio(file, path, q.audio);
  const needOpts = ['mcq', 'listen', 'fill', 'tajweed'];
  if (needOpts.includes(q.type)) {
    if (!Array.isArray(q.options) || q.options.length < 2) err(file, path, 'options (>=2) required');
    else {
      if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)) err(file, path, 'answer index invalid');
      if (new Set(q.options.map(String)).size !== q.options.length) err(file, path, 'duplicate options');
    }
  }
  if (q.type === 'truefalse' && typeof q.answer !== 'boolean') err(file, path, 'answer must be boolean');
  if (q.type === 'listen' && !q.audio) err(file, path, 'listen needs audio');
  if (q.type === 'fill' && !/___/.test((q.promptAr || '') + (q.prompt || ''))) err(file, path, 'fill needs ___ in prompt/promptAr');
  if (q.type === 'match' || q.type === 'connect') {
    const max = q.type === 'connect' ? 5 : 6;
    if (!Array.isArray(q.pairs) || q.pairs.length < 3 || q.pairs.length > max) err(file, path, `pairs must be 3..${max}`);
    else {
      q.pairs.forEach((p, i) => { if (!Array.isArray(p) || p.length !== 2 || !p[0] || !p[1]) err(file, path, `pair ${i} invalid`); });
      if (new Set(q.pairs.map(p => p[0])).size !== q.pairs.length || new Set(q.pairs.map(p => p[1])).size !== q.pairs.length) err(file, path, 'pairs not unique');
    }
  }
  if (q.type === 'order' && (!Array.isArray(q.items) || q.items.length < 3)) err(file, path, 'order needs >=3 items');
  if (q.type === 'sort') {
    if (!Array.isArray(q.buckets) || q.buckets.length < 2) err(file, path, 'sort needs >=2 buckets');
    if (!Array.isArray(q.items) || q.items.length < 3) err(file, path, 'sort needs >=3 items');
    else q.items.forEach((it, i) => { if (!it.text || !Number.isInteger(it.bucket) || it.bucket >= (q.buckets || []).length) err(file, path, `sort item ${i} invalid`); });
  }
  if (q.type === 'tajweed') {
    if (!q.key && !q.tj) err(file, path, 'tajweed needs key or tj');
    if (q.key) await checkKey(file, path, q.key);
    if (!Number.isInteger(q.segment)) err(file, path, 'tajweed needs segment index');
  }
}

async function checkBlock(file, path, b) {
  const req = BLOCKS[b.type];
  if (!req) return err(file, path, `unknown block type "${b.type}"`);
  for (const f of req) if (b[f] == null || b[f] === '') err(file, path, `block ${b.type} missing "${f}"`);
  if (b.type === 'callout' && !TONES.includes(b.tone)) err(file, path, `bad tone "${b.tone}"`);
  if (b.type === 'makhraj' && !MAKHRAJ.includes(b.point)) err(file, path, `bad makhraj point "${b.point}"`);
  if (b.type === 'ayah') await checkKey(file, path, b.key);
  if (b.type === 'ayahs') { await checkKey(file, path, b.from); await checkKey(file, path, b.to); }
  if (b.type === 'quran-words') {
    if (!Array.isArray(b.words) || !b.words.length) err(file, path, 'words must be non-empty array');
    else await checkKey(file, path, b.key, b.words);
  }
  if (b.type === 'arabic') await checkAudio(file, path, b.audio);
  if (b.type === 'letters') for (const [i, it] of (b.items || []).entries()) { if (!it.ar || !it.name) err(file, `${path}.items[${i}]`, 'letter needs ar,name'); await checkAudio(file, `${path}.items[${i}]`, it.audio); }
  if (b.type === 'steps') for (const [i, it] of (b.items || []).entries()) {
    if (!it.title) err(file, `${path}.items[${i}]`, 'step title missing');
    if (it.ar && (!it.tr || !it.ru)) err(file, `${path}.items[${i}]`, 'step with ar needs tr and ru');
    if (it.figure && !it.figure.startsWith('assets/')) err(file, `${path}.items[${i}]`, 'figure must be a path under assets/');
    if (it.figure) await fileExists(file, `${path}.items[${i}]`, it.figure);
    await checkAudio(file, `${path}.items[${i}]`, it.audio);
  }
  if (b.type === 'figure') await fileExists(file, path, b.src);
  if (b.type === 'table' && Array.isArray(b.rows)) b.rows.forEach((r, i) => { if (!Array.isArray(r) || r.length !== b.head.length) err(file, `${path}.rows[${i}]`, 'row length != head length'); });
  if (b.type === 'flashcards') (b.cards || []).forEach((c, i) => { if (!c.front || !c.back) err(file, `${path}.cards[${i}]`, 'card needs front/back'); });
  if (b.type === 'practice') for (const [i, q] of (b.questions || []).entries()) await checkQuestion(file, `${path}.questions[${i}]`, q);
}

async function fileExists(file, path, rel) {
  try { await stat(join(ROOT, rel)); } catch { err(file, path, `file not found: ${rel}`); }
}

async function checkLesson(file, path, l) {
  stats.lessons++;
  regId(file, path, l.id);
  if (!l.title) err(file, path, 'title missing');
  if (!Array.isArray(l.blocks) || !l.blocks.length) err(file, path, 'blocks empty');
  for (const [i, b] of (l.blocks || []).entries()) await checkBlock(file, `${path}.blocks[${i}]`, b);
  for (const [i, q] of (l.quiz || []).entries()) await checkQuestion(file, `${path}.quiz[${i}]`, q);
  checkSources(file, path, l.sources);
}

async function checkDua(file, path, d) {
  stats.duas++;
  regId(file, path, d.id);
  for (const f of ['category', 'title', 'ar', 'tr', 'ru', 'when', 'source', 'grade']) if (!d[f]) err(file, path, `dua missing ${f}`);
  if (!['quran', 'sahih', 'hasan', 'daif'].includes(d.grade)) err(file, path, `bad grade "${d.grade}"`);
  if (d.grade === 'quran' && !d.quran) err(file, path, 'quran dua needs "quran" key');
  if (d.quran) {
    const keys = String(d.quran).split(/[,–-]/).map(s => s.trim());
    for (const k of keys) if (/^\d+:\d+$/.test(k)) await checkKey(file, path, k);
  }
  if (d.url && !/^https:\/\//.test(d.url)) err(file, path, 'url must be https');
  await checkAudio(file, path, d.audio);
}

const files = (await walk(join(ROOT, 'data'))).filter(f => !f.includes('/data/quran/s') && relative(ROOT, f).includes(filter));
for (const f of files) {
  const file = relative(ROOT, f);
  stats.files++;
  let j;
  try { j = JSON.parse(await readFile(f, 'utf8')); } catch (e) { err(file, '', `invalid JSON: ${e.message}`); continue; }
  checkStrings(file, '', j);
  if (file.startsWith('data/curriculum/')) {
    for (const k of ['level', 'id', 'title', 'description', 'lessons', 'test']) if (j[k] == null) err(file, '', `missing ${k}`);
    regId(file, '', j.id);
    for (const [i, l] of (j.lessons || []).entries()) await checkLesson(file, `lessons[${i}]`, l);
    for (const [i, q] of (j.test || []).entries()) await checkQuestion(file, `test[${i}]`, q);
    if ((j.test || []).length < 10) err(file, 'test', 'level test needs >= 10 questions');
  } else if (file.startsWith('data/namaz/') || file.startsWith('data/islam/')) {
    for (const k of ['id', 'title', 'description', 'topics']) if (j[k] == null) err(file, '', `missing ${k}`);
    regId(file, '', j.id);
    for (const [i, l] of (j.topics || []).entries()) await checkLesson(file, `topics[${i}]`, l);
  } else if (file === 'data/hifz/surahs.json') {
    for (const [i, s] of (j.surahs || []).entries()) {
      regId(file, `surahs[${i}]`, s.id);
      for (const k of ['surah', 'order', 'nameRu', 'meaningRu', 'nameAr', 'ayahs', 'revelation', 'difficulty', 'about']) if (s[k] == null || s[k] === '') err(file, `surahs[${i}]`, `missing ${k}`);
      if (!['mecca', 'medina'].includes(s.revelation)) err(file, `surahs[${i}]`, 'revelation must be mecca|medina');
      checkSources(file, `surahs[${i}]`, s.sources);
      for (const [vi, v] of (s.virtues || []).entries()) if (!v.md || !v.source) err(file, `surahs[${i}].virtues[${vi}]`, 'virtue needs md + source');
    }
    checkSources(file, '', j.sources);
  } else if (file.startsWith('data/quran/wbw-ru/')) {
    const n = j.surah;
    const s = await surah(n);
    if (!s) { err(file, '', `surah ${n} not bundled`); continue; }
    for (const [k, arr] of Object.entries(j.words || {})) {
      const an = +k.split(':')[1];
      const a = s.ayahs[an - 1];
      if (!a) { err(file, k, 'ayah missing'); continue; }
      if (!Array.isArray(arr) || arr.length !== a.words.length) err(file, k, `word count ${arr && arr.length} != ${a.words.length}`);
      else arr.forEach((w, i) => { if (!w || /[a-z]{3,}/i.test(w)) err(file, `${k}[${i}]`, `empty or latin gloss "${w}"`); });
    }
  } else if (file === 'data/duas/duas.json') {
    const cats = new Set((j.categories || []).map(c => c.id));
    if (!cats.size) err(file, '', 'categories missing');
    for (const [i, d] of (j.duas || []).entries()) { await checkDua(file, `duas[${i}]`, d); if (!cats.has(d.category)) err(file, `duas[${i}]`, `unknown category "${d.category}"`); }
    checkSources(file, '', j.sources);
  } else if (file === 'data/duas/adhkar.json') {
    // checked after duas are known
  } else if (file === 'data/misc/names99.json') {
    const names = j.names || [];
    if (names.length !== 99) err(file, '', `expected 99 names, got ${names.length}`);
    names.forEach((x, i) => { for (const k of ['n', 'ar', 'tr', 'ru', 'explain']) if (!x[k]) err(file, `names[${i}]`, `missing ${k}`); });
    checkSources(file, '', j.sources);
  } else if (file === 'data/misc/ayah-of-day.json') {
    for (const [i, k] of (j.keys || []).entries()) await checkKey(file, `keys[${i}]`, k);
  } else if (file === 'data/misc/habits.json') {
    for (const [i, h] of (j.habits || []).entries()) { regId(file, `habits[${i}]`, h.id); if (!h.title || !h.source) err(file, `habits[${i}]`, 'habit needs title, source'); }
  } else if (file === 'data/misc/islamic-days.json') {
    for (const [i, d] of (j.days || []).entries()) { regId(file, `days[${i}]`, d.id); if (!d.title || !d.hijriMonth) err(file, `days[${i}]`, 'day needs title, hijriMonth'); }
    checkSources(file, '', j.sources);
  }
}

// adhkar references
try {
  const ad = JSON.parse(await readFile(join(ROOT, 'data/duas/adhkar.json'), 'utf8'));
  for (const [ri, r] of (ad.routines || []).entries()) {
    regId('data/duas/adhkar.json', `routines[${ri}]`, r.id);
    for (const [i, it] of (r.items || []).entries()) if (!ids.has(it.dua)) err('data/duas/adhkar.json', `routines[${ri}].items[${i}]`, `unknown dua id "${it.dua}"`);
  }
} catch { /* not yet written */ }

for (const w of warnings.slice(0, 20)) console.log('warn:', w);
if (warnings.length > 20) console.log(`warn: ... ${warnings.length - 20} more`);
for (const e of errors) console.log('ERROR:', e);
console.log(`\n${stats.files} files, ${stats.lessons} lessons, ${stats.questions} questions, ${stats.duas} duas; ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
