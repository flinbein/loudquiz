import { usePhase, useCurrentRound, useTeams, useCurrentQuestion } from "@/store/selectors";
import { activateJoker } from "@/store/actions/round";
import { JokerState } from "@/components/JokerState/JokerState";
import { ScoreFormula } from "@/components/ScoreFormula/ScoreFormula";
import styles from "./HostRound.module.css";
import { StickersContent } from "./HostRound.StickersContent";
import { TaskCardBlock } from "../blocks/TaskCardBlock";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";

export function MainContent(){
  // Main area content by phase
  const phase = usePhase();
  
  return (
    <div className={styles.main}>
      {(phase === "round-captain" || phase === "round-pick") ? (
        <DisplaySelectTask />
      ) : (
        <DisplayRoundPlay />
      )}
    </div>
  );
}

function DisplaySelectTask(){
  const round = useCurrentRound();
  const teams = useTeams();
  
  const jokerTeam = teams.find((t) => t.id === round?.teamId);
  const jokerState = jokerTeam?.jokerUsed
    ? "disabled"
    : round?.jokerActive ? "active" : "enabled";
  
  return (
    <>
      <TaskBoardBlock hostSelect />
      <JokerState state={jokerState} onClick={activateJoker} />
    </>
  );
}

function DisplayRoundPlay(){
  const round = useCurrentRound();
  const phase = usePhase();
  const review = round?.reviewResult;
  const question = useCurrentQuestion();
  
  const correctCount = review?.groups.filter((group) => {
    const eval_ = review?.evaluations.find((e) => e.playerName === group[0]);
    return eval_?.correct === true;
  }).length ?? 0;
  const totalScore = review?.score ?? 0;
  
  return (
    <>
      <TaskCardBlock />
      <StickersContent/>
      {phase === "round-result" && (
        <ScoreFormula
          difficulty={question?.difficulty ?? 0}
          correctCount={correctCount}
          jokerActive={round?.jokerActive ?? false}
          bonusTimeMultiplier={review?.bonusTimeMultiplier ?? 0}
          bonusTimeApplied={review?.bonusTimeApplied ?? false}
          totalScore={totalScore}
        />
      )}
      
    </>
  )
}