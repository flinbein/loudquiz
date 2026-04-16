# Transport Layer

## Architecture

- `interface.ts` — Transport interface: `createRoom`, `joinRoom`, `send`, `broadcast`, `onMessage`, `onPeerConnect`, `onPeerDisconnect`, `close`
- `factory.ts` — Transport selection: `localStorage.__TRANSPORT__ === "broadcast"` for BC, otherwise p2pt (default)
- `broadcastChannel.ts` — BroadcastChannel transport (same-origin debugging only)
- `p2pt.ts` — p2pt (WebRTC via WebTorrent trackers) transport
- `clockSync.ts` — Cristian's algorithm clock sync (player-side)

## p2pt Pitfalls

### Ghost instances (React strict mode)

React strict mode double-mounts effects: create -> cleanup -> create. If `p2pt.start()` is called synchronously in the effect, the first (ghost) instance connects to trackers before `destroy()` can fully stop it. The ghost registers a stale peer ID on the tracker, polluting peer discovery.

**Fix**: Defer `p2pt.start()` via `setTimeout(0)`. Cleanup sets `destroyed = true` and clears the timer before the deferred start executes.

### Tracker stale entries

WebTorrent trackers keep peer entries until the WebSocket disconnects. After a page refresh, the old peer ID lingers on the tracker until the WebSocket times out. This means newly connecting peers may discover and attempt WebRTC connections to stale peer IDs.

**Mitigation**: Periodic `requestMorePeers()` (re-announce) every 10s so peers eventually discover each other's new IDs.

### Star topology pruning

p2pt creates a full mesh — every peer connects to every other peer. For host-player architecture, players must prune non-host peers. Players give each peer 5s to prove it's the host by sending a `state-update` or `sync-response` message. Non-host peers are destroyed via `destroyAllChannels()`.

**Caveat 1**: The `Peer` TypeScript type from p2pt doesn't expose `destroy()`, but p2pt peers are `@thaunknown/simple-peer` instances at runtime, which have `destroy()`. Use type assertion: `(peer as unknown as { destroy(): void }).destroy()`.

**Caveat 2**: p2pt only emits `peerconnect` once per unique peer ID (uses a `newpeer` flag internally). When pruning, you MUST delete the peer from p2pt's internal `this.peers[id]` map (all channels) — otherwise the peer stays in the map, `requestMorePeers()` keeps adding channels to it, and `peerconnect` never fires again. Use `destroyAllChannels(peerId)`.

**Caveat 3**: Host identification must accept `sync-response` (not just `state-update`). The host may not send `state-update` immediately if `hostActionHandler` hasn't been set yet (React effect timing), but it always responds to `sync-request` via the transport message handler.

### p2pt.send() wraps messages

`p2pt.send(peer, msg)` internally calls `JSON.stringify(msg)` if `msg` is an object (sets `data.o = 1` flag). On receive, it `JSON.parse`s back. So if you pass a string that is already JSON-stringified, it arrives as a parsed object. If you pass an object, it gets double-serialized. Our transport passes pre-stringified JSON strings to `p2pt.send()` and parses on receive.

### p2pt.send() returns a Promise that resolves on *response*

`p2pt.send()` stores a `responseWaiting` callback keyed by message ID. The promise resolves when the remote peer calls `peer.respond(msg)`. If the remote never responds, the promise never resolves (no timeout). We `.catch()` send errors but don't await the response.

### Clock sync must not block connection

Clock sync sends `sync-request` messages and waits for `sync-response` from the host. If run before the host is reachable (e.g., stale peers, host refreshing), all samples time out (2s each, 5 samples = 10s) and the player gets an error.

**Fix**: Send `join` action immediately on `peerconnect`. Run clock sync in the background after a 500ms delay. Sync failure is a warning, not an error — the calibration UI has a manual re-sync button.

## Tracker configuration

Default trackers are hardcoded in `p2pt.ts`. Override via `localStorage.__TRACKERS__` (JSON array of WSS URLs).

## Room ID format

9-digit numeric string (`000000000`-`999999999`), displayed as `123-456-789`. No transport prefixes. Utilities in `src/utils/roomId.ts`.
