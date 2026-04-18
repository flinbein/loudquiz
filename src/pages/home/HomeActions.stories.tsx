import type { Story } from "@ladle/react";
import { HomeActions } from "./HomeActions";
import type { HomeSession } from "./useHomeSession";

const noop = () => {};
const handlers = {
  onStartNew: noop,
  onResume: noop,
  onJoin: noop,
  onClearAndStartNew: noop,
  onConstructor: noop,
  onRules: noop,
};

const framing: React.CSSProperties = {
  background: "#0a0a14",
  padding: 48,
  // Simulate palette injection that HomePage does
  ["--color-text" as string]: "#e8e8f0",
  ["--color-text-secondary" as string]: "rgba(232,232,240,0.6)",
  ["--color-text-muted" as string]: "rgba(232,232,240,0.4)",
  ["--neon-red" as string]: "#e53935",
  ["--neon-red-glow" as string]: "rgba(229,57,53,0.55)",
  ["--neon-blue" as string]: "#1e88e5",
  ["--neon-blue-glow" as string]: "rgba(30,136,229,0.55)",
};

export const Fresh: Story = () => (
  <div style={framing}>
    <HomeActions session={{ kind: "fresh" }} {...handlers} />
  </div>
);

export const ResumeRound: Story = () => {
  const session: HomeSession = {
    kind: "resume",
    phase: "round-active",
    phaseLabel: "Идёт раунд · 5 / 12",
    roomId: "QUIZ42",
  };
  return (
    <div style={framing}>
      <HomeActions session={session} {...handlers} />
    </div>
  );
};

export const ResumeBlitz: Story = () => {
  const session: HomeSession = {
    kind: "resume",
    phase: "blitz-active",
    phaseLabel: "Идёт блиц · 2 / 4",
    roomId: "QUIZ42",
  };
  return (
    <div style={framing}>
      <HomeActions session={session} {...handlers} />
    </div>
  );
};

export const ResumeTopics: Story = () => {
  const session: HomeSession = {
    kind: "resume",
    phase: "topics-collecting",
    phaseLabel: "Выбор тем",
    roomId: "QUIZ42",
  };
  return (
    <div style={framing}>
      <HomeActions session={session} {...handlers} />
    </div>
  );
};
