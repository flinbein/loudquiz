import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./PlayerStatusTable.module.css";

export type PlayerRole = "captain" | "player" | "blitz-player" | "undefined";
export type PlayerStatus = "answered" | "skipped" | "typing" | "waiting";

export interface PlayerStatusRow {
  emoji: string;
  playerName: string;
  team: TeamColor;
  online: boolean;
  role: PlayerRole;
  blitzOrder?: number;
  status: PlayerStatus;
}

export interface PlayerStatusTableProps {
  players: PlayerStatusRow[];
}

const BLITZ_NUMBER_EMOJIS = [
  "", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣",
  "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟",
];

function roleIcon(role: PlayerRole, blitzOrder?: number): string {
  switch (role) {
    case "captain": return "👑";
    case "player": return "📝";
    case "blitz-player": return BLITZ_NUMBER_EMOJIS[blitzOrder ?? 1] || `${blitzOrder}`;
    case "undefined": return "❓";
  }
}

function StatusDisplay({ status }: { status: PlayerStatus }) {
  switch (status) {
    case "answered": return <>✅</>;
    case "skipped": return <>❌</>;
    case "typing":
      return (
        <span className={styles.typingDots}>
          <span />
          <span />
          <span />
        </span>
      );
    case "waiting": return null;
  }
}

const nameColorClass: Record<TeamColor, string> = {
  red: styles.nameRed,
  blue: styles.nameBlue,
  beige: styles.nameBeige,
};

export function PlayerStatusTable({ players }: PlayerStatusTableProps) {
  return (
    <div className={styles.table}>
      {players.map((p, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.avatarCell}>
            <PlayerAvatar
              size="small"
              emoji={p.emoji}
              team={p.team}
              online={p.online}
            />
          </div>
          <div className={`${styles.nameCell} ${nameColorClass[p.team]}`}>
            {p.playerName}
          </div>
          <div className={styles.roleCell}>
            {roleIcon(p.role, p.blitzOrder)}
          </div>
          <div className={styles.statusCell}>
            <StatusDisplay status={p.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
