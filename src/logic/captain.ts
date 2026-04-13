import type { PlayerData, RoundResult } from "@/types/game";

export function canBeCaptain(playerName: string, history: RoundResult[]): boolean {
  if (history.length === 0) return true;
  const lastRound = history[history.length - 1];
  return lastRound?.captainName !== playerName;
}

export function getEligibleCaptains(
  teamPlayers: PlayerData[],
  history: RoundResult[],
): PlayerData[] {
  const eligible = teamPlayers.filter((p) => canBeCaptain(p.name, history));
  // Fallback: if nobody is eligible (team of 1), allow everyone
  return eligible.length > 0 ? eligible : teamPlayers;
}

export function getRandomCaptain(
  teamPlayers: PlayerData[],
  history: RoundResult[],
): string {
  const eligible = getEligibleCaptains(teamPlayers, history);
  const index = Math.floor(Math.random() * eligible.length);
  return eligible[index]!.name;
}
