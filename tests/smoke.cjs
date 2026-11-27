// Visits every route; reports console errors, page errors, horizontal overflow. usage: node tests/smoke.cjs [width]
const { chromium } = require('playwright');
const ROUTES = ['#/home', '#/focus', '#/calendar', '#/quran', '#/quran/level/1', '#/test/1', '#/lesson/__FIRST__', '#/legend', '#/hifz', '#/hifz/hifz-1', '#/hifz/hifz-2-255',
  '#/reader', '#/reader/1', '#/reader/112', '#/namaz', '#/prayer-times', '#/prayers', '#/qibla', '#/duas', '#/duas/food', '#/dua/__DUA__', '#/adhkar', '#/tasbih',
  '#/names', '#/islam', '#/islam/isl-aqida', '#/islam/isl-history', '#/revision', '#/goals', '#/settings', '#/more', '#/journal', '#/habits', '#/ramadan', '#/special', '#/about', '#/nope'];
(async () => {
  const w = +(process.argv[2] || 375);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  let errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('http://localhost:8765/index.html#/home');
  await p.waitForTimeout(1500);
  const first = await p.evaluate(async () => (await (await fetch('data/curriculum/level-1.json')).json()).lessons[0].id);
  const dua = await p.evaluate(async () => (await (await fetch('data/duas/duas.json')).json()).duas[0].id);
  let bad = 0;
  for (let r of ROUTES) {
    r = r.replace('__FIRST__', first).replace('__DUA__', dua);
    errs = [];
    await p.evaluate(h => { location.hash = h; }, r);
    await p.waitForTimeout(1300);
    const info = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, title: (document.querySelector('.topbar__title, h1') || {}).textContent || '', err: !!document.querySelector('.error-box') }));
    const real = errs.filter(e => !/404 \(File not found\)/.test(e) || true);
    const flag = (info.sw > w ? ` HSCROLL(${info.sw})` : '') + (info.err ? ' ERRORBOX' : '') + (real.length ? ' ERR: ' + real.join(' | ').slice(0, 300) : '');
    if (flag) bad++;
    console.log(`${r.padEnd(34)} ${info.title.slice(0, 30)}${flag}`);
  }
  console.log(bad ? `${bad} routes with problems` : 'ALL OK');
  await b.close();
})();
