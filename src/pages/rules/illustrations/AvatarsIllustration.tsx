// src/pages/rules/illustrations/AvatarsIllustration.tsx
import styles from "./illustrations.module.css";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import { type PlayerStatusRow, PlayerStatusTable } from "@/components/PlayerStatusTable/PlayerStatusTable";

const redPlayers: PlayerStatusRow[] = [
  { emoji: "🧜‍♀️", name: "Alice", team: "none", online: true, status: "right", role: "captain" },
  { emoji: "🥷", name: "Bob", team: "none", online: true, status: "right", role: "player" },
  { emoji: "👻", name: "Carol", team: "none", online: true, status: "typing", role: "player" },
];

export function AvatarsIllustration() {
  return (
    <div className={styles.container}>
      <div style={{width:'100%'}}>
        <TeamGroup label={"Team"} teamColor="none" playerCount={3}>
          <PlayerStatusTable players={redPlayers} />
        </TeamGroup>
      </div>
    </div>
  );
}
