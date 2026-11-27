// Writes precache.json (all app files for offline use) and stamps sw.js VERSION with a content hash.
// Run after every change: node tools/build-precache.mjs
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const INCLUDE = ['js', 'css', 'data', 'assets'];
const SKIP = [/\/data\/quran\/s002\.json$/, /\/data\/quran\/s018\.json$/]; // large: cached on first open instead
async function walk(d) {
  const out = [];
  for (const e of await readdir(d)) {
    const p = join(d, e);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}
const files = [];
for (const dir of INCLUDE) files.push(...await walk(join(ROOT, dir)));
const list = files.filter(f => !SKIP.some(r => r.test(f))).map(f => relative(ROOT, f).split('\\').join('/')).sort();
const hash = createHash('sha256');
for (const f of [...list, 'index.html', 'manifest.webmanifest']) hash.update(f).update(await readFile(join(ROOT, f)));
const version = hash.digest('hex').slice(0, 10);
await writeFile(join(ROOT, 'precache.json'), JSON.stringify(list));
const swPath = join(ROOT, 'sw.js');
const sw = await readFile(swPath, 'utf8');
await writeFile(swPath, sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`));
let size = 0;
for (const f of list) size += (await stat(join(ROOT, f))).size;
console.log(`precache.json: ${list.length} files, ${(size / 1048576).toFixed(1)} MB; sw VERSION ${version}`);
