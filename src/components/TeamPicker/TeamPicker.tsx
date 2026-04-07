import { useRef, useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PlayerData, TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./TeamPicker.module.css";
import cn from "classnames";

interface TeamPickerProps {
  player: PlayerData;
  teamMode: "single" | "dual";
  redCount?: number;
  blueCount?: number;
  noneCount?: number;
  onSelectTeam: (teamId: TeamColor) => void;
  onChangeEmoji: () => void;
}

export function TeamPicker({
  player,
  teamMode,
  redCount = 0,
  blueCount = 0,
  noneCount = 0,
  onSelectTeam,
  onChangeEmoji,
}: TeamPickerProps) {
  const avatarRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const [showDragAnimation, setShowDragAnimation] = useState((player.team === "none" || !player.team) && teamMode === "dual");
  useEffect(() => {
    setShowDragAnimation((player.team === "none" || !player.team) && teamMode === "dual")
  }, [player.team, teamMode]);

  const canDrag = teamMode === "dual" && !player.ready;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canDrag) return;
      setShowDragAnimation(false);
      dragging.current = true;
      startX.current = e.clientX;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [canDrag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 30) {
        onSelectTeam(dx < 0 ? "red" : "blue");
      }
      if (avatarRef.current) {
        avatarRef.current.style.transform = "";
      }
    },
    [onSelectTeam],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !avatarRef.current) return;
    const dx = e.clientX - startX.current;
    const clamped = Math.max(-80, Math.min(80, dx));
    avatarRef.current.style.transform = `translateX(${clamped}px)`;
  }, []);
  
   return <div className={styles.wrapper}>
     {teamMode === "single" && <div className={`${styles.block} ${styles.blockNone}`}>{noneCount}</div>}
     
     {teamMode === "dual" && <div
       className={cn(styles.block, styles.blockRed, {[styles.blockActive]: player.team === "red" })}
       onClick={(player.team !== "red") ? () => onSelectTeam("red") : undefined}
     >{redCount}</div>
     }
     {teamMode === "dual" && <div
       className={cn(styles.block, styles.blockBlue, {[styles.blockActive]: player.team === "blue" })}
       onClick={(player.team !== "blue") ? () => onSelectTeam("blue") : undefined}
     >{blueCount}</div>}
     
     <div
       ref={avatarRef}
       className={cn(
         styles.avatar,
         {
           [styles.avatarAnimated]: showDragAnimation,
           [styles.avatarDrag]: teamMode === "dual",
         })}
       onPointerDown={handlePointerDown}
       onPointerUp={handlePointerUp}
       onPointerMove={handlePointerMove}
     >
       <PlayerAvatar
         emoji={player.emoji}
         name={player.name}
         team={player.team}
         onClick={!player.ready ? onChangeEmoji : undefined}
       />
       <div className={styles.avatarPointer}>👆🏻</div>
     </div>
   </div>
}
