import type { Story } from "@ladle/react";
import { AiErrorBanner } from "./AiErrorBanner";

export const Default: Story = () => (
  <AiErrorBanner
    message="AI сервис недоступен."
    canFallback
    onRetry={() => {}}
    onFallback={() => {}}
    retryLabel="Повторить"
    fallbackLabel="Переключить в ручной режим"
  />
);

export const RetryOnly: Story = () => (
  <AiErrorBanner
    message="Таймаут запроса."
    canFallback={false}
    onRetry={() => {}}
    retryLabel="Повторить"
    fallbackLabel=""
  />
);

export const LongMessage: Story = () => (
  <AiErrorBanner
    message={"Очень длинное сообщение об ошибке: ".repeat(8)}
    canFallback
    onRetry={() => {}}
    onFallback={() => {}}
    retryLabel="Повторить"
    fallbackLabel="Вручную"
  />
);
