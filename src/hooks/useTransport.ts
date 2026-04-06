import { useEffect, useRef, useCallback, useState } from "react";
import type { Transport, Message, PlayerAction } from "@/transport/interface";
import type { GameState } from "@/types/game";
import { createTransport } from "@/transport/factory";
import { useGameStore } from "@/store/gameStore";
import { filterStateForPlayer } from "@/store/stateFilter";

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

    const state = useGameStore.getState();

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
      if (message.type !== "player-action") return;

      const { action } = message;

      if (action.kind === "join") {
        // Map peer to player name
        peersRef.current.set(peerId, action.name);

        // Check for reconnection
        const state = useGameStore.getState();
        const existing = state.players.find((p) => p.name === action.name);
        if (existing) {
          // Reconnection: mark online
          const players = state.players.map((p) =>
            p.name === action.name ? { ...p, online: true } : p,
          );
          useGameStore.getState().setState({ players });
        }
        // New player joining will be handled by lobby actions (Phase 5)
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

    transport.onMessage((_peerId, message: Message) => {
      if (message.type !== "state-update") return;
      // Update local store with filtered state from host
      useGameStore.getState().setState(message.state);
    });

    transport.onPeerConnect(() => {
      setConnected(true);
    });

    transport.onPeerDisconnect(() => {
      setConnected(false);
    });

    transport
      .joinRoom(roomId)
      .then(() => {
        setConnected(true);
        // Send join action
        transport.broadcast({
          type: "player-action",
          action: { kind: "join", name: playerName, emoji: "" },
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      transport.close();
      transportRef.current = null;
    };
  }, [roomId, playerName]);

  return { role: "player", connected, error, sendAction };
}
