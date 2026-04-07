import type { Story } from "@ladle/react";
import { TimerButton } from "./TimerButton";

export const Default: Story = () => (
  <TimerButton time={60} onClick={() => console.log("click")}>
    Буду капитаном!
  </TimerButton>
);
export const Warning: Story = () => (
  <TimerButton time={5} warningTime={10}>Торопитесь!</TimerButton>
);
export const Disabled: Story = () => (
  <TimerButton time={30} disabled>Заблокировано</TimerButton>
);
