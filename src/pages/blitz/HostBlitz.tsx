import { useEffect } from "react";
import {
  usePhase,
  useCurrentRound,
  usePlayers,
  useTimer as useTimerState,
} from "@/store/selectors";
import { handleBlitzTimerExpire } from "@/store/actions/blitz";
import type { BlitzPhase } from "@/types/game";
import { TaskCardBlock } from "../blocks/TaskCardBlock";
import { SidebarBlock } from "../blocks/SidebarBlock";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";
import { HostLayout } from "@/pages/blocks/HostLayout";
import { HostMainContainer } from "@/pages/blocks/HostMainContainer";
import styles from "./HostBlitz.module.css";
import { BlitzStickerBlock } from "@/pages/blocks/BlitzStickerBlock";

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
    <HostLayout>
      <MainContent />
      <SidebarBlock />
    </HostLayout>
  );
}

function MainContent() {
  const phase = usePhase() as BlitzPhase;
  
  return (
    <HostMainContainer>
      {(phase === "blitz-captain" || phase === "blitz-pick") && (
        <TaskBoardBlock />
      )}
      
      <TaskCardBlock/>
      
      <div className={styles.stickerSlot}>
        <BlitzStickerBlock/>
      </div>
      
      
      {phase === "blitz-review" && (
        <BlitzChainDiagram />
      )}
    </HostMainContainer>
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