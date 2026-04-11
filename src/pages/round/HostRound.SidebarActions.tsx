import { useTranslation } from "react-i18next";
import { usePhase } from "@/store/selectors";
import { confirmReview, confirmScore, disputeReview, forceTeamCaptain, startRoundTask } from "@/store/actions/round";

import type { RoundPhase } from "@/types/game";
import styles from "./HostRound.module.css";

export function SidebarActions(){
  const { t } = useTranslation();
  const phase = usePhase() as RoundPhase;
  
  if (phase === "round-captain") return (
    <div className={styles.actions}>
      <button className={styles.primaryBtn} onClick={() => forceTeamCaptain()}>
        {t("round.captain")}
      </button>
    </div>
  );
  
  if (phase === "round-ready") return (
    <div className={styles.actions}>
      <button className={styles.primaryBtn} onClick={() => startRoundTask()}>
        {t("lobby.start")}
      </button>
    </div>
  );
  
  if (phase === "round-review") return (
    <div className={styles.actions}>
      <button className={styles.primaryBtn} onClick={() => confirmScore()}>
        {t("round.next")}
      </button>
    </div>
  );
  
  if (phase === "round-result") return (
    <div className={styles.actions}>
      <button className={styles.secondaryBtn} onClick={() => disputeReview()}>
        {t("round.dispute")}
      </button>
      <button className={styles.primaryBtn} onClick={() => confirmReview()}>
        {t("round.nextRound")}
      </button>
    </div>
  );
  
  return null;
}