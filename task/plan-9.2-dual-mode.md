# 9.2 Dual Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable two-team competitive play with alternating rounds, per-team scoring, action guards, TaskCard visibility for opponents, host active-team stripe, Toolbar redesign, and starting-team selection.

**Architecture:** Existing `GameState` fields (`teams`, `currentRound.teamId`, `settings.teamMode`) already support dual mode. Changes are: (1) action guards to reject cross-team inputs, (2) a pure trim helper to ensure even question/blitz counts, (3) TaskCardBlock visibility matrix with opponent click-toggle, (4) HostMainContainer top stripe, (5) Toolbar rewrite with two render modes, (6) `startGame` starting-team parameter. All per spec `task/spec-9.2-dual-mode.md`.

**Tech Stack:** React 19, TypeScript strict, Zustand, CSS Modules, Vitest, React Testing Library, Ladle

---

### Task 1: `dualModeTrim` helper — tests and implementation

Pure logic helper for trimming odd question/blitz counts in dual mode.

**Files:**
- Create: `src/logic/dualModeTrim.ts`
- Create: `src/logic/dualModeTrim.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/logic/dualModeTrim.test.ts
import { describe, it, expect } from "vitest";
import { trimQuestionsFileForDual } from "./dualModeTrim";
import type { QuestionsFile } from "@/types/game";

describe("trimQuestionsFileForDual", () => {
  it("returns file unchanged in single mode", () => {
    const file: QuestionsFile = {
      topics: [{ name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 100, acceptedAnswers: [] }, { text: "Q3", difficulty: 100, acceptedAnswers: [] }] }],
      blitzTasks: [{ items: [{ text: "W1", difficulty: 200 }] }, { items: [{ text: "W2", difficulty: 200 }] }, { items: [{ text: "W3", difficulty: 200 }] }],
    };
    const result = trimQuestionsFileForDual(file, "single");
    expect(result.topics[0]!.questions).toHaveLength(3);
    expect(result.blitzTasks).toHaveLength(3);
  });

  it("trims last question when total is odd in dual", () => {
    const file: QuestionsFile = {
      topics: [
        { name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 100, acceptedAnswers: [] }] },
        { name: "T2", questions: [{ text: "Q3", difficulty: 100, acceptedAnswers: [] }] },
      ],
      blitzTasks: [],
    };
    const result = trimQuestionsFileForDual(file, "dual");
    const total = result.topics.reduce((s, t) => s + t.questions.length, 0);
    expect(total).toBe(2);
  });

  it("drops entire last topic if it has only one question", () => {
    const file: QuestionsFile = {
      topics: [
        { name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 100, acceptedAnswers: [] }] },
        { name: "T2", questions: [{ text: "Q3", difficulty: 100, acceptedAnswers: [] }] },
      ],
      blitzTasks: [],
    };
    const result = trimQuestionsFileForDual(file, "dual");
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]!.name).toBe("T1");
  });

  it("trims last blitz task when count is odd in dual", () => {
    const file: QuestionsFile = {
      topics: [],
      blitzTasks: [{ items: [{ text: "W1", difficulty: 200 }] }, { items: [{ text: "W2", difficulty: 200 }] }, { items: [{ text: "W3", difficulty: 200 }] }],
    };
    const result = trimQuestionsFileForDual(file, "dual");
    expect(result.blitzTasks).toHaveLength(2);
  });

  it("leaves even counts unchanged in dual", () => {
    const file: QuestionsFile = {
      topics: [{ name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 100, acceptedAnswers: [] }] }],
      blitzTasks: [{ items: [{ text: "W1", difficulty: 200 }] }, { items: [{ text: "W2", difficulty: 200 }] }],
    };
    const result = trimQuestionsFileForDual(file, "dual");
    expect(result.topics[0]!.questions).toHaveLength(2);
    expect(result.blitzTasks).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic/dualModeTrim.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
// src/logic/dualModeTrim.ts
import type { QuestionsFile } from "@/types/game";

export function trimQuestionsFileForDual(
  file: QuestionsFile,
  teamMode: "single" | "dual",
): QuestionsFile {
  if (teamMode !== "dual") return file;

  let topics = file.topics;
  const totalQuestions = topics.reduce((s, t) => s + t.questions.length, 0);
  if (totalQuestions % 2 !== 0 && totalQuestions > 0) {
    const lastTopic = topics[topics.length - 1]!;
    if (lastTopic.questions.length <= 1) {
      topics = topics.slice(0, -1);
    } else {
      topics = topics.map((t, i) =>
        i === topics.length - 1
          ? { ...t, questions: t.questions.slice(0, -1) }
          : t,
      );
    }
  }

  let blitzTasks = file.blitzTasks;
  if (blitzTasks.length % 2 !== 0 && blitzTasks.length > 0) {
    blitzTasks = blitzTasks.slice(0, -1);
  }

  return { topics, blitzTasks };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic/dualModeTrim.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic/dualModeTrim.ts src/logic/dualModeTrim.test.ts
git commit -m "feat(logic): add dualModeTrim helper with tests"
```

---

### Task 2: Wire trim into SetupPage and useAiOrchestrator

**Files:**
- Modify: `src/pages/SetupPage.tsx`
- Modify: `src/hooks/useAiOrchestrator.ts`

- [ ] **Step 1: Update `SetupPage.tsx` — apply trim in `handleCreateGame`**

In `src/pages/SetupPage.tsx`, add the import at the top:

```ts
import { trimQuestionsFileForDual } from "@/logic/dualModeTrim";
```

Then in `handleCreateGame`, after the `teams` declaration (line ~89) and before `clearGameState()` (line ~91), add trimming:

```ts
    let finalTopics = questionsFile?.topics ?? [];
    let finalBlitzTasks = questionsFile?.blitzTasks ?? [];
    if (mode === "manual" && questionsFile) {
      const trimmed = trimQuestionsFileForDual(questionsFile, teamMode);
      finalTopics = trimmed.topics;
      finalBlitzTasks = trimmed.blitzTasks;
    }
```

Then update the `store.setState` call to use `finalTopics` and `finalBlitzTasks`:

```ts
    store.setState({
      settings,
      teams,
      topics: finalTopics,
      blitzTasks: finalBlitzTasks,
    });
```

- [ ] **Step 2: Update `useAiOrchestrator.ts` — trim in blitz success handler**

In `src/hooks/useAiOrchestrator.ts`, add the import:

```ts
import { trimQuestionsFileForDual } from "@/logic/dualModeTrim";
```

In the blitz `then` callback (around line 155-159), wrap the result through the trim helper:

Replace:
```ts
              .then((r) =>
                onAiStepSuccess("blitz", {
                  blitzTasks: r.rounds.map((round) => ({ items: round.items })),
                }),
              )
```

With:
```ts
              .then((r) => {
                let blitzTasks = r.rounds.map((round) => ({ items: round.items }));
                const trimmed = trimQuestionsFileForDual(
                  { topics: [], blitzTasks },
                  useGameStore.getState().settings.teamMode,
                );
                onAiStepSuccess("blitz", { blitzTasks: trimmed.blitzTasks });
              })
```

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run src/logic/dualModeTrim.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/SetupPage.tsx src/hooks/useAiOrchestrator.ts
git commit -m "feat(setup): wire dualModeTrim into SetupPage and AI orchestrator"
```

---

### Task 3: Action guards — `activateJoker` with `playerName` parameter

**Files:**
- Modify: `src/store/actions/round.ts`
- Modify: `src/pages/PlayPage.tsx`
- Modify: `src/store/actions/round.test.ts`

- [ ] **Step 1: Write failing tests for `activateJoker` with `playerName`**

Add to `src/store/actions/round.test.ts`, inside the existing `describe("activateJoker", ...)` block:

```ts
  it("activates when called by captain (playerName matches)", () => {
    useGameStore.setState({
      currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice" },
    });
    activateJoker("Alice");
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(true);
  });

  it("rejects when called by non-captain player", () => {
    useGameStore.setState({
      currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice" },
    });
    activateJoker("Bob");
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(false);
  });

  it("activates when called with undefined (host bypass)", () => {
    useGameStore.setState({
      currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice" },
    });
    activateJoker();
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(true);
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: the "rejects when called by non-captain player" test FAILS (currently activateJoker ignores playerName)

- [ ] **Step 3: Update `activateJoker` signature**

In `src/store/actions/round.ts`, change:

```ts
export function activateJoker(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-pick" || !state.currentRound) return;
```

To:

```ts
export function activateJoker(playerName?: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-pick" || !state.currentRound) return;
  if (playerName !== undefined && playerName !== state.currentRound.captainName) return;
```

- [ ] **Step 4: Update `PlayPage.tsx` transport handler**

In `src/pages/PlayPage.tsx`, change the `activate-joker` case (line ~110-111):

```ts
        case "activate-joker":
          activateJoker(name);
          break;
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/store/actions/round.ts src/pages/PlayPage.tsx src/store/actions/round.test.ts
git commit -m "feat(round): add playerName guard to activateJoker"
```

---

### Task 4: Action guards — `submitAnswer` team check

**Files:**
- Modify: `src/store/actions/round.ts`
- Modify: `src/store/actions/round.test.ts`

- [ ] **Step 1: Write failing test**

Add to `src/store/actions/round.test.ts`:

```ts
describe("submitAnswer dual-mode guard", () => {
  it("rejects answer from opponent team player", () => {
    setupRoundState({
      phase: "round-active",
      settings: { mode: "manual", teamMode: "dual", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
        { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        { name: "Eve", emoji: "🐸", team: "blue", online: true, ready: true },
      ],
      teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
      currentRound: { type: "round", teamId: "red", captainName: "Alice", questionIndex: 0, jokerActive: false, answers: {}, activeTimerStartedAt: 0, bonusTime: 0 },
    });
    submitAnswer("Dave", "opponent answer");
    expect(useGameStore.getState().currentRound!.answers).not.toHaveProperty("Dave");
  });

  it("accepts answer from active team player", () => {
    setupRoundState({
      phase: "round-active",
      settings: { mode: "manual", teamMode: "dual", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
        { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        { name: "Eve", emoji: "🐸", team: "blue", online: true, ready: true },
      ],
      teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
      currentRound: { type: "round", teamId: "red", captainName: "Alice", questionIndex: 0, jokerActive: false, answers: {}, activeTimerStartedAt: 0, bonusTime: 0 },
    });
    submitAnswer("Bob", "team answer");
    expect(useGameStore.getState().currentRound!.answers).toHaveProperty("Bob");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: "rejects answer from opponent team player" FAILS

- [ ] **Step 3: Add team guard to `submitAnswer`**

In `src/store/actions/round.ts`, in `submitAnswer` function, after line `if (state.currentRound.answers[playerName]) return;` (line 95), add:

```ts
  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== state.currentRound.teamId) return;
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/round.ts src/store/actions/round.test.ts
git commit -m "feat(round): add team guard to submitAnswer for dual mode"
```

---

### Task 5: Action guards — blitz `submitBlitzAnswer` / `skipBlitzAnswer` team check

**Files:**
- Modify: `src/store/actions/blitz.ts`
- Modify: `src/store/actions/blitz.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/store/actions/blitz.test.ts` (check the existing test structure and add a new `describe` block):

```ts
describe("blitz dual-mode guards", () => {
  function setupBlitzDual() {
    useGameStore.setState({
      phase: "blitz-active",
      settings: { mode: "manual", teamMode: "dual", topicCount: 0, questionsPerTopic: 0, blitzRoundsPerTeam: 1, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
        { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        { name: "Eve", emoji: "🐸", team: "blue", online: true, ready: true },
      ],
      teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
      blitzTasks: [{ items: [{ text: "Cat", difficulty: 200 }] }],
      currentRound: {
        type: "blitz", teamId: "red", captainName: "Alice", blitzTaskIndex: 0, blitzItemIndex: 0,
        jokerActive: false, answers: {}, playerOrder: ["Alice", "Bob"],
        activeTimerStartedAt: 0, bonusTime: 0,
      },
      history: [],
      timer: { startedAt: performance.now(), duration: 60000 },
    });
  }

  it("submitBlitzAnswer rejects opponent player", () => {
    setupBlitzDual();
    submitBlitzAnswer("Dave", "answer");
    expect(useGameStore.getState().currentRound!.answers).not.toHaveProperty("Dave");
  });

  it("skipBlitzAnswer rejects opponent player", () => {
    setupBlitzDual();
    useGameStore.setState({ phase: "blitz-answer" });
    skipBlitzAnswer("Dave");
    expect(useGameStore.getState().currentRound!.answers).not.toHaveProperty("Dave");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/store/actions/blitz.test.ts`
Expected: at least "rejects opponent player" FAILS

- [ ] **Step 3: Add team guards**

In `src/store/actions/blitz.ts`, in `submitBlitzAnswer`, after line `if (order.length === 0) return;` (line 171), add:

```ts
  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== round.teamId) return;
```

In `skipBlitzAnswer`, after line `if (!round || round.type !== "blitz") return;` (line 206), add:

```ts
  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== round.teamId) return;
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/actions/blitz.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/blitz.ts src/store/actions/blitz.test.ts
git commit -m "feat(blitz): add team guards to submitBlitzAnswer and skipBlitzAnswer"
```

---

### Task 6: Action guards — `initReview` defensive filter

**Files:**
- Modify: `src/store/actions/round.ts`
- Modify: `src/store/actions/round.test.ts`

- [ ] **Step 1: Write failing test**

Add to `src/store/actions/round.test.ts`:

```ts
describe("initReview dual-mode filter", () => {
  it("excludes opponent players from evaluations", () => {
    setupRoundState({
      phase: "round-review",
      settings: { mode: "manual", teamMode: "dual", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
        { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
      ],
      teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
      currentRound: {
        type: "round", teamId: "red", captainName: "Alice", questionIndex: 0,
        jokerActive: false,
        answers: {
          Alice: { text: "a1", timestamp: 1000 },
          Bob: { text: "b1", timestamp: 2000 },
          Dave: { text: "sneaky", timestamp: 3000 },
        },
        activeTimerStartedAt: 0, bonusTime: 0,
      },
    });
    initReview();
    const review = useGameStore.getState().currentRound!.reviewResult!;
    const names = review.evaluations.map((e) => e.playerName);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
    expect(names).not.toContain("Dave");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: "excludes opponent players from evaluations" FAILS (Dave is included)

- [ ] **Step 3: Add defensive filter to `initReview`**

In `src/store/actions/round.ts`, in `initReview()`, change the evaluations building code. Replace lines 179-184:

```ts
  const evaluations: AnswerEvaluation[] = Object.entries(state.currentRound.answers).map(
    ([playerName, answer]) => ({
      playerName,
      correct: answer.text === "" ? false : null,
    }),
  );
```

With:

```ts
  const teamPlayerNames = new Set(teamPlayers.map((p) => p.name));
  const evaluations: AnswerEvaluation[] = Object.entries(state.currentRound.answers)
    .filter(([playerName]) => teamPlayerNames.has(playerName))
    .map(([playerName, answer]) => ({
      playerName,
      correct: answer.text === "" ? false : null,
    }));
```

Also update the `groups` mapping (lines 186-190) to filter similarly:

```ts
  const groups = Object.entries(round?.answers ?? {})
    .filter(([name]) => teamPlayerNames.has(name))
    .map(([name, answer]) => ({name, answer} as const))
    .sort((a, b) => a.answer.timestamp - b.answer.timestamp)
    .map(a => [a.name])
  ;
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/round.ts src/store/actions/round.test.ts
git commit -m "feat(round): filter opponent answers from initReview evaluations"
```

---

### Task 7: `startGame` starting-team parameter

**Files:**
- Modify: `src/store/actions/lobby.ts`
- Modify: `src/pages/PlayPage.tsx`
- Modify: `src/store/actions/lobby.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/store/actions/lobby.test.ts`, inside the `describe("canStartGame / startGame", ...)` block:

```ts
    it("startGame with startingTeam sets that team as first", () => {
      handleJoin("peer1", "P1");
      handleJoin("peer2", "P2");
      handleJoin("peer3", "P3");
      handleJoin("peer4", "P4");
      handleSetTeam("P1", "red");
      handleSetTeam("P2", "red");
      handleSetTeam("P3", "blue");
      handleSetTeam("P4", "blue");
      handleSetReady("P1", true);
      handleSetReady("P2", true);
      handleSetReady("P3", true);
      handleSetReady("P4", true);
      startGame("blue");
      const s = useGameStore.getState();
      expect(s.currentRound!.teamId).toBe("blue");
    });

    it("startGame without startingTeam picks random team", () => {
      handleJoin("peer1", "P1");
      handleJoin("peer2", "P2");
      handleJoin("peer3", "P3");
      handleJoin("peer4", "P4");
      handleSetTeam("P1", "red");
      handleSetTeam("P2", "red");
      handleSetTeam("P3", "blue");
      handleSetTeam("P4", "blue");
      handleSetReady("P1", true);
      handleSetReady("P2", true);
      handleSetReady("P3", true);
      handleSetReady("P4", true);
      startGame();
      const s = useGameStore.getState();
      expect(["red", "blue"]).toContain(s.currentRound!.teamId);
    });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/store/actions/lobby.test.ts`
Expected: "startGame with startingTeam" FAILS (startGame doesn't accept a parameter)

- [ ] **Step 3: Update `startGame` to accept `startingTeam`**

In `src/store/actions/lobby.ts`, change the `startGame` signature and team selection logic:

```ts
export function startGame(startingTeam?: TeamId): void {
  if (!canStartGame()) return;
  const state = useGameStore.getState();
  const nextPhase: GameState["phase"] =
    state.settings.mode === "ai" ? "topics-collecting" : "round-captain";

  let teamId: TeamId;
  if (startingTeam && state.teams.some((t) => t.id === startingTeam)) {
    teamId = startingTeam;
  } else if (state.teams.length > 0) {
    teamId = state.teams[Math.floor(Math.random() * state.teams.length)]!.id;
  } else {
    teamId = "none";
  }

  let extra: Partial<GameState> = {};
  if (nextPhase === "round-captain") {
    extra = {
      currentRound: createNextRoundState(teamId),
      timer: createTimer(getCaptainTimerDuration()),
    };
  } else {
    const timer = createTimer(getTopicsSuggestTimerDuration());
    extra = {
      topicsSuggest: {
        suggestions: {},
        noIdeas: [],
        timerEndsAt: timer.startedAt + timer.duration,
        manualTopics: null,
        generationStep: null,
        aiError: null,
      },
      timer,
    };
  }

  useGameStore.getState().setState({ phase: nextPhase, ...extra });
}
```

- [ ] **Step 4: Update `PlayPage.tsx` transport handler for `start-game`**

In `src/pages/PlayPage.tsx`, change the `start-game` case (line ~100-101):

```ts
        case "start-game": {
          const player = state.players.find((p) => p.name === name);
          startGame(player?.team);
          break;
        }
```

Note: `state` is not available in current scope — need `useGameStore.getState()`. Fix:

```ts
        case "start-game": {
          const gs = useGameStore.getState();
          const player = gs.players.find((p) => p.name === name);
          startGame(player?.team);
          break;
        }
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/store/actions/lobby.test.ts`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/store/actions/lobby.ts src/pages/PlayPage.tsx src/store/actions/lobby.test.ts
git commit -m "feat(lobby): startGame accepts startingTeam parameter"
```

---

### Task 8: Simplify `stateFilter.ts` — remove question/blitz text scrubbing

**Files:**
- Modify: `src/store/stateFilter.ts`
- Modify: `src/store/stateFilter.test.ts`

- [ ] **Step 1: Update tests — remove old scrubbing tests, add regression test**

In `src/store/stateFilter.test.ts`, the existing tests for "responder does NOT see question text" (line ~68-70) and "active team responder does NOT see question in dual mode" (lines ~104-128) will need to be inverted or removed. Also remove the blitz-pick non-captain test.

Replace the `describe("question text visibility", ...)` block with:

```ts
  describe("question text visibility", () => {
    it("captain sees question text in round-active", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.topics[0]?.questions[0]?.text).toBe("Name a big cat");
    });

    it("responder sees question text in round-active (no longer scrubbed)", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.topics[0]?.questions[0]?.text).toBe("Name a big cat");
    });

    it("non-targeted questions remain visible", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.topics[0]?.questions[1]?.text).toBe("Name a fish");
    });

    it("dual-mode: question text not scrubbed for any player", () => {
      const state = createTestState({
        settings: {
          mode: "manual", teamMode: "dual", topicCount: 3,
          questionsPerTopic: 4, blitzRoundsPerTeam: 2, pastQuestions: [],
        },
        players: [
          { name: "Alice", emoji: "🐱", team: "red", online: true, ready: true },
          { name: "Bob", emoji: "🐶", team: "red", online: true, ready: true },
          { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        ],
        teams: [
          { id: "red", score: 0, jokerUsed: false },
          { id: "blue", score: 0, jokerUsed: false },
        ],
      });
      for (const name of ["Alice", "Bob", "Dave"]) {
        const filtered = filterStateForPlayer(state, name);
        expect(filtered.topics[0]?.questions[0]?.text).toBe("Name a big cat");
      }
    });
  });
```

Replace the `describe("blitz-pick visibility", ...)` block with:

```ts
  describe("blitz-pick visibility", () => {
    it("captain sees blitz task items", () => {
      const state = createTestState({
        phase: "blitz-pick",
        currentRound: {
          type: "blitz", teamId: "red", captainName: "Alice",
          blitzTaskIndex: 0, jokerActive: false, answers: {},
          activeTimerStartedAt: 0, bonusTime: 0,
        },
      });
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.blitzTasks[0]?.items?.[0]?.text).toBe("Cat");
    });

    it("non-captain sees blitz task items (no longer scrubbed)", () => {
      const state = createTestState({
        phase: "blitz-pick",
        currentRound: {
          type: "blitz", teamId: "red", captainName: "Alice",
          blitzTaskIndex: 0, jokerActive: false, answers: {},
          activeTimerStartedAt: 0, bonusTime: 0,
        },
      });
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.blitzTasks[0]?.items?.[0]?.text).toBe("Cat");
    });
  });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/store/stateFilter.test.ts`
Expected: FAIL (old scrubbing logic still strips text)

- [ ] **Step 3: Remove scrubbing from `stateFilter.ts`**

In `src/store/stateFilter.ts`:

1. Remove the `hideQuestionText` function (lines 102-110).
2. Remove the `hideBlitzTaskItems` function (lines 112-118).
3. Remove the question-text-hiding block (lines 39-47):
```ts
  // Hide question text during active/answer phases
  if (
    round.type === "round" &&
    (state.phase === "round-active" || state.phase === "round-answer")
  ) {
    const canSeeQuestion = isCaptain || (isDual && isOpponent);
    if (!canSeeQuestion && round.questionIndex != null) {
      filtered = hideQuestionText(filtered, round.questionIndex);
    }
  }
```

4. Remove the blitz-pick hiding block (lines 49-51):
```ts
  // Hide blitz task items during blitz-pick (captain only sees them)
  if (state.phase === "blitz-pick" && !isCaptain) {
    filtered = hideBlitzTaskItems(filtered);
  }
```

5. Remove the now-unused local variables `isCaptain`, `isInActiveTeam`, `isOpponent`, `isDual` (lines 32-34) **only if** they are not used elsewhere in the function. Check: `isInActiveTeam`, `isOpponent`, `isDual` are only used in the removed blocks. `isCaptain` is only used in the removed blocks too. Remove all four.

The resulting function body should be:

```ts
export function filterStateForPlayer(
  state: GameState,
  playerName: string,
): GameState {
  if (
    state.topicsSuggest &&
    (state.phase === "topics-collecting" ||
      state.phase === "topics-generating" ||
      state.phase === "topics-preview")
  ) {
    return filterTopicsSuggest(state, playerName);
  }

  const round = state.currentRound;
  if (!round) return state;

  const player = state.players.find((p) => p.name === playerName);
  if (!player) return state;

  let filtered = state;

  // Hide other players' answers before review phase
  if (
    state.phase !== "round-review" &&
    state.phase !== "blitz-review"
  ) {
    filtered = hideOtherAnswers(filtered, playerName);
  }

  // In round-review with AI mode: hide evaluations until aiStatus is done/error
  if (state.phase === "round-review" && round.reviewResult) {
    const status = round.reviewResult.aiStatus;
    if (status === "idle" || status === "loading") {
      filtered = hideReviewEvaluations(filtered);
    }
  }

  return filtered;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/stateFilter.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/stateFilter.ts src/store/stateFilter.test.ts
git commit -m "refactor(stateFilter): remove question/blitz text scrubbing, use TaskCard hidden prop instead"
```

---

### Task 9: TaskCardBlock — visibility matrix and opponent click-toggle

**Files:**
- Modify: `src/pages/blocks/TaskCardBlock.tsx`
- Create: `src/pages/blocks/TaskCardBlock.test.tsx`

- [ ] **Step 1: Write tests**

```ts
// src/pages/blocks/TaskCardBlock.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useGameStore } from "@/store/gameStore";
import { TaskCardBlock } from "./TaskCardBlock";
import type { GameState } from "@/types/game";

function setupState(overrides?: Partial<GameState>) {
  useGameStore.setState({
    phase: "round-active",
    settings: { mode: "manual", teamMode: "dual", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 1, pastQuestions: [] },
    players: [
      { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
      { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
      { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
    topics: [{ name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 150, acceptedAnswers: [] }] }],
    blitzTasks: [{ items: [{ text: "Cat", difficulty: 200 }] }],
    currentRound: {
      type: "round", teamId: "red", captainName: "Alice", questionIndex: 0,
      jokerActive: false, answers: {}, activeTimerStartedAt: 0, bonusTime: 0,
    },
    history: [],
    timer: null,
    ...overrides,
  });
}

describe("TaskCardBlock visibility", () => {
  it("captain sees card open in round-active", () => {
    setupState();
    const { container } = render(<TaskCardBlock playerName="Alice" />);
    const wrapper = container.querySelector("[data-hidden]");
    expect(wrapper?.getAttribute("data-hidden")).toBe("false");
  });

  it("active-team non-captain sees card hidden in round-active", () => {
    setupState();
    const { container } = render(<TaskCardBlock playerName="Bob" />);
    const wrapper = container.querySelector("[data-hidden]");
    expect(wrapper?.getAttribute("data-hidden")).toBe("true");
  });

  it("both see card open in round-review", () => {
    setupState({ phase: "round-review" });
    const { container: c1 } = render(<TaskCardBlock playerName="Alice" />);
    expect(c1.querySelector("[data-hidden]")?.getAttribute("data-hidden")).toBe("false");
    const { container: c2 } = render(<TaskCardBlock playerName="Bob" />);
    expect(c2.querySelector("[data-hidden]")?.getAttribute("data-hidden")).toBe("false");
  });

  it("opponent card is hidden by default in round-active, clickable to toggle", () => {
    setupState();
    const { container } = render(<TaskCardBlock playerName="Dave" />);
    const wrapper = container.querySelector("[data-hidden]")!;
    expect(wrapper.getAttribute("data-hidden")).toBe("true");
    expect(wrapper.getAttribute("data-clickable")).toBe("true");
    fireEvent.click(wrapper);
    expect(wrapper.getAttribute("data-hidden")).toBe("false");
    fireEvent.click(wrapper);
    expect(wrapper.getAttribute("data-hidden")).toBe("true");
  });

  it("opponent card is open in round-review (no toggle needed)", () => {
    setupState({ phase: "round-review" });
    const { container } = render(<TaskCardBlock playerName="Dave" />);
    const wrapper = container.querySelector("[data-hidden]")!;
    expect(wrapper.getAttribute("data-hidden")).toBe("false");
  });

  it("host (no playerName) sees card hidden in round-active", () => {
    setupState();
    const { container } = render(<TaskCardBlock />);
    const wrapper = container.querySelector("[data-hidden]");
    expect(wrapper?.getAttribute("data-hidden")).toBe("true");
  });

  it("host sees card open in round-review", () => {
    setupState({ phase: "round-review" });
    const { container } = render(<TaskCardBlock />);
    const wrapper = container.querySelector("[data-hidden]");
    expect(wrapper?.getAttribute("data-hidden")).toBe("false");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/pages/blocks/TaskCardBlock.test.tsx`
Expected: FAIL — current logic doesn't account for opponent visibility rules

- [ ] **Step 3: Rewrite TaskCardBlock with new visibility matrix**

Replace `src/pages/blocks/TaskCardBlock.tsx` entirely:

```tsx
import { usePhase, useCurrentRound, usePlayers, useSettings } from "@/store/selectors";
import { useEffect, useMemo, useState } from "react";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { useGameStore } from "@/store/gameStore";
import { useTranslation } from "react-i18next";
import styles from "./TaskCardBlock.module.css";
import type { RoundState } from "@/types/game";

interface TaskCardBlockProps {
  playerName?: string;
  alwaysOpen?: boolean;
}

export function TaskCardBlock({ playerName, alwaysOpen }: TaskCardBlockProps) {
  const round = useCurrentRound();
  const players = usePlayers();
  const captain = players.find((p) => p.name === round?.captainName);
  const phase = usePhase();
  const settings = useSettings();

  const myPlayer = playerName ? players.find((p) => p.name === playerName) : undefined;
  const isCaptain = round?.captainName === playerName;
  const isDual = settings.teamMode === "dual";
  const isInActiveTeam = myPlayer ? myPlayer.team === round?.teamId : false;
  const isOpponent = isDual && myPlayer != null && !isInActiveTeam;
  const isHost = playerName == null;

  const [toggleOpen, setToggleOpen] = useState(false);
  useEffect(() => {
    setToggleOpen(false);
  }, [round?.questionIndex, round?.blitzItemIndex]);

  if (round?.type === "round") {
    return (
      <TaskCardBlockRound
        round={round}
        alwaysOpen={alwaysOpen}
        captain={captain}
        isCaptain={isCaptain}
        isOpponent={isOpponent}
        isHost={isHost}
        toggleOpen={toggleOpen}
        onToggle={() => setToggleOpen((v) => !v)}
      />
    );
  }
  if (round?.type === "blitz") {
    return (
      <TaskCardBlockBlitz
        round={round}
        alwaysOpen={alwaysOpen}
        captain={captain}
        isCaptain={isCaptain}
        isOpponent={isOpponent}
        isHost={isHost}
        toggleOpen={toggleOpen}
        onToggle={() => setToggleOpen((v) => !v)}
      />
    );
  }
  return null;
}

interface InternalProps {
  captain?: ReturnType<typeof usePlayers>[number];
  isCaptain?: boolean;
  isOpponent: boolean;
  isHost: boolean;
  alwaysOpen?: boolean;
  round: RoundState;
  toggleOpen: boolean;
  onToggle: () => void;
}

function TaskCardBlockRound({ captain, isCaptain, isOpponent, isHost, round, alwaysOpen, toggleOpen, onToggle }: InternalProps) {
  const topics = useGameStore((s) => s.topics);
  const phase = usePhase();
  const currentQuestion = useMemo(() => {
    if (round?.questionIndex == null) return undefined;
    let remaining = round.questionIndex;
    for (const topic of topics) {
      if (remaining < topic.questions.length) {
        return { topic, question: topic.questions[remaining] };
      }
      remaining -= topic.questions.length;
    }
    return undefined;
  }, [round?.questionIndex, topics]);

  const isReview = phase === "round-review" || phase === "round-result";
  const taskVisible = alwaysOpen || isReview
    || (isCaptain && (phase === "round-active" || phase === "round-answer"))
    || (isOpponent && toggleOpen);

  const clickable = isOpponent && !isReview;

  if (!currentQuestion) return null;

  return (
    <div className={styles.taskCardWrap}>
      <TaskCard
        topic={currentQuestion.topic.name}
        player={captain}
        difficulty={currentQuestion.question?.difficulty ?? 0}
        question={currentQuestion.question?.text ?? ""}
        hidden={!taskVisible}
        onClick={clickable ? onToggle : undefined}
      />
    </div>
  );
}

function TaskCardBlockBlitz({ round, captain, alwaysOpen, isCaptain, isOpponent, isHost, toggleOpen, onToggle }: InternalProps) {
  const phase = usePhase();
  const blitzTasks = useGameStore((s) => s.blitzTasks);

  if (round.blitzTaskIndex == null) return null;

  const isReview = phase === "blitz-review";
  const taskVisible = alwaysOpen || isReview
    || (isCaptain && (phase === "blitz-active" || phase === "blitz-pick" || phase === "blitz-answer"))
    || (isOpponent && toggleOpen);

  const clickable = isOpponent && !isReview;

  const currentTask = blitzTasks[round.blitzTaskIndex ?? 0];
  const currentItem =
    currentTask && round?.blitzItemIndex != null
      ? currentTask.items[round.blitzItemIndex]
      : undefined;

  const { t } = useTranslation();
  return (
    <div className={styles.taskCardWrap}>
      <TaskCard
        topic={t("blitz.taskTitle")}
        player={captain}
        difficulty={currentItem?.difficulty ?? 0}
        question={currentItem?.text ?? ""}
        hidden={!taskVisible}
        onClick={clickable ? onToggle : undefined}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/pages/blocks/TaskCardBlock.test.tsx`
Expected: all PASS

- [ ] **Step 5: Run all tests to check for regressions**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/blocks/TaskCardBlock.tsx src/pages/blocks/TaskCardBlock.test.tsx
git commit -m "feat(TaskCardBlock): dual-mode visibility matrix with opponent click-toggle"
```

---

### Task 10: HostMainContainer — active team stripe

**Files:**
- Modify: `src/pages/blocks/HostMainContainer.tsx`
- Modify: `src/pages/blocks/HostMainContainer.module.css`

- [ ] **Step 1: Update the component to read store and render stripe**

Replace `src/pages/blocks/HostMainContainer.tsx`:

```tsx
import type { ReactNode } from "react";
import { useCurrentRound, useSettings } from "@/store/selectors";
import styles from "./HostMainContainer.module.css";

export function HostMainContainer({ children }: { children: ReactNode }) {
  const round = useCurrentRound();
  const settings = useSettings();
  const stripeColor =
    settings.teamMode === "dual" && round?.teamId ? round.teamId : undefined;

  return (
    <div className={styles.mainContainer} data-stripe={stripeColor}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for the stripe**

Append to `src/pages/blocks/HostMainContainer.module.css`:

```css
.mainContainer {
  position: relative;
}

.mainContainer::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: transparent;
  transition: background 200ms;
}

.mainContainer[data-stripe="red"]::before {
  background: var(--color-team-red);
}

.mainContainer[data-stripe="blue"]::before {
  background: var(--color-team-blue);
}
```

Note: The existing `.mainContainer` rule already has flex properties. Merge the `position: relative` into the existing rule and add the `::before` rule after it.

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Open host game, start a dual-mode game, verify the 4px stripe appears and changes color on team alternation.

- [ ] **Step 4: Commit**

```bash
git add src/pages/blocks/HostMainContainer.tsx src/pages/blocks/HostMainContainer.module.css
git commit -m "feat(host): add active-team color stripe to HostMainContainer"
```

---

### Task 11: Toolbar rewrite — component and CSS

**Files:**
- Rewrite: `src/components/Toolbar/Toolbar.tsx`
- Rewrite: `src/components/Toolbar/Toolbar.module.css`

- [ ] **Step 1: Write the new Toolbar component**

```tsx
// src/components/Toolbar/Toolbar.tsx
import { useState, useEffect, useRef } from "react";
import type { TeamId, PlayerData, PlayerDisplay } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./Toolbar.module.css";

export interface ToolbarProps {
  variant?: "inline" | "overlay";
  player?: PlayerDisplay;
  phaseName?: string;
  phaseTeam?: TeamId;
  players?: PlayerData[];
  teamLabels?: Partial<Record<TeamId, string>>;
  onOpenCalibration: () => void;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
}

export function Toolbar({
  variant = "overlay",
  player,
  phaseName,
  phaseTeam = "none",
  players,
  teamLabels,
  onOpenCalibration,
  onToggleFullscreen,
  onToggleTheme,
}: ToolbarProps) {
  const [open, setOpen] = useState<"menu" | "players" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  function togglePanel(panel: "menu" | "players") {
    setOpen((prev) => (prev === panel ? null : panel));
  }

  const isPlayerMode = !!player;

  return (
    <div
      ref={containerRef}
      className={styles.toolbar}
      data-variant={variant}
    >
      <div className={styles.bar}>
        {isPlayerMode && (
          <div className={styles.playerInfo} data-menu-open={open === "menu" || undefined}>
            <button
              type="button"
              className={styles.avatarBtn}
              onClick={() => togglePanel("players")}
              aria-expanded={open === "players"}
              aria-label="Player list"
            >
              <PlayerAvatar size={32} emoji={player!.emoji} team={player!.team} />
            </button>
            <span className={styles.playerName} data-team={player!.team}>
              {player!.name}
            </span>
            <span className={styles.separator}>|</span>
            <span
              className={styles.phaseName}
              data-team={phaseTeam}
              aria-live="polite"
              role="status"
              title={phaseName}
            >
              {phaseName}
            </span>
          </div>
        )}
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => togglePanel("menu")}
          aria-expanded={open === "menu"}
          aria-label="Menu"
        >
          {"\u2630"}
        </button>
      </div>

      {open === "menu" && (
        <div className={styles.menuPanel}>
          <button type="button" className={styles.panelBtn} onClick={() => { onOpenCalibration(); setOpen(null); }}>
            {"\u{1F50A}"}
          </button>
          <button type="button" className={styles.panelBtn} onClick={() => { onToggleFullscreen(); setOpen(null); }}>
            {"\u26F6"}
          </button>
          <button type="button" className={styles.panelBtn} onClick={() => { onToggleTheme(); setOpen(null); }}>
            {"\u263E"}
          </button>
        </div>
      )}

      {open === "players" && isPlayerMode && players && (
        <PlayersPanel players={players} teamLabels={teamLabels} />
      )}
    </div>
  );
}

function PlayersPanel({
  players,
  teamLabels,
}: {
  players: PlayerData[];
  teamLabels?: Partial<Record<TeamId, string>>;
}) {
  const teams = new Map<TeamId, PlayerData[]>();
  for (const p of players) {
    const arr = teams.get(p.team) ?? [];
    arr.push(p);
    teams.set(p.team, arr);
  }

  return (
    <div className={styles.playersPanel}>
      {Array.from(teams.entries()).map(([teamId, members]) => (
        <div key={teamId} className={styles.teamGroup} data-team={teamId}>
          {teamLabels?.[teamId] && (
            <div className={styles.teamLabel}>{teamLabels[teamId]}</div>
          )}
          {members.map((p) => (
            <div key={p.name} className={styles.playerRow}>
              <PlayerAvatar size={28} emoji={p.emoji} team={p.team} online={p.online} />
              <span className={styles.playerRowName}>{p.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write the new CSS**

```css
/* src/components/Toolbar/Toolbar.module.css */
.toolbar {
  z-index: 10;
}

.toolbar[data-variant="overlay"] {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.toolbar[data-variant="inline"] {
  position: sticky;
  top: 0;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px;
  gap: 8px;
  pointer-events: auto;
}

.playerInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  transition: opacity 200ms, transform 200ms;
}

.playerInfo[data-menu-open] {
  opacity: 0;
  transform: translateX(-100%);
  pointer-events: none;
}

.avatarBtn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.avatarBtn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 50%;
}

.playerName {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}

.playerName[data-team="red"] { color: var(--color-team-red); }
.playerName[data-team="blue"] { color: var(--color-team-blue); }
.playerName[data-team="none"] { color: var(--color-text); }

.separator {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.phaseName {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.phaseName[data-team="red"] { color: var(--color-team-red); }
.phaseName[data-team="blue"] { color: var(--color-team-blue); }
.phaseName[data-team="none"] { color: var(--color-text-secondary); }

.menuBtn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: 18px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  pointer-events: auto;
}

.menuBtn:hover { background: var(--color-border); }

.menuBtn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.menuPanel {
  display: flex;
  gap: 8px;
  padding: 8px;
  justify-content: flex-end;
  pointer-events: auto;
}

.panelBtn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: 18px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.panelBtn:hover { background: var(--color-border); }

.panelBtn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.playersPanel {
  padding: 8px;
  background: var(--color-bg);
  border-radius: 0 0 8px 8px;
  border: 1px solid var(--color-border);
  border-top: none;
  pointer-events: auto;
  max-height: 300px;
  overflow-y: auto;
}

.teamGroup {
  margin-bottom: 8px;
}

.teamGroup:last-child {
  margin-bottom: 0;
}

.teamLabel {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 4px 0;
}

.teamGroup[data-team="red"] .teamLabel { color: var(--color-team-red); }
.teamGroup[data-team="blue"] .teamLabel { color: var(--color-team-blue); }
.teamGroup[data-team="none"] .teamLabel { color: var(--color-text-secondary); }

.playerRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.playerRowName {
  font-size: 14px;
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/Toolbar/Toolbar.tsx src/components/Toolbar/Toolbar.module.css
git commit -m "feat(Toolbar): rewrite with inline/overlay variants and player mode"
```

---

### Task 12: Toolbar tests

**Files:**
- Rewrite: `src/components/Toolbar/Toolbar.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/components/Toolbar/Toolbar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./Toolbar";

const defaultProps = {
  onOpenCalibration: vi.fn(),
  onToggleFullscreen: vi.fn(),
  onToggleTheme: vi.fn(),
};

describe("Toolbar", () => {
  describe("GameToolbar mode (no player)", () => {
    it("renders only menu button", () => {
      const { container } = render(<Toolbar {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Menu" })).toBeDefined();
      expect(container.querySelectorAll("button")).toHaveLength(1);
    });

    it("click menu opens calibration/fullscreen/theme buttons", () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(4);
    });

    it("clicking a menu button calls callback and closes menu", () => {
      const onCalibration = vi.fn();
      render(<Toolbar {...defaultProps} onOpenCalibration={onCalibration} />);
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      const buttons = screen.getAllByRole("button");
      const calBtn = buttons.find((b) => b.textContent === "\u{1F50A}");
      fireEvent.click(calBtn!);
      expect(onCalibration).toHaveBeenCalledOnce();
    });

    it("sets data-variant attribute", () => {
      const { container } = render(<Toolbar {...defaultProps} variant="inline" />);
      expect(container.firstElementChild?.getAttribute("data-variant")).toBe("inline");
    });
  });

  describe("PlayerToolbar mode", () => {
    const player = { emoji: "🐰", name: "Alice", team: "red" as const };

    it("shows player name and phase", () => {
      render(
        <Toolbar {...defaultProps} player={player} phaseName="Идут ответы" phaseTeam="red" />,
      );
      expect(screen.getByText("Alice")).toBeDefined();
      expect(screen.getByText("Идут ответы")).toBeDefined();
    });

    it("player name has team color via data-team", () => {
      render(<Toolbar {...defaultProps} player={player} />);
      const nameEl = screen.getByText("Alice");
      expect(nameEl.getAttribute("data-team")).toBe("red");
    });

    it("phase name has phaseTeam color via data-team", () => {
      render(
        <Toolbar {...defaultProps} player={player} phaseName="Выбор" phaseTeam="blue" />,
      );
      const phaseEl = screen.getByText("Выбор");
      expect(phaseEl.getAttribute("data-team")).toBe("blue");
    });

    it("avatar button opens player list", () => {
      render(
        <Toolbar
          {...defaultProps}
          player={player}
          players={[
            { emoji: "🐰", name: "Alice", team: "red", online: true, ready: true },
            { emoji: "🐶", name: "Bob", team: "blue", online: true, ready: true },
          ]}
          teamLabels={{ red: "Красные", blue: "Синие" }}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Player list" }));
      expect(screen.getByText("Красные")).toBeDefined();
      expect(screen.getByText("Bob")).toBeDefined();
    });
  });

  describe("panel interactions", () => {
    const player = { emoji: "🐰", name: "Alice", team: "red" as const };

    it("opening menu closes players list", () => {
      render(
        <Toolbar
          {...defaultProps}
          player={player}
          players={[{ emoji: "🐰", name: "Alice", team: "red", online: true, ready: true }]}
          teamLabels={{ red: "Красные" }}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Player list" }));
      expect(screen.getByText("Красные")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.queryByText("Красные")).toBeNull();
    });

    it("Esc closes any open panel", () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("outside click closes any open panel", () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
      fireEvent.mouseDown(document.body);
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/Toolbar/Toolbar.test.tsx`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/Toolbar/Toolbar.test.tsx
git commit -m "test(Toolbar): rewrite tests for new toolbar with variants and player mode"
```

---

### Task 13: Toolbar stories

**Files:**
- Rewrite: `src/components/Toolbar/Toolbar.stories.tsx`

- [ ] **Step 1: Write stories**

```tsx
// src/components/Toolbar/Toolbar.stories.tsx
import type { Story } from "@ladle/react";
import { Toolbar } from "./Toolbar";

const noop = () => {};
const defaultActions = {
  onOpenCalibration: noop,
  onToggleFullscreen: noop,
  onToggleTheme: noop,
};

const demoPlayers = [
  { emoji: "🐰", name: "Alice", team: "red" as const, online: true, ready: true },
  { emoji: "🐶", name: "Bob", team: "red" as const, online: true, ready: true },
  { emoji: "🦊", name: "Carol", team: "blue" as const, online: true, ready: true },
  { emoji: "🐸", name: "Dave", team: "blue" as const, online: false, ready: true },
];

export const GameToolbarOverlay: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar {...defaultActions} variant="overlay" />
    <p style={{ padding: 60 }}>Host screen content</p>
  </div>
);

export const GameToolbarInline: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar {...defaultActions} variant="inline" />
    <p style={{ padding: 16 }}>Content below toolbar</p>
  </div>
);

export const PlayerToolbarOverlay: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar
      {...defaultActions}
      variant="overlay"
      player={{ emoji: "🐰", name: "Alice", team: "red" }}
      phaseName="Идут ответы"
      phaseTeam="red"
      players={demoPlayers}
      teamLabels={{ red: "Красные", blue: "Синие" }}
    />
    <p style={{ padding: 60 }}>Player screen content</p>
  </div>
);

export const PlayerToolbarInline: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar
      {...defaultActions}
      variant="inline"
      player={{ emoji: "🐶", name: "Bob", team: "blue" }}
      phaseName="Капитан выбирает задание"
      phaseTeam="red"
      players={demoPlayers}
      teamLabels={{ red: "Красные", blue: "Синие" }}
    />
    <p style={{ padding: 16 }}>Player content below</p>
  </div>
);

export const PlayerToolbarMenuOpen: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar
      {...defaultActions}
      variant="inline"
      player={{ emoji: "🐰", name: "Alice", team: "red" }}
      phaseName="Проверка"
      phaseTeam="blue"
    />
    <p style={{ padding: 16, fontSize: 12, color: "gray" }}>Click the ☰ button to open menu</p>
  </div>
);

export const PlayerToolbarPlayersListOpen: Story = () => (
  <div style={{ height: 400, background: "var(--color-bg)" }}>
    <Toolbar
      {...defaultActions}
      variant="inline"
      player={{ emoji: "🐰", name: "Alice", team: "red" }}
      phaseName="Лобби"
      phaseTeam="none"
      players={demoPlayers}
      teamLabels={{ red: "Красные", blue: "Синие" }}
    />
    <p style={{ padding: 16, fontSize: 12, color: "gray" }}>Click avatar to open players list</p>
  </div>
);
```

- [ ] **Step 2: Verify stories render**

Run: `npm run dev:storybook`
Check that all 6 stories render.

- [ ] **Step 3: Commit**

```bash
git add src/components/Toolbar/Toolbar.stories.tsx
git commit -m "docs(Toolbar): rewrite Ladle stories for new toolbar variants"
```

---

### Task 14: GameShell integration — pass new Toolbar props

**Files:**
- Modify: `src/pages/GameShell.tsx`
- Modify: `src/pages/PlayPage.tsx`

- [ ] **Step 1: Update GameShell to accept and pass new props**

```tsx
// src/pages/GameShell.tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toolbar } from "@/components/Toolbar/Toolbar";
import { CalibrationPopupContainer } from "./calibration/CalibrationPopupContainer";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { setTheme as saveTheme } from "@/persistence/localPersistence";
import type { CalibrationRole } from "@/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection";
import type { TeamId, PlayerData, PlayerDisplay } from "@/types/game";
import styles from "./GameShell.module.css";

export interface GameShellProps {
  role: CalibrationRole;
  onClockResync?: () => Promise<number>;
  children: React.ReactNode;
  player?: PlayerDisplay;
  phaseName?: string;
  phaseTeam?: TeamId;
  players?: PlayerData[];
  variant?: "inline" | "overlay";
}

export function GameShell({
  role,
  onClockResync,
  children,
  player,
  phaseName,
  phaseTeam,
  players,
  variant = "overlay",
}: GameShellProps) {
  const setOpen = useCalibrationUiStore((s) => s.setOpen);
  const { t } = useTranslation();

  useEffect(() => {
    if (!onClockResync) return;
    (window as unknown as { __calibrationResync?: () => Promise<number> }).__calibrationResync =
      onClockResync;
    return () => {
      delete (window as unknown as { __calibrationResync?: () => Promise<number> })
        .__calibrationResync;
    };
  }, [onClockResync]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    saveTheme(next);
  }

  const teamLabels: Partial<Record<TeamId, string>> = {
    red: t("teams.red"),
    blue: t("teams.blue"),
    none: t("teams.none"),
  };

  return (
    <div className={styles.shell}>
      <Toolbar
        variant={variant}
        player={player}
        phaseName={phaseName}
        phaseTeam={phaseTeam}
        players={players}
        teamLabels={teamLabels}
        onOpenCalibration={() => setOpen(true)}
        onToggleFullscreen={toggleFullscreen}
        onToggleTheme={toggleTheme}
      />
      {children}
      <CalibrationPopupContainer role={role} />
    </div>
  );
}
```

- [ ] **Step 2: Update `PlayPage.tsx` player path to pass GameShell props**

In the `PlayerPlayConnected` component, add store hooks and pass player info:

```tsx
function PlayerPlayConnected({
  roomId,
  playerName,
}: {
  roomId: string;
  playerName: string;
}) {
  const transport = useTransport({ role: "player", roomId, playerName });
  const phase = usePhase();
  const players = usePlayers();
  const round = useCurrentRound();
  const settings = useSettings();
  const { t } = useTranslation();
  useAudio({ playerName });

  if (transport.role !== "player") return null;

  if (transport.error === "cancelled") {
    sessionStorage.removeItem("loud-quiz-player-room");
    window.location.href = `/play${window.location.search}`;
    return null;
  }

  if (transport.error) {
    return <ConnectionError error={transport.error} onRetry={transport.retry} onCancel={transport.cancel} />;
  }

  if (transport.reconnecting && !transport.connected) {
    return <ConnectionReconnecting />;
  }

  const myPlayer = players.find((p) => p.name === playerName);
  const isInGame = phase.startsWith("round-") || phase.startsWith("blitz-") || phase.startsWith("topics-");

  return (
    <GameShell
      role="player"
      onClockResync={transport.resyncClock}
      variant={isInGame ? "inline" : "overlay"}
      player={myPlayer}
      phaseName={t(`phase.${phase}`)}
      phaseTeam={round?.teamId ?? "none"}
      players={players}
    >
      {phase === "lobby" && (
        <PlayerLobby
          playerName={playerName}
          sendAction={transport.sendAction}
          connected={transport.connected}
        />
      )}
      {phase.startsWith("topics-") && (
        <PlayerTopicsSuggest playerName={playerName} sendAction={transport.sendAction} />
      )}
      {phase.startsWith("round-") && (
        <PlayerRound playerName={playerName} sendAction={transport.sendAction} />
      )}
      {phase.startsWith("blitz-") && (
        <PlayerBlitz playerName={playerName} sendAction={transport.sendAction} />
      )}
    </GameShell>
  );
}
```

Add the needed imports at the top of `PlayPage.tsx`:

```ts
import { usePlayers, useCurrentRound, useSettings } from "@/store/selectors";
```

(`usePhase` is already imported.)

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors (there may be missing i18n keys — these are added in the next task)

- [ ] **Step 4: Commit**

```bash
git add src/pages/GameShell.tsx src/pages/PlayPage.tsx
git commit -m "feat(GameShell): wire new Toolbar props, pass player/phase from PlayPage"
```

---

### Task 15: i18n — `phase.*` and `teams.*` keys

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add phase and team keys to ru.json**

Add these keys (merge into the existing JSON structure at the top level):

```json
  "phase": {
    "lobby": "Лобби",
    "topics-collecting": "Сбор тем",
    "topics-generating": "Генерация вопросов",
    "topics-preview": "Темы готовы",
    "round-captain": "Выбор капитана",
    "round-pick": "Выбор задания",
    "round-ready": "Подготовка",
    "round-active": "Идут ответы",
    "round-answer": "Дополнительное время",
    "round-review": "Проверка",
    "round-result": "Результат раунда",
    "blitz-captain": "Капитан блица",
    "blitz-pick": "Выбор слова",
    "blitz-ready": "Подготовка",
    "blitz-active": "Цепочка объяснений",
    "blitz-answer": "Дополнительное время",
    "blitz-review": "Результат блица",
    "finale": "Финал"
  },
  "teams": {
    "red": "Красные",
    "blue": "Синие",
    "none": "Все"
  },
```

- [ ] **Step 2: Add phase and team keys to en.json**

```json
  "phase": {
    "lobby": "Lobby",
    "topics-collecting": "Collecting topics",
    "topics-generating": "Generating questions",
    "topics-preview": "Topics ready",
    "round-captain": "Pick captain",
    "round-pick": "Pick question",
    "round-ready": "Get ready",
    "round-active": "Answers",
    "round-answer": "Extra time",
    "round-review": "Review",
    "round-result": "Round result",
    "blitz-captain": "Blitz captain",
    "blitz-pick": "Pick word",
    "blitz-ready": "Get ready",
    "blitz-active": "Chain",
    "blitz-answer": "Extra time",
    "blitz-review": "Blitz result",
    "finale": "Finale"
  },
  "teams": {
    "red": "Red",
    "blue": "Blue",
    "none": "All"
  },
```

- [ ] **Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/i18n/ru.json src/i18n/en.json
git commit -m "feat(i18n): add phase.* and teams.* translation keys"
```

---

### Task 16: Integration test — run all tests, verify dev server

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Verify dev server starts**

Run: `npm run dev`
Check: app loads, no console errors

- [ ] **Step 4: Verify Ladle stories**

Run: `npm run dev:storybook`
Check: Toolbar stories render correctly

- [ ] **Step 5: Manual smoke test**

Follow manual test plan items 1-11 from `task/spec-9.2-dual-mode.md` §8.4.

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address integration issues from dual-mode testing"
```
