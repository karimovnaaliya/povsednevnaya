/* Service worker: offline app shell + content, cached API responses, offline audio (see AUDIO.md §6). */
const VERSION = '0f773beec8';
const SHELL = `shell-${VERSION}`;
const DATA = `data-${VERSION}`;
const RUNTIME = 'runtime-v1';
const AUDIO = 'audio-v1';
const AUDIO_MAX = 400;

const SHELL_FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/tokens.css', 'css/base.css', 'css/components.css',
  'assets/icons/favicon.svg', 'assets/icons/icon-192.png',
];
const AUDIO_HOSTS = ['everyayah.com', 'verses.quran.com', 'audio.qurancdn.com'];
const API_HOSTS = ['api.alquran.cloud', 'api.quran.com', 'api.aladhan.com'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(SHELL_FILES);
    // precache everything listed in the build manifest (js, data, figures, letter audio)
    try {
      const r = await fetch('precache.json', { cache: 'no-cache' });
      if (r.ok) {
        const list = await r.json();
        const dc = await caches.open(DATA);
        for (let i = 0; i < list.length; i += 20) await Promise.all(list.slice(i, i + 20).map(u => dc.add(u).catch(() => {})));
      }
    } catch { /* offline install: shell only */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = [SHELL, DATA, RUNTIME, AUDIO];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

// ----- audio: serve cached full files with Range support; never hand an opaque response to <audio> -----
async function rangeResponse(full, req) {
  const range = req.headers.get('range');
  const blob = await full.blob();
  const type = full.headers.get('content-type') || 'audio/mpeg';
  if (!range) return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': blob.size, 'Accept-Ranges': 'bytes' } });
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : blob.size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, blob.size - parseInt(m[2], 10)); end = blob.size - 1; }
  end = Math.min(end, blob.size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${blob.size}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' },
  });
}

async function cacheAudio(url) {
  try {
    const c = await caches.open(AUDIO);
    if (await c.match(url)) return;
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (res.status !== 200) return;
    await c.put(url, res);
    const keys = await c.keys();
    for (let i = 0; i < keys.length - AUDIO_MAX; i++) await c.delete(keys[i]);
  } catch { /* offline or no CORS: skip */ }
}

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'cache-audio' && typeof d.url === 'string') {
    try { if (AUDIO_HOSTS.includes(new URL(d.url).host)) e.waitUntil(cacheAudio(d.url)); } catch { /* bad url */ }
  }
  if (d.type === 'cache-audio-list' && Array.isArray(d.urls)) {
    e.waitUntil((async () => { for (const u of d.urls) await cacheAudio(u); })());
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }

  if (AUDIO_HOSTS.includes(url.host)) {
    e.respondWith((async () => {
      const c = await caches.open(AUDIO);
      const hit = await c.match(url.href);
      if (hit) return rangeResponse(hit, req);
      return fetch(req); // stream from the network untouched
    })());
    return;
  }
  if (url.host === 'cdn.islamic.network') return; // no CORS there: play directly, never intercept

  if (API_HOSTS.includes(url.host)) {
    // network first, cached copy when offline
    e.respondWith((async () => {
      const c = await caches.open(RUNTIME);
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch {
        const hit = await c.match(req);
        if (hit) return hit;
        throw new Error('offline');
      }
    })());
    return;
  }

  if (FONT_HOSTS.includes(url.host)) {
    e.respondWith((async () => {
      const c = await caches.open(RUNTIME);
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    // stale-while-revalidate for app files and content
    e.respondWith((async () => {
      const path = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
      const cacheKey = new URL(path, url.origin).href;
      const hit = (await caches.match(cacheKey, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }));
      const net = fetch(req).then(async res => {
        if (res.ok) { const c = await caches.open(url.pathname.includes('/data/') ? DATA : SHELL); c.put(cacheKey, res.clone()); }
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      const res = await net;
      if (res) return res;
      if (req.mode === 'navigate') return caches.match(new URL('index.html', self.registration.scope).href);
      return new Response('offline', { status: 503, statusText: 'offline' });
    })());
  }
});
