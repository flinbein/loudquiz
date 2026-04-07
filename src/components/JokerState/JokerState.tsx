import { useTranslation } from "react-i18next";
import cn from "classnames";
import styles from "./JokerState.module.css";

export interface JokerStateProps {
  state: "enabled" | "disabled" | "active";
  onClick?: () => void;
}

export function JokerState({ state, onClick }: JokerStateProps) {
  const { t } = useTranslation();

  const textMap = {
    enabled: t("joker.use"),
    disabled: t("joker.used"),
    active: t("joker.active"),
  };

  return (
    <div
      className={cn(styles.card, styles[state])}
      onClick={state === "enabled" ? onClick : undefined}
    >
      <span className={styles.icon}>🃏</span>
      <span className={styles.text}>{textMap[state]}</span>
    </div>
  );
}
