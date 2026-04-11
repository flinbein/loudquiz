import type { Story } from "@ladle/react";
import { useState } from "react";
import { PlayerAvatar } from "./PlayerAvatar";
import type { TeamId } from "@/types/game";

const EMOJIS = ["👻", "🤖", "🦊", "👽", "🐙", "🎃", "🐔"];

const PlayerAvatarClick: typeof PlayerAvatar = (props) => {
  const [index, setIndex] = useState(EMOJIS.indexOf(props.emoji));
  const emoji = EMOJIS[index] || props.emoji;
  return <PlayerAvatar {...props} emoji={emoji} onClick={() => setIndex(v => (v+1) % EMOJIS.length)} />
}

export const Teams: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatarClick size={72} emoji="🤖" name="Red Player" team="red" />
    <PlayerAvatarClick size={72} emoji="🦊" name="Blue Player" team="blue" />
    <PlayerAvatarClick size={72} emoji="🐙" name="Neutral" />
  </div>
);

export const OnlineOffline: Story = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {(["small", "medium", "large"] as const).map((size) => (
      <div key={size} style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 60, fontSize: 12 }}>{size}</span>
        <PlayerAvatarClick size={72} emoji="👻" name="Online" team="red" online />
        <PlayerAvatarClick size={72} emoji="👻" name="Offline" team="red" online={false} />
        <PlayerAvatarClick size={72} emoji="🤖" name="Online" team="blue" online />
        <PlayerAvatarClick size={72} emoji="🤖" name="Offline" team="blue" online={false} />
        <PlayerAvatarClick size={72} emoji="🦊" name="Online" online />
        <PlayerAvatarClick size={72} emoji="🦊" name="Offline" online={false} />
      </div>
    ))}
  </div>
);

const NAMES = ["Анна Смирнова", "Макс", "!!!Special***", "Длинное Имя Игрока", "Mr Beast", "K!LL#R", "Park-Tronie"]
export const NameFormatting: Story = () => (
  <div style={{ display: "grid", gap: 16, alignItems: "center" }}>
    {NAMES.map((name => (
      <>
        <PlayerAvatarClick size={72} emoji="🦊" name={name} team="blue" />
        {name}
      </>
    )))}
  </div>
);

export const EmojiChange: Story = () => {
  const [idx, setIdx] = useState(0);
  return (
    <div style={{ height: 150, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <PlayerAvatarClick
        emoji={EMOJIS[idx % EMOJIS.length]}
        name="Click me"
        team="red"
        onClick={() => setIdx((i) => i + 1)}
      />
      <span style={{ fontSize: 14, color: "#888" }}>Click avatar to change emoji</span>
    </div>
  );
};

const teams = ["red", "blue", "none"] as const;
export const Status: Story = () => {
  const [team, setTeam] = useState<TeamId>("red");
  const [online, setOnline] = useState(true);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <PlayerAvatarClick
        emoji="🐔"
        name="Click me"
        team={team}
        online={online}
        size={72}
      />
      <PlayerAvatarClick
        emoji="🐔"
        name="Click me"
        team={team}
        online={online}
        size={48}
      />
      <PlayerAvatarClick
        emoji="🐔"
        name="Click me"
        team={team}
        online={online}
        size={32}
      />
      <hr style={{width: "100%"}}/>
      <button onClick={() => setTeam("red")}>Red</button>
      <button onClick={() => setTeam("blue")}>Blue</button>
      <button onClick={() => setTeam("none")}>No team</button>
      <button onClick={() => setTeam(v => teams[(teams.indexOf(v)+1)%teams.length])}>Next</button>
      <button onClick={() => setOnline(v => !v)}>Online/offline</button>
    </div>
  );
};

export const AllSizesAllTeams: Story = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {([32, 48, 72, 150, 300] as const).map((size) => (
      <div key={size} style={{ display: "flex", gap: 12, alignItems: "center", height: size}}>
        <span style={{ width: 60, fontSize: 12 }}>{size}</span>
        <PlayerAvatarClick emoji="👻" name="Test" team="red" />
        <PlayerAvatarClick emoji="🤖" name="Test" team="blue" />
        <PlayerAvatarClick emoji="🦊" name="Test" />
      </div>
    ))}
  </div>
);
