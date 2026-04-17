import type { PlayerDisplay, PlayerData, RoundResult, Topic } from "@/types/game";

export interface Nomination {
  id: string;
  emoji: string;
  titleKey: string;
  descriptionKey: string;
  winners: PlayerDisplay[];
  stat?: string;
}

export interface NominationCandidate {
  playerName: string;
  value: number;
  statLabel: string;
}

export interface NominationContext {
  history: RoundResult[];
  players: PlayerData[];
  topics: Topic[];
}

export interface NominationRule {
  id: string;
  emoji: string;
  titleKey: string;
  descriptionKey: string;
  tieStrategy: "skip" | "all" | "random";
  compute: (ctx: NominationContext) => NominationCandidate[] | null;
}
