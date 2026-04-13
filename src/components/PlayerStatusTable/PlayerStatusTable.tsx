import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { TeamId } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./PlayerStatusTable.module.css";

export type PlayerRole = "captain" | "player" | "blitz-player" | "undefined";
export type PlayerStatus = "answered" | "wrong" | "right" | "typing" | "waiting";

export interface PlayerStatusRow {
  emoji: string;
  name: string;
  team?: TeamId;
  online?: boolean;
  role?: PlayerRole;
  blitzOrder?: number;
  status?: PlayerStatus;
}

export interface PlayerStatusTableProps {
  players: PlayerStatusRow[];
  draggable?: boolean;
  onClick?: (playerData: PlayerStatusRow) => void;
}

const BLITZ_NUMBER_EMOJIS = [
  "", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣",
  "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟",
];

function roleIcon(role?: PlayerRole, blitzOrder?: number): string {
  switch (role) {
    case "captain": return "👑";
    case "player": return "📝";
    case "blitz-player": return BLITZ_NUMBER_EMOJIS[blitzOrder ?? 1] || `${blitzOrder}`;
    case "undefined": return "❓";
    default: return "";
  }
}

function StatusDisplay({ status }: { status?: PlayerStatus }) {
  switch (status) {
    case "answered": return <>✔️</>;
    case "right": return <>✅</>;
    case "wrong": return <>❌</>;
    case "typing":
      return (
        <span className={styles.typingDots}>
          <span />
          <span />
          <span />
        </span>
      );
    case "waiting": return <>⏳</>;
    default: return null;
  }
}

const nameColorClass: Record<TeamId, string> = {
  red: styles.nameRed!,
  blue: styles.nameBlue!,
  none: styles.nameNone!,
};

function getOrder(players: PlayerStatusRow[]): string {
  return players.map(p => p.name).join("\0");
}

export function PlayerStatusTable({ players, draggable, onClick }: PlayerStatusTableProps) {
  const [committed, setCommitted] = useState(players);
  const prevOrderRef = useRef(getOrder(players));

  useEffect(() => {
    const newOrder = getOrder(players);
    if (newOrder === prevOrderRef.current) {
      // Order unchanged — apply data updates immediately (status, role, etc.)
      setCommitted(players);
    } else if (document.startViewTransition) {
      // Order changed — animate via View Transition API
      document.startViewTransition(() => {
        flushSync(() => setCommitted(players));
      });
    } else {
      setCommitted(players);
    }
    prevOrderRef.current = newOrder;
  }, [players]);

  return (
    <div className={styles.table}>
      {committed.map((p) =>
        <PlayerStatusTableRow playerData={p} key={p.name} onClick={onClick} draggable={draggable} />
      )}
    </div>
  );
}

interface PlayerStatusTableRowProps {
  playerData: PlayerStatusRow;
  draggable?: boolean;
  onClick?: (playerData: PlayerStatusRow) => void;
}
function PlayerStatusTableRow({onClick, playerData, draggable}: PlayerStatusTableRowProps){
  const id = useId();
  const vtName = id.replaceAll(":", "");
  return (
    <div
      className={`${styles.row} ${draggable ? styles.draggable : ""}`}
      style={{ viewTransitionName: vtName }}
      onClick={() => onClick?.(playerData)}
      data-clickable={onClick !== undefined || undefined}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/loud-quiz-player-name", playerData.name);
      }}
    >
      <div className={styles.avatarCell}>
        <PlayerAvatar
          size={30}
          emoji={playerData.emoji}
          team={playerData.team}
          online={playerData.online}
        />
      </div>
      <div className={`${styles.nameCell} ${nameColorClass[playerData.team ?? "none"]}`}>
        {playerData.name}
      </div>
      <div className={styles.roleCell}>
        {roleIcon(playerData.role, playerData.blitzOrder)}
      </div>
      <div className={styles.statusCell}>
        <StatusDisplay status={playerData.status} />
      </div>
    </div>
  )
}
