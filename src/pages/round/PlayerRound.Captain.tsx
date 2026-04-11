import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import { canBeCaptain } from "@/logic/captain";
import { TimerButton } from "@/components/TimerButton/TimerButton";
import { toLocalTime } from "@/store/clockSyncStore";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerRound.module.css";

interface PlayerRoundCaptainProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

export function PlayerRoundCaptain({ playerName, sendAction }: PlayerRoundCaptainProps){
  const timer = useGameStore((s) => s.timer);
  const history = useGameStore((s) => s.history);
  const { t } = useTranslation();
  const eligible = canBeCaptain(playerName, history);
  return (
    <div className={styles.container}>
      <TimerButton
        startedAt={toLocalTime(timer?.startedAt)}
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