import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerRound.module.css";
import { useCurrentRound, usePhase, usePlayers, useSettings } from "@/store/selectors";
import { TimerInput } from "@/components/TimerInput/TimerInput";
import { toLocalTime } from "@/store/clockSyncStore";
import { useState } from "react";
import { Sticker } from "@/components/Sticker/Sticker";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import { TaskCardBlock } from "@/pages/blocks/TaskCardBlock";

interface PlayerRoundGameProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

export function PlayerRoundGame({ playerName, sendAction }: PlayerRoundGameProps){
  const { t } = useTranslation();
  const phase = usePhase();
  const players = usePlayers();
  const topics = useGameStore((s) => s.topics);
  const round = useCurrentRound();
  
  const settings = useSettings();
  const myPlayer = players.find((p) => p.name === playerName);
  const isCaptain = round?.captainName === playerName;

  if (
    phase === "round-review" &&
    settings.mode === "ai" &&
    round?.reviewResult?.aiStatus === "loading"
  ) {
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("round.aiReview.loading")}</div>
      </div>
    );
  }
  
  const currentQuestion = (() => {
    if (round?.questionIndex == null) return undefined;
    let remaining = round.questionIndex;
    for (const topic of topics) {
      if (remaining < topic.questions.length) {
        return { topic, question: topic.questions[remaining] };
      }
      remaining -= topic.questions.length;
    }
    return undefined;
  })();
  
  const myAnswerTextState = round?.answers?.[playerName]?.text;
  
  return (
    <div className={styles.container}>
      <TaskCardBlock playerName={playerName} />
      {phase === "round-ready" && (
        <button
          className={styles.readyBtn}
          disabled={myPlayer?.ready}
          onClick={() => sendAction({ kind: "set-ready", ready: true })}
        >
          {myPlayer?.ready ? t("lobby.waiting") : t("round.readyBtn")}
        </button>
      )}
      {phase === "round-active" && isCaptain && (
        <>
          <div className={styles.phaseInfo}>{t("round.activeHint")}</div>
          <TimerView key={phase} />
        </>
      )}
      {phase === "round-answer" && isCaptain && (
        <>
          <div className={styles.phaseInfo}>{t("round.answer")}</div>
          <TimerView key={phase} />
        </>
      )}
      {(phase === "round-active" || phase === "round-answer" ) && !isCaptain && myAnswerTextState == null && (
        <AnswerForm sendAction={sendAction} />
      )}
      {Boolean(myAnswerTextState) && currentQuestion && (
        <StickerBlock difficulty={currentQuestion.question?.difficulty ?? 0} playerName={playerName} />
      )}
      {myAnswerTextState === "" && (
        <div className={styles.phaseInfo}>{t("round.gaveUp")}</div>
      )}
      {phase === "round-review" && (
        <>
          <div className={styles.phaseInfo}>{t("round.review")}</div>
        </>
      )}
      {phase === "round-result" && (
        <div className={styles.answerActions}>
          <div className={styles.scoreDisplay}>+{round?.reviewResult?.score ?? 0}</div>
          <button className={styles.disputeBtn} onClick={() => sendAction({ kind: "dispute-review" })}>
            {t("round.dispute")}
          </button>
          <button className={styles.nextBtn} onClick={() => sendAction({ kind: "next-round" })}>
            {t("round.nextRound")}
          </button>
        </div>
      )}
    </div>
  );
}

function TimerView(){
  const timer = useGameStore((s) => s.timer);
  return (
    <CircleTimer startedAt={toLocalTime(timer?.startedAt)} durationMs={timer?.duration ?? 0} />
  )
}

interface AnswerFormProps {
  sendAction: (action: PlayerAction) => void;
}
function AnswerForm({sendAction}: AnswerFormProps){
  const timer = useGameStore((s) => s.timer);
  const [answerText, setAnswerText] = useState("");
  const { t } = useTranslation();
  
  return (
    <div className={styles.answerForm}>
      <TimerInput
        startedAt={toLocalTime(timer?.startedAt)}
        durationMs={timer?.duration ?? 0}
        value={answerText}
        autoFocus
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
          onClick={() => sendAction({ kind: "submit-answer", text: answerText.trim() })}
        >
          {t("round.submit")}
        </button>
      </div>
    </div>
  
  )
}

interface StickerBlockProps {
  playerName: string;
  difficulty: number;
}
function StickerBlock({playerName, difficulty}: StickerBlockProps){
  const players = usePlayers();
  const round = useCurrentRound();
  
  const myPlayer = players.find((p) => p.name === playerName);
  const myAnswerTextState = round?.answers[playerName]?.text;
  
  const myEvaluation = round?.reviewResult?.evaluations.find(
    (e) => e.playerName === playerName,
  );
  
  const stampText =
    myEvaluation?.correct === true
      ? `+${difficulty}`
      : myEvaluation?.correct === false
        ? "✗"
        : undefined;
  const stampColor: "green" | "red" =
    myEvaluation?.correct === false ? "red" : "green";
  
  return (
    <Sticker
      player={myPlayer}
      answerText={myAnswerTextState ?? ""}
      aiComment={myEvaluation?.aiComment}
      stampText={stampText}
      stampColor={stampColor}
    />
  )
}
