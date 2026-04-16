import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import { useCurrentRound, usePhase, usePlayers } from "@/store/selectors";
import { canBeCaptain } from "@/logic/captain";
import { getNextBlitzAnswerer } from "@/store/actions/blitz";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import { TimerButton } from "@/components/TimerButton/TimerButton";
import { TimerInput } from "@/components/TimerInput/TimerInput";
import { useLocalTimer } from "@/hooks/useLocalTimer";
import type { BlitzPhase } from "@/types/game";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerBlitz.module.css";
import { TaskCardBlock } from "@/pages/blocks/TaskCardBlock";

interface PlayerBlitzProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

/**
 * Player screen for all 6 blitz phases. Routes by (phase, role) to the
 * right sub-view. Roles: captain, intermediate responder, last responder,
 * and opponent (dual-mode).
 */
export function PlayerBlitz({ playerName, sendAction }: PlayerBlitzProps) {
  const phase = usePhase() as BlitzPhase;
  const round = useCurrentRound();
  const players = usePlayers();
  
  if (!round || round.type !== "blitz") return null;

  const me = players.find((p) => p.name === playerName);
  const isActiveTeam = me?.team === round.teamId;
  const isCaptain = round.captainName === playerName;
  const order = round.playerOrder ?? [];
  const isInChain = order.includes(playerName);

  if (!isActiveTeam) {
    return <OpponentView playerName={playerName} />;
  }
  
  if (phase === "blitz-captain") return (
    <BlitzCaptainPhase
      playerName={playerName}
      sendAction={sendAction}
      order={order}
      isCaptain={isCaptain}
      isInChain={isInChain}
    />
  );
  
  if (phase === "blitz-pick") return (
    <BlitzPickPhase playerName={playerName} sendAction={sendAction} isCaptain={isCaptain} />
  );

  return <BlitzGame playerName={playerName} sendAction={sendAction} />
}

function OpponentView({playerName}: {playerName: string}) {
  const phase = usePhase() as BlitzPhase;
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <div className={styles.phaseInfo}>{t(`blitz.${phase}.opponentHint`)}</div>
      <TaskCardBlock playerName={playerName} />
      <TimerView />
    </div>
  );
}

interface PhaseProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

function BlitzCaptainPhase({
  playerName,
  sendAction,
  order,
  isCaptain,
  isInChain,
}: PhaseProps & { order: string[]; isCaptain: boolean; isInChain: boolean }) {
  const timer = useLocalTimer();
  const history = useGameStore((s) => s.history);
  const round = useCurrentRound();
  const players = usePlayers();
  const { t } = useTranslation();
  const captainPicked = Boolean(round?.captainName);
  const eligibleForCaptain = canBeCaptain(playerName, history) && !captainPicked;

  const me = players.find((p) => p.name === playerName);
  const teamPlayers = players.filter((p) => p.team === me?.team);
  const nextSlotIndex = order.length; // 1-based after captain = order.length when order=[captain, ...]
  const maxSlots = Math.max(0, teamPlayers.length - 1);

  // Phase 1: pick captain
  if (!captainPicked) {
    return (
      <div className={styles.container}>
        <TimerButton
          startedAt={timer?.startedAt ?? 0}
          durationMs={timer?.duration ?? 0}
          onClick={() => sendAction({ kind: "claim-blitz-captain" })}
          disabled={!eligibleForCaptain}
        >
          {t("blitz.iAmCaptain")}
        </TimerButton>
        <div className={styles.phaseInfo}>
          {eligibleForCaptain ? t("blitz.captainHint") : t("round.wasCaptain")}
        </div>
      </div>
    );
  }

  // Captain sees the assembled chain, others pick a slot.
  if (isCaptain) {
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("blitz.waitForSlots")}</div>
        <TimerView />
      </div>
    );
  }

  if (isInChain) {
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("blitz.waitForSlots")}</div>
        <TimerView />
      </div>
    );
  }

  // Show slot buttons [1] [2] ... for the next available slot only.
  return (
    <div className={styles.container}>
      <div className={styles.phaseInfo}>{t("blitz.pickSlot")}</div>
      <div className={styles.slotGrid}>
        {Array.from({ length: maxSlots }, (_, i) => {
          const slotIdx = i + 1;
          const taken = slotIdx < nextSlotIndex;
          const disabled = slotIdx !== nextSlotIndex;
          return (
            <button
              key={slotIdx}
              className={styles.slotBtn}
              disabled={disabled || taken}
              onClick={() =>
                sendAction({ kind: "claim-blitz-slot", slot: slotIdx })
              }
            >
              {slotIdx}
            </button>
          );
        })}
      </div>
      <TimerView />
    </div>
  );
}

function BlitzPickPhase({
  playerName,
  sendAction,
  isCaptain,
}: PhaseProps & { isCaptain: boolean }) {
  const { t } = useTranslation();
  const round = useCurrentRound();
  const blitzTasks = useGameStore((s) => s.blitzTasks);

  if (!isCaptain) {
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("blitz.captainPicking")}</div>
        <TimerView />
      </div>
    );
  }

  // Captain picks an item (word) from the current blitz task. The task itself
  // was pre-assigned when the round was created.
  const currentTask = blitzTasks[round?.blitzTaskIndex ?? -1];
  if (!currentTask) return null;

  return (
    <div className={styles.container}>
      <div className={styles.phaseInfo}>{t("blitz.pickTask")}</div>
      <div className={styles.taskGrid}>
        {currentTask.items.map((item, idx) => (
          <button
            key={idx}
            className={styles.taskBtn}
            onClick={() =>
              sendAction({ kind: "select-blitz-item", itemIndex: idx })
            }
          >
            <div className={styles.taskDifficulty}>{item.difficulty}</div>
            <div className={styles.taskText}>{item.text}</div>
          </button>
        ))}
      </div>
      <TimerView />
      {/* playerName referenced to satisfy noUnusedLocals when host echoes our input */}
      <span hidden>{playerName}</span>
    </div>
  );
}

function BlitzGame({
  playerName,
  sendAction,
}: PhaseProps) {
  const { t } = useTranslation();
  const phase = usePhase();
  const round = useCurrentRound();
  const players = usePlayers();
  const me = players.find((p) => p.name === playerName);
  
  const isCaptain = round?.captainName === playerName;
  const order = round?.playerOrder ?? [];
  const isLast = order.length > 0 && order[order.length - 1] === playerName;
  const answererName = round ? getNextBlitzAnswerer(order, round.answers) : undefined;
  
  return (
    <div className={styles.container}>
      <TaskCardBlock playerName={playerName} />
      {phase === "blitz-ready" && (
        <button
          className={styles.readyBtn}
          disabled={me?.ready}
          onClick={() => sendAction({ kind: "set-ready", ready: true })}
        >
          {me?.ready ? t("lobby.waiting") : t("round.readyBtn")}
        </button>
      )}
      {phase === "round-answer" && (
        <BlitzHint playerName={playerName} />
      )}
      {(phase === "blitz-active" || phase === "blitz-answer") && isCaptain && (
        <TimerView />
      )}
      {phase === "blitz-active" && isLast && (
        <LastPlayerAnswerForm sendAction={sendAction} />
      )}
      {phase === "blitz-answer" && (
        (playerName === answererName) ? (
          <AnswerOrSkipForm sendAction={sendAction} />
        ) : (
          <div className={styles.phaseInfo}>
            {t("blitz.waitingForAnswerer", { name: answererName ?? "" })}
          </div>
        )
      )}
      {phase === "blitz-review" && (
        <>
          <div className={styles.scoreDisplay}>+{round?.reviewResult?.score ?? 0}</div>
          <button className={styles.nextBtn} onClick={() => sendAction({ kind: "next-round" })}>
            {t("round.nextRound")}
          </button>
        </>
      )}
    </div>
  )
}

interface BlitzHintProps {
  playerName?: string;
}
function BlitzHint({playerName}: BlitzHintProps){
  const { t } = useTranslation();
  const round = useCurrentRound();
  const players = usePlayers();
  
  if (!playerName) return null;
  
  const order = round?.playerOrder ?? [];
  const myIndex = order.indexOf(playerName);
  const nextPlayer = myIndex >= 0 && myIndex < order.length - 1 ? players.find((p) => p.name === order[myIndex + 1]) : undefined;
  const prevPlayer = myIndex > 0 ? players.find((p) => p.name === order[myIndex - 1]) : undefined;
  
  if (nextPlayer && prevPlayer) return (
    <div className={styles.phaseInfo}>
      {t("blitz.intermediateHint", {
        from: prevPlayer?.name ?? "",
        to: nextPlayer?.name ?? "",
      })}
    </div>
  );
  
  if (nextPlayer) return (
    <div className={styles.phaseInfo}>
      {t("blitz.explainTo", { name: nextPlayer?.name ?? "" })}
    </div>
  );
  if (prevPlayer) return (
    <div className={styles.phaseInfo}>
      {t("blitz.lastPlayerHint", { name: prevPlayer?.name ?? "" })}
    </div>
  );
  return null;
}


function LastPlayerAnswerForm({ sendAction }: { sendAction: (action: PlayerAction) => void }) {
  const timer = useLocalTimer();
  const [text, setText] = useState("");
  const { t } = useTranslation();
  return (
    <div className={styles.answerForm}>
      <TimerInput
        startedAt={timer?.startedAt ?? 0}
        durationMs={timer?.duration ?? 0}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        placeholder={t("round.answerHint")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            sendAction({ kind: "submit-blitz-answer", text: text.trim() });
          }
        }}
      />
      <button
        className={styles.submitBtn}
        disabled={!text.trim()}
        onClick={() => sendAction({ kind: "submit-blitz-answer", text: text.trim() })}
      >
        {t("round.submit")}
      </button>
    </div>
  );
}

function AnswerOrSkipForm({ sendAction }: { sendAction: (action: PlayerAction) => void }) {
  const timer = useLocalTimer();
  const [text, setText] = useState("");
  const { t } = useTranslation();
  return (
    <div className={styles.answerForm}>
      <TimerInput
        startedAt={timer?.startedAt ?? 0}
        durationMs={timer?.duration ?? 0}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        placeholder={t("round.answerHint")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            sendAction({ kind: "submit-blitz-answer", text: text.trim() });
          }
        }}
      />
      <div className={styles.answerActions}>
        <button
          className={styles.giveUpBtn}
          onClick={() => sendAction({ kind: "skip-blitz-answer" })}
        >
          {t("blitz.dontKnow")}
        </button>
        <button
          className={styles.submitBtn}
          disabled={!text.trim()}
          onClick={() => sendAction({ kind: "submit-blitz-answer", text: text.trim() })}
        >
          {t("round.submit")}
        </button>
      </div>
    </div>
  );
}

function TimerView() {
  const timer = useLocalTimer();
  if (!timer) return null;
  return (
    <CircleTimer startedAt={timer.startedAt} durationMs={timer.duration} />
  );
}
