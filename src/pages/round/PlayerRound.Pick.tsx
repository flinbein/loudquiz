import { useGameStore } from "@/store/gameStore";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerRound.module.css";
import { useCurrentRound } from "@/store/selectors";
import { JokerState } from "@/components/JokerState/JokerState";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";

interface PlayerRoundPickProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

export function PlayerRoundPick({sendAction, playerName}: PlayerRoundPickProps){
  const teams = useGameStore((s) => s.teams);
  const round = useCurrentRound();
  const isCaptain = round?.captainName === playerName;
  
  const activeTeam = teams.find((t) => t.id === round?.teamId);
  const jokerState = activeTeam?.jokerUsed
    ? "disabled"
    : round?.jokerActive ? "active" : "enabled";
  
  return (
    <div className={styles.container}>
      <TaskBoardBlock playerName={playerName} sendAction={sendAction} />
      <JokerState
        state={jokerState}
        onClick={isCaptain ? () => sendAction({ kind: "activate-joker" }) : undefined}
      />
    </div>
  );
  
}