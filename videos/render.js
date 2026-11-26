// Render an HTML animation (that exposes window.renderAt(t) and window.DURATION)
// into a 1080x1920 MP4 for Instagram Reels.
//
// Usage:
//   node videos/render.js videos/01-raspakovka/index.html out.mp4 [fps]
//   node videos/render.js videos/01-raspakovka/index.html --stills 1,4,8,12,15  (PNG previews)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [, , input, out = 'out.mp4', arg3] = process.argv;
  if (!input) { console.error('usage: node render.js <page.html> <out.mp4|--stills t1,t2> [fps]'); process.exit(1); }
  const url = 'file://' + path.resolve(input) + '?render=1';

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.load("700 40px 'Lora'");
    await document.fonts.load("500 40px 'Lora'");
    await document.fonts.load("700 40px 'Caveat'");
    await document.fonts.ready;
  });
  const clip = { x: 0, y: 0, width: 1080, height: 1920 };

  if (out === '--stills') {
    const times = (arg3 || '1,4,8,12,15').split(',').map(Number);
    const dir = path.dirname(path.resolve(input));
    for (const t of times) {
      await page.evaluate(t => window.renderAt(t), t);
      const file = path.join(dir, `still_${String(t).replace('.', '_')}.png`);
      await page.screenshot({ path: file, clip });
      console.log('wrote', file);
    }
    await browser.close();
    return;
  }

  const fps = Number(arg3) || 30;
  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * fps);

  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.renderAt(t), i / fps);
    const buf = await page.screenshot({ clip, type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`frame ${i}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done:', out);
})();
