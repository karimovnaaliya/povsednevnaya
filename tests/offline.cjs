// Installs the SW, plays one ayah (gets cached), then goes offline and checks pages + cached audio.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html#/reader/112');
  await p.waitForFunction(() => navigator.serviceWorker.controller || new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', () => r(true))), null, { timeout: 30000 }).catch(() => {});
  await p.reload(); await p.waitForTimeout(3000);
  console.log('controlled:', await p.evaluate(() => !!navigator.serviceWorker.controller));
  await p.locator('.abtn').first().click();
  await p.waitForTimeout(5000);
  console.log('audio cached:', await p.evaluate(async () => (await (await caches.open('audio-v1')).keys()).map(r => r.url)));
  console.log('data cache files:', await p.evaluate(async () => { const n = await caches.keys(); let t = 0; for (const k of n) t += (await (await caches.open(k)).keys()).length; return n.join(',') + ' total ' + t; }));
  await ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(2000);
  for (const r of ['#/home', '#/quran', '#/lesson/cur-1-forms-1', '#/hifz/hifz-112', '#/duas', '#/namaz', '#/prayer-times', '#/calendar']) {
    await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1200);
    console.log('offline', r, await p.evaluate(() => (document.querySelector('.error-box') ? 'ERRORBOX ' + document.querySelector('.error-box').textContent.slice(0, 80) : 'ok ' + ((document.querySelector('.topbar__title, h1') || {}).textContent || ''))));
  }
  await p.evaluate(() => { location.hash = '#/reader/112'; }); await p.waitForTimeout(1500);
  await p.locator('.abtn').first().click();
  let st = '';
  for (let i = 0; i < 30 && st !== 'playing'; i++) { await p.waitForTimeout(250); st = await p.evaluate(async () => (await import('./js/core/audio.js')).status.state); }
  console.log('offline cached ayah audio:', st);
  console.log(errs.length ? 'ERRORS ' + errs.join('|') : 'no page errors');
  await b.close();
})();
