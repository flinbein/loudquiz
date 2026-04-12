import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import { useCurrentRound, usePhase, usePlayers } from "@/store/selectors";
import { canBeCaptain } from "@/logic/captain";
import { getNextBlitzAnswerer } from "@/store/actions/blitz";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import { TimerButton } from "@/components/TimerButton/TimerButton";
import { TimerInput } from "@/components/TimerInput/TimerInput";
import { toLocalTime } from "@/store/clockSyncStore";
import type { BlitzPhase } from "@/types/game";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerBlitz.module.css";

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
  const { t } = useTranslation();

  if (!round || round.type !== "blitz") return null;

  const me = players.find((p) => p.name === playerName);
  const isActiveTeam = me?.team === round.teamId;
  const isCaptain = round.captainName === playerName;
  const order = round.playerOrder ?? [];
  const isLast = order.length > 0 && order[order.length - 1] === playerName;
  const isInChain = order.includes(playerName);

  if (!isActiveTeam) {
    return <OpponentView />;
  }

  switch (phase) {
    case "blitz-captain":
      return (
        <BlitzCaptainPhase
          playerName={playerName}
          sendAction={sendAction}
          order={order}
          isCaptain={isCaptain}
          isInChain={isInChain}
        />
      );
    case "blitz-pick":
      return <BlitzPickPhase playerName={playerName} sendAction={sendAction} isCaptain={isCaptain} />;
    case "blitz-ready":
      return <BlitzReadyPhase playerName={playerName} sendAction={sendAction} />;
    case "blitz-active":
      return (
        <BlitzActivePhase
          playerName={playerName}
          sendAction={sendAction}
          isCaptain={isCaptain}
          isLast={isLast}
        />
      );
    case "blitz-answer":
      return <BlitzAnswerPhase playerName={playerName} sendAction={sendAction} />;
    case "blitz-review":
      return <BlitzReviewPhase sendAction={sendAction} />;
    default:
      return null;
  }

  // t() reference kept below for phase labels in sub-views
  void t;
}

function OpponentView() {
  const phase = usePhase() as BlitzPhase;
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <div className={styles.phaseInfo}>{t(`blitz.${phase}.opponentHint`)}</div>
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
  const timer = useGameStore((s) => s.timer);
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
          startedAt={toLocalTime(timer?.startedAt)}
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
  const currentTask = blitzTasks.find((bt) => bt.id === round?.blitzTaskId);
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

function BlitzReadyPhase({ playerName, sendAction }: PhaseProps) {
  const { t } = useTranslation();
  const players = usePlayers();
  const me = players.find((p) => p.name === playerName);
  return (
    <div className={styles.container}>
      <button
        className={styles.readyBtn}
        disabled={me?.ready}
        onClick={() => sendAction({ kind: "set-ready", ready: true })}
      >
        {me?.ready ? t("lobby.waiting") : t("round.readyBtn")}
      </button>
    </div>
  );
}

function BlitzActivePhase({
  playerName,
  sendAction,
  isCaptain,
  isLast,
}: PhaseProps & { isCaptain: boolean; isLast: boolean }) {
  const { t } = useTranslation();
  const round = useCurrentRound();
  const players = usePlayers();
  const blitzTasks = useGameStore((s) => s.blitzTasks);

  const task = blitzTasks.find((t) => t.id === round?.blitzTaskId);
  const item = task && round?.blitzItemIndex != null ? task.items[round.blitzItemIndex] : undefined;
  const order = round?.playerOrder ?? [];
  const myIndex = order.indexOf(playerName);
  const nextPlayer = myIndex >= 0 && myIndex < order.length - 1 ? players.find((p) => p.name === order[myIndex + 1]) : undefined;
  const prevPlayer = myIndex > 0 ? players.find((p) => p.name === order[myIndex - 1]) : undefined;

  if (isCaptain) {
    return (
      <div className={styles.container}>
        <TaskCard
          topic=""
          difficulty={item?.difficulty ?? 0}
          question={item?.text ?? ""}
          hidden={false}
        />
        <div className={styles.phaseInfo}>
          {t("blitz.explainTo", { name: nextPlayer?.name ?? "" })}
        </div>
        <TimerView />
      </div>
    );
  }

  if (isLast) {
    return (
      <div className={styles.container}>
        <TaskCard
          topic=""
          difficulty={item?.difficulty ?? 0}
          question=""
          hidden={true}
        />
        <div className={styles.phaseInfo}>
          {t("blitz.lastPlayerHint", { name: prevPlayer?.name ?? "" })}
        </div>
        <LastPlayerAnswerForm sendAction={sendAction} />
      </div>
    );
  }

  // Intermediate responder
  return (
    <div className={styles.container}>
      <TaskCard
        topic=""
        difficulty={item?.difficulty ?? 0}
        question=""
        hidden={true}
      />
      <div className={styles.phaseInfo}>
        {t("blitz.intermediateHint", {
          from: prevPlayer?.name ?? "",
          to: nextPlayer?.name ?? "",
        })}
      </div>
      <TimerView />
    </div>
  );
}

function LastPlayerAnswerForm({ sendAction }: { sendAction: (action: PlayerAction) => void }) {
  const timer = useGameStore((s) => s.timer);
  const [text, setText] = useState("");
  const { t } = useTranslation();
  return (
    <div className={styles.answerForm}>
      <TimerInput
        startedAt={toLocalTime(timer?.startedAt)}
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

function BlitzAnswerPhase({ playerName, sendAction }: PhaseProps) {
  const { t } = useTranslation();
  const round = useCurrentRound();
  const players = usePlayers();
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const order = round?.playerOrder ?? [];
  const up = round ? getNextBlitzAnswerer(order, round.answers) : undefined;
  const upPlayer = players.find((p) => p.name === up);

  const task = blitzTasks.find((t) => t.id === round?.blitzTaskId);
  const item = task && round?.blitzItemIndex != null ? task.items[round.blitzItemIndex] : undefined;

  if (up !== playerName) {
    return (
      <div className={styles.container}>
        <TaskCard
          topic={t("blitz.taskTitle")}
          difficulty={item?.difficulty ?? 0}
          question=""
          hidden={true}
        />
        <div className={styles.phaseInfo}>
          {t("blitz.waitingForAnswerer", { name: upPlayer?.name ?? "" })}
        </div>
        <TimerView />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <TaskCard topic="" difficulty={item?.difficulty ?? 0} question="" hidden={true} />
      <AnswerOrSkipForm sendAction={sendAction} />
    </div>
  );
}

function AnswerOrSkipForm({ sendAction }: { sendAction: (action: PlayerAction) => void }) {
  const timer = useGameStore((s) => s.timer);
  const [text, setText] = useState("");
  const { t } = useTranslation();
  return (
    <div className={styles.answerForm}>
      <TimerInput
        startedAt={toLocalTime(timer?.startedAt)}
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

function BlitzReviewPhase({ sendAction }: { sendAction: (action: PlayerAction) => void }) {
  const { t } = useTranslation();
  const round = useCurrentRound();
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const task = blitzTasks.find((t) => t.id === round?.blitzTaskId);
  const item = task && round?.blitzItemIndex != null ? task.items[round.blitzItemIndex] : undefined;
  const score = round?.reviewResult?.score ?? 0;

  return (
    <div className={styles.container}>
      <TaskCard
        topic=""
        difficulty={item?.difficulty ?? 0}
        question={item?.text ?? ""}
        hidden={false}
      />
      <div className={styles.scoreDisplay}>+{score}</div>
      <button className={styles.nextBtn} onClick={() => sendAction({ kind: "next-round" })}>
        {t("round.nextRound")}
      </button>
    </div>
  );
}

function TimerView() {
  const timer = useGameStore((s) => s.timer);
  return (
    <CircleTimer startedAt={toLocalTime(timer?.startedAt)} durationMs={timer?.duration ?? 0} />
  );
}
