import type { Story } from "@ladle/react";
import { useState } from "react";
import { Envelope } from "./Envelope";

const player = { emoji: "👻", playerName: "Алексей", team: "red" as const };

export const ClosedAndOpen: Story = () => (
  <div style={{ display: "flex", gap: 24 }}>
    <div style={{ width: 150 }}>
      <Envelope open={false} label="100" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open label="100" paperText="Что тяжелее: 1 кг железа или 1 кг ваты?" paperColor="red" />
    </div>
  </div>
);

export const Toggle: Story = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: 200 }}>
      <Envelope
        open={open}
        label="200"
        paperText="Какое животное самое быстрое?"
        paperColor="blue"
        onClick={() => setOpen((o) => !o)}
      />
      <p style={{ marginTop: 8, fontSize: 12, color: "#888" }}>Click to toggle</p>
    </div>
  );
};

export const Active: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open={false} label="300" active />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", gap: 24 }}>
    <div style={{ width: 150 }}>
      <Envelope open label="100" paperText="Красная тема" paperColor="red" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open label="100" paperText="Синяя тема" paperColor="blue" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open label="100" paperText="Нейтральная" paperColor="beige" />
    </div>
  </div>
);

export const WithPlayer: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open label="100" paperText="С аватаром" paperColor="red" player={player} />
  </div>
);

export const WithJoker: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open label="200" paperText="С джокером" paperColor="blue" jokerUsed />
  </div>
);

export const WithPlayerAndJoker: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open label="200" paperText="Полный" paperColor="red" player={player} jokerUsed />
  </div>
);
