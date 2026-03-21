import type { PublicGameState, CaptainPrivateInfo, BlitzItem } from "./types";

export type PlayerToHostMsg =
  | { type: "join"; name: string; role: "player" | "spectator" }
  | { type: "setTeam"; teamId: string | null }
  | { type: "startGame" }
  | { type: "ready" }
  | { type: "suggest"; text: string }
  | { type: "noIdeas" }
  | { type: "ping"; t1: number }
  | { type: "becomeCapitain" }
  | { type: "pickQuestion"; topicIdx: number; questionIdx: number }
  | { type: "activateJoker" }
  | { type: "submitAnswer"; answer: string }
  | { type: "nextRound" }
  | { type: "restart" }
  | { type: "blitzBecomeCapitain" }
  | { type: "blitzSetOrder"; position: number }
  | { type: "blitzPickTask"; itemIdx: number }
  | { type: "blitzSubmitAnswer"; answer: string }
  | { type: "surrender" }
  | { type: "proceed" };

export interface BlitzTaskPublic {
  id: string;
  items: Array<{ text: string; difficulty: number }>;
  used: boolean;
}

export type HostMsg =
  | { type: "syncState"; state: PublicGameState }
  | { type: "captainInfo"; info: CaptainPrivateInfo }
  | { type: "blitzCaptainInfo"; item: BlitzItem }
  | { type: "blitzTaskList"; tasks: BlitzTaskPublic[] }
  | { type: "pong"; t2: number }
  | { type: "kicked"; reason: string };
