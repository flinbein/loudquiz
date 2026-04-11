import { useState } from "react";
import type { Story } from "@ladle/react";
import { TimerInput } from "./TimerInput";

export const Default: Story = () => {
  const [value, setValue] = useState("");
  return (
    <TimerInput
      durationMs={60000}
      startedAt={performance.now()}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Введите ответ..."
    />
  );
};
export const PreWarning: Story = () => <TimerInput startedAt={performance.now()} durationMs={13000} placeholder="Скорее!" />;
export const Warning: Story = () => <TimerInput startedAt={performance.now()} durationMs={5000} placeholder="Скорее!" />;
export const Disabled: Story = () => <TimerInput startedAt={performance.now()} durationMs={30000} disabled placeholder="Отключено" />;
