import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerRound.module.css";
import { TaskView, type TaskViewBlitz, TaskViewQuestion, type TaskViewTopic } from "@/components/TaskView/TaskView";
import { toLinearQuestionIndex, useCurrentRound } from "@/store/selectors";
import { useMemo } from "react";
import { JokerState } from "@/components/JokerState/JokerState";

interface PlayerRoundPickProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

export function PlayerRoundPick({sendAction, playerName}: PlayerRoundPickProps){
  const { t } = useTranslation();
  const topics = useGameStore((s) => s.topics);
  const players = useGameStore((s) => s.players);
  const history = useGameStore((s) => s.history);
  const teams = useGameStore((s) => s.teams);
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const round = useCurrentRound();
  const isCaptain = round?.captainName === playerName;
  
  const taskViewTopics: TaskViewTopic[] = useMemo(() => {
    return topics.map((topic, topicIdx) => ({
      name: topic.name,
      questions: topic.questions.map((q, qIdx) => {
        const linearIdx = toLinearQuestionIndex(
          useGameStore.getState(),
          topicIdx,
          qIdx,
        );
        const roundResult = history.find(v => v.questionIndex === linearIdx);
        const isActive = round?.questionIndex === linearIdx;
        return {
          open: roundResult != null || isActive,
          active: isActive,
          player: players.find(p => p.name === roundResult?.captainName),
          jokerUsed: history.find(v => v.questionIndex === linearIdx)?.jokerUsed ?? false,
          difficulty: q.difficulty,
        } satisfies TaskViewQuestion;
      }),
    }));
  }, [history, topics, round, players]);
  
  const taskViewBlitz: TaskViewBlitz[] = blitzTasks.map(() => ({
    active: false,
    team: undefined,
    score: undefined,
  }));
  
  const activeTeam = teams.find((t) => t.id === round?.teamId);
  const jokerState = activeTeam?.jokerUsed
    ? "disabled"
    : round?.jokerActive ? "active" : "enabled";
  
  return (
    <div className={styles.container}>
      <div className={styles.phaseInfo}>{t("round.pick")}</div>
      <TaskView
        topics={taskViewTopics}
        blitzRounds={taskViewBlitz}
        onSelectQuestion={isCaptain ? (topicIdx, questionIdx) => {
          const linearIdx = toLinearQuestionIndex(
            useGameStore.getState(),
            topicIdx,
            questionIdx,
          );
          sendAction({ kind: "select-question", questionIndex: linearIdx });
        } : undefined}
      />
      <JokerState
        state={jokerState}
        onClick={isCaptain ? () => sendAction({ kind: "activate-joker" }) : undefined}
      />
    </div>
  );
  
}