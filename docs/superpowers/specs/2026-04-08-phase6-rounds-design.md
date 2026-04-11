# Phase 6: Раунды (6 фаз) — Manual Mode, Single Team

## Контекст

Фаза 6 реализует ядро геймплея: полный цикл раунда с 6 подфазами для ручного режима (manual mode), одна команда (single mode). Хост оценивает ответы вручную, подсчёт очков по формулам из спеки.

Перед реализацией раундов необходимо расширить библиотеку компонентов: Timer, TimerButton, TimerInput, JokerState, TeamScore, ScoreFormula. Также нужно добавить drag-n-drop в StickerStack для оценки ответов хостом.

## Часть 1: Библиотека компонентов

### useCountdown (хук)

Внутренний хук, используемый всеми таймер-компонентами.

- Тикает каждую секунду
- Возвращает: `{ remaining, progress (0..1), isWarning, formatted (MM:SS) }`
- `useImperativeHandle` expose: `{ setTime(remaining: number): void }` — для синхронизации с хостом
- `warningTime` — порог, после которого `isWarning = true`

```ts
interface CountdownHandle {
  setTime(remaining: number): void;
}

interface CountdownResult {
  remaining: number;
  progress: number;      // 0..1, доля оставшегося времени
  isWarning: boolean;
  formatted: string;     // "MM:SS"
}
```

### Timer

`src/components/Timer/Timer.tsx` + `.module.css` + `.stories.tsx`

Круглая рамка с SVG-сектором, закрашивается по `progress`. Текст `MM:SS` печатным шрифтом в центре. При `remaining < warningTime`: красный текст + CSS-пульсация.

```ts
interface TimerProps {
  time: number;
  warningTime?: number;      // default 10
  ref?: Ref<CountdownHandle>;
  children?: ReactNode;       // текст под таймером
}
```

SVG: окружность + дуга (stroke-dasharray/dashoffset по progress). Пульсация через CSS keyframes `glowPulse` (скопировать из theme.css).

### TimerButton

`src/components/TimerButton/TimerButton.tsx` + `.module.css` + `.stories.tsx`

Кнопка. В правой части — текст `MM:SS` печатным шрифтом. Нижняя часть = прогресс-бар (ширина по `progress`).

```ts
interface TimerButtonProps {
  time: number;
  warningTime?: number;
  ref?: Ref<CountdownHandle>;
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}
```

Layout: flex row, `children` слева, `MM:SS` справа. Нижняя полоса `::after` с `width: progress%`.

### TimerInput

`src/components/TimerInput/TimerInput.tsx` + `.module.css` + `.stories.tsx`

Input. В правой части — таймер `MM:SS` печатным шрифтом. Нижняя часть = прогресс-бар.

```ts
interface TimerInputProps {
  time: number;
  warningTime?: number;
  ref?: Ref<CountdownHandle>;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  // + стандартные input пропсы через Omit<InputHTMLAttributes, ...>
}
```

Layout: input слева, `MM:SS` справа в одной строке. Прогресс-бар внизу.

### JokerState

`src/components/JokerState/JokerState.tsx` + `.module.css` + `.stories.tsx`

Карточка джокера с иконкой и текстом-описанием.

```ts
interface JokerStateProps {
  state: "enabled" | "disabled" | "active";
  onClick?: () => void;
}
```

- `enabled`: кликабельная, нормальный стиль, текст "Использовать джокер (×2)"
- `disabled`: серая, не кликабельная, текст "Джокер использован"
- `active`: подсвечена (свечение), текст "Джокер активирован! ×2"

### TeamScore

`src/components/TeamScore/TeamScore.tsx` + `.module.css` + `.stories.tsx`

Отображает очки одной (single) или двух (dual) команд. Лидирующая команда выделена эффектом/анимацией.

```ts
interface TeamScoreProps {
  teams: Array<{ id: string; color: TeamColor; score: number }>;
}
```

- Single mode: одна плашка с цветом команды и числом очков
- Dual mode: две плашки рядом, у лидера — свечение/масштаб
- Анимация смены очков (CSS transition на числе)

### ScoreFormula

`src/components/ScoreFormula/ScoreFormula.tsx` + `.module.css`

Рендерит формулу подсчёта очков с эмодзи-маркерами.

```ts
interface ScoreFormulaProps {
  difficulty: number;
  correctCount: number;
  jokerActive: boolean;
  bonusMultiplier: number;  // 0 если нет бонуса, иначе > 1
  totalScore: number;
}
```

Примеры рендера:
- Никто не ответил: `0 🪙`
- 4 правильных: `( 100🪙 × 4 ) = 400 🪙`
- С джокером: `( 100🪙 × 4 ) × 2🃏 = 800🪙`
- Бонус + джокер: `( 100🪙 × 4 ) × 2🃏 × 1.2⌚ = 960🪙`

### StickerStack — доработка drag-n-drop

Новые пропсы (опциональные, обратная совместимость):

```ts
interface StickerStackProps {
  stickers: ComponentProps<typeof Sticker>[];
  onClickBadge?: (index: number) => void;
  onClickSticker?: () => void;
  // Новые:
  draggable?: boolean;
  dragData?: string;
  onDrop?: (dragData: string) => void;
}
```

Изменения:
- Обёртка `.stack` рендерится даже для `stickers.length === 1` (сейчас пропускается)
- `draggable` на `.stack`: `onDragStart` (сохраняет `dragData` в `dataTransfer`), `onDragEnd`
- Drop target на `.stack`: `onDragOver` (preventDefault), `onDrop` (извлекает `dragData`, вызывает `onDrop`)
- CSS состояния: `[data-dragging]` (полупрозрачность), `[data-drop-over]` (подсветка рамки)

Sticker не меняется.

## Часть 2: Логика (чистые функции)

### phaseTransitions.ts

`src/logic/phaseTransitions.ts`

```ts
function getNextPhase(state: GameState): GamePhase
```

Логика:
- round-captain → round-pick → round-ready → round-active → round-answer → round-review
- После round-review: есть неигранные вопросы? → round-captain
- Все вопросы сыграны, есть блиц-задания? → blitz-captain (Phase 7)
- Ничего не осталось → finale

```ts
function createNextRoundState(state: GameState): RoundState
```

Создаёт RoundState для нового раунда: сбрасывает answers, timer, captain, joker.

```ts
function getPlayedQuestionIndices(history: RoundResult[]): number[]
```

Возвращает индексы уже сыгранных вопросов.

### captain.ts

`src/logic/captain.ts`

```ts
function canBeCaptain(playerName: string, history: RoundResult[]): boolean
```

Нельзя быть капитаном два раунда подряд. Допускается: A, B, A, B (чередование).

```ts
function getRandomCaptain(
  teamPlayers: PlayerData[],
  history: RoundResult[]
): string
```

Случайный выбор из подходящих игроков при timeout.

```ts
function getEligibleCaptains(
  teamPlayers: PlayerData[],
  history: RoundResult[]
): PlayerData[]
```

### scoring.ts

`src/logic/scoring.ts`

Формулы из спеки:

```ts
function calculateRoundScore(
  difficulty: number,
  correctCount: number,
  jokerActive: boolean,
  bonusMultiplier: number,  // 0 если нет бонуса
): number
```

`score = difficulty × correctCount × jokerMul × bonusMul`

- `jokerMul` = 2 если joker, иначе 1
- `bonusMul` = `bonusMultiplier` если > 0, иначе 1

```ts
function calculateBonusMultiplier(
  bonusTime: number,
  totalTime: number,
): number
```

`1 + bonusTime / totalTime`. Возвращает 0 если условия бонуса не выполнены.

```ts
function hasBonusTime(
  answers: Record<string, PlayerAnswer>,
  evaluations: AnswerEvaluation[],
  respondersCount: number,
  timerDuration: number,
): { hasBounus: boolean; bonusTime: number }
```

Условия бонуса:
1. Все ответы правильные
2. Все ответы уникальные (нет объединённых групп > 1)
3. Все респондеры ответили во время active-фазы

### timer.ts

`src/logic/timer.ts`

Формулы длительности:

```ts
function getCaptainTimerDuration(): number     // 60
function getPickTimerDuration(): number        // 60
function getActiveTimerDuration(respondersCount: number): number  // 50 + 5 × respondersCount
function getAnswerTimerDuration(): number      // 20
```

```ts
function createTimer(duration: number): TimerState  // { startedAt: Date.now(), duration }
function getRemainingTime(timer: TimerState): number
```

## Часть 2.5: Изменения в модели стора

### AnswerEvaluation — tri-state

Текущая модель `correct: boolean` не поддерживает состояние "не проверено". Изменение:

```ts
interface AnswerEvaluation {
  playerName: string;
  correct: boolean | null;  // null = не проверено, true = верно, false = неверно
  aiComment?: string;
}
```

### ReviewResult — инкрементальная сборка

`ReviewResult` инициализируется при входе в round-review (не при подтверждении):

```ts
// Начальное состояние при входе в round-review:
{
  evaluations: [
    // для каждого ответившего (text !== ""):
    { playerName, correct: null },
    // для каждого сдавшегося (text === ""):
    { playerName, correct: false },
  ],
  groups: [[playerA], [playerB], ...],  // каждый в своей группе
  score: 0,           // рассчитывается при confirmReview
  jokerApplied: false,
}
```

Хост обновляет `evaluations` и `groups` кликами/drag-n-drop. При `confirmReview()` — финальный расчёт `score`.

### Статусы игроков — логика определения

Статус игрока вычисляется из данных стора (чистая функция):

```ts
function getPlayerRoundStatus(state: GameState, playerName: string): PlayerRoundStatus
```

- round-active/answer: `answers[name]` существует? → text пустой = "сдался" (❌), иначе "ответил" (✔️)
- round-review: `reviewResult.evaluations[name].correct` — null=не проверено, true=✅, false=❌

## Часть 3: Store actions

### round.ts

`src/store/actions/round.ts`

Все действия по паттерну lobby.ts: read state → validate → setState.

**claimCaptain(playerName: string)**
- Проверяет: phase === "round-captain", игрок в активной команде, canBeCaptain
- Устанавливает `currentRound.captainName`
- Переход: round-captain → round-pick, запуск pick timer

**selectQuestion(topicIndex: number, questionIndex: number)**
- Проверяет: phase === "round-pick", вызывающий — капитан, вопрос не сыгран
- Конвертирует `(topicIndex, questionIndex)` в линейный индекс: `sum(topics[0..topicIndex-1].length) + questionIndex`
- Устанавливает `currentRound.questionIndex` (линейный индекс по всем темам)
- Переход: round-pick → round-ready

**activateJoker()**
- Проверяет: phase === "round-pick", джокер не использован командой
- Устанавливает `currentRound.jokerActive = true`
- Не меняет фазу (остаёмся в round-pick)

**setPlayerReady(playerName: string)**
- Проверяет: phase === "round-ready", игрок в активной команде
- Устанавливает `ready = true` для игрока
- Когда все ready → round-ready → round-active, запуск active timer

**submitAnswer(playerName: string, text: string)**
- Проверяет: phase === "round-active" или "round-answer", игрок — респондер (не капитан)
- Сохраняет `{ text, timestamp: Date.now() }` в `currentRound.answers`
- Пустой text = "сдался"
- Не меняет фазу (ожидаем таймер или когда все ответят)

**handleTimerExpire(phase: GamePhase)**
- round-captain timeout → getRandomCaptain, переход в round-pick
- round-active → round-answer, запуск answer timer
- round-answer → round-review
- round-pick timeout → если вопрос не выбран, выбрать случайный

**evaluateAnswer(playerName: string, correct: boolean)**
- Проверяет: phase === "round-review"
- Обновляет оценку в `currentRound.reviewResult.evaluations`

**mergeAnswers(sourceGroup: string, targetGroup: string)**
- Объединяет две группы стикеров в одну
- Объединённая группа автоматически "верно"

**splitAnswer(playerName: string)**
- Извлекает игрока из группы в отдельную группу

**confirmReview()**
- Подсчитывает очки по формуле
- Сохраняет RoundResult в `history[]`
- Обновляет `teams[].score`
- Вызывает `getNextPhase()` для перехода

## Часть 4: Хост — UI раундов

### HostRound

`src/pages/round/HostRound.tsx` + `HostRound.module.css`

Один файл, switch по `phase`. Двухколоночный layout по паттерну HostLobby:
- Левая колонка (flex: 1): основной контент
- Правая колонка (sidebar 320px): TeamScore вверху, TeamGroup с PlayerStatusTable, Timer с текстом фазы

#### Левая колонка по фазам:

**round-captain:**
- TaskView (compact, конверты неактивны)
- JokerState(disabled)
- Текст: "Ожидание выбора капитана..."

**round-pick:**
- TaskView (конверты кликабельны для капитана — тут хост видит то же, показывает зрителям)
- JokerState(enabled или disabled если уже использован)

**round-ready:**
- TaskCard (текст скрыт)
- Текст: "Ожидание готовности игроков... (3/5)"

**round-active:**
- TaskCard (текст скрыт)
- StickerStack[] — по одному на каждый ответ (текст скрыт, placeholder)
- Индикатор: "Ответили: 2/4"

**round-answer:**
- TaskCard (текст скрыт)
- StickerStack[] — ответы (текст скрыт)

**round-review, подфаза "оценка":**
- TaskCard (текст открыт)
- StickerStack[] — drag-n-drop, клик для toggle оценки
- Кнопка [Далее]

**round-review, подфаза "подсчёт":**
- TaskCard (текст открыт)
- StickerStack[] — с штампами оценок
- ScoreFormula — визуальная формула
- Кнопки: [Оспорить] (возврат к оценке), [Следующий раунд]

#### Правая колонка (все фазы):
- TeamScore (вверху)
- Timer(children = текст фазы: "Выбор капитана", "Выбор вопроса", и т.д.)
- TeamGroup + PlayerStatusTable (статусы по фазе)

### Статусы игроков в PlayerStatusTable по фазам:

| Фаза          | Капитан          | Респондер (не ответил) | Респондер (ответил)                              |
|---------------|------------------|------------------------|--------------------------------------------------|
| round-captain | 👑 (если выбран) | ⏳                      | ⏳                                                |
| round-pick    | 👑 выбирает      | ⏳                      | ⏳                                                |
| round-ready   | 👑               | ⏳ / ✔️ (готов)         | ⏳ / ✔️                                           |
| round-active  | 👑 объясняет     | ✏️ (typing)            | ✔️ ответил / ❌ сдался                            |
| round-answer  | 👑               | ✏️                     | ✔️ не проверено / ❌ сдался                       |
| round-review  | 👑               |                        | ✅ верно / ❌ неверно или сдался                   |

## Часть 5: Игроки — UI раундов

### PlayerRound

`src/pages/round/PlayerRound.tsx` + `PlayerRound.module.css`

Один файл, switch по `phase` × роль (капитан / респондер).

#### round-captain (все игроки команды):
- TimerButton [Буду капитаном!]
- Текст: "Нажмите, чтобы стать капитаном"

#### round-pick:
- **Капитан:** TaskView (кликабельные конверты) + JokerState
- **Респондер:** Текст "Капитан выбирает вопрос..."

#### round-ready:
- **Капитан:** TaskCard (текст скрыт) + кнопка [Я готов]
- **Респондер:** TaskCard (текст скрыт) + кнопка [Я готов]

#### round-active:
- **Капитан:** TaskCard (текст ОТКРЫТ) + подсказка "Объясняйте жестами!"
- **Респондер (не ответил):** TimerInput + [Отправить] + [Сдаюсь]
- **Респондер (ответил):** Sticker со своим ответом
- **Респондер (сдался):** Текст "Вы не дали ответ"

#### round-answer:
- **Капитан:** TaskCard (открыт) + ожидание
- **Респондер (не ответил):** TimerInput + [Отправить] + [Сдаюсь]
- **Респондер (ответил/сдался):** то же что round-active

#### round-review:
- TaskCard (текст открыт всем)
- Свой стикер с ответом (если отвечал)
- Когда хост подсчитал:
  - Общее количество баллов за раунд
  - Кнопки [Оспорить] [Следующий раунд]

## Часть 6: Интеграция

### PlayPage.tsx

Обновить switch по фазе: если `phase` начинается с `round-` → рендерить `HostRound` / `PlayerRound`.

### useTransport.ts

`onHostAction` handler — добавить обработку round-related PlayerAction:
- `claim-captain` → `claimCaptain(playerName)`
- `select-question` → `selectQuestion(topicIndex, questionIndex)`
- `activate-joker` → `activateJoker()`
- `submit-answer` → `submitAnswer(playerName, text)`

Новые PlayerAction kind (если не хватает):
- `set-ready` — уже есть, переиспользуем для round-ready

### i18n

Добавить ключи в `ru.json` и `en.json`:
- `round.captain.*` — фаза выбора капитана
- `round.pick.*` — фаза выбора вопроса
- `round.ready.*` — фаза готовности
- `round.active.*` — активная фаза
- `round.answer.*` — фаза ответов
- `round.review.*` — фаза ревью
- `timer.*` — подписи фаз для Timer
- `joker.*` — текст джокера
- `score.*` — подсчёт очков

## Часть 7: Тестирование

### Unit-тесты:
- `scoring.test.ts`: all-correct-unique, partial, joker, zero-bonus, bonus time calculation (~8 тестов)
- `captain.test.ts`: eligibility, consecutive rule, random fallback (~5 тестов)
- `phaseTransitions.test.ts`: round flow, next round, transition to blitz/finale (~6 тестов)
- `round.test.ts` (actions): claimCaptain, selectQuestion, submitAnswer, evaluateAnswer, mergeAnswers, splitAnswer, confirmReview (~15 тестов)

### Ladle stories:
- Timer: различные значения времени, warning state
- TimerButton: normal, disabled, warning
- TimerInput: normal, с текстом, warning
- JokerState: enabled, disabled, active
- TeamScore: single, dual, лидер
- ScoreFormula: все варианты формул
- StickerStack: drag-n-drop (визуальная демо)

### Проверки:
- `tsc --noEmit` без ошибок
- Все тесты проходят
- `vite build` успешна
- Ladle показывает все новые компоненты

## Файлы для создания/изменения

### Новые файлы:
- `src/hooks/useCountdown.ts`
- `src/components/Timer/Timer.tsx`, `.module.css`, `.stories.tsx`
- `src/components/TimerButton/TimerButton.tsx`, `.module.css`, `.stories.tsx`
- `src/components/TimerInput/TimerInput.tsx`, `.module.css`, `.stories.tsx`
- `src/components/JokerState/JokerState.tsx`, `.module.css`, `.stories.tsx`
- `src/components/TeamScore/TeamScore.tsx`, `.module.css`, `.stories.tsx`
- `src/components/ScoreFormula/ScoreFormula.tsx`, `.module.css`
- `src/logic/phaseTransitions.ts`, `.test.ts`
- `src/logic/captain.ts`, `.test.ts`
- `src/logic/scoring.ts`, `.test.ts`
- `src/logic/timer.ts`
- `src/store/actions/round.ts`, `.test.ts`
- `src/pages/round/HostRound.tsx`, `.module.css`
- `src/pages/round/PlayerRound.tsx`, `.module.css`

### Изменяемые файлы:
- `src/components/StickerStack/StickerStack.tsx` — drag-n-drop
- `src/components/StickerStack/StickerStack.module.css` — drag/drop стили
- `src/components/StickerStack/StickerStack.stories.tsx` — drag stories
- `src/pages/PlayPage.tsx` — добавить round rendering
- `src/hooks/useTransport.ts` — обработка round actions
- `src/i18n/ru.json`, `src/i18n/en.json` — новые ключи
- `src/types/transport.ts` — новые PlayerAction если нужны
