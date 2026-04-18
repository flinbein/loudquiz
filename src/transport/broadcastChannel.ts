/**
 * BroadcastChannel transport — uses BroadcastChannel API for peer discovery
 * and WebRTC signaling (SDP/ICE exchange). Actual data transfer goes through
 * RTCDataChannel (text + binary).
 */
import type { Transport, RoomInfo, Message } from "./interface";
import {
  createWebRTCPeerManager,
  type SignalMessage,
  type WebRTCPeerManager,
} from "./webrtcPeer";
import { generateRoomId } from "@/utils/roomId";

/** Signaling messages sent over BroadcastChannel */
interface BcSignal {
  kind: "announce" | "signal" | "leave";
  senderId: string;
  targetId?: string;
  signal?: SignalMessage;
}

function generatePeerId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createBroadcastChannelTransport(): Transport {
  const peerId = generatePeerId();
  const tag = `[bc-transport:${peerId.slice(0, 4)}]`;
  let channel: BroadcastChannel | null = null;
  let rtc: WebRTCPeerManager | null = null;

  /** Set of peer IDs we've seen announce (used for discovery) */
  const knownPeers = new Set<string>();

  let messageHandler: ((peerId: string, message: Message) => void) | null =
    null;
  let connectHandler: ((peerId: string) => void) | null = null;
  let disconnectHandler: ((peerId: string) => void) | null = null;

  function bcSend(msg: BcSignal) {
    channel?.postMessage(msg);
  }

  function handleBcMessage(event: MessageEvent<BcSignal>) {
    const data = event.data;
    if (!data || data.senderId === peerId) return;
    if (data.targetId && data.targetId !== peerId) return;

    switch (data.kind) {
      case "announce": {
        if (!knownPeers.has(data.senderId)) {
          knownPeers.add(data.senderId);
          console.log(`${tag} discovered peer: ${data.senderId}`);
          if (!data.targetId) {
            // Broadcast announce — reply so the new peer discovers us,
            // and initiate WebRTC (we are the existing peer / caller)
            bcSend({
              kind: "announce",
              senderId: peerId,
              targetId: data.senderId,
            });
            rtc?.connectTo(data.senderId);
          }
          // Targeted announce (reply) — don't initiate; the other side already did
        }
        break;
      }
      case "signal": {
        if (data.signal) {
          // Also track as known peer
          knownPeers.add(data.senderId);
          rtc?.handleSignal(data.signal);
        }
        break;
      }
      case "leave": {
        console.log(`${tag} peer leaving: ${data.senderId}`);
        knownPeers.delete(data.senderId);
        rtc?.closePeer(data.senderId);
        break;
      }
    }
  }

  function initChannel(roomId: string) {
    channel = new BroadcastChannel(`loud-quiz:${roomId}`);
    channel.addEventListener("message", handleBcMessage);
    console.log(`${tag} signaling channel opened: loud-quiz:${roomId}`);
  }

  function initRTC() {
    rtc = createWebRTCPeerManager({
      localId: peerId,
      onMessage(remotePeerId, data) {
        if (typeof data === "string") {
          try {
            const msg = JSON.parse(data) as Message;
            console.log(
              `${tag} msg from ${remotePeerId}: ${msg.type}`,
            );
            messageHandler?.(remotePeerId, msg);
          } catch (e) {
            console.warn(`${tag} bad message from ${remotePeerId}:`, e);
          }
        }
        // Binary messages can be handled here in the future
      },
      onPeerReady(remotePeerId) {
        console.log(`${tag} peer connected (WebRTC ready): ${remotePeerId}`);
        connectHandler?.(remotePeerId);
      },
      onPeerClosed(remotePeerId) {
        console.log(`${tag} peer disconnected: ${remotePeerId}`);
        disconnectHandler?.(remotePeerId);
      },
      sendSignal(signal) {
        bcSend({
          kind: "signal",
          senderId: peerId,
          targetId: signal.targetId,
          signal,
        });
      },
    });
  }

  return {
    async createRoom(): Promise<RoomInfo> {
      const roomId = generateRoomId();
      initRTC();
      initChannel(roomId);
      const joinUrl = `${window.location.origin}${import.meta.env.BASE_URL}play?room=${roomId}`;
      console.log(`${tag} room created: ${roomId}`);
      return { roomId, joinUrl };
    },

    async joinRoom(roomId: string): Promise<void> {
      initRTC();
      initChannel(roomId);
      // Announce presence so host discovers us
      bcSend({ kind: "announce", senderId: peerId });
      console.log(`${tag} joining room: ${roomId}`);
    },

    send(targetId: string, message: Message): void {
      rtc?.sendText(targetId, JSON.stringify(message));
    },

    broadcast(message: Message): void {
      rtc?.broadcastText(JSON.stringify(message));
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
      console.log(`${tag} closing`);
      if (channel) {
        bcSend({ kind: "leave", senderId: peerId });
        channel.removeEventListener("message", handleBcMessage);
        channel.close();
        channel = null;
      }
      rtc?.closeAll();
      rtc = null;
      knownPeers.clear();
    },
  };
}
