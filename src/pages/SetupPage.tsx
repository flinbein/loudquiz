import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { GameSettings, QuestionsFile, TeamData } from "@/types/game";
import { useGameStore, defaultSettings } from "@/store/gameStore";
import { saveGameState, clearGameState, clearRoomId } from "@/persistence/sessionPersistence";
import {
  getApiKey,
  setApiKey,
  getConstructorData,
} from "@/persistence/localPersistence";
import { trimQuestionsFileForDual } from "@/logic/dualModeTrim";
import styles from "./SetupPage.module.css";

export function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [teamMode, setTeamMode] = useState<"single" | "dual">(
    defaultSettings.teamMode,
  );
  const [mode, setMode] = useState<"manual" | "ai">(defaultSettings.mode);
  const [topicCount, setTopicCount] = useState(defaultSettings.topicCount);
  const [questionsPerTopic, setQuestionsPerTopic] = useState(
    defaultSettings.questionsPerTopic,
  );
  const [blitzRounds, setBlitzRounds] = useState(
    defaultSettings.blitzRoundsPerTeam,
  );
  const [apiKeyValue, setApiKeyValue] = useState(getApiKey);
  const [questionsFile, setQuestionsFile] = useState<QuestionsFile | null>(
    () => getConstructorData(),
  );
  const [fileName, setFileName] = useState<string | null>(() =>
    getConstructorData() ? t("setup.fromConstructor") : null,
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as QuestionsFile;
        if (!data.topics || !Array.isArray(data.topics)) {
          setError("Invalid JSON: missing topics array");
          return;
        }
        setQuestionsFile(data);
        setFileName(file.name);
        setError(null);
      } catch {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleCreateGame() {
    if (mode === "manual" && !questionsFile) {
      setError("Please upload a questions file");
      return;
    }
    if (mode === "ai") {
      if (topicCount * questionsPerTopic <= 0 && blitzRounds <= 0) {
        setError("Need at least some questions or blitz rounds");
        return;
      }
      setApiKey(apiKeyValue);
    }

    const settings: GameSettings = {
      mode,
      teamMode,
      topicCount,
      questionsPerTopic,
      blitzRoundsPerTeam: blitzRounds,
      pastQuestions: [],
    };

    const teams: TeamData[] =
      teamMode === "dual"
        ? [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }]
        : [{ id: "none", score: 0, jokerUsed: false }];

    let finalTopics = questionsFile?.topics ?? [];
    let finalBlitzTasks = questionsFile?.blitzTasks ?? [];
    if (mode === "manual" && questionsFile) {
      const trimmed = trimQuestionsFileForDual(questionsFile, teamMode);
      finalTopics = trimmed.topics;
      finalBlitzTasks = trimmed.blitzTasks;
    }

    clearGameState();
    clearRoomId();
    sessionStorage.removeItem("loud-quiz-player-room");

    const store = useGameStore.getState();
    store.resetGame();
    store.setState({
      settings,
      teams,
      topics: finalTopics,
      blitzTasks: finalBlitzTasks,
    });

    saveGameState(useGameStore.getState());
    navigate("/play");
  }

  const totalQuestions = questionsFile
    ? questionsFile.topics.reduce((sum, topic) => sum + topic.questions.length, 0)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.form}>
        <h1 className={styles.title}>{t("setup.title")}</h1>

        {/* Team Mode */}
        <label className={styles.sectionLabel}>{t("setup.teamMode")}</label>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleCard} ${teamMode === "single" ? styles.active : ""}`}
            onClick={() => setTeamMode("single")}
          >
            <span className={styles.toggleIcon}>👥</span>
            <span className={styles.toggleTitle}>{t("setup.single")}</span>
            <span className={styles.toggleDesc}>{t("setup.singleDesc")}</span>
          </button>
          <button
            className={`${styles.toggleCard} ${teamMode === "dual" ? styles.active : ""}`}
            onClick={() => setTeamMode("dual")}
          >
            <span className={styles.toggleIcon}>⚔️</span>
            <span className={styles.toggleTitle}>{t("setup.dual")}</span>
            <span className={styles.toggleDesc}>{t("setup.dualDesc")}</span>
          </button>
        </div>

        {/* Question Source */}
        <label className={styles.sectionLabel}>{t("setup.source")}</label>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleCard} ${mode === "manual" ? styles.active : ""}`}
            onClick={() => setMode("manual")}
          >
            <span className={styles.toggleIcon}>📄</span>
            <span className={styles.toggleTitle}>{t("setup.manual")}</span>
            <span className={styles.toggleDesc}>{t("setup.manualDesc")}</span>
          </button>
          <button
            className={`${styles.toggleCard} ${mode === "ai" ? styles.active : ""}`}
            onClick={() => setMode("ai")}
          >
            <span className={styles.toggleIcon}>🤖</span>
            <span className={styles.toggleTitle}>{t("setup.ai")}</span>
            <span className={styles.toggleDesc}>{t("setup.aiDesc")}</span>
          </button>
        </div>

        {/* Manual: file upload */}
        {mode === "manual" && (
          <>
            <div
              className={styles.dropZone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {questionsFile ? (
                <div className={styles.preview}>
                  <div className={styles.previewTitle}>{fileName}</div>
                  <div className={styles.previewStats}>
                    {questionsFile.topics.length} {t("setup.topics")} ·{" "}
                    {totalQuestions} {t("setup.questions")} ·{" "}
                    {questionsFile.blitzTasks?.length ?? 0} {t("setup.blitzTasks")}
                  </div>
                  <ul className={styles.previewTopics}>
                    {questionsFile.topics.map((topic) => (
                      <li key={topic.name}>
                        {topic.name} ({topic.questions.length})
                      </li>
                    ))}
                  </ul>
                  <button
                    className={styles.replaceBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    {t("setup.replaceJson")}
                  </button>
                </div>
              ) : (
                <>
                  <span className={styles.dropIcon}>📁</span>
                  <span>{t("setup.uploadJson")}</span>
                  <span className={styles.dropHint}>
                    {t("setup.uploadJsonClick")}
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </>
        )}

        {/* AI: settings */}
        {mode === "ai" && (
          <div className={styles.aiSettings}>
            <div className={styles.field}>
              <label>{t("setup.apiKey")}</label>
              <input
                type="password"
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
                placeholder="sk-or-..."
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>{t("setup.topicCount")}</label>
                <input
                  type="number"
                  min={0}
                  value={topicCount}
                  onChange={(e) => setTopicCount(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label>{t("setup.questionsPerTopic")}</label>
                <input
                  type="number"
                  min={0}
                  value={questionsPerTopic}
                  onChange={(e) =>
                    setQuestionsPerTopic(Number(e.target.value))
                  }
                />
              </div>
              <div className={styles.field}>
                <label>{t("setup.blitzRounds")}</label>
                <input
                  type="number"
                  min={0}
                  value={blitzRounds}
                  onChange={(e) => setBlitzRounds(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.createBtn} onClick={handleCreateGame}>
          {t("setup.createGame")}
        </button>
      </div>
    </div>
  );
}
