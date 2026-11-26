# My Warm Box — видео для Reels

Анимации написаны на HTML/SVG/JS и рендерятся в MP4 1080×1920 (9:16, 30 fps).

- Предпросмотр: открыть `01-raspakovka/index.html` в браузере (`?t=7.5` — остановить на секунде 7.5).
- Рендер видео: `node videos/render.js videos/01-raspakovka/index.html out.mp4`
- Кадры-превью: `node videos/render.js videos/01-raspakovka/index.html --stills 1,4,8,12,15`

Нужны Node, Playwright (Chromium) и ffmpeg. Музыку добавлять в Instagram.
