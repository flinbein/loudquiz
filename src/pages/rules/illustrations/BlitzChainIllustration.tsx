// src/pages/rules/illustrations/BlitzChainIllustration.tsx
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./illustrations.module.css";

export function BlitzChainIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.blitzChain}>
        <PlayerAvatar emoji="🧜‍♀️" name="Captain" team="blue" size="48px" />
        <span className={styles.chainArrow}>→</span>
        <PlayerAvatar emoji="🎃" name="P1" team="blue" size="44px" />
        <span className={styles.chainArrow}>→</span>
        <PlayerAvatar emoji="🥷" name="P2" team="blue" size="44px" />
        <span className={styles.chainArrow}>→</span>
        <div className={styles.chainAnswer}>?</div>
      </div>
    </div>
  );
}
