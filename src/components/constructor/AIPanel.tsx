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

export default function AIPanel({ data, apiKey, onApiKeyChange, onApplyTopics, onApplyBlitz }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("topics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Topics
  const [suggestions, setSuggestions] = useState("");
  const [topicCount, setTopicCount] = useState(3);
  const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopic[]>([]);

  // Step 2 — Questions
  const [questionsPerTopic, setQuestionsPerTopic] = useState(4);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);

  // Step 3 — Blitz
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
      // Merge questions into existing topics by name
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

  return (
    <div className="border border-purple-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-900/40 hover:bg-purple-900/60 transition-colors text-left"
      >
        <span className="font-semibold text-purple-300">✨ AI-генерация</span>
        <span className="text-purple-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-gray-900/60">
          {/* API Key */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="sk-or-..."
              className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Step tabs */}
          <div className="flex gap-2 text-sm">
            {(["topics", "questions", "blitz"] as Step[]).map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`px-3 py-1 rounded transition-colors ${
                  step === s
                    ? "bg-purple-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {i + 1}. {s === "topics" ? "Темы" : s === "questions" ? "Вопросы" : "Блиц"}
              </button>
            ))}
          </div>

          {/* Step 1 — Topics */}
          {step === "topics" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Предложения игроков (по одному на строку)
                </label>
                <textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  rows={4}
                  placeholder={"Рок-музыка\nГорода России\nЖивотные"}
                  className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400">Количество тем:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={topicCount}
                  onChange={(e) => setTopicCount(Number(e.target.value))}
                  className="w-16 bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={handleGenerateTopics}
                disabled={loading || !apiKey.trim()}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
              >
                {loading ? "Генерирую..." : "Сгенерировать темы"}
              </button>

              {generatedTopics.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Результат:</p>
                  {generatedTopics.map((t, i) => (
                    <div key={i} className="bg-gray-800 rounded px-3 py-2 text-sm">
                      <span className="text-white font-medium">{t.name}</span>
                      {t.reason && (
                        <span className="text-gray-400 ml-2 text-xs">— {t.reason}</span>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleApplyTopics}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-sm transition-colors"
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
              <p className="text-xs text-gray-400">
                Темы из редактора:{" "}
                <span className="text-white">
                  {data.topics.map((t) => t.name || "—").join(", ") || "нет"}
                </span>
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Вопросов на тему:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={questionsPerTopic}
                    onChange={(e) => setQuestionsPerTopic(Number(e.target.value))}
                    className="w-16 bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Игроков в команде:</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={playersPerTeam}
                    onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
                    className="w-16 bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <button
                onClick={handleGenerateQuestions}
                disabled={loading || !apiKey.trim() || data.topics.every((t) => !t.name.trim())}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
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
                  <label className="text-xs text-gray-400">Заданий:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={blitzCount}
                    onChange={(e) => setBlitzCount(Number(e.target.value))}
                    className="w-16 bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Вариантов в задании:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={itemsPerTask}
                    onChange={(e) => setItemsPerTask(Number(e.target.value))}
                    className="w-16 bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <button
                onClick={handleGenerateBlitz}
                disabled={loading || !apiKey.trim()}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
              >
                {loading ? "Генерирую..." : "Сгенерировать блиц-задания"}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
