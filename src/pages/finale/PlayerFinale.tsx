import { useGameStore } from "@/store/gameStore";
import { FinaleScoreboard } from "./FinaleScoreboard";

export function PlayerFinale() {
  const teams = useGameStore((s) => s.teams);
  const teamMode = useGameStore((s) => s.settings.teamMode);

  return <FinaleScoreboard teams={teams} teamMode={teamMode} />;
}
