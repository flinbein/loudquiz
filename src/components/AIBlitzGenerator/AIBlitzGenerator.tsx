import { useState } from "react";
import { useTranslation } from "react-i18next";
import { generateBlitzTasks } from "@/ai/blitzGeneration";
import type { BlitzGenerationResult } from "@/types/ai";
import type { BlitzTask } from "@/types/game";
import styles from "./AIBlitzGenerator.module.css";

export interface AIBlitzGeneratorProps {
  apiKey: string;
  language: string;
  onApply: (tasks: BlitzTask[]) => void;
}

export function AIBlitzGenerator({
  apiKey,
  language,
  onApply,
}: AIBlitzGeneratorProps) {
  const { t } = useTranslation();
  const [roundsCount, setRoundsCount] = useState(3);
  const [wordsPerRound, setWordsPerRound] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BlitzGenerationResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateBlitzTasks(
        apiKey,
        {
          rounds: roundsCount,
          tasksPerRound: wordsPerRound,
          pastTasks: [],
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

  function handleApply() {
    if (!result) return;
    const tasks: BlitzTask[] = result.rounds.map((r) => ({
      items: r.items.map((item) => ({
        text: item.text,
        difficulty: item.difficulty,
      })),
    }));
    onApply(tasks);
    setResult(null);
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        {t("constructor.ai.blitzGeneration")}
      </div>

      <div className={styles.row}>
        <span className={styles.label}>{t("constructor.ai.roundsCount")}</span>
        <input
          type="number"
          className={styles.numInput}
          value={roundsCount}
          min={1}
          max={10}
          onChange={(e) => setRoundsCount(Number(e.target.value))}
        />
        <span className={styles.label}>{t("constructor.ai.wordsPerRound")}</span>
        <input
          type="number"
          className={styles.numInput}
          value={wordsPerRound}
          min={3}
          max={5}
          onChange={(e) => setWordsPerRound(Number(e.target.value))}
        />
        <button
          type="button"
          className={styles.generateBtn}
          disabled={!apiKey || loading}
          onClick={handleGenerate}
        >
          {t("constructor.ai.generate")}
        </button>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t("constructor.ai.loading.blitz")}</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span className={styles.errorText}>{error}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={handleGenerate}
          >
            {t("constructor.ai.retry")}
          </button>
        </div>
      )}

      {result && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>{t("constructor.ai.result")}</div>
          {result.rounds.map((round, i) => (
            <div key={i}>
              <strong>
                {t("constructor.roundWords", {
                  n: i + 1,
                  count: round.items.length,
                })}
              </strong>
              {round.items.map((item, j) => (
                <div key={j} className={styles.previewItem}>
                  <span>{item.text}</span>
                  <span className={styles.previewReason}>{item.difficulty}</span>
                </div>
              ))}
            </div>
          ))}
          <button
            type="button"
            className={styles.applyBtn}
            onClick={handleApply}
          >
            {t("constructor.ai.apply")}
          </button>
          <div className={styles.warning}>
            {t("constructor.ai.replaceWarning.blitz")}
          </div>
        </div>
      )}
    </div>
  );
}
