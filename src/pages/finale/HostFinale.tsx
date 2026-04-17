import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { FinaleScoreboard } from "./FinaleScoreboard";
import { NominationCarousel } from "@/components/NominationCarousel/NominationCarousel";
import { getAllNominations } from "@/logic/nominations";

export function HostFinale() {
  const teams = useGameStore((s) => s.teams);
  const teamMode = useGameStore((s) => s.settings.teamMode);
  const history = useGameStore((s) => s.history);
  const players = useGameStore((s) => s.players);
  const topics = useGameStore((s) => s.topics);

  const nominations = useMemo(
    () => getAllNominations(history, players, topics),
    [history, players, topics],
  );

  return (
    <>
      <FinaleScoreboard teams={teams} teamMode={teamMode} />
      <NominationCarousel nominations={nominations} />
    </>
  );
}
