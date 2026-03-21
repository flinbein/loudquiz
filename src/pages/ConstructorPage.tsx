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

const API_KEY_STORAGE = "openrouterApiKey";

const STORAGE_KEY = "constructorState";
type Tab = "topics" | "blitz";

function loadFromStorage(): QuestionsFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyQuestionsFile();
    const parsed = JSON.parse(raw) as QuestionsFile;
    if (!Array.isArray(parsed.topics)) return emptyQuestionsFile();
    // migrate old blitz format: {text, difficulty} → {items: [{text, difficulty}]}
    if (Array.isArray(parsed.blitzTasks)) {
      parsed.blitzTasks = parsed.blitzTasks.map((t: unknown) => {
        const task = t as Record<string, unknown>;
        if (!Array.isArray(task.items) && typeof task.text === "string") {
          return { id: task.id, items: [{ text: task.text, difficulty: task.difficulty ?? 200 }] };
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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? "");
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
    setData((prev) => ({ ...prev, blitzTasks: [...(prev.blitzTasks ?? []), ...tasks] }));
    setTab("blitz");
  }

  // Autosave to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, exportJson(data));
    } catch {
      // ignore storage errors
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
        setImportError(err instanceof Error ? err.message : "Ошибка импорта");
      }
    };
    reader.readAsText(file);
    // reset so same file can be re-imported
    e.target.value = "";
  }

  const totalQuestions = data.topics.reduce((s, t) => s + t.questions.length, 0);
  const totalBlitz = data.blitzTasks?.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Главная
          </Link>
          <h1 className="text-xl font-bold">Редактор вопросов</h1>
          <span className="text-gray-500 text-sm">
            {data.topics.length} тем · {totalQuestions} вопросов · {totalBlitz} блиц
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            Импорт JSON
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm rounded bg-blue-700 hover:bg-blue-600 transition-colors"
          >
            Экспорт JSON
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm rounded bg-red-900 hover:bg-red-800 transition-colors"
          >
            Очистить
          </button>
        </div>
      </header>

      {/* Import error / warnings */}
      {importError && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          Ошибка импорта: {importError}
        </div>
      )}
      {importWarnings.length > 0 && (
        <div className="mx-6 mt-4 px-4 py-3 bg-yellow-900/40 border border-yellow-700 rounded text-yellow-300 text-sm space-y-1">
          <div className="font-medium">Предупреждения при импорте:</div>
          {importWarnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-6 flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setTab("topics")}
          className={`px-5 py-2 text-sm rounded-t transition-colors ${
            tab === "topics"
              ? "bg-gray-800 border border-b-gray-800 border-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Темы и вопросы ({data.topics.length})
        </button>
        <button
          onClick={() => setTab("blitz")}
          className={`px-5 py-2 text-sm rounded-t transition-colors ${
            tab === "blitz"
              ? "bg-gray-800 border border-b-gray-800 border-gray-700 text-white"
              : "text-gray-400 hover:text-white"
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
                  setData({ ...data, topics: data.topics.map((t, i) => (i === ti ? updated : t)) })
                }
                onDelete={() =>
                  setData({ ...data, topics: data.topics.filter((_, i) => i !== ti) })
                }
              />
            ))}
            <button
              onClick={() => setData({ ...data, topics: [...data.topics, emptyTopic()] })}
              className="px-4 py-2 text-sm rounded border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white transition-colors"
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
                    blitzTasks: (data.blitzTasks ?? []).map((t, i) => (i === ti ? updated : t)),
                  })
                }
                onDelete={() =>
                  setData({
                    ...data,
                    blitzTasks: (data.blitzTasks ?? []).filter((_, i) => i !== ti),
                  })
                }
              />
            ))}
            <button
              onClick={() =>
                setData({
                  ...data,
                  blitzTasks: [...(data.blitzTasks ?? []), emptyBlitzTask()],
                })
              }
              className="px-4 py-2 text-sm rounded border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white transition-colors"
            >
              + Добавить блиц-задание
            </button>
          </>
        )}
      </main>
    </div>
  );
}
