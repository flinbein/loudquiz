import { useTranslation } from "react-i18next";
import { usePhase, useCurrentRound, useTeams, usePlayers, useTimer as useTimerState, } from "@/store/selectors";
import { confirmBlitzReview, startBlitzTask } from "@/store/actions/blitz";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import { PlayerStatusTable, type PlayerRole, type PlayerStatus } from "@/components/PlayerStatusTable/PlayerStatusTable";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import { GamePhase, GameState } from "@/types/game";
import { useMemo } from "react";
import { confirmReview, confirmScore, disputeReview, forceTeamCaptain, startRoundTask } from "@/store/actions/round";
import styles from "./SidebarBlock.module.css";

function getPlayerInfo(
  phase: GamePhase,
  playerName: string,
  round: NonNullable<GameState["currentRound"]>,
  playerReady: boolean,
): { role: PlayerRole; status?: PlayerStatus; blitzOrder?: number } {
  const order = round.playerOrder ?? [];
  const isCaptain = round.captainName === playerName;
  const slot = order.indexOf(playerName); // 0 = captain, 1..N = responders
  const blitzOrder = slot > 0 ? slot : undefined;
  const role: PlayerRole = blitzOrder != null ? "blitz-player" : "player";
  const answer = round.answers[playerName];
  const evaluation = round.reviewResult?.evaluations.find(
    (e) => e.playerName === playerName,
  );
  
  if (isCaptain) return { role: "captain" };

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
    case "blitz-captain":
      return { role, status: blitzOrder == null ? "waiting" : undefined, blitzOrder };
    case "blitz-pick":
      return { role, status: "waiting", blitzOrder };
    case "blitz-ready":
      return { role, status: playerReady ? undefined : "waiting", blitzOrder };
    case "blitz-active": {
      const answer = round.answers[playerName];
      if (answer) return { role, status: "answered", blitzOrder };
      return { role, status: "typing", blitzOrder };
    }
    case "blitz-answer": {
      const answer = round.answers[playerName];
      if (answer) return { role, status: answer.text === "" ? "wrong" : "right", blitzOrder };
      return { role, status: "typing", blitzOrder };
    }
    case "blitz-review": {
      const evaluation = round.reviewResult?.evaluations.find((e) => e.playerName === playerName);
      if (evaluation?.correct === true) return { role, status: "right", blitzOrder };
      if (evaluation?.correct === false) return { role, status: "wrong", blitzOrder };
      return { role, blitzOrder };
    }
    default:
      return { role };
  }
}

export function SidebarBlock() {
  const teams = useTeams();
  const players = usePlayers();
  const phase = usePhase();
  const round = useCurrentRound();
  const { t } = useTranslation();

  if (!round) return null;
  
  const showBonusTime = phase === "round-review" || phase === "round-result";
  const activeTeam = teams.find(team => team.id === round.teamId);
  const teamPlayers = players.filter((p) => p.team === activeTeam?.id);

  return (
    <div className={styles.sidebar}>
      <TeamScore teams={teams} />
      <TimerView />
      {showBonusTime && <BonusTimeInfo />}
      <TeamGroup
        label={t(`team.${activeTeam?.id}`)}
        teamColor={activeTeam?.id ?? "none"}
        playerCount={teamPlayers.length}
      >
        <PlayerStatusTable
          players={teamPlayers.map((p) => ({
            ...p, ...getPlayerInfo(phase, p.name, round, p.ready)
          }))}
        />
      </TeamGroup>
      
      <SidebarActions />
    </div>
  );
}

function SidebarActions() {
  const { t } = useTranslation();
  const phase = usePhase();
  
  if (phase === "round-captain") return (
    <div className={styles.actions}>
      <button className={styles.primaryBtn} onClick={() => forceTeamCaptain()}>
        {t("round.captain")}
      </button>
    </div>
  );
  
  if (phase === "round-ready") return (
    <div className={styles.actions}>
      <button className={styles.primaryBtn} onClick={() => startRoundTask()}>
        {t("lobby.start")}
      </button>
    </div>
  );
  
  
  if (phase === "blitz-ready") return (
    <div className={styles.actions}>
      <button className={styles.primaryBtn} onClick={() => startBlitzTask()}>
        {t("lobby.start")}
      </button>
    </div>
  );
  
  if (phase === "round-review") return (
    <div className={styles.actions}>
      <button className={styles.primaryBtn} onClick={() => confirmScore()}>
        {t("round.next")}
      </button>
    </div>
  );
  
  if (phase === "round-result") return (
    <div className={styles.actions}>
      <button className={styles.secondaryBtn} onClick={() => disputeReview()}>
        {t("round.dispute")}
      </button>
      <button className={styles.primaryBtn} onClick={() => confirmReview()}>
        {t("round.nextRound")}
      </button>
    </div>
  );
  if (phase === "blitz-review") {
    return (
      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={() => confirmBlitzReview()}>
          {t("round.nextRound")}
        </button>
      </div>
    );
  }
  return null;
}

function BonusTimeInfo(){
  const teams = useTeams();
  const players = usePlayers();
  const phase = usePhase();
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


function TimerView() {
  const roundName = useRoundName();
  const timer = useTimerState();
  if (!timer) return null;
  return (
    <CircleTimer startedAt={timer.startedAt} durationMs={timer.duration}>
      {roundName}
    </CircleTimer>
  )
}

function useRoundName(){
  const phase = usePhase();
  const { t } = useTranslation();
  if (phase === "round-captain" || phase === "blitz-captain") return t("round.captain");
  if (phase === "round-pick" || phase === "blitz-pick") return t("round.pick");
  if (phase === "round-ready" || phase === "blitz-ready") return t("round.ready");
  if (phase === "round-active" || phase === "blitz-active") return t("round.active");
  if (phase === "round-answer" || phase === "blitz-answer") return t("round.answer");
  if (phase === "round-review" || phase === "blitz-review") return t("round.review");
  return null;
}
