# Phase 9.1 — AI-review + TopicsSuggest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In AI mode, players collaboratively suggest topics → AI generates topics/questions/blitz → TaskBoard preview → round. In `round-review`, AI auto-evaluates answers with manual fallback via existing "Dispute" button.

**Architecture:** Three new real phases (`topics-collecting`, `topics-generating`, `topics-preview`) replace the single `topics-suggest`. State adds `topicsSuggest` block and `reviewResult.aiStatus`. Host runs an orchestrator effect that triggers AI calls on phase transitions. Two new page components, one new sidebar block, one new board block, one reusable error banner. All AI calls are host-only; players react to state broadcasts.

**Tech Stack:** React 19 + TypeScript (strict), Zustand, CSS Modules, Vitest, Playwright, Ladle, i18next. Existing AI modules (`src/ai/*`) and transport (BroadcastChannel / PlayerAction protocol) are used as-is.

**Spec:** `docs/superpowers/specs/2026-04-15-phase9-1-ai-review-topics-suggest-design.md`

---

## File Structure

### Created

```
src/types/game.ts                         — add GamePhase values + TopicsSuggestState + aiStatus
src/logic/timer.ts                        — add getTopicsSuggestTimerDuration
src/logic/topicsSuggest.ts                — pure helpers (shouldAutoAdvance)
src/logic/topicsSuggest.test.ts
src/store/actions/topicsSuggest.ts        — all topicsSuggest actions
src/store/actions/topicsSuggest.test.ts
src/store/actions/aiReview.ts             — new AI-review actions
src/store/actions/aiReview.test.ts
src/hooks/useAiOrchestrator.ts            — host-only effect that runs AI pipeline
src/components/AiErrorBanner/AiErrorBanner.tsx
src/components/AiErrorBanner/AiErrorBanner.module.css
src/components/AiErrorBanner/AiErrorBanner.stories.tsx
src/pages/blocks/TopicsSidebarBlock.tsx
src/pages/blocks/TopicsSidebarBlock.module.css
src/pages/blocks/TopicsBoardBlock.tsx
src/pages/blocks/TopicsBoardBlock.module.css
src/pages/topics/HostTopicsSuggest.tsx
src/pages/topics/HostTopicsSuggest.module.css
src/pages/topics/PlayerTopicsSuggest.tsx
src/pages/topics/PlayerTopicsSuggest.module.css
e2e/phase9-1-ai-happy-path.spec.ts
e2e/phase9-1-ai-review-dispute.spec.ts
e2e/phase9-1-ai-fallback-topics.spec.ts
```

### Modified

```
src/types/game.ts                 — ReviewResult adds aiStatus/aiError; GamePhase updated
src/types/transport.ts            — PlayerAction adds "no-ideas", "start-first-round"
src/store/gameStore.ts            — topicsSuggest: undefined in initial state
src/store/selectors.ts            — add useTopicsSuggest selector
src/store/stateFilter.ts          — filter suggestions per player; hide ai-review evaluations while loading
src/store/actions/lobby.ts        — "topics-suggest" → "topics-collecting"; init topicsSuggest
src/store/actions/round.ts        — no logic change; ReviewResult gets aiStatus="idle" in new results
src/logic/phaseTransitions.ts     — no changes (topics-* not in round cycle)
src/pages/PlayPage.tsx            — dispatch new PlayerActions; route new phases; mount useAiOrchestrator
src/pages/round/HostRound*        — AI-review loading/error UI
src/pages/round/PlayerRound*      — AI-review loading UI
src/i18n/ru.json, en.json         — new keys under topics.* and round.ai*
task/plan-01-init.md              — mark 9.1 items [x] on completion (during execution)
```

---

## Task 1: Types & phases

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/types/transport.ts`
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: Update `GamePhase` union**

In `src/types/game.ts` locate the `GamePhase` union (around line 22) and replace the `"topics-suggest"` entry with three new values.

```ts
export type GamePhase =
  | "lobby"
  | "topics-collecting"
  | "topics-generating"
  | "topics-preview"
  | "round-captain"
  | "round-pick"
  | "round-ready"
  | "round-active"
  | "round-answer"
  | "round-review"
  | "round-result"
  | "blitz-captain"
  | "blitz-pick"
  | "blitz-ready"
  | "blitz-active"
  | "blitz-answer"
  | "blitz-review"
  | "blitz-result"
  | "finale";
```
(Keep all other values exactly as they are; only swap `"topics-suggest"` for the three new ones.)

- [ ] **Step 2: Add `TopicsSuggestState` interface and `topicsSuggest` field on `GameState`**

Add near the other state interfaces in `src/types/game.ts`:

```ts
export interface TopicsSuggestState {
  suggestions: Record<string, string[]>;
  noIdeas: string[];
  timerEndsAt: number | null;
  manualTopics: string[] | null;
  generationStep: "topics" | "questions" | "blitz" | "done" | null;
  aiError: { step: "topics" | "questions" | "blitz"; message: string } | null;
}
```

In `GameState` add:
```ts
topicsSuggest?: TopicsSuggestState;
```

- [ ] **Step 3: Extend `ReviewResult`**

Find `ReviewResult` in `src/types/game.ts`. Add two fields:

```ts
aiStatus: "idle" | "loading" | "done" | "error";
aiError?: string;
```

- [ ] **Step 4: Extend `PlayerAction` union**

In `src/types/transport.ts` add two new kinds:
```ts
| { kind: "no-ideas" }
| { kind: "start-first-round" }
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc -b`
Expected: errors in existing files that referenced `"topics-suggest"` and in code that constructs `ReviewResult` without `aiStatus`. These will be fixed in later tasks.

- [ ] **Step 6: Commit**

```bash
git add src/types/game.ts src/types/transport.ts
git commit -m "types(phase9.1): add topics-collecting/generating/preview phases and TopicsSuggestState"
```

---

## Task 2: Fix existing ReviewResult constructors to include aiStatus

**Files:**
- Modify: `src/store/actions/round.ts`
- Modify: `src/store/actions/blitz.ts` (if constructs ReviewResult)

- [ ] **Step 1: Find all places that create a `reviewResult` object**

Run: `grep -n "reviewResult" src/store/actions/*.ts src/logic/*.ts`

- [ ] **Step 2: Add `aiStatus: "idle"` to every literal `reviewResult: { ... }` creation**

For each assignment like:
```ts
reviewResult: {
  evaluations: [...],
  groups: [...],
  bonusTime: 0,
  bonusTimeApplied: false,
  score: 0,
}
```
add `aiStatus: "idle",` (and leave `aiError` absent).

In `disputeReview()` (`src/store/actions/round.ts` line 412), the spread already preserves `aiStatus`; but when resetting after dispute, override to `aiStatus: "idle"` explicitly:
```ts
reviewResult: {
  ...state.currentRound.reviewResult,
  aiStatus: "idle",
  aiError: undefined,
  score: 0,
  evaluations,
  bonusTimeApplied
},
```

- [ ] **Step 3: Verify tsc passes for round/blitz actions**

Run: `npx tsc -b 2>&1 | grep -v "topics-suggest"` (ignoring known remaining failures)
Expected: no errors mentioning `aiStatus`.

- [ ] **Step 4: Run existing round/blitz tests**

Run: `npx vitest run src/store/actions/round.test.ts src/store/actions/blitz.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/round.ts src/store/actions/blitz.ts
git commit -m "types(phase9.1): add aiStatus=idle to all ReviewResult constructors"
```

---

## Task 3: Lobby transition & initial topicsSuggest

**Files:**
- Modify: `src/store/actions/lobby.ts`
- Modify: `src/store/actions/lobby.test.ts`
- Modify: `src/store/gameStore.ts`
- Create: `src/logic/timer.ts` (extend)

- [ ] **Step 1: Add `getTopicsSuggestTimerDuration` in `src/logic/timer.ts`**

Add at bottom of file:
```ts
export function getTopicsSuggestTimerDuration(): number {
  return 60 * 1000;
}
```

- [ ] **Step 2: Write failing test: AI mode transitions to `topics-collecting`**

Replace the existing test in `src/store/actions/lobby.test.ts` that asserts `"topics-suggest"` (line ~202). Update to:
```ts
it("startGame transitions to topics-collecting for AI mode", () => {
  useGameStore.setState({
    /* ...existing setup that sets mode:"ai", valid players/teams... */
  });
  startGame();
  const s = useGameStore.getState();
  expect(s.phase).toBe("topics-collecting");
  expect(s.topicsSuggest).toBeDefined();
  expect(s.topicsSuggest?.suggestions).toEqual({});
  expect(s.topicsSuggest?.noIdeas).toEqual([]);
  expect(s.topicsSuggest?.manualTopics).toBeNull();
  expect(s.topicsSuggest?.timerEndsAt).not.toBeNull();
  expect(s.timer).not.toBeNull();
});
```

Apply the same replacement to the host variant test (in `startGameAsHost` block) — replace `"topics-suggest"` with `"topics-collecting"` and assert `topicsSuggest` shape.

- [ ] **Step 3: Run test — expect fail**

Run: `npx vitest run src/store/actions/lobby.test.ts`
Expected: fails with `phase === "topics-suggest"` or similar.

- [ ] **Step 4: Implement — update `startGame` and `startGameAsHost`**

In `src/store/actions/lobby.ts`:

Replace (line ~99-100):
```ts
const nextPhase =
  state.settings.mode === "ai" ? "topics-suggest" : "round-captain";
```
with:
```ts
const nextPhase =
  state.settings.mode === "ai" ? "topics-collecting" : "round-captain";
```

Replace (line ~103-108) the `roundInit` block with logic that creates `topicsSuggest` state and a 60s timer for the AI branch:
```ts
let extra: Partial<GameState> = {};
if (nextPhase === "round-captain") {
  const teamId = state.teams[0]?.id ?? "none";
  extra = {
    currentRound: createNextRoundState(teamId),
    timer: createTimer(getCaptainTimerDuration()),
  };
} else {
  // topics-collecting
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
```

Import `getTopicsSuggestTimerDuration` alongside existing timer imports. Apply the same change in `startGameAsHost`.

Add `import type { GameState } from "@/types/game";` at top if not present.

- [ ] **Step 5: Run test — expect pass**

Run: `npx vitest run src/store/actions/lobby.test.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/logic/timer.ts src/store/actions/lobby.ts src/store/actions/lobby.test.ts
git commit -m "feat(phase9.1): lobby → topics-collecting with 60s timer + topicsSuggest init"
```

---

## Task 4: Selector for topicsSuggest

**Files:**
- Modify: `src/store/selectors.ts`

- [ ] **Step 1: Add selector**

At the bottom of `src/store/selectors.ts`:
```ts
export function useTopicsSuggest() {
  return useGameStore((s) => s.topicsSuggest);
}
```

- [ ] **Step 2: Verify tsc**

Run: `npx tsc -b`
Expected: passes (given earlier type fixes).

- [ ] **Step 3: Commit**

```bash
git add src/store/selectors.ts
git commit -m "feat(phase9.1): add useTopicsSuggest selector"
```

---

## Task 5: Pure helper — shouldAutoAdvance

**Files:**
- Create: `src/logic/topicsSuggest.ts`
- Create: `src/logic/topicsSuggest.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/logic/topicsSuggest.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { shouldAutoAdvance } from "./topicsSuggest";

describe("shouldAutoAdvance", () => {
  const onlinePlayers = ["alice", "bob", "carol"];

  it("false when no one contributed", () => {
    expect(shouldAutoAdvance(onlinePlayers, {}, [], 3)).toBe(false);
  });

  it("true when every online player filled topicCount", () => {
    const suggestions = {
      alice: ["a", "b", "c"],
      bob: ["a", "b", "c"],
      carol: ["a", "b", "c"],
    };
    expect(shouldAutoAdvance(onlinePlayers, suggestions, [], 3)).toBe(true);
  });

  it("true when every online player is in noIdeas", () => {
    expect(shouldAutoAdvance(onlinePlayers, {}, onlinePlayers, 3)).toBe(true);
  });

  it("true when mix of full and noIdeas covers everyone", () => {
    const suggestions = { alice: ["a", "b", "c"] };
    expect(shouldAutoAdvance(onlinePlayers, suggestions, ["bob", "carol"], 3)).toBe(true);
  });

  it("false when one player neither full nor noIdeas", () => {
    const suggestions = { alice: ["a", "b", "c"], bob: ["x"] };
    expect(shouldAutoAdvance(onlinePlayers, suggestions, ["carol"], 3)).toBe(false);
  });

  it("false when onlinePlayers is empty", () => {
    expect(shouldAutoAdvance([], {}, [], 3)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `npx vitest run src/logic/topicsSuggest.test.ts`
Expected: "Cannot find module".

- [ ] **Step 3: Implement**

Create `src/logic/topicsSuggest.ts`:
```ts
export function shouldAutoAdvance(
  onlinePlayerNames: string[],
  suggestions: Record<string, string[]>,
  noIdeas: string[],
  topicCount: number,
): boolean {
  if (onlinePlayerNames.length === 0) return false;
  return onlinePlayerNames.every((name) => {
    if (noIdeas.includes(name)) return true;
    const mine = suggestions[name] ?? [];
    return mine.length >= topicCount;
  });
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `npx vitest run src/logic/topicsSuggest.test.ts`
Expected: 6 pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/topicsSuggest.ts src/logic/topicsSuggest.test.ts
git commit -m "feat(phase9.1): add shouldAutoAdvance helper"
```

---

## Task 6: topicsSuggest actions (player-driven)

**Files:**
- Create: `src/store/actions/topicsSuggest.ts`
- Create: `src/store/actions/topicsSuggest.test.ts`

- [ ] **Step 1: Write failing tests for submitTopicSuggestion / playerNoIdeas / startFirstRound**

Create `src/store/actions/topicsSuggest.test.ts`:
```ts
import { beforeEach, describe, it, expect, vi } from "vitest";
import { useGameStore } from "@/store/gameStore";
import {
  submitTopicSuggestion,
  playerNoIdeas,
  startFirstRound,
} from "./topicsSuggest";
import type { GameState, TopicsSuggestState } from "@/types/game";

function baseState(overrides: Partial<GameState> = {}): Partial<GameState> {
  return {
    phase: "topics-collecting",
    settings: {
      mode: "ai",
      teamMode: "single",
      topicCount: 3,
      questionsPerTopic: 3,
      blitzRoundsPerTeam: 1,
      pastQuestions: [],
    },
    players: [
      { name: "alice", team: "red", emoji: "🦊", online: true, ready: false },
      { name: "bob", team: "red", emoji: "🐻", online: true, ready: false },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }],
    topicsSuggest: {
      suggestions: {},
      noIdeas: [],
      timerEndsAt: performance.now() + 60000,
      manualTopics: null,
      generationStep: null,
      aiError: null,
    },
    ...overrides,
  };
}

describe("submitTopicSuggestion", () => {
  beforeEach(() => useGameStore.setState(baseState() as GameState, true));

  it("adds topic in order", () => {
    submitTopicSuggestion("alice", "Football");
    submitTopicSuggestion("alice", "Movies");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toEqual([
      "Football",
      "Movies",
    ]);
  });

  it("ignores when at topicCount limit", () => {
    submitTopicSuggestion("alice", "a");
    submitTopicSuggestion("alice", "b");
    submitTopicSuggestion("alice", "c");
    submitTopicSuggestion("alice", "d");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toHaveLength(3);
  });

  it("ignores when player in noIdeas", () => {
    useGameStore.setState((s) => ({
      topicsSuggest: { ...s.topicsSuggest!, noIdeas: ["alice"] },
    }));
    submitTopicSuggestion("alice", "x");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toBeUndefined();
  });

  it("ignores when manualTopics !== null", () => {
    useGameStore.setState((s) => ({
      topicsSuggest: { ...s.topicsSuggest!, manualTopics: [] },
    }));
    submitTopicSuggestion("alice", "x");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toBeUndefined();
  });

  it("ignores empty/whitespace", () => {
    submitTopicSuggestion("alice", "   ");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toBeUndefined();
  });

  it("ignores when phase is not topics-collecting", () => {
    useGameStore.setState({ phase: "lobby" });
    submitTopicSuggestion("alice", "x");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toBeUndefined();
  });
});

describe("playerNoIdeas", () => {
  beforeEach(() => useGameStore.setState(baseState() as GameState, true));

  it("adds player to noIdeas", () => {
    playerNoIdeas("alice");
    expect(useGameStore.getState().topicsSuggest?.noIdeas).toContain("alice");
  });

  it("idempotent", () => {
    playerNoIdeas("alice");
    playerNoIdeas("alice");
    expect(useGameStore.getState().topicsSuggest?.noIdeas).toEqual(["alice"]);
  });
});

describe("startFirstRound", () => {
  beforeEach(() =>
    useGameStore.setState(
      baseState({ phase: "topics-preview", topics: [{ name: "X", questions: [] }] }) as GameState,
      true,
    ),
  );

  it("transitions to round-captain with given teamId", () => {
    startFirstRound("red");
    const s = useGameStore.getState();
    expect(s.phase).toBe("round-captain");
    expect(s.currentRound?.teamId).toBe("red");
  });

  it('resolves "random" to a valid team id', () => {
    startFirstRound("random");
    const s = useGameStore.getState();
    expect(s.phase).toBe("round-captain");
    expect(["red"]).toContain(s.currentRound?.teamId);
  });

  it("no-op when phase != topics-preview", () => {
    useGameStore.setState({ phase: "lobby" });
    startFirstRound("red");
    expect(useGameStore.getState().phase).toBe("lobby");
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run src/store/actions/topicsSuggest.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement actions file (player-facing + startFirstRound)**

Create `src/store/actions/topicsSuggest.ts`:
```ts
import { useGameStore } from "@/store/gameStore";
import { shouldAutoAdvance } from "@/logic/topicsSuggest";
import { getOnlinePlayers } from "@/store/selectors";
import { createNextRoundState } from "@/logic/phaseTransitions";
import { createTimer, getCaptainTimerDuration } from "@/logic/timer";
import type { TeamId, TopicsSuggestState } from "@/types/game";

function mutateTopicsSuggest(fn: (ts: TopicsSuggestState) => TopicsSuggestState): void {
  const s = useGameStore.getState();
  if (!s.topicsSuggest) return;
  useGameStore.getState().setState({ topicsSuggest: fn(s.topicsSuggest) });
}

export function submitTopicSuggestion(playerName: string, topic: string): void {
  const text = topic.trim();
  if (!text) return;
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics !== null) return;
  if (s.topicsSuggest.noIdeas.includes(playerName)) return;
  const existing = s.topicsSuggest.suggestions[playerName] ?? [];
  if (existing.length >= s.settings.topicCount) return;

  mutateTopicsSuggest((ts) => ({
    ...ts,
    suggestions: { ...ts.suggestions, [playerName]: [...existing, text] },
  }));
  checkAutoAdvance();
}

export function playerNoIdeas(playerName: string): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics !== null) return;
  if (s.topicsSuggest.noIdeas.includes(playerName)) return;

  mutateTopicsSuggest((ts) => ({
    ...ts,
    noIdeas: [...ts.noIdeas, playerName],
  }));
  checkAutoAdvance();
}

export function startFirstRound(teamIdOrRandom: TeamId | "random"): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-preview") return;
  let teamId: TeamId;
  if (teamIdOrRandom === "random") {
    const teams = s.teams.filter((t) => t.id !== "none");
    if (teams.length === 0) return;
    teamId = teams[Math.floor(Math.random() * teams.length)]!.id;
  } else {
    teamId = teamIdOrRandom;
    if (teamId === "none") return;
    if (!s.teams.some((t) => t.id === teamId)) return;
  }
  useGameStore.getState().setState({
    phase: "round-captain",
    currentRound: createNextRoundState(teamId),
    timer: createTimer(getCaptainTimerDuration()),
    topicsSuggest: undefined,
  });
}

// Internal — exported for tests / orchestrator.
export function checkAutoAdvance(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics !== null) return;
  const online = getOnlinePlayers(s).map((p) => p.name);
  if (!shouldAutoAdvance(online, s.topicsSuggest.suggestions, s.topicsSuggest.noIdeas, s.settings.topicCount)) return;
  startGeneration();
}

export function handleTimerExpiry(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics !== null) return;
  startGeneration();
}

export function startGeneration(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  const manual = s.topicsSuggest.manualTopics;
  const step: "topics" | "questions" = manual && manual.length > 0 ? "questions" : "topics";
  const next: TopicsSuggestState = {
    ...s.topicsSuggest,
    timerEndsAt: null,
    generationStep: step,
    aiError: null,
  };
  // If manual topics provided, pre-fill state.topics with empty-question topics.
  const extra =
    manual && manual.length > 0
      ? { topics: manual.map((name) => ({ name, questions: [] })) }
      : {};
  useGameStore.getState().setState({
    phase: "topics-generating",
    topicsSuggest: next,
    timer: null,
    ...extra,
  });
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/store/actions/topicsSuggest.test.ts`
Expected: all 10 pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/topicsSuggest.ts src/store/actions/topicsSuggest.test.ts
git commit -m "feat(phase9.1): topicsSuggest player-facing actions + startFirstRound"
```

---

## Task 7: topicsSuggest actions (host-driven) + generation orchestration hooks

**Files:**
- Modify: `src/store/actions/topicsSuggest.ts`
- Modify: `src/store/actions/topicsSuggest.test.ts`

- [ ] **Step 1: Write failing tests for host actions and orchestration callbacks**

Append to `src/store/actions/topicsSuggest.test.ts`:
```ts
import {
  hostStartManualTopics,
  hostCancelManualTopics,
  hostSubmitManualTopics,
  onAiStepSuccess,
  onAiStepError,
  retryAiStep,
  fallbackToManualTopics,
} from "./topicsSuggest";

describe("hostStartManualTopics / Cancel / Submit", () => {
  beforeEach(() => useGameStore.setState(baseState() as GameState, true));

  it("hostStartManualTopics sets manualTopics=[] and stops timer", () => {
    hostStartManualTopics();
    const ts = useGameStore.getState().topicsSuggest!;
    expect(ts.manualTopics).toEqual([]);
    expect(ts.timerEndsAt).toBeNull();
    expect(useGameStore.getState().timer).toBeNull();
  });

  it("hostCancelManualTopics restores null and restarts timer", () => {
    hostStartManualTopics();
    hostCancelManualTopics();
    const s = useGameStore.getState();
    expect(s.topicsSuggest?.manualTopics).toBeNull();
    expect(s.timer).not.toBeNull();
  });

  it("hostSubmitManualTopics validates non-empty and transitions to topics-generating with questions step", () => {
    hostStartManualTopics();
    hostSubmitManualTopics(["A", "B"]);
    const s = useGameStore.getState();
    expect(s.phase).toBe("topics-generating");
    expect(s.topicsSuggest?.generationStep).toBe("questions");
    expect(s.topics.map((t) => t.name)).toEqual(["A", "B"]);
  });

  it("hostSubmitManualTopics ignores empty array", () => {
    hostStartManualTopics();
    hostSubmitManualTopics([]);
    expect(useGameStore.getState().phase).toBe("topics-collecting");
  });
});

describe("AI step callbacks", () => {
  beforeEach(() => {
    useGameStore.setState(
      baseState({
        phase: "topics-generating",
        topicsSuggest: {
          suggestions: {},
          noIdeas: [],
          timerEndsAt: null,
          manualTopics: null,
          generationStep: "topics",
          aiError: null,
        },
      }) as GameState,
      true,
    );
  });

  it("onAiStepSuccess('topics', result) advances to questions step and stores topic names", () => {
    onAiStepSuccess("topics", { topics: ["Films", "Music", "Sports"] });
    const s = useGameStore.getState();
    expect(s.topicsSuggest?.generationStep).toBe("questions");
    expect(s.topics.map((t) => t.name)).toEqual(["Films", "Music", "Sports"]);
  });

  it("onAiStepSuccess('questions', ...) advances to blitz step and fills questions", () => {
    useGameStore.setState({ topics: [{ name: "Films", questions: [] }] });
    useGameStore.setState((s) => ({
      topicsSuggest: { ...s.topicsSuggest!, generationStep: "questions" },
    }));
    onAiStepSuccess("questions", {
      topics: [
        {
          name: "Films",
          questions: [{ text: "Q", difficulty: 100, acceptedAnswers: ["A"] }],
        },
      ],
    });
    const s = useGameStore.getState();
    expect(s.topics[0]!.questions).toHaveLength(1);
    expect(s.topicsSuggest?.generationStep).toBe("blitz");
  });

  it("onAiStepSuccess('blitz', ...) transitions to topics-preview", () => {
    useGameStore.setState((s) => ({
      topicsSuggest: { ...s.topicsSuggest!, generationStep: "blitz" },
    }));
    onAiStepSuccess("blitz", {
      blitzTasks: [
        {
          items: [
            { text: "t1", difficulty: 200, acceptedAnswers: ["a"] },
            { text: "t2", difficulty: 210, acceptedAnswers: ["b"] },
            { text: "t3", difficulty: 220, acceptedAnswers: ["c"] },
          ],
        },
      ],
    });
    const s = useGameStore.getState();
    expect(s.phase).toBe("topics-preview");
    expect(s.blitzTasks).toHaveLength(1);
    expect(s.topicsSuggest).toBeUndefined();
  });

  it("onAiStepError records aiError without changing phase", () => {
    onAiStepError("topics", "boom");
    const s = useGameStore.getState();
    expect(s.phase).toBe("topics-generating");
    expect(s.topicsSuggest?.aiError).toEqual({ step: "topics", message: "boom" });
  });

  it("retryAiStep clears aiError keeping same generationStep", () => {
    onAiStepError("topics", "boom");
    retryAiStep();
    const s = useGameStore.getState();
    expect(s.topicsSuggest?.aiError).toBeNull();
    expect(s.topicsSuggest?.generationStep).toBe("topics");
  });

  it("fallbackToManualTopics only allowed when aiError.step==='topics'", () => {
    onAiStepError("topics", "boom");
    fallbackToManualTopics();
    const s = useGameStore.getState();
    expect(s.phase).toBe("topics-collecting");
    expect(s.topicsSuggest?.manualTopics).toEqual([]);
    expect(s.topicsSuggest?.aiError).toBeNull();
    expect(s.timer).toBeNull();
  });

  it("fallbackToManualTopics no-op when aiError.step !== 'topics'", () => {
    onAiStepError("questions", "boom");
    fallbackToManualTopics();
    expect(useGameStore.getState().phase).toBe("topics-generating");
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run src/store/actions/topicsSuggest.test.ts`
Expected: multiple failures (new exports not defined).

- [ ] **Step 3: Implement host actions and orchestration callbacks**

Append to `src/store/actions/topicsSuggest.ts`:
```ts
import { getTopicsSuggestTimerDuration } from "@/logic/timer";

export function hostStartManualTopics(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  useGameStore.getState().setState({
    topicsSuggest: {
      ...s.topicsSuggest,
      manualTopics: [],
      timerEndsAt: null,
    },
    timer: null,
  });
}

export function hostCancelManualTopics(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics === null) return;
  const timer = createTimer(getTopicsSuggestTimerDuration());
  useGameStore.getState().setState({
    topicsSuggest: {
      ...s.topicsSuggest,
      manualTopics: null,
      timerEndsAt: timer.startedAt + timer.duration,
    },
    timer,
  });
}

export function hostSubmitManualTopics(topics: string[]): void {
  const clean = topics.map((t) => t.trim()).filter((t) => t.length > 0);
  if (clean.length === 0) return;
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  useGameStore.getState().setState({
    topicsSuggest: {
      ...s.topicsSuggest,
      manualTopics: clean,
      timerEndsAt: null,
    },
    timer: null,
  });
  // Immediately move into generation with step=questions.
  startGeneration();
}

export function onAiStepSuccess(
  step: "topics" | "questions" | "blitz",
  result:
    | { topics: string[] }
    | { topics: { name: string; questions: { text: string; difficulty: number; acceptedAnswers: string[] }[] }[] }
    | { blitzTasks: { items: { text: string; difficulty: number; acceptedAnswers: string[] }[] }[] },
): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-generating" || !s.topicsSuggest) return;
  if (s.topicsSuggest.generationStep !== step) return;

  if (step === "topics") {
    const names = (result as { topics: string[] }).topics;
    useGameStore.getState().setState({
      topics: names.map((name) => ({ name, questions: [] })),
      topicsSuggest: {
        ...s.topicsSuggest,
        generationStep: "questions",
        aiError: null,
      },
    });
    return;
  }

  if (step === "questions") {
    const payload = (result as {
      topics: { name: string; questions: { text: string; difficulty: number; acceptedAnswers: string[] }[] }[];
    }).topics;
    useGameStore.getState().setState({
      topics: payload,
      topicsSuggest: {
        ...s.topicsSuggest,
        generationStep: "blitz",
        aiError: null,
      },
    });
    return;
  }

  // step === "blitz"
  const payload = (result as {
    blitzTasks: { items: { text: string; difficulty: number; acceptedAnswers: string[] }[] }[];
  }).blitzTasks;
  useGameStore.getState().setState({
    blitzTasks: payload,
    phase: "topics-preview",
    topicsSuggest: undefined,
  });
}

export function onAiStepError(step: "topics" | "questions" | "blitz", message: string): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-generating" || !s.topicsSuggest) return;
  useGameStore.getState().setState({
    topicsSuggest: { ...s.topicsSuggest, aiError: { step, message } },
  });
}

export function retryAiStep(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-generating" || !s.topicsSuggest) return;
  if (!s.topicsSuggest.aiError) return;
  useGameStore.getState().setState({
    topicsSuggest: { ...s.topicsSuggest, aiError: null },
  });
  // orchestrator hook (useAiOrchestrator) will observe aiError=null + generationStep and retrigger.
}

export function fallbackToManualTopics(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-generating" || !s.topicsSuggest) return;
  if (s.topicsSuggest.aiError?.step !== "topics") return;
  useGameStore.getState().setState({
    phase: "topics-collecting",
    topicsSuggest: {
      ...s.topicsSuggest,
      manualTopics: [],
      generationStep: null,
      aiError: null,
      timerEndsAt: null,
    },
    timer: null,
  });
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/store/actions/topicsSuggest.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/topicsSuggest.ts src/store/actions/topicsSuggest.test.ts
git commit -m "feat(phase9.1): host actions + orchestration callbacks for topicsSuggest"
```

---

## Task 8: AI-review actions (round-review auto-evaluate)

**Files:**
- Create: `src/store/actions/aiReview.ts`
- Create: `src/store/actions/aiReview.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/store/actions/aiReview.test.ts`:
```ts
import { beforeEach, describe, it, expect } from "vitest";
import { useGameStore } from "@/store/gameStore";
import type { GameState } from "@/types/game";
import {
  beginAiReview,
  onAiReviewSuccess,
  onAiReviewError,
  retryAiReview,
  fallbackReviewToManual,
} from "./aiReview";

function baseState(): Partial<GameState> {
  return {
    phase: "round-review",
    settings: {
      mode: "ai",
      teamMode: "single",
      topicCount: 3,
      questionsPerTopic: 3,
      blitzRoundsPerTeam: 1,
      pastQuestions: [],
    },
    players: [
      { name: "alice", team: "red", emoji: "🦊", online: true, ready: true },
      { name: "bob", team: "red", emoji: "🐻", online: true, ready: true },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }],
    currentRound: {
      type: "round",
      teamId: "red",
      captainName: "alice",
      questionIndex: 0,
      jokerActive: false,
      playerOrder: ["alice", "bob"],
      answers: { bob: { text: "apple", receivedAt: 0 } },
      reviewResult: {
        evaluations: [],
        groups: [],
        bonusTime: 0,
        bonusTimeApplied: false,
        score: 0,
        aiStatus: "idle",
      },
    } as any,
  };
}

describe("beginAiReview", () => {
  beforeEach(() => useGameStore.setState(baseState() as GameState, true));

  it("only runs when mode=ai and aiStatus=idle", () => {
    beginAiReview();
    expect(useGameStore.getState().currentRound?.reviewResult?.aiStatus).toBe("loading");
  });

  it("no-op if mode=manual", () => {
    useGameStore.setState({
      settings: { ...useGameStore.getState().settings, mode: "manual" },
    });
    beginAiReview();
    expect(useGameStore.getState().currentRound?.reviewResult?.aiStatus).toBe("idle");
  });

  it("no-op if already loading", () => {
    useGameStore.setState((s) => ({
      currentRound: {
        ...s.currentRound!,
        reviewResult: { ...s.currentRound!.reviewResult!, aiStatus: "loading" },
      },
    }));
    beginAiReview();
    expect(useGameStore.getState().currentRound?.reviewResult?.aiStatus).toBe("loading");
  });
});

describe("onAiReviewSuccess", () => {
  beforeEach(() => useGameStore.setState(baseState() as GameState, true));

  it("fills evaluations and marks aiStatus=done", () => {
    beginAiReview();
    onAiReviewSuccess({
      evaluations: [{ playerName: "bob", correct: true }],
      groups: [["bob"]],
    });
    const rr = useGameStore.getState().currentRound?.reviewResult!;
    expect(rr.aiStatus).toBe("done");
    expect(rr.evaluations).toEqual([{ playerName: "bob", correct: true }]);
    expect(rr.groups).toEqual([["bob"]]);
  });
});

describe("onAiReviewError", () => {
  beforeEach(() => useGameStore.setState(baseState() as GameState, true));

  it("marks aiStatus=error with message", () => {
    beginAiReview();
    onAiReviewError("boom");
    const rr = useGameStore.getState().currentRound?.reviewResult!;
    expect(rr.aiStatus).toBe("error");
    expect(rr.aiError).toBe("boom");
  });
});

describe("retryAiReview & fallbackReviewToManual", () => {
  beforeEach(() => useGameStore.setState(baseState() as GameState, true));

  it("retryAiReview resets to loading, clears aiError", () => {
    beginAiReview();
    onAiReviewError("boom");
    retryAiReview();
    const rr = useGameStore.getState().currentRound?.reviewResult!;
    expect(rr.aiStatus).toBe("loading");
    expect(rr.aiError).toBeUndefined();
  });

  it("fallbackReviewToManual resets to idle (manual UI active)", () => {
    beginAiReview();
    onAiReviewError("boom");
    fallbackReviewToManual();
    const rr = useGameStore.getState().currentRound?.reviewResult!;
    expect(rr.aiStatus).toBe("idle");
    expect(rr.aiError).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run src/store/actions/aiReview.test.ts`
Expected: "Cannot find module".

- [ ] **Step 3: Implement**

Create `src/store/actions/aiReview.ts`:
```ts
import { useGameStore } from "@/store/gameStore";
import type { AnswerEvaluation, RoundState } from "@/types/game";

function updateReviewResult(mutator: (rr: NonNullable<RoundState["reviewResult"]>) => NonNullable<RoundState["reviewResult"]>): void {
  const s = useGameStore.getState();
  if (!s.currentRound?.reviewResult) return;
  useGameStore.getState().setState({
    currentRound: {
      ...s.currentRound,
      reviewResult: mutator(s.currentRound.reviewResult),
    },
  });
}

export function beginAiReview(): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  if (s.settings.mode !== "ai") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "idle") return;
  updateReviewResult((rr) => ({ ...rr, aiStatus: "loading", aiError: undefined }));
}

export function onAiReviewSuccess(result: {
  evaluations: AnswerEvaluation[];
  groups: string[][];
}): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "loading") return;
  updateReviewResult((rr) => ({
    ...rr,
    aiStatus: "done",
    aiError: undefined,
    evaluations: result.evaluations,
    groups: result.groups,
  }));
}

export function onAiReviewError(message: string): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "loading") return;
  updateReviewResult((rr) => ({ ...rr, aiStatus: "error", aiError: message }));
}

export function retryAiReview(): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "error") return;
  updateReviewResult((rr) => ({ ...rr, aiStatus: "loading", aiError: undefined }));
}

export function fallbackReviewToManual(): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "error") return;
  updateReviewResult((rr) => ({ ...rr, aiStatus: "idle", aiError: undefined }));
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/store/actions/aiReview.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/aiReview.ts src/store/actions/aiReview.test.ts
git commit -m "feat(phase9.1): ai-review actions (begin/success/error/retry/fallback)"
```

---

## Task 9: AI orchestrator hook (host-only)

**Files:**
- Create: `src/hooks/useAiOrchestrator.ts`

- [ ] **Step 1: Implement orchestrator**

Create `src/hooks/useAiOrchestrator.ts`:
```ts
import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { generateTopics } from "@/ai/topicGeneration";
import { generateQuestions } from "@/ai/questionGeneration";
import { generateBlitzTasks } from "@/ai/blitzGeneration";
import { checkAnswers } from "@/ai/answerCheck";
import {
  onAiStepSuccess,
  onAiStepError,
  handleTimerExpiry,
} from "@/store/actions/topicsSuggest";
import {
  beginAiReview,
  onAiReviewSuccess,
  onAiReviewError,
} from "@/store/actions/aiReview";
import { confirmReview } from "@/store/actions/round";
import { getApiKey } from "@/persistence/localPersistence";
import i18n from "@/i18n";

function flattenSuggestions(suggestions: Record<string, string[]>): string[] {
  return Object.values(suggestions).flat();
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function useAiOrchestrator(isHost: boolean): void {
  const runningRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isHost) return;
    return useGameStore.subscribe((state, prev) => {
      // --- Timer expiry watcher for topics-collecting ---
      if (state.phase === "topics-collecting" && state.topicsSuggest?.timerEndsAt) {
        if (timerRef.current) clearTimeout(timerRef.current);
        const remaining = state.topicsSuggest.timerEndsAt - performance.now();
        if (remaining <= 0) {
          handleTimerExpiry();
        } else {
          timerRef.current = setTimeout(() => handleTimerExpiry(), remaining);
        }
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // --- AI generation pipeline ---
      if (
        state.phase === "topics-generating" &&
        state.topicsSuggest &&
        !state.topicsSuggest.aiError
      ) {
        const step = state.topicsSuggest.generationStep;
        const key = `${step}:${JSON.stringify(state.topicsSuggest.suggestions)}`;
        if (step && runningRef.current !== key) {
          runningRef.current = key;
          const apiKey = getApiKey() ?? "";
          const language = i18n.language || "ru";
          if (step === "topics") {
            generateTopics({
              apiKey,
              language,
              suggestions: flattenSuggestions(state.topicsSuggest.suggestions),
              count: state.settings.topicCount,
            })
              .then((r) => onAiStepSuccess("topics", { topics: r.topics.map((t) => t.name) }))
              .catch((e) => onAiStepError("topics", errorMessage(e)));
          } else if (step === "questions") {
            generateQuestions({
              apiKey,
              language,
              topics: state.topics.map((t) => t.name),
              questionsPerTopic: state.settings.questionsPerTopic,
              playerCount: state.players.length,
            })
              .then((r) => onAiStepSuccess("questions", { topics: r.topics }))
              .catch((e) => onAiStepError("questions", errorMessage(e)));
          } else if (step === "blitz") {
            generateBlitzTasks({
              apiKey,
              language,
              roundsCount: state.settings.blitzRoundsPerTeam * state.teams.filter((t) => t.id !== "none").length,
              playerCount: state.players.length,
              pastTasks: state.settings.pastQuestions,
            })
              .then((r) => onAiStepSuccess("blitz", { blitzTasks: r.blitzTasks }))
              .catch((e) => onAiStepError("blitz", errorMessage(e)));
          }
        }
      } else {
        runningRef.current = null;
      }

      // --- AI review ---
      if (
        state.phase === "round-review" &&
        state.settings.mode === "ai" &&
        state.currentRound?.reviewResult?.aiStatus === "idle"
      ) {
        beginAiReview();
      }

      if (
        state.phase === "round-review" &&
        state.currentRound?.reviewResult?.aiStatus === "loading" &&
        prev.currentRound?.reviewResult?.aiStatus !== "loading"
      ) {
        const s = state;
        const round = s.currentRound!;
        const q = s.topics[/* derived */ 0]?.questions[0]; // placeholder, replaced below
        const question = (function () {
          // Use existing selector to find current question
          const linearIdx = round.questionIndex ?? 0;
          let i = 0;
          for (const topic of s.topics) {
            for (const qq of topic.questions) {
              if (i === linearIdx) return qq;
              i++;
            }
          }
          return undefined;
        })();
        if (!question) {
          onAiReviewError("question not found");
        } else {
          const apiKey = getApiKey() ?? "";
          const language = i18n.language || "ru";
          const answers: Record<string, string> = {};
          for (const [name, a] of Object.entries(round.answers)) {
            if (name !== round.captainName) answers[name] = a.text;
          }
          checkAnswers({
            apiKey,
            language,
            questionText: question.text,
            acceptedAnswers: question.acceptedAnswers,
            answers,
          })
            .then((r) => onAiReviewSuccess({ evaluations: r.evaluations, groups: r.groups }))
            .catch((e) => onAiReviewError(errorMessage(e)));
        }
      }

      // --- Auto-transition to round-result once aiStatus=done ---
      if (
        state.phase === "round-review" &&
        state.currentRound?.reviewResult?.aiStatus === "done" &&
        prev.currentRound?.reviewResult?.aiStatus !== "done"
      ) {
        confirmReview();
      }
    });
  }, [isHost]);
}
```

Notes for the engineer:
- Inline `getCurrentQuestion`-style lookup avoids a circular import; an equivalent selector exists in `src/store/selectors.ts` — prefer importing it if no cycle results.
- `generateTopics` returns `{ topics: Topic[] }` where `Topic` has `{name, description}`; adjust the `.map((t) => t.name)` based on the actual shape in `src/types/ai.ts` when implementing.
- `generateQuestions`/`generateBlitzTasks` input shapes live in `src/types/ai.ts` — validate against those exports; adapt property names only if they differ.

- [ ] **Step 2: Verify tsc**

Run: `npx tsc -b`
Expected: passes. Fix any mismatched AI input/output field names.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAiOrchestrator.ts
git commit -m "feat(phase9.1): host-only AI orchestrator hook (topics + review + timer)"
```

---

## Task 10: stateFilter for topics and AI-review

**Files:**
- Modify: `src/store/stateFilter.ts`
- Modify: `src/store/stateFilter.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/store/stateFilter.test.ts`:
```ts
describe("topics-collecting state filter", () => {
  it("player sees only their own suggestions", () => {
    const full: GameState = { /* ...base with topicsSuggest.suggestions = { alice:['a','b'], bob:['x'] } */ } as any;
    const filtered = filterStateForPlayer(full, "alice");
    expect(filtered.topicsSuggest?.suggestions).toEqual({ alice: ["a", "b"] });
  });

  it("player sees noIdeas, timer, manualTopics as-is", () => {
    // ... assert those fields equal full's
  });
});

describe("round-review AI evaluations hidden until done", () => {
  it("player does not see evaluations while aiStatus=loading", () => {
    // construct reviewResult with aiStatus:'loading', evaluations:[{playerName:'bob', correct:true}]
    // expect filtered.currentRound.reviewResult.evaluations == []
  });

  it("aiStatus=done: player sees own evaluation only", () => {
    // existing rule: respondent sees own; keep consistent
  });
});
```

(Engineer: flesh out using existing test-helpers in the same file — this suite already has base-state factories.)

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run src/store/stateFilter.test.ts`

- [ ] **Step 3: Implement filter extensions**

In `src/store/stateFilter.ts`:
- For phases `topics-collecting` | `topics-generating` | `topics-preview`: if `state.topicsSuggest` present, replace `suggestions` with `{ [playerName]: state.topicsSuggest.suggestions[playerName] ?? [] }`. Leave other fields.
- For phase `round-review`: if `reviewResult.aiStatus !== "done"`, clear `evaluations` to `[]` (or leave only the evaluation matching `playerName`). Follow the existing pattern in the file for answer-hiding.

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/store/stateFilter.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/store/stateFilter.ts src/store/stateFilter.test.ts
git commit -m "feat(phase9.1): filter topics suggestions and AI-review evaluations per-player"
```

---

## Task 11: AiErrorBanner component

**Files:**
- Create: `src/components/AiErrorBanner/AiErrorBanner.tsx`
- Create: `src/components/AiErrorBanner/AiErrorBanner.module.css`
- Create: `src/components/AiErrorBanner/AiErrorBanner.stories.tsx`

- [ ] **Step 1: Implement component**

`src/components/AiErrorBanner/AiErrorBanner.tsx`:
```tsx
import styles from "./AiErrorBanner.module.css";

export interface AiErrorBannerProps {
  message: string;
  canFallback: boolean;
  onRetry: () => void;
  onFallback?: () => void;
  retryLabel: string;
  fallbackLabel: string;
}

export function AiErrorBanner({
  message,
  canFallback,
  onRetry,
  onFallback,
  retryLabel,
  fallbackLabel,
}: AiErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <div className={styles.message}>{message}</div>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={onRetry}>{retryLabel}</button>
        {canFallback && onFallback && (
          <button className={styles.secondary} onClick={onFallback}>{fallbackLabel}</button>
        )}
      </div>
    </div>
  );
}
```

`src/components/AiErrorBanner/AiErrorBanner.module.css`:
```css
.banner {
  background: var(--color-surface-warning, #fff4e5);
  border: 1px solid var(--color-border-warning, #f5c46b);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.message { color: var(--color-text, #222); font-size: 16px; }
.actions { display: flex; gap: 8px; }
.primary, .secondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid transparent;
}
.primary { background: var(--color-accent, #2e7dd7); color: #fff; }
.secondary { background: transparent; color: var(--color-text, #222); border-color: var(--color-border, #ccc); }
```

`src/components/AiErrorBanner/AiErrorBanner.stories.tsx`:
```tsx
import type { Story } from "@ladle/react";
import { AiErrorBanner } from "./AiErrorBanner";

export const Default: Story = () => (
  <AiErrorBanner
    message="AI сервис недоступен."
    canFallback
    onRetry={() => {}}
    onFallback={() => {}}
    retryLabel="Повторить"
    fallbackLabel="Переключить в ручной режим"
  />
);

export const RetryOnly: Story = () => (
  <AiErrorBanner
    message="Таймаут запроса."
    canFallback={false}
    onRetry={() => {}}
    retryLabel="Повторить"
    fallbackLabel=""
  />
);

export const LongMessage: Story = () => (
  <AiErrorBanner
    message={"Очень длинное сообщение об ошибке: ".repeat(8)}
    canFallback
    onRetry={() => {}}
    onFallback={() => {}}
    retryLabel="Повторить"
    fallbackLabel="Вручную"
  />
);
```

- [ ] **Step 2: Verify via Ladle (visual)**

Run: `npm run dev:storybook` and inspect the three stories.

- [ ] **Step 3: Commit**

```bash
git add src/components/AiErrorBanner
git commit -m "feat(phase9.1): AiErrorBanner component + stories"
```

---

## Task 12: TopicsSidebarBlock

**Files:**
- Create: `src/pages/blocks/TopicsSidebarBlock.tsx`
- Create: `src/pages/blocks/TopicsSidebarBlock.module.css`

- [ ] **Step 1: Implement**

`src/pages/blocks/TopicsSidebarBlock.tsx`:
```tsx
import { useTranslation } from "react-i18next";
import { usePhase, usePlayers, useTimer, useTopicsSuggest, useSettings } from "@/store/selectors";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import { PlayerStatusTable, type PlayerStatus } from "@/components/PlayerStatusTable/PlayerStatusTable";
import styles from "./TopicsSidebarBlock.module.css";

export function TopicsSidebarBlock() {
  const phase = usePhase();
  const players = usePlayers();
  const ts = useTopicsSuggest();
  const timer = useTimer();
  const settings = useSettings();
  const { t } = useTranslation();

  const playerRows = players.map((p) => {
    const mine = ts?.suggestions[p.name]?.length ?? 0;
    const noIdeas = ts?.noIdeas.includes(p.name) ?? false;
    let status: PlayerStatus | undefined;
    if (noIdeas) status = "wrong";            // repurpose styles; mapping refined during QA
    else if (mine >= settings.topicCount) status = "right";
    else if (mine > 0) status = "answered";
    else status = "waiting";
    return {
      name: p.name,
      emoji: p.emoji,
      team: p.team,
      role: "player" as const,
      status,
      counter: `${mine}/${settings.topicCount}`,
    };
  });

  return (
    <div className={styles.sidebar}>
      {phase === "topics-collecting" && timer && ts?.manualTopics === null && (
        <CircleTimer startedAt={timer.startedAt} durationMs={timer.duration} />
      )}
      {phase === "topics-generating" && (
        <div className={styles.loader}>{t(`topics.generating.${ts?.generationStep ?? "topics"}`)}</div>
      )}
      <PlayerStatusTable players={playerRows} />
    </div>
  );
}
```

`TopicsSidebarBlock.module.css`:
```css
.sidebar { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
.loader { font-size: 18px; color: var(--color-text, #222); text-align: center; }
```

Note: If `PlayerStatusTable` does not accept `counter`, either extend its props or render the counter outside. The engineer should inspect `src/components/PlayerStatusTable` before implementing; adapt accordingly (keep components props-only — if `counter` is non-trivial, render it inside the sidebar block next to the table).

- [ ] **Step 2: Verify tsc**

Run: `npx tsc -b`

- [ ] **Step 3: Commit**

```bash
git add src/pages/blocks/TopicsSidebarBlock.tsx src/pages/blocks/TopicsSidebarBlock.module.css
git commit -m "feat(phase9.1): TopicsSidebarBlock with CircleTimer + player statuses"
```

---

## Task 13: TopicsBoardBlock (host-only sticker wall)

**Files:**
- Create: `src/pages/blocks/TopicsBoardBlock.tsx`
- Create: `src/pages/blocks/TopicsBoardBlock.module.css`

- [ ] **Step 1: Implement**

`src/pages/blocks/TopicsBoardBlock.tsx`:
```tsx
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { usePlayers, useTopicsSuggest } from "@/store/selectors";
import { Sticker } from "@/components/Sticker/Sticker";
import styles from "./TopicsBoardBlock.module.css";

interface Entry {
  id: string;
  text: string;
  playerName: string;
  team: string;
  emoji: string;
}

export function TopicsBoardBlock() {
  const players = usePlayers();
  const ts = useTopicsSuggest();
  const containerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  const entries: Entry[] = useMemo(() => {
    // Order of insertion is preserved inside each player's array; but total order needs
    // a monotonically-growing source. Since TopicsSuggestState keeps only final arrays,
    // we approximate insertion order by iterating players and appending; manual topics
    // (if host submitted) are shown under the host.
    if (!ts) return [];
    const out: Entry[] = [];
    for (const [name, topics] of Object.entries(ts.suggestions)) {
      const p = players.find((pp) => pp.name === name);
      topics.forEach((txt, i) => {
        out.push({
          id: `${name}-${i}`,
          text: txt,
          playerName: name,
          team: p?.team ?? "none",
          emoji: p?.emoji ?? "❓",
        });
      });
    }
    return out;
  }, [ts, players]);

  // Track scroll position before render to detect "at bottom".
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 20;
    wasAtBottomRef.current = el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (wasAtBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.grid}>
        {entries.map((e) => (
          <Sticker key={e.id} text={e.text} team={e.team as any} emoji={e.emoji} />
        ))}
      </div>
    </div>
  );
}
```

`TopicsBoardBlock.module.css`:
```css
.container { flex: 1; overflow-y: auto; padding: 16px; }
.grid { display: flex; flex-wrap: wrap; gap: 12px; }
```

Note on ordering: the chosen approximation is “by player, then insertion order within player”. If a strict global insertion timeline is required, extend `TopicsSuggestState` with a parallel array of `{playerName, topic}` entries. The user accepted this simpler model during brainstorming — revisit only if QA demands it.

`Sticker` props: check the real component signature and pass matching props (`text`/`content`, `color`/`team`, etc.). Adapt accordingly.

- [ ] **Step 2: Verify tsc**

Run: `npx tsc -b`

- [ ] **Step 3: Commit**

```bash
git add src/pages/blocks/TopicsBoardBlock.tsx src/pages/blocks/TopicsBoardBlock.module.css
git commit -m "feat(phase9.1): TopicsBoardBlock sticker wall with auto-scroll"
```

---

## Task 14: HostTopicsSuggest page

**Files:**
- Create: `src/pages/topics/HostTopicsSuggest.tsx`
- Create: `src/pages/topics/HostTopicsSuggest.module.css`

- [ ] **Step 1: Implement**

`src/pages/topics/HostTopicsSuggest.tsx`:
```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePhase, useTopicsSuggest } from "@/store/selectors";
import { TopicsSidebarBlock } from "@/pages/blocks/TopicsSidebarBlock";
import { TopicsBoardBlock } from "@/pages/blocks/TopicsBoardBlock";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";
import { AiErrorBanner } from "@/components/AiErrorBanner/AiErrorBanner";
import {
  hostStartManualTopics,
  hostCancelManualTopics,
  hostSubmitManualTopics,
  startFirstRound,
  retryAiStep,
  fallbackToManualTopics,
} from "@/store/actions/topicsSuggest";
import styles from "./HostTopicsSuggest.module.css";

export function HostTopicsSuggest() {
  const phase = usePhase();
  const ts = useTopicsSuggest();
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [manualList, setManualList] = useState<string[]>([]);

  if (phase === "topics-collecting") {
    const manualMode = ts?.manualTopics !== null && ts?.manualTopics !== undefined;
    return (
      <div className={styles.layout}>
        <TopicsSidebarBlock />
        <div className={styles.main}>
          <TopicsBoardBlock />
          <div className={styles.actions}>
            {!manualMode ? (
              <button onClick={() => { setManualList([]); hostStartManualTopics(); }}>
                {t("topics.host.enterManually")}
              </button>
            ) : (
              <div className={styles.manualForm}>
                <div className={styles.manualList}>
                  {manualList.map((t2, i) => (
                    <div key={i} className={styles.manualItem}>
                      <span>{t2}</span>
                      <button onClick={() => setManualList((prev) => prev.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
                <div className={styles.manualInput}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("topics.host.manualPlaceholder")}
                  />
                  <button
                    disabled={!draft.trim()}
                    onClick={() => { setManualList((p) => [...p, draft.trim()]); setDraft(""); }}
                  >
                    +
                  </button>
                </div>
                <div className={styles.manualButtons}>
                  <button onClick={() => { hostCancelManualTopics(); }}>{t("common.cancel")}</button>
                  <button
                    disabled={manualList.length === 0}
                    onClick={() => hostSubmitManualTopics(manualList)}
                  >
                    {t("topics.host.submitManual")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "topics-generating") {
    const step = ts?.generationStep ?? "topics";
    return (
      <div className={styles.layout}>
        <TopicsSidebarBlock />
        <div className={styles.mainCentered}>
          {ts?.aiError ? (
            <AiErrorBanner
              message={`${t(`topics.errors.${ts.aiError.step}`)}: ${ts.aiError.message}`}
              canFallback={ts.aiError.step === "topics"}
              onRetry={retryAiStep}
              onFallback={ts.aiError.step === "topics" ? fallbackToManualTopics : undefined}
              retryLabel={t("topics.errors.retry")}
              fallbackLabel={t("topics.errors.fallback")}
            />
          ) : (
            <div className={styles.loader}>{t(`topics.generating.${step}`)}</div>
          )}
        </div>
      </div>
    );
  }

  // topics-preview
  return (
    <div className={styles.layout}>
      <TopicsSidebarBlock />
      <div className={styles.main}>
        <TaskBoardBlock />
        <button className={styles.primaryBtn} onClick={() => startFirstRound("random")}>
          {t("topics.preview.startRound")}
        </button>
      </div>
    </div>
  );
}
```

`HostTopicsSuggest.module.css`:
```css
.layout { display: flex; height: 100%; }
.main { flex: 1; display: flex; flex-direction: column; gap: 16px; padding: 16px; }
.mainCentered { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.loader { font-size: 22px; color: var(--color-text); }
.actions { display: flex; justify-content: flex-end; }
.manualForm { display: flex; flex-direction: column; gap: 8px; }
.manualList, .manualItem { display: flex; gap: 8px; align-items: center; }
.manualInput { display: flex; gap: 8px; }
.manualButtons { display: flex; gap: 8px; justify-content: flex-end; }
.primaryBtn { align-self: flex-end; padding: 12px 24px; font-size: 16px; }
```

- [ ] **Step 2: Verify tsc**

Run: `npx tsc -b`

- [ ] **Step 3: Commit**

```bash
git add src/pages/topics/HostTopicsSuggest.tsx src/pages/topics/HostTopicsSuggest.module.css
git commit -m "feat(phase9.1): HostTopicsSuggest page (collecting/generating/preview)"
```

---

## Task 15: PlayerTopicsSuggest page

**Files:**
- Create: `src/pages/topics/PlayerTopicsSuggest.tsx`
- Create: `src/pages/topics/PlayerTopicsSuggest.module.css`

- [ ] **Step 1: Implement**

`src/pages/topics/PlayerTopicsSuggest.tsx`:
```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePhase, usePlayers, useSettings, useTimer, useTopicsSuggest } from "@/store/selectors";
import { TimerInput } from "@/components/TimerInput/TimerInput";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerTopicsSuggest.module.css";

export function PlayerTopicsSuggest({
  playerName,
  sendAction,
}: {
  playerName: string;
  sendAction: (a: PlayerAction) => void;
}) {
  const phase = usePhase();
  const ts = useTopicsSuggest();
  const settings = useSettings();
  const timer = useTimer();
  const players = usePlayers();
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const me = players.find((p) => p.name === playerName);
  const myTopics = ts?.suggestions[playerName] ?? [];
  const inNoIdeas = ts?.noIdeas.includes(playerName) ?? false;
  const manualByHost = ts?.manualTopics !== null && ts?.manualTopics !== undefined;
  const atLimit = myTopics.length >= settings.topicCount;
  const blocked = inNoIdeas || manualByHost || atLimit;

  if (phase === "topics-collecting") {
    return (
      <div className={styles.screen}>
        <h2>{t("topics.player.title")}</h2>
        <div className={styles.counter}>
          {myTopics.length}/{settings.topicCount}
        </div>
        {timer && !manualByHost && (
          <TimerInput
            startedAt={timer.startedAt}
            durationMs={timer.duration}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={blocked}
            placeholder={t("topics.player.placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim() && !blocked) {
                sendAction({ kind: "suggest-topic", text: draft.trim() });
                setDraft("");
              }
            }}
          />
        )}
        <div className={styles.stickers}>
          {myTopics.map((t2, i) => (
            <div key={i} className={styles.sticker}>{t2}</div>
          ))}
        </div>
        <button
          disabled={blocked}
          onClick={() => sendAction({ kind: "no-ideas" })}
        >
          {t("topics.player.noIdeas")}
        </button>
      </div>
    );
  }

  if (phase === "topics-generating") {
    return (
      <div className={styles.screen}>
        <div className={styles.loader}>{t("topics.player.preparing")}</div>
      </div>
    );
  }

  // topics-preview
  return (
    <div className={styles.screen}>
      <TaskBoardBlock playerName={playerName} />
      <button
        disabled={!me || me.team === "none"}
        onClick={() => sendAction({ kind: "start-first-round" })}
      >
        {t("topics.preview.startRound")}
      </button>
    </div>
  );
}
```

`PlayerTopicsSuggest.module.css`:
```css
.screen { display: flex; flex-direction: column; gap: 16px; padding: 16px; align-items: center; }
.counter { font-size: 18px; color: var(--color-text); }
.stickers { display: flex; flex-wrap: wrap; gap: 8px; }
.sticker { background: var(--color-surface); border: 1px solid var(--color-border, #ccc); padding: 8px 12px; border-radius: 8px; }
.loader { font-size: 22px; color: var(--color-text); text-align: center; }
```

- [ ] **Step 2: Verify tsc**

Run: `npx tsc -b`

- [ ] **Step 3: Commit**

```bash
git add src/pages/topics/PlayerTopicsSuggest.tsx src/pages/topics/PlayerTopicsSuggest.module.css
git commit -m "feat(phase9.1): PlayerTopicsSuggest page (collecting/generating/preview)"
```

---

## Task 16: HostRound AI-review UI

**Files:**
- Modify: `src/pages/round/HostRound.Main.tsx` (or sibling; inspect before editing)
- Modify: `src/pages/round/HostRound.SidebarActions.tsx`

- [ ] **Step 1: Render loader/banner in round-review when mode=ai**

In the main round component, branch on `reviewResult.aiStatus` when `phase === "round-review"` and `settings.mode === "ai"`:

```tsx
// inside phase === "round-review" block:
if (settings.mode === "ai") {
  const rr = currentRound.reviewResult;
  if (rr?.aiStatus === "loading") {
    return <div className={styles.center}>{t("round.aiReview.loading")}</div>;
  }
  if (rr?.aiStatus === "error") {
    return (
      <AiErrorBanner
        message={`${t("round.aiReview.errorPrefix")}: ${rr.aiError ?? ""}`}
        canFallback
        onRetry={retryAiReview}
        onFallback={fallbackReviewToManual}
        retryLabel={t("topics.errors.retry")}
        fallbackLabel={t("round.aiReview.fallback")}
      />
    );
  }
  // aiStatus === "idle" or "done" → fall through to existing manual UI (transient)
}
```

Import `retryAiReview`, `fallbackReviewToManual` from `@/store/actions/aiReview`.

- [ ] **Step 2: Hide/adjust sidebar actions while loading**

In `HostRound.SidebarActions.tsx`, when `phase === "round-review"` and `aiStatus === "loading"`, render nothing (or a spinner) instead of the confirm-review button.

- [ ] **Step 3: Verify tsc + existing tests**

Run: `npx tsc -b && npx vitest run src/store/actions/round.test.ts`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/round
git commit -m "feat(phase9.1): HostRound renders AI-review loader/error banner"
```

---

## Task 17: PlayerRound AI-review UI

**Files:**
- Modify: `src/pages/round/PlayerRound.tsx` (or the phase-dispatch child)

- [ ] **Step 1: Show loader while aiStatus=loading**

Branch in the `round-review` case:
```tsx
if (settings.mode === "ai" && currentRound.reviewResult?.aiStatus === "loading") {
  return <div className={styles.center}>{t("round.aiReview.loading")}</div>;
}
```
Otherwise render the existing review UI.

- [ ] **Step 2: Commit**

```bash
git add src/pages/round
git commit -m "feat(phase9.1): PlayerRound shows loader while AI reviews"
```

---

## Task 18: PlayPage routing + action dispatch + orchestrator

**Files:**
- Modify: `src/pages/PlayPage.tsx`

- [ ] **Step 1: Dispatch new PlayerActions on host**

Inside the `onHostAction` callback's `switch`, add:
```ts
case "suggest-topic":
  submitTopicSuggestion(name, action.text);
  break;
case "no-ideas":
  playerNoIdeas(name);
  break;
case "start-first-round": {
  const state = useGameStore.getState();
  const player = state.players.find((p) => p.name === name);
  if (player && player.team !== "none") startFirstRound(player.team);
  break;
}
```
Import `submitTopicSuggestion`, `playerNoIdeas`, `startFirstRound` from `@/store/actions/topicsSuggest`.

- [ ] **Step 2: Mount orchestrator**

In the host component (around where `transport` is set up), add:
```ts
useAiOrchestrator(transport.role === "host");
```
Import `useAiOrchestrator` from `@/hooks/useAiOrchestrator`.

- [ ] **Step 3: Route new phases**

In the host JSX, replace/extend:
```tsx
{phase.startsWith("topics-") && <HostTopicsSuggest />}
```
Import `HostTopicsSuggest` from `@/pages/topics/HostTopicsSuggest`.

In the player JSX (around line 287), add:
```tsx
{phase.startsWith("topics-") && (
  <PlayerTopicsSuggest playerName={playerName} sendAction={transport.sendAction} />
)}
```

- [ ] **Step 4: Verify tsc + dev smoke**

Run: `npx tsc -b && npm run dev`
Open host + player tabs, start game in AI mode, verify transitions happen. (If no OpenRouter key present, expect AI error banner — that's fine, manual fallback should work.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlayPage.tsx
git commit -m "feat(phase9.1): wire topics pages, dispatcher, and AI orchestrator into PlayPage"
```

---

## Task 19: i18n keys

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add ru keys**

Merge into `ru.json`:
```json
{
  "topics": {
    "host": {
      "enterManually": "Ввести вручную",
      "manualPlaceholder": "Тема",
      "submitManual": "Готово"
    },
    "player": {
      "title": "Предложи тему",
      "placeholder": "Введи тему",
      "noIdeas": "Нет идей",
      "preparing": "Готовим игру…"
    },
    "preview": {
      "startRound": "Начать раунд"
    },
    "generating": {
      "topics": "Генерируем темы…",
      "questions": "Генерируем вопросы…",
      "blitz": "Генерируем блиц…"
    },
    "errors": {
      "topics": "Не удалось сгенерировать темы",
      "questions": "Не удалось сгенерировать вопросы",
      "blitz": "Не удалось сгенерировать блиц",
      "retry": "Повторить",
      "fallback": "Переключить в ручной режим"
    }
  },
  "round": {
    "aiReview": {
      "loading": "AI проверяет ответы…",
      "errorPrefix": "Ошибка проверки",
      "fallback": "Оценить вручную"
    }
  },
  "common": { "cancel": "Отмена" }
}
```

- [ ] **Step 2: Add en keys**

Mirror structure in `en.json` with English strings.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/ru.json src/i18n/en.json
git commit -m "i18n(phase9.1): topics.* and round.aiReview keys (ru/en)"
```

---

## Task 20: E2E — AI happy path

**Files:**
- Create: `e2e/phase9-1-ai-happy-path.spec.ts`

- [ ] **Step 1: Write E2E test with mocked AI**

```ts
import { test, expect } from "@playwright/test";

test("AI mode: topics-suggest → AI generates → first round", async ({ browser }) => {
  // Mock OpenRouter by intercepting fetch in page init.
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  await host.addInitScript(() => {
    const origFetch = window.fetch;
    window.fetch = async (url, init) => {
      const u = String(url);
      if (u.includes("openrouter.ai")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const resp =
          body.messages?.[0]?.content?.includes("тем") // topic generation
            ? { choices: [{ message: { content: JSON.stringify({ topics: [{ name: "Films" }, { name: "Music" }] }) } }] }
            : body.messages?.[0]?.content?.includes("блиц")
            ? { choices: [{ message: { content: JSON.stringify({ blitzTasks: [{ items: [{ text: "b1", difficulty: 200, acceptedAnswers: ["a"] }, { text: "b2", difficulty: 210, acceptedAnswers: ["b"] }, { text: "b3", difficulty: 220, acceptedAnswers: ["c"] }] }] }) } }] }
            : { choices: [{ message: { content: JSON.stringify({ topics: [{ name: "Films", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: ["A"] }] }, { name: "Music", questions: [{ text: "Q2", difficulty: 100, acceptedAnswers: ["B"] }] }] }) } }] };
        return new Response(JSON.stringify(resp), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return origFetch(url, init);
    };
  });
  await host.goto("/play");
  // ...continue: set AI mode in setup, add API key to localStorage, start, assert transitions.
  // Engineer: adapt to project's existing E2E helpers in e2e/.
});
```

Engineer notes:
- Look at existing e2e tests (`e2e/*.spec.ts`) for setup helpers (room creation, joining players in separate contexts, selectors by `data-testid`).
- Add `data-testid` attributes in the Host/Player pages if lacking (keeps selectors stable).

- [ ] **Step 2: Run E2E**

Run: `npm run test:e2e -- --grep "AI mode"`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/phase9-1-ai-happy-path.spec.ts src/pages/topics src/pages/blocks src/components/AiErrorBanner
git commit -m "test(phase9.1): e2e AI happy path (mocked OpenRouter)"
```

---

## Task 21: E2E — AI-review dispute + fallback

**Files:**
- Create: `e2e/phase9-1-ai-review-dispute.spec.ts`
- Create: `e2e/phase9-1-ai-fallback-topics.spec.ts`

- [ ] **Step 1: Review dispute test**

Follows from Task 20 scaffolding. Gets to `round-review`, mocks `checkAnswers`, expects auto-transition to `round-result`, clicks "Оспорить", expects return to `round-review` with manual controls.

- [ ] **Step 2: Topics fallback test**

Mocks `generateTopics` to return HTTP 500. Host page should show AiErrorBanner, click "Переключить в ручной режим", enter two topics, proceed — then mocks `generateQuestions`/`generateBlitzTasks` with success, assert `topics-preview` reached.

- [ ] **Step 3: Run**

Run: `npm run test:e2e -- --grep "phase9-1"`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/phase9-1-ai-review-dispute.spec.ts e2e/phase9-1-ai-fallback-topics.spec.ts
git commit -m "test(phase9.1): e2e dispute flow + topics fallback"
```

---

## Task 22: Plan bookkeeping

**Files:**
- Modify: `task/plan-01-init.md`

- [ ] **Step 1: Mark all 9.1 checklist items [x]**

In `task/plan-01-init.md`, under `### 9.1 AI-review + TopicsSuggest [не готово]`, tick every `- [ ]` to `- [x]` once corresponding task above is done. Change the header to `### 9.1 AI-review + TopicsSuggest [готово]`. Add a `**Выполнено:**` bullet list summarizing what was built.

- [ ] **Step 2: Full test run**

Run: `npx tsc -b && npm test && npm run test:e2e`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add task/plan-01-init.md
git commit -m "docs(phase9.1): mark sub-phase complete with summary"
```

---

## Self-review notes

**Spec coverage check** (against `docs/superpowers/specs/2026-04-15-phase9-1-ai-review-topics-suggest-design.md`):

- §3 types — Task 1, 2 ✓
- §4.1 TopicsSuggest flow — Tasks 3, 6, 7, 9 ✓
- §4.2 AI-review flow — Tasks 2, 8, 9, 16, 17 ✓
- §5 UI (AiErrorBanner, TopicsSidebarBlock, TopicsBoardBlock, TaskBoardBlock reuse, pages) — Tasks 11, 12, 13, 14, 15 ✓
- §6 Actions — Tasks 6, 7, 8 ✓
- §6.3 Orchestrator — Task 9 ✓
- §7 Transport (new PlayerAction kinds, dispatcher, state filter) — Tasks 1, 10, 18 ✓
- §8 AI integration — Task 9 ✓
- §9 Tests — Tasks 5, 6, 7, 8, 10, 20, 21 ✓
- i18n — Task 19 ✓
- Plan housekeeping — Task 22 ✓

**Open items deferred to execution** (acknowledged in spec §10):
- Exact shape of `generateTopics`/`generateQuestions`/`generateBlitzTasks` return types — engineer verifies against `src/types/ai.ts` during Task 9.
- `Sticker` / `PlayerStatusTable` prop names — engineer adapts during Tasks 12/13.
- `TaskBoardBlock` readonly mode — verified already supported in Task 13 note (no changes required).

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-15-phase9-1-ai-review-topics-suggest.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
