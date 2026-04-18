import { useTranslation } from "react-i18next";
import type { HomeSession } from "./useHomeSession";
import styles from "./HomeActions.module.css";

export interface HomeActionsProps {
  session: HomeSession;
  onStartNew: () => void;
  onResume: (roomId: string) => void;
  onJoin: () => void;
  onClearAndStartNew: () => void;
  onConstructor: () => void;
  onRules: () => void;
}

export function HomeActions({
  session,
  onStartNew,
  onResume,
  onJoin,
  onClearAndStartNew,
  onConstructor,
  onRules,
}: HomeActionsProps) {
  const { t } = useTranslation();
  const isResume = session.kind === "resume";

  return (
    <nav className={styles.actions} aria-label="Home actions">
      {isResume ? (
        <button
          type="button"
          className={styles.primary}
          onClick={() => onResume(session.roomId)}
          aria-label={`${t("home.resume")}. ${session.phaseLabel}`}
        >
          <span className={styles.primaryLabel}>
            {"\u25B8"} {t("home.resume")}
          </span>
          <span className={styles.primarySub}>{session.phaseLabel}</span>
        </button>
      ) : (
        <button
          type="button"
          className={styles.primary}
          onClick={onStartNew}
        >
          <span className={styles.primaryLabel}>
            {"\u25B8"} {t("home.newGame")}
          </span>
        </button>
      )}

      <button type="button" className={styles.outline} onClick={onJoin}>
        {t("home.joinGame")}
      </button>

      <div className={styles.textLinks}>
        <button type="button" className={styles.textLink} onClick={onConstructor}>
          {t("home.constructor")}
        </button>
        <span className={styles.textLinkSep} aria-hidden="true">·</span>
        <button type="button" className={styles.textLink} onClick={onRules}>
          {t("home.rules")}
        </button>
        {isResume && (
          <>
            <span className={styles.textLinkSep} aria-hidden="true">·</span>
            <button type="button" className={styles.textLink} onClick={onClearAndStartNew}>
              {t("home.newGame")}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
