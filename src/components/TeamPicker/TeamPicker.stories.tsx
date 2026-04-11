import type { Story } from "@ladle/react";
import { TeamPicker } from "./TeamPicker";
import { useState } from "react";
import { PlayerData, TeamId } from "@/types/game";

const EMOJIS = ["👻", "🤖", "🦊", "👽", "🐙", "🎃", "🐔"];
function usePlayer(team: TeamId  = "none"){
  const [player, setPlayer] = useState<PlayerData>({
    ready: false,
    emoji: EMOJIS[0],
    team: "none",
    online: true,
    name: "Василий Иванович",
  });
  
  return [
    player,
    () => setPlayer(p => ({ ...p, emoji: EMOJIS[(EMOJIS.indexOf(p.emoji) + 1) % EMOJIS.length] })),
    (team: TeamId) => setPlayer(p => ({ ...p, team}))
  ] as const
}

export const OneTeam: Story = () => {
  const [player, changeEmoji, selectTeam] = usePlayer("none");
  return <TeamPicker teamMode="single" player={player} onSelectTeam={selectTeam} onChangeEmoji={changeEmoji} noneCount={10} />
};

export const TwoTeams: Story = () => {
  const [player, changeEmoji, selectTeam] = usePlayer("none");
  return <>
    <TeamPicker teamMode="dual" player={player} onSelectTeam={selectTeam} onChangeEmoji={changeEmoji} redCount={5} blueCount={10} noneCount={10} />
    <button onClick={() => selectTeam("none")}>reset team</button>
  </>
};


export const ChangeMode: Story = () => {
  const [player, changeEmoji, selectTeam] = usePlayer("none");
  const [mode, setMode] = useState<"dual" | "single">("dual")
  return <>
    <TeamPicker teamMode={mode} player={player} onSelectTeam={selectTeam} onChangeEmoji={changeEmoji} redCount={5} blueCount={10} noneCount={10} />
    <button onClick={() => selectTeam("none")}>reset team</button>
    <button onClick={() => setMode("dual")}>dual</button>
    <button onClick={() => setMode("single")}>single</button>
  </>
};