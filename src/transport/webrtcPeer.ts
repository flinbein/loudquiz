/**
 * Shared WebRTC peer connection management.
 * Used by BroadcastChannel and (future) p2pt transports for actual data transfer.
 * Signaling (SDP/ICE exchange) is handled externally by each transport.
 */

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export interface SignalMessage {
  type: "offer" | "answer" | "ice-candidate";
  senderId: string;
  targetId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PeerConnection {
  peerId: string;
  pc: RTCPeerConnection;
  textChannel: RTCDataChannel | null;
  binaryChannel: RTCDataChannel | null;
  ready: boolean;
}

export interface WebRTCPeerManagerOptions {
  localId: string;
  onMessage: (peerId: string, data: string | ArrayBuffer) => void;
  onPeerReady: (peerId: string) => void;
  onPeerClosed: (peerId: string) => void;
  sendSignal: (signal: SignalMessage) => void;
}

export interface WebRTCPeerManager {
  /** Initiate connection to a remote peer (caller side — creates offer) */
  connectTo(remotePeerId: string): void;
  /** Handle an incoming signal message (offer/answer/ice-candidate) */
  handleSignal(signal: SignalMessage): void;
  /** Send text message to a specific peer */
  sendText(peerId: string, data: string): void;
  /** Send binary message to a specific peer */
  sendBinary(peerId: string, data: ArrayBuffer): void;
  /** Send text message to all connected peers */
  broadcastText(data: string): void;
  /** Send binary message to all connected peers */
  broadcastBinary(data: ArrayBuffer): void;
  /** Check if a peer is connected and ready */
  isReady(peerId: string): boolean;
  /** Get all connected peer IDs */
  connectedPeers(): string[];
  /** Close a specific peer connection */
  closePeer(peerId: string): void;
  /** Close all peer connections */
  closeAll(): void;
}

export function createWebRTCPeerManager(
  opts: WebRTCPeerManagerOptions,
): WebRTCPeerManager {
  const { localId, onMessage, onPeerReady, onPeerClosed, sendSignal } = opts;
  const tag = `[webrtc:${localId.slice(0, 4)}]`;
  const peers = new Map<string, PeerConnection>();

  function createPeerConnection(remotePeerId: string): PeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const peer: PeerConnection = {
      peerId: remotePeerId,
      pc,
      textChannel: null,
      binaryChannel: null,
      ready: false,
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          senderId: localId,
          targetId: remotePeerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`${tag} connection to ${remotePeerId}: ${state}`);
      if (state === "disconnected" || state === "failed" || state === "closed") {
        handlePeerClosed(remotePeerId);
      }
    };

    pc.ondatachannel = (event) => {
      const ch = event.channel;
      console.log(`${tag} received data channel: ${ch.label} from ${remotePeerId}`);
      setupDataChannel(peer, ch);
    };

    peers.set(remotePeerId, peer);
    return peer;
  }

  function setupDataChannel(peer: PeerConnection, ch: RTCDataChannel) {
    const isText = ch.label === "text";

    ch.onopen = () => {
      console.log(`${tag} channel ${ch.label} open with ${peer.peerId}`);
      if (isText) {
        peer.textChannel = ch;
      } else {
        peer.binaryChannel = ch;
        ch.binaryType = "arraybuffer";
      }
      checkReady(peer);
    };

    ch.onclose = () => {
      console.log(`${tag} channel ${ch.label} closed with ${peer.peerId}`);
      if (isText) peer.textChannel = null;
      else peer.binaryChannel = null;
      if (!peer.textChannel && !peer.binaryChannel) {
        handlePeerClosed(peer.peerId);
      }
    };

    ch.onmessage = (event) => {
      onMessage(peer.peerId, event.data);
    };

    // If already open (can happen), set immediately
    if (ch.readyState === "open") {
      if (isText) {
        peer.textChannel = ch;
      } else {
        peer.binaryChannel = ch;
        ch.binaryType = "arraybuffer";
      }
      checkReady(peer);
    }
  }

  function checkReady(peer: PeerConnection) {
    if (peer.textChannel && peer.binaryChannel && !peer.ready) {
      peer.ready = true;
      console.log(`${tag} peer ready: ${peer.peerId}`);
      onPeerReady(peer.peerId);
    }
  }

  function handlePeerClosed(peerId: string) {
    const peer = peers.get(peerId);
    if (!peer) return;
    // Remove from map first to prevent re-entry from close() callbacks
    peers.delete(peerId);
    const wasReady = peer.ready;
    peer.ready = false;
    peer.textChannel?.close();
    peer.binaryChannel?.close();
    peer.pc.close();
    if (wasReady) {
      onPeerClosed(peerId);
    }
  }

  async function createOffer(peer: PeerConnection) {
    const textCh = peer.pc.createDataChannel("text");
    const binaryCh = peer.pc.createDataChannel("binary");
    binaryCh.binaryType = "arraybuffer";
    setupDataChannel(peer, textCh);
    setupDataChannel(peer, binaryCh);

    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    sendSignal({
      type: "offer",
      senderId: localId,
      targetId: peer.peerId,
      sdp: { type: peer.pc.localDescription!.type, sdp: peer.pc.localDescription!.sdp },
    });
    console.log(`${tag} sent offer to ${peer.peerId}`);
  }

  async function handleOffer(signal: SignalMessage) {
    let peer = peers.get(signal.senderId);
    if (!peer) {
      peer = createPeerConnection(signal.senderId);
    }
    await peer.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp!));
    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);
    sendSignal({
      type: "answer",
      senderId: localId,
      targetId: signal.senderId,
      sdp: { type: peer.pc.localDescription!.type, sdp: peer.pc.localDescription!.sdp },
    });
    console.log(`${tag} sent answer to ${signal.senderId}`);
  }

  async function handleAnswer(signal: SignalMessage) {
    const peer = peers.get(signal.senderId);
    if (!peer) {
      console.warn(`${tag} got answer from unknown peer: ${signal.senderId}`);
      return;
    }
    await peer.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp!));
    console.log(`${tag} answer applied from ${signal.senderId}`);
  }

  async function handleIceCandidate(signal: SignalMessage) {
    const peer = peers.get(signal.senderId);
    if (!peer) {
      console.warn(`${tag} got ICE from unknown peer: ${signal.senderId}`);
      return;
    }
    await peer.pc.addIceCandidate(new RTCIceCandidate(signal.candidate!));
  }

  return {
    connectTo(remotePeerId: string) {
      if (peers.has(remotePeerId)) return;
      const peer = createPeerConnection(remotePeerId);
      createOffer(peer);
    },

    handleSignal(signal: SignalMessage) {
      if (signal.targetId !== localId) return;
      switch (signal.type) {
        case "offer":
          handleOffer(signal);
          break;
        case "answer":
          handleAnswer(signal);
          break;
        case "ice-candidate":
          handleIceCandidate(signal);
          break;
      }
    },

    sendText(peerId: string, data: string) {
      const peer = peers.get(peerId);
      if (peer?.textChannel?.readyState === "open") {
        peer.textChannel.send(data);
      }
    },

    sendBinary(peerId: string, data: ArrayBuffer) {
      const peer = peers.get(peerId);
      if (peer?.binaryChannel?.readyState === "open") {
        peer.binaryChannel.send(data);
      }
    },

    broadcastText(data: string) {
      for (const peer of peers.values()) {
        if (peer.textChannel?.readyState === "open") {
          peer.textChannel.send(data);
        }
      }
    },

    broadcastBinary(data: ArrayBuffer) {
      for (const peer of peers.values()) {
        if (peer.binaryChannel?.readyState === "open") {
          peer.binaryChannel.send(data);
        }
      }
    },

    isReady(peerId: string) {
      return peers.get(peerId)?.ready ?? false;
    },

    connectedPeers() {
      return [...peers.values()]
        .filter((p) => p.ready)
        .map((p) => p.peerId);
    },

    closePeer(peerId: string) {
      handlePeerClosed(peerId);
    },

    closeAll() {
      for (const peerId of [...peers.keys()]) {
        handlePeerClosed(peerId);
      }
    },
  };
}
