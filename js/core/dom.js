// Tiny DOM helpers + safe mini-markdown renderer (no innerHTML from content).
import { icon } from '../ui/icons.js';

/** h('div.card#id', {onclick, class, style, ...attrs}, ...children) */
export function h(sel, attrs, ...kids) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    if (attrs !== undefined && attrs !== null) kids.unshift(attrs);
    attrs = {};
  }
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(sel) || [];
  const el = document.createElement(m[1] || 'div');
  for (const part of (m[2] || '').match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v; // only for trusted, app-authored strings
    else if (k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const AR_RUN = /([؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿][؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿ ‌‍ً-ٰٟۖ-ۭ()،؟]*[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿ً-ٰٟ]|[؀-ۿﭐ-﷿ﹰ-﻿])/g;
export const hasArabic = s => /[؀-ۿ]/.test(String(s));
export const isMostlyArabic = s => {
  const t = String(s).replace(/[\s\d.,!?()«»"'-]/g, '');
  if (!t) return false;
  const ar = (t.match(/[؀-ۿݐ-ࣿﭐ-﻿]/g) || []).length;
  return ar / t.length > 0.6;
};

/** Text with Arabic runs wrapped in <span class="ar-inline" lang="ar">. ﷺ stays inline (it is a ligature glyph). */
export function rich(text) {
  const frag = document.createDocumentFragment();
  const s = String(text ?? '');
  let last = 0;
  for (const m of s.matchAll(AR_RUN)) {
    if (m[0] === 'ﷺ') continue;
    if (m.index > last) frag.append(s.slice(last, m.index));
    frag.append(h('span.ar-inline', { lang: 'ar', dir: 'rtl' }, m[0]));
    last = m.index + m[0].length;
  }
  if (last < s.length) frag.append(s.slice(last));
  return frag;
}

/** Inline markdown: **bold**, *italic*, [link](https://...) + Arabic detection */
function inline(text) {
  const frag = document.createDocumentFragment();
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(rich(text.slice(last, m.index)));
    if (m[1]) frag.append(h('strong', rich(m[1])));
    else if (m[2]) frag.append(h('em', rich(m[2])));
    else frag.append(h('a', { href: m[4], target: '_blank', rel: 'noopener' }, m[3]));
    last = re.lastIndex;
  }
  if (last < text.length) frag.append(rich(text.slice(last)));
  return frag;
}

/** Block markdown: paragraphs, - lists, 1. lists */
export function md(src) {
  const wrap = h('div.prose');
  const lines = String(src ?? '').replace(/\r/g, '').split('\n');
  let list = null;
  let listType = '';
  let para = [];
  const flushPara = () => { if (para.length) { wrap.append(h('p', inline(para.join(' ')))); para = []; } };
  const flushList = () => { if (list) { wrap.append(list); list = null; listType = ''; } };
  for (const raw of lines) {
    const line = raw.trim();
    const ul = /^[-•]\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const t = ul ? 'ul' : 'ol';
      if (!list || listType !== t) { flushList(); list = h(t); listType = t; }
      list.append(h('li', inline((ul || ol)[1])));
    } else if (!line) { flushPara(); flushList(); }
    else if (/^#{1,4}\s/.test(line)) { flushPara(); flushList(); wrap.append(h('h3', inline(line.replace(/^#+\s/, '')))); }
    else { flushList(); para.push(line); }
  }
  flushPara(); flushList();
  return wrap;
}

export { icon };

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function shuffle(arr, seed) {
  const a = arr.slice();
  let s = seed ?? Math.floor(Math.random() * 1e9);
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch { /* unsupported */ } }
