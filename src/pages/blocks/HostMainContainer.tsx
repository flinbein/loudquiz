import type { ReactNode } from "react";
import { useCurrentRound, useSettings } from "@/store/selectors";
import styles from "./HostMainContainer.module.css";

export function HostMainContainer({ children }: { children: ReactNode }) {
  const round = useCurrentRound();
  const settings = useSettings();
  const stripeColor =
    settings.teamMode === "dual" && round?.teamId ? round.teamId : undefined;

  return (
    <div className={styles.mainContainer} data-stripe={stripeColor}>
      {children}
    </div>
  );
}
