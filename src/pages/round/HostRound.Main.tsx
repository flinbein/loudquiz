import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import { usePhase, useCurrentRound, useTeams, usePlayers, toLinearQuestionIndex } from "@/store/selectors";
import { getPlayedQuestionIndices } from "@/logic/phaseTransitions";
import { selectQuestion, activateJoker } from "@/store/actions/round";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "@/components/TaskView/TaskView";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { JokerState } from "@/components/JokerState/JokerState";
import { ScoreFormula } from "@/components/ScoreFormula/ScoreFormula";
import type { GameState, RoundPhase} from "@/types/game";
import styles from "./HostRound.module.css";
import { StickersContent } from "./HostRound.StickersContent";

export function MainContent(){
  // Main area content by phase
  const phase = usePhase() as RoundPhase;
  
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
  const topics = useGameStore((s) => s.topics);
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const history = useGameStore((s) => s.history);
  const round = useCurrentRound();
  const teams = useTeams();
  const players = usePlayers();
  
  const playedIndices = getPlayedQuestionIndices(history);
  
  const jokerTeam = teams.find((t) => t.id === round?.teamId);
  const jokerState = jokerTeam?.jokerUsed
    ? "disabled"
    : round?.jokerActive ? "active" : "enabled";
  
  const taskViewTopics: TaskViewTopic[] = topics.map((topic, topicIdx) => ({
    name: topic.name,
    questions: topic.questions.map((q, qIdx) => {
      const linearIdx = toLinearQuestionIndex({ topics } as GameState, topicIdx, qIdx);
      const isPlayed = playedIndices.includes(linearIdx);
      const isActive = round?.questionIndex === linearIdx;
      const roundResult = history.find(
        (r) => r.type === "round" && r.questionIndex === linearIdx,
      );
      const captainP = isPlayed
        ? players.find((p) => p.name === roundResult?.captainName)
        : undefined;
      return {
        open: isPlayed || isActive,
        active: isActive,
        player: captainP,
        jokerUsed: roundResult?.jokerUsed ?? false,
        difficulty: q.difficulty,
        totalScore: roundResult?.score,
        paperColor: captainP?.team ?? "none",
      };
    }),
  }));
  
  const taskViewBlitz: TaskViewBlitz[] = blitzTasks.map((_, bi) => {
    const blitzResult = history.find((r) => r.type === "blitz" && r.blitzTaskId === blitzTasks[bi].id);
    const blitzTeam = blitzResult ? teams.find((t) => t.id === blitzResult.teamId) : undefined;
    return {
      active: false,
      team: blitzTeam?.id,
      score: blitzResult?.score,
    };
  });
  
  
  return (
    <>
      <TaskView
        topics={taskViewTopics}
        blitzRounds={taskViewBlitz}
        onSelectQuestion={(topicIdx, questionIdx) => {
          const linearIdx = toLinearQuestionIndex(
            { topics } as GameState,
            topicIdx,
            questionIdx,
          );
          selectQuestion(linearIdx);
        }}
      />
      <JokerState state={jokerState} onClick={activateJoker} />
    </>
  );
  
}

function DisplayRoundPlay(){
  const round = useCurrentRound();
  const phase = usePhase();
  const players = usePlayers();
  const topics = useGameStore((s) => s.topics);
  const captain = players.find((p) => p.name === round?.captainName);
  const review = round?.reviewResult;
  
  const correctCount = review?.groups.filter((group) => {
    const eval_ = review?.evaluations.find((e) => e.playerName === group[0]);
    return eval_?.correct === true;
  }).length ?? 0;
  const totalScore = review?.score ?? 0;
  
  // Current question info
  const currentQuestion =
    round?.questionIndex != null
      ? (() => {
        let remaining = round.questionIndex;
        for (const topic of topics) {
          if (remaining < topic.questions.length) {
            return { question: topic.questions[remaining], topic };
          }
          remaining -= topic.questions.length;
        }
        return undefined;
      })()
      : undefined;
  
  const difficulty = currentQuestion?.question.difficulty ?? 100;
  const showTaskCard = phase === "round-review" || phase === "round-result";
  
  return (
    <>
      <div className={styles.taskCardWrap}>
        <TaskCard
          topic={currentQuestion?.topic.name}
          hidden={!showTaskCard}
          player={captain}
          difficulty={currentQuestion?.question.difficulty ?? 0}
          question={currentQuestion?.question.text ?? ""}
        />
      </div>
      <StickersContent/>
      {phase === "round-result" && (
        <ScoreFormula
          difficulty={difficulty}
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