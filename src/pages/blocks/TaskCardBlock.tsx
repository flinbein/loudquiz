import { usePhase, useCurrentRound, usePlayers } from "@/store/selectors";
import { useMemo } from "react";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { useGameStore } from "@/store/gameStore";
import { useTranslation } from "react-i18next";
import styles from "./TaskCardBlock.module.css"
import { PlayerData, RoundState } from "@/types/game";


interface TaskCardBlockProps {
  playerName?: string
  alwaysOpen?: boolean;
}
export function TaskCardBlock({playerName, alwaysOpen}: TaskCardBlockProps) {
  const round = useCurrentRound();
  const players = usePlayers();
  const captain = players.find((p) => p.name === round?.captainName);
  const isCaptain = round?.captainName === playerName;
  
  if (round?.type === "round") return (
    <TaskCardBlockRound round={round} alwaysOpen={alwaysOpen} captain={captain} isCaptain={isCaptain} />
  )
  if (round?.type === "blitz") return (
    <TaskCardBlockBlitz round={round} alwaysOpen={alwaysOpen} captain={captain} isCaptain={isCaptain} />
  )
  return null;
}

interface TaskCardBlockRoundProps {
  captain?: PlayerData;
  isCaptain?: boolean;
  alwaysOpen?: boolean;
  round: RoundState;
}
function TaskCardBlockRound({ captain, isCaptain, round, alwaysOpen }: TaskCardBlockRoundProps){
  const topics = useGameStore((s) => s.topics);
  const phase = usePhase();
  const currentQuestion = useMemo(() => {
    if (round?.questionIndex == null) return undefined;
    let remaining = round.questionIndex;
    for (const topic of topics) {
      if (remaining < topic.questions.length) {
        return { topic, question: topic.questions[remaining] };
      }
      remaining -= topic.questions.length;
    }
    return undefined;
  }, [round?.questionIndex, topics]);
  
  const taskVisible = alwaysOpen || (
    phase === "round-active" && isCaptain
    || phase === "round-answer" && isCaptain
    || phase === "round-review"
    || phase === "round-result"
  );
  
  if (!currentQuestion) return null;
  
  return (
    <div className={styles.taskCardWrap}>
      <TaskCard
        topic={currentQuestion.topic.name}
        player={captain}
        difficulty={currentQuestion.question?.difficulty ?? 0}
        question={currentQuestion.question?.text ?? ""}
        hidden={!taskVisible}
      />
    </div>
  )
}

interface TaskCardBlockBlitzProps {
  captain?: PlayerData;
  isCaptain?: boolean;
  alwaysOpen?: boolean;
  round: RoundState;
}
function TaskCardBlockBlitz({round, captain, alwaysOpen, isCaptain}: TaskCardBlockBlitzProps){
  const phase = usePhase();
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  
  if (round.blitzTaskIndex == null) return null;
  
  const taskVisible = alwaysOpen || (
    phase === "blitz-active" && isCaptain
    || phase === "blitz-pick" && isCaptain
    || phase === "blitz-answer" && isCaptain
    || phase === "blitz-review"
  );
  
  const currentTask = blitzTasks[round.blitzTaskIndex ?? 0];
  const currentItem =
    currentTask && round?.blitzItemIndex != null
      ? currentTask.items[round.blitzItemIndex]
      : undefined;
  
  const { t } = useTranslation();
  return (
    <div className={styles.taskCardWrap}>
      <TaskCard
        topic={t("blitz.taskTitle")}
        player={captain}
        difficulty={currentItem?.difficulty ?? 0}
        question={currentItem?.text ?? ""}
        hidden={!taskVisible}
      />
    </div>
  );
}
