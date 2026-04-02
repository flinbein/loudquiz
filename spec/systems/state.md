# Управление состоянием

Zustand store — единый источник состояния игры.

## Архитектура

Host владеет каноническим состоянием игры. Player получает
обновления через [транспортный слой](transport/README.md).

```
Host (Zustand store) ──broadcast──→ Player 1 (Zustand store)
                      ──broadcast──→ Player 2 (Zustand store)
                      ──broadcast──→ Player N (Zustand store)

Player ──action──→ Host ──обновление──→ broadcast
```

### Поток данных

1. **Player** отправляет действие (action) через транспорт.
2. **Host** получает действие, обновляет свой store.
3. **Host** рассылает обновлённое состояние всем player.
4. **Player** обновляет свой локальный store.

## Структура состояния

```typescript
interface GameState {
  // Фаза игры
  phase: GamePhase;

  // Настройки
  settings: GameSettings;

  // Игроки
  players: PlayerData[];

  // Команды
  teams: TeamData[];

  // Задания
  topics: Topic[];
  blitzTasks: BlitzTask[];

  // Текущий раунд
  currentRound: RoundState | null;

  // История раундов
  history: RoundResult[];

  // Таймеры
  timer: TimerState | null;
}
```

### GameSettings

Настройки игры. Сохраняются между раундами и при рестарте («Играем ещё раз»).

```typescript
interface GameSettings {
  mode: "manual" | "ai";
  teamMode: "single" | "dual";
  topicCount: number;            // количество тем (default 3)
  questionsPerTopic: number;     // вопросов на тему (default 4)
  blitzRoundsPerTeam: number;    // блиц-раундов на команду (default 2)
  pastQuestions: string[];       // ранее использованные вопросы
}
```

### PlayerData

```typescript
interface PlayerData {
  name: string;         // уникальный ID игрока
  emoji: string;        // эмодзи-иконка
  team: string;         // идентификатор команды
  online: boolean;      // статус подключения
  ready: boolean;       // готовность в lobby
}
```

### TeamData

```typescript
interface TeamData {
  id: string;
  color: "red" | "blue" | "beige";
  score: number;
  jokerUsed: boolean;
}
```

### RoundState

Текущий раунд. Существует только во время активного раунда (`currentRound`).

```typescript
interface RoundState {
  type: "round" | "blitz";
  teamId: string;
  captainName: string;
  questionIndex?: number;        // индекс вопроса (round)
  blitzTaskId?: string;          // ID блиц-задания (blitz)
  blitzItemIndex?: number;       // индекс выбранного слова (blitz)
  jokerActive: boolean;
  playerOrder?: string[];        // очерёдность игроков (blitz)
  answers: Record<string, PlayerAnswer>;
  bonusTime: number;             // оставшееся время active-фазы (мс)
  reviewResult?: ReviewResult;   // результат проверки (после review)
}

interface PlayerAnswer {
  text: string;
  timestamp: number;             // время ответа (мс, от начала active-фазы)
}
```

### ReviewResult

Результат проверки ответов. Единый формат для ручного и AI-режима.
В ручном режиме поля `comment` и `aiComment` остаются пустыми.

```typescript
interface ReviewResult {
  evaluations: AnswerEvaluation[];
  groups: string[][];            // группы объединённых ответов (имена игроков)
  comment?: string;              // комментарий AI к раунду
  score: number;                 // баллы за раунд (до джокера)
  jokerApplied: boolean;         // был ли применён джокер
}

interface AnswerEvaluation {
  playerName: string;
  correct: boolean;
  aiComment?: string;            // комментарий AI к ответу
}
```

### RoundResult

Запись в историю после завершения раунда.

```typescript
interface RoundResult {
  type: "round" | "blitz";
  teamId: string;
  captainName: string;
  questionIndex?: number;
  blitzTaskId?: string;
  score: number;                 // итоговые баллы (с учётом джокера)
  jokerUsed: boolean;
}
```

### TimerState

```typescript
interface TimerState {
  startedAt: number;             // timestamp начала
  duration: number;              // длительность (мс)
}
```

## Синхронизация

### Что синхронизируется

Host отправляет player **полное состояние** при каждом значимом изменении.
Это упрощает логику переподключения — player просто применяет последнее
полученное состояние.

### Приватные данные

Некоторые данные не должны попадать ко всем player:

- Текст вопроса в round-active — виден только капитану.
  В dual mode — также виден противникам.
  В single mode — виден только капитану.
- Блиц-задания в blitz-pick — видны только капитану.
- Ответы других игроков — скрыты до round-review.

Host фильтрует состояние перед отправкой каждому player индивидуально.

## Переподключение

- `PlayerData.name` — уникальный идентификатор игрока.
- Новое подключение с тем же именем **вытесняет предыдущее**
  (механизм переподключения).
- При переподключении player получает полное текущее состояние от host.
- Защита от злоупотреблений не предусмотрена (игра для дружной компании).
- После начала игры новые игроки не допускаются. Допускается только
  переподключение существующих.

## См. также

- [Глоссарий](../game/glossary.md)
- [Транспортный слой](transport/README.md)
- [Персистентность](persistence.md)
- [Тестирование](testing.md)
- [Фазы игры](../game/phases.md)
