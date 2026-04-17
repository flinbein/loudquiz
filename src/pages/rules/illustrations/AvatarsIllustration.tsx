// src/pages/rules/illustrations/AvatarsIllustration.tsx
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./illustrations.module.css";

export function AvatarsIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.avatarsRow}>
        <div>
          <PlayerAvatar emoji="🎯" name="Captain" team="red" size="64px" />
          <div className={styles.captainLabel}>♚</div>
        </div>
        <PlayerAvatar emoji="🎧" name="Alice" team="red" size="52px" />
        <PlayerAvatar emoji="🎵" name="Bob" team="red" size="52px" />
        <PlayerAvatar emoji="🎶" name="Carol" team="red" size="52px" />
      </div>
    </div>
  );
}
