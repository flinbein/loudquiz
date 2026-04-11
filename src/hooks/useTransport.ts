import { useEffect, useRef, useCallback, useState } from "react";
import type {
  Transport,
  Message,
  PlayerAction,
  SyncResponseMessage,
} from "@/transport/interface";
import type { GameState } from "@/types/game";
import { createTransport } from "@/transport/factory";
import { useGameStore } from "@/store/gameStore";
import { filterStateForPlayer } from "@/store/stateFilter";
import { useClockSyncStore } from "@/store/clockSyncStore";
import { runSyncHandshake } from "@/transport/clockSync";

interface UseTransportHostOptions {
  role: "host";
  roomId?: undefined;
}

interface UseTransportPlayerOptions {
  role: "player";
  roomId: string;
  playerName: string;
}

type UseTransportOptions = UseTransportHostOptions | UseTransportPlayerOptions;

interface UseTransportHostResult {
  role: "host";
  roomId: string | null;
  joinUrl: string | null;
  connected: boolean;
  error: string | null;
}

interface UseTransportPlayerResult {
  role: "player";
  connected: boolean;
  error: string | null;
  sendAction: (action: PlayerAction) => void;
}

export type UseTransportResult =
  | UseTransportHostResult
  | UseTransportPlayerResult;

/**
 * Host mode: creates a room, listens for player actions, broadcasts filtered state.
 * Player mode: joins a room, sends actions, receives state updates.
 */
export function useTransport(
  options: UseTransportOptions,
): UseTransportResult {
  if (options.role === "host") {
    return useHostTransport();
  }
  return usePlayerTransport(options.roomId, options.playerName);
}

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

  // Subscribe to store changes and broadcast
  useEffect(() => {
    return useGameStore.subscribe(() => {
      broadcastState();
    });
  }, [broadcastState]);

  // Create room and set up listeners
  useEffect(() => {
    const transport = createTransport("b-init");
    transportRef.current = transport;

    transport.onPeerConnect((peerId) => {
      // Player will identify themselves via join action
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
      // Clock-sync handshake: respond synchronously with our current
      // performance.now(). Capture BEFORE any other work to minimize the
      // server-side contribution to the round-trip time the player measures.
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
        // Map peer to player name
        peersRef.current.set(peerId, action.name);
      }

      // Emit action for game logic to handle
      hostActionHandler?.(peerId, action);
    });

    transport
      .createRoom()
      .then((info) => {
        setRoomId(info.roomId);
        setJoinUrl(info.joinUrl);
        setConnected(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      transport.close();
      transportRef.current = null;
    };
  }, [broadcastState]);

  return { role: "host", roomId, joinUrl, connected, error };
}

// External handler for host to process player actions
let hostActionHandler:
  | ((peerId: string, action: PlayerAction) => void)
  | null = null;

export function onHostAction(
  handler: (peerId: string, action: PlayerAction) => void,
): () => void {
  hostActionHandler = handler;
  return () => {
    if (hostActionHandler === handler) {
      hostActionHandler = null;
    }
  };
}

function usePlayerTransport(
  roomId: string,
  playerName: string,
): UseTransportPlayerResult {
  const transportRef = useRef<Transport | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendAction = useCallback((action: PlayerAction) => {
    const transport = transportRef.current;
    if (!transport) return;
    transport.broadcast({ type: "player-action", action });
  }, []);

  useEffect(() => {
    const transport = createTransport(roomId);
    transportRef.current = transport;

    // Pending sync-response waiters, keyed by nonce. runSyncHandshake owns the
    // register/unregister lifecycle; we only route messages into this map.
    const pendingSync = new Map<number, (msg: SyncResponseMessage) => void>();
    const registerSync = (nonce: number, cb: (msg: SyncResponseMessage) => void) => {
      pendingSync.set(nonce, cb);
    };
    const unregisterSync = (nonce: number) => {
      pendingSync.delete(nonce);
    };

    transport.onMessage((_peerId, message: Message) => {
      if (message.type === "sync-response") {
        const cb = pendingSync.get(message.nonce);
        cb?.(message);
        return;
      }
      if (message.type !== "state-update") return;
      // Update local store with filtered state from host
      useGameStore.getState().setState(message.state);
    });

    transport.onPeerConnect(async () => {
      // Keep `connected` false until the clock-sync handshake lands.
      // The existing "Connecting…" screen naturally covers this window, so no
      // Timer component ever mounts with an unsynced offset.
      try {
        const offset = await runSyncHandshake(transport, registerSync, unregisterSync);
        useClockSyncStore.getState().setOffset(offset);
        transport.broadcast({
          type: "player-action",
          action: { kind: "join", name: playerName },
        });
        setConnected(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

    transport.onPeerDisconnect(() => {
      setConnected(false);
      // Drop any in-flight sync waiters so they don't leak into the next
      // connect cycle. The handshake will re-run on reconnect.
      pendingSync.clear();
      useClockSyncStore.getState().reset();
    });

    transport.joinRoom(roomId).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });

    return () => {
      transport.close();
      transportRef.current = null;
      pendingSync.clear();
      useClockSyncStore.getState().reset();
    };
  }, [roomId, playerName]);

  return { role: "player", connected, error, sendAction };
}
