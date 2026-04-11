import type { Story } from "@ladle/react";
import { CircleTimer, CircleTimerProps } from "./CircleTimer";
import { useState } from "react";

function CircleTimerToggle(props: CircleTimerProps) {
  const [show, setShow] = useState(true);
  return <div>
    <button type="button" onClick={() => setShow(v => !v)}>toggle</button>
    {show && <CircleTimer {...props} />}
  </div>
}

export const Default: Story = () => <CircleTimer startedAt={performance.now()} durationMs={60000}/>;
export const Future: Story = () => <CircleTimer startedAt={performance.now()+2000} durationMs={15000}/>;
export const Reset: Story = () => {
  const [startedAt, setStartedAt] = useState(performance.now());
  return <div>
    <button type="button" onClick={() => setStartedAt(() => performance.now())}>reset (13s)</button>
    <CircleTimer startedAt={performance.now()} durationMs={13000} />
  </div>
}
export const Warning: Story = () => <CircleTimer startedAt={performance.now()} durationMs={8000} warningTimeMs={10000}/>;
export const Expired: Story = () => <CircleTimer startedAt={performance.now()-10} durationMs={0} />;
export const Toggle: Story = () => {
  const startedAt = performance.now();
  const duration = 300 * 1000;
  return <div style={{display: "grid",  gap: 20}}>
    <CircleTimerToggle startedAt={startedAt} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt} durationMs={duration} />
  </div>
}
export const Shift: Story = () => {
  const startedAt = performance.now();
  const duration = 300 * 1000;
  return <div style={{display: "grid",  gap: 20}}>
    <CircleTimerToggle startedAt={startedAt} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt-200} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt-400} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt-600} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt-800} durationMs={duration} />
    <CircleTimerToggle startedAt={startedAt-1000} durationMs={duration} />
  </div>
}
