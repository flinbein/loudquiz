import { useTranslation } from "react-i18next";
import {
  usePhase,
  usePlayers,
  useTimer,
  useTopicsSuggest,
  useSettings,
} from "@/store/selectors";
import { CircleTimer } from "@/components/CircleTimer/CircleTimer";
import {
  PlayerStatusTable,
  type PlayerStatusRow,
  type PlayerStatus,
} from "@/components/PlayerStatusTable/PlayerStatusTable";
import styles from "./TopicsSidebarBlock.module.css";

export function TopicsSidebarBlock() {
  const phase = usePhase();
  const players = usePlayers();
  const ts = useTopicsSuggest();
  const timer = useTimer();
  const settings = useSettings();
  const { t } = useTranslation();

  const playerRows: PlayerStatusRow[] = players.map((p) => {
    const mine = ts?.suggestions[p.name]?.length ?? 0;
    const noIdeas = ts?.noIdeas.includes(p.name) ?? false;
    let status: PlayerStatus = "waiting";
    if (noIdeas) status = "wrong";
    else if (mine >= settings.topicCount) status = "right";
    else if (mine > 0) status = "answered";
    return {
      name: p.name,
      emoji: p.emoji,
      team: p.team,
      online: p.online,
      role: "player",
      status,
    };
  });

  const showTimer =
    phase === "topics-collecting" && timer && ts?.manualTopics === null;

  return (
    <div className={styles.sidebar}>
      {showTimer && (
        <div className={styles.timer}>
          <CircleTimer
            startedAt={timer.startedAt}
            durationMs={timer.duration}
          />
        </div>
      )}
      {phase === "topics-generating" && (
        <div className={styles.loader}>
          {t(`topics.generating.${ts?.generationStep ?? "topics"}`)}
        </div>
      )}
      <PlayerStatusTable players={playerRows} />
    </div>
  );
}
