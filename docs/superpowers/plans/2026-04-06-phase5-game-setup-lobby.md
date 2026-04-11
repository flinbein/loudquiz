# Phase 5: Game Setup + Lobby — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full flow from home page through game setup to lobby with player connections, team selection, and game start.

**Architecture:** SetupPage configures game settings and creates a room. PlayPage detects host/player role via sessionStorage, renders HostLobby or PlayerLobby by phase. Host owns state (Zustand), players send actions via BroadcastChannel transport. New TeamGroup component groups players by team. PlayerStatusTable gets `draggable` prop for host drag & drop.

**Tech Stack:** React 19, TypeScript, Zustand, react-router-dom, CSS Modules, qrcode.react, i18next, Vitest

**Spec:** `docs/superpowers/specs/2026-04-06-phase5-game-setup-lobby-design.md`

---

## File Structure

### New files
- `src/logic/emojiPool.ts` — emoji pool constant + getRandomEmoji + getShortName
- `src/logic/emojiPool.test.ts` — unit tests
- `src/store/actions/lobby.ts` — lobby action handlers (handleJoin, handleSetTeam, etc.)
- `src/store/actions/lobby.test.ts` — unit tests
- `src/components/TeamGroup/TeamGroup.tsx` — team group card component
- `src/components/TeamGroup/TeamGroup.module.css` — styles
- `src/components/TeamGroup/TeamGroup.stories.tsx` — Ladle stories
- `src/pages/SetupPage.tsx` — game setup page
- `src/pages/SetupPage.module.css` — styles
- `src/pages/lobby/HostLobby.tsx` — host lobby screen
- `src/pages/lobby/HostLobby.module.css` — styles
- `src/pages/lobby/PlayerLobby.tsx` — player lobby screen
- `src/pages/lobby/PlayerLobby.module.css` — styles
- `src/pages/lobby/TeamPicker.tsx` — swipe/click team picker for player
- `src/pages/lobby/TeamPicker.module.css` — styles

### Modified files
- `src/types/transport.ts` — add change-emoji, start-game actions; remove emoji from join
- `src/hooks/useTransport.ts` — remove emoji from join broadcast
- `src/components/PlayerStatusTable/PlayerStatusTable.tsx` — add draggable prop + waiting status display
- `src/components/PlayerStatusTable/PlayerStatusTable.module.css` — draggable row styles
- `src/components/PlayerStatusTable/PlayerStatusTable.stories.tsx` — lobby stories
- `src/pages/HomePage.tsx` — link to /setup instead of /play
- `src/pages/PlayPage.tsx` — role detection, phase switching, transport integration
- `src/App.tsx` — add /setup route
- `src/i18n/ru.json` — lobby/setup keys
- `src/i18n/en.json` — lobby/setup keys
- `src/persistence/localPersistence.ts` — add constructor data helpers

---

### Task 1: Emoji Pool

**Files:**
- Create: `src/logic/emojiPool.ts`
- Create: `src/logic/emojiPool.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/logic/emojiPool.test.ts
import { describe, it, expect } from "vitest";
import { EMOJI_POOL, getRandomEmoji, getShortName } from "./emojiPool";

describe("emojiPool", () => {
  describe("EMOJI_POOL", () => {
    it("contains at least 200 emojis", () => {
      expect(EMOJI_POOL.length).toBeGreaterThanOrEqual(200);
    });

    it("has no duplicates", () => {
      const unique = new Set(EMOJI_POOL);
      expect(unique.size).toBe(EMOJI_POOL.length);
    });
  });

  describe("getRandomEmoji", () => {
    it("returns an emoji from the pool", () => {
      const emoji = getRandomEmoji([]);
      expect(EMOJI_POOL).toContain(emoji);
    });

    it("excludes occupied emojis", () => {
      const occupied = EMOJI_POOL.slice(0, EMOJI_POOL.length - 1);
      const emoji = getRandomEmoji(occupied);
      expect(emoji).toBe(EMOJI_POOL[EMOJI_POOL.length - 1]);
    });

    it("returns from full pool if all occupied", () => {
      const emoji = getRandomEmoji([...EMOJI_POOL]);
      expect(EMOJI_POOL).toContain(emoji);
    });
  });

  describe("getShortName", () => {
    it("returns initials for multi-word names", () => {
      expect(getShortName("Алексей Петров")).toBe("АП");
    });

    it("returns first 3 chars for single-word names", () => {
      expect(getShortName("Маша")).toBe("МАШ");
    });

    it("strips special characters", () => {
      expect(getShortName("Алексей!!! Петров???")).toBe("АП");
    });

    it("handles single character name", () => {
      expect(getShortName("А")).toBe("А");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic/emojiPool.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement emojiPool**

```typescript
// src/logic/emojiPool.ts
export const EMOJI_POOL: string[] = [
  "😈","👹","👺","🤡","💩","👻","💀","👽","👾","🤖",
  "🎃","😺","🙀","👶🏻","👶🏽","👶🏿","👩🏻","👩🏽","👩🏿","👩🏻‍🦰",
  "👩🏽‍🦰","👩🏿‍🦰","👨🏻‍🦰","👨🏽‍🦰","👨🏿‍🦰","👱🏻‍♀️","👱🏽‍♀️","👱🏿‍♀️","👩🏻‍🦳","👩🏽‍🦳",
  "👩🏿‍🦳","👨🏻‍🦳","👨🏽‍🦳","👨🏿‍🦳","👵🏻","👵🏽","👵🏿","👩🏼‍🦱","👩🏾‍🦱","🧔🏻‍♂️",
  "🧔🏽‍♂️","🧔🏼‍♂️","👲🏻","👲🏽","👲🏿","👳🏻‍♀️","👳🏽‍♀️","👳🏿‍♀️","👳🏻‍♂️","👳🏽‍♂️",
  "👳🏿‍♂️","🧕🏻","🧕🏾","👮🏻‍♀️","👮🏾‍♀️","👮🏻‍♂️","👷🏻‍♀️","👷🏽‍♀️","👷🏼‍♂️","🕵🏻‍♂️",
  "🕵🏽‍♂️","🕵🏻‍♀️","🕵🏽‍♀️","👩🏻‍⚕️","👩🏼‍⚕️","👩🏽‍⚕️","👨🏻‍⚕️","👨🏼‍⚕️","👩🏻‍🌾",
  "👩🏽‍🌾","👨🏻‍🌾","👨🏽‍🌾","👩🏻‍🍳","👩🏽‍🍳","👨🏻‍🍳","👨🏽‍🍳","👩🏻‍🎓","👩🏼‍🎓","👩🏽‍🎓",
  "👩🏻‍🎤","👩🏽‍🎤","🧑🏻‍🎤","🧑🏽‍🎤","👨🏻‍🎤","👨🏽‍🎤","👩🏻‍🏫","👩🏼‍🏫","👩🏽‍🏫","👨🏻‍🏫",
  "👨🏼‍🏫","👨🏽‍🏫","👩🏻‍💻","👩🏼‍💻","👩🏽‍💻","👨🏻‍💻","👨🏼‍💻","👨🏽‍💻","👩🏻‍💼",
  "👩🏼‍💼","👩🏽‍💼","👨🏻‍💼","👨🏼‍💼","👨🏽‍💼","👩🏻‍🔧","👩🏼‍🔧","👩🏽‍🔧","👨🏻‍🔧","👨🏼‍🔧",
  "👨🏽‍🔧","👩🏻‍🔬","👩🏼‍🔬","👩🏽‍🔬","👨🏻‍🔬","👨🏼‍🔬","👨🏽‍🔬","🧑🏻‍🎨","🧑🏽‍🎨","🧑🏿‍🎨",
  "🧑🏻‍🚒","🧑🏽‍🚒","🧑🏿‍🚒","🧑🏻‍✈️","🧑🏽‍✈️","🧑🏿‍✈️","🧑🏻‍🚀","🧑🏽‍🚀","🧑🏿‍🚀","👩🏻‍⚖️",
  "👩🏼‍⚖️","👩🏽‍⚖️","👨🏻‍⚖️","👨🏼‍⚖️","👨🏽‍⚖️","👰🏻‍♀️","👰🏼‍♀️","👰🏽‍♀️","🤵🏻‍♂️","🤵🏼‍♂️",
  "🤵🏽‍♂️","👸🏻","👸🏼","👸🏽","🤴🏻","🤴🏽","🤴🏿","🥷","🦸🏻‍♀️","🦸🏼‍♀️",
  "🦸🏽‍♀️","🦸🏻‍♂️","🦸🏼‍♂️","🦸🏽‍♂️","🦹🏻","🦹🏼","🦹🏽","🎅🏻","🎅🏽","🎅🏿",
  "🧙🏻","🧙🏽","🧙🏿","🧝🏻‍♀️","🧝🏽‍♀️","🧝🏻‍♂️","🧝🏽‍♂️","🧌","🧛‍♀️","🧛🏻‍♀️",
  "🧛🏿‍♀️","🧛🏽","🧛‍♂️","🧛🏻‍♂️","🧛🏾‍♂️","🧟‍♀️","🧟‍♂️","🧞‍♀️","🧞‍♂️","🧜🏻‍♀️",
  "🧚‍♀️","👼🏻","👼🏽","💁🏻‍♀️","💁🏼‍♀️","💁🏽‍♀️","💁🏻‍♂️","💁🏼‍♂️","💁🏽‍♂️","🙆🏻‍♀️",
  "🙆🏼‍♀️","🙆🏿‍♀️","🙆🏻‍♂️","🙆🏽‍♂️","🙆🏿‍♂️","🙋🏻‍♀️","🙋🏼‍♀️","🙋🏽‍♀️","🙋🏻‍♂️","🙋🏼‍♂️",
  "🙋🏽‍♂️","🤦🏻‍♀️","🤦🏼‍♀️","🤦🏽‍♀️","🤦🏻‍♂️","🤦🏼‍♂️","🤦🏽‍♂️","🤷🏻‍♀️","🤷🏼‍♀️","🤷🏽‍♀️",
  "🧖🏻‍♀️","🧖🏽‍♀️","🧖🏻‍♂️","🧖🏾‍♂️","🐶","🐱","🐭","🐹","🐰","🦊",
  "🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
  "🙈","🙉","🙊","🐔","🐧","🐦","🐤","🐣","🐥","🪿",
  "🦆","🐦‍⬛️","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🫎",
  "🐝","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟",
  "🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑",
  "🪼","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋",
  "🦈","🦭","🐊","🦧","🐲","🌞","🌝","🌚",
];

export function getRandomEmoji(occupied: string[]): string {
  const available = EMOJI_POOL.filter((e) => !occupied.includes(e));
  const pool = available.length > 0 ? available : EMOJI_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getShortName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 3).toUpperCase();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic/emojiPool.test.ts`
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic/emojiPool.ts src/logic/emojiPool.test.ts
git commit -m "feat: add emoji pool with random selection and short name formatting"
```

---

### Task 2: Update PlayerAction Types

**Files:**
- Modify: `src/types/transport.ts`
- Modify: `src/hooks/useTransport.ts`

- [ ] **Step 1: Update PlayerAction union in transport.ts**

In `src/types/transport.ts`, replace the PlayerAction union:

```typescript
export type PlayerAction =
  | { kind: "join"; name: string }
  | { kind: "set-team"; team: string }
  | { kind: "set-ready"; ready: boolean }
  | { kind: "change-emoji" }
  | { kind: "start-game" }
  | { kind: "claim-captain" }
  | { kind: "select-question"; questionIndex: number }
  | { kind: "activate-joker" }
  | { kind: "submit-answer"; text: string }
  | { kind: "claim-blitz-captain" }
  | { kind: "select-blitz-task"; taskId: string }
  | { kind: "submit-blitz-answer"; text: string }
  | { kind: "skip-blitz-answer" }
  | { kind: "suggest-topic"; text: string };
```

Changes: `join` no longer has `emoji` field. Added `change-emoji` and `start-game`.

- [ ] **Step 2: Update useTransport.ts join broadcast**

In `src/hooks/useTransport.ts` line 205, change the join action broadcast:

```typescript
        transport.broadcast({
          type: "player-action",
          action: { kind: "join", name: playerName },
        });
```

Remove `, emoji: ""` from the action.

- [ ] **Step 3: Verify build passes**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run`
Expected: all existing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/types/transport.ts src/hooks/useTransport.ts
git commit -m "feat: update PlayerAction types — add change-emoji, start-game; remove emoji from join"
```

---

### Task 3: Lobby Store Actions

**Files:**
- Create: `src/store/actions/lobby.ts`
- Create: `src/store/actions/lobby.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/store/actions/lobby.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore, initialState } from "../gameStore";
import {
  handleJoin,
  handleSetTeam,
  handleSetReady,
  handleChangeEmoji,
  kickPlayer,
  movePlayer,
  startGame,
  canStartGame,
} from "./lobby";

function resetStore() {
  useGameStore.setState({
    ...initialState,
    settings: { ...initialState.settings },
    teams: [
      { id: "red", color: "red", score: 0, jokerUsed: false },
      { id: "blue", color: "blue", score: 0, jokerUsed: false },
    ],
  });
}

function resetStoreSingle() {
  useGameStore.setState({
    ...initialState,
    settings: { ...initialState.settings, teamMode: "single" },
    teams: [{ id: "default", color: "none", score: 0, jokerUsed: false }],
  });
}

describe("lobby actions", () => {
  beforeEach(resetStore);

  describe("handleJoin", () => {
    it("adds a new player with assigned emoji", () => {
      handleJoin("peer1", "Алексей");
      const state = useGameStore.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].name).toBe("Алексей");
      expect(state.players[0].emoji).toBeTruthy();
      expect(state.players[0].online).toBe(true);
      expect(state.players[0].ready).toBe(false);
    });

    it("assigns to default team in single mode", () => {
      resetStoreSingle();
      handleJoin("peer1", "Алексей");
      expect(useGameStore.getState().players[0].team).toBe("default");
    });

    it("assigns empty team in dual mode", () => {
      handleJoin("peer1", "Алексей");
      expect(useGameStore.getState().players[0].team).toBe("");
    });

    it("reconnects existing player by name", () => {
      handleJoin("peer1", "Алексей");
      // Simulate disconnect
      const players = useGameStore.getState().players.map((p) =>
        p.name === "Алексей" ? { ...p, online: false } : p,
      );
      useGameStore.getState().setState({ players });
      // Reconnect
      handleJoin("peer2", "Алексей");
      const state = useGameStore.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].online).toBe(true);
    });

    it("assigns unique emojis to different players", () => {
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      const state = useGameStore.getState();
      expect(state.players[0].emoji).not.toBe(state.players[1].emoji);
    });
  });

  describe("handleSetTeam", () => {
    it("sets player team", () => {
      handleJoin("peer1", "Алексей");
      handleSetTeam("Алексей", "red");
      expect(useGameStore.getState().players[0].team).toBe("red");
    });

    it("does not change team if player is ready", () => {
      handleJoin("peer1", "Алексей");
      handleSetReady("Алексей", true);
      handleSetTeam("Алексей", "blue");
      expect(useGameStore.getState().players[0].team).not.toBe("blue");
    });
  });

  describe("handleSetReady", () => {
    it("sets player ready state", () => {
      handleJoin("peer1", "Алексей");
      handleSetReady("Алексей", true);
      expect(useGameStore.getState().players[0].ready).toBe(true);
    });
  });

  describe("handleChangeEmoji", () => {
    it("changes player emoji", () => {
      handleJoin("peer1", "Алексей");
      const oldEmoji = useGameStore.getState().players[0].emoji;
      // Change multiple times to ensure it differs at least once
      for (let i = 0; i < 10; i++) {
        handleChangeEmoji("Алексей");
      }
      // With 200+ emojis, at least one change should differ
      // (not strictly guaranteed, but practically certain)
    });

    it("does not change emoji if player is ready", () => {
      handleJoin("peer1", "Алексей");
      handleSetReady("Алексей", true);
      const emoji = useGameStore.getState().players[0].emoji;
      handleChangeEmoji("Алексей");
      expect(useGameStore.getState().players[0].emoji).toBe(emoji);
    });
  });

  describe("kickPlayer", () => {
    it("removes player from store", () => {
      handleJoin("peer1", "Алексей");
      handleJoin("peer2", "Маша");
      kickPlayer("Алексей");
      const state = useGameStore.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].name).toBe("Маша");
    });
  });

  describe("movePlayer", () => {
    it("moves player to another team", () => {
      handleJoin("peer1", "Алексей");
      movePlayer("Алексей", "blue");
      expect(useGameStore.getState().players[0].team).toBe("blue");
    });
  });

  describe("canStartGame / startGame", () => {
    it("returns false when not all players ready", () => {
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetTeam("Player1", "red");
      handleSetTeam("Player2", "red");
      handleSetReady("Player1", true);
      expect(canStartGame()).toBe(false);
    });

    it("returns false with fewer than 2 players per team", () => {
      handleJoin("peer1", "Player1");
      handleSetTeam("Player1", "red");
      handleSetReady("Player1", true);
      expect(canStartGame()).toBe(false);
    });

    it("returns false when player has no team (dual)", () => {
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetReady("Player1", true);
      handleSetReady("Player2", true);
      // Players have no team (empty string) in dual mode
      expect(canStartGame()).toBe(false);
    });

    it("returns true when all conditions met (single)", () => {
      resetStoreSingle();
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetReady("Player1", true);
      handleSetReady("Player2", true);
      expect(canStartGame()).toBe(true);
    });

    it("returns true when all conditions met (dual)", () => {
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
      expect(canStartGame()).toBe(true);
    });

    it("startGame transitions to round-captain for manual mode", () => {
      resetStoreSingle();
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetReady("Player1", true);
      handleSetReady("Player2", true);
      startGame();
      expect(useGameStore.getState().phase).toBe("round-captain");
    });

    it("startGame transitions to topics-suggest for AI mode", () => {
      useGameStore.setState({
        ...initialState,
        settings: { ...initialState.settings, mode: "ai", teamMode: "single" },
        teams: [{ id: "default", color: "none", score: 0, jokerUsed: false }],
      });
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetReady("Player1", true);
      handleSetReady("Player2", true);
      startGame();
      expect(useGameStore.getState().phase).toBe("topics-suggest");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/actions/lobby.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement lobby actions**

```typescript
// src/store/actions/lobby.ts
import { useGameStore } from "@/store/gameStore";
import { getRandomEmoji } from "@/logic/emojiPool";

export function handleJoin(peerId: string, name: string): void {
  const state = useGameStore.getState();
  const existing = state.players.find((p) => p.name === name);

  if (existing) {
    // Reconnect: mark online
    const players = state.players.map((p) =>
      p.name === name ? { ...p, online: true } : p,
    );
    useGameStore.getState().setState({ players });
    return;
  }

  const occupied = state.players.map((p) => p.emoji);
  const emoji = getRandomEmoji(occupied);
  const team =
    state.settings.teamMode === "single" ? state.teams[0]?.id ?? "" : "";

  const player = { name, emoji, team, online: true, ready: false };
  useGameStore.getState().setState({
    players: [...state.players, player],
  });
}

export function handleSetTeam(name: string, teamId: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "lobby") return;
  const players = state.players.map((p) =>
    p.name === name && !p.ready ? { ...p, team: teamId } : p,
  );
  useGameStore.getState().setState({ players });
}

export function handleSetReady(name: string, ready: boolean): void {
  const state = useGameStore.getState();
  if (state.phase !== "lobby") return;
  const players = state.players.map((p) =>
    p.name === name ? { ...p, ready } : p,
  );
  useGameStore.getState().setState({ players });
}

export function handleChangeEmoji(name: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "lobby") return;
  const player = state.players.find((p) => p.name === name);
  if (!player || player.ready) return;

  const occupied = state.players.map((p) => p.emoji);
  const newEmoji = getRandomEmoji(occupied);
  const players = state.players.map((p) =>
    p.name === name ? { ...p, emoji: newEmoji } : p,
  );
  useGameStore.getState().setState({ players });
}

export function kickPlayer(name: string): void {
  const state = useGameStore.getState();
  const players = state.players.filter((p) => p.name !== name);
  useGameStore.getState().setState({ players });
}

export function movePlayer(name: string, teamId: string): void {
  const state = useGameStore.getState();
  const players = state.players.map((p) =>
    p.name === name ? { ...p, team: teamId } : p,
  );
  useGameStore.getState().setState({ players });
}

export function canStartGame(): boolean {
  const state = useGameStore.getState();
  if (state.players.length === 0) return false;
  if (!state.players.every((p) => p.ready && p.online)) return false;

  // Check each team has at least 2 players
  for (const team of state.teams) {
    const teamPlayers = state.players.filter((p) => p.team === team.id);
    if (teamPlayers.length < 2) return false;
  }

  // In dual mode, all players must have a team
  if (state.settings.teamMode === "dual") {
    if (state.players.some((p) => !p.team)) return false;
  }

  return true;
}

export function startGame(): void {
  if (!canStartGame()) return;
  const state = useGameStore.getState();
  const nextPhase =
    state.settings.mode === "ai" ? "topics-suggest" : "round-captain";
  useGameStore.getState().setState({ phase: nextPhase });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/actions/lobby.test.ts`
Expected: all 14 tests PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/store/actions/lobby.ts src/store/actions/lobby.test.ts
git commit -m "feat: add lobby store actions — join, team, ready, emoji, kick, start"
```

---

### Task 4: PlayerStatusTable — Add Draggable + Fix Waiting Status

**Files:**
- Modify: `src/components/PlayerStatusTable/PlayerStatusTable.tsx`
- Modify: `src/components/PlayerStatusTable/PlayerStatusTable.module.css`
- Modify: `src/components/PlayerStatusTable/PlayerStatusTable.stories.tsx`

- [ ] **Step 1: Add draggable prop and fix waiting status display**

In `src/components/PlayerStatusTable/PlayerStatusTable.tsx`:

1. Add `draggable` to props interface:

```typescript
export interface PlayerStatusTableProps {
  players: PlayerStatusRow[];
  draggable?: boolean;
  onClick?: (playerData: PlayerStatusRow) => void;
  onDragStart?: (player: PlayerStatusRow, event: React.DragEvent) => void;
}
```

2. Update `StatusDisplay` to show waiting icon:

```typescript
function StatusDisplay({ status }: { status?: PlayerStatus }) {
  switch (status) {
    case "answered": return <>✔️</>;
    case "right": return <>✅</>;
    case "wrong": return <>❌</>;
    case "waiting": return <>⏳</>;
    case "typing":
      return (
        <span className={styles.typingDots}>
          <span />
          <span />
          <span />
        </span>
      );
    default: return null;
  }
}
```

3. Pass draggable to table and rows:

```typescript
export function PlayerStatusTable({ players, draggable, onClick, onDragStart }: PlayerStatusTableProps) {
```

In `PlayerStatusTableRow`, add draggable attribute and handler:

```typescript
function PlayerStatusTableRow({ onClick, onDragStart, playerData, draggable }: PlayerStatusTableRowProps) {
  const id = useId();
  const vtName = id.replaceAll(":", "");
  return (
    <div
      className={`${styles.row} ${draggable ? styles.draggable : ""}`}
      style={{ viewTransitionName: vtName }}
      onClick={() => onClick?.(playerData)}
      data-clickable={onClick !== undefined || undefined}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", playerData.playerName);
        onDragStart?.(playerData, e);
      }}
    >
```

Update `PlayerStatusTableRowProps` and pass new props from parent:

```typescript
interface PlayerStatusTableRowProps {
  playerData: PlayerStatusRow;
  draggable?: boolean;
  onClick?: (playerData: PlayerStatusRow) => void;
  onDragStart?: (player: PlayerStatusRow, event: React.DragEvent) => void;
}
```

In `PlayerStatusTable` map, pass `draggable` and `onDragStart`:

```typescript
{committed.map((p) =>
  <PlayerStatusTableRow
    playerData={p}
    key={p.playerName}
    onClick={onClick}
    draggable={draggable}
    onDragStart={onDragStart}
  />
)}
```

- [ ] **Step 2: Add draggable CSS styles**

In `src/components/PlayerStatusTable/PlayerStatusTable.module.css`, add:

```css
.draggable {
  cursor: grab;
}
.draggable:active {
  cursor: grabbing;
  opacity: 0.7;
}
```

- [ ] **Step 3: Add lobby story**

Add to `src/components/PlayerStatusTable/PlayerStatusTable.stories.tsx`:

```typescript
export const LobbyMode: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "😈", playerName: "Алексей", team: "red", online: true, status: "right" },
    { emoji: "👻", playerName: "Маша", team: "red", online: true, status: "right" },
    { emoji: "🤖", playerName: "Дима", team: "red", online: true, status: "waiting" },
    { emoji: "🐱", playerName: "Вова", team: "red", online: false, status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <p>Lobby mode: draggable rows, ready (✅) and waiting (⏳) statuses</p>
      <PlayerStatusTable
        players={players}
        draggable
        onDragStart={(player) => console.log("drag start:", player.playerName)}
      />
    </div>
  );
};
```

- [ ] **Step 4: Verify build and storybook**

Run: `npx tsc -b --noEmit`
Expected: no errors

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayerStatusTable/
git commit -m "feat: add draggable prop and waiting status display to PlayerStatusTable"
```

---

### Task 5: TeamGroup Component

**Files:**
- Create: `src/components/TeamGroup/TeamGroup.tsx`
- Create: `src/components/TeamGroup/TeamGroup.module.css`
- Create: `src/components/TeamGroup/TeamGroup.stories.tsx`

- [ ] **Step 1: Create TeamGroup component**

```typescript
// src/components/TeamGroup/TeamGroup.tsx
import type { TeamColor } from "@/types/game";
import styles from "./TeamGroup.module.css";

const colorClass: Record<TeamColor, string> = {
  red: styles.red,
  blue: styles.blue,
  none: styles.none,
};

export interface TeamGroupProps {
  label: string;
  teamColor: TeamColor;
  playerCount: number;
  children: React.ReactNode;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function TeamGroup({
  label,
  teamColor,
  playerCount,
  children,
  onDragOver,
  onDrop,
}: TeamGroupProps) {
  return (
    <div
      className={`${styles.group} ${colorClass[teamColor]}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>({playerCount})</span>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create TeamGroup styles**

```css
/* src/components/TeamGroup/TeamGroup.module.css */
.group {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  border-left: 4px solid var(--color-border);
}

.red {
  border-left-color: var(--color-team-red);
}
.red .label {
  color: var(--color-team-red);
}

.blue {
  border-left-color: var(--color-team-blue);
}
.blue .label {
  color: var(--color-team-blue);
}

.none {
  border-left-color: var(--color-team-neutral);
}
.none .label {
  color: var(--color-team-none);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.label {
  font-weight: 600;
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.content {
  min-height: 32px;
}
```

- [ ] **Step 3: Create TeamGroup stories**

```typescript
// src/components/TeamGroup/TeamGroup.stories.tsx
import type { Story } from "@ladle/react";
import { TeamGroup } from "./TeamGroup";
import { PlayerStatusTable, type PlayerStatusRow } from "@/components/PlayerStatusTable/PlayerStatusTable";

const redPlayers: PlayerStatusRow[] = [
  { emoji: "😈", playerName: "Алексей", team: "red", online: true, status: "right" },
  { emoji: "🎃", playerName: "Катя", team: "red", online: true, status: "right" },
];

const bluePlayers: PlayerStatusRow[] = [
  { emoji: "👻", playerName: "Маша", team: "blue", online: true, status: "right" },
  { emoji: "🤖", playerName: "Дима", team: "blue", online: true, status: "waiting" },
];

const noTeamPlayers: PlayerStatusRow[] = [
  { emoji: "🐱", playerName: "Вова", team: "none", online: true, status: "waiting" },
];

export const DualMode: Story = () => (
  <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
    <TeamGroup label="Красные" teamColor="red" playerCount={2}>
      <PlayerStatusTable players={redPlayers} draggable />
    </TeamGroup>
    <TeamGroup label="Синие" teamColor="blue" playerCount={2}>
      <PlayerStatusTable players={bluePlayers} draggable />
    </TeamGroup>
    <TeamGroup label="Без команды" teamColor="none" playerCount={1}>
      <PlayerStatusTable players={noTeamPlayers} draggable />
    </TeamGroup>
  </div>
);

export const SingleMode: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "😈", playerName: "Алексей", team: "none", online: true, status: "right" },
    { emoji: "👻", playerName: "Маша", team: "none", online: true, status: "right" },
    { emoji: "🤖", playerName: "Дима", team: "none", online: true, status: "right" },
  ];
  return (
    <div style={{ width: 320 }}>
      <TeamGroup label="Игроки" teamColor="none" playerCount={3}>
        <PlayerStatusTable players={players} />
      </TeamGroup>
    </div>
  );
};

export const EmptyTeam: Story = () => (
  <div style={{ width: 320 }}>
    <TeamGroup label="Красные" teamColor="red" playerCount={0}>
      <div style={{ textAlign: "center", color: "#999", padding: 16, fontSize: 13 }}>
        Перетащите игрока сюда
      </div>
    </TeamGroup>
  </div>
);
```

- [ ] **Step 4: Verify build**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/TeamGroup/
git commit -m "feat: add TeamGroup component with team-colored card layout"
```

---

### Task 6: i18n Keys + Routing + localStorage Helpers

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`
- Modify: `src/App.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/persistence/localPersistence.ts`

- [ ] **Step 1: Add i18n keys**

Replace `src/i18n/ru.json`:

```json
{
  "app": {
    "title": "Loud Quiz"
  },
  "home": {
    "newGame": "Новая игра",
    "constructor": "Редактор вопросов",
    "rules": "Правила"
  },
  "constructor": {
    "title": "Редактор вопросов"
  },
  "rules": {
    "title": "Правила игры"
  },
  "play": {
    "title": "Игра"
  },
  "setup": {
    "title": "Новая игра",
    "teamMode": "Режим команд",
    "single": "Одна команда",
    "singleDesc": "Кооперативный режим",
    "dual": "Две команды",
    "dualDesc": "Соревновательный режим",
    "source": "Источник вопросов",
    "manual": "Свои вопросы",
    "manualDesc": "Загрузить JSON",
    "ai": "AI генерация",
    "aiDesc": "OpenRouter API",
    "uploadJson": "Перетащите JSON-файл сюда",
    "uploadJsonClick": "или нажмите для выбора",
    "replaceJson": "Заменить файл",
    "preview": "Предпросмотр",
    "topics": "тем",
    "questions": "вопросов",
    "blitzTasks": "блиц-заданий",
    "apiKey": "API Key (OpenRouter)",
    "topicCount": "Количество тем",
    "questionsPerTopic": "Вопросов на тему",
    "blitzRounds": "Блиц-раундов",
    "createGame": "Создать игру",
    "fromConstructor": "Загружено из редактора"
  },
  "lobby": {
    "scanQr": "Отсканируйте для подключения",
    "room": "Комната",
    "start": "Старт",
    "calibration": "Калибровка",
    "notReady": "Не все игроки готовы",
    "needMorePlayers": "Нужно минимум 2 игрока в команде",
    "needTeams": "Все игроки должны выбрать команду",
    "kickZone": "Удалить игрока",
    "enterName": "Ваше имя",
    "join": "Присоединиться",
    "chooseTeam": "выбери команду",
    "ready": "Готов",
    "waiting": "Ожидаем остальных",
    "changeAvatar": "Нажмите на аватар для смены"
  },
  "team": {
    "red": "Красные",
    "blue": "Синие",
    "noTeam": "Без команды",
    "players": "Игроки"
  }
}
```

Replace `src/i18n/en.json`:

```json
{
  "app": {
    "title": "Loud Quiz"
  },
  "home": {
    "newGame": "New Game",
    "constructor": "Question Editor",
    "rules": "Rules"
  },
  "constructor": {
    "title": "Question Editor"
  },
  "rules": {
    "title": "Game Rules"
  },
  "play": {
    "title": "Game"
  },
  "setup": {
    "title": "New Game",
    "teamMode": "Team Mode",
    "single": "One Team",
    "singleDesc": "Cooperative mode",
    "dual": "Two Teams",
    "dualDesc": "Competitive mode",
    "source": "Question Source",
    "manual": "Custom Questions",
    "manualDesc": "Upload JSON",
    "ai": "AI Generation",
    "aiDesc": "OpenRouter API",
    "uploadJson": "Drop JSON file here",
    "uploadJsonClick": "or click to select",
    "replaceJson": "Replace file",
    "preview": "Preview",
    "topics": "topics",
    "questions": "questions",
    "blitzTasks": "blitz tasks",
    "apiKey": "API Key (OpenRouter)",
    "topicCount": "Number of topics",
    "questionsPerTopic": "Questions per topic",
    "blitzRounds": "Blitz rounds",
    "createGame": "Create Game",
    "fromConstructor": "Loaded from editor"
  },
  "lobby": {
    "scanQr": "Scan to connect",
    "room": "Room",
    "start": "Start",
    "calibration": "Calibration",
    "notReady": "Not all players are ready",
    "needMorePlayers": "Need at least 2 players per team",
    "needTeams": "All players must choose a team",
    "kickZone": "Remove player",
    "enterName": "Your name",
    "join": "Join",
    "chooseTeam": "choose a team",
    "ready": "Ready",
    "waiting": "Waiting for others",
    "changeAvatar": "Click avatar to change"
  },
  "team": {
    "red": "Red",
    "blue": "Blue",
    "noTeam": "No team",
    "players": "Players"
  }
}
```

- [ ] **Step 2: Add /setup route and SetupPage import**

Create minimal `src/pages/SetupPage.tsx` placeholder:

```typescript
// src/pages/SetupPage.tsx
import { useTranslation } from "react-i18next";

export function SetupPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("setup.title")}</h1>
    </div>
  );
}
```

Update `src/App.tsx`:

```typescript
import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { ConstructorPage } from "@/pages/ConstructorPage";
import { RulesPage } from "@/pages/RulesPage";
import { PlayPage } from "@/pages/PlayPage";
import { SetupPage } from "@/pages/SetupPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/constructor" element={<ConstructorPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/play" element={<PlayPage />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Update HomePage link**

In `src/pages/HomePage.tsx`, change the "New Game" link from `/play` to `/setup`:

```typescript
<Link to="/setup">{t("home.newGame")}</Link>
```

- [ ] **Step 4: Add constructor data helpers to localPersistence**

In `src/persistence/localPersistence.ts`, add a new key and helpers at the end:

Add to `KEYS`:
```typescript
const KEYS = {
  apiKey: "loud-quiz-openrouter-api-key",
  playerName: "loud-quiz-player-name",
  calibration: "loud-quiz-calibration",
  usedQuestions: "loud-quiz-used-questions",
  constructorData: "loud-quiz-constructor-data",
} as const;
```

Add functions:
```typescript
// Constructor data (questions created in editor)

export function getConstructorData(): QuestionsFile | null {
  try {
    const raw = localStorage.getItem(KEYS.constructorData);
    if (!raw) return null;
    return JSON.parse(raw) as QuestionsFile;
  } catch {
    return null;
  }
}

export function setConstructorData(data: QuestionsFile): void {
  localStorage.setItem(KEYS.constructorData, JSON.stringify(data));
}

export function clearConstructorData(): void {
  localStorage.removeItem(KEYS.constructorData);
}
```

Add import at top of file:
```typescript
import type { QuestionsFile } from "@/types/game";
```

- [ ] **Step 5: Fix App.test.tsx if needed**

The existing `src/App.test.tsx` tests routing to `/play`. Update if the test checks that clicking "New Game" navigates to `/play` — it should now go to `/setup`. Read the test first and update accordingly.

- [ ] **Step 6: Verify build and tests**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add src/i18n/ src/App.tsx src/pages/HomePage.tsx src/pages/SetupPage.tsx src/persistence/localPersistence.ts src/App.test.tsx
git commit -m "feat: add i18n keys, /setup route, constructor data persistence"
```

---

### Task 7: SetupPage — Full Implementation

**Files:**
- Modify: `src/pages/SetupPage.tsx` (replace placeholder)
- Create: `src/pages/SetupPage.module.css`

- [ ] **Step 1: Implement SetupPage**

```typescript
// src/pages/SetupPage.tsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { GameSettings, QuestionsFile } from "@/types/game";
import { useGameStore, defaultSettings } from "@/store/gameStore";
import { saveGameState } from "@/persistence/sessionPersistence";
import {
  getApiKey,
  setApiKey,
  getConstructorData,
} from "@/persistence/localPersistence";
import styles from "./SetupPage.module.css";

export function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [teamMode, setTeamMode] = useState<"single" | "dual">(
    defaultSettings.teamMode,
  );
  const [mode, setMode] = useState<"manual" | "ai">(defaultSettings.mode);
  const [topicCount, setTopicCount] = useState(defaultSettings.topicCount);
  const [questionsPerTopic, setQuestionsPerTopic] = useState(
    defaultSettings.questionsPerTopic,
  );
  const [blitzRounds, setBlitzRounds] = useState(
    defaultSettings.blitzRoundsPerTeam,
  );
  const [apiKeyValue, setApiKeyValue] = useState(getApiKey);
  const [questionsFile, setQuestionsFile] = useState<QuestionsFile | null>(
    () => getConstructorData(),
  );
  const [fileName, setFileName] = useState<string | null>(() =>
    getConstructorData() ? t("setup.fromConstructor") : null,
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as QuestionsFile;
        if (!data.topics || !Array.isArray(data.topics)) {
          setError("Invalid JSON: missing topics array");
          return;
        }
        setQuestionsFile(data);
        setFileName(file.name);
        setError(null);
      } catch {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleCreateGame() {
    if (mode === "manual" && !questionsFile) {
      setError("Please upload a questions file");
      return;
    }
    if (mode === "ai") {
      if (
        topicCount * questionsPerTopic <= 0 &&
        blitzRounds <= 0
      ) {
        setError("Need at least some questions or blitz rounds");
        return;
      }
      setApiKey(apiKeyValue);
    }

    const settings: GameSettings = {
      mode,
      teamMode,
      topicCount,
      questionsPerTopic,
      blitzRoundsPerTeam: blitzRounds,
      pastQuestions: [],
    };

    const teams =
      teamMode === "dual"
        ? [
            { id: "red", color: "red" as const, score: 0, jokerUsed: false },
            { id: "blue", color: "blue" as const, score: 0, jokerUsed: false },
          ]
        : [{ id: "default", color: "none" as const, score: 0, jokerUsed: false }];

    const store = useGameStore.getState();
    store.resetGame();
    store.setState({
      settings,
      teams,
      topics: questionsFile?.topics ?? [],
      blitzTasks: questionsFile?.blitzTasks ?? [],
    });

    saveGameState(useGameStore.getState());
    navigate("/play");
  }

  const totalQuestions = questionsFile
    ? questionsFile.topics.reduce((sum, t) => sum + t.questions.length, 0)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.form}>
        <h1 className={styles.title}>{t("setup.title")}</h1>

        {/* Team Mode */}
        <label className={styles.sectionLabel}>{t("setup.teamMode")}</label>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleCard} ${teamMode === "single" ? styles.active : ""}`}
            onClick={() => setTeamMode("single")}
          >
            <span className={styles.toggleIcon}>👥</span>
            <span className={styles.toggleTitle}>{t("setup.single")}</span>
            <span className={styles.toggleDesc}>{t("setup.singleDesc")}</span>
          </button>
          <button
            className={`${styles.toggleCard} ${teamMode === "dual" ? styles.active : ""}`}
            onClick={() => setTeamMode("dual")}
          >
            <span className={styles.toggleIcon}>⚔️</span>
            <span className={styles.toggleTitle}>{t("setup.dual")}</span>
            <span className={styles.toggleDesc}>{t("setup.dualDesc")}</span>
          </button>
        </div>

        {/* Question Source */}
        <label className={styles.sectionLabel}>{t("setup.source")}</label>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleCard} ${mode === "manual" ? styles.active : ""}`}
            onClick={() => setMode("manual")}
          >
            <span className={styles.toggleIcon}>📄</span>
            <span className={styles.toggleTitle}>{t("setup.manual")}</span>
            <span className={styles.toggleDesc}>{t("setup.manualDesc")}</span>
          </button>
          <button
            className={`${styles.toggleCard} ${mode === "ai" ? styles.active : ""}`}
            onClick={() => setMode("ai")}
          >
            <span className={styles.toggleIcon}>🤖</span>
            <span className={styles.toggleTitle}>{t("setup.ai")}</span>
            <span className={styles.toggleDesc}>{t("setup.aiDesc")}</span>
          </button>
        </div>

        {/* Manual: file upload */}
        {mode === "manual" && (
          <>
            <div
              className={styles.dropZone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {questionsFile ? (
                <div className={styles.preview}>
                  <div className={styles.previewTitle}>
                    {fileName}
                  </div>
                  <div className={styles.previewStats}>
                    {questionsFile.topics.length} {t("setup.topics")} · {totalQuestions} {t("setup.questions")} · {questionsFile.blitzTasks?.length ?? 0} {t("setup.blitzTasks")}
                  </div>
                  <ul className={styles.previewTopics}>
                    {questionsFile.topics.map((topic) => (
                      <li key={topic.name}>
                        {topic.name} ({topic.questions.length})
                      </li>
                    ))}
                  </ul>
                  <button
                    className={styles.replaceBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    {t("setup.replaceJson")}
                  </button>
                </div>
              ) : (
                <>
                  <span className={styles.dropIcon}>📁</span>
                  <span>{t("setup.uploadJson")}</span>
                  <span className={styles.dropHint}>{t("setup.uploadJsonClick")}</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </>
        )}

        {/* AI: settings */}
        {mode === "ai" && (
          <div className={styles.aiSettings}>
            <div className={styles.field}>
              <label>{t("setup.apiKey")}</label>
              <input
                type="password"
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
                placeholder="sk-or-..."
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>{t("setup.topicCount")}</label>
                <input
                  type="number"
                  min={0}
                  value={topicCount}
                  onChange={(e) => setTopicCount(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label>{t("setup.questionsPerTopic")}</label>
                <input
                  type="number"
                  min={0}
                  value={questionsPerTopic}
                  onChange={(e) => setQuestionsPerTopic(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label>{t("setup.blitzRounds")}</label>
                <input
                  type="number"
                  min={0}
                  value={blitzRounds}
                  onChange={(e) => setBlitzRounds(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.createBtn} onClick={handleCreateGame}>
          {t("setup.createGame")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SetupPage styles**

```css
/* src/pages/SetupPage.module.css */
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}

.form {
  width: 100%;
  max-width: 500px;
}

.title {
  text-align: center;
  margin-bottom: var(--spacing-lg);
  font-family: var(--font-display);
}

.sectionLabel {
  display: block;
  font-weight: 600;
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.toggle {
  display: flex;
  gap: var(--spacing-sm);
}

.toggleCard {
  flex: 1;
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  cursor: pointer;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  transition: all var(--duration-all);
}

.toggleCard.active {
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.toggleIcon {
  font-size: var(--font-size-xl);
}

.toggleTitle {
  font-weight: 600;
}

.toggleDesc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.dropZone {
  margin-top: var(--spacing-md);
  padding: var(--spacing-lg);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  transition: border-color var(--duration-all);
}

.dropZone:hover {
  border-color: var(--color-primary);
}

.dropIcon {
  font-size: var(--font-size-2xl);
}

.dropHint {
  font-size: var(--font-size-sm);
}

.preview {
  text-align: left;
  width: 100%;
}

.previewTitle {
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.previewStats {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.previewTopics {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.previewTopics li::before {
  content: "• ";
  color: var(--color-primary);
}

.replaceBtn {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.aiSettings {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.field label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.field input {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  background: var(--color-bg);
  color: var(--color-text);
}

.fieldRow {
  display: flex;
  gap: var(--spacing-md);
}

.fieldRow .field {
  flex: 1;
}

.error {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-team-red-light);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.createBtn {
  width: 100%;
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-success);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--duration-all);
}

.createBtn:hover {
  opacity: 0.9;
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/SetupPage.tsx src/pages/SetupPage.module.css
git commit -m "feat: implement SetupPage with team mode, question source, JSON upload/preview"
```

---

### Task 8: PlayPage — Role Detection + Phase Switching

**Files:**
- Modify: `src/pages/PlayPage.tsx`

- [ ] **Step 1: Implement PlayPage with role detection**

```typescript
// src/pages/PlayPage.tsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isHost } from "@/persistence/sessionPersistence";
import { getPlayerName, setPlayerName } from "@/persistence/localPersistence";
import { useTransport } from "@/hooks/useTransport";
import { usePhase } from "@/store/selectors";
import { HostLobby } from "@/pages/lobby/HostLobby";
import { PlayerLobby } from "@/pages/lobby/PlayerLobby";
import styles from "./PlayPage.module.css";

export function PlayPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");

  if (isHost()) {
    return <HostPlay />;
  }

  if (!roomId) {
    return <div>{t("play.title")}: no room specified</div>;
  }

  return <PlayerPlay roomId={roomId} />;
}

function HostPlay() {
  const transport = useTransport({ role: "host" });
  const phase = usePhase();

  if (transport.role !== "host") return null;

  return (
    <div>
      {phase === "lobby" && (
        <HostLobby
          roomId={transport.roomId}
          joinUrl={transport.joinUrl}
        />
      )}
      {/* Future phases will be added here */}
    </div>
  );
}

function PlayerPlay({ roomId }: { roomId: string }) {
  const [playerName, setName] = useState(() => getPlayerName());
  const [joined, setJoined] = useState(false);

  if (!joined) {
    return (
      <PlayerNameEntry
        name={playerName}
        onNameChange={setName}
        onJoin={() => {
          setPlayerName(playerName);
          setJoined(true);
        }}
      />
    );
  }

  return <PlayerPlayConnected roomId={roomId} playerName={playerName} />;
}

function PlayerNameEntry({
  name,
  onNameChange,
  onJoin,
}: {
  name: string;
  onNameChange: (name: string) => void;
  onJoin: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.nameEntry}>
      <h2 className={styles.nameTitle}>🎮 Loud Quiz</h2>
      <div className={styles.nameForm}>
        <label className={styles.nameLabel}>{t("lobby.enterName")}</label>
        <input
          className={styles.nameInput}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onJoin();
          }}
          autoFocus
        />
        <button
          className={styles.joinBtn}
          disabled={!name.trim()}
          onClick={onJoin}
        >
          {t("lobby.join")}
        </button>
      </div>
    </div>
  );
}

function PlayerPlayConnected({
  roomId,
  playerName,
}: {
  roomId: string;
  playerName: string;
}) {
  const transport = useTransport({ role: "player", roomId, playerName });
  const phase = usePhase();

  if (transport.role !== "player") return null;

  return (
    <div>
      {phase === "lobby" && (
        <PlayerLobby
          playerName={playerName}
          sendAction={transport.sendAction}
          connected={transport.connected}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create PlayPage styles**

```css
/* src/pages/PlayPage.module.css */
.nameEntry {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}

.nameTitle {
  font-family: var(--font-display);
  margin-bottom: var(--spacing-xl);
}

.nameForm {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.nameLabel {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.nameInput {
  padding: var(--spacing-md);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-lg);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
}

.nameInput:focus {
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.joinBtn {
  padding: var(--spacing-md);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
}

.joinBtn:disabled {
  opacity: 0.5;
  cursor: default;
}
```

- [ ] **Step 3: Create stub files for HostLobby and PlayerLobby**

```typescript
// src/pages/lobby/HostLobby.tsx
export function HostLobby({
  roomId,
  joinUrl,
}: {
  roomId: string | null;
  joinUrl: string | null;
}) {
  return <div>HostLobby: {roomId}</div>;
}
```

```typescript
// src/pages/lobby/PlayerLobby.tsx
import type { PlayerAction } from "@/types/transport";

export function PlayerLobby({
  playerName,
  sendAction,
  connected,
}: {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
  connected: boolean;
}) {
  return <div>PlayerLobby: {playerName} ({connected ? "connected" : "connecting..."})</div>;
}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlayPage.tsx src/pages/PlayPage.module.css src/pages/lobby/
git commit -m "feat: implement PlayPage with role detection, name entry, and phase switching"
```

---

### Task 9: HostLobby — Full Implementation

**Files:**
- Modify: `src/pages/lobby/HostLobby.tsx`
- Create: `src/pages/lobby/HostLobby.module.css`

- [ ] **Step 1: Install qrcode.react**

Run: `npm install qrcode.react`

- [ ] **Step 2: Implement HostLobby**

```typescript
// src/pages/lobby/HostLobby.tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { useGameStore } from "@/store/gameStore";
import { useSettings, usePlayers, useTeams } from "@/store/selectors";
import { onHostAction } from "@/hooks/useTransport";
import {
  handleJoin,
  handleSetTeam,
  handleSetReady,
  handleChangeEmoji,
  kickPlayer,
  movePlayer,
  startGame,
  canStartGame,
} from "@/store/actions/lobby";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import {
  PlayerStatusTable,
  type PlayerStatusRow,
} from "@/components/PlayerStatusTable/PlayerStatusTable";
import type { TeamColor } from "@/types/game";
import styles from "./HostLobby.module.css";

// Map peerId → playerName for action routing
const peerMap = new Map<string, string>();

export function HostLobby({
  roomId,
  joinUrl,
}: {
  roomId: string | null;
  joinUrl: string | null;
}) {
  const { t } = useTranslation();
  const settings = useSettings();
  const players = usePlayers();
  const teams = useTeams();

  // Register action handler
  useEffect(() => {
    return onHostAction((peerId, action) => {
      switch (action.kind) {
        case "join":
          peerMap.set(peerId, action.name);
          handleJoin(peerId, action.name);
          break;
        case "set-team":
          handleSetTeam(peerMap.get(peerId) ?? "", action.team);
          break;
        case "set-ready":
          handleSetReady(peerMap.get(peerId) ?? "", action.ready);
          break;
        case "change-emoji":
          handleChangeEmoji(peerMap.get(peerId) ?? "");
          break;
        case "start-game":
          startGame();
          break;
      }
    });
  }, []);

  function toStatusRows(teamId: string, teamColor: TeamColor): PlayerStatusRow[] {
    return players
      .filter((p) => p.team === teamId)
      .map((p) => ({
        emoji: p.emoji,
        playerName: p.name,
        team: teamColor,
        online: p.online,
        status: p.ready ? ("right" as const) : ("waiting" as const),
      }));
  }

  function handleDrop(targetTeamId: string, e: React.DragEvent) {
    e.preventDefault();
    const name = e.dataTransfer.getData("text/plain");
    if (name) movePlayer(name, targetTeamId);
  }

  function handleKickDrop(e: React.DragEvent) {
    e.preventDefault();
    const name = e.dataTransfer.getData("text/plain");
    if (name) kickPlayer(name);
  }

  function preventDef(e: React.DragEvent) {
    e.preventDefault();
  }

  const canStart = canStartGame();
  const startReason = !canStart ? getStartBlockReason(t, players, teams, settings) : null;

  return (
    <div className={styles.layout}>
      {/* Left: QR code */}
      <div className={styles.qrSection}>
        <h2 className={styles.logo}>🎮 Loud Quiz</h2>
        <div className={styles.roomId}>
          {t("lobby.room")}: {roomId}
        </div>
        {joinUrl && (
          <>
            <div className={styles.qrCode}>
              <QRCodeSVG value={joinUrl} size={220} />
            </div>
            <div className={styles.scanHint}>{t("lobby.scanQr")}</div>
            <div className={styles.joinUrl}>{joinUrl}</div>
          </>
        )}
      </div>

      {/* Right: Players + Controls */}
      <div className={styles.sidebar}>
        <div className={styles.teamList}>
          {settings.teamMode === "dual" ? (
            <>
              {teams
                .filter((team) => team.color !== "none")
                .map((team) => {
                  const rows = toStatusRows(team.id, team.color);
                  return (
                    <TeamGroup
                      key={team.id}
                      label={t(`team.${team.id}`)}
                      teamColor={team.color}
                      playerCount={rows.length}
                      onDragOver={preventDef}
                      onDrop={(e) => handleDrop(team.id, e)}
                    >
                      <PlayerStatusTable
                        players={rows}
                        draggable
                      />
                    </TeamGroup>
                  );
                })}
              {/* Players with no team */}
              {players.filter((p) => !p.team).length > 0 && (
                <TeamGroup
                  label={t("team.noTeam")}
                  teamColor="none"
                  playerCount={players.filter((p) => !p.team).length}
                >
                  <PlayerStatusTable
                    players={players
                      .filter((p) => !p.team)
                      .map((p) => ({
                        emoji: p.emoji,
                        playerName: p.name,
                        team: "none" as const,
                        online: p.online,
                        status: p.ready
                          ? ("right" as const)
                          : ("waiting" as const),
                      }))}
                    draggable
                  />
                </TeamGroup>
              )}
            </>
          ) : (
            <TeamGroup
              label={t("team.players")}
              teamColor="none"
              playerCount={players.length}
            >
              <PlayerStatusTable
                players={players.map((p) => ({
                  emoji: p.emoji,
                  playerName: p.name,
                  team: "none" as const,
                  online: p.online,
                  status: p.ready ? ("right" as const) : ("waiting" as const),
                }))}
              />
            </TeamGroup>
          )}
        </div>

        {/* Kick drop zone (dual mode) */}
        {settings.teamMode === "dual" && (
          <div
            className={styles.kickZone}
            onDragOver={preventDef}
            onDrop={handleKickDrop}
          >
            {t("lobby.kickZone")}
          </div>
        )}

        {/* Controls */}
        <div className={styles.controls}>
          <button className={styles.calibrationBtn}>
            🔊 {t("lobby.calibration")}
          </button>
          <button
            className={styles.startBtn}
            disabled={!canStart}
            onClick={() => startGame()}
          >
            ▶ {t("lobby.start")}
          </button>
          {startReason && (
            <div className={styles.startHint}>{startReason}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStartBlockReason(
  t: (key: string) => string,
  players: ReturnType<typeof usePlayers>,
  teams: ReturnType<typeof useTeams>,
  settings: ReturnType<typeof useSettings>,
): string | null {
  if (players.some((p) => !p.ready)) return t("lobby.notReady");
  for (const team of teams) {
    if (players.filter((p) => p.team === team.id).length < 2)
      return t("lobby.needMorePlayers");
  }
  if (settings.teamMode === "dual" && players.some((p) => !p.team))
    return t("lobby.needTeams");
  return null;
}
```

- [ ] **Step 3: Create HostLobby styles**

```css
/* src/pages/lobby/HostLobby.module.css */
.layout {
  min-height: 100vh;
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.qrSection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border-radius: 20px;
  box-shadow: var(--shadow-md);
  padding: var(--spacing-xl);
}

.logo {
  font-family: var(--font-display);
  margin: 0 0 var(--spacing-sm);
}

.roomId {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.qrCode {
  margin-bottom: var(--spacing-md);
}

.scanHint {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.joinUrl {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
  word-break: break-all;
  text-align: center;
  max-width: 280px;
}

.sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.teamList {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  flex: 1;
  overflow-y: auto;
}

.kickZone {
  padding: var(--spacing-md);
  border: 2px dashed var(--color-error);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-error);
  font-size: var(--font-size-sm);
  font-weight: 600;
  transition: background var(--duration-all);
}

.kickZone:hover {
  background: var(--color-team-red-light);
}

.controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.calibrationBtn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  color: var(--color-text);
}

.startBtn {
  padding: var(--spacing-md);
  background: var(--color-success);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--duration-all);
}

.startBtn:disabled {
  background: var(--color-border);
  color: var(--color-text-secondary);
  cursor: default;
}

.startHint {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-warning);
}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/lobby/HostLobby.tsx src/pages/lobby/HostLobby.module.css package.json package-lock.json
git commit -m "feat: implement HostLobby with QR code, team groups, drag-to-kick"
```

---

### Task 10: TeamPicker Component

**Files:**
- Create: `src/pages/lobby/TeamPicker.tsx`
- Create: `src/pages/lobby/TeamPicker.module.css`

- [ ] **Step 1: Implement TeamPicker**

```typescript
// src/pages/lobby/TeamPicker.tsx
import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./TeamPicker.module.css";

interface TeamPickerProps {
  emoji: string;
  playerName: string;
  currentTeam: string;
  teamColor: TeamColor;
  redCount: number;
  blueCount: number;
  disabled?: boolean;
  onSelectTeam: (teamId: string) => void;
}

export function TeamPicker({
  emoji,
  playerName,
  currentTeam,
  teamColor,
  redCount,
  blueCount,
  disabled,
  onSelectTeam,
}: TeamPickerProps) {
  const { t } = useTranslation();
  const avatarRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      dragging.current = true;
      startX.current = e.clientX;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 40) {
        onSelectTeam(dx < 0 ? "red" : "blue");
      }
      if (avatarRef.current) {
        avatarRef.current.style.transform = "";
      }
    },
    [onSelectTeam],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !avatarRef.current) return;
    const dx = e.clientX - startX.current;
    const clamped = Math.max(-80, Math.min(80, dx));
    avatarRef.current.style.transform = `translateX(${clamped}px)`;
  }, []);

  return (
    <div className={styles.picker}>
      <div className={styles.hint}>
        ← {t("lobby.chooseTeam")} →
      </div>
      <div className={styles.zones}>
        <button
          className={`${styles.zone} ${styles.redZone} ${currentTeam === "red" ? styles.selected : ""}`}
          onClick={() => !disabled && onSelectTeam("red")}
          disabled={disabled}
        >
          <span className={styles.zoneCount}>{redCount}</span>
        </button>

        <div
          ref={avatarRef}
          className={styles.avatarDrag}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
        >
          <PlayerAvatar
            emoji={emoji}
            playerName={playerName}
            team={teamColor}
            size={64}
          />
        </div>

        <button
          className={`${styles.zone} ${styles.blueZone} ${currentTeam === "blue" ? styles.selected : ""}`}
          onClick={() => !disabled && onSelectTeam("blue")}
          disabled={disabled}
        >
          <span className={styles.zoneCount}>{blueCount}</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TeamPicker styles**

```css
/* src/pages/lobby/TeamPicker.module.css */
.picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.zones {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  height: 100px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
}

.zone {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: opacity var(--duration-all);
}

.zone:disabled {
  cursor: default;
  opacity: 0.5;
}

.redZone {
  background: linear-gradient(135deg, var(--color-team-red-light), var(--color-team-red));
}

.blueZone {
  background: linear-gradient(135deg, var(--color-team-blue-light), var(--color-team-blue));
}

.zone.selected {
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
}

.zoneCount {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  color: white;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.avatarDrag {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  cursor: grab;
  touch-action: none;
  transition: transform 0.15s ease-out;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
}

.avatarDrag:active {
  cursor: grabbing;
  transition: none;
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/lobby/TeamPicker.tsx src/pages/lobby/TeamPicker.module.css
git commit -m "feat: add TeamPicker with drag/click team selection zones"
```

---

### Task 11: PlayerLobby — Full Implementation

**Files:**
- Modify: `src/pages/lobby/PlayerLobby.tsx`
- Create: `src/pages/lobby/PlayerLobby.module.css`

- [ ] **Step 1: Implement PlayerLobby**

```typescript
// src/pages/lobby/PlayerLobby.tsx
import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { PlayerAction } from "@/types/transport";
import type { TeamColor } from "@/types/game";
import { usePlayers, useSettings, useTeams } from "@/store/selectors";
import { isAllPlayersReady } from "@/store/selectors";
import { useGameStore } from "@/store/gameStore";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import {
  PlayerStatusTable,
  type PlayerStatusRow,
} from "@/components/PlayerStatusTable/PlayerStatusTable";
import { TeamPicker } from "./TeamPicker";
import styles from "./PlayerLobby.module.css";

interface PlayerLobbyProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
  connected: boolean;
}

export function PlayerLobby({
  playerName,
  sendAction,
  connected,
}: PlayerLobbyProps) {
  const { t } = useTranslation();
  const players = usePlayers();
  const settings = useSettings();
  const teams = useTeams();
  const state = useGameStore.getState();
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(players.length);

  const me = players.find((p) => p.name === playerName);
  const isDual = settings.teamMode === "dual";
  const allReady = isAllPlayersReady(state);

  // Auto-scroll on new player join (not on disconnect)
  useEffect(() => {
    if (players.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevCountRef.current = players.length;
  }, [players.length]);

  function getTeamColor(teamId: string): TeamColor {
    const team = teams.find((t) => t.id === teamId);
    return team?.color ?? "none";
  }

  function toRows(): PlayerStatusRow[] {
    return players.map((p) => ({
      emoji: p.emoji,
      playerName: p.name,
      team: getTeamColor(p.team),
      online: p.online,
      status: p.ready ? ("right" as const) : ("waiting" as const),
    }));
  }

  if (!connected || !me) {
    return (
      <div className={styles.page}>
        <div className={styles.connecting}>Connecting...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Avatar */}
      <div className={styles.avatarSection}>
        <PlayerAvatar
          emoji={me.emoji}
          playerName={me.name}
          team={getTeamColor(me.team)}
          size={80}
          onClick={
            !me.ready
              ? () => sendAction({ kind: "change-emoji" })
              : undefined
          }
        />
        <div className={styles.playerName}>{me.name}</div>
        {!me.ready && (
          <div className={styles.avatarHint}>{t("lobby.changeAvatar")}</div>
        )}
        {me.ready && (
          <div className={styles.lockedHint}>🔒</div>
        )}
      </div>

      {/* Team Picker (dual mode, not ready) */}
      {isDual && (
        <TeamPicker
          emoji={me.emoji}
          playerName={me.name}
          currentTeam={me.team}
          teamColor={getTeamColor(me.team)}
          redCount={players.filter((p) => p.team === "red").length}
          blueCount={players.filter((p) => p.team === "blue").length}
          disabled={me.ready}
          onSelectTeam={(team) => sendAction({ kind: "set-team", team })}
        />
      )}

      {/* Player list */}
      <div className={styles.playerList} ref={listRef}>
        {isDual ? (
          <>
            {teams.map((team) => {
              const teamPlayers = players.filter((p) => p.team === team.id);
              if (teamPlayers.length === 0) return null;
              return (
                <TeamGroup
                  key={team.id}
                  label={t(`team.${team.id}`)}
                  teamColor={team.color}
                  playerCount={teamPlayers.length}
                >
                  <PlayerStatusTable
                    players={teamPlayers.map((p) => ({
                      emoji: p.emoji,
                      playerName: p.name,
                      team: team.color,
                      online: p.online,
                      status: p.ready ? ("right" as const) : ("waiting" as const),
                    }))}
                  />
                </TeamGroup>
              );
            })}
            {players.filter((p) => !p.team).length > 0 && (
              <TeamGroup
                label={t("team.noTeam")}
                teamColor="none"
                playerCount={players.filter((p) => !p.team).length}
              >
                <PlayerStatusTable players={players.filter((p) => !p.team).map((p) => ({
                  emoji: p.emoji,
                  playerName: p.name,
                  team: "none" as const,
                  online: p.online,
                  status: p.ready ? ("right" as const) : ("waiting" as const),
                }))} />
              </TeamGroup>
            )}
          </>
        ) : (
          <TeamGroup
            label={t("team.players")}
            teamColor="none"
            playerCount={players.length}
          >
            <PlayerStatusTable players={toRows()} />
          </TeamGroup>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button className={styles.calibrationBtn}>
          🔊 {t("lobby.calibration")}
        </button>
        {!me.ready ? (
          <button
            className={styles.readyBtn}
            onClick={() => sendAction({ kind: "set-ready", ready: true })}
          >
            ✓ {t("lobby.ready")}
          </button>
        ) : allReady ? (
          <button
            className={styles.startBtn}
            onClick={() => sendAction({ kind: "start-game" })}
          >
            🚀 {t("lobby.start")}
          </button>
        ) : (
          <button className={styles.waitingBtn} disabled>
            {t("lobby.waiting")}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PlayerLobby styles**

```css
/* src/pages/lobby/PlayerLobby.module.css */
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  gap: var(--spacing-md);
  max-width: 400px;
  margin: 0 auto;
}

.connecting {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: var(--color-text-secondary);
}

.avatarSection {
  text-align: center;
  padding-top: var(--spacing-md);
}

.playerName {
  font-weight: 600;
  font-size: var(--font-size-lg);
  margin-top: var(--spacing-sm);
}

.avatarHint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.lockedHint {
  font-size: var(--font-size-sm);
  color: var(--color-success);
  margin-top: var(--spacing-xs);
}

.playerList {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-md);
  position: sticky;
  bottom: 0;
  background: var(--color-bg);
  padding-top: var(--spacing-sm);
}

.calibrationBtn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  color: var(--color-text);
}

.readyBtn {
  padding: var(--spacing-md);
  background: var(--color-success);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
}

.startBtn {
  padding: var(--spacing-md);
  background: var(--color-warning);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.waitingBtn {
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  color: var(--color-success);
  border: 2px solid var(--color-success);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: default;
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/lobby/PlayerLobby.tsx src/pages/lobby/PlayerLobby.module.css
git commit -m "feat: implement PlayerLobby with avatar, team picker, ready/start flow"
```

---

### Task 12: Integration — Wire Up Host Action Handling in useTransport

**Files:**
- Modify: `src/hooks/useTransport.ts`

- [ ] **Step 1: Update useTransport host join handling**

In `src/hooks/useTransport.ts`, the current `onMessage` handler for `join` does its own reconnection logic (lines 109-123). This now conflicts with `handleJoin` from lobby actions. Remove the inline reconnection handling and let lobby actions handle everything:

Replace the `action.kind === "join"` block:

```typescript
      if (action.kind === "join") {
        // Map peer to player name
        peersRef.current.set(peerId, action.name);
      }
```

Remove the reconnection logic that was there (the `existing` check and player state update). The `onHostAction` handler in HostLobby calls `handleJoin` which handles both new joins and reconnections.

- [ ] **Step 2: Verify all tests pass**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 3: Manual test**

Run: `npm run dev`

1. Open `http://localhost:5173` → click "Новая игра" → SetupPage loads
2. Select team mode, upload JSON or choose AI, click "Создать игру"
3. Redirected to `/play` — HostLobby with QR code
4. Open second tab, navigate to the join URL from QR
5. Enter name, click "Присоединиться"
6. Player appears in host's player list
7. Player selects team (dual mode), clicks "Готов"
8. Host sees status update
9. When all ready, "Старт" becomes clickable

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTransport.ts
git commit -m "feat: simplify useTransport host join — delegate to lobby actions"
```

---

### Task 13: Final Verification + Plan Update

**Files:**
- Modify: `task/plan-01-init.md`

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (existing + new lobby tests)

- [ ] **Step 2: Run type check**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: builds successfully

- [ ] **Step 4: Check storybook**

Run: `npm run dev:storybook`
Verify: TeamGroup and PlayerStatusTable lobby stories render correctly

- [ ] **Step 5: Update plan-01-init.md**

Mark Phase 5 tasks as completed and add "Выполнено" section. Mark all `- [ ]` checkboxes as `- [x]` for completed items.

- [ ] **Step 6: Final commit**

```bash
git add task/plan-01-init.md
git commit -m "step 5 - game setup + lobby"
```
