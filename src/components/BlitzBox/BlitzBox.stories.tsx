import type { Story } from "@ladle/react";
import { BlitzBox } from "./BlitzBox";

export const Default: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox />
  </div>
);

export const Active: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox active />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", gap: 16 }}>
    <div style={{ width: 80 }}><BlitzBox teamColor="red" text="200" /></div>
    <div style={{ width: 80 }}><BlitzBox teamColor="blue" text="300" /></div>
    <div style={{ width: 80 }}><BlitzBox teamColor="beige" text="400" /></div>
  </div>
);

export const ActiveWithTeam: Story = () => (
  <div style={{ display: "flex", gap: 16 }}>
    <div style={{ width: 80 }}><BlitzBox active teamColor="red" text="?" /></div>
    <div style={{ width: 80 }}><BlitzBox active teamColor="blue" text="?" /></div>
  </div>
);

export const WideText: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox teamColor="red" text="1000" />
  </div>
);

export const NoTeamColor: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox text="500" />
  </div>
);
