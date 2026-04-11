import { useEffect } from "react";
import { usePhase, useCurrentRound, useTimer as useTimerState, } from "@/store/selectors";
import { handleTimerExpire } from "@/store/actions/round";
import type { RoundPhase } from "@/types/game";
import styles from "./HostRound.module.css";
import { Sidebar } from "./HostRound.Sidebar";
import { MainContent } from "./HostRound.Main";

export function HostRound() {
  const phase = usePhase() as RoundPhase;
  const round = useCurrentRound();
  const timer = useTimerState();

  // Handle timer expiry
  useEffect(() => {
    if (!timer) return;
    const now = performance.now();
    const endAt = timer.startedAt + timer.duration;
    const remaining = endAt - now;
    if (remaining <= 0) {
      handleTimerExpire(phase);
      return;
    }
    const id = setTimeout(() => {
      handleTimerExpire(phase);
    }, remaining * 1000);
    return () => clearTimeout(id);
  }, [timer, phase]);

  if (!round) return null;
  
  return (
    <div className={styles.layout}>
      <MainContent/>
      <Sidebar />
    </div>
  );
}