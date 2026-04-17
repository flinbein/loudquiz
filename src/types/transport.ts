import type { GameState, TeamId } from "./game";

// Transport interface

export interface RoomInfo {
  roomId: string;
  joinUrl: string;
}

export interface Transport {
  createRoom(): Promise<RoomInfo>;
  joinRoom(roomId: string): Promise<void>;
  send(peerId: string, message: Message): void;
  broadcast(message: Message): void;
  onMessage(handler: (peerId: string, message: Message) => void): void;
  onPeerConnect(handler: (peerId: string) => void): void;
  onPeerDisconnect(handler: (peerId: string) => void): void;
  close(): void;
}

// Messages: Host → Player

export interface StateUpdateMessage {
  type: "state-update";
  state: GameState;
}

// Messages: Player → Host

export interface PlayerActionMessage {
  type: "player-action";
  action: PlayerAction;
}

// Messages: clock-sync handshake (out-of-band, bypasses game store)

export interface SyncRequestMessage {
  type: "sync-request";
  nonce: number;
}

export interface SyncResponseMessage {
  type: "sync-response";
  nonce: number;
  hostNow: number;
}

export type PlayerAction =
  | { kind: "join"; name: string }
  | { kind: "set-team"; team: TeamId }
  | { kind: "set-ready"; ready: boolean }
  | { kind: "change-emoji" }
  | { kind: "start-game" }
  | { kind: "claim-captain" }
  | { kind: "select-question"; questionIndex: number }
  | { kind: "activate-joker" }
  | { kind: "submit-answer"; text: string }
  | { kind: "claim-blitz-captain" }
  | { kind: "claim-blitz-slot"; slot: number }
  | { kind: "select-blitz-item"; itemIndex: number }
  | { kind: "submit-blitz-answer"; text: string }
  | { kind: "skip-blitz-answer" }
  | { kind: "suggest-topic"; text: string }
  | { kind: "dispute-review" }
  | { kind: "next-round" }
  | { kind: "no-ideas" }
  | { kind: "start-first-round" }
  | { kind: "play-again" };

export type Message =
  | StateUpdateMessage
  | PlayerActionMessage
  | SyncRequestMessage
  | SyncResponseMessage;
