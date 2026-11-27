import { h } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { todayKey } from '../core/time.js';
import { levels, checkBadges } from '../core/progress.js';
import { page, empty } from '../ui/components.js';
import { runQuiz } from '../ui/quiz.js';

const PASS = 0.7;

export default async function levelTest(n) {
  n = Number(n);
  const lv = (await levels()).find(l => l.level === n);
  if (!lv) return page('Тест', empty('Тест не найден.'));
  const host = h('div');
  const intro = h('div.card.stack',
    h('p', { style: { margin: 0 } }, `${lv.test.length} вопросов по всему уровню «${lv.title}». Чтобы сдать тест и открыть следующий уровень, нужно ${Math.round(PASS * 100)}% правильных ответов.`),
    h('button.btn.btn--primary.btn--lg.btn--block', { onclick: start }, 'Начать тест'));
  host.append(intro);
  function start() {
    runQuiz(host, lv.test, {
      title: `Тест уровня ${n}`,
      passMark: PASS,
      exitHref: '#/quran',
      exitLabel: 'К уровням',
      onFinish: r => {
        update(s => {
          const prev = s.levels[n] || {};
          s.levels[n] = { ...prev, score: Math.max(prev.score || 0, r.ratio), passed: prev.passed || r.passed, at: todayKey() };
          if (r.passed) s.levels[n + 1] = { ...(s.levels[n + 1] || {}), opened: true };
        }, 'level');
        checkBadges();
      },
    });
  }
  return page(`Тест уровня ${n}`, host);
}
