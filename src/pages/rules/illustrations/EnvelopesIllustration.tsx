// src/pages/rules/illustrations/EnvelopesIllustration.tsx
import { Envelope } from "@/components/Envelope/Envelope";
import styles from "./illustrations.module.css";

export function EnvelopesIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.envelopesRow}>
        <div className={styles.envelopeWrap}>
          <Envelope difficulty={100} paperColor="none" />
        </div>
        <div className={styles.envelopeWrap}>
          <Envelope difficulty={150} paperColor="none" open />
        </div>
        <div className={styles.envelopeWrap}>
          <Envelope difficulty={200} paperColor="none" />
        </div>
      </div>
    </div>
  );
}
