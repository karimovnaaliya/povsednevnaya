// Dates in the user's local time + Hijri helpers.
export const pad = n => String(n).padStart(2, '0');
export function dayKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export const todayKey = () => dayKey(new Date());

export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const DOW_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
export const HIJRI_MONTHS = ['мухаррам', 'сафар', 'раби аль-авваль', 'раби ас-сани', 'джумада аль-уля', 'джумада ас-сания', 'раджаб', 'шаабан', 'рамадан', 'шавваль', 'зуль-када', 'зуль-хиджа'];

export function formatDate(d = new Date(), withDow = false) {
  const s = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  return withDow ? `${DOW_FULL[d.getDay()]}, ${s}` : s;
}

let hijriFmt = null;
/** {day, month (1-12), year} using the Umm al-Qura calendar; offset in days (user can correct ±1–2). */
export function hijri(d = new Date(), offset = 0) {
  try {
    hijriFmt = hijriFmt || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const parts = hijriFmt.formatToParts(addDays(d, offset));
    const get = t => parseInt((parts.find(p => p.type === t) || {}).value, 10);
    const r = { day: get('day'), month: get('month'), year: get('year') };
    if (!r.day || !r.month || !r.year) throw new Error('no hijri');
    return r;
  } catch {
    return hijriFallback(addDays(d, offset));
  }
}
export function formatHijri(h) { return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} г. х.`; }

// Arithmetic (tabular) Islamic calendar fallback for browsers without islamic-umalqura.
function hijriFallback(date) {
  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5) + 0.5;
  const l0 = Math.floor(jd - 1948439.5) + 10632;
  const n = Math.floor((l0 - 1) / 10631);
  let l = l0 - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year };
}

export function fmtMin(sec) {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} мин`;
  return `${Math.floor(m / 60)} ч ${m % 60} мин`;
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}
