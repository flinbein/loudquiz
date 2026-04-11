import type { Story } from "@ladle/react";
import { TimerButton } from "./TimerButton";

export const Default: Story = () => (
  <TimerButton startedAt={performance.now()} durationMs={60000} onClick={() => console.log("click")}>
    Буду капитаном!
  </TimerButton>
);
export const Warning: Story = () => (
  <TimerButton startedAt={performance.now()} durationMs={5000} warningTimeMs={10000}>Торопитесь!</TimerButton>
);
export const PreWarning: Story = () => (
  <TimerButton startedAt={performance.now()} durationMs={13000} warningTimeMs={10000}>Торопитесь!</TimerButton>
);
export const Disabled: Story = () => (
  <TimerButton startedAt={performance.now()} durationMs={30000} disabled>Заблокировано</TimerButton>
);
