import type { Story } from "@ladle/react";
import { TeamGroup } from "./TeamGroup";
import { PlayerStatusTable, type PlayerStatusRow } from "@/components/PlayerStatusTable/PlayerStatusTable";

const redPlayers: PlayerStatusRow[] = [
  { emoji: "😈", name: "Алексей", team: "red", online: true, status: "right" },
  { emoji: "🎃", name: "Катя", team: "red", online: false, status: "right" },
  { emoji: "🐔", name: "Петя", team: "red", online: true, status: "waiting" },
  { emoji: "🐰", name: "Степан", team: "red", online: true, status: "waiting" },
];

const bluePlayers: PlayerStatusRow[] = [
  { emoji: "👻", name: "Маша", team: "blue", online: true, status: "right" },
  { emoji: "🤖", name: "Дима", team: "blue", online: true, status: "waiting" },
];

const noTeamPlayers: PlayerStatusRow[] = [
  { emoji: "🐱", name: "Вова", team: "none", online: true, status: "waiting" },
];

export const DualMode: Story = () => (
  <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
    <TeamGroup label="Красные" teamColor="red" playerCount={2}>
      <PlayerStatusTable players={redPlayers} draggable />
    </TeamGroup>
    <TeamGroup label="Синие" teamColor="blue" playerCount={2}>
      <PlayerStatusTable players={bluePlayers} draggable />
    </TeamGroup>
    <TeamGroup label="Без команды" teamColor="none" playerCount={1}>
      <PlayerStatusTable players={noTeamPlayers} draggable />
    </TeamGroup>
  </div>
);

export const SingleMode: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "😈", name: "Алексей", team: "none", online: true, status: "right" },
    { emoji: "👻", name: "Маша", team: "none", online: true, status: "right" },
    { emoji: "🤖", name: "Дима", team: "none", online: true, status: "right" },
  ];
  return (
    <div style={{ width: 320 }}>
      <TeamGroup label="Игроки" teamColor="none" playerCount={3}>
        <PlayerStatusTable players={players} />
      </TeamGroup>
    </div>
  );
};

export const EmptyTeam: Story = () => (
  <div style={{ width: 320 }}>
    <TeamGroup label="Красные" teamColor="red" playerCount={0}>
      <div style={{ textAlign: "center", color: "#999", padding: 16, fontSize: 13 }}>
        Перетащите игрока сюда
      </div>
    </TeamGroup>
  </div>
);
