# Spec: p2pt Transport + Reconnection

**Date:** 2026-04-13
**Status:** approved
**Scope:** out-of-phase task before Phase 8

---

## 1. Overview

Add p2pt (WebRTC via WebTorrent trackers) as the primary transport. BroadcastChannel remains for local debugging. Add reconnection support for both host and player.

## 2. p2pt Transport

### 2.1 Architecture

p2pt handles both peer discovery AND data transfer via `p2pt.send()`. No `webrtcPeer.ts` layer on top. All messages are JSON text through p2pt's built-in simple-peer channels.

### 2.2 New file: `src/transport/p2pt.ts`

Implements the `Transport` interface:

- **`createRoom()`**: generates numeric roomId, creates `new P2PT(trackers, "loud-quiz:${roomId}")`, calls `start()`, returns `{ roomId, joinUrl }`
- **`joinRoom(roomId)`**: creates `new P2PT(trackers, "loud-quiz:${roomId}")`, calls `start()`
- **`send(peerId, msg)`**: finds peer by id in internal Map, calls `p2pt.send(peer, JSON.stringify(msg))`
- **`broadcast(msg)`**: sends to all tracked peers via `p2pt.send()`
- **`onMessage/onPeerConnect/onPeerDisconnect`**: maps to p2pt events `msg`/`peerconnect`/`peerclose`
- **`close()`**: calls `p2pt.destroy()`

### 2.3 Peer deduplication

p2pt may fire `peerconnect` multiple times for the same peer. The transport maintains a `Map<string, Peer>` (peer.id → peer object) and only fires `connectHandler` for new peers.

### 2.4 Star topology (A+ strategy)

p2pt creates a full mesh by default. We prune it to hub-and-spoke:

- **Host**: accepts all `peerconnect` — needs connections to all players.
- **Player**: on `peerconnect`, waits for first `state-update` message from that peer. If received — this is the host, save as `hostPeer`. Peers that don't send `state-update` within a timeout (e.g. 5s) — call `peer.destroy()` to close the unnecessary connection.
- Result: host holds N connections (one per player), each player holds 1 connection (to host). Clean star topology.

Implementation: the p2pt transport needs a `mode` parameter or the pruning logic lives in `useTransport` player side. Recommendation: pruning in the transport layer via a `role: "host" | "player"` option passed to `createRoom()`/`joinRoom()`.

### 2.5 Trackers

Hardcoded default list in `src/transport/p2pt.ts`:

```typescript
const DEFAULT_TRACKERS = [
  "wss://tracker.webtorrent.dev",
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
];
```

Override via `localStorage.__TRACKERS__` (JSON array of URLs).

### 2.6 npm dependency

Install `p2pt` package. Check for ESM/Vite compatibility.

## 3. RoomId Format

### 3.1 Generation

- 9-digit numeric string: `000000000` to `999999999`
- `Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, "0")`

### 3.2 Display

- Formatted as `123-456-789` (utility function `formatRoomId`)
- Input: filter non-digits, auto-format with dashes

### 3.3 URL

- `/play?room=123456789` (no dashes in URL)

## 4. Factory Changes

### 4.1 `src/transport/factory.ts`

Transport selection:

```typescript
if (localStorage.__TRANSPORT__ === "broadcast") {
  // BC transport (signaling via BC + WebRTC via webrtcPeer.ts)
  // BC signaling channel: BroadcastChannel("loud-quiz:${roomId}")
} else {
  // p2pt transport (default)
}
```

Room ID prefixes (`b-`, `p-`, `v-`) are **removed**. RoomId is always numeric. `TransportPrefix` type and `getTransportPrefix()` are removed.

### 4.2 BC transport update

`broadcastChannel.ts` updated to use `BroadcastChannel("loud-quiz:${roomId}")` instead of `BroadcastChannel("loudquiz-${roomId}")`. RoomId generation changed to 9-digit numeric (same as p2pt).

## 5. Reconnection: Host

### 5.1 State persistence

`useHostTransport` subscribes to Zustand store changes → calls `saveGameState()` to sessionStorage on every change. Only host saves (player state comes from host).

### 5.2 RoomId persistence

New sessionStorage key: `loud-quiz-room-id`. Saved when room is created. Read on page load.

### 5.3 Reconnection flow

1. Page load → check sessionStorage for `loud-quiz-room-id` and `loud-quiz-game-state`
2. If both exist → host reconnection mode:
   - Restore GameState from sessionStorage → `setState()`
   - Mark all players `online: false`
   - Call `joinRoom(savedRoomId)` (not `createRoom` — reuses same identifier)
   - Wait for players to reconnect
3. If not → normal flow (create new room)

### 5.4 URL preservation

After reconnection, `setSearchParams({ room: savedRoomId })` — URL stays the same.

## 6. Reconnection: Player

### 6.1 Player name persistence

- Saved to **both** sessionStorage and localStorage under the same key `loud-quiz-player-name`
- Read order: sessionStorage first → fallback to localStorage
- Update `localPersistence.ts`: `getPlayerName()` checks `sessionStorage.getItem(key)` first, falls back to `localStorage.getItem(key)`. `setPlayerName(name)` writes to both storages.

### 6.2 RoomId persistence

Player saves roomId to sessionStorage (`loud-quiz-player-room`) when connecting.

### 6.3 Auto-reconnection on page reload

1. Page load → check sessionStorage for player name + roomId
2. If both exist → skip name entry, auto-connect to saved roomId
3. Send `join` action → host recognizes name → marks `online: true`

### 6.4 Auto-reconnection on host disconnect

1. `onPeerDisconnect` fires → `connected = false`
2. Wait 5 seconds
3. Recreate p2pt with same identifier → `joinRoom(roomId)`
4. On success → send `join` action again
5. On failure → show error UI

### 6.5 Error UI

When connection fails (initial or retry):
- Error text message
- **[Retry]** button — retry connection with same roomId
- **[Cancel]** button — return to name entry screen (clear sessionStorage roomId)

### 6.6 Duplicate name handling

When host receives `join` with a name that is already `online: true`:
- Overwrite peerId→name mapping (new peer replaces old)
- Old peer's messages will be ignored (not in peersRef map)
- Mark player `online: true` (already was)

## 7. UI Changes

### 7.1 Home page (`HomePage`)

Add "Join game" button → navigates to `/play` (no `?room=` param).

### 7.2 Player entry screen (`PlayerPlay` in PlayPage)

Replace `PlayerNameEntry` with combined form:

- **Room code field**: input with mask `___-___-___`, auto-dashes, filter non-digits
  - If `?room=` in URL → pre-filled and `disabled`
  - If reconnecting (sessionStorage has roomId) → pre-filled and `disabled`
- **Name field**: pre-filled from sessionStorage/localStorage
- **Join button**: enabled when roomId = 9 digits AND name is non-empty
- Validation: strip non-digits from roomId, check length === 9

### 7.3 Connection error screen

Shown when transport fails to connect or reconnect:

- Error message text
- [Retry] button
- [Cancel] button → back to entry form

## 8. What Does NOT Change

- `Transport` interface (`src/types/transport.ts`) — no changes
- `webrtcPeer.ts` — stays, used only by BC transport
- Clock sync (`clockSync.ts`) — works over any transport (JSON messages)
- Game logic, store, actions — no changes
- `stateFilter.ts` — no changes
- Message types — no changes

## 9. Files to Create/Modify

### New files:
- `src/transport/p2pt.ts` — p2pt transport implementation
- `src/utils/roomId.ts` — generateRoomId, formatRoomId, parseRoomId

### Modified files:
- `src/transport/factory.ts` — new selection logic, remove prefixes
- `src/transport/broadcastChannel.ts` — numeric roomId, updated channel name
- `src/hooks/useTransport.ts` — reconnection logic (host: auto-save, restore; player: auto-reconnect, retry)
- `src/persistence/localPersistence.ts` — playerName reads sessionStorage first
- `src/persistence/sessionPersistence.ts` — add roomId save/load
- `src/pages/PlayPage.tsx` — combined entry form, error screen, reconnection flow
- `src/pages/HomePage.tsx` — add "Join game" button
- `src/i18n/ru.json` / `en.json` — new keys for join form, errors, retry/cancel
- `package.json` — add p2pt dependency

### Possibly modified:
- `src/pages/SetupPage.tsx` — roomId generation (no prefix)
- `src/transport/broadcastChannel.test.ts` — update for new roomId format
