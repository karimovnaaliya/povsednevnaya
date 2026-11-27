import { h, icon, clear } from '../core/dom.js';
import { parseTajweed } from '../core/quran-normalize.js';
import { getAyah, gloss, TAJWEED, TAJWEED_ORDER, surahMeta, stripSurahWord } from '../core/quran.js';
import { state } from '../core/store.js';
import * as audio from '../core/audio.js';
import { sheet, audioButton, errorBox } from './components.js';

const toArabicDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

/** Render tajweed markup into spans. markIdx: index of colored segment to outline. */
export function tajweedNodes(markup, { markIdx = null, segOffset = 0 } = {}) {
  const frag = document.createDocumentFragment();
  let i = segOffset - 1;
  for (const s of parseTajweed(markup || '')) {
    if (s.r) {
      i++;
      const span = h(`span.tj-${s.r}`, { dataset: { r: s.r, seg: i } }, s.t);
      if (markIdx === i) span.classList.add('tj-mark');
      frag.append(span);
    } else frag.append(s.t);
  }
  return frag;
}

function countColored(markup) { return parseTajweed(markup || '').filter(s => s.r).length; }

/** Open sheet explaining one tajweed rule. */
export function ruleSheet(code) {
  const r = TAJWEED[code];
  if (!r) return;
  sheet(r.name, h('div.stack',
    h('div.row', h('span.tj-dot', { class: `tj-${code}`, style: { color: `var(--tj-${code})` } }), h('strong', { class: `tj-${code}` }, r.short)),
    h('p', r.md),
    h('a.btn.btn--ghost.btn--block', { href: '#/legend' }, 'Вся легенда цветов')));
}

export function legendList() {
  return h('div.legend', TAJWEED_ORDER.map(c => h('button', { type: 'button', onclick: () => ruleSheet(c) },
    h('span.tj-dot', { class: `tj-${c}` }),
    h('span', h('strong', { class: `tj-${c}` }, TAJWEED[c].name), h('span.small.muted', { style: { display: 'block' } }, TAJWEED[c].short)))));
}

/** Word sheet: big word, Russian meaning, transliteration, audio. */
export async function wordSheet(s, a, w, word) {
  const ru = await gloss(s, a, w);
  const ref = { kind: 'word', key: `${s}:${a}:${w}` };
  const rules = word.tj ? [...new Set(parseTajweed(word.tj).filter(x => x.r).map(x => x.r))] : [];
  sheet(`Слово ${w} · аят ${s}:${a}`, close => h('div.word-pop',
    h('div.word-pop__ar', { lang: 'ar' }, word.tj && state.settings.tajweed ? tajweedNodes(word.tj) : word.ar),
    word.tr ? h('div.tr', word.tr) : null,
    h('div.word-pop__ru', ru || 'Значение этого слова смотрите в переводе аята'),
    h('div.row', { style: { justifyContent: 'center' } }, audioButton(ref, { label: 'Послушать слово', title: 'Слово' })),
    rules.length && state.settings.tajweed ? h('div.stack', { style: { marginTop: 'var(--s4)', textAlign: 'start' } },
      h('p.small.muted', 'Правила таджвида в этом слове:'),
      ...rules.map(c => h('button.tile', { type: 'button', onclick: () => { close(); ruleSheet(c); } },
        h('span.tj-dot', { class: `tj-${c}` }),
        h('span.tile__body', h('span.tile__title', { class: `tj-${c}` }, TAJWEED[c].name), h('span.tile__sub', { style: { display: 'block' } }, TAJWEED[c].short)),
        h('span.tile__end', icon('chevron'))))) : null));
  audio.play(ref, { label: 'Слово' });
}

/**
 * Ayah view.
 * opts: {big, showNum, words:[n] (only these words), mark (segment idx), tools, hide:Set(word idx) , onWord}
 */
export function ayahView(key, opts = {}) {
  const box = h('div.ayah', { dataset: { key } }, h('div.skeleton', { style: { minHeight: '60px' } }));
  getAyah(key).then(({ ayah, s, a }) => {
    clear(box);
    const showTj = state.settings.tajweed;
    const arEl = h(`p.ayah__ar${opts.big ? '.ayah__ar--l' : ''}`, { lang: 'ar', dir: 'rtl' });
    const wordIdx = opts.words ? new Set(opts.words) : null;
    let seg = 0;
    ayah.words.forEach((wd, i) => {
      const n = i + 1;
      const cc = wd.tj ? countColored(wd.tj) : 0;
      if (wordIdx && !wordIdx.has(n)) { seg += cc; return; }
      const span = h('span.w', { dataset: { w: n }, role: 'button', tabindex: '0', 'aria-label': `Слово ${n}` },
        showTj && wd.tj ? tajweedNodes(wd.tj, { markIdx: opts.mark ?? null, segOffset: seg }) : wd.ar);
      seg += cc;
      if (opts.hide && opts.hide.has(n)) span.classList.add('is-hidden');
      const open = e => {
        const t = e.target.closest('[data-r]');
        if (opts.onWord) return opts.onWord(n, span, wd);
        if (t && showTj && e.altKey) return ruleSheet(t.dataset.r);
        wordSheet(s, a, n, wd);
      };
      span.addEventListener('click', open);
      span.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } });
      arEl.append(span, ' ');
    });
    if (!ayah.words.length) arEl.append(showTj ? tajweedNodes(ayah.tj, { markIdx: opts.mark ?? null }) : ayah.ar);
    if (opts.showNum !== false && !wordIdx) arEl.append(h('span.ayah__num', toArabicDigits(a)));
    box.append(arEl);
    if (state.settings.showTr && !opts.noTr) box.append(h('div.ayah__tr', ayah.tr));
    if (state.settings.showRu !== false && !opts.noRu) box.append(h('div.ayah__ru', wordIdx ? h('span.muted', `Аят ${key}: `, ayah.ru) : ayah.ru));
    if (opts.note) box.append(h('p.small.muted', opts.note));
    const tools = h('div.ayah__tools',
      audioButton(wordIdx && wordIdx.size === 1 ? { kind: 'word', key: `${key}:${opts.words[0]}` } : { kind: 'ayah', key }, { label: 'Слушать аят', title: `Аят ${key}`, repeat: opts.repeat }),
      wordIdx && wordIdx.size > 1 ? h('button.btn.btn--sm.btn--ghost', { onclick: () => audio.play(opts.words.map(w => ({ kind: 'word', key: `${key}:${w}` })), { label: `Слова ${key}`, gap: 250 }) }, icon('play'), 'Слова по очереди') : null,
      h('span.small.muted', { style: { marginInlineStart: 'auto' } }, `${s}:${a}`),
      ...(opts.tools || []));
    box.append(tools);
    if (showTj) {
      arEl.addEventListener('contextmenu', e => { const t = e.target.closest('[data-r]'); if (t) { e.preventDefault(); ruleSheet(t.dataset.r); } });
    }
    if (opts.onReady) opts.onReady({ ayah, box, arEl });
  }).catch(e => { clear(box); box.append(errorBox(e.message, () => box.replaceWith(ayahView(key, opts)))); });
  return box;
}

/** Hint line shown above tajweed text. */
export function tajweedHint() {
  if (!state.settings.tajweed) return null;
  return h('p.small.muted', 'Нажмите на слово, чтобы услышать его и увидеть перевод. Цвета таджвида объяснены в ', h('a', { href: '#/legend' }, 'легенде'), '.');
}

export async function surahTitle(n) {
  const m = await surahMeta(n);
  return { ru: m.ru, ar: stripSurahWord(m.ar), meaning: m.meaning, count: m.count, rev: m.rev };
}

export { toArabicDigits };
