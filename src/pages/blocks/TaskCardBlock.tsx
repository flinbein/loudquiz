import { usePhase, useCurrentRound, usePlayers, useSettings } from "@/store/selectors";
import { useEffect, useMemo, useState } from "react";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { useGameStore } from "@/store/gameStore";
import { useTranslation } from "react-i18next";
import styles from "./TaskCardBlock.module.css";
import type { RoundState } from "@/types/game";

interface TaskCardBlockProps {
  playerName?: string;
  alwaysOpen?: boolean;
}

export function TaskCardBlock({ playerName, alwaysOpen }: TaskCardBlockProps) {
  const round = useCurrentRound();
  const players = usePlayers();
  const captain = players.find((p) => p.name === round?.captainName);
  const settings = useSettings();

  const myPlayer = playerName ? players.find((p) => p.name === playerName) : undefined;
  const isCaptain = round?.captainName === playerName;
  const isDual = settings.teamMode === "dual";
  const isInActiveTeam = myPlayer ? myPlayer.team === round?.teamId : false;
  const isOpponent = isDual && myPlayer != null && !isInActiveTeam;
  const isHost = playerName == null;
 
  const [toggleOpen, setToggleOpen] = useState(false);
  useEffect(() => {
    setToggleOpen(false);
  }, [round?.questionIndex, round?.blitzItemIndex]);

  if (round?.type === "round") {
    return (
      <TaskCardBlockRound
        round={round}
        alwaysOpen={alwaysOpen}
        captain={captain}
        isCaptain={isCaptain}
        isOpponent={isOpponent}
        isHost={isHost}
        toggleOpen={toggleOpen}
        onToggle={() => setToggleOpen((v) => !v)}
      />
    );
  }
  if (round?.type === "blitz") {
    return (
      <TaskCardBlockBlitz
        round={round}
        alwaysOpen={alwaysOpen}
        captain={captain}
        isCaptain={isCaptain}
        isOpponent={isOpponent}
        isHost={isHost}
        toggleOpen={toggleOpen}
        onToggle={() => setToggleOpen((v) => !v)}
      />
    );
  }
  return null;
}

interface InternalProps {
  captain?: ReturnType<typeof usePlayers>[number];
  isCaptain?: boolean;
  isOpponent: boolean;
  isHost: boolean;
  alwaysOpen?: boolean;
  round: RoundState;
  toggleOpen: boolean;
  onToggle: () => void;
}

function TaskCardBlockRound({ captain, isCaptain, isOpponent, round, alwaysOpen, toggleOpen, onToggle }: InternalProps) {
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

  const isReview = phase === "round-review" || phase === "round-result";
  const taskVisible = alwaysOpen || isReview
    || (isCaptain && (phase === "round-active" || phase === "round-answer"))
    || (isOpponent && toggleOpen);

  const clickable = isOpponent && !isReview;

  if (!currentQuestion) return null;

  return (
    <div className={styles.taskCardWrap}>
      <TaskCard
        topic={currentQuestion.topic.name}
        player={captain}
        bottomText={currentQuestion.question?.difficulty ?? 0}
        hidden={!taskVisible}
        onClick={clickable ? onToggle : undefined}
      >
        {currentQuestion.question?.text}
      </TaskCard>
    </div>
  );
}

function TaskCardBlockBlitz({ round, captain, alwaysOpen, isCaptain, isOpponent, toggleOpen, onToggle }: InternalProps) {
  const phase = usePhase();
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const { t } = useTranslation();
  
  if (round.blitzTaskIndex == null) return null;

  const isReview = phase === "blitz-review";
  const taskVisible = alwaysOpen || isReview
    || (isCaptain && (phase === "blitz-active" || phase === "blitz-pick" || phase === "blitz-answer"))
    || (isOpponent && toggleOpen);

  const clickable = isOpponent && !isReview;

  const currentTask = blitzTasks[round.blitzTaskIndex ?? 0];
  const currentItem =
    currentTask && round?.blitzItemIndex != null
      ? currentTask.items[round.blitzItemIndex]
      : undefined;

  if (!currentItem) return null;
  return (
    <div className={styles.taskCardWrap}>
      <TaskCard
        topic={t("blitz.taskTitle")}
        player={captain}
        bottomText={currentItem?.difficulty ?? 0}
        
        hidden={!taskVisible}
        onClick={clickable ? onToggle : undefined}
      >
        {currentItem?.text}
      </TaskCard>
    </div>
  );
}
