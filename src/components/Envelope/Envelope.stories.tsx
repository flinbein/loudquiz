import type { Story } from "@ladle/react";
import { useState } from "react";
import { Envelope } from "./Envelope";

const player = { emoji: "👻", playerName: "Алексей", team: "red" as const };

const EnvelopeToggle: typeof Envelope = (props) => {
  const [innerOpen, setInnerOpen] = useState(props.open);
  return <Envelope {...props} open={innerOpen} onClick={() => setInnerOpen(v => !v)} />
}

export const ClosedAndOpen: Story = () => (
  <div style={{ display: "flex", gap: 24, paddingTop: 200 }}>
    <div style={{ width: 150 }}>
      <EnvelopeToggle open={false} difficulty={100} totalScore={500} />
    </div>
    <div style={{ width: 150 }}>
      <EnvelopeToggle open difficulty={100} totalScore={200} paperColor="red" />
    </div>
  </div>
);

export const Toggle: Story = () => (
  <div style={{ width: 200 }}>
    <EnvelopeToggle
      difficulty={200}
      totalScore={2000}
      paperColor="blue"
    />
  </div>
);

export const Active: Story = () => (
  <div>
    <div style={{ width: 70 }}>
      <Envelope open={false} difficulty={300} active />
      <EnvelopeToggle open={false} difficulty={300} active />
    </div>
    <div style={{ width: 120 }}>
      <Envelope open={false} difficulty={300} active />
      <EnvelopeToggle open={false} difficulty={300} active />
    </div>
    <div style={{ width: 200 }}>
      <Envelope open={false} difficulty={300} active />
      <EnvelopeToggle open={false} difficulty={300} active />
    </div>
  </div>
);

export const Size: Story = () => (
  <div style={{ display: "grid", gap: 100, width: 150 }}>
    <div style={{ width: 75 }}>
      <EnvelopeToggle open={false} difficulty={75} totalScore={9999} />
    </div>
    <div style={{ width: 150 }}>
      <EnvelopeToggle open={false} difficulty={150} totalScore={9999} />
    </div>
    <div style={{ width: 250 }}>
      <EnvelopeToggle open={false} difficulty={250} totalScore={9999} />
    </div>
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", gap: 24 }}>
    <div style={{ width: 150 }}>
      <Envelope open difficulty={100} totalScore={9999} paperColor="red" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open difficulty={100} totalScore={9999} paperColor="blue" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open difficulty={100} totalScore={9999} />
    </div>
  </div>
);

export const Score: Story = () => (
  <div style={{ display: "flex", gap: 24 }}>
    <div style={{ width: 150 }}>
      <Envelope open difficulty={100} totalScore={null} paperColor="red" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open difficulty={100} totalScore={0} paperColor="blue" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open difficulty={100} totalScore={9999} />
    </div>
  </div>
);

export const WithPlayer: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open difficulty={100} totalScore={9999} paperColor="red" player={player} />
  </div>
);

export const WithJoker: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open difficulty={200} totalScore={9999} paperColor="blue" jokerUsed />
  </div>
);

export const WithPlayerAndJoker: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open difficulty={200} totalScore={9999} paperColor="red" player={player} jokerUsed />
  </div>
);
