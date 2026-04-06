import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBroadcastChannelTransport } from "./broadcastChannel";
import type { Transport, Message } from "./interface";

// Mock BroadcastChannel for jsdom
class MockBroadcastChannel {
  static channels = new Map<string, Set<MockBroadcastChannel>>();

  name: string;
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: unknown) {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    for (const peer of peers) {
      if (peer === this) continue;
      const event = new MessageEvent("message", { data });
      const handlers = peer.listeners.get("message");
      if (handlers) {
        for (const handler of handlers) {
          handler(event);
        }
      }
    }
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(handler);
  }

  close() {
    const peers = MockBroadcastChannel.channels.get(this.name);
    peers?.delete(this);
    this.listeners.clear();
  }
}

beforeEach(() => {
  MockBroadcastChannel.channels.clear();
  vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BroadcastChannel transport", () => {
  let host: Transport;
  let player: Transport;

  afterEach(() => {
    host?.close();
    player?.close();
  });

  it("creates a room with b- prefix", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();
    expect(info.roomId).toMatch(/^b-/);
    expect(info.joinUrl).toContain(info.roomId);
  });

  it("sends and receives messages between host and player", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();

    player = createBroadcastChannelTransport();

    const hostReceived: Message[] = [];
    const playerReceived: Message[] = [];

    host.onMessage((_peerId, msg) => hostReceived.push(msg));
    player.onMessage((_peerId, msg) => playerReceived.push(msg));

    await player.joinRoom(info.roomId);

    // Wait for connect handshake
    await delay(50);

    // Player sends action to host
    const action: Message = {
      type: "player-action",
      action: { kind: "join", name: "Alice", emoji: "🎸" },
    };
    player.broadcast(action);

    await delay(50);
    expect(hostReceived).toHaveLength(1);
    expect(hostReceived[0]).toEqual(action);

    // Host broadcasts state to player
    const stateUpdate: Message = {
      type: "state-update",
      state: {
        phase: "lobby",
        settings: {
          mode: "manual",
          teamMode: "single",
          topicCount: 3,
          questionsPerTopic: 4,
          blitzRoundsPerTeam: 2,
          pastQuestions: [],
        },
        players: [],
        teams: [],
        topics: [],
        blitzTasks: [],
        currentRound: null,
        history: [],
        timer: null,
      },
    };
    host.broadcast(stateUpdate);

    await delay(50);
    expect(playerReceived).toHaveLength(1);
    expect(playerReceived[0]).toEqual(stateUpdate);
  });

  it("fires onPeerConnect when a peer joins", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();

    const connected: string[] = [];
    host.onPeerConnect((peerId) => connected.push(peerId));

    player = createBroadcastChannelTransport();
    await player.joinRoom(info.roomId);

    await delay(50);
    expect(connected.length).toBeGreaterThanOrEqual(1);
  });

  it("fires onPeerDisconnect when a peer closes", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();

    const disconnected: string[] = [];
    host.onPeerDisconnect((peerId) => disconnected.push(peerId));

    player = createBroadcastChannelTransport();
    await player.joinRoom(info.roomId);
    await delay(50);

    // Player broadcasts disconnect and closes
    player.close();

    await delay(50);
    expect(disconnected.length).toBeGreaterThanOrEqual(1);
  });

  it("close() cleans up resources", async () => {
    host = createBroadcastChannelTransport();
    await host.createRoom();
    host.close();

    // Sending after close should not throw
    expect(() => host.broadcast({ type: "state-update", state: {} as never })).not.toThrow();
  });
});

describe("Transport factory", () => {
  it("creates BroadcastChannel transport for b- prefix", async () => {
    const { createTransport } = await import("./factory");
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

    const transport = createTransport("b-test123");
    expect(transport).toBeDefined();
    expect(transport.createRoom).toBeDefined();
    transport.close();
  });

  it("throws for p- prefix (not implemented)", async () => {
    const { createTransport } = await import("./factory");
    expect(() => createTransport("p-test123")).toThrow("not implemented");
  });

  it("throws for v- prefix (not implemented)", async () => {
    const { createTransport } = await import("./factory");
    expect(() => createTransport("v-test123")).toThrow("not implemented");
  });

  it("throws for unknown prefix", async () => {
    const { createTransport } = await import("./factory");
    expect(() => createTransport("x-test123")).toThrow("Unknown transport prefix");
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
