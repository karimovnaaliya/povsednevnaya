# PROMPT FOR CLAUDE CODE: «Путь к Корану» (Quran & Islam learning app)

You are the lead architect and orchestrator of a large project. Build a complete, beautiful, mobile-first learning web app for a Russian-speaking Muslim woman (a housewife living in **Osh, Kyrgyzstan**) who has started learning to read the Quran about a month ago and already knows the Arabic alphabet. She will use the app mostly on her phone, every day, for at least 20 minutes.

This is a big project. Work patiently, section by section, and do not stop until every section in this prompt is finished, tested and checked. Nothing may be left as a placeholder, "TODO", "coming soon" or lorem ipsum.

---

## 0. Non-negotiable rules

1. **Language:** All interface text, explanations, quizzes, translations and notes are in **Russian**. Arabic appears in Arabic script; every Arabic text also has a Latin transliteration and a Russian translation.
2. **School of thought (confirmed by the user):** The user is **Ahl as-Sunna wal-Jama'a** and follows the **Hanafi madhhab** (Imam Abu Hanifa and his students Imam Abu Yusuf and **Imam Muhammad ash-Shaybani**), with the **Maturidi aqida**, as is traditional in Kyrgyzstan. All fiqh (prayer, wudu, ghusl, menstruation rules, etc.) must follow the Hanafi rulings. Where other madhhabs differ, you may add a short neutral note, but the main instruction is Hanafi.
3. **Accuracy of sacred text — critical:**
   - NEVER type Quran verses from memory. Load Quran Arabic text, tajweed markup, translations and audio from a reliable public API (see section 4). Cache what the app needs.
   - Duas and hadith texts must be taken from reliable sources and checked against at least two sources. Every topic must list its sources (with links) at the bottom.
   - If a fact cannot be verified, leave it out rather than guess.
   - Add a gentle note in the "О приложении" section: the app is a study aid, and for personal fiqh questions she should ask a trusted imam or teacher (ustaz/ustaza).
4. **Mobile-first:** Designed for a phone screen (360–430px wide) first. Large tap targets (min 48px), thumb-friendly bottom navigation, no horizontal scrolling, readable Arabic (large font, generous line height). Must also look good on tablet/desktop.
5. **Zero errors:** No console errors, no broken buttons, no dead links, no audio that fails silently. Test everything (section 9).

---

## 1. How to work (orchestration with subagents)

**Phase 1 — You (the lead) build the foundation first, alone:**
- Project structure, tech stack, routing, state/progress storage.
- A **design system** file (`DESIGN.md` + CSS tokens): colors, typography, spacing, icons, components (cards, buttons, quiz cards, drag-and-drop, audio player, progress rings, calendar, tabs, modals), light and dark theme.
- A **content schema** (JSON format) that every section must use: lessons, quizzes, exercises, duas, sources.
- A `PROGRESS.md` checklist listing every section and sub-task with status. Update it after every finished piece of work. This file is how work resumes after any interruption.

**Phase 2 — Dispatch subagents, one per section** (sections listed in section 3). Give each subagent: this prompt's rules (section 0), the design system, the content schema, and its section's requirements. Each subagent must:
- Do real web research for its topic (reliable Islamic sources in Russian and English; Hanafi sources for fiqh).
- Write the full content in Russian in the shared JSON schema, with sources under every topic.
- Build as many exercises and quiz questions as possible for its section.
- Report back what was done and what sources were used.

**Phase 3 — You review and integrate:** check each subagent's work for accuracy, Hanafi consistency, Russian language quality, design-system compliance and mobile layout. Send work back if it's not good enough.

**Resuming after interruptions / usage limits:** If the session stops (for example a usage limit), when it resumes, first read `PROGRESS.md`, then continue exactly from the next unfinished task. Never restart finished work. Commit to git after each finished section.

---

## 2. Tech and delivery

- Static web app: HTML + CSS + vanilla JS (or a small framework if you judge it better), no backend required.
- Make it a **PWA**: installable on the phone home screen, works offline for already-loaded content (service worker caching text and the audio she has played).
- Progress saved in `localStorage` (wrapped in try/catch), with **Export / Import backup** buttons (JSON file) so she never loses her progress.
- At the end, give clear, simple step-by-step instructions (in Russian) for putting the app online for free (e.g., GitHub Pages or Netlify) so she can open it on her phone and add it to her home screen.

---

## 3. Sections of the app

### 3.1 Главная (Home / Dashboard)
- Greeting, today's goal: **20 minutes of Quran study**, with a big "Начать занятие" button.
- Streak counter (days in a row), today's progress ring, next recommended lesson, "Дуа дня", "Аят дня" (from the API).
- Quick buttons to: continue lesson, revision, duas, prayer.

### 3.2 Сессия 20 минут (Focus mode)
- A calm, distraction-free "study room" mode: full-screen, soft background, a 20-minute timer (can choose 10/20/30/45), gentle ending sound.
- During the session she reads/listens/practices; the time counts toward today's goal.
- If she leaves the app, the timer pauses. A session counts as "done" when 20 minutes are reached.
- Optional calm ambient visuals (no music — keep it appropriate).

### 3.3 Календарь и трекер (Calendar & tracker)
- Monthly calendar: each day colored — completed (green), partial (yellow, with minutes shown), **missed (red, marked "Пропущено — не занималась")**, future (neutral).
- Statistics: total minutes, longest streak, current streak, lessons completed, surahs memorized, duas learned, quiz accuracy over time (simple charts).
- Gentle motivation messages, never shaming.
- Optional daily reminder (browser notification if allowed).
- **"Особые дни" mode (hayd / nifas):** one tap to mark these days. They are shown in a separate soft color, do NOT count as missed and do NOT break the streak. During this mode the app suggests what she can still do (according to Hanafi rulings): listening to recitation, duas, dhikr, tasbih, reading the Islam knowledge sections, revision quizzes. This mode is private and stored only on her device.
- **Prayer tracker:** a simple daily checklist of the 5 prayers (+ witr), and an optional qada (missed prayers) counter.

### 3.4 Коран: путь от начального до продвинутого уровня
Research a proper curriculum (based on how Qaida Nuraniyya / "Нур аль-Баян" style courses and tajweed courses are structured). She already knows the alphabet, so start with a quick alphabet review, then go deeper. Levels, for example:
1. **Повторение алфавита** — letter forms (isolated/initial/medial/final), similar-looking letters, makhraj (articulation points) with diagrams.
2. **Огласовки** — fatha, kasra, damma; sukun; tanwin; shadda; long vowels (madd tabi'i).
3. **Чтение слогов и слов** — joining letters, reading words, then short phrases.
4. **Основы таджвида** — nun sakina and tanwin rules (izhar, idgham, iqlab, ikhfa), mim sakina rules, qalqala, lam shamsiya/qamariya, tafkhim/tarqiq, rules of madd (types and lengths), waqf (stopping signs).
5. **Чтение аятов** — practice with real short surahs using the colored tajweed text.
6. **Продвинутый уровень** — reading longer passages fluently, advanced madd, rare rules, self-check reading.

Each lesson: explanation in Russian, examples in Arabic with transliteration, audio, and exercises. Each level ends with a test; next level unlocks after passing (with an option to skip if she wants).

**Color-coded tajweed text:** Research color-coded tajweed Qurans (e.g., the widely used Dar al-Maarifah tajweed color system) and use that color scheme for tajweed rules in the Arabic text, with a tappable legend explaining each color in Russian. Tapping a colored letter shows which rule it is. Colors must have good contrast in both light and dark themes. A toggle turns colors on/off.

### 3.5 Суры для заучивания (Memorization / Hifz)
- List of surahs ordered **from easiest to hardest** for a beginner: start with Al-Fatiha, then short surahs of Juz 'Amma (Al-Ikhlas, Al-Falaq, An-Nas, Al-Kawthar, Al-Asr, Al-Kafirun, An-Nasr, Al-Masad, Quraysh, Al-Fil, Al-Ma'un, etc.), then Ayat al-Kursi, the last two ayats of Al-Baqara, then longer surahs. Research a sensible order by length and difficulty.
- For each surah: Arabic text (with tajweed colors), transliteration, Russian translation, short explanation of meaning and when it was revealed (Meccan/Medinan), audio per ayah.
- **Memorization tools:** repeat an ayah N times, hide words progressively, "fill the missing word", put ayahs in the right order (drag and drop), listen-and-recite.
- Status per surah: не начато / учу / выучено / на повторении, plus spaced-repetition review reminders.

### 3.6 Намаз (Prayer) — deep section, Hanafi
- **Why we pray:** meaning and wisdom of salah, its place in Islam.
- **Taharat:** wudu step by step (fard, sunnah, what breaks it), **ghusl for women** step by step (when it is required, fard and sunnah acts), tayammum.
- **Women's matters (Hanafi):** hayd (menstruation), nifas (after childbirth), istihada — minimum/maximum durations, what is not allowed during these periods (salah, fasting, touching the mushaf, etc.), making up fasts (not prayers), what she CAN do (dhikr, dua, listening to Quran). Respectful and clear tone.
- **The prayers:** five daily prayers, number of rak'ahs (fard, sunnah, witr), times.
- **How to pray, step by step for a woman (Hanafi):** each position with a simple illustration (SVG, modest, no faces), what is recited in each position in Arabic + transliteration + Russian translation, **and the meaning/why of each action and each recitation**.
- Fard, wajib, sunnah of salah; what breaks the prayer; sajda sahw (prostration of forgetfulness).
- Interactive: put the steps of wudu / salah in the correct order (drag and drop), match the recitation to the position, quizzes.

### 3.7 Дуа (Duas) — especially for a woman at home
For each dua: Arabic, Latin transliteration, Russian translation, when to say it, source (hadith reference), audio if available, and a "Выучено" button with memorization practice.
Categories (research and choose authentic duas):
- Утро и вечер (adhkar), before sleep and on waking.
- Food: before eating, after eating, forgetting bismillah, for the host.
- **Before cooking and in the kitchen**, starting any task (bismillah), for barakah in the home.
- **During cleaning / housework**, tiredness, seeking strength (e.g., the tasbih Fatima recommendation).
- Entering and leaving the home, the bathroom, mosque.
- Dressing, looking in the mirror.
- For husband, children, family, parents.
- Distress, anxiety, illness, gratitude, istighfar.
- Travel, rain, guests.
Mark how authentic each one is and list the source.

### 3.8 Основы ислама (General knowledge), topic by topic
- **Aqida (Maturidi):** six pillars of iman, five pillars of Islam, tawhid, the names of Allah (with meanings), angels, books, prophets, the Last Day, qadar.
- **History:** life of the Prophet ﷺ (seerah) in stages, the rightly guided caliphs, the wives of the Prophet ﷺ and famous women of Islam (Khadija, Aisha, Fatima, Maryam, Asiya), stories of the prophets, how the Quran was revealed and compiled, the four madhhabs and Imam Abu Hanifa and his students, Islam in Central Asia and Kyrgyzstan.
- **Sunnah:** list of everyday sunnahs (eating, sleeping, greeting, hygiene, at home), with sources.
- **Fasting, zakat, hajj** basics (Hanafi).
- **Akhlaq:** manners, family life, rights of husband/wife/parents/neighbors.
- **Islamic calendar and holidays.**
Every topic: short readable lesson, key points summary, quiz, sources.

### 3.9 Повторение и тесты (Revision & quizzes)
- Revision hub that pulls questions from everything she has studied, with spaced repetition (mistakes come back more often).
- Quiz types: multiple choice, true/false, listen-and-choose (audio), match pairs, **drag and drop**, **connect the words** (draw lines between Arabic word and translation), put in order, fill in the missing letter/harakah, identify the tajweed rule by its color.
- Each wrong answer shows an explanation. Results saved to the progress tracker.
- As many questions as possible: aim for at least 30 per major section.

### 3.10 Мои цели (Goals)
- Daily minutes goal (default 20), weekly lessons goal, surahs-to-memorize goal, duas goal. Progress bars, gentle achievements/badges (keep them modest and calm).

### 3.11 Настройки
Theme (light/dark/sepia for reading), Arabic font size, show/hide transliteration, show/hide tajweed colors, reciter choice, playback speed, backup export/import, about.

---

## 4. Data and audio (make audio actually work)

**Quran data:** use the free AlQuran Cloud API (api.alquran.cloud) or the Quran.com API. Verify the exact edition names in their docs, for example: Uthmani text, the tajweed-markup edition for colored text, a Russian translation (e.g., Elmir Kuliev), and a recitation (e.g., Mishary Alafasy, and optionally Al-Husary as a slower teaching reciter). Cache results locally.

**Audio research task (do this first, before building audio features):** Audio has failed for this user in a previous app, so treat this as a priority. Assign a dedicated subagent to research free, open, reliable Quran audio sources and libraries and pick the best ones, for example:
- Quran.com API (v4) recitations and per-ayah / word-by-word audio,
- AlQuran Cloud audio (cdn.islamic.network),
- EveryAyah.com per-ayah MP3s,
- Quranic Universal Library (QUL, by Tarteel) open data,
- any other open-source Quran audio project you find.
For each candidate, check: is it free to use, does it work over HTTPS, does it allow use in a web page (CORS / hotlinking), does it play on iPhone Safari and Android Chrome, does it have per-ayah and ideally **word-by-word** audio (very useful for a beginner: tap a word, hear it). Choose a main source and a backup source, and make the player automatically switch to the backup if the main one fails. Write the findings to `AUDIO.md`. If the user later reports that audio is broken, re-run this research and fix it.

**Why audio often fails, and what to do:**
- Browsers (especially on iPhone/Safari) block audio that starts without a tap. Always start playback from a button tap; never autoplay.
- Don't rely on the browser's text-to-speech for Arabic — many phones have no Arabic voice. Use real recorded MP3s.
- Use reliable per-ayah MP3 sources (e.g., cdn.islamic.network or everyayah.com) and test that the URLs really return audio.
- Build one reusable audio player: play/pause, repeat ayah N times, speed control, loading state, and a visible friendly error message with a "retry" button if loading fails (never fail silently).
- For letters, harakat and tajweed examples, find a free, properly licensed audio source; if none exists, use matching ayah audio as the example.
- Cache played audio in the service worker for offline use.
- Test audio on a mobile browser (or mobile emulation) before calling it done.

---

## 5. Design direction

- Calm, elegant, focused — a place she wants to sit in for 20 minutes. Think soft deep green / night blue / warm gold or sand tones, subtle Islamic geometric patterns as background ornaments (very light, not distracting), smooth gentle animations.
- Beautiful Arabic font for Quran text (e.g., a quality Uthmani/Naskh font such as Amiri Quran or KFGQPC-style), clean Cyrillic font for Russian (e.g., Inter, Manrope, or Nunito).
- Bottom navigation with 5 main tabs (e.g., Главная, Коран, Намаз, Дуа, Ещё), large icons with labels.
- No images of faces/living beings; illustrations as simple modest SVG silhouettes or icons.
- Accessibility: good contrast, readable sizes, respects reduced motion.

---

## 6. Interactive elements (use generously)
Drag and drop, connect-the-words lines, flip cards, tap-to-reveal translation, progressive word hiding for memorization, ordering steps, color-the-rule games, listen-and-repeat with timer, mini progress celebrations. All must work with touch on phones.

---

## 7. Sources
Every lesson/topic page ends with a "Источники" block: list of links used. Prefer: quran.com, alquran.cloud, sunnah.com, recognized Hanafi texts and fatwa sites, reputable Russian-language Islamic educational resources (official muftiate sites of Kyrgyzstan/Russia, etc.).

---

## 8. Extra features (all confirmed by the user — build them fully)
- **"Аят дня" and "Дуа дня"** on the home screen.
- **Prayer times for Osh, Kyrgyzstan** (default city; allow changing city), Hanafi Asr calculation, using a free prayer-times API (e.g., Aladhan). Research which calculation method matches the times published by the Muftiate of Kyrgyzstan and use that. Show the next prayer with a countdown on the home screen. Cache the month's times for offline use.
- **Qibla direction** from Osh (compass if the device allows, otherwise the degree and a simple diagram).
- **Tasbih counter:** big tap button, vibration on each 33/100, presets (SubhanAllah, Alhamdulillah, Allahu Akbar, La ilaha illAllah, Astaghfirullah, salawat), daily totals saved.
- **99 names of Allah:** Arabic, transliteration, Russian meaning, short explanation, audio if available, flashcards and a learning game.
- **Study journal (Дневник):** after each session she can write what she learned, what was hard, and a dua or intention; entries are linked to calendar days.
- **Word-by-word mode** for Quran text: tap any word to see its Russian meaning and hear it pronounced.
- **Hijri date** shown next to the normal date, with reminders of important Islamic days (Ramadan, the two Eids, Ashura, the white days of fasting, Mondays/Thursdays sunnah fasting).
- **Ramadan mode:** fasting tracker, suhoor/iftar times for Osh, duas for fasting, Quran reading plan for the month (for example, a juz-per-day tracker).
- **Morning and evening adhkar** as a guided step-by-step routine with counters.
- **Sunnah habits tracker:** small daily habits (bismillah before eating, right hand, adhkar before sleep, etc.) she can tick off.

---

## 9. Testing before you say "done"
- Test every page at 375px and 414px widths and on desktop.
- Click every button, play audio in several places, complete at least one quiz of every type, test drag and drop with touch emulation, test the calendar with fake missed/completed days, test export/import backup, test offline mode.
- Check no console errors, no broken links, no untranslated English text in the UI.
- Re-check a sample of Quran text, duas and fiqh rulings against sources.
- Only then mark the project complete in `PROGRESS.md` and give me the final summary and deployment instructions in Russian.
