// Exercises every quiz type with touch input + audio playback. usage: node tests/interact.cjs
const { chromium, devices } = require('playwright');
const SHOTS = '/tmp/claude-0/-home-user-povsednevnaya/0c5adf06-25bd-5ae6-aeb9-76c2d36264b2/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:8765/index.html#/more');
  await p.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(p);
  const center = async loc => { const bb = await loc.boundingBox(); return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }; };
  async function touchDrag(from, to, steps = 12) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps }] });
      await p.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(150);
  }
  const results = {};
  const run = async (q) => {
    await p.evaluate(async q => {
      const { runQuiz } = await import('./js/ui/quiz.js');
      const main = document.querySelector('main');
      main.innerHTML = '<div id="qh"></div>';
      window.__res = null;
      runQuiz(document.getElementById('qh'), [q], { onFinish: r => { window.__res = r; } });
    }, q);
    await p.waitForTimeout(500);
  };
  const next = async () => { await p.locator('.quiz__actions .btn').last().click(); await p.waitForTimeout(300); return p.evaluate(() => window.__res && window.__res.correct); };
  const check = async () => { await p.locator('.quiz__actions .btn', { hasText: 'Проверить' }).tap(); await p.waitForTimeout(300); };

  // mcq
  await run({ id: 't1', type: 'mcq', prompt: 'Сколько?', options: ['один', 'два', 'три'], answer: 1, explain: 'два' });
  await p.locator('.opt', { hasText: 'два' }).tap(); results.mcq = await next();
  // truefalse
  await run({ id: 't2', type: 'truefalse', prompt: 'Верно?', answer: true, explain: 'x' });
  await p.locator('.opt', { hasText: 'Верно' }).first().tap(); results.truefalse = await next();
  // fill
  await run({ id: 't3', type: 'fill', prompt: 'Пропуск', promptAr: 'قُلْ ___ ٱللَّهُ', options: ['هُوَ', 'مِن'], answer: 0, explain: 'x' });
  await p.locator('.opt', { hasText: 'هُوَ' }).tap(); results.fill = await next();
  // tajweed (key-based)
  await run({ id: 't4', type: 'tajweed', key: '112:1', segment: 1, prompt: 'Правило?', options: ['Калькаля', 'Гунна'], answer: 0, explain: 'x' });
  await p.waitForTimeout(600);
  results.tajweedMarked = await p.locator('.tj-mark').count();
  await p.locator('.opt', { hasText: 'Калькаля' }).tap(); results.tajweed = await next();
  // match
  const pairs = [['ب', 'Ба'], ['ت', 'Та'], ['ث', 'Са']];
  await run({ id: 't5', type: 'match', prompt: 'Пары', pairs, explain: 'x' });
  for (const [l, r] of pairs) { await p.locator('.match__col').first().locator('.opt', { hasText: l }).tap(); await p.locator('.match__col').last().locator('.opt', { hasText: r }).tap(); await p.waitForTimeout(100); }
  results.match = await next();
  // connect via touch drag
  await run({ id: 't6', type: 'connect', prompt: 'Линии', pairs: [['قُلْ', 'скажи'], ['أَحَدٌ', 'Единый'], ['ٱللَّهُ', 'Аллах']], explain: 'x' });
  for (const [l, r] of [['قُلْ', 'скажи'], ['أَحَدٌ', 'Единый'], ['ٱللَّهُ', 'Аллах']]) {
    await touchDrag(await center(p.locator('.connect__col--l .connect__item', { hasText: l })), await center(p.locator('.connect__col--r .connect__item', { hasText: r })));
  }
  results.connectLines = await p.locator('.connect__lines line').count();
  await p.screenshot({ path: SHOTS + 'connect.png' });
  await check(); results.connect = await next();
  // order via touch drag: sort to correct order by dragging
  await run({ id: 't7', type: 'order', prompt: 'Порядок', items: ['первый', 'второй', 'третий', 'четвёртый'], explain: 'x' });
  for (let target = 0; target < 4; target++) {
    const want = ['первый', 'второй', 'третий', 'четвёртый'][target];
    const rows = p.locator('.ditem');
    const texts = await rows.allTextContents();
    const cur = texts.findIndex(t => t.includes(want));
    if (cur !== target) await touchDrag(await center(rows.nth(cur).locator('.ditem__handle')), { ...(await center(rows.nth(target))), y: (await center(rows.nth(target))).y - 12 });
  }
  results.orderNow = (await p.locator('.ditem__text').allTextContents()).join(',');
  await p.screenshot({ path: SHOTS + 'order.png' });
  await check(); results.order = await next();
  // sort into buckets via touch drag
  await run({ id: 't8', type: 'sort', prompt: 'Группы', buckets: ['Гласные', 'Согласные'], items: [{ text: 'фатха', bucket: 0 }, { text: 'кясра', bucket: 0 }, { text: 'ба', bucket: 1 }], explain: 'x' });
  for (const [t, bi] of [['фатха', 0], ['кясра', 0], ['ба', 1]]) await touchDrag(await center(p.locator('.pool .ditem', { hasText: t })), await center(p.locator('.bucket').nth(bi)));
  await p.screenshot({ path: SHOTS + 'sort.png' });
  await check(); results.sort = await next();
  // listen + real audio
  await run({ id: 't9', type: 'listen', prompt: 'Слушай', audio: { kind: 'word', key: '112:1:1' }, options: ['قُلْ', 'هُوَ'], answer: 0, explain: 'x' });
  await p.locator('.abtn').first().tap();
  let st = '';
  for (let i = 0; i < 40 && st !== 'playing'; i++) { await p.waitForTimeout(250); st = await p.evaluate(async () => (await import('./js/core/audio.js')).status.state); }
  results.wordAudio = st;
  await p.locator('.opt', { hasText: 'قُلْ' }).tap(); results.listen = await next();
  // ayah audio via reader page
  await p.evaluate(() => { location.hash = '#/reader/112'; }); await p.waitForTimeout(1500);
  await p.locator('.abtn').first().tap();
  st = '';
  for (let i = 0; i < 60 && st !== 'playing'; i++) { await p.waitForTimeout(250); st = await p.evaluate(async () => (await import('./js/core/audio.js')).status.state); }
  results.ayahAudio = st;
  results.player = await p.locator('.player').count();
  await p.evaluate(async () => (await import('./js/core/audio.js')).stop());
  console.log(JSON.stringify(results, null, 1));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await b.close();
})();
