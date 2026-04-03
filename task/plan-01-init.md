# LoudQuiz v2 — План разработки

## Context

Полный ребилд проекта LoudQuiz на ветке v2. Вся старая кодовая база удалена, есть подробная спецификация (46 файлов в `spec/`). Цель — создать мультиплеерную party-quiz игру, где игроки в наушниках с музыкой угадывают задания, которые капитан объясняет жестами.

Стек: React + TypeScript + Vite, CSS Modules, Zustand, i18next, OpenRouter API.
Транспорт: Broadcast Channel (dev) → p2pt (WebRTC) → VarHub (WebSocket).

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

## Фаза 5: Game Setup + Lobby [не готово]

**Цель:** полный поток: главная → создание игры → лобби с подключением игроков, выбором команд, аватаров, стартом.

- [ ] `HomePage` — кнопка «Новая игра»
- [ ] `GameSetup` — режим команд (single/dual), источник вопросов (manual/AI), загрузка JSON (manual) / настройки AI, валидация, создание комнаты → навигация на `/play?room=b-xxx`
- [ ] `PlayPage` — маршрутизация host/player по sessionStorage, рендер по текущей фазе
- [ ] `HostLobby` — QR-код, список игроков по командам, drag для перемещения, kick, кнопка «Старт»
- [ ] `PlayerLobby` — ввод имени, выбор команды, клик по аватару для смены эмодзи, «Готов», «Старт»
- [ ] `src/store/actions/lobby.ts` — joinGame, setReady, kickPlayer, movePlayer, startGame
- [ ] `src/logic/emojiPool.ts` — пул эмодзи из спеки, случайный выбор с исключением занятых

**Проверка:**
- E2E: хост создаёт игру, видит QR-код в лобби
- E2E: игрок подключается, вводит имя, выбирает команду, нажимает «Готов»
- E2E: хост видит игрока, нажимает «Старт»
- Unit-тест: emoji pool исключает использованные
- Unit-тест: lobby actions
- Ручной тест: две вкладки, полный поток лобби

---

## Фаза 6: Раунды (6 фаз) — Manual Mode [не готово]

**Цель:** полный цикл раунда с 6 фазами для ручного режима, одна команда. Ядро геймплея.

- [ ] `src/logic/phaseTransitions.ts` — `getNextPhase()`: следующий раунд / блиц / финал
- [ ] `src/logic/timer.ts` + `src/hooks/useTimer.ts` — обратный отсчёт по формулам из спеки
- [ ] `src/logic/captain.ts` — выбор капитана (первый нажал / таймаут = случайный), нельзя дважды подряд
- [ ] `src/logic/scoring.ts` — формулы: все правильные + уникальные (бонус за время), частичные, джокер ×2
- [ ] `src/store/actions/round.ts` — claimCaptain, selectQuestion, activateJoker, submitAnswer, evaluateAnswer, mergeAnswers, splitStack, confirmReview
- [ ] `HostRound` — 6 подфаз: captain, pick, ready, active, answer, review (фаза 1 и 2)
- [ ] `PlayerRound` — по ролям: капитан, респондер, противник × 6 подфаз

**Ключевые спеки:** `spec/game/phases.md`, `spec/game/scoring.md`, `spec/ui/host-screens/round.md`, `spec/ui/player-screens/round.md`

**Проверка:**
- Unit-тесты scoring: all-correct-unique, partial, joker, zero-bonus
- Unit-тесты captain: нельзя капитанить дважды подряд
- Unit-тесты phase transitions
- E2E: полный раунд — капитан → выбор вопроса → подготовка → активная фаза → ответы → ревью → следующий раунд
- Ручной тест: 2+ игрока через Broadcast Channel

---

## Фаза 7: Аудио + Блиц-раунды [не готово]

**Цель:** аудио (музыка, сигнал, вибрация). Полный блиц (6 фаз).

- [ ] `src/audio/audioManager.ts` — музыка (loop, fade-out 3s), сигнал (однократный), вибрация, громкость из localStorage
- [ ] `src/hooks/useAudio.ts` — автозапуск музыки на ready/active (только для players), сигнал + вибрация на начало/конец active
- [ ] CalibrationPopup — доработка: play/pause, слайдеры, тест сигнала, вибрация
- [ ] `src/logic/blitzCheck.ts` — нормализация ответа: регистр, ё/е, спецсимволы, пробелы
- [ ] `src/store/actions/blitz.ts` — claimBlitzCaptain, selectSlot, selectBlitzTask, submitBlitzAnswer, skipBlitzAnswer, confirmBlitzReview
- [ ] Расширение `scoring.ts` для блица: `difficulty × playerNumber × (1 + bonusTime/totalTime)`, 0 при неправильном
- [ ] `HostBlitz` — 6 подфаз + chain diagram в review
- [ ] `PlayerBlitz` — по ролям: капитан, промежуточный, последний, противник

**Ключевые спеки:** `spec/game/blitz.md`, `spec/systems/audio.md`, `spec/ui/host-screens/blitz.md`, `spec/ui/player-screens/blitz.md`

**Проверка:**
- Unit-тесты blitzCheck: регистр, ё/е, спецсимволы
- Unit-тесты blitz scoring
- E2E: полный блиц-раунд
- Ручной тест: аудио на правильных фазах, fade-out, калибровка

---

## Фаза 8: Финал + Dual Mode + Полный цикл игры [не готово]

**Цель:** игра проходится от начала до конца в single и dual mode (manual). Финальный экран со статистикой.

- [ ] `src/logic/statistics.ts` — лучший игрок, лучший капитан, самый быстрый
- [ ] `HostFinale` — командные очки, TaskView с очками по заданиям, три номинации с аватарами
- [ ] `PlayerFinale` — очки, сообщение победы/благодарности, «Играть снова» (AI mode)
- [ ] Dual mode: чередование команд, равное число раундов/блицов, пропуск нечётного задания
- [ ] State filtering для dual: противник видит текст вопроса, активная команда (кроме капитана) — нет
- [ ] Reconnection: offline-статус, переподключение по имени, ресинк состояния
- [ ] Полный game loop: lobby → round × N → blitz × N → finale → «Играть снова»

**Проверка:**
- Unit-тесты statistics
- Unit-тесты dual mode phase transitions
- E2E: полная игра (3 раунда + 2 блица, single, manual) от лобби до финала
- E2E: полная игра dual mode — команды чередуются
- E2E: reconnection — игрок закрывает вкладку, открывает, переподключается
- Ручной тест: финальная статистика корректна

---

## Фаза 9: AI-интеграция [не готово]

**Цель:** AI-режим от начала до конца: предложение тем, генерация вопросов, проверка ответов.

- [ ] `src/ai/client.ts` — обёртка OpenRouter API, structured output, retry, обработка ошибок
- [ ] `src/ai/topicGeneration.ts` — генерация тем из предложений игроков
- [ ] `src/ai/questionGeneration.ts` — генерация вопросов по темам
- [ ] `src/ai/blitzGeneration.ts` — генерация блиц-заданий
- [ ] `src/ai/answerCheck.ts` — проверка ответов AI
- [ ] `HostTopicsSuggest` — таймер 60с, список предложений, AI-выбор, ручное редактирование, preview TaskView
- [ ] `PlayerTopicsSuggest` — ввод тем, «Больше нет идей», preview TaskView
- [ ] AI-review в round-review: лоадер, автозаполнение, кнопка «Оспорить» → ручная оценка
- [ ] GameSetup: прошлые вопросы из localStorage, валидация API key

**Ключевые спеки:** `spec/systems/ai/*.md`, `spec/ui/host-screens/topics-suggest.md`, `spec/ui/player-screens/topics-suggest.md`

**Проверка:**
- Unit-тесты AI client: mock fetch, формирование промптов, retry, ошибки
- E2E: полная AI-игра: лобби → topics suggest → раунды → блиц → финал
- E2E: dispute flow
- Ручной тест: прошлые вопросы исключаются при «Играть снова»

---

## Фаза 10: Транспорты (p2pt + VarHub) + Конструктор + Полировка [не готово]

**Цель:** все три транспорта, конструктор вопросов, финальная полировка.

- [ ] `src/transport/p2pt.ts` — WebRTC через p2pt, префикс `p`, reconnection
- [ ] `src/transport/varhub.ts` — WebSocket через @flinbein/varhub-web-client, префикс `v`, ws-type room, обработка таймаута
- [ ] `ConstructorPage` — ручной ввод тем/вопросов/блиц, AI-генерация, проверка ответов, экспорт JSON
- [ ] `RulesPage` — статическая страница с правилами
- [ ] WakeLock API
- [ ] Fullscreen API
- [ ] i18n: все ключи переведены на ru и en
- [ ] Responsive: проверка на min-разрешениях (1366×768 host, 375×600 player)
- [ ] Выбор транспорта в GameSetup

**Проверка:**
- Тест p2pt: обмен сообщениями между пирами
- Тест VarHub: подключение к VarHub-серверу
- Ручной тест: игра на двух устройствах через p2pt
- Ручной тест: игра через VarHub
- E2E: конструктор — ручное создание, экспорт JSON, импорт в GameSetup
- E2E: конструктор — AI-генерация
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
  │     │                       └── Фаза 8 (Финал + Dual + Полный цикл)
  │     │                             └── Фаза 9 (AI)
  │     │                                   └── Фаза 10 (Транспорты + Конструктор)
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
