import type { Story } from "@ladle/react";
import { useState } from "react";
import { PlayerAvatar } from "./PlayerAvatar";

const EMOJIS = ["👻", "🤖", "🦊", "👽", "🐙", "🎃"];

export const Sizes: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatar size="small" emoji="👻" team="red" />
    <PlayerAvatar size="medium" emoji="👻" playerName="Алексей" team="red" />
    <PlayerAvatar size="large" emoji="👻" playerName="Алексей" team="red" />
  </div>
);

export const Teams: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatar size="large" emoji="🤖" playerName="Red Player" team="red" />
    <PlayerAvatar size="large" emoji="🦊" playerName="Blue Player" team="blue" />
    <PlayerAvatar size="large" emoji="👽" playerName="Neutral" team="beige" />
  </div>
);

export const OnlineOffline: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatar size="large" emoji="👻" playerName="Online" team="red" online />
    <PlayerAvatar size="large" emoji="👻" playerName="Offline" team="red" online={false} />
    <PlayerAvatar size="large" emoji="🤖" playerName="Offline" team="blue" online={false} />
  </div>
);

export const NameFormatting: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatar size="large" emoji="🦊" playerName="Анна Смирнова" team="blue" />
    <PlayerAvatar size="large" emoji="🦊" playerName="Макс" team="blue" />
    <PlayerAvatar size="large" emoji="🦊" playerName="!!!Special***" team="blue" />
    <PlayerAvatar size="large" emoji="🦊" playerName="Длинное Имя Игрока" team="blue" />
  </div>
);

export const EmojiChange: Story = () => {
  const [idx, setIdx] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <PlayerAvatar
        size="large"
        emoji={EMOJIS[idx % EMOJIS.length]}
        playerName="Click me"
        team="red"
        onClick={() => setIdx((i) => i + 1)}
      />
      <span style={{ fontSize: 14, color: "#888" }}>Click avatar to change emoji</span>
    </div>
  );
};

export const AllSizesAllTeams: Story = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {(["small", "medium", "large"] as const).map((size) => (
      <div key={size} style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 60, fontSize: 12 }}>{size}</span>
        <PlayerAvatar size={size} emoji="👻" playerName="Test" team="red" />
        <PlayerAvatar size={size} emoji="🤖" playerName="Test" team="blue" />
        <PlayerAvatar size={size} emoji="🦊" playerName="Test" team="beige" />
      </div>
    ))}
  </div>
);
