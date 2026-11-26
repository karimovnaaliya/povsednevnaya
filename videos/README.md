# My Warm Box — видео для Reels

Анимации написаны на HTML/SVG/JS и рендерятся в MP4 1080×1920 (9:16, 30 fps).

- Предпросмотр: открыть `01-raspakovka/index.html` в браузере (`?t=7.5` — остановить на секунде 7.5).
- Рендер видео: `node videos/render.js videos/01-raspakovka/index.html out.mp4`
- Кадры-превью: `node videos/render.js videos/01-raspakovka/index.html --stills 1,4,8,12,15`

Нужны Node, Playwright (Chromium) и ffmpeg. Звук: `python3 videos/01-raspakovka/sound.py sound.wav`, затем `ffmpeg -i video.mp4 -i sound.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest out.mp4`.
