import type { Story } from "@ladle/react";
import { BlitzBox } from "./BlitzBox";

export const Size: Story = () => (
  <div style={{display: "flex", gap: 10}}>
    <div style={{ width: 50 }}>
      <BlitzBox score={50} />
    </div>
    <div style={{ width: 80 }}>
      <BlitzBox score={80} />
    </div>
    <div style={{ width: 120 }}>
      <BlitzBox score={120} />
    </div>
    <div style={{ width: 200 }}>
      <BlitzBox score={200} />
    </div>
  </div>
);

export const Active: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox active />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", gap: 16 }}>
    <div style={{ width: 80 }}><BlitzBox team="red" score={200} /></div>
    <div style={{ width: 80 }}><BlitzBox team="blue" score={0} /></div>
    <div style={{ width: 80 }}><BlitzBox team="none" score={500}/></div>
    <div style={{ width: 80 }}><BlitzBox /></div>
  </div>
);

export const ActiveWithTeam: Story = () => (
  <div style={{ display: "flex", gap: 16 }}>
    <div style={{ width: 80 }}><BlitzBox active team="red" /></div>
    <div style={{ width: 80 }}><BlitzBox active team="blue" /></div>
  </div>
);

export const WideText: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox team="red" score={1000} />
  </div>
);

export const NoTeamColor: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox score={500} />
  </div>
);
