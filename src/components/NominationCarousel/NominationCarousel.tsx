import { useCarousel } from "@/hooks/useCarousel";
import { NominationSlide } from "./NominationSlide";
import type { Nomination } from "@/logic/nominations/types";
import styles from "./NominationCarousel.module.css";
import cn from "classnames";

interface NominationCarouselProps {
  nominations: Nomination[];
}

export function NominationCarousel({ nominations }: NominationCarouselProps) {
  const { current, isPlaying, next, prev, goTo, togglePlay } = useCarousel(nominations.length);

  if (nominations.length === 0) return null;

  const nomination = nominations[current]!;

  return (
    <div className={styles.carousel} onClick={togglePlay}>
      <button
        className={cn(styles.navButton, styles.navPrev)}
        onClick={(e) => { e.stopPropagation(); prev(); }}
        aria-label="prev"
        disabled={current === 0}
      >
        ◀
      </button>

      <NominationSlide nomination={nomination} />

      <button
        className={cn(styles.navButton, styles.navNext)}
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label="next"
        disabled={current === nominations.length - 1}
      >
        ▶
      </button>

      <div className={styles.dots}>
        {nominations.map((_, i) => (
          <button
            key={i}
            className={cn(styles.dot, { [styles.dotActive!]: i === current })}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            aria-label={`slide ${i + 1}`}
          />
        ))}
      </div>

      {!isPlaying && current < nominations.length - 1 && (
        <div className={styles.pauseIndicator}>⏸</div>
      )}
    </div>
  );
}
