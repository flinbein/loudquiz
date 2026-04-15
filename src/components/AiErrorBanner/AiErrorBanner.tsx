import styles from "./AiErrorBanner.module.css";

export interface AiErrorBannerProps {
  message: string;
  canFallback: boolean;
  onRetry: () => void;
  onFallback?: () => void;
  retryLabel: string;
  fallbackLabel: string;
}

export function AiErrorBanner({
  message,
  canFallback,
  onRetry,
  onFallback,
  retryLabel,
  fallbackLabel,
}: AiErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <div className={styles.message}>{message}</div>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={onRetry}>
          {retryLabel}
        </button>
        {canFallback && onFallback && (
          <button className={styles.secondary} onClick={onFallback}>
            {fallbackLabel}
          </button>
        )}
      </div>
    </div>
  );
}
