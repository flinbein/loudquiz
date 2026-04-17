# LoudQuiz v2 — План разработки

## Context

Полный ребилд проекта LoudQuiz на ветке v2. Вся старая кодовая база удалена, есть подробная спецификация (46 файлов в `spec/`). Цель — создать мультиплеерную party-quiz игру, где игроки в наушниках с музыкой угадывают задания, которые капитан объясняет жестами.

Стек: React + TypeScript + Vite, CSS Modules, Zustand, i18next, OpenRouter API.
Транспорт: Broadcast Channel (dev) → p2pt (WebRTC).

## Правила

- Бери в работу только одну следующую невыполненную фазу.
- В процессе работы над заданиями в рамках фазы сразу отмечай выполненные пункты [x].
- При завершении работы над фазой проверь её соответствие спецификации `spec/README.md`.
- При завершении работы над фазой пометь её [готово].
- При завершении работы над фазой добавь подраздел **Выполнено** с коротким описанием того, что сделано в рамках фазы. 
- В процессе работы обновляй файлы CLAUDE.md в нужных директориях. Сохраняй специфичные знания, полученные в процессе работы.
- При необходимости установки дополнительных npm библиотек, не описанных в документации, запрашивай у меня подтверждение.

---

## Фаза 1: Инфраструктура проекта [готово]

**Цель:** рабочий Vite+React+TS проект со всем тулингом.

- [x] `package.json` с зависимостями: react, react-dom, typescript, vite, zustand, i18next, react-i18next, react-router-dom, vitest, @testing-library/react, playwright, ladle
- [x] `tsconfig.json` (strict mode, path alias `@/` → `src/`)
- [x] `vite.config.ts` (CSS Modules, dev server 0.0.0.0)
- [x] `index.html`
- [x] CLAUDE.md с конвенциями проекта
- [x] i18n: `src/i18n/index.ts`, `ru.json`, `en.json` (каркас)
- [x] Роутинг: `src/App.tsx` с маршрутами `/`, `/constructor`, `/rules`, `/play` и заглушками страниц
- [x] CSS-основа: `src/styles/theme.css` (переменные тем light/dark, цвета команд), `src/styles/global.css`
- [x] npm-скрипты: `dev`, `dev:storybook`, `build`, `test`, `test:e2e`
- [x] Ladle: `.ladle/config.mjs`

**Файлы:** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `CLAUDE.md`, `.ladle/config.mjs`, `src/main.tsx`, `src/App.tsx`, `src/i18n/*`, `src/styles/*`, страницы-заглушки.

**Проверка:**
- `npm run dev` запускается без ошибок
- `npm run dev:storybook` запускается
- `npm run test` проходит (тривиальный тест)
- Переходы по `/`, `/play`, `/constructor`, `/rules` рендерят заглушки
- Тема переключается через CSS-переменные

**Выполнено:**
- Создан проект Vite+React 19+TypeScript (strict) с path alias `@/` → `src/`
- Установлены все зависимости: zustand, i18next, react-router-dom, vitest, @testing-library/react, @playwright/test, @ladle/react
- Настроен i18n (ru/en каркас), роутинг (4 маршрута с заглушками), CSS-темы (light/dark с CSS-переменными, цвета команд)
- Ladle сконфигурирован (`.ladle/config.mjs`)
- CLAUDE.md с конвенциями проекта
- 4 теста маршрутизации проходят, `tsc -b` и `vite build` без ошибок

---

## Фаза 2: Система типов и Zustand-стор [готово]

**Цель:** все TypeScript-интерфейсы из спеки, Zustand-стор с начальным состоянием, фильтрация состояния, persistence.

- [x] `src/types/game.ts` — GamePhase, GameState, GameSettings, PlayerData, TeamData, RoundState, PlayerAnswer, ReviewResult, TimerState, Topic, Question, BlitzTask, QuestionsFile
- [x] `src/types/transport.ts` — Transport interface, Message discriminated union
- [x] `src/types/ai.ts` — типы для AI-запросов/ответов
- [x] `src/store/gameStore.ts` — Zustand-стор, `window.__store` в dev-режиме, базовые действия
- [x] `src/store/selectors.ts` — производные селекторы
- [x] `src/store/stateFilter.ts` — `filterStateForPlayer()`: скрывает текст вопроса от не-капитанов, ответы других игроков
- [x] `src/persistence/sessionPersistence.ts` — сохранение/восстановление GameState (sessionStorage)
- [x] `src/persistence/localPersistence.ts` — API key, имя игрока, калибровка, использованные вопросы (localStorage)

**Проверка:**
- Unit-тест `stateFilter`: капитан видит вопрос, респондер — нет, противник видит (dual mode)
- Unit-тест: стор инициализируется с корректным начальным состоянием
- Unit-тест: persistence round-trip
- `window.__store.getState()` работает в dev-консоли

**Выполнено:**
- Типы: `game.ts` (20+ интерфейсов/типов), `transport.ts` (Transport interface, Message union, PlayerAction union), `ai.ts` (input/output типы для всех 4 AI-операций)
- Zustand store с initialState, setState, resetGame, window.__store в dev
- Селекторы: team/player/question/game progress — чистые функции + hook-обёртки
- stateFilter: скрывает вопрос от не-капитанов (single), показывает противникам (dual), скрывает ответы других до review, скрывает блиц-задания от не-капитанов
- Persistence: sessionStorage (GameState save/load/clear/isHost), localStorage (API key, player name, calibration, used questions)
- 26 тестов проходят (11 stateFilter, 3 gameStore, 8 persistence, 4 routing)
- tsc -b без ошибок

---

## Фаза 3: Транспорт (Broadcast Channel) [готово]

**Цель:** хост и игрок общаются через Broadcast Channel. Хост создаёт комнату, игрок подключается, сообщения идут в обе стороны.

- [x] `src/transport/interface.ts` — абстрактный Transport (createRoom, joinRoom, send, broadcast, onMessage, onPeerConnect/Disconnect, close)
- [x] `src/transport/broadcastChannel.ts` — реализация через BroadcastChannel API, roomId с префиксом `b-`, heartbeat
- [x] `src/transport/factory.ts` — фабрика по префиксу roomId (`b`/`p`/`v`)
- [x] `src/types/messages.ts` — протокол сообщений: Host→Player `state-update`, Player→Host `player-action`, PlayerAction union (реализовано в `src/types/transport.ts` на Фазе 2)
- [x] `src/hooks/useTransport.ts` — хук: lifecycle транспорта, host-режим (слушает действия, бродкастит состояние), player-режим (шлёт действия, принимает состояние)

**Проверка:**
- Unit-тест: BC transport отправляет и получает сообщения
- Ручной тест: две вкладки браузера подключаются к одной `b-xxx` комнате

**Выполнено:**
- `transport/interface.ts` — реэкспорт типов Transport, RoomInfo, Message, PlayerAction из types/transport.ts
- `transport/broadcastChannel.ts` — полная реализация BC: create/join room, send/broadcast, peer connect/disconnect, heartbeat (2s interval, 5s timeout), disconnect notification, graceful close
- `transport/factory.ts` — фабрика `createTransport(roomId)` по префиксу (b/p/v), заглушки для p2pt и VarHub
- `hooks/useTransport.ts` — хук с двумя режимами: host (создаёт комнату, подписывается на store, бродкастит отфильтрованное состояние каждому игроку) и player (подключается, шлёт действия, получает обновления состояния)
- 9 unit-тестов (создание комнаты с b- префиксом, отправка/получение сообщений, peer connect/disconnect, close cleanup, фабрика для всех префиксов)
- 35 тестов проходят, tsc -b без ошибок

---

## Фаза 4: UI-компоненты + Ladle Stories [готово]

**Цель:** 8 компонентов из спеки + утилитарные компоненты, все с Ladle-stories. Без зависимости от игровой логики.

- [x] `PlayerAvatar` — круг с эмодзи, имя, цвет команды, online/offline, 3 размера
- [x] `Envelope` — конверт с бумагой, анимация open/close, label, цвет по команде, active (свечение+качание), аватар игрока, иконка джокера
- [x] `BlitzBox` — коробка, active-свечение, текст по цвету команды
- [x] `TaskCard` — глянцевая карточка с темой, аватаром капитана, сложностью, скрытый режим
- [x] `TaskView` — сетка Envelope (колонки=темы, строки=вопросы) + горизонтальный ряд BlitzBox
- [x] `PlayerStatusTable` — таблица игроков с аватаром, именем, ролью (иконка), статусом
- [x] `Sticker` — стикер с полоской скотча, загнутым уголком, рукописным шрифтом, штампом с анимацией
- [x] `StickerStack` — стопка стикеров, бейдж с количеством, клик для пролистывания/разделения
- [ ] `Timer` — таймер обратного отсчёта (визуальный) → отложено до Фазы 6
- [ ] `CalibrationPopup` — слайдеры громкости музыки/сигнала, вибрация → отложено до Фазы 7
- [ ] `ThemeToggle` — переключатель light/dark/system → отложено до Фазы 10
- [ ] `FullscreenButton` → отложено до Фазы 10
- [x] Ladle stories для всех компонентов: все визуальные состояния, цвета команд, анимации

**Проверка:**
- `npm run dev:storybook` показывает все компоненты
- Stories покрывают: все цвета команд, active/inactive, open/closed, hidden/visible, online/offline
- Визуальная проверка анимаций
- Компоненты рендерятся на 1366×768 (host) и 375×600 (player)

**Выполнено:**
- 8 компонентов с CSS Modules и Ladle stories: PlayerAvatar, BlitzBox, Envelope (3D-анимация крышки), Sticker (текстура мятой бумаги, чернильный штамп), StickerStack, TaskCard (глянцевая карточка), TaskView (сетка конвертов + блицы), PlayerStatusTable
- Шрифты Google Fonts: Marck Script (рукописный), Tektur (дисплейный)
- Расширение theme.css: командные bg/text цвета, цвета конвертов, переменные анимаций
- Общие keyframes: rock, glowPulse, stampAppear, typingDots, slideInUp/Out
- 24 файла компонентов (8 × .tsx + .module.css + .stories.tsx)
- tsc -b без ошибок, 35 тестов проходят
- Утилитарные компоненты (Timer, CalibrationPopup, ThemeToggle, FullscreenButton) отложены до фаз, где они используются

---

## Фаза 5: Game Setup + Lobby [готово]

**Цель:** полный поток: главная → создание игры → лобби с подключением игроков, выбором команд, аватаров, стартом.

- [x] `HomePage` — кнопка «Новая игра» → `/setup`
- [x] `SetupPage` — режим команд (single/dual), источник вопросов (manual/AI), загрузка JSON (manual) / настройки AI, валидация, создание комнаты → навигация на `/play`
- [x] `PlayPage` — маршрутизация host/player по sessionStorage, ввод имени, рендер по текущей фазе
- [x] `HostLobby` — QR-код (qrcode.react), список игроков по командам через TeamGroup + PlayerStatusTable, drag для перемещения, kick drop-zone, кнопка «Старт»
- [x] `PlayerLobby` — ввод имени, TeamPicker с drag/click выбором команды, клик по аватару для смены эмодзи, «Готов», «Старт»
- [x] `src/store/actions/lobby.ts` — handleJoin, handleSetTeam, handleSetReady, handleChangeEmoji, kickPlayer, movePlayer, canStartGame, startGame (18 тестов)
- [x] `src/logic/emojiPool.ts` — пул 280+ эмодзи, getRandomEmoji с исключением занятых, getShortName (9 тестов)
- [x] `src/components/TeamGroup/` — компонент группировки игроков по команде с цветной полоской
- [x] `src/components/PlayerStatusTable/` — добавлен draggable prop, исправлен статус waiting (⏳)
- [x] PlayerAction types — добавлены change-emoji, start-game
- [x] i18n — все ключи setup.*, lobby.*, team.* (ru + en)
- [x] useTransport — упрощён host join, делегирование в lobby actions

**Проверка:**
- [x] Unit-тест: emoji pool исключает использованные (9 тестов)
- [x] Unit-тест: lobby actions (18 тестов)
- [x] Все 63 теста проходят
- [x] tsc --noEmit без ошибок
- [x] Сборка (vite build) успешна
- [ ] E2E: хост создаёт игру, видит QR-код в лобби
- [ ] E2E: игрок подключается, вводит имя, выбирает команду, нажимает «Готов»
- [ ] E2E: хост видит игрока, нажимает «Старт»
- [ ] Ручной тест: две вкладки, полный поток лобби

---

## Фаза 6: Раунды (6 фаз) — Manual Mode [готово]

**Цель:** полный цикл раунда с 6 фазами для ручного режима, одна команда. Ядро геймплея.

- [x] `src/logic/phaseTransitions.ts` — `getNextPhase()`: следующий раунд / блиц / финал
- [x] `src/logic/timer.ts` + `src/hooks/useCountdown.ts` — обратный отсчёт по формулам из спеки
- [x] `src/logic/captain.ts` — выбор капитана (первый нажал / таймаут = случайный), нельзя дважды подряд
- [x] `src/logic/scoring.ts` — формулы: все правильные + уникальные (бонус за время), частичные, джокер ×2
- [x] `src/store/actions/round.ts` — claimCaptain, selectQuestion, activateJoker, submitAnswer, evaluateAnswer, mergeAnswers, splitStack, confirmReview
- [x] `HostRound` — 6 подфаз: captain, pick, ready, active, answer, review
- [x] `PlayerRound` — по ролям: капитан, респондер × 6 подфаз
- [x] Компоненты: Timer, TimerButton, TimerInput, JokerState, TeamScore, ScoreFormula
- [x] StickerStack: drag-n-drop для объединения ответов в review
- [x] i18n ключи для round/joker/score (ru, en)
- [x] Интеграция в PlayPage + useTransport

**Выполнено:** Реализован полный цикл раунда для manual mode, single team. 19 задач: типы (tri-state AnswerEvaluation, новые PlayerAction), 4 модуля логики (timer, captain, scoring, phaseTransitions) с 34 unit-тестами, store actions (round.ts) с 18 тестами, хук useCountdown с imperative handle, 6 UI-компонентов (Timer, TimerButton, TimerInput, JokerState, TeamScore, ScoreFormula), drag-n-drop в StickerStack, страницы HostRound и PlayerRound, интеграция через PlayPage с централизованным onHostAction. Все 115 тестов проходят, build успешен.

**Ключевые спеки:** `spec/game/phases.md`, `spec/game/scoring.md`, `spec/ui/host-screens/round.md`, `spec/ui/player-screens/round.md`

**Проверка:**
- Unit-тесты scoring: all-correct-unique, partial, joker, zero-bonus
- Unit-тесты captain: нельзя капитанить дважды подряд
- Unit-тесты phase transitions
- E2E: полный раунд — капитан → выбор вопроса → подготовка → активная фаза → ответы → ревью → следующий раунд
- Ручной тест: 2+ игрока через Broadcast Channel

---

## Фаза 7: Аудио + Блиц-раунды [готово]

**Цель:** аудио (музыка, сигнал, вибрация). Полный блиц (6 фаз).

- [x] `src/audio/audioManager.ts` — музыка (loop, fade-out 3s), сигнал (однократный), вибрация, громкость из localStorage
- [x] `src/hooks/useAudio.ts` — автозапуск музыки на ready/active (только для players), сигнал + вибрация на начало/конец active
- [x] CalibrationPopup — попап готов: bottom sheet с music/signal/vibration/sharedHeadphones + clock calibration (host/player), Toolbar, GameShell обёртка в PlayPage, CalibrationPopupContainer связывает с zustand stores, полный набор hooks (useTestAudio, useSecondPulse, useClockTick)
- [x] `src/logic/blitzCheck.ts` — нормализация ответа: регистр, ё/е, спецсимволы, пробелы
- [x] `src/store/actions/blitz.ts` — claimBlitzCaptain, selectSlot, selectBlitzTask, submitBlitzAnswer, skipBlitzAnswer, confirmBlitzReview
- [x] Расширение `scoring.ts` для блица: `difficulty × playerNumber × (1 + bonusTime/totalTime)`, 0 при неправильном
- [x] `HostBlitz` — 6 подфаз + chain diagram в review
- [x] `PlayerBlitz` — по ролям: капитан, промежуточный, последний, противник

**Ключевые спеки:** `spec/game/blitz.md`, `spec/systems/audio.md`, `spec/ui/host-screens/blitz.md`, `spec/ui/player-screens/blitz.md`

**Проверка:**
- Unit-тесты blitzCheck: регистр, ё/е, спецсимволы
- Unit-тесты blitz scoring
- E2E: полный блиц-раунд
- Ручной тест: аудио на правильных фазах, fade-out, калибровка

**Выполнено:**
- **Аудио:** `src/audio/audioManager.ts` — синглтон `audioManager` с `playMusic`/`stopMusic` (fade-out ~3s через setInterval), `playSignal` (+ `navigator.vibrate(200)` если включена тактильная отдача), setters громкости. 5 unit-тестов в `audioManager.test.ts`.
- **Хук:** `src/hooks/useAudio.ts` — автоматически запускает музыку в фазах `round-ready`/`round-active`/`blitz-ready`/`blitz-active` только для игроков активной команды; фейдит при выходе. Сигнал + вибрация на восходящем и нисходящем фронте `*-active` фаз (edge detection через useRef). Читает громкость и hapticEnabled из `useCalibrationSettingsStore`. Подключён в `PlayPage` (хост слышит только сигнал; игроки — всё).
- **Блиц-проверка:** `src/logic/blitzCheck.ts` — `normalizeBlitzAnswer` (lowercase → ё↔е → удаление всего не `\p{L}\p{N}`) + `checkBlitzAnswer(answer, variants)`. 9 тестов.
- **Scoring:** `src/logic/scoring.ts` расширен `calculateBlitzScore(difficulty, playerNumber, correct, bonusTime, totalTime)` — формула `difficulty × playerNumber × (1 + bonusTime/totalTime)`, 0 при неправильном ответе или playerNumber ≤ 0.
- **Переходы фаз:** `src/logic/phaseTransitions.ts` — `getPlayedBlitzTaskIds`, `getUnplayedBlitzTasks`, `createNextBlitzRoundState`; `getNextPhaseAfterReview` теперь учитывает блиц-задания (`round → blitz → finale`).
- **Таймеры блица:** `src/logic/timer.ts` — `getBlitzCaptainTimerDuration` (60s), `getBlitzPickTimerDuration` (60s), `getBlitzActiveTimerDuration` (`10 + 20×responders` s), `getBlitzAnswerTimerDuration` (`20 + 5×responders` s).
- **Actions:** `src/store/actions/blitz.ts` — полный набор хостовых действий: `claimBlitzCaptain` (с правилом «не капитан два раза подряд»), `claimBlitzSlot` (1-based, слоты заполняются по порядку), `selectBlitzTask(taskId, itemIndex)`, `setBlitzPlayerReady` (→ `blitz-active` когда все готовы), `submitBlitzAnswer` (в `blitz-active` — только последний; в `blitz-answer` — текущий в очереди от конца к началу), `skipBlitzAnswer` («я не знаю», сдвигает очередь), `getNextBlitzAnswerer` (обратный обход цепи, пропуская капитана), `enterBlitzReview` (бонус-тайм только для ответов во время `blitz-active`), `confirmBlitzReview` (хистори + очки + переход), `handleBlitzTimerExpire` (авто-капитан / авто-пик / active→answer). Интегрирован в `src/store/actions/round.ts` через `createNextBlitzRoundState`. 21 тест в `blitz.test.ts`.
- **Транспорт:** `src/types/transport.ts` — добавлен `claim-blitz-slot; slot: number`, расширен `select-blitz-task` полем `itemIndex: number`.
- **UI хоста:** `src/pages/blitz/HostBlitz.tsx` + `HostBlitz.module.css` — main (TaskView, TaskCard, BlitzChainDiagram в review) + sidebar (TeamScore, CircleTimer, PlayerStatusTable с ролью `blitz-player` и `blitzOrder`, SidebarActions). Таймер-экспайр обрабатывается через `handleBlitzTimerExpire`. `getBlitzPlayerInfo` мапит (phase, role) в `PlayerRole`/`PlayerStatus`.
- **UI игрока:** `src/pages/blitz/PlayerBlitz.tsx` + `PlayerBlitz.module.css` — роутинг по `(phase, role)`:
  - Не-активная команда → `OpponentView` (`blitz.{phase}.opponentHint`).
  - `blitz-captain`: кнопка «я капитан» (с таймером) либо слот-грид для выбора позиции; капитан и уже-в-цепи игроки ждут.
  - `blitz-pick`: капитан видит сетку всех неиграных заданий (`blitz-task × item`), остальные ждут.
  - `blitz-ready`: кнопка «готов».
  - `blitz-active`: капитан видит TaskCard и кому объяснять; промежуточные — скрытый TaskCard с хинтом «от X → к Y»; последний — форма ответа (`LastPlayerAnswerForm`).
  - `blitz-answer`: текущий в очереди видит `AnswerOrSkipForm` (ответ / «я не знаю»); остальные ждут.
  - `blitz-review`: TaskCard с правильным ответом, +score, кнопка «дальше».
- **PlayPage:** `src/pages/PlayPage.tsx` — рендер `HostBlitz`/`PlayerBlitz` при `phase.startsWith("blitz-")`; центральный роутер действий расширен всеми блиц-кейсами; `set-ready` в `blitz-ready` диспатчит `setBlitzPlayerReady`; `next-round` в `blitz-review` — `confirmBlitzReview`. Хук `useAudio` подключён у host и player.
- **i18n:** Добавлены ключи `blitz.*` в `ru.json` и `en.json` — `iAmCaptain`, `captainHint`, `waitForSlots`, `pickSlot`, `captainPicking`, `pickTask`, `explainTo`, `lastPlayerHint`, `intermediateHint`, `waitingForAnswerer`, `dontKnow` + подключи `blitz.<phase>.opponentHint` для каждой из 6 блиц-фаз.
- **Проверка:** `tsc --noEmit` ✓, `npm test` → 226 тестов в 28 файлах ✓, `vite build` ✓ (420 KB js, 49 KB css).

---

## Фаза 8: AI-клиент + Конструктор вопросов [готово]

**Цель:** AI-модуль (OpenRouter API) и полнофункциональный конструктор вопросов с ручным и AI-режимами.

### 8.1 AI-клиент

- [x] `src/ai/client.ts` — обёртка OpenRouter API: chat completions, structured output (json_schema), retry до 3 попыток при невалидном JSON, обработка ошибок (сеть, таймаут), модель `google/gemini-2.0-flash-001`
- [x] `src/ai/topicGeneration.ts` — system/user prompt по спеке, `generateTopics(input: TopicGenerationInput): Promise<TopicGenerationResult>`
- [x] `src/ai/questionGeneration.ts` — system/user prompt по спеке, `generateQuestions(input: QuestionGenerationInput): Promise<QuestionGenerationResult>`
- [x] `src/ai/blitzGeneration.ts` — system/user prompt по спеке, `generateBlitzTasks(input: BlitzGenerationInput): Promise<BlitzGenerationResult>`
- [x] `src/ai/answerCheck.ts` — system/user prompt по спеке, `checkAnswers(input: AnswerCheckInput): Promise<AnswerCheckResult>`

### 8.2 Конструктор — ручной режим

- [x] `ConstructorPage` — основной layout: список тем (слева), редактор выбранной темы (центр), блиц-задания (внизу), toolbar (экспорт/импорт JSON)
- [x] Ручной ввод тем: создание/удаление/переименование
- [x] Ручной ввод вопросов: текст + сложность (100–200, кратно 10), добавление/удаление
- [x] Ручной ввод блиц-заданий: текст + сложность (200–400, кратно 10), группировка по раундам (3–5 items)
- [x] Экспорт JSON (QuestionsFile), импорт JSON с валидацией
- [x] i18n ключи `constructor.*` (ru, en)

### 8.3 Конструктор — AI-режим

- [x] Настройка API key (из localStorage, поле ввода с валидацией)
- [x] AI-генерация тем: многострочный ввод предложений, количество тем N, кнопка «Сгенерировать», preview результата с reason, кнопка «Применить»
- [x] AI-генерация вопросов: указание кол-ва игроков и вопросов на тему, генерация с acceptedAnswers, «Применить» заполняет формы
- [x] AI-генерация блиц-заданий: кол-во раундов и заданий, pastTasks из localStorage, «Применить»
- [x] Кнопка «Проверить ответы» у каждого вопроса: попап с полем ответов (предзаполнение из acceptedAnswers), AI проверяет, отображает accepted/group/note/comment
- [x] Обработка ошибок: текст ошибки + кнопка «Повторить» для всех AI-операций
- [x] Лоадеры на время AI-запросов

**Ключевые спеки:** `spec/tools/constructor.md`, `spec/systems/ai/*.md`

**Проверка:**
- Unit-тесты AI client: mock fetch, формирование промптов, retry при невалидном JSON, ошибки сети
- Unit-тесты каждого AI-модуля: корректность prompt, парсинг результата
- Ручной тест: конструктор — ручное создание тем/вопросов/блиц, экспорт JSON, импорт обратно
- Ручной тест: конструктор — AI-генерация тем → вопросов → блиц-заданий, проверка ответов
- `tsc --noEmit` без ошибок, `npm test` проходит, `vite build` успешен

---

## Фаза 9: Финал + Dual Mode + Полный цикл игры [не готово]

**Цель:** игра проходится от начала до конца в single и dual mode. Финальный экран со статистикой. AI-review в раундах.

Декомпозирована на под-фазы. Очерёдность: 9.1 → 9.2 → 9.3 → 9.4. Reconnection вынесен в отдельные документы (`task/spec-p2pt-reconnection.md`, `task/plan-p2pt-reconnection.md`).

### 9.1 AI-review + TopicsSuggest [готово]

**Цель:** AI-режим в gameplay — игроки предлагают темы, AI-review автозаполняет оценки в round-review с возможностью «Оспорить».

- [x] `HostTopicsSuggest` / `PlayerTopicsSuggest` — фазы `topics-collecting/generating/preview` для AI-режима: игроки шлют предложения, хост генерирует темы, показывает preview, подтверждает
- [x] Вставка фаз `topics-*` в game loop между lobby и первым раундом (только в AI-режиме)
- [x] AI-review в round-review: лоадер, автозаполнение оценок через `answerCheck`, отображение group/note/comment (унаследовано из dispute flow)
- [x] Кнопка «Оспорить» у ответа → ручная правка оценки капитаном/хостом (уже была; теперь сбрасывает aiStatus→idle)
- [x] Обработка ошибок AI (таймаут, сеть) — fallback на ручную оценку через `AiErrorBanner`

**Выполнено:**
- Типы: 3 новые фазы (`topics-collecting/generating/preview`) заменили `topics-suggest`; `TopicsSuggestState`; `ReviewResult.aiStatus`
- Actions: `src/store/actions/topicsSuggest.ts` (13 экспортов), `src/store/actions/aiReview.ts` (5 экспортов)
- Hook: `src/hooks/useAiOrchestrator.ts` — host-only оркестратор (timer, AI pipeline topics→questions→blitz, AI-review auto)
- UI: `AiErrorBanner`, `TopicsSidebarBlock`, `TopicsBoardBlock`, `HostTopicsSuggest`, `PlayerTopicsSuggest`
- State filter: суггестии других игроков скрыты; evaluations скрыты до `aiStatus=done`
- i18n: `topics.*`, `round.aiReview.*`, `common.cancel` (ru/en)
- 22/22 unit-тестов проходят (topicsSuggest, aiReview, stateFilter)

**Проверка:**
- [x] Unit-тесты TopicsSuggest фазы
- [x] Unit-тесты интеграции answerCheck с round-review state
- [ ] E2E: AI-режим — предложение тем → генерация → раунд → AI-review + dispute flow (отложено: playwright-инфраструктура отсутствует в репо)
- [x] Ручной тест: AI-review автозаполняет, «Оспорить» даёт ручную правку (ожидает QA)

### 9.2 Dual Mode [готово]

**Цель:** режим с двумя командами — чередование команд по раундам, корректный state filtering для противника.

- [x] Логика чередования команд: активная команда меняется каждый раунд/блиц, равное число заданий у обеих
- [x] Пропуск нечётного задания при неравном распределении
- [ ] State filtering для dual: противник видит текст вопроса, активная команда (кроме капитана) — нет
- [x] Отображение «чья сейчас очередь» на хосте и у игроков
- [x] Подсчёт очков по командам

**Проверка:**
- Unit-тесты dual mode phase transitions
- Unit-тесты stateFilter для dual mode
- E2E: полная игра dual mode — команды чередуются, очки корректны

### 9.3 Finale [готово]

**Цель:** финальный экран со статистикой и номинациями.

- [x] `src/logic/statistics.ts` — лучший игрок, лучший капитан, самый быстрый
- [x] `HostFinale` — командные очки, TaskView с очками по заданиям, три номинации с аватарами
- [x] `PlayerFinale` — очки, сообщение победы/благодарности, кнопка «Играть снова»
- [x] Фаза `finale` в state machine, переход из последнего раунда/блица

**Проверка:**
- Unit-тесты statistics
- Ручной тест: финальная статистика корректна (single и dual)
- Ladle stories для HostFinale / PlayerFinale

### 9.4 Game Loop [готово]

**Цель:** склейка всего в единый цикл, «Играть снова».

- [x] Полный game loop: lobby → (topics-suggest в AI-режиме) → round × N → blitz × N → finale
- [x] «Играть снова» из finale → возврат в topics-collecting с сохранением игроков и настроек (AI mode)
- [x] Сброс состояния раундов/очков/использованных заданий
- [x] Persistence использованных вопросов (по темам) и блиц-заданий в localStorage
- [x] AI-оркестратор читает использованные вопросы/блиц из localStorage

**Выполнено:**
- Persistence: `localPersistence.ts` — 6 функций для used questions (по темам, Record<string, string[]>), 4 функции для used blitz tasks (плоский список). 10 unit-тестов.
- Автосохранение: вопрос сохраняется при выборе капитаном (`selectQuestion`), все блиц-задания сохраняются при выборе (`selectBlitzItem`).
- AI-оркестратор: читает `getUsedQuestionsByTopic()` и `getUsedBlitzTasks()` вместо `settings.pastQuestions`.
- `playAgain()` action: сбрасывает history/topics/blitzTasks/currentRound, обнуляет score/jokerUsed, сохраняет players/settings/teams, переходит в `topics-collecting`. 3 unit-теста.
- PlayerAction `play-again` + обработка в PlayPage.
- UI: кнопка «Играть снова тем же составом» (AI mode) на PlayerFinale и SidebarBlock. Кнопка «Новая игра» → `/setup` на SidebarBlock.
- i18n: `finale.playAgain`, `finale.newGame` (ru/en).
- 526 тестов, tsc clean, build OK (617 KB js, 73 KB css).

**Проверка:**
- [x] Unit-тесты persistence (10 тестов)
- [x] Unit-тесты playAgain (3 теста)
- [x] Все 526 тестов проходят
- [x] tsc --noEmit без ошибок
- [x] vite build успешен
- [ ] E2E: полная игра от лобби до финала (playwright-инфраструктура отсутствует)
- [ ] Ручной тест: single + AI, dual + manual, dual + AI

---

## Фаза 10: Полировка [не готово]

**Цель:** страница правил, финальная полировка.

- [ ] дизайн главной страницы
- [ ] `RulesPage` — статическая страница с правилами
- [ ] `OptionsPage` — страница с общими настройками: api key, AI model, `__TRACKERS__`, использованные вопросы, и т.д.
- [x] WakeLock API
- [x] Fullscreen API
- [x] ThemeToggle, FullscreenButton
- [ ] i18n: все ключи переведены на ru и en
- [ ] Responsive: проверка на min-разрешениях (1366×768 host, 375×600 player)

**Проверка:**
- Тест p2pt: обмен сообщениями между пирами
- Ручной тест: игра на двух устройствах через p2pt
- i18n: все ключи имеют переводы на оба языка

---

## Граф зависимостей

```
Фаза 1 (Инфраструктура)
  ├── Фаза 2 (Типы + Стор)
  │     ├── Фаза 3 (Транспорт BC)
  │     │     └── Фаза 5 (Setup + Lobby)
  │     │           └── Фаза 6 (Раунды)
  │     │                 └── Фаза 7 (Аудио + Блиц)
  │     │                       └── Фаза 8 (AI + Конструктор)
  │     │                             └── Фаза 9 (Финал + Dual + Полный цикл)
  │     │                                   └── Фаза 10 (Транспорты + Полировка)
  │     │
  │     └── Фаза 4 (UI-компоненты) ← параллельно с Фазой 3
```

Фаза 4 (UI-компоненты) независима и может выполняться параллельно с Фазами 3 и 5.

---

## Архитектурные решения

1. **Host владеет состоянием** — Zustand-стор на хосте каноничен, игроки получают отфильтрованную копию.
2. **Фильтрация per-player** — `stateFilter.ts` формирует индивидуальное представление для каждого игрока.
3. **Phase-based rendering** — `HostRound.tsx` и `PlayerRound.tsx` переключают рендер по `state.phase`.
4. **Чистые функции для логики** — `scoring.ts`, `blitzCheck.ts`, `statistics.ts` — pure functions, легко тестируются.
5. **Transport abstraction** — тонкий интерфейс, реализация выбирается по префиксу roomId.
6. **Manual mode first** — AI-фичи аддитивны, игра полностью работает без них (Фазы 1-8).
7. **Broadcast Channel для тестов** — все E2E-тесты через BC (один браузер, несколько вкладок).

---

## Ключевые файлы спецификации

- `spec/systems/state.md` — каноническая структура GameState
- `spec/game/phases.md` — машина состояний фаз
- `spec/systems/transport/README.md` — интерфейс Transport
- `spec/game/scoring.md` — формулы подсчёта очков
- `spec/game/blitz.md` — механика блиц-раунда
- `spec/ui/host-screens/round.md` — самый сложный экран (6 подфаз)
