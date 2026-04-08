import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import {
  usePhase,
  useCurrentRound,
  useTeams,
  usePlayers,
  useTimer as useTimerState,
  toLinearQuestionIndex,
} from "@/store/selectors";
import { getPlayedQuestionIndices } from "@/logic/phaseTransitions";
import {
  evaluateGroup,
  mergeAnswerGroups,
  splitAnswerFromGroup,
  confirmReview,
  confirmScore,
  disputeReview,
  selectQuestion,
  activateJoker,
  handleTimerExpire,
} from "@/store/actions/round";
import { getRemainingTime } from "@/logic/timer";
import { Timer } from "@/components/Timer/Timer";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "@/components/TaskView/TaskView";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { JokerState } from "@/components/JokerState/JokerState";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import { ScoreFormula } from "@/components/ScoreFormula/ScoreFormula";
import { StickerStack } from "@/components/StickerStack/StickerStack";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import {
  PlayerStatusTable,
  type PlayerRole,
  type PlayerStatus,
} from "@/components/PlayerStatusTable/PlayerStatusTable";
import type { GameState, RoundPhase, TeamId } from "@/types/game";
import styles from "./HostRound.module.css";

function getPlayerRoundInfo(
  phase: RoundPhase,
  playerName: string,
  round: NonNullable<GameState["currentRound"]>,
  playerReady: boolean,
): { role: PlayerRole; status?: PlayerStatus } {
  const isCaptain = round.captainName === playerName;
  if (isCaptain) return { role: "captain" };

  const answer = round.answers[playerName];
  const evaluation = round.reviewResult?.evaluations.find(
    (e) => e.playerName === playerName,
  );

  switch (phase) {
    case "round-captain":
    case "round-pick":
      return { role: "player", status: "waiting" };
    case "round-ready":
      return { role: "player", status: playerReady ? undefined : "waiting" };
    case "round-active":
      if (!answer) return { role: "player", status: "typing" };
      return { role: "player", status: answer.text === "" ? "wrong" : "answered" };
    case "round-answer":
      if (!answer) return { role: "player", status: "typing" };
      if (answer.text === "") return { role: "player", status: "wrong" };
      if (evaluation?.correct === true) return { role: "player", status: "right" };
      if (evaluation?.correct === false) return { role: "player", status: "wrong" };
      return { role: "player", status: "answered" };
    case "round-review":
      if (evaluation?.correct === true) return { role: "player", status: "right" };
      if (evaluation?.correct === false) return { role: "player", status: "wrong" };
      return { role: "player" };
    default:
      return { role: "player" };
  }
}

export function HostRound() {
  const { t } = useTranslation();
  const phase = usePhase() as RoundPhase;
  const round = useCurrentRound();
  const teams = useTeams();
  const players = usePlayers();
  const timer = useTimerState();
  const topics = useGameStore((s) => s.topics);
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const history = useGameStore((s) => s.history);

  // Handle timer expiry
  useEffect(() => {
    if (!timer) return;
    const remaining = getRemainingTime(timer);
    if (remaining <= 0) {
      handleTimerExpire(phase);
      return;
    }
    const id = setTimeout(() => {
      handleTimerExpire(phase);
    }, remaining * 1000);
    return () => clearTimeout(id);
  }, [timer, phase]);

  if (!round) return null;

  const playedIndices = getPlayedQuestionIndices(history);

  // Build TaskView topics
  const taskViewTopics: TaskViewTopic[] = topics.map((topic, topicIdx) => ({
    name: topic.name,
    questions: topic.questions.map((q, qIdx) => {
      const linearIdx = toLinearQuestionIndex({ topics } as GameState, topicIdx, qIdx);
      const isPlayed = playedIndices.includes(linearIdx);
      const isActive = round.questionIndex === linearIdx;
      const roundResult = history.find(
        (r) => r.type === "round" && r.questionIndex === linearIdx,
      );
      const captainP = isPlayed
        ? players.find((p) => p.name === roundResult?.captainName)
        : undefined;
      const activeTeam = teams.find((t) => t.id === round.teamId);
      return {
        open: isPlayed || isActive,
        active: isActive,
        player: captainP
          ? { emoji: captainP.emoji, name: captainP.name, team: captainP.team }
          : undefined,
        jokerUsed: roundResult?.jokerUsed ?? false,
        difficulty: q.difficulty,
        totalScore: roundResult?.score,
        paperColor: isActive ? (activeTeam?.id ?? "none") : undefined,
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

  // Current question info
  const currentQuestion =
    round.questionIndex != null
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

  const captain = players.find((p) => p.name === round.captainName);

  const review = round.reviewResult;
  const scoreConfirmed = review?.scoreConfirmed ?? false;

  // Sidebar actions by phase
  let sidebarActions: React.ReactNode = null;
  if (phase === "round-review" && !scoreConfirmed) {
    sidebarActions = (
      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={() => confirmScore()}>
          {t("round.next")}
        </button>
      </div>
    );
  } else if (phase === "round-review" && scoreConfirmed) {
    sidebarActions = (
      <div className={styles.actions}>
        <button className={styles.secondaryBtn} onClick={() => disputeReview()}>
          {t("round.dispute")}
        </button>
        <button className={styles.primaryBtn} onClick={() => confirmReview()}>
          {t("round.nextRound")}
        </button>
      </div>
    );
  }

  // Sidebar: player lists per team
  const sidebar = (
    <div className={styles.sidebar}>
      <TeamScore teams={teams} />
      {timer && <Timer time={getRemainingTime(timer)} />}
      {teams.map((team) => {
        const teamPlayers = players.filter((p) => p.team === team.id);
        return (
          <TeamGroup
            key={team.id}
            label={t(`team.${team.id}`)}
            teamColor={team.id}
            playerCount={teamPlayers.length}
          >
            <PlayerStatusTable
              players={teamPlayers.map((p) => {
                const info = getPlayerRoundInfo(phase, p.name, round, p.ready);
                return {
                  emoji: p.emoji,
                  name: p.name,
                  team: p.team,
                  online: p.online,
                  role: info.role,
                  status: info.status,
                };
              })}
            />
          </TeamGroup>
        );
      })}
      {sidebarActions}
    </div>
  );

  // Main area content by phase
  let mainContent: React.ReactNode;

  if (phase === "round-captain" || phase === "round-pick") {
    const jokerTeam = teams.find((t) => t.id === round.teamId);
    const jokerState = jokerTeam?.jokerUsed
      ? "disabled"
      : round.jokerActive
        ? "active"
        : "enabled";

    mainContent = (
      <>
        <div className={styles.phaseInfo}>
          {phase === "round-captain" ? t("round.captain") : t("round.pick")}
        </div>
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
  } else if (phase === "round-review") {
    // Review phase: evaluation or score display sub-phase
    const groups = review?.groups ?? [];

    // Filter out empty-answer groups (they're auto-marked wrong)
    const nonEmptyGroups = groups.filter((group) =>
      group.some((name) => round.answers[name]?.text !== ""),
    );

    // Build stickers (always shown, clickable only when !scoreConfirmed)
    const stickersContent = (
      <div className={styles.stickersGrid}>
        {nonEmptyGroups.map((group, groupIdx) => {
          const representativePlayer = group[0];
          const stickers = group.map((playerName) => {
            const player = players.find((p) => p.name === playerName);
            const answer = round.answers[playerName];
            const eval_ = review?.evaluations.find(
              (e) => e.playerName === playerName,
            );
            const correct = eval_?.correct;
            const stickerStamp =
              correct === true ? "✓" : correct === false ? "✗" : undefined;
            const stickerStampColor: "green" | "red" =
              correct === false ? "red" : "green";
            return {
              player: player
                ? { emoji: player.emoji, name: player.name, team: player.team }
                : undefined,
              answerText: answer?.text ?? "• • •",
              aiComment: eval_?.aiComment,
              stampText: stickerStamp,
              stampColor: stickerStampColor,
            };
          });

          return (
            <div key={groupIdx} className={styles.stickerSlot}>
              <StickerStack
                stickers={stickers}
                draggable={!scoreConfirmed}
                dragData={!scoreConfirmed ? representativePlayer : undefined}
                onDrop={!scoreConfirmed ? (dragData) => {
                  mergeAnswerGroups(dragData, representativePlayer);
                } : undefined}
                onClickSticker={!scoreConfirmed ? () => {
                  // Toggle evaluation for entire group: null → true → false → null
                  const evaluation = review?.evaluations.find(
                    (e) => e.playerName === representativePlayer,
                  );
                  const current = evaluation?.correct ?? null;
                  const next =
                    current === null ? true : current === true ? false : null;
                  evaluateGroup(group, next);
                } : undefined}
                onClickBadge={!scoreConfirmed ? () => {
                  // Split last player from group
                  const lastPlayer = group[group.length - 1];
                  splitAnswerFromGroup(lastPlayer);
                } : undefined}
              />
            </div>
          );
        })}
      </div>
    );

    if (!scoreConfirmed) {
      mainContent = (
        <>
          <div className={styles.phaseInfo}>{t("round.review")}</div>
          <div className={styles.taskCardWrap}>
            <TaskCard
              topic={currentQuestion?.topic.name}
              player={
                captain
                  ? { emoji: captain.emoji, name: captain.name, team: captain.team }
                  : undefined
              }
              difficulty={currentQuestion?.question.difficulty ?? 0}
              questionScore={currentQuestion?.question.text ?? ""}
            />
          </div>
          {stickersContent}
        </>
      );
    } else {
      // Score display sub-phase
      const difficulty = currentQuestion?.question.difficulty ?? 100;
      const correctCount = review?.evaluations.filter((e) => e.correct === true).length ?? 0;
      const totalScore = review?.score ?? 0;

      mainContent = (
        <>
          <div className={styles.phaseInfo}>{t("round.review")}</div>
          <div className={styles.taskCardWrap}>
            <TaskCard
              topic={currentQuestion?.topic.name}
              player={
                captain
                  ? { emoji: captain.emoji, name: captain.name, team: captain.team }
                  : undefined
              }
              difficulty={currentQuestion?.question.difficulty ?? 0}
              questionScore={currentQuestion?.question.text ?? ""}
            />
          </div>
          {stickersContent}
          <ScoreFormula
            difficulty={difficulty}
            correctCount={correctCount}
            jokerActive={round.jokerActive}
            bonusMultiplier={0}
            totalScore={totalScore}
          />
        </>
      );
    }
  } else {
    // round-ready / round-active / round-answer: show TaskCard
    mainContent = (
      <>
        <div className={styles.phaseInfo}>
          {phase === "round-ready"
            ? t("round.ready")
            : phase === "round-active"
              ? t("round.active")
              : t("round.answer")}
        </div>
        <div className={styles.taskCardWrap}>
          <TaskCard
            topic={currentQuestion?.topic.name}
            player={
              captain
                ? { emoji: captain.emoji, name: captain.name, team: captain.team }
                : undefined
            }
            difficulty={currentQuestion?.question.difficulty ?? 0}
            questionScore={currentQuestion?.question.text ?? ""}
            hidden
          />
        </div>
        {(phase === "round-active" || phase === "round-answer") && (
          <div className={styles.stickersGrid}>
            {Object.entries(round.answers)
              .filter(([, answer]) => answer.text !== "")
              .map(([playerName]) => {
                const player = players.find((p) => p.name === playerName);
                return (
                  <div key={playerName} className={styles.stickerSlot}>
                    <StickerStack
                      stickers={[
                        {
                          player: player
                            ? {
                                emoji: player.emoji,
                                name: player.name,
                                team: player.team,
                              }
                            : undefined,
                          answerText: "• • •",
                          aiComment: undefined,
                        },
                      ]}
                    />
                  </div>
                );
              })}
          </div>
        )}
      </>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.main}>{mainContent}</div>
      {sidebar}
    </div>
  );
}
