import styles from "./CalibrationRow.module.css";

export interface CalibrationRowProps {
  icon: string;
  label: string;
  children: React.ReactNode;
}

export function CalibrationRow({ icon, label, children }: CalibrationRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
        {label}
      </div>
      <div className={styles.controls}>{children}</div>
    </div>
  );
}

export function Divider() {
  return <div className={styles.divider} aria-hidden />;
}
