import { h, icon, clear, md, rich, shuffle } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { loadJSON } from '../core/content.js';
import { page, empty, gradeBadge, audioButton, toast, celebrate, seg, sourcesBlock } from '../ui/components.js';
import { ayahView } from '../ui/arabic.js';
import { runQuiz } from '../ui/quiz.js';
import { checkBadges } from '../core/progress.js';

function quranRefs(q) {
  // "2:201" or "2:285-286" or "14:40-41"
  const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(String(q).trim());
  if (!m) return [];
  const out = [];
  for (let a = +m[2]; a <= +(m[3] || m[2]); a++) out.push(`${m[1]}:${a}`);
  return out;
}

export default async function dua(id) {
  const { duas, categories } = await loadJSON('data/duas/duas.json');
  const d = duas.find(x => x.id === id);
  if (!d) return page('Дуа', empty('Дуа не найдено.'));
  const cat = categories.find(c => c.id === d.category);
  const isLearned = () => !!(state.duas[id] && state.duas[id].learned);
  const qrefs = d.quran ? quranRefs(d.quran) : [];

  const learnBtn = h('button.btn.btn--lg.btn--block', { type: 'button' });
  const paintLearn = () => { learnBtn.className = `btn btn--lg btn--block ${isLearned() ? 'btn--ghost' : 'btn--primary'}`; learnBtn.replaceChildren(icon('check'), isLearned() ? 'Выучено ✓ (нажмите, чтобы снять)' : 'Выучено'); };
  learnBtn.addEventListener('click', () => {
    const v = !isLearned();
    update(s => { s.duas[id] = { learned: v, at: todayKey() }; }, 'duas');
    paintLearn();
    if (v) { celebrate(); toast('Ма ша Аллах! Дуа отмечено как выученное'); checkBadges(); }
  });
  paintLearn();

  // memorization practice: progressive word hiding + word-order exercise
  const words = d.ar.split(/\s+/).filter(Boolean);
  let level = 0;
  const practiceText = h('p.ar', { lang: 'ar', style: { fontSize: 'var(--fs-ar)', textAlign: 'center' } });
  const paintPractice = () => {
    clear(practiceText);
    const order = shuffle(words.map((_, i) => i), 31 * words.length);
    const hidden = new Set(order.slice(0, Math.round(words.length * level / 4)));
    words.forEach((w, i) => {
      const sp = h('span.w', { role: 'button', tabindex: '0' }, w);
      if (hidden.has(i)) sp.classList.add('is-hidden');
      sp.addEventListener('click', () => sp.classList.toggle('is-hidden'));
      practiceText.append(sp, ' ');
    });
  };
  paintPractice();
  const orderHost = h('div');
  const startOrder = () => {
    const chunk = words.length > 8 ? words.slice(0, 8) : words;
    runQuiz(orderHost, [{ id: `q-gen-dua-order-${id}`, type: 'order', prompt: words.length > 8 ? 'Расставьте первые слова дуа по порядку' : 'Расставьте слова дуа по порядку', items: chunk, explain: `${d.tr} — ${d.ru}` }], { title: 'Порядок слов' });
  };

  const counter = d.count > 1 ? (() => {
    let n = 0;
    const out = h('button.btn.btn--gold.btn--lg.btn--block', { type: 'button' }, `Счётчик: 0 / ${d.count}`);
    out.addEventListener('click', () => { n++; out.textContent = n >= d.count ? `Готово: ${d.count} / ${d.count} ✓` : `Счётчик: ${n} / ${d.count}`; if (n === d.count) { try { navigator.vibrate && navigator.vibrate(80); } catch { /* */ } } });
    return out;
  })() : null;

  return page(d.title, h('div.stack',
    h('div.row.row--wrap', cat ? h('a.badge', { href: `#/duas/${cat.id}` }, cat.title) : null, gradeBadge(d.grade), d.count > 1 ? h('span.badge', `${d.count} раз`) : null),
    qrefs.length ? h('div.card', h('div.card__eyebrow', 'Из Корана'), ...qrefs.map(k => ayahView(k, { big: true })))
      : h('div.arblock',
        h('div.arblock__ar.arblock__ar--l', { lang: 'ar', dir: 'rtl' }, d.ar),
        state.settings.showTr ? h('div.arblock__tr', d.tr) : null,
        h('div.arblock__ru', rich(d.ru)),
        d.audio ? h('div.arblock__foot', audioButton(d.audio, { label: 'Послушать' })) : null),
    qrefs.length && state.settings.showTr ? null : null,
    h('section.card.card--soft', h('div.card__eyebrow', 'Когда читать'), h('p', { style: { margin: 0 } }, rich(d.when))),
    d.virtue ? h('section.card.card--soft', h('div.card__eyebrow', 'Достоинство'), md(d.virtue)) : null,
    counter,
    learnBtn,
    h('details.card',
      h('summary', { style: { fontWeight: 800, minHeight: '44px', cursor: 'pointer' } }, 'Практика заучивания'),
      h('p.small.muted', 'Скройте часть слов и прочитайте по памяти. Нажмите на скрытое слово, чтобы подсмотреть.'),
      seg([0, 1, 2, 3, 4].map(v => ({ value: v, label: v === 4 ? 'Всё' : `${v * 25}%` })), level, v => { level = v; paintPractice(); }),
      practiceText,
      words.length >= 3 ? h('div', orderHost, h('button.btn.btn--ghost.btn--block', { onclick: e => { e.target.remove(); startOrder(); } }, 'Упражнение: порядок слов')) : null),
    h('section.card.card--soft', h('div.card__eyebrow', 'Источник'),
      h('p', { style: { margin: 0 } }, d.url ? h('a', { href: d.url, target: '_blank', rel: 'noopener' }, d.source) : d.source),
      d.gradeNote ? h('p.small.muted', { style: { margin: '4px 0 0' } }, d.gradeNote) : null),
    d.grade === 'daif' ? h('p.callout.callout--note', 'Хадис этого дуа слабый (даиф). Читать его как общую мольбу можно, но не стоит приписывать ему особые достоинства.') : null));
}

export { sourcesBlock };
