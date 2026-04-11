import { usePhase } from "@/store/selectors";
import type { RoundPhase } from "@/types/game";
import type { PlayerAction } from "@/types/transport";
import { PlayerRoundCaptain } from "./PlayerRound.Captain";
import { PlayerRoundPick } from "./PlayerRound.Pick";
import { PlayerRoundGame } from "./PlayerRound.Game";

interface PlayerRoundProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

export function PlayerRound({ playerName, sendAction }: PlayerRoundProps) {
  const phase = usePhase() as RoundPhase;

  if (phase === "round-captain") {
    return <PlayerRoundCaptain playerName={playerName} sendAction={sendAction} />
  }
  
  if (phase === "round-pick") {
    return <PlayerRoundPick playerName={playerName} sendAction={sendAction} />
  }
  
  return <PlayerRoundGame playerName={playerName} sendAction={sendAction} />
}
