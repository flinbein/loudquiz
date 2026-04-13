import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBroadcastChannelTransport } from "./broadcastChannel";
import type { Transport, Message } from "./interface";

// --- Mock BroadcastChannel ---

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
          queueMicrotask(() => handler(event));
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

// --- Mock WebRTC ---

/** Registry to pair offer/answer PCs by SDP string */
const pcRegistry = new Map<string, MockRTCPeerConnection>();

class MockRTCDataChannel {
  label: string;
  readyState: RTCDataChannelState = "connecting";
  binaryType: BinaryType = "blob";
  private _remote: MockRTCDataChannel | null = null;

  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  constructor(label: string) {
    this.label = label;
  }

  _pair(remote: MockRTCDataChannel) {
    this._remote = remote;
    remote._remote = this;
  }

  _open() {
    this.readyState = "open";
    this.onopen?.(new Event("open"));
  }

  send(data: string | ArrayBuffer) {
    if (this.readyState !== "open" || !this._remote) return;
    if (this._remote.readyState === "open") {
      this._remote.onmessage?.(new MessageEvent("message", { data }));
    }
  }

  close() {
    if (this.readyState === "closed") return;
    this.readyState = "closed";
    this.onclose?.(new Event("close"));
  }
}

class MockRTCPeerConnection {
  connectionState: RTCPeerConnectionState = "new";
  localDescription: { type: RTCSdpType; sdp: string } | null = null;
  remoteDescription: { type: RTCSdpType; sdp: string } | null = null;

  onicecandidate: ((ev: { candidate: null }) => void) | null = null;
  ondatachannel:
    | ((ev: { channel: MockRTCDataChannel }) => void)
    | null = null;
  onconnectionstatechange: ((ev: Event) => void) | null = null;

  private _localChannels: MockRTCDataChannel[] = [];
  private _id = Math.random().toString(36).slice(2, 8);
  private _closed = false;

  createDataChannel(label: string): MockRTCDataChannel {
    const ch = new MockRTCDataChannel(label);
    this._localChannels.push(ch);
    return ch;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: "offer", sdp: `offer-${this._id}` };
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: "answer", sdp: `answer-${this._id}` };
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit) {
    this.localDescription = { type: desc.type!, sdp: desc.sdp ?? "" };
    // Register ourselves so the remote side can find us
    pcRegistry.set(desc.sdp ?? "", this);
    // Fire ICE gathering complete
    queueMicrotask(() => {
      this.onicecandidate?.({ candidate: null });
    });
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    this.remoteDescription = { type: desc.type!, sdp: desc.sdp ?? "" };

    if (desc.type === "answer") {
      // We are the offerer. Find the answerer by their answer SDP.
      const answererPc = pcRegistry.get(desc.sdp ?? "");
      if (answererPc) {
        this._wireUp(answererPc);
      }
    }
  }

  private _wireUp(answererPc: MockRTCPeerConnection) {
    // For each local channel on the offerer, create a mirror on the answerer
    for (const localCh of this._localChannels) {
      const remoteCh = new MockRTCDataChannel(localCh.label);
      localCh._pair(remoteCh);

      // Fire ondatachannel on the answerer
      queueMicrotask(() => {
        answererPc.ondatachannel?.({ channel: remoteCh });

        // Open channels after another tick
        queueMicrotask(() => {
          localCh._open();
          remoteCh._open();

          // Connection state → connected
          this.connectionState = "connected";
          this.onconnectionstatechange?.(new Event("connectionstatechange"));
          answererPc.connectionState = "connected";
          answererPc.onconnectionstatechange?.(
            new Event("connectionstatechange"),
          );
        });
      });
    }
  }

  async addIceCandidate() {
    // no-op
  }

  close() {
    if (this._closed) return;
    this._closed = true;
    this.connectionState = "closed";
    this.onconnectionstatechange?.(new Event("connectionstatechange"));
    for (const ch of this._localChannels) ch.close();
  }
}

class MockRTCSessionDescription {
  type: RTCSdpType;
  sdp: string;
  constructor(init: RTCSessionDescriptionInit) {
    this.type = init.type!;
    this.sdp = init.sdp ?? "";
  }
}

class MockRTCIceCandidate {
  candidate: string;
  constructor(init: RTCIceCandidateInit) {
    this.candidate = init.candidate ?? "";
  }
}

// --- Setup ---

beforeEach(() => {
  MockBroadcastChannel.channels.clear();
  pcRegistry.clear();
  vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  vi.stubGlobal("RTCPeerConnection", MockRTCPeerConnection);
  vi.stubGlobal("RTCSessionDescription", MockRTCSessionDescription);
  vi.stubGlobal("RTCIceCandidate", MockRTCIceCandidate);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Tests ---

describe("BroadcastChannel + WebRTC transport", () => {
  let host: Transport;
  let player: Transport;

  afterEach(() => {
    host?.close();
    player?.close();
  });

  it("creates a room with numeric 9-digit roomId", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();
    expect(info.roomId).toMatch(/^\d{9}$/);
    expect(info.joinUrl).toContain(info.roomId);
  });

  it("sends and receives messages between host and player via WebRTC", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();

    player = createBroadcastChannelTransport();

    const hostReceived: Message[] = [];
    const playerReceived: Message[] = [];

    host.onMessage((_peerId, msg) => hostReceived.push(msg));
    player.onMessage((_peerId, msg) => playerReceived.push(msg));

    await player.joinRoom(info.roomId);

    // Wait for signaling + WebRTC channel setup
    await delay(100);

    // Player sends action to host
    const action: Message = {
      type: "player-action",
      action: { kind: "join", name: "Alice" },
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

  it("fires onPeerConnect when WebRTC channel is established", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();

    const connected: string[] = [];
    host.onPeerConnect((peerId) => connected.push(peerId));

    player = createBroadcastChannelTransport();
    await player.joinRoom(info.roomId);

    await delay(100);
    expect(connected.length).toBeGreaterThanOrEqual(1);
  });

  it("fires onPeerDisconnect when a peer closes", async () => {
    host = createBroadcastChannelTransport();
    const info = await host.createRoom();

    const disconnected: string[] = [];
    host.onPeerDisconnect((peerId) => disconnected.push(peerId));

    player = createBroadcastChannelTransport();
    await player.joinRoom(info.roomId);
    await delay(100);

    player.close();

    await delay(50);
    expect(disconnected.length).toBeGreaterThanOrEqual(1);
  });

  it("close() cleans up resources", async () => {
    host = createBroadcastChannelTransport();
    await host.createRoom();
    host.close();

    // Sending after close should not throw
    expect(() =>
      host.broadcast({ type: "state-update", state: {} as never }),
    ).not.toThrow();
  });
});

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
