import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  usePhase,
  useCurrentRound,
  usePlayers,
  toLinearQuestionIndex,
} from "@/store/selectors";
import { useGameStore } from "@/store/gameStore";
import { canBeCaptain } from "@/logic/captain";
import { getPlayedQuestionIndices } from "@/logic/phaseTransitions";
import { getRemainingTime } from "@/logic/timer";
import { Timer } from "@/components/Timer/Timer";
import { TimerButton } from "@/components/TimerButton/TimerButton";
import { TimerInput } from "@/components/TimerInput/TimerInput";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "@/components/TaskView/TaskView";
import { JokerState } from "@/components/JokerState/JokerState";
import { Sticker } from "@/components/Sticker/Sticker";
import type { RoundPhase } from "@/types/game";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerRound.module.css";

interface PlayerRoundProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

export function PlayerRound({ playerName, sendAction }: PlayerRoundProps) {
  const { t } = useTranslation();
  const phase = usePhase() as RoundPhase;
  const round = useCurrentRound();
  const players = usePlayers();
  const topics = useGameStore((s) => s.topics);
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const teams = useGameStore((s) => s.teams);
  const timer = useGameStore((s) => s.timer);
  const history = useGameStore((s) => s.history);

  const [answerText, setAnswerText] = useState("");

  if (!round) return null;

  const isCaptain = round.captainName === playerName;
  const myPlayer = players.find((p) => p.name === playerName);
  const captainPlayer = players.find((p) => p.name === round.captainName);

  const playedIndices = getPlayedQuestionIndices(history);

  const buildTaskView = (): { taskViewTopics: TaskViewTopic[]; taskViewBlitz: TaskViewBlitz[] } => {
    const taskViewTopics: TaskViewTopic[] = topics.map((topic, topicIdx) => ({
      name: topic.name,
      questions: topic.questions.map((q, qIdx) => {
        const linearIdx = toLinearQuestionIndex(
          useGameStore.getState(),
          topicIdx,
          qIdx,
        );
        const isPlayed = playedIndices.includes(linearIdx);
        const isActive = round.questionIndex === linearIdx;
        return {
          open: isPlayed || isActive,
          active: isActive,
          player: undefined,
          jokerUsed: false,
          difficulty: q.difficulty,
        };
      }),
    }));
    const taskViewBlitz: TaskViewBlitz[] = blitzTasks.map(() => ({
      active: false,
      team: undefined,
      score: undefined,
    }));
    return { taskViewTopics, taskViewBlitz };
  };

  const currentQuestion = (() => {
    if (round.questionIndex == null) return undefined;
    let remaining = round.questionIndex;
    for (const topic of topics) {
      if (remaining < topic.questions.length) {
        return { topic, question: topic.questions[remaining] };
      }
      remaining -= topic.questions.length;
    }
    return undefined;
  })();

  // -- round-captain --
  if (phase === "round-captain") {
    const remainingTime = timer ? getRemainingTime(timer) : 60;
    const eligible = canBeCaptain(playerName, history);
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("round.captain")}</div>
        <TimerButton
          time={remainingTime}
          onClick={() => sendAction({ kind: "claim-captain" })}
          disabled={!eligible}
        >
          {t("round.beCaptain")}
        </TimerButton>
        <div className={styles.phaseInfo}>
          {eligible ? t("round.captainHint") : t("round.wasCaptain")}
        </div>
      </div>
    );
  }

  // -- round-pick --
  if (phase === "round-pick") {
    if (isCaptain) {
      const taskViewTopics: TaskViewTopic[] = topics.map((topic, topicIdx) => ({
        name: topic.name,
        questions: topic.questions.map((q, qIdx) => {
          const linearIdx = toLinearQuestionIndex(
            useGameStore.getState(),
            topicIdx,
            qIdx,
          );
          const isPlayed = playedIndices.includes(linearIdx);
          const isActive = round.questionIndex === linearIdx;
          return {
            open: isPlayed || isActive,
            active: isActive,
            player: undefined,
            jokerUsed: false,
            difficulty: q.difficulty,
          };
        }),
      }));

      const taskViewBlitz: TaskViewBlitz[] = blitzTasks.map(() => ({
        active: false,
        team: undefined,
        score: undefined,
      }));

      const activeTeam = teams.find((t) => t.id === round.teamId);
      const jokerState = activeTeam?.jokerUsed
        ? "disabled"
        : round.jokerActive
          ? "active"
          : "enabled";

      return (
        <div className={styles.container}>
          <div className={styles.phaseInfo}>{t("round.pick")}</div>
          <TaskView
            topics={taskViewTopics}
            blitzRounds={taskViewBlitz}
            onSelectQuestion={(topicIdx, questionIdx) => {
              const linearIdx = toLinearQuestionIndex(
                useGameStore.getState(),
                topicIdx,
                questionIdx,
              );
              sendAction({ kind: "select-question", questionIndex: linearIdx });
            }}
          />
          <JokerState
            state={jokerState}
            onClick={() => sendAction({ kind: "activate-joker" })}
          />
        </div>
      );
    }

    const { taskViewTopics: pickTopics, taskViewBlitz: pickBlitz } = buildTaskView();
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("round.pick")}</div>
        <TaskView topics={pickTopics} blitzRounds={pickBlitz} />
        <div className={styles.phaseInfo}>{t("round.pickHint")}</div>
      </div>
    );
  }

  // -- round-ready --
  if (phase === "round-ready") {
    const isReady = myPlayer?.ready ?? false;
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("round.ready")}</div>
        <TaskCard
          topic={currentQuestion?.topic.name}
          player={
            captainPlayer
              ? { emoji: captainPlayer.emoji, name: captainPlayer.name, team: captainPlayer.team }
              : undefined
          }
          difficulty={currentQuestion?.question.difficulty ?? 0}
          questionScore={currentQuestion?.question.text ?? ""}
          hidden
        />
        {isReady ? (
          <div className={styles.phaseInfo}>{t("lobby.waiting")}</div>
        ) : (
          <button
            className={styles.readyBtn}
            onClick={() => sendAction({ kind: "set-ready", ready: true })}
          >
            {t("round.readyBtn")}
          </button>
        )}
      </div>
    );
  }

  // -- round-active / round-answer --
  if (phase === "round-active" || phase === "round-answer") {
    const myAnswer = round.answers[playerName];
    const remainingTime = timer ? getRemainingTime(timer) : 0;

    if (isCaptain) {
      return (
        <div className={styles.container}>
          <div className={styles.phaseInfo}>
            {phase === "round-active" ? t("round.active") : t("round.answer")}
          </div>
          <TaskCard
            topic={currentQuestion?.topic.name}
            player={
              captainPlayer
                ? { emoji: captainPlayer.emoji, name: captainPlayer.name, team: captainPlayer.team }
                : undefined
            }
            difficulty={currentQuestion?.question.difficulty ?? 0}
            questionScore={currentQuestion?.question.text ?? ""}
          />
          <div className={styles.phaseInfo}>{t("round.activeHint")}</div>
          <Timer time={remainingTime} />
        </div>
      );
    }

    // Responder who already answered or gave up
    if (myAnswer !== undefined) {
      if (myAnswer.text === "") {
        return (
          <div className={styles.container}>
            <div className={styles.phaseInfo}>
              {phase === "round-active" ? t("round.active") : t("round.answer")}
            </div>
            <TaskCard
              topic={currentQuestion?.topic.name}
              player={
                captainPlayer
                  ? { emoji: captainPlayer.emoji, name: captainPlayer.name, team: captainPlayer.team }
                  : undefined
              }
              difficulty={currentQuestion?.question.difficulty ?? 0}
              questionScore={currentQuestion?.question.text ?? ""}
              hidden
            />
            <div className={styles.phaseInfo}>{t("round.gaveUp")}</div>
          </div>
        );
      }

      return (
        <div className={styles.container}>
          <div className={styles.phaseInfo}>
            {phase === "round-active" ? t("round.active") : t("round.answer")}
          </div>
          <TaskCard
            topic={currentQuestion?.topic.name}
            player={
              captainPlayer
                ? { emoji: captainPlayer.emoji, name: captainPlayer.name, team: captainPlayer.team }
                : undefined
            }
            difficulty={currentQuestion?.question.difficulty ?? 0}
            questionScore={currentQuestion?.question.text ?? ""}
            hidden
          />
          <Sticker
            player={myPlayer ? { emoji: myPlayer.emoji, name: myPlayer.name, team: myPlayer.team } : undefined}
            answerText={myAnswer.text}
          />
        </div>
      );
    }

    // Responder not yet answered
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>
          {phase === "round-active" ? t("round.active") : t("round.answer")}
        </div>
        <TaskCard
          topic={currentQuestion?.topic.name}
          player={
            captainPlayer
              ? { emoji: captainPlayer.emoji, name: captainPlayer.name, team: captainPlayer.team }
              : undefined
          }
          difficulty={currentQuestion?.question.difficulty ?? 0}
          questionScore={currentQuestion?.question.text ?? ""}
          hidden
        />
        <div className={styles.answerForm}>
          <TimerInput
            time={remainingTime}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder={t("round.answerHint")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && answerText.trim()) {
                sendAction({ kind: "submit-answer", text: answerText.trim() });
              }
            }}
          />
          <div className={styles.answerActions}>
            <button
              className={styles.giveUpBtn}
              onClick={() => sendAction({ kind: "submit-answer", text: "" })}
            >
              {t("round.giveUp")}
            </button>
            <button
              className={styles.submitBtn}
              disabled={!answerText.trim()}
              onClick={() => {
                if (answerText.trim()) {
                  sendAction({ kind: "submit-answer", text: answerText.trim() });
                }
              }}
            >
              {t("round.submit")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- round-review --
  if (phase === "round-review") {
    const myAnswer = round.answers[playerName];
    const myEvaluation = round.reviewResult?.evaluations.find(
      (e) => e.playerName === playerName,
    );
    const scoreConfirmed = round.reviewResult?.scoreConfirmed ?? false;
    const roundScore = round.reviewResult?.score ?? 0;

    const questionDifficulty = currentQuestion?.question.difficulty ?? 0;
    const stampText =
      myEvaluation?.correct === true
        ? `+${questionDifficulty}`
        : myEvaluation?.correct === false
          ? "✗"
          : undefined;
    const stampColor: "green" | "red" =
      myEvaluation?.correct === false ? "red" : "green";

    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("round.review")}</div>
        <TaskCard
          topic={currentQuestion?.topic.name}
          player={
            captainPlayer
              ? { emoji: captainPlayer.emoji, name: captainPlayer.name, team: captainPlayer.team }
              : undefined
          }
          difficulty={currentQuestion?.question.difficulty ?? 0}
          questionScore={currentQuestion?.question.text ?? ""}
        />
        {myAnswer !== undefined && (
          <Sticker
            player={myPlayer ? { emoji: myPlayer.emoji, name: myPlayer.name, team: myPlayer.team } : undefined}
            answerText={myAnswer.text || t("round.gaveUp")}
            aiComment={myEvaluation?.aiComment}
            stampText={stampText}
            stampColor={stampColor}
          />
        )}
        {scoreConfirmed && (
          <div className={styles.scoreDisplay}>+{roundScore}</div>
        )}
        <div className={styles.reviewActions}>
          <button
            className={styles.disputeBtn}
            disabled={!scoreConfirmed}
            onClick={() => sendAction({ kind: "dispute-review" })}
          >
            {t("round.dispute")}
          </button>
          <button
            className={styles.nextBtn}
            onClick={() => sendAction({ kind: "next-round" })}
          >
            {t("round.nextRound")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
