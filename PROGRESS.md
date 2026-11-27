# PROGRESS — «Путь к Корану»

После любого перерыва сначала прочитать этот файл и продолжить с первой незакрытой задачи.
Исходный запрос: `docs/PROMPT.md`. Схема контента: `CONTENT_SCHEMA.md`. Дизайн: `DESIGN.md`.
Бриф для агентов: `docs/AGENT_BRIEF.md`. Проверка контента: `node tools/validate.mjs`.
Данные Корана: `NODE_USE_ENV_PROXY=1 node tools/fetch-quran.mjs 1 2 18 36 55 56 67 78-114`.

Статусы: [ ] не начато · [~] в работе · [x] готово и проверено

## Фаза 1: фундамент (ведущий)
- [x] Структура проекта, сетевой доступ к API (окружение `povsednevnaya`)
- [x] Схема контента `CONTENT_SCHEMA.md` + валидатор `tools/validate.mjs` + поиск примеров `tools/find-tajweed.mjs`
- [x] Данные Корана: 45 сур в `data/quran/`, метаданные 114 сур `data/quran/surahs.json`
- [x] CSS-токены и компоненты (`css/`), темы светлая, тёмная и сепия. [ ] Ещё нужно: `DESIGN.md`
- [x] Ядро: `js/core/` (store, time, content, audio, quran, srs, session, prayer, progress), `js/main.js` (роутер)
- [x] UI: `js/ui/` (components, arabic, quiz (9 типов), dnd, lesson, icons)
- [x] PWA: `index.html`, `manifest.webmanifest`, `sw.js`, иконки. [ ] Ещё нужно: `tools/build-precache.mjs` → `precache.json` + версия в sw.js
- [x] Звуки букв: `assets/audio/letters/` (GCompris, GPL; указать в «О приложении»)

## Фаза 2: контент (агенты; при перерыве продолжить через SendMessage или новым агентом)
- [x] AUDIO.md + `data/misc/reciters.json`
- [x] Уровни 1–3 (`data/curriculum/level-1..3.json`): 26 уроков, 266 вопросов
- [~] Уровни 4–6: файлы есть, агент остановился по лимиту. Проверить полноту (по 7–12 уроков, тест 15–25)
- [x] Хифз: `data/hifz/surahs.json` (45 сур), `data/misc/ayah-of-day.json` (175 ключей)
- [x] Пословный перевод: `data/quran/wbw-ru/` (1, 36, 55, 56, 67, 78–114, 2:255 и 284–286, 18:1–10)
- [~] Намаз: есть why, taharat, women, prayers и 18 SVG. Не хватает: `how-to-pray.json`, `rulings.json`
- [~] Дуа: `duas.json` (62 дуа, цель 90–130). Не хватает: `adhkar.json`, `data/misc/habits.json`
- [x] Акида (14 тем, 104 вопроса) + `data/misc/names99.json`
- [x] История (21 тема, 146 вопросов)
- [~] Сунна, столпы, ахляк: есть sunnah, pillars, akhlaq, islamic-days, prayer-config. Не хватает: `data/islam/calendar.json`, проверить `docs/PRAYER_TIMES.md`

## Фаза 2b: страницы (`js/pages/`)
Готовы: home, focus, calendar, special, prayer-tracker, journal, quran, level, level-test, lesson, legend, not-found.
Осталось написать: hifz, hifz-surah, reader-list, reader, namaz, prayer-times, qibla, duas, dua-category, dua,
adhkar-list, adhkar, tasbih, names, islam, islam-section, revision, goals, settings, more, habits, ramadan, about.
Позже: special.js должен брать источники из `data/namaz/women.json` (сейчас ссылки не проверены).

## Фаза 3: проверка
- [ ] Ревизия контента агентов (точность, ханафитский фикх, язык). Многие русские сайты были недоступны: хадисы сверены по зеркалу fawazahmed0/hadith-api
- [ ] Playwright: 375px, 414px и десктоп, все кнопки, аудио, все типы тестов, касания, календарь, бэкап, офлайн (`tests/shot.cjs` для скриншотов; сервер `python3 -m http.server 8765`)
- [ ] Нет ошибок в консоли, нет битых ссылок, нет английского текста в интерфейсе
- [ ] `DEPLOY.md`: инструкция по публикации на русском
