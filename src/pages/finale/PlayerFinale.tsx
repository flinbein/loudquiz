import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import type { PlayerAction } from "@/types/transport";

interface PlayerFinaleProps {
  sendAction: (action: PlayerAction) => void;
}

export function PlayerFinale({ sendAction }: PlayerFinaleProps) {
  const teams = useGameStore((s) => s.teams);
  const mode = useGameStore((s) => s.settings.mode);
  const teamMode = useGameStore((s) => s.settings.teamMode);
  const { t } = useTranslation();

  let announcement: string;
  if (teamMode === "single") {
    announcement = t("finale.gameOver");
  } else {
    const maxScore = Math.max(...teams.map((tm) => tm.score));
    const leaders = teams.filter((tm) => tm.score === maxScore);
    if (leaders.length > 1) {
      announcement = t("finale.draw");
    } else {
      announcement = t("finale.victory", { team: t(`teams.${leaders[0]!.id}`) });
    }
  }

  return (
    <div>
      <h1>{announcement}</h1>
      <TeamScore teams={teams} />
      {mode === "ai" && (
        <button onClick={() => sendAction({ kind: "play-again" })}>
          {t("finale.playAgain")}
        </button>
      )}
    </div>
  );
}
