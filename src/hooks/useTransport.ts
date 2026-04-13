import { useEffect, useRef, useCallback, useState } from "react";
import type {
  Transport,
  Message,
  PlayerAction,
  SyncResponseMessage,
} from "@/transport/interface";
import { createTransport } from "@/transport/factory";
import { useGameStore } from "@/store/gameStore";
import { filterStateForPlayer } from "@/store/stateFilter";
import {
  saveGameState,
  loadGameState,
  loadRoomId,
  saveRoomId,
} from "@/persistence/sessionPersistence";
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
  /**
   * Re-run the clock-sync handshake and return the new offset. Used by the
   * Calibration popup's "re-sync" button. Rejects if the handshake fails or
   * the transport is not yet ready.
   */
  resyncClock: () => Promise<number>;
  /** Retry connection after error */
  retry: () => void;
  /** Cancel and return to entry screen */
  cancel: () => void;
  /** Whether a reconnection attempt is in progress */
  reconnecting: boolean;
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
