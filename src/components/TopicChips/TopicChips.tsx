import { useTranslation } from "react-i18next";
import type { Topic } from "@/types/game";
import styles from "./TopicChips.module.css";

export interface TopicChipsProps {
  topics: Topic[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

export function TopicChips({
  topics,
  selectedIndex,
  onSelect,
  onDelete,
  onAdd,
}: TopicChipsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      {topics.map((topic, i) => (
        <button
          key={i}
          type="button"
          className={styles.chip}
          aria-pressed={i === selectedIndex}
          onClick={() => onSelect(i)}
        >
          {topic.name || t("constructor.topicNamePlaceholder")}
          <span
            role="button"
            aria-label={`delete ${topic.name}`}
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(i);
            }}
          >
            ✕
          </span>
        </button>
      ))}
      <button type="button" className={styles.addChip} onClick={onAdd}>
        {t("constructor.addTopic")}
      </button>
    </div>
  );
}
