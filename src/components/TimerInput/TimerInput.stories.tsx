import { useState } from "react";
import type { Story } from "@ladle/react";
import { TimerInput } from "./TimerInput";

export const Default: Story = () => {
  const [value, setValue] = useState("");
  return (
    <TimerInput
      time={60}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Введите ответ..."
    />
  );
};
export const Warning: Story = () => <TimerInput time={5} warningTime={10} placeholder="Скорее!" />;
export const Disabled: Story = () => <TimerInput time={30} disabled placeholder="Отключено" />;
