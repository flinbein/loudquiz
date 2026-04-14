import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Question } from "@/types/game";
import styles from "./QuestionList.module.css";

export interface QuestionListProps {
  questions: Question[];
  onUpdate: (index: number, question: Question) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
  onCheck: (index: number) => void;
}

const DIFFICULTIES = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];

export function QuestionList({
  questions,
  onUpdate,
  onDelete,
  onAdd,
  onCheck,
}: QuestionListProps) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(100);

  function startEdit(index: number) {
    const q = questions[index]!;
    setEditingIndex(index);
    setEditText(q.text);
    setEditDifficulty(q.difficulty);
  }

  function saveEdit() {
    if (editingIndex == null) return;
    const q = questions[editingIndex]!;
    onUpdate(editingIndex, {
      text: editText,
      difficulty: editDifficulty,
      acceptedAnswers: q.acceptedAnswers,
    });
    setEditingIndex(null);
  }

  return (
    <div>
      <div className={styles.label}>
        {t("constructor.questionCount", { count: questions.length })}
      </div>
      <div className={styles.list}>
        {questions.map((q, i) =>
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
                onChange={(e) => setEditDifficulty(Number(e.target.value))}
              >
                {DIFFICULTIES.map((d) => (
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
            <div key={i} className={styles.row}>
              <span className={styles.text}>{q.text}</span>
              <span className={styles.difficulty}>{q.difficulty}</span>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  aria-label="check answers"
                  onClick={() => onCheck(i)}
                >
                  ✓
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  aria-label="edit"
                  onClick={() => startEdit(i)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  aria-label="delete"
                  onClick={() => onDelete(i)}
                >
                  ✕
                </button>
              </div>
            </div>
          ),
        )}
      </div>
      <button type="button" className={styles.addBtn} onClick={onAdd}>
        {t("constructor.addQuestion")}
      </button>
    </div>
  );
}
