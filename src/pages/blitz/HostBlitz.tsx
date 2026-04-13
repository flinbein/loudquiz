import { useEffect } from "react";
import {
  usePhase,
  useCurrentRound,
  usePlayers,
  useTimer as useTimerState,
} from "@/store/selectors";
import { handleBlitzTimerExpire } from "@/store/actions/blitz";
import type { BlitzPhase } from "@/types/game";
import styles from "./HostBlitz.module.css";
import { TaskCardBlock } from "../blocks/TaskCardBlock";
import { SidebarBlock } from "../blocks/SidebarBlock";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";

export function HostBlitz() {
  const phase = usePhase() as BlitzPhase;
  const round = useCurrentRound();
  const timer = useTimerState();

  // Timer expiry handling.
  useEffect(() => {
    if (!timer) return;
    const now = performance.now();
    const endAt = timer.startedAt + timer.duration;
    const remaining = endAt - now;
    if (remaining <= 0) {
      handleBlitzTimerExpire(phase);
      return;
    }
    const id = setTimeout(() => {
      handleBlitzTimerExpire(phase);
    }, remaining);
    return () => clearTimeout(id);
  }, [timer, phase]);

  if (!round || round.type !== "blitz") return null;

  return (
    <div className={styles.layout}>
      <MainContent />
      <SidebarBlock />
    </div>
  );
}

function MainContent() {
  const phase = usePhase() as BlitzPhase;
  
  return (
    <div className={styles.main}>
      {(phase === "blitz-captain" || phase === "blitz-pick") && (
        <TaskBoardBlock />
      )}
      
      <TaskCardBlock/>
      
      {phase === "blitz-review" && (
        <BlitzChainDiagram />
      )}
    </div>
  );
}

function BlitzChainDiagram() {
  const round = useCurrentRound();
  const players = usePlayers();
  if (!round || round.type !== "blitz") return null;
  const order = round.playerOrder ?? [];
  const review = round.reviewResult;
  const answerer = review?.evaluations[0]?.playerName;

  return (
    <div className={styles.chain}>
      {order.map((name, idx) => {
        const p = players.find((pp) => pp.name === name);
        const isAnswerer = name === answerer;
        return (
          <div key={name} className={styles.chainLink}>
            <span className={styles.chainEmoji}>{p?.emoji ?? "?"}</span>
            <span className={styles.chainName}>{name}</span>
            {idx < order.length - 1 && <span className={styles.chainArrow}>→</span>}
            {isAnswerer && (
              <span className={styles.chainAnswer}>
                +{review?.score ?? 0}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}