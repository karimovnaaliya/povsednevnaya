// usage: node tests/shot.cjs <hash> [out.png] [width]
const { chromium } = require('playwright');
(async () => {
  const [hash = '#/home', out = '/tmp/claude-0/-home-user-povsednevnaya/0c5adf06-25bd-5ae6-aeb9-76c2d36264b2/scratchpad/shot.png', w = '390'] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: 844 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('http://localhost:8765/index.html' + hash);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: out, fullPage: true });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth ? `HSCROLL ${document.documentElement.scrollWidth}` : 'no hscroll');
  console.log(sw); console.log(errs.join('\n') || 'no console errors');
  await b.close();
})();
