import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { QuestionsFile, Topic, BlitzTask } from "../game/types";
import {
  importJson,
  exportJson,
  downloadJson,
  emptyQuestionsFile,
  emptyTopic,
  emptyBlitzTask,
} from "../components/constructor/constructorUtils";
import TopicEditor from "../components/constructor/TopicEditor";
import BlitzTaskEditor from "../components/constructor/BlitzTaskEditor";
import AIPanel from "../components/constructor/AIPanel";
import { ThemeToggle } from "../components/shared/ThemeToggle";

const API_KEY_STORAGE = "openrouterApiKey";

const STORAGE_KEY = "constructorState";
type Tab = "topics" | "blitz";

function loadFromStorage(): QuestionsFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyQuestionsFile();
    const parsed = JSON.parse(raw) as QuestionsFile;
    if (!Array.isArray(parsed.topics)) return emptyQuestionsFile();
    if (Array.isArray(parsed.blitzTasks)) {
      parsed.blitzTasks = parsed.blitzTasks.map((t: unknown) => {
        const task = t as Record<string, unknown>;
        if (!Array.isArray(task.items) && typeof task.text === "string") {
          return {
            id: task.id,
            items: [{ text: task.text, difficulty: task.difficulty ?? 200 }],
          };
        }
        return task;
      }) as unknown as QuestionsFile["blitzTasks"];
    }
    return parsed;
  } catch {
    return emptyQuestionsFile();
  }
}

export default function ConstructorPage() {
  const [data, setData] = useState<QuestionsFile>(loadFromStorage);
  const [tab, setTab] = useState<Tab>("topics");
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(API_KEY_STORAGE) ?? "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleApiKeyChange(key: string) {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE, key);
  }

  function handleApplyTopics(topics: Topic[]) {
    setData((prev) => ({ ...prev, topics }));
    setTab("topics");
  }

  function handleApplyBlitz(tasks: BlitzTask[]) {
    setData((prev) => ({
      ...prev,
      blitzTasks: [...(prev.blitzTasks ?? []), ...tasks],
    }));
    setTab("blitz");
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, exportJson(data));
    } catch {
      // ignore
    }
  }, [data]);

  function handleClear() {
    if (!confirm("Очистить все данные? Это действие нельзя отменить.")) return;
    const fresh = emptyQuestionsFile();
    setData(fresh);
    setImportError(null);
    setImportWarnings([]);
  }

  function handleExport() {
    downloadJson(data);
  }

  function handleImportClick() {
    setImportError(null);
    setImportWarnings([]);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = importJson(ev.target?.result as string);
        setData(result.data);
        setImportWarnings(result.warnings);
        setImportError(null);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : "Ошибка импорта",
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const totalQuestions = data.topics.reduce(
    (s, t) => s + t.questions.length,
    0,
  );
  const totalBlitz = data.blitzTasks?.length ?? 0;

  const btnCls =
    "px-4 py-2 text-sm rounded-lg font-medium transition-all";

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors text-sm font-medium"
          >
            ← Главная
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Редактор вопросов
          </h1>
          <span className="text-slate-400 dark:text-slate-500 text-sm">
            {data.topics.length} тем · {totalQuestions} вопросов · {totalBlitz}{" "}
            блиц
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className={`${btnCls} bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-sm`}
          >
            Импорт JSON
          </button>
          <button
            onClick={handleExport}
            className={`${btnCls} bg-indigo-600 hover:bg-indigo-500 text-white`}
          >
            Экспорт JSON
          </button>
          <button
            onClick={handleClear}
            className={`${btnCls} bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300`}
          >
            Очистить
          </button>
        </div>
      </header>

      {/* Import error / warnings */}
      {importError && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          Ошибка импорта: {importError}
        </div>
      )}
      {importWarnings.length > 0 && (
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 dark:bg-yellow-900/30 border border-amber-200 dark:border-yellow-700 rounded-lg text-amber-800 dark:text-yellow-300 text-sm space-y-1">
          <div className="font-medium">Предупреждения при импорте:</div>
          {importWarnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setTab("topics")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            tab === "topics"
              ? "bg-white dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          Темы и вопросы ({data.topics.length})
        </button>
        <button
          onClick={() => setTab("blitz")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            tab === "blitz"
              ? "bg-white dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          Блиц-задания ({totalBlitz})
        </button>
      </div>

      {/* AI Panel */}
      <div className="px-6 pt-5 max-w-4xl">
        <AIPanel
          data={data}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          onApplyTopics={handleApplyTopics}
          onApplyBlitz={handleApplyBlitz}
        />
      </div>

      {/* Content */}
      <main className="px-6 py-6 space-y-6 max-w-4xl">
        {tab === "topics" && (
          <>
            {data.topics.map((topic, ti) => (
              <TopicEditor
                key={ti}
                topic={topic}
                index={ti}
                apiKey={apiKey}
                onChange={(updated) =>
                  setData({
                    ...data,
                    topics: data.topics.map((t, i) =>
                      i === ti ? updated : t,
                    ),
                  })
                }
                onDelete={() =>
                  setData({
                    ...data,
                    topics: data.topics.filter((_, i) => i !== ti),
                  })
                }
              />
            ))}
            <button
              onClick={() =>
                setData({ ...data, topics: [...data.topics, emptyTopic()] })
              }
              className="px-4 py-2.5 text-sm rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              + Добавить тему
            </button>
          </>
        )}

        {tab === "blitz" && (
          <>
            {(data.blitzTasks ?? []).map((task, ti) => (
              <BlitzTaskEditor
                key={task.id}
                task={task}
                index={ti}
                onChange={(updated) =>
                  setData({
                    ...data,
                    blitzTasks: (data.blitzTasks ?? []).map((t, i) =>
                      i === ti ? updated : t,
                    ),
                  })
                }
                onDelete={() =>
                  setData({
                    ...data,
                    blitzTasks: (data.blitzTasks ?? []).filter(
                      (_, i) => i !== ti,
                    ),
                  })
                }
              />
            ))}
            <button
              onClick={() =>
                setData({
                  ...data,
                  blitzTasks: [
                    ...(data.blitzTasks ?? []),
                    emptyBlitzTask(),
                  ],
                })
              }
              className="px-4 py-2.5 text-sm rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              + Добавить блиц-задание
            </button>
          </>
        )}
      </main>
    </div>
  );
}
