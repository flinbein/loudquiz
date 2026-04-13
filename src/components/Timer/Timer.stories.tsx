import type { Story } from "@ladle/react";
import { Timer, TimerProps } from "./Timer";
import { useState } from "react";

function TimerToggle(props: TimerProps) {
  const [show, setShow] = useState(true);
  return <div>
    <button type="button" onClick={() => setShow(v => !v)}>toggle</button>
    {show && <Timer {...props} />}
  </div>
}

export const Default: Story = () => <Timer startedAt={performance.now()} durationMs={60000}/>;
export const Reset: Story = () => {
  const [startedAt, setStartedAt] = useState(performance.now());
  return <div>
    <button type="button" onClick={() => setStartedAt(() => performance.now())}>reset (13s)</button>
    <Timer startedAt={startedAt} durationMs={13000} />
  </div>
}
export const PreWarning: Story = () => <Timer startedAt={performance.now()} durationMs={13000} warningTimeMs={10000}/>;
export const Warning: Story = () => <Timer startedAt={performance.now()} durationMs={8000} warningTimeMs={10000}/>;
export const Future: Story = () => <Timer startedAt={performance.now()+2000} durationMs={8000} warningTimeMs={10000}/>;
export const Expired: Story = () => <Timer startedAt={performance.now()-10} durationMs={0} />;
export const Toggle: Story = () => {
  const startedAt = performance.now();
  const duration = 300 * 1000;
  return <div style={{display: "grid",  gap: 20}}>
    <TimerToggle startedAt={startedAt} durationMs={duration} />
    <TimerToggle startedAt={startedAt} durationMs={duration} />
    <TimerToggle startedAt={startedAt} durationMs={duration} />
    <TimerToggle startedAt={startedAt} durationMs={duration} />
    <TimerToggle startedAt={startedAt} durationMs={duration} />
  </div>
}
export const Shift: Story = () => {
  const startedAt = performance.now();
  const duration = 300 * 1000;
  return <div style={{display: "grid",  gap: 20}}>
    <TimerToggle startedAt={startedAt} durationMs={duration} />
    <TimerToggle startedAt={startedAt-200} durationMs={duration} />
    <TimerToggle startedAt={startedAt-400} durationMs={duration} />
    <TimerToggle startedAt={startedAt-600} durationMs={duration} />
    <TimerToggle startedAt={startedAt-800} durationMs={duration} />
    <TimerToggle startedAt={startedAt-1000} durationMs={duration} />
  </div>
}
