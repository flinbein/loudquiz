import { useTranslation } from "react-i18next";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import type { TeamData } from "@/types/game";

interface FinaleScoreboardProps {
  teams: TeamData[];
  teamMode: "single" | "dual";
}

export function FinaleScoreboard({ teams, teamMode }: FinaleScoreboardProps) {
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
      <TeamScore teams={teams.map((tm) => ({ id: tm.id, score: tm.score }))} />
    </div>
  );
}
