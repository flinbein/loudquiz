import type { Story } from "@ladle/react";
import { PlayerStatusTable, type PlayerStatusRow } from "./PlayerStatusTable";

const mixedPlayers: PlayerStatusRow[] = [
  { emoji: "👻", playerName: "Алексей", team: "red", online: true, role: "captain", status: "waiting" },
  { emoji: "🤖", playerName: "Мария", team: "red", online: true, role: "player", status: "answered" },
  { emoji: "🦊", playerName: "Иван", team: "red", online: true, role: "player", status: "typing" },
  { emoji: "👽", playerName: "Ольга", team: "blue", online: true, role: "player", status: "waiting" },
  { emoji: "🐙", playerName: "Пётр", team: "blue", online: false, role: "player", status: "waiting" },
];

export const MixedStatuses: Story = () => (
  <div style={{ width: 320 }}>
    <PlayerStatusTable players={mixedPlayers} />
  </div>
);

export const BlitzRoles: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", playerName: "Капитан", team: "red", online: true, role: "captain", status: "waiting" },
    { emoji: "🤖", playerName: "Первый", team: "red", online: true, role: "blitz-player", blitzOrder: 1, status: "answered" },
    { emoji: "🦊", playerName: "Второй", team: "red", online: true, role: "blitz-player", blitzOrder: 2, status: "typing" },
    { emoji: "👽", playerName: "Третий", team: "red", online: true, role: "blitz-player", blitzOrder: 3, status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const AllOffline: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", playerName: "Алексей", team: "red", online: false, role: "player", status: "waiting" },
    { emoji: "🤖", playerName: "Мария", team: "blue", online: false, role: "player", status: "waiting" },
    { emoji: "🦊", playerName: "Иван", team: "red", online: false, role: "undefined", status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const SingleTeam: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", playerName: "Алексей", team: "red", online: true, role: "captain", status: "waiting" },
    { emoji: "🤖", playerName: "Мария", team: "red", online: true, role: "player", status: "answered" },
    { emoji: "🦊", playerName: "Иван", team: "red", online: true, role: "player", status: "answered" },
    { emoji: "👽", playerName: "Ольга", team: "red", online: true, role: "player", status: "wrong" },
    { emoji: "🦄", playerName: "Игорь", team: "none", online: true, role: "player", status: "right" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const ManyPlayers: Story = () => {
  const names = ["Анна", "Борис", "Вера", "Георгий", "Дарья", "Евгений", "Жанна", "Захар", "Ирина", "Кирилл"];
  const emojis = ["👻", "🤖", "🦊", "👽", "🐙", "🎃", "🦄", "🐸", "🦋", "🐯"];
  const players: PlayerStatusRow[] = names.map((name, i) => ({
    emoji: emojis[i],
    playerName: name,
    team: i < 5 ? "red" as const : "blue" as const,
    online: i !== 4 && i !== 9,
    role: i === 0 ? "captain" as const : "player" as const,
    status: (["answered", "typing", "waiting", "wrong", "right"] as const)[i % 5],
  }));
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const UndefinedRoles: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", playerName: "Новый 1", team: "none", online: true, role: "undefined", status: "waiting" },
    { emoji: "🤖", playerName: "Новый 2", team: "none", online: true, role: "undefined", status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};
