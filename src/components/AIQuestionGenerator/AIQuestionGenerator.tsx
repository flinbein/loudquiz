import { useState } from "react";
import { useTranslation } from "react-i18next";
import { generateQuestions } from "@/ai/questionGeneration";
import type { QuestionGenerationResult } from "@/types/ai";
import type { Topic } from "@/types/game";
import styles from "./AIQuestionGenerator.module.css";

export interface AIQuestionGeneratorProps {
  apiKey: string;
  language: string;
  topicNames: string[];
  onApply: (topics: Topic[]) => void;
}

export function AIQuestionGenerator({
  apiKey,
  language,
  topicNames,
  onApply,
}: AIQuestionGeneratorProps) {
  const { t } = useTranslation();
  const [playersCount, setPlayersCount] = useState(6);
  const [questionsPerTopic, setQuestionsPerTopic] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionGenerationResult | null>(null);

  const canGenerate = apiKey && topicNames.length > 0 && !loading;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateQuestions(
        apiKey,
        {
          topics: topicNames,
          questionsPerTopic,
          playersPerTeam: playersCount,
          pastQuestions: [],
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
    const topics: Topic[] = result.topics.map((t) => ({
      name: t.name,
      questions: t.questions.map((q) => ({
        text: q.text,
        difficulty: q.difficulty,
        acceptedAnswers: q.acceptedAnswers,
      })),
    }));
    onApply(topics);
    setResult(null);
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        {t("constructor.ai.questionGeneration")}
      </div>

      <div className={styles.row}>
        <span className={styles.label}>{t("constructor.ai.playersCount")}</span>
        <input
          type="number"
          className={styles.numInput}
          value={playersCount}
          min={1}
          max={10}
          onChange={(e) =>
            setPlayersCount(Math.min(10, Number(e.target.value)))
          }
        />
        <span className={styles.label}>
          {t("constructor.ai.questionsPerTopic")}
        </span>
        <input
          type="number"
          className={styles.numInput}
          value={questionsPerTopic}
          min={1}
          max={20}
          onChange={(e) => setQuestionsPerTopic(Number(e.target.value))}
        />
        <button
          type="button"
          className={styles.generateBtn}
          disabled={!canGenerate}
          onClick={handleGenerate}
        >
          {t("constructor.ai.generate")}
        </button>
      </div>

      {topicNames.length === 0 && (
        <div className={styles.hint}>{t("constructor.ai.noTopics")}</div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t("constructor.ai.loading.questions")}</span>
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
          {result.topics.map((topic, i) => (
            <div key={i}>
              <strong>{topic.name}</strong>
              {topic.questions.map((q, j) => (
                <div key={j} className={styles.previewItem}>
                  <span>{q.text}</span>
                  <span className={styles.previewReason}>{q.difficulty}</span>
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
            {t("constructor.ai.replaceWarning.questions")}
          </div>
        </div>
      )}
    </div>
  );
}
