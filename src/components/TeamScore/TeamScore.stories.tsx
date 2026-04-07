import type { Story } from "@ladle/react";
import { TeamScore } from "./TeamScore";

export const SingleTeam: Story = () => (
  <TeamScore teams={[{ id: "red", color: "red", score: 450 }]} />
);
export const DualEqual: Story = () => (
  <TeamScore teams={[
    { id: "red", color: "red", score: 300 },
    { id: "blue", color: "blue", score: 300 },
  ]} />
);
export const DualLeader: Story = () => (
  <TeamScore teams={[
    { id: "red", color: "red", score: 500 },
    { id: "blue", color: "blue", score: 320 },
  ]} />
);
export const Zero: Story = () => (
  <TeamScore teams={[{ id: "red", color: "red", score: 0 }]} />
);
