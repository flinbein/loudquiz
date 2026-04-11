import type { Story } from "@ladle/react";
import { PlayerStatusTable, type PlayerStatusRow } from "./PlayerStatusTable";
import { useState } from "react";

const mixedPlayers: PlayerStatusRow[] = [
  { emoji: "👻", name: "Алексей", team: "red", online: true, role: "captain", status: "waiting" },
  { emoji: "🤖", name: "Мария", team: "red", online: true, role: "player", status: "answered" },
  { emoji: "🦊", name: "Иван", team: "red", online: true, role: "player", status: "typing" },
  { emoji: "👽", name: "Ольга", team: "blue", online: true, role: "player", status: "waiting" },
  { emoji: "🐙", name: "Пётр", team: "blue", online: false, role: "player", status: "waiting" },
];

export const MixedStatuses: Story = () => (
  <div style={{ width: 320 }}>
    <PlayerStatusTable players={mixedPlayers} />
  </div>
);

export const BlitzRoles: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", name: "Капитан", team: "red", online: true, role: "captain", status: "waiting" },
    { emoji: "🤖", name: "Первый", team: "red", online: true, role: "blitz-player", blitzOrder: 1, status: "answered" },
    { emoji: "🦊", name: "Второй", team: "red", online: true, role: "blitz-player", blitzOrder: 2, status: "typing" },
    { emoji: "👽", name: "Третий", team: "red", online: true, role: "blitz-player", blitzOrder: 3, status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const OnlineOffline: Story = () => {
  const [players, setPlayers] = useState<PlayerStatusRow[]>(() => [
    { emoji: "👻", name: "Алексей", team: "red", online: false, role: "player", status: "waiting" },
    { emoji: "🤖", name: "Мария", team: "blue", online: false, role: "player", status: "waiting" },
    { emoji: "🦊", name: "Иван", team: "none", online: false, role: "undefined", status: "waiting" },
  ])
  const toggle = (playerData: PlayerStatusRow) => {
    setPlayers(players => players.map(p => (
      p === playerData ? {...p, online: !p.online} : p
    )))
  }
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} onClick={toggle} />
    </div>
  );
};

export const ChangeEmoji: Story = () => {
  const emojis = ["👻", "🤖", "🦊", "👽", "🐙", "🎃", "🦄", "🐸", "🦋", "🐯"];
  const [players, setPlayers] = useState<PlayerStatusRow[]>(() => [
    { emoji: "👻", name: "Алексей", team: "red", online: true, role: "player", status: "waiting" },
    { emoji: "🤖", name: "Мария", team: "blue", online: true, role: "player", status: "waiting" },
    { emoji: "🦊", name: "Иван", team: "none", online: true, role: "undefined", status: "waiting" },
  ])
  const toggle = (playerData: PlayerStatusRow) => {
    setPlayers(players => players.map(p => (
      p === playerData ? {...p, emoji: emojis[(emojis.indexOf(p.emoji) + 1) % emojis.length]} : p
    )))
  }
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} onClick={toggle} />
    </div>
  );
};


export const SingleTeam: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", name: "Алексей", team: "red", online: true, role: "captain", status: "waiting" },
    { emoji: "🤖", name: "Мария", team: "red", online: true, role: "player", status: "answered" },
    { emoji: "🦊", name: "Иван", team: "red", online: true, role: "player", status: "answered" },
    { emoji: "👽", name: "Ольга", team: "red", online: true, role: "player", status: "wrong" },
    { emoji: "🦄", name: "Игорь", team: "none", online: true, role: "player", status: "right" },
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
    name: name,
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

export const Interactive: Story = () => {
  function generatePlayers(){
    const names = ["Анна", "Борис", "Вера", "Георгий", "Дарья", "Евгений", "Жанна", "Захар", "Ирина", "Кирилл"].sort(() => Math.random() - 0.5);
    const emojis = ["👻", "🤖", "🦊", "👽", "🐙", "🎃", "🦄", "🐸", "🦋", "🐯"];
    const players: PlayerStatusRow[] = names.map((name, i) => ({
      emoji: emojis[i],
      name: name,
      team: (["red", "blue", "none"] as const)[Math.floor(Math.random() * 3)],
      online: Math.random() > 0.2,
      role: i === 0 ? "captain" as const : "player" as const,
      status: (["answered", "typing", "waiting", "wrong", "right"] as const)[Math.floor(Math.random() * 5)],
    }));
    return players.slice(Math.floor(Math.random() * 5));
  }
  const [players, setPlayers] = useState(() => generatePlayers())
  
  function shuffle(){
    setPlayers(() => generatePlayers());
  }
  
  function remove(playerData: PlayerStatusRow){
    console.log("===", players, playerData);
    setPlayers(players => players.filter(p => p !== playerData));
  }
  console.log(players.length);
  
  return (
    <div style={{ width: 320 }} >
      <button style={{userSelect: "none"}} onClick={shuffle}> shuffle ({players.length}) </button>
      <span> click on player to remove </span>
      <PlayerStatusTable players={players} onClick={remove} />
    </div>
  );
};

export const UndefinedRoles: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", name: "Новый 1", team: "none", online: true, role: "undefined", status: "waiting" },
    { emoji: "🤖", name: "Новый 2", team: "none", online: true, role: "undefined", status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const LobbyMode: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "😈", name: "Алексей", team: "red", online: true, status: "right" },
    { emoji: "👻", name: "Маша", team: "red", online: true, status: "right" },
    { emoji: "🤖", name: "Дима", team: "red", online: true, status: "waiting" },
    { emoji: "🐱", name: "Вова", team: "red", online: false, status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <p>Lobby mode: draggable rows, ready (✅) and waiting (⏳) statuses</p>
      <PlayerStatusTable
        players={players}
        draggable
      />
    </div>
  );
};
