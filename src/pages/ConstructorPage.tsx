import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type {
  QuestionsFile,
  Topic,
  Question,
  BlitzTask,
  BlitzItem,
} from "@/types/game";
import {
  getConstructorData,
  setConstructorData,
  getApiKey,
  setApiKey,
  setLanguage,
} from "@/persistence/localPersistence";
import { validateQuestionsFile } from "@/logic/validateQuestionsFile";
import { TopicChips } from "@/components/TopicChips/TopicChips";
import { QuestionList } from "@/components/QuestionList/QuestionList";
import { BlitzRoundAccordion } from "@/components/BlitzRoundAccordion/BlitzRoundAccordion";
import { AITopicGenerator } from "@/components/AITopicGenerator/AITopicGenerator";
import { AIQuestionGenerator } from "@/components/AIQuestionGenerator/AIQuestionGenerator";
import { AIBlitzGenerator } from "@/components/AIBlitzGenerator/AIBlitzGenerator";
import { AnswerCheckModal } from "@/components/AnswerCheckModal/AnswerCheckModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher/LanguageSwitcher";
import styles from "./ConstructorPage.module.css";

type Tab = "topics" | "blitz" | "ai";

const LANGUAGE_NAMES: Record<string, string> = {
  ru: "русский",
  en: "English",
};

const emptyData: QuestionsFile = { topics: [], blitzTasks: [] };

export function ConstructorPage() {
  const { t, i18n } = useTranslation();

  const [data, setData] = useState<QuestionsFile>(
    () => getConstructorData() ?? { ...emptyData },
  );
  const [tab, setTab] = useState<Tab>("topics");
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [apiKeyValue, setApiKeyValue] = useState(getApiKey);
  const [genLanguage, setGenLanguage] = useState(
    () => LANGUAGE_NAMES[i18n.language] ?? i18n.language,
  );
  const [genLanguageEdited, setGenLanguageEdited] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [checkQuestionIndex, setCheckQuestionIndex] = useState<number | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist on every change
  useEffect(() => {
    setConstructorData(data);
  }, [data]);

  // Sync generation language with UI language if not manually edited
  useEffect(() => {
    if (!genLanguageEdited) {
      setGenLanguage(LANGUAGE_NAMES[i18n.language] ?? i18n.language);
    }
  }, [i18n.language, genLanguageEdited]);

  function handleLanguageChange(lang: string) {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  }

  // --- Topic operations ---
  const updateData = useCallback(
    (updater: (prev: QuestionsFile) => QuestionsFile) => {
      setData(updater);
    },
    [],
  );

  function addTopic() {
    updateData((prev) => ({
      ...prev,
      topics: [...prev.topics, { name: "", questions: [] }],
    }));
    setSelectedTopicIndex(data.topics.length);
  }

  function deleteTopic(index: number) {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index),
    }));
    if (selectedTopicIndex >= data.topics.length - 1) {
      setSelectedTopicIndex(Math.max(0, data.topics.length - 2));
    }
  }

  function updateTopicName(name: string) {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) =>
        i === selectedTopicIndex ? { ...t, name } : t,
      ),
    }));
  }

  function updateQuestion(qIndex: number, question: Question) {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) =>
        i === selectedTopicIndex
          ? {
              ...t,
              questions: t.questions.map((q, j) =>
                j === qIndex ? question : q,
              ),
            }
          : t,
      ),
    }));
  }

  function deleteQuestion(qIndex: number) {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) =>
        i === selectedTopicIndex
          ? { ...t, questions: t.questions.filter((_, j) => j !== qIndex) }
          : t,
      ),
    }));
  }

  function addQuestion() {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) =>
        i === selectedTopicIndex
          ? {
              ...t,
              questions: [
                ...t.questions,
                { text: "", difficulty: 100, acceptedAnswers: [] },
              ],
            }
          : t,
      ),
    }));
  }

  // --- Blitz operations ---
  function addBlitzRound() {
    updateData((prev) => ({
      ...prev,
      blitzTasks: [...prev.blitzTasks, { items: [] }],
    }));
  }

  function deleteBlitzRound(index: number) {
    updateData((prev) => ({
      ...prev,
      blitzTasks: prev.blitzTasks.filter((_, i) => i !== index),
    }));
  }

  function updateBlitzItem(
    roundIndex: number,
    itemIndex: number,
    item: BlitzItem,
  ) {
    updateData((prev) => ({
      ...prev,
      blitzTasks: prev.blitzTasks.map((task, i) =>
        i === roundIndex
          ? {
              ...task,
              items: task.items.map((it, j) => (j === itemIndex ? item : it)),
            }
          : task,
      ),
    }));
  }

  function deleteBlitzItem(roundIndex: number, itemIndex: number) {
    updateData((prev) => ({
      ...prev,
      blitzTasks: prev.blitzTasks.map((task, i) =>
        i === roundIndex
          ? { ...task, items: task.items.filter((_, j) => j !== itemIndex) }
          : task,
      ),
    }));
  }

  function addBlitzItem(roundIndex: number) {
    updateData((prev) => ({
      ...prev,
      blitzTasks: prev.blitzTasks.map((task, i) =>
        i === roundIndex
          ? {
              ...task,
              items: [...task.items, { text: "", difficulty: 200 }],
            }
          : task,
      ),
    }));
  }

  // --- AI apply handlers ---
  function applyTopics(topics: Topic[]) {
    setData({ ...data, topics });
    setSelectedTopicIndex(0);
    setTab("topics");
  }

  function applyQuestions(topics: Topic[]) {
    setData({ ...data, topics });
    setTab("topics");
  }

  function applyBlitzTasks(tasks: BlitzTask[]) {
    setData({ ...data, blitzTasks: tasks });
    setTab("blitz");
  }

  // --- Export / Import ---
  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loud-quiz-questions.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const result = validateQuestionsFile(parsed);
        if (result.valid && result.data) {
          setData(result.data);
          setSelectedTopicIndex(0);
          setImportError(null);
        } else {
          setImportError(result.error ?? t("constructor.importError"));
        }
      } catch {
        setImportError(t("constructor.importError"));
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  }

  // --- API key ---
  function handleApiKeyChange(value: string) {
    setApiKeyValue(value);
    setApiKey(value);
  }

  const selectedTopic = data.topics[selectedTopicIndex];
  const checkQuestion =
    checkQuestionIndex != null
      ? (selectedTopic?.questions[checkQuestionIndex] ?? null)
      : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("constructor.title")}</h1>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "topics" ? styles.tabActive : ""}`}
          onClick={() => setTab("topics")}
        >
          {t("constructor.tabs.topics")}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "blitz" ? styles.tabActive : ""}`}
          onClick={() => setTab("blitz")}
        >
          {t("constructor.tabs.blitz")}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "ai" ? styles.tabActive : ""}`}
          onClick={() => setTab("ai")}
        >
          {t("constructor.tabs.ai")}
        </button>
        <div className={styles.tabBarRight}>
          <button
            type="button"
            className={styles.jsonBtn}
            onClick={handleExport}
          >
            {t("constructor.export")}
          </button>
          <button
            type="button"
            className={styles.jsonBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("constructor.import")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className={styles.hiddenInput}
            onChange={handleImport}
          />
          <LanguageSwitcher
            currentLang={i18n.language}
            onChangeLang={handleLanguageChange}
          />
        </div>
      </div>

      {importError && <div className={styles.error}>{importError}</div>}

      <div className={styles.tabContent}>
        {/* Topics tab */}
        {tab === "topics" && (
          <>
            <TopicChips
              topics={data.topics}
              selectedIndex={selectedTopicIndex}
              onSelect={setSelectedTopicIndex}
              onDelete={deleteTopic}
              onAdd={addTopic}
            />
            {selectedTopic ? (
              <>
                <input
                  className={styles.topicNameInput}
                  value={selectedTopic.name}
                  onChange={(e) => updateTopicName(e.target.value)}
                  placeholder={t("constructor.topicNamePlaceholder")}
                />
                <QuestionList
                  questions={selectedTopic.questions}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                  onAdd={addQuestion}
                  onCheck={(i) => setCheckQuestionIndex(i)}
                />
              </>
            ) : (
              <div className={styles.empty}>{t("constructor.emptyTopics")}</div>
            )}
          </>
        )}

        {/* Blitz tab */}
        {tab === "blitz" && (
          <>
            {data.blitzTasks.length === 0 ? (
              <div className={styles.empty}>{t("constructor.emptyBlitz")}</div>
            ) : (
              data.blitzTasks.map((task, i) => (
                <BlitzRoundAccordion
                  key={i}
                  task={task}
                  roundIndex={i}
                  defaultOpen={i === 0}
                  onUpdateItem={(itemIdx, item) =>
                    updateBlitzItem(i, itemIdx, item)
                  }
                  onDeleteItem={(itemIdx) => deleteBlitzItem(i, itemIdx)}
                  onAddItem={() => addBlitzItem(i)}
                  onDeleteRound={() => deleteBlitzRound(i)}
                />
              ))
            )}
            <button
              type="button"
              className={styles.addRoundBtn}
              onClick={addBlitzRound}
            >
              {t("constructor.addRound")}
            </button>
          </>
        )}

        {/* AI tab */}
        {tab === "ai" && (
          <>
            <div className={styles.aiSettings}>
              <div className={styles.aiSettingsRow}>
                <span className={styles.settingsLabel}>
                  {t("constructor.ai.apiKey")}
                </span>
                <input
                  type="password"
                  className={styles.apiKeyInput}
                  value={apiKeyValue}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={t("constructor.ai.apiKeyPlaceholder")}
                />
              </div>
              <div className={styles.aiSettingsRow}>
                <span className={styles.settingsLabel}>
                  {t("constructor.ai.generationLanguage")}
                </span>
                <input
                  className={styles.langInput}
                  value={genLanguage}
                  onChange={(e) => {
                    setGenLanguage(e.target.value);
                    setGenLanguageEdited(true);
                  }}
                />
              </div>
              <div className={styles.settingsHint}>
                {t("constructor.ai.generationLanguageHint")}
              </div>
            </div>

            <AITopicGenerator
              apiKey={apiKeyValue}
              language={genLanguage}
              onApply={applyTopics}
            />
            <AIQuestionGenerator
              apiKey={apiKeyValue}
              language={genLanguage}
              topicNames={data.topics.map((t) => t.name).filter(Boolean)}
              onApply={applyQuestions}
            />
            <AIBlitzGenerator
              apiKey={apiKeyValue}
              language={genLanguage}
              onApply={applyBlitzTasks}
            />
          </>
        )}
      </div>

      {/* Answer check modal */}
      {checkQuestion && (
        <AnswerCheckModal
          open={checkQuestionIndex != null}
          question={checkQuestion}
          apiKey={apiKeyValue}
          language={genLanguage}
          onClose={() => setCheckQuestionIndex(null)}
        />
      )}
    </div>
  );
}
