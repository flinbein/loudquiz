# Phase 9.1 — AI-review + TopicsSuggest — Design Spec

Дата: 2026-04-15
Автор: Claude (brainstorming session)

## 1. Контекст

Фаза 9 декомпозирована на 4 под-фазы (см. `task/plan-01-init.md`). Этот документ описывает **9.1: AI-review + TopicsSuggest** — первую под-фазу.

Цель: в AI-режиме игры (`settings.mode === "ai"`):

- перед первым раундом игроки предлагают темы; AI генерирует темы (опционально), вопросы, блиц-задания;
- в фазе `round-review` оценки ответов проставляются автоматически через `answerCheck`, с возможностью оспорить.

Существующие спеки-опоры:
- `spec/ui/host-screens/topics-suggest.md`
- `spec/ui/player-screens/topics-suggest.md`
- `spec/game/phases.md`
- `spec/systems/ai/topic-generation.md`
- `spec/systems/ai/question-generation.md`
- `spec/systems/ai/blitz-generation.md`
- `spec/systems/ai/answer-check.md`

Уже реализовано (Фаза 8.1): `src/ai/{client,topicGeneration,questionGeneration,blitzGeneration,answerCheck}.ts`.

Reconnection — отдельный трек (`task/spec-p2pt-reconnection.md`), не входит в 9.1.

## 2. Scope

**В 9.1 входит:**
- Трёхфазный `topics-suggest` (collecting → generating → preview) со сбором стикеров, AI-генерацией тем/вопросов/блица, ручным fallback для тем.
- AI-review в `round-review`: автоматическая оценка + fallback на ручной режим по ошибке.
- UI: новые страницы-обёртки `HostTopicsSuggest`/`PlayerTopicsSuggest`, новый блок `TopicsSidebarBlock`, `TopicsBoardBlock`, общий компонент `AiErrorBanner`.
- Transport: новые `PlayerAction`-ы `no-ideas`, `start-first-round`.
- `filterStateForPlayer` расширение для новых фаз.

**Вне 9.1 (другие под-фазы 9):**
- Dual Mode (9.2): чередование команд, state filtering противника.
- Finale (9.3): статистика, финальный экран.
- Game Loop (9.4): склейка, «Играть снова».

## 3. State & Types

### `GamePhase` (src/types/game.ts)

Удаляем `"topics-suggest"`. Добавляем:

```ts
| "topics-collecting"
| "topics-generating"
| "topics-preview"
```

Обновляем `src/store/actions/lobby.ts` (строки 100, 145): `"topics-suggest"` → `"topics-collecting"`.

### `GameState.topicsSuggest` (новое поле)

```ts
interface TopicsSuggestState {
  suggestions: Record<string, string[]>;   // playerName → темы в порядке добавления
  noIdeas: string[];                        // игроки, нажавшие "Нет идей"
  timerEndsAt: number | null;               // null = таймер остановлен (manualMode или generating)
  manualTopics: string[] | null;            // null = хост не вошёл в manual; массив = хост редактирует/утвердил темы
  generationStep: "topics" | "questions" | "blitz" | "done" | null;
  aiError: { step: "topics" | "questions" | "blitz"; message: string } | null;
}

// в GameState:
topicsSuggest?: TopicsSuggestState;
```

Инициализация: при переходе `lobby → topics-collecting` хост создаёт объект с пустыми `suggestions`, `noIdeas`, `manualTopics = null`, `generationStep = null`, `aiError = null`, таймер через `createTimer(60_000)` (см. `src/logic/timer.ts`, возможно новая функция `getTopicsSuggestTimerDuration`).

После успешного завершения `topics-generating`: `state.questionsFile` заполнен; `topicsSuggest` можно очистить (или оставить для дебага — определить при имплементации).

### `RoundState.reviewResult` (расширение)

```ts
interface ReviewResult {
  // существующие поля
  evaluations: AnswerEvaluation[];
  groups: string[][];
  bonusTime: number;
  bonusTimeApplied: boolean;
  score: number;

  // новое
  aiStatus: "idle" | "loading" | "done" | "error";
  aiError?: string;
}
```

В manual-режиме `aiStatus` = `"idle"` (поведение идентично текущему).

### `PlayerAction` (src/types/transport.ts)

Добавить:
```ts
| { kind: "no-ideas" }
| { kind: "start-first-round" }
```
(`suggest-topic` и `dispute-review` уже есть.)

## 4. Flow

### 4.1 TopicsSuggest (AI-режим)

```
lobby
  └─ startGame() [mode=ai] ──→ topics-collecting
       │  таймер 60с
       │  игроки: submit-topic ×N, no-ideas
       │  хост: hostStartManualTopics → блокирует игроков, останавливает таймер
       │
       ├─ checkAutoAdvance(): все игроки дали topicCount тем ИЛИ no-ideas
       ├─ handleTimerExpiry(): таймер истёк
       └─ hostSubmitManualTopics(topics): хост ввёл вручную
                   ↓
             topics-generating
                step: "topics" (skipped если manualTopics)
                     ↓ success
                step: "questions"
                     ↓ success
                step: "blitz"
                     ↓ success
                state.questionsFile заполнен
                     ↓
             topics-preview
                TaskBoard (readonly) + кнопка "Начать раунд"
                игрок: start-first-round → teamId = player.team
                хост: startFirstRound("random") → teamId = случайная
                     ↓
             round-captain  (createNextRoundState(teamId))
```

**Ошибка AI в `topics-generating`:**
- `aiError = { step, message }`, остаёмся в фазе.
- UI `<AiErrorBanner>`:
  - `onRetry` → `retryAiStep()` — повторный вызов текущего шага.
  - `onFallback` — только если `step === "topics"`: переключает в manual-ввод тем (как `hostStartManualTopics`, но из ошибочного состояния; хост вводит темы, дальше `topics-generating` повторяется начиная с questions).

### 4.2 AI-review в round-review

```
round-answer → round-review
  │
  ├─ [mode=ai & aiStatus=idle]
  │     └─ reviewResult.aiStatus = "loading"
  │        запуск answerCheck(answers, captain, question)
  │        ↓ success
  │        reviewResult заполнен, aiStatus="done"
  │        авто-переход → round-result
  │
  ├─ [mode=ai & aiStatus=loading]  — рендер лоадера
  │
  ├─ [mode=ai & aiStatus=error]
  │     UI: <AiErrorBanner>
  │       onRetry → retryAiReview()
  │       onFallback → aiStatus="idle" → рендер manual UI (канонный flow)
  │
  └─ [mode=manual]  — существующий ручной UI (не меняется)

round-result
  └─ disputeReview()  — существующий; возвращает в round-review
       aiStatus остаётся idle → manual UI (AI не перезапускается)
```

## 5. UI

### 5.1 Новое в `src/components/*` (props-only, без стора)

**`AiErrorBanner`**
```ts
interface AiErrorBannerProps {
  message: string;
  canFallback: boolean;
  onRetry: () => void;
  onFallback?: () => void;
}
```
- Стилистика ошибки (красный акцент), две кнопки: «Повторить» и «Переключить в ручной режим» (вторая скрыта если `!canFallback`).
- Ladle story.

### 5.2 Новое в `src/pages/blocks/*` (читают стор)

**`TopicsSidebarBlock.tsx`**
- Читает `useTimer()`, `usePlayers()`, `useGameStore(s => s.topicsSuggest)`, `usePhase()`.
- `topics-collecting`: `CircleTimer` (с `timer.startedAt` + `timer.durationMs`), скрыт если `manualTopics !== null`. `PlayerStatusTable` со статусами:
  - `submitted N/topicCount` — для игроков с `suggestions[name].length` > 0 и < topicCount
  - `full` — при `length === topicCount`
  - `no-ideas` — если в `noIdeas`
  - `waiting` — иначе
- `topics-generating`: лоадер + подпись текущего шага (`generationStep`).
- `topics-preview`: простой player list без таймера.

**`TopicsBoardBlock.tsx`** (только для хоста)
- Плоский список стикеров (все предложения всех игроков) в порядке добавления.
- Контейнер с внутренним скроллом.
- Auto-scroll вниз при добавлении нового стикера, **только если** скролл уже находится у нижнего края (стандартный паттерн chat-списков).
- Стикеры цвета команды автора (используем `Sticker` компонент).

### 5.3 Переиспользуется

- **`TaskBoardBlock`** — в `HostTopicsPreview` и `PlayerTopicsPreview`. Обеспечить readonly-режим (не передавать `onSelect`). Если нужен флаг — добавить props. Перед переходом в `topics-preview` стор уже имеет `questionsFile`.
- **`CircleTimer`**, **`TimerInput`**, **`Sticker`**, **`StickerStack`**, **`PlayerStatusTable`** — из `src/components/*`.

### 5.4 Pages-обёртки

**`src/pages/topics/HostTopicsSuggest.tsx`** — switch по phase:
- `topics-collecting`:
  - `<TopicsSidebarBlock />` слева
  - `<TopicsBoardBlock />` в центре (стикеры)
  - Снизу/справа: кнопка «Ввести вручную» → `hostStartManualTopics()`; если `manualTopics !== null` — форма ввода тем (input + add + список тем + «Готово» → `hostSubmitManualTopics(topics)` + «Отмена» → `hostCancelManualTopics()`).
- `topics-generating`:
  - Центр: лоадер + текст шага
  - При `aiError`: `<AiErrorBanner canFallback={aiError.step === "topics"} onRetry={retryAiStep} onFallback={fallbackToManualTopics} />`
- `topics-preview`:
  - `<TaskBoardBlock />` (readonly)
  - Кнопка «Начать раунд» → `startFirstRound("random")`

**`src/pages/topics/PlayerTopicsSuggest.tsx`** — switch по phase:
- `topics-collecting`:
  - `<TimerInput startedAt={timer.startedAt} durationMs={timer.durationMs} />` вокруг `<input placeholder="Предложи тему">` (disabled при blocked)
  - blocked = игрок в `noIdeas` ИЛИ `manualTopics !== null` (хост перехватил) ИЛИ `suggestions[me].length === topicCount`
  - `<StickerStack>` с моими темами (readonly)
  - Кнопка «Нет идей» → `no-ideas` PlayerAction (disabled при blocked)
  - Счётчик «X / topicCount»
- `topics-generating`:
  - Лоадер «Готовим игру…» (без деталей шага — игрокам шум не нужен)
- `topics-preview`:
  - `<TaskBoardBlock />` (readonly)
  - Кнопка «Начать раунд» → `start-first-round` PlayerAction (если `player.team === "none"` — disabled)

**`PlayPage.tsx`** — добавить switch-case-ы для трёх новых фаз → роутит в `HostTopicsSuggest` / `PlayerTopicsSuggest` по host-флагу.

## 6. Actions

### 6.1 `src/store/actions/topicsSuggest.ts` (новый)

Player actions (обрабатываются на хосте после получения PlayerAction):
- `submitTopicSuggestion(playerName: string, topic: string)` — добавляет в `suggestions[playerName]` если `length < topicCount` и игрок не в `noIdeas` и `manualTopics === null`; после — `checkAutoAdvance()`.
- `playerNoIdeas(playerName: string)` — добавляет в `noIdeas` если не там; после — `checkAutoAdvance()`.
- `startFirstRound(teamId: TeamId | "random")` — только в `topics-preview`; если `teamId === "random"` — выбрать случайную из `state.teams`; если игрок с `team === "none"` прислал — игнор (в диспетчере). Создаёт `currentRound` через `createNextRoundState(teamId)`, переход в `round-captain`, таймер `getCaptainTimerDuration()`.

Host actions:
- `hostStartManualTopics()` — `manualTopics = []`, `timerEndsAt = null` (останавливает таймер-ивенты).
- `hostSubmitManualTopics(topics: string[])` — валидирует `topics.length > 0`; переходит в `topics-generating`; `generationStep = "questions"` (шаг topics пропускается, так как темы уже есть — формируем `questionsFile.topics = topics.map(t => ({ name: t, questions: [] }))`).
- `hostCancelManualTopics()` — `manualTopics = null`, возобновляет таймер с оставшимся временем (если не истёк) или сразу `handleTimerExpiry`.

Internal (вызываются хостом):
- `checkAutoAdvance()` — если все online-игроки в `noIdeas` ИЛИ дали `topicCount` тем → `startGeneration()`.
- `handleTimerExpiry()` — при истечении таймера вызывает `startGeneration()` с тем, что собрано.
- `startGeneration()` — переход в `topics-generating`, `generationStep = manualTopics ? "questions" : "topics"`, запуск AI-пайплайна (async, side-effect в hook/effect на host-стороне).
- `onAiStepSuccess(step, result)` — заполняет `questionsFile`, двигает `generationStep` или переходит в `topics-preview`.
- `onAiStepError(step, message)` — `aiError = { step, message }`.
- `retryAiStep()` — повторный вызов AI для `aiError.step`.
- `fallbackToManualTopics()` — только при `aiError.step === "topics"`: `manualTopics = []`, переход обратно в `topics-collecting` с остановленным таймером; хост вводит темы.

### 6.2 Расширение `src/store/actions/round.ts`

- `maybeStartAiReview()` — триггер: при переходе в `round-review` в mode=ai; выставляет `aiStatus="loading"`, запускает `answerCheck`.
- `onAiReviewSuccess(result)` — заполняет reviewResult, `aiStatus="done"`, вызывает существующий `confirmReview()` → `round-result`.
- `onAiReviewError(message)` — `aiStatus="error"`, `aiError=message`.
- `retryAiReview()` — повторный вызов `answerCheck`.
- `fallbackReviewToManual()` — `aiStatus="idle"`, `aiError=undefined`, UI переключается на ручной.

Существующие `confirmReview()`, `disputeReview()`, `confirmScore()` не меняем.

### 6.3 Host-side effect runner

AI-вызовы — асинхронные, запускаются только на хосте. Нужен `useEffect` в `PlayPage` (или выделенный хук `useAiOrchestrator`), который:
- Следит за `(phase, topicsSuggest?.generationStep, aiError)` — запускает соответствующий AI-модуль если ещё не запущен.
- Следит за `(phase, reviewResult?.aiStatus)` для `round-review` — запускает `answerCheck`.
- Запускается только на хосте (по флагу `isHost`).

## 7. Transport

### 7.1 Новые PlayerAction-ы
- `no-ideas`, `start-first-round` (см. §3).

### 7.2 Диспетчер на хосте (PlayPage)
Добавить case-ы:
- `suggest-topic` → `submitTopicSuggestion(playerName, text)`
- `no-ideas` → `playerNoIdeas(playerName)`
- `start-first-round` → если `player.team !== "none"` → `startFirstRound(player.team)`; иначе игнор.

### 7.3 `filterStateForPlayer` (src/store/stateFilter.ts)
- В фазах `topics-collecting/generating/preview`: `topicsSuggest.suggestions` оставлять только ключ `playerName` (остальных игроков скрывать). Остальные поля (`noIdeas`, `timerEndsAt`, `manualTopics`, `generationStep`, `aiError`) — передавать как есть.
- В `round-review` при `mode === "ai"`: пока `aiStatus !== "done"` — не раскрывать чужие `evaluations` игрокам (как существующее правило фильтрации ответов до review).

## 8. AI Integration

Все 4 AI-модуля уже реализованы (Фаза 8.1):
- `generateTopics(TopicGenerationInput): Promise<TopicGenerationResult>`
- `generateQuestions(QuestionGenerationInput): Promise<QuestionGenerationResult>`
- `generateBlitzTasks(BlitzGenerationInput): Promise<BlitzGenerationResult>`
- `checkAnswers(AnswerCheckInput): Promise<AnswerCheckResult>`

Входы берутся из стора:
- `generateTopics`: `suggestions` (flatten по всем игрокам) + `topicCount` из settings + язык.
- `generateQuestions`: `topics`, `questionsPerTopic`, `playerCount = state.players.length`.
- `generateBlitzTasks`: `blitzRoundsPerTeam × teamsCount`, `pastTasks` из `localPersistence`.
- `checkAnswers`: `answers: Record<playerName, text>`, `captainName`, `question.text`, `question.acceptedAnswers`.

Все вызовы — retry до 3 раз (уже встроено в `src/ai/client.ts` для невалидного JSON). Сетевые ошибки/таймауты пробрасываются наверх → обрабатываются через `aiError`/`aiStatus="error"`.

## 9. Testing

### 9.1 Unit (Vitest)
- `actions/topicsSuggest.test.ts`:
  - submitTopicSuggestion: лимит `topicCount`, блок при noIdeas, блок при manualMode
  - playerNoIdeas: идемпотентность
  - checkAutoAdvance: все noIdeas / все full / смешанные
  - hostStartManualTopics / Cancel / Submit
  - startFirstRound: player team → player.team; "random" → один из teams; "none" → no-op
- `actions/round.aiReview.test.ts`:
  - maybeStartAiReview: запуск только при mode=ai, idle → loading
  - onAiReviewSuccess: заполнение reviewResult + авто-переход в round-result
  - onAiReviewError: aiStatus=error
  - retryAiReview: loading повторно
  - fallbackReviewToManual: aiStatus=idle, ручной UI активен
- `store/stateFilter.test.ts` (расширение):
  - в topics-collecting: игрок видит только свои suggestions
  - в round-review ai/loading: чужие evaluations скрыты
- `logic/` чистые функции (если выделены): `shouldAutoAdvance`.

### 9.2 Integration
Мокаем все 4 AI-модуля. Прогон flow `lobby → topics-collecting → submit × N → topics-generating → topics-preview → round-captain`. Проверяем state в ключевых точках.

### 9.3 E2E (Playwright, BC transport)
- `phase9-1-ai-happy-path.spec.ts`: 3 игрока, AI mode, полная цепочка topics-suggest → один раунд → AI-review → round-result.
- `phase9-1-ai-review-dispute.spec.ts`: AI оценивает → round-result → «Оспорить» → round-review manual → confirm.
- `phase9-1-ai-fallback-topics.spec.ts`: `generateTopics` возвращает ошибку → `AiErrorBanner` → «Переключить в ручной режим» → хост вводит темы → questions/blitz генерируются → дальше работает.
- `phase9-1-ai-manual-topics.spec.ts`: хост сразу нажимает «Ввести вручную» → пропускает AI-шаг topics → AI генерирует вопросы и блиц.

### 9.4 Ladle stories
- `AiErrorBanner.stories.tsx` — состояния: только retry, retry+fallback, длинное сообщение.

## 10. Open Questions / Risks

- **Таймер и reconnect:** если хост перезагрузится во время `topics-collecting`, `timer.startedAt` (performance.now) сбросится. Решается в треке reconnection (вне 9.1), пока работаем на предположении «хост стабилен».
- **Idempotency player actions:** `start-first-round` может прилететь дважды (лаг). Действие должно быть no-op при `phase !== "topics-preview"` — уже обеспечено гвардом.
- **Очистка `topicsSuggest` после перехода в `round-captain`:** решить при имплементации — оставить для дебага или очистить (предпочтительно очистить, чтобы не раздувать state).
- **Язык генерации:** берётся из i18n/settings — уже учтено в AI-модулях Фазы 8.
- **Объём `generateQuestions`:** `topicCount × questionsPerTopic × 8` (8 уровней сложности) может быть велик для одного вызова — проверить при имплементации, при необходимости делать по топику.
