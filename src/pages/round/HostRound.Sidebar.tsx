import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePhase, useCurrentRound, useTeams, usePlayers, useTimer as useTimerState, } from "@/store/selectors";
import { getActiveTimerDuration } from "@/logic/timer";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import {
  PlayerStatusTable,
  type PlayerRole,
  type PlayerStatus,
} from "@/components/PlayerStatusTable/PlayerStatusTable";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import type { GameState, RoundPhase } from "@/types/game";
import styles from "./HostRound.module.css";
import { SidebarActions } from "./HostRound.SidebarActions";

function getPlayerRoundInfo(
  phase: RoundPhase,
  playerName: string,
  round: NonNullable<GameState["currentRound"]>,
  playerReady: boolean,
): { role: PlayerRole; status?: PlayerStatus } {
  const isCaptain = round.captainName === playerName;
  if (isCaptain) return { role: "captain" };

  const answer = round.answers[playerName];
  const evaluation = round.reviewResult?.evaluations.find(
    (e) => e.playerName === playerName,
  );

  switch (phase) {
    case "round-captain":
    case "round-pick":
      return { role: "player", status: "waiting" };
    case "round-ready":
      return { role: "player", status: playerReady ? undefined : "waiting" };
    case "round-active":
      if (!answer) return { role: "player", status: "typing" };
      return { role: "player", status: answer.text === "" ? "wrong" : "answered" };
    case "round-answer":
      if (!answer) return { role: "player", status: "typing" };
      if (answer.text === "") return { role: "player", status: "wrong" };
      if (evaluation?.correct === true) return { role: "player", status: "right" };
      if (evaluation?.correct === false) return { role: "player", status: "wrong" };
      return { role: "player", status: "answered" };
    case "round-review":
    case "round-result":
      if (evaluation?.correct === true) return { role: "player", status: "right" };
      if (evaluation?.correct === false) return { role: "player", status: "wrong" };
      return { role: "player" };
    default:
      return { role: "player" };
  }
}

export function Sidebar() {
  const teams = useTeams();
  const players = usePlayers();
  const phase = usePhase() as RoundPhase;
  const round = useCurrentRound();
  const { t } = useTranslation();
  
  if (!round) return null;
  
  const showBonusTime = phase === "round-review" || phase === "round-result";
  const activeTeam = teams.find(team => team.id === round.teamId);
  const teamPlayers = players.filter((p) => p.team === activeTeam?.id);
  
  return (
    <div className={styles.sidebar}>
      <TeamScore teams={teams} />
      <TimerView/>
      {showBonusTime && <BonusTimeInfo />}
      <TeamGroup
        label={t(`team.${activeTeam?.id}`)}
        teamColor={activeTeam?.id ?? "none"}
        playerCount={teamPlayers.length}
      >
        <PlayerStatusTable
          players={teamPlayers.map((p) => ({
            ...p, ...getPlayerRoundInfo(phase, p.name, round, p.ready)
          }))}
        />
      </TeamGroup>
      <SidebarActions />
    </div>
  )
}

function BonusTimeInfo(){
  const teams = useTeams();
  const players = usePlayers();
  const phase = usePhase() as RoundPhase;
  const round = useCurrentRound();
  
  const bonusTimeInfo = useMemo(() => {
    if (!round) return { seconds: 0, multiplier: 1, active: false };
    
    const active = round.reviewResult?.bonusTimeApplied;
    return {
      seconds: Math.floor((round.reviewResult?.bonusTime ?? 0) / 1000),
      multiplier: active ? round.reviewResult?.bonusTimeMultiplier : 1,
      active
    };
  }, [teams, players, phase, round]);
  
  if (!bonusTimeInfo) return null;
  
  return (
    <div className={styles.bonusTime}>
      <span className={bonusTimeInfo.active ? styles.bonusTimeValue : styles.bonusTimeStruck}>
        {String(Math.floor(bonusTimeInfo.seconds / 60)).padStart(2, "0")}
        :{String(bonusTimeInfo.seconds % 60).padStart(2, "0")}
      </span>
      <span className={styles.bonusTimeLabel}>
        {"🪙\u00A0\u00A0× " + (bonusTimeInfo.active ? bonusTimeInfo?.multiplier?.toFixed(2) : "1")}
      </span>
    </div>
  )
}

function TimerView(){
  const timer = useTimerState();
  if (!timer) return null;
  return (
    <CircleTimer startedAt={timer.startedAt} durationMs={timer.duration} />
  )
}