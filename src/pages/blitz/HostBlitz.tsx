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
import { getPlayedBlitzTaskIds } from "@/logic/phaseTransitions";
import {
  confirmBlitzReview,
  handleBlitzTimerExpire,
} from "@/store/actions/blitz";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "@/components/TaskView/TaskView";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import { PlayerStatusTable, type PlayerRole, type PlayerStatus } from "@/components/PlayerStatusTable/PlayerStatusTable";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import type { BlitzPhase, GameState } from "@/types/game";
import styles from "./HostBlitz.module.css";

function getBlitzPlayerInfo(
  phase: BlitzPhase,
  playerName: string,
  round: NonNullable<GameState["currentRound"]>,
  playerReady: boolean,
): { role: PlayerRole; status?: PlayerStatus; blitzOrder?: number } {
  const order = round.playerOrder ?? [];
  const isCaptain = round.captainName === playerName;
  const slot = order.indexOf(playerName); // 0 = captain, 1..N = responders
  const blitzOrder = slot > 0 ? slot : undefined;
  const role: PlayerRole = blitzOrder != null ? "blitz-player" : "player";

  if (isCaptain) return { role: "captain" };

  switch (phase) {
    case "blitz-captain":
      return { role, status: blitzOrder == null ? "waiting" : undefined, blitzOrder };
    case "blitz-pick":
      return { role, status: "waiting", blitzOrder };
    case "blitz-ready":
      return { role, status: playerReady ? undefined : "waiting", blitzOrder };
    case "blitz-active": {
      const answer = round.answers[playerName];
      if (answer) return { role, status: "answered", blitzOrder };
      return { role, status: "typing", blitzOrder };
    }
    case "blitz-answer": {
      const answer = round.answers[playerName];
      if (answer) return { role, status: answer.text === "" ? "wrong" : "right", blitzOrder };
      return { role, status: "typing", blitzOrder };
    }
    case "blitz-review": {
      const evaluation = round.reviewResult?.evaluations.find((e) => e.playerName === playerName);
      if (evaluation?.correct === true) return { role, status: "right", blitzOrder };
      if (evaluation?.correct === false) return { role, status: "wrong", blitzOrder };
      return { role, blitzOrder };
    }
    default:
      return { role };
  }
}

export function HostBlitz() {
  const phase = usePhase() as BlitzPhase;
  const round = useCurrentRound();
  const timer = useTimerState();

  // Timer expiry handling.
  useEffect(() => {
    if (!timer) return;
    const now = performance.now();
    const endAt = timer.startedAt + timer.duration;
    const remaining = endAt - now;
    if (remaining <= 0) {
      handleBlitzTimerExpire(phase);
      return;
    }
    const id = setTimeout(() => {
      handleBlitzTimerExpire(phase);
    }, remaining);
    return () => clearTimeout(id);
  }, [timer, phase]);

  if (!round || round.type !== "blitz") return null;

  return (
    <div className={styles.layout}>
      <MainContent />
      <Sidebar />
    </div>
  );
}

function MainContent() {
  const phase = usePhase() as BlitzPhase;
  const topics = useGameStore((s) => s.topics);
  const blitzTasks = useGameStore((s) => s.blitzTasks);
  const history = useGameStore((s) => s.history);
  const round = useCurrentRound();
  const teams = useTeams();
  const players = usePlayers();

  const playedBlitzIds = new Set(getPlayedBlitzTaskIds(history));

  const taskViewTopics: TaskViewTopic[] = topics.map((topic, topicIdx) => ({
    name: topic.name,
    questions: topic.questions.map((q, qIdx) => {
      const linearIdx = toLinearQuestionIndex({ topics } as GameState, topicIdx, qIdx);
      const result = history.find(
        (r) => r.type === "round" && r.questionIndex === linearIdx,
      );
      const captainP = result
        ? players.find((p) => p.name === result.captainName)
        : undefined;
      return {
        open: result != null,
        active: false,
        player: captainP
          ? { emoji: captainP.emoji, name: captainP.name, team: captainP.team }
          : undefined,
        jokerUsed: result?.jokerUsed ?? false,
        difficulty: q.difficulty,
        totalScore: result?.score,
      };
    }),
  }));

  const taskViewBlitz: TaskViewBlitz[] = blitzTasks.map((t) => {
    const played = playedBlitzIds.has(t.id);
    const isActive = round?.blitzTaskId === t.id;
    const result = history.find((r) => r.type === "blitz" && r.blitzTaskId === t.id);
    const team = result ? teams.find((tm) => tm.id === result.teamId) : undefined;
    return {
      active: isActive && !played,
      team: team?.id,
      score: result?.score,
    };
  });

  const currentTask = blitzTasks.find((t) => t.id === round?.blitzTaskId);
  const currentItem =
    currentTask && round?.blitzItemIndex != null
      ? currentTask.items[round.blitzItemIndex]
      : undefined;
  const captainPlayer = players.find((p) => p.name === round?.captainName);

  const taskCardVisible = phase === "blitz-review";

  return (
    <div className={styles.main}>
      <TaskView topics={taskViewTopics} blitzRounds={taskViewBlitz} />
      {currentItem && (
        <div className={styles.taskCardWrap}>
          <TaskCard
            topic=""
            player={captainPlayer}
            difficulty={currentItem.difficulty}
            question={currentItem.text}
            hidden={!taskCardVisible}
          />
        </div>
      )}
      {phase === "blitz-review" && round?.reviewResult && (
        <BlitzChainDiagram />
      )}
    </div>
  );
}

function BlitzChainDiagram() {
  const round = useCurrentRound();
  const players = usePlayers();
  if (!round || round.type !== "blitz") return null;
  const order = round.playerOrder ?? [];
  const review = round.reviewResult;
  const answerer = review?.evaluations[0]?.playerName;

  return (
    <div className={styles.chain}>
      {order.map((name, idx) => {
        const p = players.find((pp) => pp.name === name);
        const isAnswerer = name === answerer;
        return (
          <div key={name} className={styles.chainLink}>
            <span className={styles.chainEmoji}>{p?.emoji ?? "?"}</span>
            <span className={styles.chainName}>{name}</span>
            {idx < order.length - 1 && <span className={styles.chainArrow}>→</span>}
            {isAnswerer && (
              <span className={styles.chainAnswer}>
                +{review?.score ?? 0}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Sidebar() {
  const teams = useTeams();
  const players = usePlayers();
  const phase = usePhase() as BlitzPhase;
  const round = useCurrentRound();
  const { t } = useTranslation();

  if (!round) return null;
  
  const activeTeam = teams.find(team => team.id === round.teamId);
  const teamPlayers = players.filter((p) => p.team === activeTeam?.id);

  return (
    <div className={styles.sidebar}>
      <TeamScore teams={teams} />
      <TimerView />
      <TeamGroup
        label={t(`team.${activeTeam?.id}`)}
        teamColor={activeTeam?.id ?? "none"}
        playerCount={teamPlayers.length}
      >
        <PlayerStatusTable
          players={teamPlayers.map((p) => ({
            ...p, ...getBlitzPlayerInfo(phase, p.name, round, p.ready)
          }))}
        />
      </TeamGroup>
      
      <SidebarActions />
    </div>
  );
}

function SidebarActions() {
  const { t } = useTranslation();
  const phase = usePhase() as BlitzPhase;

  if (phase === "blitz-review") {
    return (
      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={() => confirmBlitzReview()}>
          {t("round.nextRound")}
        </button>
      </div>
    );
  }
  return null;
}

function TimerView() {
  const timer = useTimerState();
  if (!timer) return null;
  return <CircleTimer startedAt={timer.startedAt} durationMs={timer.duration} />;
}
