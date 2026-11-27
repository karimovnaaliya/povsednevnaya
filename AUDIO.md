# AUDIO.md — исследование источников аудио Корана

Дата проверки: **2026-11-26**. Все URL ниже проверены `curl` из облачного контейнера:
статус, `Content-Type`, `Access-Control-Allow-Origin` (запрос с заголовком `Origin`),
поддержка `Range: bytes=0-100` (ответ должен быть **206** — без этого Safari на iPhone
не играет `<audio>`), время ответа. Машиночитаемая конфигурация — `data/misc/reciters.json`
(все 54 шаблонных URL оттуда проверены: 206 + `audio/mpeg`).

## 1. Кандидаты

| Источник | Что есть | HTTPS | CORS (ACAO) | Range 206 | Тип | Задержка (TTFB / 830 КБ) | Лицензия / условия |
|---|---|---|---|---|---|---|---|
| **EveryAyah.com** `everyayah.com/data/<Папка>/SSSAAA.mp3` | по-аятно, ~80 папок чтецов, вкл. учебные (Husary_Muallim, Minshawy_Teacher, Ayman_Sowaid) | да (BunnyCDN, HTTP/2) | `*` (+ Range в allow-headers) | да | audio/mpeg | ~0.4 с / ~1.0 с | Явных условий не нашёл; файлы широко используются (Quran.com, AlQuran Cloud берут оттуда). Бесплатно, некоммерческое использование, указывать источник. |
| **Quran.com (verses.quran.com)** `verses.quran.com/<Путь>/mp3/SSSAAA.mp3` | по-аятно, ~12 чтецов (Alafasy, AbdulBaset, Minshawi, Sudais…). **Хусари нет** (API отдаёт для него `mirrors.quranicaudio.com/everyayah/...`) | да (BunnyCDN) | `*` | да | audio/mpeg | ~0.15 с / ~0.3 с (самый быстрый) | Quran Foundation Developer Terms: аудио с их хостов = «QF Content», бесплатное использование с указанием источника; права на конкретные записи зависят от чтеца. |
| **Quran.com API v4** `api.quran.com/api/v4/recitations/{id}/by_ayah/{key}` | метаданные: id чтецов (7 Alafasy, 6 Husary, 12 Husary Muallim, 2 AbdulBaset Murattal, 9 Minshawi Murattal, 8 Minshawi Mujawwad) и относительные пути | да | — | — | JSON | ~0.3 с | то же. Для статического приложения API не нужен — пути стабильны. |
| **Quran.com word-by-word** `audio.qurancdn.com/wbw/SSS_AAA_WWW.mp3` (зеркало `verses.quran.com/wbw/...`) | **пословное аудио**, весь Коран, голос Аль-Афаси | да (BunnyCDN) | `*` | да | audio/mpeg | ~0.15–0.2 с | QF Content, как выше. |
| **AlQuran Cloud / Islamic Network** `cdn.islamic.network/quran/audio/{bitrate}/{edition}/{global}.mp3` | по-аятно, нумерация **сквозная 1..6236**; ~25 по-аятных редакций | да | **НЕТ** заголовка ACAO | да | audio/mpeg | ~0.2 с / ~0.3 с | alquran.cloud/terms-and-conditions; бесплатно, просят кешировать агрессивно, указывать reciter + cdn.islamic.network. Файлы — те же, что на EveryAyah (размеры байт-в-байт совпадают). |
| **QUL (Tarteel)** qul.tarteel.ai | датасеты (тексты, сегменты слов, таймкоды), аудио ссылается на те же CDN Quran.com | — | — | — | — | — | Сайт недоступен из контейнера; лицензия аудио не указана. Отдельного аудиохостинга не даёт → не используем. |
| quranicaudio.com / mirrors.quranicaudio.com / download.quranicaudio.com | по-сурно (QDC), зеркало everyayah | ? | ? | ? | ? | ? | Не проверено (хост закрыт прокси контейнера). Только как идея на будущее. |
| words.audios.quranwbw.com | пословное аудио QuranWBW | ? | ? | ? | ? | ? | Не проверено (хост закрыт). Кандидат в независимый резерв для слов. |
| **GCompris (KDE)** `raw.githubusercontent.com/KDE/gcompris-data/master/voices/ar/alphabet/U{код}.ogg` | 28 арабских букв (голос) | да | `*` | да | audio/ogg (Vorbis) | ~0.25 с | **GPL**, автор записей Makni Bassem (README в папке). |

Битрейты cdn.islamic.network (важно — не у всех редакций есть все битрейты, отсутствующий отдаёт **403 application/xml**):

| edition | 192 | 128 | 64 |
|---|---|---|---|
| ar.alafasy | 403 | ✅ | ✅ |
| ar.husary | 403 | ✅ | ✅ |
| ar.abdulbasitmurattal | ✅ | 403 | ✅ |
| ar.minshawi | 403 | ✅ | 403 |
| ar.aymanswoaid | 403 | 403 | ✅ |
| ar.husarymujawwad | 403 | ✅ | ✅ |
| ar.minshawimujawwad | 403 | 403 | ✅ (подозрительно: размер = файлу ar.minshawi — не использовать) |

Сквозной номер аята (`{global}`) проверен через API: 1:1 → 1, 2:255 → 262, 36:1 → 3706, 114:6 → 6236.
Формула: `global = (сумма числа аятов всех сур до текущей) + номер аята`. Количество аятов по сурам — из данных Корана в `data/quran`.

## 2. Выбор

| Назначение | ОСНОВНОЙ | РЕЗЕРВ | Резерв 2 |
|---|---|---|---|
| Аят (по-аятно) | **EveryAyah** — один шаблон для всех чтецов, включая учебные; ACAO `*` → можно кешировать в SW | **verses.quran.com** (Alafasy, Абдуль-Басит, Миншави) или EveryAyah 64 kbps (Хусари) / cdn.islamic.network (Сувейд) | **cdn.islamic.network** (другой провайдер, но без CORS → только онлайн-воспроизведение, без кеша SW) |
| Слово (по-словно) | **audio.qurancdn.com/wbw** | **verses.quran.com/wbw** (тот же владелец, другой хост/пул CDN — частичная независимость) | нет проверенного независимого; в крайнем случае — проиграть весь аят |
| Буквы / харакаты | **GCompris (GPL)** — перекодировать OGG → MP3 и хранить в репозитории (`assets/audio/letters/`), не хотлинкать | Пословное аудио Корана: слово, начинающееся с буквы (с нужной харакатой) | — |

Почему EveryAyah основной, а не verses.quran.com (хотя verses быстрее): у verses нет Хусари и учебных записей, а для выпадающего списка чтецов нужен единый шаблон. Для Аль-Афаси (чтец по умолчанию) можно поменять местами main/backup — файлы идентичны.

## 3. Шаблоны URL

Плейсхолдеры: `{sss}` — сура (3 цифры), `{aaa}` — аят (3 цифры), `{www}` — позиция слова (3 цифры), `{global}` — 1..6236.

```
Аят:   https://everyayah.com/data/{FOLDER}/{sss}{aaa}.mp3
       https://verses.quran.com/{PATH}/mp3/{sss}{aaa}.mp3
       https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{global}.mp3
Слово: https://audio.qurancdn.com/wbw/{sss}_{aaa}_{www}.mp3
       https://verses.quran.com/wbw/{sss}_{aaa}_{www}.mp3
Буква: https://raw.githubusercontent.com/KDE/gcompris-data/master/voices/ar/alphabet/U{CODE}.ogg  (исходник для перекодирования)
```

### ⚠️ Пословное аудио: номер слова = позиция слова
`{www}` — это **порядковый номер слова в аяте (1..N), считая только слова** (без знака конца аята).
Поле `audio_url` из `api.quran.com/api/v4/verses/...?words=true` **ошибочно** в аятах со знаками паузы:
для 2:255 API даёт слову 50 файл `002_255_058.mp3` → **404**, а реально существуют `002_255_001..050`
(051 → 404). То же для 2:2 (API: 001,002,003,004,006,008,009; реально 001..007).
Проверено: 1:1:1, 2:255:1..50, 2:282:100, 18:10:3, 112:1:4, 114:6:1..3 → 200; 114:6:4 → 404 (в аяте 3 слова).
**Вывод: вычислять номер по позиции, `audio_url` из API не брать.**

## 4. Чтецы (для настройки «Выбор чтеца»)

| id | Название (рус.) | EveryAyah папка (main) | Backup | Примечание |
|---|---|---|---|---|
| alafasy | Мишари Аль-Афаси | `Alafasy_128kbps` (есть `Alafasy_64kbps`) | `verses.quran.com/Alafasy/mp3`, cdn `128/ar.alafasy` | по умолчанию |
| husary | Махмуд Халиль аль-Хусари | `Husary_128kbps` | `Husary_64kbps`, cdn `128/ar.husary` | медленно, чётко — для начинающих |
| husary_muallim | Аль-Хусари — обучающее (муаллим) | `Husary_Muallim_128kbps` | нет (при сбое → husary) | учебное чтение с повтором; файлы ~2× длиннее (2:255: 1.8 МБ против 0.97 МБ) |
| abdulbasit | Абдуль-Басит Абдус-Самад (муратталь) | `Abdul_Basit_Murattal_192kbps` (есть `_64kbps`) | `verses.quran.com/AbdulBaset/Murattal/mp3`, cdn `64/ar.abdulbasitmurattal` | 192 kbps — тяжёлые файлы |
| minshawi | Мухаммад Сиддик аль-Миншави (муратталь) | `Minshawy_Murattal_128kbps` | `verses.quran.com/Minshawi/Murattal/mp3`, cdn `128/ar.minshawi` | |
| minshawi_teacher | Аль-Миншави — обучающее (с детьми) | `Minshawy_Teacher_128kbps` | нет (при сбое → minshawi) | папки нет в `recitations.js`, но файлы отдаются; 2:255 = 2.3 МБ (повторы). **Прослушать перед релизом.** |
| ayman_suwayd | Айман Сувейд | `Ayman_Sowaid_64kbps` | cdn `64/ar.aymanswoaid` | учитель таджвида, только 64 kbps |

Не проверено / не включено: `Minshawy_Kids_128kbps` → 404. Миншави муджаввад есть (`Minshawy_Mujawwad_192kbps`, `verses.quran.com/Minshawi/Mujawwad/mp3`) и Абдуль-Басит муджаввад (`Abdul_Basit_Mujawwad_128kbps`, `verses.quran.com/AbdulBaset/Mujawwad/mp3`) — рабочие, но для новичка не нужны. Хусари муджаввад на EveryAyah и cdn — разные по длине файлы, не включал.
Полный список папок EveryAyah: `https://everyayah.com/data/recitations.js`.

## 5. Буквы и харакаты

- **GCompris** (`KDE/gcompris-data`, `voices/ar/alphabet/`): 28 букв, файлы `U0623.ogg` (алиф; `U0627` отсутствует), `U0628` (ب) … `U064A` (ي). Нет: `U0621` (ء), `U0629` (ة), `U0649` (ى). Лицензия **GPL**, «Arabic sounds are made by Makni Bassem». Ogg Vorbis ~10 КБ, моно 44.1 кГц.
  - iPhone Safari Ogg Vorbis поддерживает плохо/нестабильно → **перекодировать в MP3** при сборке и положить в репозиторий:
    `ffmpeg -i U0628.ogg -codec:a libmp3lame -b:a 64k ba.mp3` (проверено — работает, ~9 КБ).
  - В разделе «О приложении» указать: «Произношение букв: GCompris (KDE), записи Makni Bassem, GPL».
  - Содержимое (название буквы или звук) не прослушано — проверить на слух.
- Харакаты (фатха/кясра/дамма, танвин, сукун) — открытого лицензированного источника не найдено (Wikimedia Commons и Каида Нуранийя с понятной лицензией не нашлись; Mendeley «Arabic Letter Utterance» — лицензия не подтверждена). **Рекомендация:** использовать пословное аудио Корана — подобрать слова, начинающиеся с нужного слога (например بِسْمِ 1:1:1 для «би», ٱلْحَمْدُ, هُوَ 112:1:2 и т.п.).

## 6. Service Worker и кеширование

- `<audio src>` делает **no-cors запросы с Range** → ответы 206 / opaque. Opaque-ответ нельзя «нарезать», а 206 нельзя положить в Cache API (`cache.put` отклоняет 206). Отдавать в `<audio>` opaque-ответ на Range-запрос — частая причина «тишины» на iOS.
- **Стратегия:**
  1. В SW перехватывать запросы к аудио-хостам. Ключ кеша — URL без Range.
  2. Если в кеше есть полный файл (200) — отдавать сам: при заголовке `Range` вырезать `blob.slice(start, end+1)` и вернуть `new Response(slice, {status: 206, headers: {'Content-Range': 'bytes s-e/total', 'Content-Length', 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes'}})`.
  3. Если нет в кеше — **пропустить запрос в сеть как есть** (`return fetch(event.request)`; не мешать стримингу), а параллельно (`event.waitUntil`) скачать полный файл `fetch(url, {mode: 'cors', credentials: 'omit'})` **без Range**, и при `res.status === 200` положить в кеш.
  4. Ограничить размер кеша (LRU, напр. 300 файлов / ~150 МБ); кнопка «Скачать суру для офлайна» — то же самое пачкой.
- Хосты с `Access-Control-Allow-Origin: *` (CORS-fetch и кеш возможны): **everyayah.com, verses.quran.com, audio.qurancdn.com, raw.githubusercontent.com**.
- **cdn.islamic.network** — без ACAO: `mode:'cors'` упадёт. Только прямое онлайн-воспроизведение (не перехватывать в SW вообще). Поэтому он лишь «резерв 2».
- Лучше всего: собственные короткие файлы (буквы) — в репозитории, отдаются с того же origin, кешируются как статика при установке SW.

## 7. Подводные камни iOS Safari и требования к плееру

1. **Только по тапу.** Первый `audio.play()` — синхронно внутри обработчика `click`/`touchend` (без `await` до вызова). Никакого autoplay. Обрабатывать промис: `play().catch(e => …)`; `NotAllowedError` → показать «Нажмите ▶».
2. **Один элемент `<audio>` на всё приложение** (переиспользовать, менять `src`). iOS «разблокирует» конкретный элемент после жеста; новые элементы без жеста играть не будут. Следующий аят в режиме повтора — менять `src` у того же элемента в `ended`.
3. Атрибуты: `playsinline`, `preload="none"` (или `metadata` для текущего аята; iOS всё равно игнорирует `auto`), `crossorigin` **не ставить** (иначе для cdn.islamic.network без ACAO воспроизведение сломается; для SW-кеша CORS делается отдельным fetch).
4. **Загрузка/таймаут:** состояние «загрузка…» до `canplay`/`playing`; таймаут 8–10 с (для 2+ МБ файлов на 3G — 15 с) без `playing` → считать ошибкой.
5. **Ошибки и fallback:** на `error`, `stalled` + таймаут, или reject `play()` (кроме NotAllowedError): main → backup → backup2 → (для учебных чтецов) `fallbackReciter`. Запомнить в `sessionStorage`, что хост не работает, чтобы следующие аяты сразу брали резерв. Если всё упало — **видимое дружелюбное сообщение** «Не удалось загрузить аудио. Проверьте интернет» и кнопка «Повторить» (сбрасывает пометки и пробует снова с main). Никогда не молчать.
6. **Скорость** `playbackRate` 0.5–1.5: на iOS работает, но после смены `src` сбрасывается в 1 — выставлять заново в `loadedmetadata`; также задать `preservesPitch = true` (и `webkitPreservesPitch`).
7. **Повтор N раз** — по событию `ended` (`currentTime = 0; play()`), не через `loop` (нужен счётчик). В режиме «без звука» (беззвучный переключатель iPhone) `<audio>` звучит — Web Audio API нет; **не использовать Web Audio API** для основного воспроизведения.
8. Экран блокировки / фон: iOS может приостановить; поддержать `navigator.mediaSession` (метаданные, play/pause), обработать `pause` извне (обновить кнопку).
9. Не использовать TTS (`speechSynthesis`) для арабского — голоса часто нет.
10. Тест: iPhone Safari (или эмуляция WebKit в Playwright), Android Chrome; режим самолёта для проверки офлайн-кеша.

## 8. «Если аудио снова сломалось» — чек-лист

1. Прогнать проверку (из любого терминала):
   ```bash
   for u in \
     https://everyayah.com/data/Alafasy_128kbps/002255.mp3 \
     https://verses.quran.com/Alafasy/mp3/002255.mp3 \
     https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3 \
     https://audio.qurancdn.com/wbw/002_255_001.mp3 ; do
     curl -s -o /dev/null -D - -H "Origin: https://example.github.io" -H "Range: bytes=0-100" "$u" \
       | grep -iE '^HTTP/|content-type|access-control-allow-origin|content-range'; echo "== $u"; done
   ```
   Ожидаем: `206`, `audio/mpeg`, `content-range: bytes 0-100/…`, ACAO `*` (кроме cdn.islamic.network).
2. Проверить все шаблоны из `data/misc/reciters.json` на 1:1, 2:255, 114:6 (скрипт: подставить плейсхолдеры, curl как выше). 403 `application/xml` на cdn.islamic.network = нет такого битрейта.
3. Если хост умер — поменять `main`/`backup` местами в `reciters.json` (код плеера не трогать). Список папок EveryAyah: `https://everyayah.com/data/recitations.js`; пути Quran.com: `https://api.quran.com/api/v4/recitations/{id}/by_ayah/1:1`; редакции AlQuran Cloud: `https://api.alquran.cloud/v1/edition?format=audio`, `https://api.alquran.cloud/v1/ayah/262/ar.alafasy` (поле `audio` и `audioSecondary`).
4. Пословное: проверить `002_255_050` (200) и `002_255_051` (404) — нумерация по позиции.
5. На устройстве: открыть DevTools (Safari → Develop → iPhone) → Network: аудио-запрос 206? Console: `NotAllowedError` (нет жеста) / `NotSupportedError` (неверный тип или opaque-ответ из SW). Временно отключить SW (Unregister) и повторить — если заработало, ошибка в Range-логике SW.
6. Очистить кеш SW (сменить версию кеша) после правки.

## Источники
- EveryAyah: https://everyayah.com/data/recitations.js
- Quran.com API v4: https://api-docs.quran.com/docs/content_apis_versioned/4.0.0/content-apis/ ; условия: https://api-docs.quran.foundation/legal/developer-terms/
- AlQuran Cloud: https://alquran.cloud/cdn , https://alquran.cloud/terms-and-conditions
- GCompris voices (ar): https://raw.githubusercontent.com/KDE/gcompris-data/master/voices/ar/README
