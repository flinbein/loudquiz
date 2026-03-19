---
name: varhub-web-client
description: Use this skill when working with the @flinbein/varhub-web-client library — connecting to Varhub servers, creating/joining rooms, using RPCChannel, RPCSource, RoomSocketHandler, Players, VarhubClient, implementing real-time multiplayer communication, or any varhub-related code.
version: 1.0.0
---

# Varhub Web Client Skill

Library: `@flinbein/varhub-web-client` (install: `npm install github:flinbein/varhub-web-client`)

## Architecture Overview

```
Varhub (hub)
├── createRoom(type, options)   → room token
├── join(roomId, params)        → VarhubClient (WebSocket)
├── findRooms(integrity)        → room list
└── createLogger()              → WebSocket logger

VarhubClient                    → low-level WS connection to a room
RPCChannel (on VarhubClient)    → typed RPC calls + state + events
RoomSocketHandler               → server-side room control (ws type)
RPCSource                       → server-side RPC provider
Players                         → named player management
```

## Core Classes

### Varhub — server entry point

```typescript
import { Varhub } from "@flinbein/varhub-web-client";

const hub = new Varhub("https://example.com/varhub/");

// Create a room (qjs or ivm)
const { roomId, token } = await hub.createRoom("qjs", {
  module: { main: "index.js", source: { "index.js": `export default () => 42` } },
  integrity: "optional-integrity-key",
  config: { /* passed to room */ },
});

// Create a ws-type room (client controls it)
const roomSocket = await hub.createRoomSocket();

// Join existing room
const client = hub.join(roomId, { params: ["username"] });

// Find public rooms by integrity
const rooms = await hub.findRooms("integrity-key");

// Get room public message
const msg = await hub.getRoomMessage(roomId);
```

### VarhubClient — WebSocket connection

```typescript
const client = hub.join(roomId, { params: ["Bob"] });

// Wait for connection
await client.promise;  // resolves to client, or rejects on error

client.ready    // boolean
client.closed   // boolean

// Send raw messages
client.send("hello", "world");

// Events
client.on("open", () => {});
client.on("close", (reason, wasOnline) => {});
client.on("message", (...args) => {});
client.on("error", (errPromise) => {});

// Cleanup
client.close("reason");
await using client = hub.join(roomId);  // Symbol.asyncDispose
```

### RPCChannel — typed RPC over VarhubClient

```typescript
import { RPCChannel } from "@flinbein/varhub-web-client";

// TypeScript: describe the remote API
type MyMethods = { sum(a: number, b: number): number; greet(name: string): string };
type MyEvents = { update: [value: number] };
type MyState = { count: number };

const rpc = new RPCChannel<MyMethods, MyEvents, MyState>(client);

// Wait for ready
await rpc.promise;       // resolves to rpc
rpc.ready                // boolean
rpc.state                // current state snapshot

// Call remote methods
const result = await rpc.sum(10, 20);          // → 30
await rpc.math.sum(1, 2);                       // nested namespace

// Subscribe to events
rpc.on("update", (value) => console.log(value));
rpc.once("update", handler);
rpc.off("update", handler);

// Lifecycle events
rpc.on("state", (newState, oldState) => {});
rpc.on("ready", () => {});
rpc.on("close", (reason) => {});
rpc.on("error", (err) => {});

// Sub-channels (via constructors on remote)
const sub = new rpc.Counter(initialValue);     // opens a sub-channel
await sub.increment();

// Cleanup
rpc.close();
await using rpc = new RPCChannel(client);
```

### RoomSocketHandler — ws-type room (client-controlled)

Used when `hub.createRoomSocket()` is called — the client fully controls the room.

```typescript
import { RoomSocketHandler } from "@flinbein/varhub-web-client";

const wsMock = await hub.createRoomSocket();
const room = new RoomSocketHandler(wsMock);

await room.promise;   // wait for room ready

// Connection events
room.on("ready", () => {});
room.on("connection", (con) => {
  con.open();   // accept the connection (or con.close("reason") to reject)
  con.parameters;  // join parameters from client
  con.send("welcome", con.parameters[0]);
});
room.on("connectionOpen", (con) => {});
room.on("connectionClose", (con, reason) => {});
room.on("connectionMessage", (con, ...args) => {});
room.on("close", (reason) => {});

// Broadcast to all open connections
room.broadcast("event", data);

// Targeted send
for (const con of room.getConnections()) {
  con.send("hello", con.parameters[0]);
}

// Validate join params
room.validate({
  parameters: (params) => params.length ? [String(params[0])] : false
});

// Defer connection (async auth)
room.on("connection", (con) => {
  con.defer(async (con, name) => {
    const ok = await checkAuth(name);
    if (!ok) con.close("unauthorized");
  }, con.parameters[0]);
});

room.destroy();
await using room = new RoomSocketHandler(wsMock);
```

### RPCSource — server-side RPC provider

Used server-side (in qjs/ivm rooms) to expose methods and state to clients.

```typescript
import { RPCSource } from "@flinbein/varhub-web-client";

// Pattern 1: shared instance with methods
class Counter extends RPCSource.with({
  $increment(this: Counter) {
    this.setState(s => ({ count: s.count + 1 }));
  },
  $getValue(this: Counter) {
    return this.state.count;
  }
}) {
  constructor() {
    super({ count: 0 });
  }
}
export default () => new Counter();

// Pattern 2: standalone with custom handler
const rpc = new RPCSource((connection, path, args, openChannel) => {
  if (path[0] === "greet") return `Hello, ${args[0]}!`;
  throw new Error("unknown method");
}, { initialState: "value" });

// Update state (broadcasts to all subscribers)
rpc.setState({ count: 42 });
rpc.setState(prev => ({ count: prev.count + 1 }));

// Emit events to subscribers
rpc.emit("update", 42);
rpc.emitFor((con) => con.parameters[0] === "admin", "adminEvent", data);

// Connect to room
RPCSource.start(room, rpc, { maxChannels: 100 });

rpc.dispose();
```

### Players — named player management

Groups multiple connections under one player identity.

```typescript
import { Players } from "@flinbein/varhub-web-client";

const players = new Players(room, (connection, name, ...rest) => {
  // Return player name to register, null to skip
  if (!name) return null;
  return String(name);
});

// Events
players.on("join", (player) => {});
players.on("leave", (player) => {});
players.on("online", (player) => {});   // first connection opened
players.on("offline", (player) => {}); // last connection closed

// Access players
const bob = players.get("Bob");      // by name
const player = players.get(con);     // by connection
players.all()                        // Set<Player>
players.count                        // number
players.getTeam("red")               // Set<Player>

// Player instance
bob.name          // string
bob.online        // boolean
bob.registered    // boolean
bob.team          // string | undefined
bob.connections   // Set<Connection>
bob.data          // custom data

bob.send("message", data);
bob.setTeam("blue");
bob.kick("reason");

bob.on("online", () => {});
bob.on("offline", () => {});
bob.on("leave", () => {});
bob.on("connectionMessage", (con, ...args) => {});
```

## Room Types

| Type | Engine | WebAssembly | Async import | Memory | CPU |
|------|--------|-------------|--------------|--------|-----|
| `qjs` | QuickJS-ng | No | Yes | 100 MB | 50% |
| `ivm` | V8 (isolated-vm) | Yes | No | 64 MB | 20% |
| `ws` | None (client-side) | N/A | N/A | Unlimited | Unlimited |

## RPC Wire Protocol

Messages: `[key, channelId?, action, ...data]`

Client actions: `CALL=0`, `CLOSE=1`, `CREATE=2`, `NOTIFY=3`
Server actions: `RESPONSE_OK=0`, `CLOSE=1`, `STATE=2`, `RESPONSE_ERROR=3`, `EVENT=4`

## Common Patterns

### Full client-side flow (connecting to qjs room)
```typescript
const hub = new Varhub("https://my-server.com/varhub/");
const { roomId } = await hub.createRoom("qjs", {
  module: { main: "game.js", source: { "game.js": serverCode } }
});
const client = hub.join(roomId, { params: ["PlayerName"] });
const rpc = new RPCChannel(client);
await rpc.promise;
const result = await rpc.someMethod(arg1, arg2);
```

### Server-side qjs room module
```typescript
// Exported default function is called once when room starts
// Constructor receives RPCSource machinery automatically
export default function() {
  let state = { score: 0 };
  return {
    getScore: () => state.score,
    addScore: (n: number) => { state.score += n; }
  };
}
```

### Dispose pattern
```typescript
// All classes support Symbol.dispose / Symbol.asyncDispose
await using client = hub.join(roomId);
await using rpc = new RPCChannel(client);
// auto-cleanup on scope exit
```

## Key Notes

- **TypeScript generics**: `RPCChannel<Methods, Events, State>`, `RoomSocketHandler<Desc>`, `Players<Desc, PlayerData>` — always type these for autocomplete
- **`rpc.then` is always `undefined`** — prevents accidental Promise-like treatment
- **`new rpc.Constructor(args)`** opens a sub-channel, not a real JS constructor
- **`RPCSource.with(methods)`** — method names prefixed with `$` are remotely callable
- **`con.defer()`** — use for async authentication before opening a connection
- **xjmapper** is used internally for serialization — supports complex JS types over WebSocket
