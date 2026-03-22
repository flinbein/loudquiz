import { useState } from "react";
import type { QuestionsFile, Topic, BlitzTask } from "../../game/types";
import {
  generateTopics,
  generateQuestions,
  generateBlitzTasks,
  type GeneratedTopic,
} from "../../game/ai/aiConstructor";

interface Props {
  data: QuestionsFile;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onApplyTopics: (topics: Topic[]) => void;
  onApplyBlitz: (tasks: BlitzTask[]) => void;
}

type Step = "topics" | "questions" | "blitz";

const inputCls =
  "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";

export default function AIPanel({ data, apiKey, onApiKeyChange, onApplyTopics, onApplyBlitz }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("topics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState("");
  const [topicCount, setTopicCount] = useState(3);
  const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopic[]>([]);

  const [questionsPerTopic, setQuestionsPerTopic] = useState(4);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);

  const [blitzCount, setBlitzCount] = useState(6);
  const [itemsPerTask, setItemsPerTask] = useState(3);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateTopics() {
    await run(async () => {
      const topics = await generateTopics(apiKey, { suggestions, topicCount });
      setGeneratedTopics(topics);
    });
  }

  async function handleApplyTopics() {
    const topics: Topic[] = generatedTopics.map((t) => ({
      name: t.name,
      questions: [],
    }));
    onApplyTopics(topics);
    setStep("questions");
  }

  async function handleGenerateQuestions() {
    await run(async () => {
      const topicNames = data.topics.map((t) => t.name).filter(Boolean);
      const pastQuestions = data.topics.flatMap((t) => t.questions.map((q) => q.text));
      const topics = await generateQuestions(apiKey, {
        topics: topicNames,
        questionsPerTopic,
        playersPerTeam,
        pastQuestions,
      });
      const merged = data.topics.map((existing) => {
        const generated = topics.find((t) => t.name === existing.name);
        if (!generated) return existing;
        return { ...existing, questions: generated.questions };
      });
      onApplyTopics(merged);
    });
  }

  async function handleGenerateBlitz() {
    await run(async () => {
      const pastTasks = (data.blitzTasks ?? []).flatMap((t) => t.items.map((i) => i.text));
      const tasks = await generateBlitzTasks(apiKey, { count: blitzCount, itemsPerTask, pastTasks });
      onApplyBlitz(tasks);
    });
  }

  const stepBtn = (s: Step, active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700"
    }`;

  return (
    <div className="border border-violet-200 dark:border-purple-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 dark:bg-purple-900/40 hover:bg-violet-100 dark:hover:bg-purple-900/60 transition-colors text-left"
      >
        <span className="font-semibold text-violet-700 dark:text-purple-300">AI-генерация</span>
        <span className="text-violet-500 dark:text-purple-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-slate-50 dark:bg-slate-900/60">
          {/* API Key */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="sk-or-..."
              className={`w-full ${inputCls}`}
            />
          </div>

          {/* Step tabs */}
          <div className="flex gap-2 text-sm">
            {(["topics", "questions", "blitz"] as Step[]).map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={stepBtn(s, step === s)}
              >
                {i + 1}. {s === "topics" ? "Темы" : s === "questions" ? "Вопросы" : "Блиц"}
              </button>
            ))}
          </div>

          {/* Step 1 — Topics */}
          {step === "topics" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Предложения игроков (по одному на строку)
                </label>
                <textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  rows={4}
                  placeholder={"Рок-музыка\nГорода России\nЖивотные"}
                  className={`w-full ${inputCls} resize-none`}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500 dark:text-slate-400">Количество тем:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={topicCount}
                  onChange={(e) => setTopicCount(Number(e.target.value))}
                  className={`w-16 ${inputCls}`}
                />
              </div>
              <button
                onClick={handleGenerateTopics}
                disabled={loading || !apiKey.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white transition-colors"
              >
                {loading ? "Генерирую..." : "Сгенерировать темы"}
              </button>

              {generatedTopics.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Результат:</p>
                  {generatedTopics.map((t, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-900 dark:text-white font-medium">{t.name}</span>
                      {t.reason && (
                        <span className="text-slate-500 dark:text-slate-400 ml-2 text-xs">— {t.reason}</span>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleApplyTopics}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white transition-colors"
                  >
                    Применить темы →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Questions */}
          {step === "questions" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Темы из редактора:{" "}
                <span className="text-slate-900 dark:text-white">
                  {data.topics.map((t) => t.name || "—").join(", ") || "нет"}
                </span>
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Вопросов на тему:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={questionsPerTopic}
                    onChange={(e) => setQuestionsPerTopic(Number(e.target.value))}
                    className={`w-16 ${inputCls}`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Игроков в команде:</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={playersPerTeam}
                    onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
                    className={`w-16 ${inputCls}`}
                  />
                </div>
              </div>
              <button
                onClick={handleGenerateQuestions}
                disabled={loading || !apiKey.trim() || data.topics.every((t) => !t.name.trim())}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white transition-colors"
              >
                {loading ? "Генерирую..." : "Сгенерировать вопросы"}
              </button>
            </div>
          )}

          {/* Step 3 — Blitz */}
          {step === "blitz" && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Заданий:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={blitzCount}
                    onChange={(e) => setBlitzCount(Number(e.target.value))}
                    className={`w-16 ${inputCls}`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Вариантов в задании:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={itemsPerTask}
                    onChange={(e) => setItemsPerTask(Number(e.target.value))}
                    className={`w-16 ${inputCls}`}
                  />
                </div>
              </div>
              <button
                onClick={handleGenerateBlitz}
                disabled={loading || !apiKey.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white transition-colors"
              >
                {loading ? "Генерирую..." : "Сгенерировать блиц-задания"}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
