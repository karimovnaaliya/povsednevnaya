// Prayer times: Aladhan monthly calendar (cached per month in localStorage) + local astronomical fallback.
import { tryJSON } from './content.js';
import { state } from './store.js';
import { pad } from './time.js';

export const PRAYERS = [
  { id: 'fajr', name: 'Фаджр', api: 'Fajr' },
  { id: 'sunrise', name: 'Восход', api: 'Sunrise', noPrayer: true },
  { id: 'dhuhr', name: 'Зухр', api: 'Dhuhr' },
  { id: 'asr', name: 'Аср', api: 'Asr' },
  { id: 'maghrib', name: 'Магриб', api: 'Maghrib' },
  { id: 'isha', name: 'Иша', api: 'Isha' },
];

const DEFAULT = { city: 'Ош', country: 'Кыргызстан', lat: 40.5283, lon: 72.7985, timezone: 'Asia/Bishkek', method: 99, methodSettings: '15,null,15', school: 1, tune: null, fajrAngle: 15, ishaAngle: 15 };

export async function config() {
  const base = { ...DEFAULT, ...(await tryJSON('data/misc/prayer-config.json', {})) };
  const c = state.settings.city ? { ...base, ...state.settings.city } : base;
  if (c.methodSettings && c.fajrAngle == null) {
    const [f, , i] = String(c.methodSettings).split(',');
    c.fajrAngle = parseFloat(f) || 15; c.ishaAngle = parseFloat(i) || 15;
  }
  return c;
}

function cacheKey(c, y, m) { return `pt-${c.lat.toFixed(3)},${c.lon.toFixed(3)}-${c.method}-${c.methodSettings || ''}-${c.tune || ''}-${y}-${m}`; }

/** {YYYY-MM-DD: {fajr:'05:41', ...}} for a month (m: 1..12). */
export async function month(y, m) {
  const c = await config();
  const key = cacheKey(c, y, m);
  try { const raw = localStorage.getItem(key); if (raw) return { days: JSON.parse(raw), source: 'cache', config: c }; } catch { /* ignore */ }
  try {
    const q = new URLSearchParams({ latitude: c.lat, longitude: c.lon, method: c.method, school: c.school ?? 1, timezonestring: c.timezone });
    if (c.methodSettings) q.set('methodSettings', c.methodSettings);
    if (c.tune) q.set('tune', c.tune);
    const r = await fetch(`https://api.aladhan.com/v1/calendar/${y}/${m}?${q}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const days = {};
    for (const d of j.data) {
      const [dd, mm, yy] = d.date.gregorian.date.split('-');
      const t = {};
      for (const p of PRAYERS) t[p.id] = d.timings[p.api].slice(0, 5);
      days[`${yy}-${mm}-${dd}`] = t;
    }
    try { localStorage.setItem(key, JSON.stringify(days)); } catch { /* quota */ }
    return { days, source: 'api', config: c };
  } catch {
    // offline and nothing cached: compute locally with the same parameters
    const days = {};
    const n = new Date(y, m, 0).getDate();
    for (let d = 1; d <= n; d++) days[`${y}-${pad(m)}-${pad(d)}`] = compute(new Date(y, m - 1, d), c);
    return { days, source: 'local', config: c };
  }
}

export async function today(date = new Date()) {
  const k = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const mth = await month(date.getFullYear(), date.getMonth() + 1);
  return { times: mth.days[k], source: mth.source, config: mth.config };
}

const toMin = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
/** Next prayer from now: {id, name, time, inMin, tomorrow} */
export async function nextPrayer(now = new Date()) {
  const { times } = await today(now);
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const p of PRAYERS) {
    if (p.noPrayer) continue;
    const t = toMin(times[p.id]);
    if (t > cur) return { ...p, time: times[p.id], inMin: t - cur, tomorrow: false };
  }
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  const { times: t2 } = await today(tm);
  return { ...PRAYERS[0], time: t2.fajr, inMin: 24 * 60 - cur + toMin(t2.fajr), tomorrow: true };
}

// ---------- local calculation (standard solar equations) ----------
const rad = d => (d * Math.PI) / 180;
const deg = r => (r * 180) / Math.PI;
function sunPos(jd) {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g))) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));
  let eqt = q / 15 - ((RA + 24) % 24);
  eqt = ((eqt + 12) % 24 + 24) % 24 - 12;
  return { decl, eqt };
}
function tzOffsetHours(date, tz) {
  try {
    const s = date.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
    const m = /GMT([+-]\d+)(?::(\d+))?/.exec(s);
    if (m) return parseInt(m[1], 10) + (m[2] ? Math.sign(parseInt(m[1], 10)) * parseInt(m[2], 10) / 60 : 0);
  } catch { /* ignore */ }
  return 6; // Kyrgyzstan
}
export function compute(date, c) {
  const jd = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) / 86400000 + 2440587.5;
  const { decl, eqt } = sunPos(jd);
  const tz = tzOffsetHours(date, c.timezone);
  const noon = 12 + tz - c.lon / 15 - eqt;
  const lat = rad(c.lat), d = rad(decl);
  const hourAngle = angle => {
    const v = (-Math.sin(rad(angle)) - Math.sin(lat) * Math.sin(d)) / (Math.cos(lat) * Math.cos(d));
    return deg(Math.acos(Math.max(-1, Math.min(1, v)))) / 15;
  };
  const asrAngle = () => {
    const f = (c.school ?? 1) === 1 ? 2 : 1;
    const a = -deg(Math.atan(1 / (f + Math.tan(Math.abs(lat - d)))));
    return hourAngle(a);
  };
  const fmt = hrs => { let m = Math.round(hrs * 60); m = ((m % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
  return {
    fajr: fmt(noon - hourAngle(c.fajrAngle || 15)),
    sunrise: fmt(noon - hourAngle(0.833)),
    dhuhr: fmt(noon + 1 / 60),
    asr: fmt(noon + asrAngle()),
    maghrib: fmt(noon + hourAngle(0.833)),
    isha: fmt(noon + hourAngle(c.ishaAngle || 15)),
  };
}

export function qiblaBearing(lat, lon) {
  const k = { lat: rad(21.4225), lon: rad(39.8262) };
  const p = { lat: rad(lat), lon: rad(lon) };
  const y = Math.sin(k.lon - p.lon);
  const x = Math.cos(p.lat) * Math.tan(k.lat) - Math.sin(p.lat) * Math.cos(k.lon - p.lon);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
