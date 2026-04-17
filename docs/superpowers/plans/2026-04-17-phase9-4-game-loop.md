# Phase 9.4: Game Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the full game cycle (lobby → rounds → blitz → finale), implement "Play Again" for AI mode, and persist used questions/blitz tasks so AI doesn't repeat them.

**Architecture:** Extend `localPersistence.ts` with topic-grouped question storage and flat blitz task storage. Add `playAgain()` action that resets game state while preserving players/settings/teams. Wire finale UI buttons for both host and players.

**Tech Stack:** React, Zustand, TypeScript, localStorage, i18next, Vitest

---

## File Structure

| File | Role |
|---|---|
| `src/persistence/localPersistence.ts` | Add used-questions-by-topic API + used-blitz-tasks API |
| `src/persistence/persistence.test.ts` | Tests for new persistence functions |
| `src/store/actions/round.ts` | Save used question on select |
| `src/store/actions/blitz.ts` | Save used blitz tasks on select |
| `src/hooks/useAiOrchestrator.ts` | Read used questions/blitz from localStorage |
| `src/types/transport.ts` | Add `play-again` PlayerAction |
| `src/store/actions/lobby.ts` | Add `playAgain()` function |
| `src/store/actions/lobby.test.ts` | Tests for `playAgain()` |
| `src/pages/PlayPage.tsx` | Handle `play-again` action |
| `src/pages/finale/HostFinale.tsx` | Add playAgain + newGame buttons |
| `src/pages/finale/PlayerFinale.tsx` | Add playAgain button (AI mode) |
| `src/pages/blocks/SidebarBlock.tsx` | Add finale sidebar actions |
| `src/i18n/ru.json` | Add `finale.playAgain`, `finale.newGame` keys |
| `src/i18n/en.json` | Add `finale.playAgain`, `finale.newGame` keys |

---

### Task 1: Used Questions Persistence (by topic)

**Files:**
- Modify: `src/persistence/localPersistence.ts:7` (KEYS), `src/persistence/localPersistence.ts:75-95` (replace old usedQuestions functions)
- Test: `src/persistence/persistence.test.ts`

- [ ] **Step 1: Write failing tests for used-questions-by-topic API**

Add a new `describe` block in `src/persistence/persistence.test.ts`. Replace the old import `getUsedQuestions, addUsedQuestions, clearUsedQuestions` with new imports:

```typescript
import {
  getUsedQuestionsByTopic,
  getUsedQuestionsTopics,
  addUsedQuestion,
  setUsedQuestionsTopic,
  clearUsedQuestionsTopic,
  clearUsedQuestions,
} from "./localPersistence";
```

Replace the old `"used questions: add, get, clear"` test with:

```typescript
  describe("used questions by topic", () => {
    it("returns empty record initially", () => {
      expect(getUsedQuestionsByTopic()).toEqual({});
      expect(getUsedQuestionsTopics()).toEqual([]);
    });

    it("addUsedQuestion appends to topic", () => {
      addUsedQuestion("Animals", "Name a cat breed");
      addUsedQuestion("Animals", "Name a dog breed");
      addUsedQuestion("Music", "Name a jazz artist");

      expect(getUsedQuestionsByTopic()).toEqual({
        Animals: ["Name a cat breed", "Name a dog breed"],
        Music: ["Name a jazz artist"],
      });
      expect(getUsedQuestionsTopics()).toEqual(["Animals", "Music"]);
    });

    it("addUsedQuestion deduplicates within topic", () => {
      addUsedQuestion("Animals", "Name a cat breed");
      addUsedQuestion("Animals", "Name a cat breed");
      expect(getUsedQuestionsByTopic()).toEqual({
        Animals: ["Name a cat breed"],
      });
    });

    it("setUsedQuestionsTopic overwrites topic questions", () => {
      addUsedQuestion("Animals", "Old question");
      setUsedQuestionsTopic("Animals", ["New question 1", "New question 2"]);
      expect(getUsedQuestionsByTopic()).toEqual({
        Animals: ["New question 1", "New question 2"],
      });
    });

    it("clearUsedQuestionsTopic removes one topic", () => {
      addUsedQuestion("Animals", "Q1");
      addUsedQuestion("Music", "Q2");
      clearUsedQuestionsTopic("Animals");
      expect(getUsedQuestionsByTopic()).toEqual({ Music: ["Q2"] });
      expect(getUsedQuestionsTopics()).toEqual(["Music"]);
    });

    it("clearUsedQuestions removes all", () => {
      addUsedQuestion("Animals", "Q1");
      addUsedQuestion("Music", "Q2");
      clearUsedQuestions();
      expect(getUsedQuestionsByTopic()).toEqual({});
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/persistence/persistence.test.ts`
Expected: FAIL — new functions not exported yet

- [ ] **Step 3: Implement used-questions-by-topic API**

In `src/persistence/localPersistence.ts`, the KEYS object already has `usedQuestions: "loud-quiz-used-questions"`. Keep the same key but change the stored format from `string[]` to `Record<string, string[]>`.

Replace the entire "Used questions" section (lines 75–95) with:

```typescript
// Used questions (grouped by topic)

export function getUsedQuestionsByTopic(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(KEYS.usedQuestions);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Record<string, string[]>;
  } catch {
    return {};
  }
}

export function getUsedQuestionsTopics(): string[] {
  return Object.keys(getUsedQuestionsByTopic());
}

export function addUsedQuestion(topic: string, questionText: string): void {
  const all = getUsedQuestionsByTopic();
  const existing = all[topic] ?? [];
  if (existing.includes(questionText)) return;
  all[topic] = [...existing, questionText];
  localStorage.setItem(KEYS.usedQuestions, JSON.stringify(all));
}

export function setUsedQuestionsTopic(topic: string, questions: string[]): void {
  const all = getUsedQuestionsByTopic();
  all[topic] = questions;
  localStorage.setItem(KEYS.usedQuestions, JSON.stringify(all));
}

export function clearUsedQuestionsTopic(topic: string): void {
  const all = getUsedQuestionsByTopic();
  delete all[topic];
  localStorage.setItem(KEYS.usedQuestions, JSON.stringify(all));
}

export function clearUsedQuestions(): void {
  localStorage.removeItem(KEYS.usedQuestions);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/persistence/persistence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/persistence/localPersistence.ts src/persistence/persistence.test.ts
git commit -m "feat: used questions persistence grouped by topic"
```

---

### Task 2: Used Blitz Tasks Persistence

**Files:**
- Modify: `src/persistence/localPersistence.ts:7` (add key to KEYS)
- Test: `src/persistence/persistence.test.ts`

- [ ] **Step 1: Write failing tests for used-blitz-tasks API**

Add imports to `src/persistence/persistence.test.ts`:

```typescript
import {
  getUsedBlitzTasks,
  addUsedBlitzTasks,
  setUsedBlitzTasks,
  clearUsedBlitzTasks,
} from "./localPersistence";
```

Add a new `describe` block:

```typescript
  describe("used blitz tasks", () => {
    it("returns empty array initially", () => {
      expect(getUsedBlitzTasks()).toEqual([]);
    });

    it("addUsedBlitzTasks appends and deduplicates", () => {
      addUsedBlitzTasks(["apple", "banana"]);
      addUsedBlitzTasks(["banana", "cherry"]);
      expect(getUsedBlitzTasks()).toEqual(["apple", "banana", "cherry"]);
    });

    it("setUsedBlitzTasks overwrites", () => {
      addUsedBlitzTasks(["apple", "banana"]);
      setUsedBlitzTasks(["cherry", "date"]);
      expect(getUsedBlitzTasks()).toEqual(["cherry", "date"]);
    });

    it("clearUsedBlitzTasks removes all", () => {
      addUsedBlitzTasks(["apple"]);
      clearUsedBlitzTasks();
      expect(getUsedBlitzTasks()).toEqual([]);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/persistence/persistence.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 3: Implement used-blitz-tasks API**

In `src/persistence/localPersistence.ts`, add to KEYS:

```typescript
  usedBlitzTasks: "loud-quiz-used-blitz-tasks",
```

Add after the used questions section:

```typescript
// Used blitz tasks (flat list of item texts)

export function getUsedBlitzTasks(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.usedBlitzTasks);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function addUsedBlitzTasks(tasks: string[]): void {
  const existing = getUsedBlitzTasks();
  const merged = [...new Set([...existing, ...tasks])];
  localStorage.setItem(KEYS.usedBlitzTasks, JSON.stringify(merged));
}

export function setUsedBlitzTasks(tasks: string[]): void {
  localStorage.setItem(KEYS.usedBlitzTasks, JSON.stringify(tasks));
}

export function clearUsedBlitzTasks(): void {
  localStorage.removeItem(KEYS.usedBlitzTasks);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/persistence/persistence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/persistence/localPersistence.ts src/persistence/persistence.test.ts
git commit -m "feat: used blitz tasks persistence"
```

---

### Task 3: Save Used Question on Select

**Files:**
- Modify: `src/store/actions/round.ts:24-37` (`selectQuestion` function)

- [ ] **Step 1: Add import to round.ts**

At the top of `src/store/actions/round.ts`, add:

```typescript
import { addUsedQuestion } from "@/persistence/localPersistence";
```

- [ ] **Step 2: Save question text in `selectQuestion()`**

In `src/store/actions/round.ts`, inside `selectQuestion()`, after the guard checks pass (after `if (played.includes(linearIndex)) return;`) and before `setState`, add:

```typescript
  // Persist used question for AI deduplication
  const topicIndex = getTopicIndexForQuestion(linearIndex, state.topics);
  const topic = state.topics[topicIndex];
  if (topic) {
    let remaining = linearIndex;
    for (let i = 0; i < topicIndex; i++) {
      remaining -= state.topics[i]!.questions.length;
    }
    const question = topic.questions[remaining];
    if (question) {
      addUsedQuestion(topic.name, question.text);
    }
  }
```

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: PASS (no behavior change in tests — localStorage call is a side effect)

- [ ] **Step 4: Commit**

```bash
git add src/store/actions/round.ts
git commit -m "feat: persist used question on select"
```

---

### Task 4: Save Used Blitz Tasks on Select

**Files:**
- Modify: `src/store/actions/blitz.ts:93-111` (`selectBlitzItem` function)

- [ ] **Step 1: Add import to blitz.ts**

At the top of `src/store/actions/blitz.ts`, add:

```typescript
import { addUsedBlitzTasks } from "@/persistence/localPersistence";
import { getPlayedBlitzTaskIds } from "@/logic/phaseTransitions";
```

- [ ] **Step 2: Save all unplayed blitz task items in `selectBlitzItem()`**

In `src/store/actions/blitz.ts`, inside `selectBlitzItem()`, after `if (itemIndex < 0 || itemIndex >= task.items.length) return;` and before `setState`, add:

```typescript
  // Persist all unplayed blitz task items for AI deduplication
  const playedIds = new Set(getPlayedBlitzTaskIds(state.history));
  const allItems = state.blitzTasks
    .filter((_, i) => !playedIds.has(i))
    .flatMap((t) => t.items.map((item) => item.text));
  addUsedBlitzTasks(allItems);
```

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run src/store/actions/blitz.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/store/actions/blitz.ts
git commit -m "feat: persist used blitz tasks on select"
```

---

### Task 5: AI Orchestrator — Read from localStorage

**Files:**
- Modify: `src/hooks/useAiOrchestrator.ts:19,129-138,147-155`

- [ ] **Step 1: Add imports**

In `src/hooks/useAiOrchestrator.ts`, update the import from `localPersistence`:

```typescript
import { getApiKey, getUsedQuestionsByTopic, getUsedBlitzTasks } from "@/persistence/localPersistence";
```

- [ ] **Step 2: Use `getUsedQuestionsByTopic()` for question generation**

In the `step === "questions"` block (around line 129), replace:

```typescript
                pastQuestions: state.settings.pastQuestions,
```

with:

```typescript
                pastQuestions: state.topics
                  .flatMap((t) => getUsedQuestionsByTopic()[t.name] ?? []),
```

- [ ] **Step 3: Use `getUsedBlitzTasks()` for blitz generation**

In the `step === "blitz"` block (around line 152), replace:

```typescript
                pastTasks: [],
```

with:

```typescript
                pastTasks: getUsedBlitzTasks(),
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAiOrchestrator.ts
git commit -m "feat: AI orchestrator reads used questions/blitz from localStorage"
```

---

### Task 6: PlayerAction type + `playAgain()` action

**Files:**
- Modify: `src/types/transport.ts:67`
- Modify: `src/store/actions/lobby.ts`
- Test: `src/store/actions/lobby.test.ts`

- [ ] **Step 1: Add `play-again` to PlayerAction union**

In `src/types/transport.ts`, add before the closing semicolon of the `PlayerAction` union (after `| { kind: "start-first-round" }`):

```typescript
  | { kind: "play-again" }
```

- [ ] **Step 2: Write failing test for `playAgain()`**

In `src/store/actions/lobby.test.ts`, add import:

```typescript
import { playAgain } from "./lobby";
```

Add a new `describe` block:

```typescript
describe("playAgain", () => {
  it("does nothing if phase is not finale", () => {
    useGameStore.getState().setState({
      phase: "lobby",
      settings: { ...useGameStore.getState().settings, mode: "ai" },
    });
    playAgain();
    expect(useGameStore.getState().phase).toBe("lobby");
  });

  it("does nothing if mode is not ai", () => {
    useGameStore.getState().setState({
      phase: "finale",
      settings: { ...useGameStore.getState().settings, mode: "manual" },
    });
    playAgain();
    expect(useGameStore.getState().phase).toBe("finale");
  });

  it("resets game state but keeps players, settings, and teams", () => {
    useGameStore.getState().setState({
      phase: "finale",
      settings: {
        mode: "ai",
        teamMode: "single",
        topicCount: 3,
        questionsPerTopic: 4,
        blitzRoundsPerTeam: 2,
        pastQuestions: [],
      },
      players: [
        { name: "Alice", emoji: "🐱", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "🐶", team: "red", online: true, ready: true },
      ],
      teams: [{ id: "red", score: 500, jokerUsed: true }],
      topics: [{ name: "Animals", questions: [{ text: "Q1", difficulty: 100 }] }],
      blitzTasks: [{ items: [{ text: "apple", difficulty: 200 }] }],
      history: [{ type: "round", teamId: "red", captainName: "Alice", questionIndex: 0, score: 100, jokerUsed: false, playerResults: [], difficulty: 100, topicIndex: 0, bonusTimeApplied: false, bonusTime: 0, bonusTimeMultiplier: 1, groups: [] }],
      currentRound: { type: "round", teamId: "red", captainName: "Alice", jokerActive: false, answers: {}, activeTimerStartedAt: 0, bonusTime: 0 },
    });

    playAgain();

    const state = useGameStore.getState();
    expect(state.phase).toBe("topics-collecting");

    // Players preserved with ready reset
    expect(state.players).toHaveLength(2);
    expect(state.players[0]!.name).toBe("Alice");
    expect(state.players[0]!.ready).toBe(false);
    expect(state.players[0]!.team).toBe("red");

    // Teams preserved with score/joker reset
    expect(state.teams).toHaveLength(1);
    expect(state.teams[0]!.id).toBe("red");
    expect(state.teams[0]!.score).toBe(0);
    expect(state.teams[0]!.jokerUsed).toBe(false);

    // Settings preserved
    expect(state.settings.mode).toBe("ai");
    expect(state.settings.topicCount).toBe(3);

    // Game state reset
    expect(state.history).toEqual([]);
    expect(state.topics).toEqual([]);
    expect(state.blitzTasks).toEqual([]);
    expect(state.currentRound).toBeNull();

    // Topics suggest initialized
    expect(state.topicsSuggest).toBeDefined();
    expect(state.topicsSuggest!.suggestions).toEqual({});

    // Timer set
    expect(state.timer).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/store/actions/lobby.test.ts`
Expected: FAIL — `playAgain` not exported

- [ ] **Step 4: Implement `playAgain()`**

In `src/store/actions/lobby.ts`, add at the end of the file:

```typescript
export function playAgain(): void {
  const state = useGameStore.getState();
  if (state.phase !== "finale") return;
  if (state.settings.mode !== "ai") return;

  const timer = createTimer(getTopicsSuggestTimerDuration());

  useGameStore.getState().setState({
    phase: "topics-collecting",
    players: state.players.map((p) => ({ ...p, ready: false })),
    teams: state.teams.map((t) => ({ ...t, score: 0, jokerUsed: false })),
    topics: [],
    blitzTasks: [],
    history: [],
    currentRound: null,
    topicsSuggest: {
      suggestions: {},
      noIdeas: [],
      timerEndsAt: timer.startedAt + timer.duration,
      manualTopics: null,
      generationStep: null,
      aiError: null,
    },
    timer,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/store/actions/lobby.test.ts`
Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/types/transport.ts src/store/actions/lobby.ts src/store/actions/lobby.test.ts
git commit -m "feat: playAgain action for AI mode"
```

---

### Task 7: Handle `play-again` in PlayPage

**Files:**
- Modify: `src/pages/PlayPage.tsx:23,156-163`

- [ ] **Step 1: Add import**

In `src/pages/PlayPage.tsx`, update the import from lobby actions:

```typescript
import { handleJoin, handleSetTeam, handleSetReady, handleChangeEmoji, startGame, playAgain } from "@/store/actions/lobby";
```

- [ ] **Step 2: Add case to action handler**

In the `onHostAction` switch statement in `PlayPage.tsx`, add after the `case "start-first-round"` block (before the closing `}`):

```typescript
        case "play-again":
          playAgain();
          break;
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/PlayPage.tsx
git commit -m "feat: handle play-again action in PlayPage"
```

---

### Task 8: i18n keys

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add Russian keys**

In `src/i18n/ru.json`, inside the `"finale"` object (after `"gameOver": "Игра окончена!",`), add:

```json
    "playAgain": "Играть снова тем же составом",
    "newGame": "Новая игра",
```

- [ ] **Step 2: Add English keys**

In `src/i18n/en.json`, find the `"finale"` object and add the same keys:

```json
    "playAgain": "Play again same roster",
    "newGame": "New game",
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/ru.json src/i18n/en.json
git commit -m "feat: i18n keys for finale playAgain and newGame"
```

---

### Task 9: HostFinale — Add Buttons

**Files:**
- Modify: `src/pages/finale/HostFinale.tsx`

- [ ] **Step 1: Verify HostFinale**

`HostFinale` already renders `<SidebarBlock />` which will contain the finale actions (Task 11). No changes needed to `HostFinale.tsx` — it already has the correct layout.

Verify the file is unchanged from its current state (renders `NominationCarousel` + `SidebarBlock`).

- [ ] **Step 2: No commit needed** — no changes to HostFinale.

---

### Task 10: PlayerFinale — Add Play Again Button

**Files:**
- Modify: `src/pages/finale/PlayerFinale.tsx`

- [ ] **Step 1: Add playAgain button**

Replace the contents of `src/pages/finale/PlayerFinale.tsx` with:

```typescript
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import type { PlayerAction } from "@/types/transport";

interface PlayerFinaleProps {
  sendAction: (action: PlayerAction) => void;
}

export function PlayerFinale({ sendAction }: PlayerFinaleProps) {
  const teams = useGameStore((s) => s.teams);
  const mode = useGameStore((s) => s.settings.mode);
  const { t } = useTranslation();

  return (
    <div>
      <TeamScore teams={teams} />
      {mode === "ai" && (
        <button onClick={() => sendAction({ kind: "play-again" })}>
          {t("finale.playAgain")}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update PlayerFinale usage in PlayPage.tsx**

In `src/pages/PlayPage.tsx`, the `PlayerPlayConnected` component renders `<PlayerFinale />`. Update to pass `sendAction`:

Replace:

```typescript
      {phase === "finale" && <PlayerFinale />}
```

with:

```typescript
      {phase === "finale" && <PlayerFinale sendAction={transport.sendAction} />}
```

- [ ] **Step 3: Fix any existing PlayerFinale tests**

In `src/pages/finale/PlayerFinale.test.tsx`, update the render call to pass the new required prop:

```typescript
const mockSendAction = vi.fn();
// In render calls, add:
<PlayerFinale sendAction={mockSendAction} />
```

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run src/pages/finale && npx tsc --noEmit`
Expected: PASS, no type errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/finale/PlayerFinale.tsx src/pages/PlayPage.tsx src/pages/finale/PlayerFinale.test.tsx
git commit -m "feat: PlayerFinale play-again button for AI mode"
```

---

### Task 11: SidebarBlock — Finale Actions

**Files:**
- Modify: `src/pages/blocks/SidebarBlock.tsx:146-211` (`SidebarActions` function)

- [ ] **Step 1: Add imports**

In `src/pages/blocks/SidebarBlock.tsx`, add to the imports:

```typescript
import { useNavigate } from "react-router-dom";
import { playAgain } from "@/store/actions/lobby";
```

- [ ] **Step 2: Add finale case to `SidebarActions`**

In the `SidebarActions` function, before the final `return null;`, add:

```typescript
  if (phase === "finale") {
    const handleNewGame = () => {
      useGameStore.getState().resetGame();
      navigate("/setup");
    };
    return (
      <div className={styles.actions}>
        {settings.mode === "ai" && (
          <button className={styles.primaryBtn} onClick={() => playAgain()}>
            {t("finale.playAgain")}
          </button>
        )}
        <button className={styles.secondaryBtn} onClick={handleNewGame}>
          {t("finale.newGame")}
        </button>
      </div>
    );
  }
```

The `SidebarActions` function already has access to `phase` and `t`. Add `settings` and `navigate`:

```typescript
function SidebarActions() {
  const { t } = useTranslation();
  const phase = usePhase();
  const settings = useSettings();
  const navigate = useNavigate();
```

Note: `useSettings` is already imported at the top of the file.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/blocks/SidebarBlock.tsx
git commit -m "feat: SidebarBlock finale actions (playAgain + newGame)"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run build**

Run: `npx vite build`
Expected: build succeeds

- [ ] **Step 4: Update plan-01-init.md**

In `task/plan-01-init.md`, mark phase 9.4 items as done:

```markdown
- [x] Полный game loop: lobby → (topics-suggest в AI-режиме) → round × N → blitz × N → finale
- [x] «Играть снова» из finale → возврат в lobby с сохранением игроков и настроек
- [x] Сброс состояния раундов/очков/использованных заданий
```

- [ ] **Step 5: Commit**

```bash
git add task/plan-01-init.md
git commit -m "step 9.4"
```
