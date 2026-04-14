import { useState } from "react";
import { useTranslation } from "react-i18next";
import { generateTopics } from "@/ai/topicGeneration";
import type { TopicGenerationResult } from "@/types/ai";
import type { Topic } from "@/types/game";
import styles from "./AITopicGenerator.module.css";

export interface AITopicGeneratorProps {
  apiKey: string;
  language: string;
  onApply: (topics: Topic[]) => void;
}

const MAX_LINES = 60;

export function AITopicGenerator({
  apiKey,
  language,
  onApply,
}: AITopicGeneratorProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState("");
  const [topicCount, setTopicCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopicGenerationResult | null>(null);

  const lineCount = suggestions
    ? suggestions.split("\n").filter(Boolean).length
    : 0;

  function handleSuggestionsChange(value: string) {
    const lines = value.split("\n");
    if (lines.length > MAX_LINES) {
      setSuggestions(lines.slice(0, MAX_LINES).join("\n"));
    } else {
      setSuggestions(value);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const lines = suggestions
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const res = await generateTopics(
        apiKey,
        {
          suggestions: lines.map((text) => ({ playerName: "", text })),
          topicCount,
          pastTopics: [],
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
      questions: [],
    }));
    onApply(topics);
    setResult(null);
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        {t("constructor.ai.topicGeneration")}
      </div>

      <div className={styles.label}>{t("constructor.ai.suggestions")}</div>
      <textarea
        className={styles.textarea}
        value={suggestions}
        onChange={(e) => handleSuggestionsChange(e.target.value)}
        placeholder={t("constructor.ai.suggestionsHint", { max: MAX_LINES })}
        rows={4}
      />
      <div className={styles.counter}>
        {lineCount} / {MAX_LINES}
      </div>

      <div className={styles.row}>
        <span className={styles.label}>{t("constructor.ai.topicCount")}</span>
        <input
          type="number"
          className={styles.numInput}
          value={topicCount}
          min={1}
          max={10}
          onChange={(e) => setTopicCount(Number(e.target.value))}
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

      {!apiKey && (
        <div className={styles.hint}>{t("constructor.ai.noApiKey")}</div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t("constructor.ai.loading.topics")}</span>
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
          <div className={styles.previewTitle}>
            {t("constructor.ai.result")}
          </div>
          {result.topics.map((topic, i) => (
            <div key={i} className={styles.previewItem}>
              <span>{topic.name}</span>
              <span className={styles.previewReason}>{topic.reason}</span>
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
            {t("constructor.ai.replaceWarning.topics")}
          </div>
        </div>
      )}
    </div>
  );
}
