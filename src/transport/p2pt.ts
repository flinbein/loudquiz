import P2PT, { type Peer } from "p2pt";
import type { Transport, RoomInfo, Message } from "./interface";
import { generateRoomId } from "@/utils/roomId";

const DEFAULT_TRACKERS = [
  "wss://tracker.openwebtorrent.com",
  // "wss://tracker.webtorrent.dev",
  // "wss://tracker.btorrent.xyz",
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

  function dumpPeerState(label: string) {
    const ourPeers = [...peers.keys()].map((id) => id.slice(0, 6));
    const p2ptPeers = p2pt
      ? Object.entries(
          (p2pt as unknown as { peers: Record<string, Record<string, unknown>> }).peers,
        ).map(([id, channels]) => `${id.slice(0, 6)}(ch:${Object.keys(channels).length})`)
      : [];
    console.log(
      `[p2pt-debug] ${tag()} ${label} | our peers: [${ourPeers}] | p2pt peers: [${p2ptPeers}] | hostPeerId: ${hostPeerId?.slice(0, 6) ?? "none"}`,
    );
  }

  function markAsHost(peerId: string) {
    if (hostPeerId === peerId) return;
    hostPeerId = peerId;
    const timer = pendingPeerTimers.get(peerId);
    if (timer) {
      clearTimeout(timer);
      pendingPeerTimers.delete(peerId);
    }
    console.log(
      `[p2pt-debug] ${tag()} identified host: ${peerId.slice(0, 6)}`,
    );
  }

  function setupListeners() {
    if (!p2pt) return;

    // Log raw p2pt 'peer' event (fires before peerconnect, for every new simple-peer instance)
    (p2pt as unknown as { on(e: string, fn: (peer: Peer) => void): void }).on(
      "peer",
      (peer: Peer) => {
        const sp = peer as unknown as { channelName?: string; connected?: boolean };
        console.log(
          `[p2pt-debug] ${tag()} RAW peer event: id=${peer.id.slice(0, 6)} channel=${sp.channelName ?? "?"} connected=${sp.connected ?? "?"}`,
        );
      },
    );

    p2pt.on("peerconnect", (peer: Peer) => {
      const sp = peer as unknown as { channelName?: string };
      console.log(
        `[p2pt-debug] ${tag()} peerconnect: id=${peer.id.slice(0, 6)} channel=${sp.channelName ?? "?"} alreadyKnown=${peers.has(peer.id)} hostPeerId=${hostPeerId?.slice(0, 6) ?? "none"}`,
      );
      if (destroyed || peers.has(peer.id)) return;

      if (role === "player" && hostPeerId && peer.id !== hostPeerId) {
        console.log(
          `[p2pt-debug] ${tag()} skipping non-host peer: ${peer.id.slice(0, 6)}`,
        );
        return;
      }

      peers.set(peer.id, peer);

      if (role === "player" && !hostPeerId) {
        // Give this peer 5s to prove it's the host (by sending
        // state-update or sync-response)
        const timer = setTimeout(() => {
          pendingPeerTimers.delete(peer.id);
          if (peer.id !== hostPeerId) {
            console.log(
              `[p2pt-debug] ${tag()} pruning non-host peer: ${peer.id.slice(0, 6)}`,
            );
            peers.delete(peer.id);
            dumpPeerState("after prune");
          }
        }, 5000);
        pendingPeerTimers.set(peer.id, timer);
      }

      dumpPeerState("after peerconnect");
      connectHandler?.(peer.id);
    });

    p2pt.on("peerclose", (peer: Peer) => {
      const sp = peer as unknown as { channelName?: string };
      const isHost = peer.id === hostPeerId;
      console.log(
        `[p2pt-debug] ${tag()} peerclose: id=${peer.id.slice(0, 6)} channel=${sp.channelName ?? "?"} inOurMap=${peers.has(peer.id)} isHost=${isHost}`,
      );
      if (destroyed || !peers.has(peer.id)) return;
      peers.delete(peer.id);
      const timer = pendingPeerTimers.get(peer.id);
      if (timer) {
        clearTimeout(timer);
        pendingPeerTimers.delete(peer.id);
      }
      dumpPeerState("after peerclose");

      if (role === "player" && !isHost) {
        console.log(
          `[p2pt-debug] ${tag()} ignoring non-host disconnect: ${peer.id.slice(0, 6)}`,
        );
        return;
      }

      disconnectHandler?.(peer.id);
    });

    p2pt.on("msg", (peer: Peer, msg: unknown) => {
      if (destroyed) return;
      const text = typeof msg === "string" ? msg : String(msg);
      try {
        const message = JSON.parse(text) as Message;

        // Player-side: state-update or sync-response identifies the host
        if (
          role === "player" &&
          !hostPeerId &&
          (message.type === "state-update" || message.type === "sync-response")
        ) {
          markAsHost(peer.id);
        }

        if (
          message.type !== "state-update" &&
          message.type !== "sync-request" &&
          message.type !== "sync-response"
        ) {
          console.log(`[p2pt-debug] ${tag()} msg from ${peer.id.slice(0, 6)}: ${message.type}`);
        }
        messageHandler?.(peer.id, message);
      } catch (e) {
        console.warn(`[p2pt-debug] ${tag()} bad message from ${peer.id.slice(0, 6)}:`, e);
      }
    });

    p2pt.on("trackerconnect", (tracker) => {
      console.log(
        `[p2pt-debug] ${tag()} tracker connected: ${tracker.announceUrl ?? "unknown"}`,
      );
    });

    p2pt.on("trackerwarning", (err: unknown) => {
      console.warn(`[p2pt-debug] ${tag()} tracker warning:`, err);
    });
  }

  // Periodically re-announce to discover peers that joined/refreshed after us
  let reannounceTimer: ReturnType<typeof setInterval> | null = null;
  let startTimer: ReturnType<typeof setTimeout> | null = null;
  
  function initP2PT(roomId: string) {
    const trackers = getTrackers();
    const identifier = `loud-quiz:${roomId}`;
    p2pt = new P2PT(trackers, identifier);
    console.log(`[p2pt-debug] ${tag()} created with identifier: ${identifier}, trackers: ${trackers.length}`);
    setupListeners();

    // Defer start() so React strict mode cleanup can fire before any network
    // activity. Without this, the first (ghost) p2pt instance connects to
    // trackers, registers a stale peer ID, and pollutes peer discovery.
    
    startTimer = setTimeout(() => {
      startTimer = null;
      if (destroyed || !p2pt) return;
      p2pt.start().then(
        () => console.log(`[p2pt-debug] ${tag()} started`),
        () => console.log(`[p2pt-debug] ${tag()} failed to start`),
      ).then(() => {
        return p2pt?.requestMorePeers()
      }).then(
        () => console.log(`[p2pt-debug] ${tag()} requestMorePeers done`),
        () => console.log(`[p2pt-debug] ${tag()} requestMorePeers failed`),
      );
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
      console.log(`[p2pt-debug] ${tag()} room created: ${roomId}`);
      return { roomId, joinUrl };
    },

    async joinRoom(roomId: string): Promise<void> {
      initP2PT(roomId);
      console.log(`[p2pt-debug] ${tag()} joining room: ${roomId}`);
    },

    send(targetId: string, message: Message): void {
      const peer = peers.get(targetId);
      if (peer && p2pt) {
        p2pt.send(peer, JSON.stringify(message)).catch((err: unknown) => {
          console.warn(`[p2pt-debug] ${tag()} send failed to ${targetId.slice(0, 6)}:`, err);
        });
      }
    },

    broadcast(message: Message): void {
      if (!p2pt) return;
      const text = JSON.stringify(message);
      for (const peer of peers.values()) {
        p2pt.send(peer, text).catch((err: unknown) => {
          console.warn(`[p2pt-debug] ${tag()} broadcast send failed to ${peer.id.slice(0, 6)}:`, err);
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
      console.log(`[p2pt-debug] ${tag()} closing`);
      cleanup();
    },
  };
}
