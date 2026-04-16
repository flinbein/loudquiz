import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import { canBeCaptain } from "@/logic/captain";
import { TimerButton } from "@/components/TimerButton/TimerButton";
import { useLocalTimer } from "@/hooks/useLocalTimer";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerRound.module.css";
import { useCurrentRound, usePlayers } from "@/store/selectors";

interface PlayerRoundCaptainProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

export function PlayerRoundCaptain({ playerName, sendAction }: PlayerRoundCaptainProps){
  const timer = useLocalTimer();
  const history = useGameStore((s) => s.history);
  const round = useCurrentRound();
  const players = usePlayers();
  const { t } = useTranslation();
  const eligible = canBeCaptain(playerName, history);
  const me = players.find((p) => p.name === playerName);
  const isActiveTeam = me?.team === round?.teamId;
  if (!isActiveTeam) return null;
  return (
    <div className={styles.container}>
      <TimerButton
        startedAt={timer?.startedAt ?? 0}
        durationMs={timer?.duration ?? 0}
        onClick={() => sendAction({ kind: "claim-captain" })}
        disabled={!eligible}
      >
        {t("round.beCaptain")}
      </TimerButton>
      <div className={styles.phaseInfo}>
        {eligible ? t("round.captainHint") : t("round.wasCaptain")}
      </div>
    </div>
  )
}