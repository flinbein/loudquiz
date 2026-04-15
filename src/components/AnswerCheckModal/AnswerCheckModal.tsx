import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { checkAnswers } from "@/ai/answerCheck";
import type { AnswerCheckResult } from "@/types/ai";
import type { Question } from "@/types/game";
import styles from "./AnswerCheckModal.module.css";

export interface AnswerCheckModalProps {
  open: boolean;
  question: Question;
  apiKey: string;
  language: string;
  onClose: () => void;
}

const MAX_LINES = 10;

export function AnswerCheckModal({
  open,
  question,
  apiKey,
  language,
  onClose,
}: AnswerCheckModalProps) {
  const { t } = useTranslation();
  const templateNames = t("constructor.templateNames").split(",");

  const [answers, setAnswers] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerCheckResult | null>(null);

  useEffect(() => {
    if (open) {
      setAnswers(question.acceptedAnswers.join("\n"));
      setResult(null);
      setError(null);
    }
  }, [open, question]);

  if (!open) return null;

  const lineCount = answers ? answers.split("\n").filter(Boolean).length : 0;

  function handleAnswersChange(value: string) {
    const lines = value.split("\n");
    if (lines.length > MAX_LINES) {
      setAnswers(lines.slice(0, MAX_LINES).join("\n"));
    } else {
      setAnswers(value);
    }
  }

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const lines = answers
        .split("\n")
        .map((l) => l.trim());
      const res = await checkAnswers(
        apiKey,
        {
          question: question.text,
          answers: lines.map((answer, i) => ({
            playerName: templateNames[i] ?? `Player${i + 1}`,
            answer,
          })),
          captainName: templateNames[templateNames.length - 1] ?? "Captain"
        },
        language,
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.title}>
          {t("constructor.answerCheck.title", { question: question.text })}
        </div>

        <div className={styles.label}>
          {t("constructor.answerCheck.answersLabel")}
        </div>
        <textarea
          className={styles.textarea}
          value={answers}
          onChange={(e) => handleAnswersChange(e.target.value)}
          placeholder={t("constructor.answerCheck.answersHint")}
          rows={5}
        />
        <div className={styles.counter}>
          {lineCount} / {MAX_LINES}
        </div>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {result && (
          <div className={styles.results}>
            {result.results.map((r, i) => (
              <div key={i} className={styles.resultRow}>
                <span>
                  <span className={styles.playerName}>{r.playerName}: </span>
                  {answers.split("\n")[i] ?? ""}
                </span>
                <span
                  className={r.accepted ? styles.accepted : styles.rejected}
                >
                  {r.accepted
                    ? t("constructor.answerCheck.accepted")
                    : t("constructor.answerCheck.rejected")}
                  {r.group != null &&
                    ` (${t("constructor.answerCheck.group", { n: r.group })})`}
                </span>
                <div className={styles.resultNote}>
                  {r.note}
                </div>
              </div>
            ))}
            {result.comment && (
              <div className={styles.comment}>{result.comment}</div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.checkBtn}
            disabled={loading || lineCount === 0}
            onClick={handleCheck}
          >
            {t("constructor.answerCheck.check")}
          </button>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            {t("constructor.answerCheck.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
