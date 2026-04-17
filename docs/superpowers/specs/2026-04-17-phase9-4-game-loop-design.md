# Phase 9.4: Game Loop — Design Spec

## Goal

Wire the full game cycle end-to-end and implement "Play Again" for AI mode.

## Scope

1. **Full game loop verification**: lobby -> (topics-suggest in AI mode) -> round x N -> blitz x N -> finale
2. **"Play Again" (AI mode only)**: from finale back to topics-collecting, keeping players and settings
3. **"New Game" (always)**: host navigates to /setup, full reset
4. **Used questions/blitz persistence**: save to localStorage so AI doesn't repeat them

## 1. Persistence — Used Questions

### localStorage format

Key: `loud-quiz-used-questions`
Value: `Record<string, string[]>` — topics map to question texts.

```json
{
  "Animals": ["Question about cats", "Question about dogs"],
  "Music": ["Question about jazz"]
}
```

### API in `localPersistence.ts`

| Function | Signature | Description |
|---|---|---|
| `getUsedQuestionsByTopic` | `(): Record<string, string[]>` | Returns all used questions grouped by topic |
| `getUsedQuestionsTopics` | `(): string[]` | Returns list of topic names |
| `addUsedQuestion` | `(topic: string, questionText: string): void` | Appends one question to a topic (deduplicates) |
| `setUsedQuestionsTopic` | `(topic: string, questions: string[]): void` | Overwrites questions for a topic |
| `clearUsedQuestionsTopic` | `(topic: string): void` | Removes a topic entirely |
| `clearUsedQuestions` | `(): void` | Clears everything (already exists, update key) |

### Save moment

In `selectQuestion()` (`store/actions/round.ts`): after successful pick, resolve topic name via `getTopicIndexForQuestion()` -> `topics[topicIndex].name`, get question text, call `addUsedQuestion(topicName, questionText)`.

## 2. Persistence — Used Blitz Tasks

### localStorage format

Key: `loud-quiz-used-blitz-tasks`
Value: `string[]` — flat list of blitz item texts.

### API in `localPersistence.ts`

| Function | Signature | Description |
|---|---|---|
| `getUsedBlitzTasks` | `(): string[]` | Returns flat list |
| `addUsedBlitzTasks` | `(tasks: string[]): void` | Appends, deduplicates |
| `setUsedBlitzTasks` | `(tasks: string[]): void` | Overwrites entire list |
| `clearUsedBlitzTasks` | `(): void` | Clears |

### Save moment

In `selectBlitzItem()` (`store/actions/blitz.ts`): when captain picks a task, collect ALL `items` from ALL currently unplayed blitz tasks (not just the selected one) and call `addUsedBlitzTasks(allItems)`. This ensures all visible options are marked as used.

## 3. AI Orchestrator Integration

In `useAiOrchestrator`:
- Question generation for topic X: `pastQuestions = getUsedQuestionsByTopic()[topicName] ?? []`
- Blitz generation: `pastTasks = getUsedBlitzTasks()`

The field `settings.pastQuestions` is no longer used at runtime for AI generation. Leave the field in the type for backward compatibility but don't populate it.

## 4. Action: `playAgain()`

### New PlayerAction

```typescript
| { kind: "play-again" }
```

Added to `PlayerAction` union in `types/transport.ts`.

### Function `playAgain()` in `store/actions/lobby.ts`

Guard: `state.phase === "finale" && state.settings.mode === "ai"`.

Preserves:
- `players` (names, emojis, teams, online status) — resets `ready: false`
- `settings` (mode, teamMode, topicCount, questionsPerTopic, blitzRoundsPerTeam)
- `teams` (ids) — resets `score: 0`, `jokerUsed: false`

Resets:
- `history: []`
- `currentRound: null`
- `timer` — new timer for topics-collecting
- `topics: []`
- `blitzTasks: []`
- `topicsSuggest` — fresh state (same as in `startGame` for AI mode)

Sets `phase: "topics-collecting"`.

### Host action handler

In `PlayPage.tsx` `onHostAction`:
```
case "play-again":
  playAgain();
  break;
```

## 5. UI — Finale Buttons

### HostFinale

- Button "Play again same roster" (`finale.playAgain`) — calls `playAgain()` directly. Visible only when `settings.mode === "ai"`.
- Button "New game" (`finale.newGame`) — navigates to `/setup`, calls `resetGame()`. Always visible.

### PlayerFinale

- Button "Play again same roster" (`finale.playAgain`) — sends `{ kind: "play-again" }`. Visible only when `settings.mode === "ai"`.
- No "New game" button — player is not the host.

### SidebarBlock

For `phase === "finale"`:
- Button "Play again same roster" — calls `playAgain()`. Visible only when `settings.mode === "ai"`.
- Button "New game" — calls `resetGame()` then `navigate("/setup")`. Always visible.

### i18n keys

- `finale.playAgain`: ru "Play again same roster" / en "Play again same roster"
- `finale.newGame`: ru "New game" / en "New game"

(Actual Russian translations: "Играть снова тем же составом" / "Новая игра")

## 6. Files Changed

| File | Change |
|---|---|
| `src/persistence/localPersistence.ts` | New used questions API (by-topic), new used blitz tasks API |
| `src/types/transport.ts` | Add `play-again` to PlayerAction union |
| `src/store/actions/round.ts` | In `selectQuestion()`: call `addUsedQuestion()` |
| `src/store/actions/blitz.ts` | In `selectBlitzItem()`: call `addUsedBlitzTasks()` |
| `src/store/actions/lobby.ts` | New `playAgain()` function |
| `src/hooks/useAiOrchestrator.ts` | Read from localStorage instead of `settings.pastQuestions` |
| `src/pages/PlayPage.tsx` | Handle `play-again` action |
| `src/pages/finale/HostFinale.tsx` | Add playAgain + newGame buttons |
| `src/pages/finale/PlayerFinale.tsx` | Add playAgain button (AI mode only) |
| `src/pages/blocks/SidebarBlock.tsx` | Add finale actions |
| `src/i18n/ru.json` | Add `finale.playAgain`, `finale.newGame` |
| `src/i18n/en.json` | Add `finale.playAgain`, `finale.newGame` |
| `src/persistence/persistence.test.ts` | Tests for new persistence API |

## 7. Out of Scope

- Topics persistence (AI can reuse topics freely)
- E2E tests (playwright infrastructure not in repo)
- Manual mode "play again" (user must load new JSON)
- Cleanup of `settings.pastQuestions` field from types
