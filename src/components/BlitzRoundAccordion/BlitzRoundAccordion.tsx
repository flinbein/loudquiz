import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BlitzItem, BlitzTask } from "@/types/game";
import styles from "./BlitzRoundAccordion.module.css";

export interface BlitzRoundAccordionProps {
  task: BlitzTask;
  roundIndex: number;
  defaultOpen?: boolean;
  onUpdateItem: (itemIndex: number, item: BlitzItem) => void;
  onDeleteItem: (itemIndex: number) => void;
  onAddItem: () => void;
  onDeleteRound: () => void;
}

const BLITZ_DIFFICULTIES = Array.from({ length: 21 }, (_, i) => 200 + i * 10);
const MAX_ITEMS = 5;
const MIN_ITEMS = 3;

export function BlitzRoundAccordion({
  task,
  roundIndex,
  defaultOpen = false,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onDeleteRound,
}: BlitzRoundAccordionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(200);

  function startEdit(index: number) {
    const item = task.items[index]!;
    setEditingIndex(index);
    setEditText(item.text);
    setEditDifficulty(item.difficulty);
  }

  function saveEdit() {
    if (editingIndex == null) return;
    onUpdateItem(editingIndex, { text: editText, difficulty: editDifficulty });
    setEditingIndex(null);
  }

  return (
    <div className={styles.accordion}>
      <div className={styles.header} onClick={() => setOpen(!open)}>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}>
          ▸
        </span>
        <span className={styles.headerText}>
          {t("constructor.roundWords", {
            n: roundIndex + 1,
            count: task.items.length,
          })}
        </span>
        <button
          type="button"
          className={styles.deleteRoundBtn}
          aria-label="delete round"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRound();
          }}
        >
          ✕
        </button>
      </div>
      {open && (
        <div className={styles.body}>
          {task.items.map((item, i) =>
            editingIndex === i ? (
              <div key={i} className={styles.editRow}>
                <input
                  className={styles.editInput}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <select
                  className={styles.difficultySelect}
                  value={editDifficulty}
                  onChange={(e) =>
                    setEditDifficulty(Number(e.target.value))
                  }
                >
                  {BLITZ_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.actionBtn}
                  aria-label="save"
                  onClick={saveEdit}
                >
                  ✓
                </button>
              </div>
            ) : (
              <div key={i} className={styles.itemRow}>
                <span className={styles.itemText}>{item.text}</span>
                <span className={styles.itemDifficulty}>
                  {item.difficulty}
                </span>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    aria-label="edit item"
                    onClick={() => startEdit(i)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    aria-label="delete item"
                    onClick={() => onDeleteItem(i)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ),
          )}
          {task.items.length < MAX_ITEMS && (
            <button
              type="button"
              className={styles.addBtn}
              onClick={onAddItem}
            >
              {t("constructor.addWord")}
            </button>
          )}
          {task.items.length < MIN_ITEMS && (
            <div className={styles.warning}>
              {t("constructor.minItemsWarning", { min: MIN_ITEMS })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
