# p2pt Transport + Reconnection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace BroadcastChannel as default transport with p2pt (WebRTC via WebTorrent trackers) and add reconnection support for both host and player.

**Architecture:** p2pt handles peer discovery AND data transfer via `p2pt.send()` — no `webrtcPeer.ts` layer on top. Star topology achieved by players destroying non-host peer connections. Host auto-saves state to sessionStorage; on reload, rejoins same room. Players auto-reconnect on disconnect with retry/cancel UI.

**Tech Stack:** p2pt (WebTorrent tracker-based WebRTC), React 19, TypeScript, Zustand, Vite

**Spec:** `task/spec-p2pt-reconnection.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/utils/roomId.ts` | Create | generateRoomId, formatRoomId, parseRoomId |
| `src/utils/roomId.test.ts` | Create | Unit tests for roomId utils |
| `src/transport/p2pt.ts` | Create | p2pt Transport implementation |
| `src/transport/p2ptTransport.test.ts` | Create | Unit tests for p2pt transport |
| `src/transport/factory.ts` | Rewrite | localStorage-based transport selection, remove prefix system |
| `src/transport/broadcastChannel.ts` | Modify | Numeric roomId, updated channel name |
| `src/transport/broadcastChannel.test.ts` | Rewrite | Update for new roomId format, new factory API |
| `src/persistence/sessionPersistence.ts` | Modify | Add roomId save/load/clear |
| `src/persistence/localPersistence.ts` | Modify | playerName reads sessionStorage first |
| `src/persistence/persistence.test.ts` | Modify | Tests for new persistence behavior |
| `src/hooks/useTransport.ts` | Rewrite | Host reconnection, player auto-reconnect, retry/error state |
| `src/pages/PlayPage.tsx` | Rewrite | Combined entry form (roomId + name), error screen, reconnection |
| `src/pages/PlayPage.module.css` | Modify | Styles for roomId input, error screen |
| `src/pages/HomePage.tsx` | Modify | Add "Join" button |
| `src/i18n/ru.json` | Modify | New keys for join form, errors |
| `src/i18n/en.json` | Modify | New keys for join form, errors |
| `package.json` | Modify | Add p2pt dependency |

---

### Task 1: Install p2pt + roomId utilities

**Files:**
- Modify: `package.json`
- Create: `src/utils/roomId.ts`
- Create: `src/utils/roomId.test.ts`

- [ ] **Step 1: Install p2pt**

```bash
npm install p2pt
```

Verify it installs without errors. Check `node_modules/p2pt` exists.

- [ ] **Step 2: Write roomId utility tests**

Create `src/utils/roomId.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateRoomId, formatRoomId, parseRoomId } from "./roomId";

describe("roomId utilities", () => {
  describe("generateRoomId", () => {
    it("returns a 9-digit string", () => {
      const id = generateRoomId();
      expect(id).toMatch(/^\d{9}$/);
    });

    it("pads with leading zeros", () => {
      const id = generateRoomId();
      expect(id).toHaveLength(9);
    });
  });

  describe("formatRoomId", () => {
    it("formats 9-digit string as XXX-XXX-XXX", () => {
      expect(formatRoomId("123456789")).toBe("123-456-789");
    });

    it("formats shorter strings with dashes at correct positions", () => {
      expect(formatRoomId("12345")).toBe("123-45");
    });

    it("returns empty string for empty input", () => {
      expect(formatRoomId("")).toBe("");
    });
  });

  describe("parseRoomId", () => {
    it("strips non-digits", () => {
      expect(parseRoomId("123-456-789")).toBe("123456789");
    });

    it("strips letters and spaces", () => {
      expect(parseRoomId("12 3a4b5c6d7e8f9")).toBe("123456789");
    });

    it("truncates to 9 digits", () => {
      expect(parseRoomId("1234567890")).toBe("123456789");
    });

    it("returns empty for no digits", () => {
      expect(parseRoomId("abc")).toBe("");
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test -- src/utils/roomId.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement roomId utilities**

Create `src/utils/roomId.ts`:

```typescript
export function generateRoomId(): string {
  return Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
}

export function formatRoomId(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function parseRoomId(input: string): string {
  return input.replace(/\D/g, "").slice(0, 9);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- src/utils/roomId.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/roomId.ts src/utils/roomId.test.ts package.json package-lock.json
git commit -m "feat: add p2pt dependency and roomId utilities"
```

---

### Task 2: Update persistence layer

**Files:**
- Modify: `src/persistence/sessionPersistence.ts`
- Modify: `src/persistence/localPersistence.ts`
- Modify: `src/persistence/persistence.test.ts`

- [ ] **Step 1: Write tests for new persistence behavior**

Add to `src/persistence/persistence.test.ts`:

```typescript
// Add these imports at the top (alongside existing ones):
import {
  saveRoomId,
  loadRoomId,
  clearRoomId,
} from "./sessionPersistence";

// Add inside the existing describe block or create new ones:

describe("roomId persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("saves and loads roomId", () => {
    saveRoomId("123456789");
    expect(loadRoomId()).toBe("123456789");
  });

  it("returns null when no roomId saved", () => {
    expect(loadRoomId()).toBeNull();
  });

  it("clears roomId", () => {
    saveRoomId("123456789");
    clearRoomId();
    expect(loadRoomId()).toBeNull();
  });
});

describe("playerName with sessionStorage priority", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("reads from sessionStorage first", () => {
    sessionStorage.setItem("loud-quiz-player-name", "SessionAlice");
    localStorage.setItem("loud-quiz-player-name", "LocalBob");
    expect(getPlayerName()).toBe("SessionAlice");
  });

  it("falls back to localStorage", () => {
    localStorage.setItem("loud-quiz-player-name", "LocalBob");
    expect(getPlayerName()).toBe("LocalBob");
  });

  it("setPlayerName writes to both storages", () => {
    setPlayerName("Charlie");
    expect(sessionStorage.getItem("loud-quiz-player-name")).toBe("Charlie");
    expect(localStorage.getItem("loud-quiz-player-name")).toBe("Charlie");
  });
});
```

Also update the import of `getPlayerName, setPlayerName` from `"./localPersistence"` if not already imported.

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
npm run test -- src/persistence/persistence.test.ts
```

Expected: new tests FAIL (saveRoomId not exported, getPlayerName doesn't check sessionStorage yet).

- [ ] **Step 3: Update sessionPersistence.ts**

Add to `src/persistence/sessionPersistence.ts`:

```typescript
const ROOM_KEY = "loud-quiz-room-id";

export function saveRoomId(roomId: string): void {
  try {
    sessionStorage.setItem(ROOM_KEY, roomId);
  } catch {
    // sessionStorage may be full or unavailable
  }
}

export function loadRoomId(): string | null {
  try {
    return sessionStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
}

export function clearRoomId(): void {
  sessionStorage.removeItem(ROOM_KEY);
}
```

- [ ] **Step 4: Update localPersistence.ts**

Change `getPlayerName` and `setPlayerName` in `src/persistence/localPersistence.ts`:

```typescript
// Player name — sessionStorage first, fallback to localStorage

export function getPlayerName(): string {
  try {
    const session = sessionStorage.getItem(KEYS.playerName);
    if (session) return session;
  } catch {
    // sessionStorage unavailable
  }
  return localStorage.getItem(KEYS.playerName) ?? "";
}

export function setPlayerName(name: string): void {
  localStorage.setItem(KEYS.playerName, name);
  try {
    sessionStorage.setItem(KEYS.playerName, name);
  } catch {
    // sessionStorage may be full or unavailable
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- src/persistence/persistence.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: all tests PASS (existing tests unaffected).

- [ ] **Step 7: Commit**

```bash
git add src/persistence/sessionPersistence.ts src/persistence/localPersistence.ts src/persistence/persistence.test.ts
git commit -m "feat: add roomId persistence, playerName sessionStorage priority"
```

---

### Task 3: Update BC transport + factory for numeric roomId

**Files:**
- Modify: `src/transport/broadcastChannel.ts`
- Rewrite: `src/transport/factory.ts`
- Rewrite: `src/transport/broadcastChannel.test.ts`

- [ ] **Step 1: Update broadcastChannel.ts**

In `src/transport/broadcastChannel.ts`, change `createRoom()` to use numeric roomId and the new channel name format:

Replace `generateId` function and `createRoom` method:

```typescript
import { generateRoomId } from "@/utils/roomId";
```

Replace the existing `generateId` function:

```typescript
function generatePeerId(): string {
  return Math.random().toString(36).slice(2, 10);
}
```

Update `createRoom()`:

```typescript
    async createRoom(): Promise<RoomInfo> {
      const roomId = generateRoomId();
      initRTC();
      initChannel(roomId);
      const joinUrl = `${window.location.origin}/play?room=${roomId}`;
      console.log(`${tag} room created: ${roomId}`);
      return { roomId, joinUrl };
    },
```

Update `initChannel`:

```typescript
  function initChannel(roomId: string) {
    channel = new BroadcastChannel(`loud-quiz:${roomId}`);
    channel.addEventListener("message", handleBcMessage);
    console.log(`${tag} signaling channel opened: loud-quiz:${roomId}`);
  }
```

Replace all uses of `generateId()` for peerId with `generatePeerId()` — there's one at the top: `const peerId = generateId();` → `const peerId = generatePeerId();`.

- [ ] **Step 2: Rewrite factory.ts**

Replace `src/transport/factory.ts` entirely:

```typescript
import type { Transport } from "./interface";
import { createBroadcastChannelTransport } from "./broadcastChannel";

function useBroadcastTransport(): boolean {
  try {
    return localStorage.getItem("__TRANSPORT__") === "broadcast";
  } catch {
    return false;
  }
}

export function createTransport(_roomId: string): Transport {
  if (useBroadcastTransport()) {
    return createBroadcastChannelTransport();
  }
  // p2pt transport — will be implemented in Task 4
  throw new Error("p2pt transport not implemented yet");
}
```

- [ ] **Step 3: Update broadcastChannel.test.ts**

The test file has tests that check for `b-` prefix and tests that import factory and test prefix-based routing. Update them:

In the "BroadcastChannel + WebRTC transport" describe block, change the room creation test:

```typescript
  it("creates a room with numeric 9-digit roomId", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();
    expect(info.roomId).toMatch(/^\d{9}$/);
    expect(info.joinUrl).toContain(info.roomId);
  });
```

Replace the entire "Transport factory" describe block:

```typescript
describe("Transport factory", () => {
  it("creates BroadcastChannel transport when __TRANSPORT__ is broadcast", async () => {
    localStorage.setItem("__TRANSPORT__", "broadcast");
    const { createTransport } = await import("./factory");
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    vi.stubGlobal("RTCPeerConnection", MockRTCPeerConnection);
    vi.stubGlobal("RTCSessionDescription", MockRTCSessionDescription);
    vi.stubGlobal("RTCIceCandidate", MockRTCIceCandidate);

    const transport = createTransport("123456789");
    expect(transport).toBeDefined();
    expect(transport.createRoom).toBeDefined();
    transport.close();
    localStorage.removeItem("__TRANSPORT__");
  });

  it("throws for p2pt transport (not yet implemented)", async () => {
    localStorage.removeItem("__TRANSPORT__");
    const { createTransport } = await import("./factory");
    expect(() => createTransport("123456789")).toThrow("not implemented");
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/transport/broadcastChannel.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/transport/broadcastChannel.ts src/transport/factory.ts src/transport/broadcastChannel.test.ts
git commit -m "refactor: numeric roomId, localStorage-based transport selection"
```

---

### Task 4: Implement p2pt transport

**Files:**
- Create: `src/transport/p2pt.ts`
- Modify: `src/transport/factory.ts`

- [ ] **Step 1: Create p2pt transport**

Create `src/transport/p2pt.ts`:

```typescript
import P2PT from "p2pt";
import type { Transport, RoomInfo, Message } from "./interface";
import { generateRoomId } from "@/utils/roomId";

const DEFAULT_TRACKERS = [
  "wss://tracker.webtorrent.dev",
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
];

function getTrackers(): string[] {
  try {
    const custom = localStorage.getItem("__TRACKERS__");
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_TRACKERS;
}

interface P2PTInstance {
  start: () => void;
  destroy: () => void;
  send: (peer: P2PTPeer, msg: string) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  _peerId: string;
}

interface P2PTPeer {
  id: string;
  destroy: () => void;
}

export type P2PTRole = "host" | "player";

export function createP2PTTransport(role: P2PTRole): Transport {
  let p2pt: P2PTInstance | null = null;
  const peers = new Map<string, P2PTPeer>();

  let messageHandler: ((peerId: string, message: Message) => void) | null = null;
  let connectHandler: ((peerId: string) => void) | null = null;
  let disconnectHandler: ((peerId: string) => void) | null = null;

  // Player-side star topology: track which peer is the host
  let hostPeerId: string | null = null;
  // Peers waiting to be identified as host (player mode only)
  const pendingPeerTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function tag() {
    return `[p2pt:${p2pt?._peerId?.slice(0, 4) ?? "?"}]`;
  }

  function setupListeners() {
    if (!p2pt) return;

    p2pt.on("peerconnect", (peer: unknown) => {
      const p = peer as P2PTPeer;
      if (peers.has(p.id)) return; // deduplicate
      peers.set(p.id, p);
      console.log(`${tag()} peer connected: ${p.id}`);

      if (role === "player") {
        // Give this peer 5s to prove it's the host (by sending state-update)
        const timer = setTimeout(() => {
          pendingPeerTimers.delete(p.id);
          if (p.id !== hostPeerId) {
            console.log(`${tag()} pruning non-host peer: ${p.id}`);
            peers.delete(p.id);
            p.destroy();
          }
        }, 5000);
        pendingPeerTimers.set(p.id, timer);
      }

      connectHandler?.(p.id);
    });

    p2pt.on("peerclose", (peer: unknown) => {
      const p = peer as P2PTPeer;
      if (!peers.has(p.id)) return;
      peers.delete(p.id);
      const timer = pendingPeerTimers.get(p.id);
      if (timer) {
        clearTimeout(timer);
        pendingPeerTimers.delete(p.id);
      }
      console.log(`${tag()} peer disconnected: ${p.id}`);
      disconnectHandler?.(p.id);
    });

    p2pt.on("msg", (peer: unknown, msg: unknown) => {
      const p = peer as P2PTPeer;
      const text = typeof msg === "string" ? msg : String(msg);
      try {
        const message = JSON.parse(text) as Message;

        // Player-side: first state-update identifies the host
        if (role === "player" && message.type === "state-update" && !hostPeerId) {
          hostPeerId = p.id;
          const timer = pendingPeerTimers.get(p.id);
          if (timer) {
            clearTimeout(timer);
            pendingPeerTimers.delete(p.id);
          }
          console.log(`${tag()} identified host: ${p.id}`);
        }

        console.log(`${tag()} msg from ${p.id}: ${message.type}`);
        messageHandler?.(p.id, message);
      } catch (e) {
        console.warn(`${tag()} bad message from ${p.id}:`, e);
      }
    });

    p2pt.on("trackerconnect", (tracker: unknown) => {
      const t = tracker as { announceUrl?: string };
      console.log(`${tag()} tracker connected: ${t.announceUrl ?? "unknown"}`);
    });

    p2pt.on("trackerwarning", (err: unknown) => {
      console.warn(`${tag()} tracker warning:`, err);
    });
  }

  function initP2PT(roomId: string) {
    const trackers = getTrackers();
    const identifier = `loud-quiz:${roomId}`;
    p2pt = new P2PT(trackers, identifier) as unknown as P2PTInstance;
    console.log(`${tag()} created with identifier: ${identifier}`);
    setupListeners();
    p2pt.start();
  }

  function cleanup() {
    for (const timer of pendingPeerTimers.values()) {
      clearTimeout(timer);
    }
    pendingPeerTimers.clear();
    peers.clear();
    hostPeerId = null;
    if (p2pt) {
      p2pt.destroy();
      p2pt = null;
    }
  }

  return {
    async createRoom(): Promise<RoomInfo> {
      const roomId = generateRoomId();
      initP2PT(roomId);
      const joinUrl = `${window.location.origin}/play?room=${roomId}`;
      console.log(`${tag()} room created: ${roomId}`);
      return { roomId, joinUrl };
    },

    async joinRoom(roomId: string): Promise<void> {
      initP2PT(roomId);
      console.log(`${tag()} joining room: ${roomId}`);
    },

    send(targetId: string, message: Message): void {
      const peer = peers.get(targetId);
      if (peer && p2pt) {
        p2pt.send(peer, JSON.stringify(message)).catch((err) => {
          console.warn(`${tag()} send failed to ${targetId}:`, err);
        });
      }
    },

    broadcast(message: Message): void {
      if (!p2pt) return;
      const text = JSON.stringify(message);
      for (const peer of peers.values()) {
        p2pt.send(peer, text).catch((err) => {
          console.warn(`${tag()} broadcast send failed to ${peer.id}:`, err);
        });
      }
    },

    onMessage(handler: (peerId: string, message: Message) => void): void {
      messageHandler = handler;
    },

    onPeerConnect(handler: (peerId: string) => void): void {
      connectHandler = handler;
    },

    onPeerDisconnect(handler: (peerId: string) => void): void {
      disconnectHandler = handler;
    },

    close(): void {
      console.log(`${tag()} closing`);
      cleanup();
    },
  };
}
```

- [ ] **Step 2: Wire p2pt into factory**

Update `src/transport/factory.ts`:

```typescript
import type { Transport } from "./interface";
import { createBroadcastChannelTransport } from "./broadcastChannel";
import { createP2PTTransport, type P2PTRole } from "./p2pt";

function useBroadcastTransport(): boolean {
  try {
    return localStorage.getItem("__TRANSPORT__") === "broadcast";
  } catch {
    return false;
  }
}

export function createTransport(roomId: string, role: P2PTRole = "host"): Transport {
  if (useBroadcastTransport()) {
    return createBroadcastChannelTransport();
  }
  return createP2PTTransport(role);
}
```

Note: `roomId` parameter is kept for future use (VarHub) but not used by factory for selection anymore. The `role` parameter is passed through to p2pt for star topology pruning.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If p2pt types are missing, add a declaration file `src/transport/p2pt-types.d.ts`:

```typescript
declare module "p2pt" {
  export default class P2PT {
    constructor(announceURLs: string[], identifierString: string);
    _peerId: string;
    start(): void;
    destroy(): void;
    send(peer: { id: string }, msg: string): Promise<[unknown, string]>;
    on(event: "peerconnect", handler: (peer: { id: string; destroy(): void }) => void): void;
    on(event: "peerclose", handler: (peer: { id: string }) => void): void;
    on(event: "msg", handler: (peer: { id: string }, msg: string) => void): void;
    on(event: "trackerconnect", handler: (tracker: { announceUrl: string }, stats: object) => void): void;
    on(event: "trackerwarning", handler: (error: Error, stats: object) => void): void;
    requestMorePeers(): Promise<Record<string, { id: string }>>;
    setIdentifier(identifierString: string): void;
  }
}
```

- [ ] **Step 4: Update factory test**

In `src/transport/broadcastChannel.test.ts`, update the p2pt factory test to no longer throw:

```typescript
  it("creates p2pt transport by default", async () => {
    localStorage.removeItem("__TRANSPORT__");
    const { createTransport } = await import("./factory");
    const transport = createTransport("123456789", "host");
    expect(transport).toBeDefined();
    expect(transport.createRoom).toBeDefined();
    transport.close();
  });
```

Note: This test creates a real p2pt instance which tries to connect to trackers. It will work (just won't find peers in test). If it causes issues due to WebSocket in test env, wrap creation check only:

```typescript
  it("creates p2pt transport by default", async () => {
    localStorage.removeItem("__TRANSPORT__");
    const { createP2PTTransport } = await import("./p2pt");
    const transport = createP2PTTransport("host");
    expect(transport).toBeDefined();
    expect(transport.createRoom).toBeDefined();
    transport.close();
  });
```

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/transport/p2pt.ts src/transport/factory.ts src/transport/broadcastChannel.test.ts
git commit -m "feat: p2pt transport implementation with star topology pruning"
```

If a type declaration file was needed:

```bash
git add src/transport/p2pt-types.d.ts
```

---

### Task 5: Update useTransport — host reconnection + auto-save

**Files:**
- Modify: `src/hooks/useTransport.ts`

This is the largest task. The key changes:
1. Host auto-saves state to sessionStorage on every store change
2. Host reconnects on page reload (reuses saved roomId)
3. Factory now receives `role` param
4. Duplicate name handling (overwrite old peerId mapping)

- [ ] **Step 1: Rewrite useHostTransport**

Replace the `useHostTransport` function in `src/hooks/useTransport.ts`:

```typescript
import {
  saveGameState,
  loadGameState,
  loadRoomId,
  saveRoomId,
} from "@/persistence/sessionPersistence";

function useHostTransport(): UseTransportHostResult {
  const transportRef = useRef<Transport | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peersRef = useRef(new Map<string, string>()); // peerId → playerName

  // Broadcast state to all connected players
  const broadcastState = useCallback(() => {
    const transport = transportRef.current;
    if (!transport) return;

    const { setState: _set, resetGame: _reset, ...state } =
      useGameStore.getState();

    for (const [peerId, playerName] of peersRef.current) {
      const filtered = filterStateForPlayer(state, playerName);
      transport.send(peerId, { type: "state-update", state: filtered });
    }
  }, []);

  // Subscribe to store changes: broadcast + auto-save
  useEffect(() => {
    return useGameStore.subscribe(() => {
      broadcastState();
      // Auto-save state for host reconnection
      const { setState: _set, resetGame: _reset, ...state } =
        useGameStore.getState();
      saveGameState(state);
    });
  }, [broadcastState]);

  // Create or rejoin room
  useEffect(() => {
    const transport = createTransport("", "host");
    transportRef.current = transport;

    transport.onPeerConnect(() => {
      setConnected(true);
    });

    transport.onPeerDisconnect((peerId) => {
      const playerName = peersRef.current.get(peerId);
      peersRef.current.delete(peerId);

      if (playerName) {
        const state = useGameStore.getState();
        const players = state.players.map((p) =>
          p.name === playerName ? { ...p, online: false } : p,
        );
        useGameStore.getState().setState({ players });
      }
    });

    transport.onMessage((peerId, message: Message) => {
      if (message.type === "sync-request") {
        transport.send(peerId, {
          type: "sync-response",
          nonce: message.nonce,
          hostNow: performance.now(),
        });
        return;
      }

      if (message.type !== "player-action") return;

      const { action } = message;

      if (action.kind === "join") {
        // Duplicate name handling: if another peer has this name, remove old mapping
        for (const [existingPeerId, existingName] of peersRef.current) {
          if (existingName === action.name && existingPeerId !== peerId) {
            peersRef.current.delete(existingPeerId);
            break;
          }
        }
        peersRef.current.set(peerId, action.name);
      }

      hostActionHandler?.(peerId, action);
    });

    // Check for saved roomId (reconnection)
    const savedRoomId = loadRoomId();
    const savedState = loadGameState();

    if (savedRoomId && savedState) {
      // Reconnection: restore state, mark all players offline, rejoin same room
      const { setState: _set, resetGame: _reset, ...cleanState } = useGameStore.getState();
      // Only restore if current state is fresh (lobby phase = just initialized)
      if (cleanState.phase === "lobby" && cleanState.players.length === 0) {
        useGameStore.getState().setState({
          ...savedState,
          players: savedState.players.map((p) => ({ ...p, online: false })),
        });
      }
      transport
        .joinRoom(savedRoomId)
        .then(() => {
          setRoomId(savedRoomId);
          setJoinUrl(`${window.location.origin}/play?room=${savedRoomId}`);
          setConnected(true);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
        });
    } else {
      // Fresh start: create new room
      transport
        .createRoom()
        .then((info) => {
          setRoomId(info.roomId);
          setJoinUrl(info.joinUrl);
          saveRoomId(info.roomId);
          setConnected(true);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
        });
    }

    return () => {
      transport.close();
      transportRef.current = null;
    };
  }, [broadcastState]);

  return { role: "host", roomId, joinUrl, connected, error };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any import issues (the new sessionPersistence exports).

- [ ] **Step 3: Run full test suite**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTransport.ts
git commit -m "feat: host reconnection + auto-save state to sessionStorage"
```

---

### Task 6: Update useTransport — player reconnection + retry

**Files:**
- Modify: `src/hooks/useTransport.ts`

Add player auto-reconnect on disconnect (5s delay), retry/cancel error state, roomId persistence.

- [ ] **Step 1: Update UseTransportPlayerResult type**

Add reconnection-related fields to the player result type:

```typescript
interface UseTransportPlayerResult {
  role: "player";
  connected: boolean;
  error: string | null;
  sendAction: (action: PlayerAction) => void;
  resyncClock: () => Promise<number>;
  /** Retry connection after error */
  retry: () => void;
  /** Cancel and return to entry screen */
  cancel: () => void;
  /** Whether a reconnection attempt is in progress */
  reconnecting: boolean;
}
```

- [ ] **Step 2: Rewrite usePlayerTransport**

Replace the `usePlayerTransport` function:

```typescript
function usePlayerTransport(
  roomId: string,
  playerName: string,
): UseTransportPlayerResult {
  const transportRef = useRef<Transport | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [connectAttempt, setConnectAttempt] = useState(0);

  const syncCtxRef = useRef<{
    pendingSync: Map<number, (msg: SyncResponseMessage) => void>;
    register: (nonce: number, cb: (msg: SyncResponseMessage) => void) => void;
    unregister: (nonce: number) => void;
  } | null>(null);

  const sendAction = useCallback((action: PlayerAction) => {
    const transport = transportRef.current;
    if (!transport) return;
    transport.broadcast({ type: "player-action", action });
  }, []);

  const resyncClock = useCallback(async (): Promise<number> => {
    const transport = transportRef.current;
    const ctx = syncCtxRef.current;
    if (!transport || !ctx) {
      throw new Error("resyncClock: transport not ready");
    }
    const offset = await runSyncHandshake(transport, ctx.register, ctx.unregister);
    useClockSyncStore.getState().setOffset(offset);
    return offset;
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setConnectAttempt((c) => c + 1);
  }, []);

  const cancel = useCallback(() => {
    // Clear saved room so PlayPage returns to entry form
    sessionStorage.removeItem("loud-quiz-player-room");
    setError("cancelled");
  }, []);

  // Save roomId for reconnection on reload
  useEffect(() => {
    sessionStorage.setItem("loud-quiz-player-room", roomId);
  }, [roomId]);

  useEffect(() => {
    mountedRef.current = true;

    // Clean up previous transport
    if (transportRef.current) {
      transportRef.current.close();
      transportRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const transport = createTransport(roomId, "player");
    transportRef.current = transport;

    const pendingSync = new Map<number, (msg: SyncResponseMessage) => void>();
    const registerSync = (nonce: number, cb: (msg: SyncResponseMessage) => void) => {
      pendingSync.set(nonce, cb);
    };
    const unregisterSync = (nonce: number) => {
      pendingSync.delete(nonce);
    };
    syncCtxRef.current = {
      pendingSync,
      register: registerSync,
      unregister: unregisterSync,
    };

    transport.onMessage((_peerId, message: Message) => {
      if (message.type === "sync-response") {
        const cb = pendingSync.get(message.nonce);
        cb?.(message);
        return;
      }
      if (message.type !== "state-update") return;
      useGameStore.getState().setState(message.state);
    });

    transport.onPeerConnect(async () => {
      try {
        const offset = await runSyncHandshake(transport, registerSync, unregisterSync);
        useClockSyncStore.getState().setOffset(offset);
        transport.broadcast({
          type: "player-action",
          action: { kind: "join", name: playerName },
        });
        if (mountedRef.current) {
          setConnected(true);
          setReconnecting(false);
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    });

    transport.onPeerDisconnect(() => {
      if (!mountedRef.current) return;
      setConnected(false);
      pendingSync.clear();
      useClockSyncStore.getState().reset();

      // Auto-reconnect after 5 seconds
      setReconnecting(true);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setConnectAttempt((c) => c + 1);
        }
      }, 5000);
    });

    transport.joinRoom(roomId).catch((err) => {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      mountedRef.current = false;
      transport.close();
      transportRef.current = null;
      syncCtxRef.current = null;
      pendingSync.clear();
      useClockSyncStore.getState().reset();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [roomId, playerName, connectAttempt]);

  return { role: "player", connected, error, sendAction, resyncClock, retry, cancel, reconnecting };
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTransport.ts
git commit -m "feat: player auto-reconnect on disconnect with retry/cancel"
```

---

### Task 7: Update PlayPage — combined entry form + reconnection + error UI

**Files:**
- Modify: `src/pages/PlayPage.tsx`
- Modify: `src/pages/PlayPage.module.css`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Update PlayPage.tsx**

Replace `PlayPage`, `PlayerPlay`, and `PlayerNameEntry` functions. Keep `HostPlay` and `PlayerPlayConnected` mostly the same but update for new transport API.

Replace the `PlayPage` root function:

```typescript
export function PlayPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const roomIdFromUrl = searchParams.get("room");

  if (isHost()) {
    return <HostPlay />;
  }

  return <PlayerPlay roomIdFromUrl={roomIdFromUrl} />;
}
```

Replace `PlayerPlay`:

```typescript
function PlayerPlay({ roomIdFromUrl }: { roomIdFromUrl: string | null }) {
  const [name, setName] = useState(() => getPlayerName());
  const [roomInput, setRoomInput] = useState(() => {
    if (roomIdFromUrl) return roomIdFromUrl;
    // Check sessionStorage for reconnection
    return sessionStorage.getItem("loud-quiz-player-room") ?? "";
  });
  const [joined, setJoined] = useState(() => {
    // Auto-reconnect if we have saved name and room in sessionStorage
    const savedRoom = sessionStorage.getItem("loud-quiz-player-room");
    const savedName = getPlayerName();
    return !!(savedRoom && savedName && !roomIdFromUrl);
  });

  const roomId = parseRoomId(roomInput);
  const canJoin = roomId.length === 9 && name.trim().length > 0;

  if (joined && roomId.length === 9) {
    return <PlayerPlayConnected roomId={roomId} playerName={name} />;
  }

  return (
    <PlayerEntryForm
      name={name}
      onNameChange={setName}
      roomInput={roomInput}
      onRoomInputChange={setRoomInput}
      roomLocked={!!roomIdFromUrl}
      canJoin={canJoin}
      onJoin={() => {
        setPlayerName(name);
        setJoined(true);
      }}
    />
  );
}
```

Add the `parseRoomId` and `formatRoomId` imports:

```typescript
import { parseRoomId, formatRoomId } from "@/utils/roomId";
```

Replace `PlayerNameEntry` with `PlayerEntryForm`:

```typescript
function PlayerEntryForm({
  name,
  onNameChange,
  roomInput,
  onRoomInputChange,
  roomLocked,
  canJoin,
  onJoin,
}: {
  name: string;
  onNameChange: (name: string) => void;
  roomInput: string;
  onRoomInputChange: (value: string) => void;
  roomLocked: boolean;
  canJoin: boolean;
  onJoin: () => void;
}) {
  const { t } = useTranslation();

  function handleRoomInput(value: string) {
    // Strip non-digits, limit to 9
    const digits = value.replace(/\D/g, "").slice(0, 9);
    onRoomInputChange(digits);
  }

  return (
    <div className={styles.nameEntry}>
      <h2 className={styles.nameTitle}>Loud Quiz</h2>
      <div className={styles.nameForm}>
        <label className={styles.nameLabel}>{t("play.roomCode")}</label>
        <input
          className={`${styles.nameInput} ${styles.roomInput}`}
          value={formatRoomId(parseRoomId(roomInput))}
          onChange={(e) => handleRoomInput(e.target.value)}
          disabled={roomLocked}
          placeholder="000-000-000"
          inputMode="numeric"
        />
        <label className={styles.nameLabel}>{t("lobby.enterName")}</label>
        <input
          className={styles.nameInput}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canJoin) onJoin();
          }}
          autoFocus={!roomLocked}
        />
        <button
          className={styles.joinBtn}
          disabled={!canJoin}
          onClick={onJoin}
        >
          {t("lobby.join")}
        </button>
      </div>
    </div>
  );
}
```

Update `PlayerPlayConnected` to handle error/retry/cancel and reconnecting state:

```typescript
function PlayerPlayConnected({
  roomId,
  playerName,
}: {
  roomId: string;
  playerName: string;
}) {
  const transport = useTransport({ role: "player", roomId, playerName });
  const phase = usePhase();
  useAudio({ playerName });

  if (transport.role !== "player") return null;

  // Cancelled — go back to entry form by clearing session and reloading
  if (transport.error === "cancelled") {
    // Clear saved state and reload to show entry form
    sessionStorage.removeItem("loud-quiz-player-room");
    window.location.href = `/play${window.location.search}`;
    return null;
  }

  // Error state with retry/cancel
  if (transport.error) {
    return <ConnectionError error={transport.error} onRetry={transport.retry} onCancel={transport.cancel} />;
  }

  // Reconnecting state
  if (transport.reconnecting && !transport.connected) {
    return <ConnectionReconnecting />;
  }

  return (
    <GameShell role="player" onClockResync={transport.resyncClock}>
      {phase === "lobby" && (
        <PlayerLobby
          playerName={playerName}
          sendAction={transport.sendAction}
          connected={transport.connected}
        />
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

Add error and reconnecting components:

```typescript
function ConnectionError({
  error,
  onRetry,
  onCancel,
}: {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.nameEntry}>
      <div className={styles.errorCard}>
        <h3>{t("play.connectionError")}</h3>
        <p className={styles.errorText}>{error}</p>
        <div className={styles.errorActions}>
          <button className={styles.joinBtn} onClick={onRetry}>
            {t("play.retry")}
          </button>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {t("play.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectionReconnecting() {
  const { t } = useTranslation();
  return (
    <div className={styles.nameEntry}>
      <div className={styles.errorCard}>
        <p>{t("play.reconnecting")}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update PlayPage.module.css**

Add to `src/pages/PlayPage.module.css`:

```css
.roomInput {
  font-family: var(--font-display);
  letter-spacing: 0.15em;
  text-align: center;
}

.errorCard {
  width: 100%;
  max-width: 360px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.errorText {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  word-break: break-word;
}

.errorActions {
  display: flex;
  gap: var(--spacing-md);
}

.errorActions > button {
  flex: 1;
}

.cancelBtn {
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 3: Update HomePage.tsx**

Add "Join game" link in `src/pages/HomePage.tsx`:

```typescript
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("app.title")}</h1>
      <nav>
        <Link to="/setup">{t("home.newGame")}</Link>
        <Link to="/play">{t("home.joinGame")}</Link>
        <Link to="/constructor">{t("home.constructor")}</Link>
        <Link to="/rules">{t("home.rules")}</Link>
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: Add i18n keys**

Add to `src/i18n/ru.json` inside the `"home"` section:

```json
"joinGame": "Присоединиться"
```

Add to `src/i18n/ru.json` inside the `"play"` section:

```json
"roomCode": "Код комнаты",
"connectionError": "Ошибка подключения",
"retry": "Повторить",
"cancel": "Отмена",
"reconnecting": "Переподключение..."
```

Add the same to `src/i18n/en.json` inside `"home"`:

```json
"joinGame": "Join Game"
```

Inside `"play"`:

```json
"roomCode": "Room code",
"connectionError": "Connection error",
"retry": "Retry",
"cancel": "Cancel",
"reconnecting": "Reconnecting..."
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 7: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/pages/PlayPage.tsx src/pages/PlayPage.module.css src/pages/HomePage.tsx src/i18n/ru.json src/i18n/en.json
git commit -m "feat: player entry form with roomId input, reconnection UI, join button on home"
```

---

### Task 8: Update SetupPage for new roomId format

**Files:**
- Modify: `src/pages/SetupPage.tsx`

The SetupPage currently calls `saveGameState()` which marks the tab as host via `isHost()`. We need to make sure it doesn't set a roomId (that's done by useTransport now).

- [ ] **Step 1: Verify SetupPage still works**

Read `src/pages/SetupPage.tsx` lines 91-101. The `handleCreateGame` function calls:
1. `store.resetGame()` + `store.setState(...)` — sets up game state
2. `saveGameState(useGameStore.getState())` — marks tab as host
3. `navigate("/play")` — goes to play page

This flow is still correct. The host will create a room in `useHostTransport` (Task 5). No changes needed to SetupPage beyond verifying it compiles.

- [ ] **Step 2: Type-check and test**

```bash
npx tsc --noEmit && npm run test
```

Expected: all pass.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, go to `/setup`, create a game. Should navigate to `/play` where host creates a room. The URL should update to `/play?room=XXXXXXXXX` with a 9-digit code.

---

### Task 9: Integration test — full manual verification

**Files:** None (manual testing)

- [ ] **Step 1: Test BC mode (debug)**

```bash
# In browser console on host tab:
localStorage.setItem("__TRANSPORT__", "broadcast");
```

1. Open tab 1: go to `/setup`, create game → should go to `/play?room=XXXXXXXXX`
2. Open tab 2: go to `/play?room=XXXXXXXXX` → should see entry form with room code pre-filled and disabled
3. Enter name, click Join → should connect to host
4. Verify lobby works as before

- [ ] **Step 2: Test host reconnection (BC mode)**

1. With host tab open in lobby (players connected), refresh host tab (F5)
2. Host should restore state, show same room code
3. Players should see "Reconnecting..." then reconnect
4. Verify players are back online in lobby

- [ ] **Step 3: Test player reconnection (BC mode)**

1. With active game, refresh player tab (F5)
2. Should auto-reconnect (saved name + roomId from sessionStorage)
3. Host should mark player back online

- [ ] **Step 4: Test p2pt mode (default)**

```bash
# In browser console:
localStorage.removeItem("__TRANSPORT__");
```

1. Open host tab: `/setup` → create game
2. Open player tab on same or different device: go to `/play`, enter room code manually
3. Enter name, join → should discover host via tracker and connect
4. Verify lobby works

- [ ] **Step 5: Test error handling**

1. Player tries to join non-existent room → should show error after timeout
2. Click "Retry" → retries connection
3. Click "Cancel" → returns to entry form

- [ ] **Step 6: Test "Join Game" from home**

1. Go to `/` → click "Join Game" → should go to `/play` with empty room code field
2. Enter room code and name → join

- [ ] **Step 7: Commit final state**

If any fixes were needed during testing:

```bash
git add -A
git commit -m "fix: integration fixes for p2pt + reconnection"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Install p2pt, roomId utils + tests | `utils/roomId.ts` |
| 2 | Persistence: roomId in session, playerName session-first | `persistence/*.ts` |
| 3 | BC transport + factory: numeric roomId, localStorage selection | `transport/factory.ts`, `transport/broadcastChannel.ts` |
| 4 | p2pt transport implementation | `transport/p2pt.ts` |
| 5 | useTransport host: reconnection + auto-save | `hooks/useTransport.ts` |
| 6 | useTransport player: auto-reconnect + retry/cancel | `hooks/useTransport.ts` |
| 7 | PlayPage: entry form, error UI, HomePage join button | `pages/PlayPage.tsx`, `pages/HomePage.tsx` |
| 8 | Verify SetupPage compatibility | `pages/SetupPage.tsx` |
| 9 | Integration testing | Manual |
