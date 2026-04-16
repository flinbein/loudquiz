import { useEffect } from "react";
import { usePhase, useCurrentRound, useTimer as useTimerState, } from "@/store/selectors";
import { handleTimerExpire } from "@/store/actions/round";
import type { RoundPhase } from "@/types/game";
import { SidebarBlock } from "@/pages/blocks/SidebarBlock";
import { MainContent } from "./HostRound.Main";
import { HostLayout } from "@/pages/blocks/HostLayout";

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
    }, remaining);
    return () => clearTimeout(id);
  }, [timer, phase]);

  if (!round) return null;
  
  return (
    <HostLayout>
      <MainContent/>
      <SidebarBlock />
    </HostLayout>
  );
}