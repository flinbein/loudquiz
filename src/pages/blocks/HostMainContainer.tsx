import type { ReactNode } from "react";
import styles from "./HostLayout.module.css";

export function HostLayout({children}: {children: ReactNode}) {
  return (
    <div className={styles.layout}>
      {children}
    </div>
  );
}