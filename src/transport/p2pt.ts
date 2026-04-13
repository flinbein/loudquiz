import P2PT, { type Peer } from "p2pt";
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

export type P2PTRole = "host" | "player";

export function createP2PTTransport(role: P2PTRole): Transport {
  let p2pt: P2PT | null = null;
  let destroyed = false;
  const peers = new Map<string, Peer>();

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

    p2pt.on("peerconnect", (peer: Peer) => {
      if (destroyed || peers.has(peer.id)) return;
      peers.set(peer.id, peer);
      console.log(`${tag()} peer connected: ${peer.id}`);

      if (role === "player") {
        // Give this peer 5s to prove it's the host (by sending state-update)
        const timer = setTimeout(() => {
          pendingPeerTimers.delete(peer.id);
          if (peer.id !== hostPeerId) {
            console.log(`${tag()} pruning non-host peer: ${peer.id}`);
            peers.delete(peer.id);
            // p2pt peers are simple-peer instances with destroy() at runtime
            (peer as unknown as { destroy(): void }).destroy();
          }
        }, 5000);
        pendingPeerTimers.set(peer.id, timer);
      }

      connectHandler?.(peer.id);
    });

    p2pt.on("peerclose", (peer: Peer) => {
      if (destroyed || !peers.has(peer.id)) return;
      peers.delete(peer.id);
      const timer = pendingPeerTimers.get(peer.id);
      if (timer) {
        clearTimeout(timer);
        pendingPeerTimers.delete(peer.id);
      }
      console.log(`${tag()} peer disconnected: ${peer.id}`);
      disconnectHandler?.(peer.id);
    });

    p2pt.on("msg", (peer: Peer, msg: unknown) => {
      if (destroyed) return;
      const text = typeof msg === "string" ? msg : String(msg);
      try {
        const message = JSON.parse(text) as Message;

        // Player-side: first state-update identifies the host
        if (role === "player" && message.type === "state-update" && !hostPeerId) {
          hostPeerId = peer.id;
          const timer = pendingPeerTimers.get(peer.id);
          if (timer) {
            clearTimeout(timer);
            pendingPeerTimers.delete(peer.id);
          }
          console.log(`${tag()} identified host: ${peer.id}`);
        }

        console.log(`${tag()} msg from ${peer.id}: ${message.type}`);
        messageHandler?.(peer.id, message);
      } catch (e) {
        console.warn(`${tag()} bad message from ${peer.id}:`, e);
      }
    });

    p2pt.on("trackerconnect", (tracker) => {
      console.log(`${tag()} tracker connected: ${tracker.announceUrl ?? "unknown"}`);
    });

    p2pt.on("trackerwarning", (err: unknown) => {
      console.warn(`${tag()} tracker warning:`, err);
    });
  }

  // Periodically re-announce to discover peers that joined/refreshed after us
  let reannounceTimer: ReturnType<typeof setInterval> | null = null;
  let startTimer: ReturnType<typeof setTimeout> | null = null;
  const REANNOUNCE_INTERVAL = 10_000; // 10s

  function initP2PT(roomId: string) {
    const trackers = getTrackers();
    const identifier = `loud-quiz:${roomId}`;
    p2pt = new P2PT(trackers, identifier);
    console.log(`${tag()} created with identifier: ${identifier}`);
    setupListeners();

    // Defer start() so React strict mode cleanup can fire before any network
    // activity. Without this, the first (ghost) p2pt instance connects to
    // trackers, registers a stale peer ID, and pollutes peer discovery.
    startTimer = setTimeout(() => {
      startTimer = null;
      if (destroyed || !p2pt) return;
      p2pt.start();

      reannounceTimer = setInterval(() => {
        if (p2pt) {
          p2pt.requestMorePeers();
        }
      }, REANNOUNCE_INTERVAL);
    }, 0);
  }

  function cleanup() {
    destroyed = true;
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
    if (reannounceTimer) {
      clearInterval(reannounceTimer);
      reannounceTimer = null;
    }
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
        p2pt.send(peer, JSON.stringify(message)).catch((err: unknown) => {
          console.warn(`${tag()} send failed to ${targetId}:`, err);
        });
      }
    },

    broadcast(message: Message): void {
      if (!p2pt) return;
      const text = JSON.stringify(message);
      for (const peer of peers.values()) {
        p2pt.send(peer, text).catch((err: unknown) => {
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
