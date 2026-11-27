// Loads app JSON (data/...) with memory cache. Paths are relative to index.html so GitHub Pages subpaths work.
const cache = new Map();

export function loadJSON(path) {
  if (!cache.has(path)) {
    const p = fetch(path, { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch(e => { cache.delete(path); throw new Error(`Не удалось загрузить ${path}: ${e.message}`); });
    cache.set(path, p);
  }
  return cache.get(path);
}
export async function tryJSON(path, fallback = null) {
  try { return await loadJSON(path); } catch { return fallback; }
}

export const SECTIONS = {
  curriculum: [1, 2, 3, 4, 5, 6].map(n => `data/curriculum/level-${n}.json`),
  namaz: ['why', 'taharat', 'women', 'prayers', 'how-to-pray', 'rulings'].map(f => `data/namaz/${f}.json`),
  islam: ['aqida', 'history', 'sunnah', 'pillars', 'akhlaq', 'calendar'].map(f => `data/islam/${f}.json`),
};

/** Load many files, skipping missing ones (content is shipped as files; a missing one must not break the page). */
export async function loadAll(paths) {
  const res = await Promise.all(paths.map(p => tryJSON(p)));
  return res.map((data, i) => (data ? { path: paths[i], data } : null)).filter(Boolean);
}

let lessonIndex = null;
/** Index of every lesson/topic: id -> {lesson, kind, file, parent, idx} */
export async function getLessonIndex() {
  if (lessonIndex) return lessonIndex;
  const idx = new Map();
  const cur = await loadAll(SECTIONS.curriculum);
  for (const { path, data } of cur) data.lessons.forEach((l, i) => idx.set(l.id, { lesson: l, kind: 'curriculum', path, parent: data, idx: i }));
  for (const kind of ['namaz', 'islam']) {
    const files = await loadAll(SECTIONS[kind]);
    for (const { path, data } of files) data.topics.forEach((l, i) => idx.set(l.id, { lesson: l, kind, path, parent: data, idx: i }));
  }
  lessonIndex = idx;
  return idx;
}
