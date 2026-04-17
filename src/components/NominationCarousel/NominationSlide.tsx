import { useTranslation } from "react-i18next";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import type { Nomination } from "@/logic/nominations/types";
import styles from "./NominationCarousel.module.css";

interface NominationSlideProps {
  nomination: Nomination;
}

export function NominationSlide({ nomination }: NominationSlideProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.slide}>
      <div className={styles.emoji}>{nomination.emoji}</div>
      <h2 className={styles.title}>{t(nomination.titleKey)}</h2>
      <div className={styles.winners}>
        {nomination.winners.map((w) => (
          <PlayerAvatar key={w.name} emoji={w.emoji} name={w.name} team={w.team} />
        ))}
      </div>
      {nomination.stat && <div className={styles.stat}>{nomination.stat}</div>}
      <p className={styles.description}>{t(nomination.descriptionKey)}</p>
    </div>
  );
}
