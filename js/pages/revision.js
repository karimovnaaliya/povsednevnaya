import { h, icon, clear, shuffle } from '../core/dom.js';
import { state } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { getLessonIndex, loadJSON } from '../core/content.js';
import { levels } from '../core/progress.js';
import { page, tile, sectionTitle, empty } from '../ui/components.js';
import { runQuiz, tajweedQuestionsFor, TYPE_LABEL } from '../ui/quiz.js';

const SECTION_NAME = { curriculum: 'Коран', namaz: 'Намаз', islam: 'Основы ислама' };

/** All questions with metadata: {q, kind, lessonId, studied} */
export async function questionBank() {
  const idx = await getLessonIndex();
  const out = [];
  const push = (q, kind, lessonId, studied) => { if (q && q.id) out.push({ q, kind, lessonId, studied }); };
  for (const [id, { lesson, kind }] of idx) {
    const studied = !!(state.lessons[id] && state.lessons[id].done);
    for (const q of lesson.quiz || []) push(q, kind, id, studied);
    for (const b of lesson.blocks || []) if (b.type === 'practice') for (const q of b.questions) push(q, kind, id, studied);
  }
  for (const lv of await levels()) {
    const studied = !!(state.levels[lv.level] && (state.levels[lv.level].passed || state.levels[lv.level].score));
    for (const q of lv.test) push(q, 'curriculum', `level-${lv.level}`, studied);
  }
  return out;
}

export default async function revision() {
  const bank = await questionBank();
  const seen = bank.filter(x => state.quiz[x.q.id]);
  const studied = bank.filter(x => x.studied || state.quiz[x.q.id]);
  const due = seen.filter(x => { const s = state.quiz[x.q.id].srs; return s && s.due <= todayKey(); });
  const mistakes = seen.filter(x => state.quiz[x.q.id].w > 0 && (state.quiz[x.q.id].srs || {}).n < 2);
  const host = h('div');
  const run = (qs, title) => { clear(host); host.scrollIntoView({ behavior: 'smooth' }); runQuiz(host, qs, { title, exitHref: '#/revision', exitLabel: 'К повторению' }); };

  const smart = async () => {
    const dueQs = due.sort((a, b) => (state.quiz[b.q.id].w - state.quiz[b.q.id].c) - (state.quiz[a.q.id].w - state.quiz[a.q.id].c)).map(x => x.q);
    const fresh = shuffle(studied.filter(x => !state.quiz[x.q.id])).map(x => x.q);
    let qs = [...dueQs.slice(0, 8), ...fresh].slice(0, 12);
    // tajweed-color questions from surahs she is memorizing (or Al-Fatiha by default)
    try {
      const { surahs } = await loadJSON('data/hifz/surahs.json');
      const mine = surahs.filter(s => state.hifz[s.id] && state.hifz[s.id].status !== 'new');
      const src = shuffle(mine.length ? mine : surahs.slice(0, 3))[0];
      const a = src.range ? src.range.from + Math.floor(Math.random() * (src.range.to - src.range.from + 1)) : 1 + Math.floor(Math.random() * src.ayahs);
      qs = [...qs, ...(await tajweedQuestionsFor(`${src.surah}:${a}`, 2))];
    } catch { /* offline: skip generated */ }
    if (qs.length < 5) qs = [...qs, ...shuffle(bank.filter(x => x.kind === 'curriculum' && x.lessonId.startsWith('cur-1')).map(x => x.q))].slice(0, 10);
    run(shuffle(qs), 'Умное повторение');
  };

  const byType = h('div.chips', Object.keys(TYPE_LABEL).map(t => {
    const pool = (studied.length ? studied : bank).filter(x => x.q.type === t);
    return pool.length ? h('button.chip', { type: 'button', onclick: () => run(shuffle(pool).slice(0, 10).map(x => x.q), TYPE_LABEL[t]) }, `${TYPE_LABEL[t]} (${pool.length})`) : null;
  }));

  return page('Повторение и тесты', h('div',
    h('section.card.card--primary',
      h('div.card__eyebrow', 'Сегодня'),
      h('p', { style: { margin: '0 0 12px' } }, due.length ? `К повторению: ${due.length} вопросов. Ошибки возвращаются чаще, пока не закрепятся.` : 'Ошибок к повторению нет. Повторим пройденное и добавим вопросы по таджвиду.'),
      h('button.btn.btn--gold.btn--lg.btn--block', { onclick: smart }, icon('refresh'), 'Начать повторение')),
    host,
    h('div.stack', { style: { marginTop: 'var(--s4)' } },
      mistakes.length ? tile({ onclick: () => run(shuffle(mistakes).slice(0, 12).map(x => x.q), 'Работа над ошибками'), iconName: 'x', title: 'Работа над ошибками', sub: `${mistakes.length} вопросов, где были ошибки` }) : null,
      tile({ onclick: async () => {
        const qs = [];
        for (const k of shuffle(['1:2', '1:4', '1:7', '112:1', '112:3', '113:2', '113:4', '114:4', '114:5', '108:1', '103:3', '2:255']).slice(0, 5)) { try { qs.push(...await tajweedQuestionsFor(k, 2)); } catch { /* skip */ } }
        if (qs.length) run(shuffle(qs).slice(0, 10), 'Цвета таджвида');
      }, iconName: 'palette', gold: true, title: 'Определи правило по цвету', sub: 'Вопросы из настоящих аятов' })),
    sectionTitle('По разделам'),
    h('div.stack', Object.entries(SECTION_NAME).map(([k, name]) => {
      const pool = bank.filter(x => x.kind === k && (x.studied || state.quiz[x.q.id]));
      const all = bank.filter(x => x.kind === k);
      return tile({ onclick: () => run(shuffle(pool.length >= 5 ? pool : all).slice(0, 12).map(x => x.q), name), iconName: k === 'curriculum' ? 'book' : k === 'namaz' ? 'mosque' : 'layers', title: name, sub: pool.length >= 5 ? `${pool.length} вопросов из пройденного` : `${all.length} вопросов (пока из всего раздела)` });
    })),
    sectionTitle('По типу задания'),
    byType,
    !bank.length ? empty('Вопросы загружаются…') : null,
    h('p.small.muted', { style: { marginTop: 'var(--s4)' } }, `Всего в приложении ${bank.length} вопросов. Отвечено хотя бы раз: ${seen.length}.`)));
}
