import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  usePhase,
  useCurrentRound,
  useTeams,
  usePlayers,
  useTimer as useTimerState,
  useTopicsSuggest,
  useSettings,
} from "@/store/selectors";
import { confirmBlitzReview, startBlitzTask } from "@/store/actions/blitz";
import { playAgain } from "@/store/actions/lobby";
import { useGameStore } from "@/store/gameStore";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import { PlayerStatusTable, type PlayerRole, type PlayerStatus } from "@/components/PlayerStatusTable/PlayerStatusTable";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import { GamePhase, GameState, TeamId } from "@/types/game";
import { useMemo } from "react";
import { confirmReview, confirmScore, disputeReview, forceTeamCaptain, startRoundTask } from "@/store/actions/round";
import styles from "./SidebarBlock.module.css";
import { startFirstRound } from "@/store/actions/topicsSuggest";

function getPlayerInfo(
  phase: GamePhase,
  playerName: string,
  round: GameState["currentRound"],
  playerReady: boolean,
  settings: GameState["settings"],
  topicsSuggest: GameState["topicsSuggest"]
): { role: PlayerRole; status?: PlayerStatus; blitzOrder?: number } {
  const order = round?.playerOrder ?? [];
  const isCaptain = round?.captainName === playerName;
  const slot = order.indexOf(playerName); // 0 = captain, 1..N = responders
  const blitzOrder = slot > 0 ? slot : undefined;
  const role: PlayerRole = isCaptain ? "captain" : (slot > 0) ? "blitz-player" : "player";
  const answer = round?.answers?.[playerName];
  const evaluation = round?.reviewResult?.evaluations?.find(
    (e) => e.playerName === playerName,
  );

  switch (phase) {
    case "topics-collecting":
    case "topics-generating":
    case "topics-preview": {
      const mine = topicsSuggest?.suggestions[playerName]?.length ?? 0;
      const noIdeas = topicsSuggest?.noIdeas.includes(playerName) ?? false;
      let status: PlayerStatus = "waiting";
      if (noIdeas) status = "wrong";
      else if (mine >= settings.topicCount) status = "right";
      else if (mine > 0) status = "answered";
      return { role, status };
    }
    case "round-captain":
    case "round-pick":
      return { role, status: "waiting" };
    case "round-ready":
      return { role, status: playerReady ? undefined : "waiting" };
    case "round-active":
      if (!answer) return { role, status: "typing" };
      return { role, status: answer.text === "" ? "wrong" : "answered" };
    case "round-answer":
      if (!answer) return { role, status: "typing" };
      if (answer.text === "") return { role, status: "wrong" };
      if (evaluation?.correct === true) return { role, status: "right" };
      if (evaluation?.correct === false) return { role, status: "wrong" };
      return { role, status: "answered" };
    case "round-review":
    case "round-result":
      if (evaluation?.correct === true) return { role, status: "right" };
      if (evaluation?.correct === false) return { role, status: "wrong" };
      return { role };
    case "blitz-captain":
      return { role, status: slot ? "waiting" : undefined, blitzOrder };
    case "blitz-pick":
      return { role, status: "waiting", blitzOrder };
    case "blitz-ready":
      return { role, status: playerReady ? undefined : "waiting", blitzOrder };
    case "blitz-active": {
      const answer = round?.answers?.[playerName];
      if (answer) return { role, status: "answered", blitzOrder };
      return { role, status: "typing", blitzOrder };
    }
    case "blitz-answer": {
      const answer = round?.answers?.[playerName];
      if (answer) return { role, status: answer.text === "" ? "wrong" : "right", blitzOrder };
      return { role, status: "typing", blitzOrder };
    }
    case "blitz-review": {
      const evaluation = round?.reviewResult?.evaluations.find((e) => e.playerName === playerName);
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
  const phase = usePhase();
  
  const showBonusTime = phase === "round-review" || phase === "round-result";
  
  return (
    <div className={styles.sidebar}>
      <TeamScore teams={teams} />
      <TimerView />
      {showBonusTime && <BonusTimeInfo />}
      <TeamsBlock/>
      
      <SidebarActions />
    </div>
  );
}

function TeamsBlock(){
  const teams = useTeams();
  const round = useCurrentRound();
  if (round?.teamId) return <TeamBlock teamId={round?.teamId} />
  return teams.map(team => <TeamBlock teamId={team.id} key={team.id} />);
}

function TeamBlock({teamId}: {teamId?: TeamId}) {
  const { t } = useTranslation();
  const players = usePlayers();
  const phase = usePhase();
  const round = useCurrentRound();
  const ts = useTopicsSuggest();
  const settings = useSettings();
  const teamPlayers = players.filter((p) => !teamId || (p.team === teamId));
  return (
    <TeamGroup
      label={t(`team.${teamId}`)}
      teamColor={teamId ?? "none"}
      playerCount={teamPlayers.length}
    >
      <PlayerStatusTable
        players={teamPlayers.map((p) => ({
          ...p, ...getPlayerInfo(phase, p.name, round, p.ready, settings, ts)
        }))}
      />
    </TeamGroup>
  );
}

function SidebarActions() {
  const { t } = useTranslation();
  const phase = usePhase();
  const settings = useSettings();
  const navigate = useNavigate();
  
  if (phase === "topics-preview") return (
    <div className={styles.actions}>
      <button className={styles.primaryBtn} onClick={() => startFirstRound()}>
        {t("topics.preview.startRound")}
      </button>
    </div>
  );
  
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
  if (phase === "finale") {
    const handleNewGame = () => {
      useGameStore.getState().resetGame();
      navigate("/setup");
    };
    return (
      <div className={styles.actions}>
        {settings.mode === "ai" && (
          <button className={styles.primaryBtn} onClick={() => playAgain()}>
            {t("finale.playAgain")}
          </button>
        )}
        <button className={styles.secondaryBtn} onClick={handleNewGame}>
          {t("finale.newGame")}
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
