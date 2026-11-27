// Fake calendar data, streak logic, backup export + import, dark theme screenshot.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/claude-0/-home-user-povsednevnaya/0c5adf06-25bd-5ae6-aeb9-76c2d36264b2/scratchpad/';
const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // build fake state: 20 days ago start; pattern done, partial, missed, special
  const days = {}; const now = new Date();
  for (let i = 1; i <= 20; i++) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const k = key(d);
    if (i <= 3) days[k] = { sec: 1500 };            // done x3 (yesterday..3 days ago)
    else if (i <= 5) days[k] = { sec: 0, special: true }; // special x2 (should not break streak)
    else if (i <= 7) days[k] = { sec: 1300 };       // done x2 -> streak 5
    else if (i === 8) days[k] = { sec: 300 };        // partial -> breaks
    else if (i === 9) { /* missed */ }
    else days[k] = { sec: 1250, quiz: { c: 7, t: 10 } };
  }
  days[key(new Date(now.getTime() - 86400000 * 2))].journal = { learned: 'Икляб', hard: 'буква ع', dua: 'Аллах, облегчи' };
  const created = key(new Date(now.getTime() - 86400000 * 20));
  const state = { v: 1, created, settings: { theme: 'light', dailyGoal: 20 }, days, lessons: {}, levels: {}, hifz: {}, duas: {}, names: {}, quiz: {}, qada: { fajr: 2 }, ramadan: {}, badges: {}, adhkar: {}, last: {} };
  await p.goto('http://localhost:8765/manifest.webmanifest');
  await p.evaluate(s => localStorage.setItem('quran-path-v1', JSON.stringify(s)), state);
  await p.goto('http://localhost:8765/index.html#/calendar'); await p.waitForTimeout(1500);
  const stats = await p.$$eval('.stat', els => els.map(e => e.innerText.replace(/\n/g, ' ')));
  console.log('stats:', stats.join(' | '));
  const cls = await p.$$eval('.cal__day', els => els.map(e => e.className.replace('cal__day ', '').replace('cal__day--', '')).join(','));
  console.log('has done/partial/missed/special:', ['done', 'partial', 'missed', 'special'].map(c => cls.includes(c)));
  await p.screenshot({ path: OUT + 'cal.png', fullPage: false });
  // tap a day -> sheet
  await p.locator('.cal__day--special').first().click(); await p.waitForTimeout(400);
  console.log('day sheet:', await p.locator('.sheet h2').textContent());
  await p.keyboard.press('Escape');
  // export
  await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(1200);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'Сохранить копию в файл' }).click()]);
  const file = OUT + 'backup.json'; await dl.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('export ok:', exported.app === 'quran-path' && Object.keys(exported.state.days).length);
  // wipe and import
  await p.goto('http://localhost:8765/manifest.webmanifest'); await p.evaluate(() => localStorage.clear());
  await p.goto('http://localhost:8765/index.html#/settings'); await p.waitForTimeout(1500);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.locator('button', { hasText: 'Восстановить из файла' }).click()]);
  await fc.setFiles(file); await p.waitForTimeout(500);
  await p.locator('.sheet .btn--primary', { hasText: 'Восстановить' }).click(); await p.waitForTimeout(800);
  const restored = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('quran-path-v1')).days).length);
  console.log('import restored days:', restored);
  // dark theme screenshots
  await p.goto('http://localhost:8765/manifest.webmanifest');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('quran-path-v1')); s.settings.theme = 'dark'; localStorage.setItem('quran-path-v1', JSON.stringify(s)); });
  for (const [r, n] of [['#/home', 'dark-home'], ['#/hifz/hifz-112', 'dark-hifz'], ['#/calendar', 'dark-cal']]) {
    await p.goto('http://localhost:8765/index.html' + r); await p.waitForTimeout(1800);
    await p.screenshot({ path: OUT + n + '.png' });
  }
  console.log(errs.length ? 'ERRORS ' + errs.join('|') : 'no page errors');
  await b.close();
})();
