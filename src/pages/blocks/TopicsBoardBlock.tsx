import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { usePlayers, useTopicsSuggest } from "@/store/selectors";
import { Sticker } from "@/components/Sticker/Sticker";
import type { PlayerDisplay } from "@/types/game";
import styles from "./TopicsBoardBlock.module.css";

interface Entry {
  id: string;
  text: string;
  player: PlayerDisplay;
}

export function TopicsBoardBlock() {
  const players = usePlayers();
  const ts = useTopicsSuggest();
  const containerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  const entries: Entry[] = useMemo(() => {
    if (!ts) return [];
    const out: Entry[] = [];
    for (const [name, topics] of Object.entries(ts.suggestions)) {
      const p = players.find((pp) => pp.name === name);
      if (!p) continue;
      topics.forEach((txt, i) => {
        out.push({
          id: `${name}-${i}`,
          text: txt,
          player: { name: p.name, emoji: p.emoji, team: p.team },
        });
      });
    }
    return out;
  }, [ts, players]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 20;
    wasAtBottomRef.current =
      el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (wasAtBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.grid}>
        {entries.map((e) => (
          <Sticker key={e.id} player={e.player} answerText={e.text} />
        ))}
      </div>
    </div>
  );
}
