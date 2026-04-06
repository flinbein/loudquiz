import type { Transport, RoomInfo, Message } from "./interface";

const HEARTBEAT_INTERVAL = 2000;
const HEARTBEAT_TIMEOUT = 5000;

interface InternalMessage {
  type: "msg" | "heartbeat" | "connect" | "disconnect";
  senderId: string;
  targetId?: string;
  payload?: Message;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createBroadcastChannelTransport(): Transport {
  const peerId = generateId();
  let channel: BroadcastChannel | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const connectedPeers = new Set<string>();
  const peerLastSeen = new Map<string, number>();

  let messageHandler: ((peerId: string, message: Message) => void) | null =
    null;
  let connectHandler: ((peerId: string) => void) | null = null;
  let disconnectHandler: ((peerId: string) => void) | null = null;

  function send(raw: InternalMessage) {
    channel?.postMessage(raw);
  }

  function handleIncoming(event: MessageEvent<InternalMessage>) {
    const data = event.data;
    if (!data || data.senderId === peerId) return;

    if (data.targetId && data.targetId !== peerId) return;

    switch (data.type) {
      case "connect": {
        const isNew = !connectedPeers.has(data.senderId);
        connectedPeers.add(data.senderId);
        peerLastSeen.set(data.senderId, Date.now());
        if (isNew) {
          connectHandler?.(data.senderId);
          // Reply so the new peer knows about us (only for new peers to avoid loop)
          send({ type: "connect", senderId: peerId, targetId: data.senderId });
        }
        break;
      }
      case "disconnect": {
        if (connectedPeers.has(data.senderId)) {
          connectedPeers.delete(data.senderId);
          peerLastSeen.delete(data.senderId);
          disconnectHandler?.(data.senderId);
        }
        break;
      }
      case "heartbeat": {
        peerLastSeen.set(data.senderId, Date.now());
        if (!connectedPeers.has(data.senderId)) {
          connectedPeers.add(data.senderId);
          connectHandler?.(data.senderId);
        }
        break;
      }
      case "msg": {
        if (data.payload) {
          peerLastSeen.set(data.senderId, Date.now());
          messageHandler?.(data.senderId, data.payload);
        }
        break;
      }
    }
  }

  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      send({ type: "heartbeat", senderId: peerId });

      // Check for timed-out peers
      const now = Date.now();
      for (const [id, lastSeen] of peerLastSeen) {
        if (now - lastSeen > HEARTBEAT_TIMEOUT) {
          connectedPeers.delete(id);
          peerLastSeen.delete(id);
          disconnectHandler?.(id);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  function initChannel(roomId: string) {
    channel = new BroadcastChannel(`loudquiz-${roomId}`);
    channel.addEventListener("message", handleIncoming);
    startHeartbeat();
  }

  return {
    async createRoom(): Promise<RoomInfo> {
      const roomId = `b-${generateId()}`;
      initChannel(roomId);
      const joinUrl = `${window.location.origin}${window.location.pathname}#/play?room=${roomId}`;
      return { roomId, joinUrl };
    },

    async joinRoom(roomId: string): Promise<void> {
      initChannel(roomId);
      // Announce presence
      send({ type: "connect", senderId: peerId });
    },

    send(targetId: string, message: Message): void {
      send({
        type: "msg",
        senderId: peerId,
        targetId,
        payload: message,
      });
    },

    broadcast(message: Message): void {
      send({
        type: "msg",
        senderId: peerId,
        payload: message,
      });
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
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (channel) {
        send({ type: "disconnect", senderId: peerId });
        channel.removeEventListener("message", handleIncoming);
        channel.close();
        channel = null;
      }
      connectedPeers.clear();
      peerLastSeen.clear();
    },
  };
}
