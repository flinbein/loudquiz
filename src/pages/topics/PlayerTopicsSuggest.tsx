import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  usePhase,
  usePlayers,
  useSettings,
  useTimer,
  useTopicsSuggest,
} from "@/store/selectors";
import { TimerInput } from "@/components/TimerInput/TimerInput";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";
import type { PlayerAction } from "@/types/transport";
import styles from "./PlayerTopicsSuggest.module.css";
import { Sticker } from "@/components/Sticker/Sticker";

interface Props {
  playerName: string;
  sendAction: (a: PlayerAction) => void;
}

export function PlayerTopicsSuggest({ playerName, sendAction }: Props) {
  const phase = usePhase();
  const ts = useTopicsSuggest();
  const settings = useSettings();
  const timer = useTimer();
  const players = usePlayers();
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const me = players.find((p) => p.name === playerName);
  const myTopics = ts?.suggestions[playerName] ?? [];
  const inNoIdeas = ts?.noIdeas.includes(playerName) ?? false;
  const manualByHost = ts?.manualTopics != null;
  const atLimit = myTopics.length >= settings.topicCount;
  const blocked = inNoIdeas || manualByHost || atLimit;

  if (phase === "topics-collecting") {
    return (
      <div className={styles.screen}>
        <h2>{t("topics.player.title")}</h2>
        <div className={styles.counter}>
          {myTopics.length}/{settings.topicCount}
        </div>
        {timer && !manualByHost && (
          <TimerInput
            startedAt={timer.startedAt}
            durationMs={timer.duration}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={blocked}
            placeholder={t("topics.player.placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim() && !blocked) {
                sendAction({ kind: "suggest-topic", text: draft.trim() });
                setDraft("");
              }
            }}
          />
        )}
        <div className={styles.stickers}>
          {myTopics.map((text, i) => (
            <Sticker key={i} answerText={text} player={me} hideAvatar />
          ))}
        </div>
        <button disabled={blocked} onClick={() => sendAction({ kind: "no-ideas" })}>
          {t("topics.player.noIdeas")}
        </button>
      </div>
    );
  }

  if (phase === "topics-generating") {
    return (
      <div className={styles.screen}>
        <div className={styles.loader}>{t("topics.player.preparing")}</div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <TaskBoardBlock playerName={playerName} />
      <button
        disabled={!me || me.team === "none"}
        onClick={() => sendAction({ kind: "start-first-round" })}
      >
        {t("topics.preview.startRound")}
      </button>
    </div>
  );
}
