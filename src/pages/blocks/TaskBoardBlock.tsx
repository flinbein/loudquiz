import { useCurrentRound, toLinearQuestionIndex } from "@/store/selectors";
import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { TaskBoard, type TaskViewBlitz, TaskViewQuestion, type TaskViewTopic } from "@/components/TaskBoard/TaskBoard";
import type { PlayerAction } from "@/types/transport";
import { selectQuestion } from "@/store/actions/round";
import { getPlayedBlitzTaskIds } from "@/logic/phaseTransitions";

interface TaskViewBlockProps {
  hostSelect?: boolean;
  playerName?: string;
  sendAction?: (action: PlayerAction) => void;
}
export function TaskBoardBlock({hostSelect, playerName, sendAction}: TaskViewBlockProps) {
  const topics = useGameStore((s) => s.topics);
  const players = useGameStore((s) => s.players);
  const history = useGameStore((s) => s.history);
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const round = useCurrentRound();
  const isCaptain = round?.captainName === playerName;
  const playedBlitzIds = new Set(getPlayedBlitzTaskIds(history));
  
  const onSelectQuestion = useMemo(() => {
    if (hostSelect) return (topicIdx: number, questionIdx: number) => {
      const linearIdx = toLinearQuestionIndex(
        useGameStore.getState(),
        topicIdx,
        questionIdx,
      );
      selectQuestion(linearIdx);
    }
    if (isCaptain && sendAction) return (topicIdx: number, questionIdx: number) => {
      const linearIdx = toLinearQuestionIndex(
        useGameStore.getState(),
        topicIdx,
        questionIdx,
      );
      sendAction({ kind: "select-question", questionIndex: linearIdx });
    }
    return undefined;
  }, [isCaptain, sendAction]);
  
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
        const isActive = round?.type === "round" && round?.questionIndex === linearIdx;
        return {
          open: roundResult != null || isActive,
          active: isActive,
          player: players.find(p => p.name === roundResult?.captainName),
          jokerUsed: history.find(v => v.questionIndex === linearIdx)?.jokerUsed ?? false,
          difficulty: q.difficulty,
          totalScore: isActive ? undefined : roundResult?.score
        } satisfies TaskViewQuestion;
      }),
    }));
  }, [history, topics, round, players]);
  
  const taskViewBlitz: TaskViewBlitz[] = blitzTasks.map((_, index) => {
    const played = playedBlitzIds.has(index);
    const isActive = round?.blitzTaskIndex === index;
    const result = history.find((r) => r.type === "blitz" && r.blitzTaskIndex === index);
    const team = result?.teamId;
    return {
      active: isActive && !played,
      team: team,
      score: result?.score,
    };
  });
  
  return (
    <TaskBoard topics={taskViewTopics} blitzRounds={taskViewBlitz} onSelectQuestion={onSelectQuestion} />
  )
}
