import { useState } from "react";
import { type Question } from "../../game/types";
import { validateQuestion } from "./constructorUtils";
import { checkAnswers, type AnswerCheckResult } from "../../game/ai/aiConstructor";

interface Props {
  question: Question;
  index: number;
  onChange: (q: Question) => void;
  onDelete: () => void;
  apiKey?: string;
}

const DIFFICULTIES = Array.from({ length: 11 }, (_, i) => 100 + i * 10);

export default function QuestionEditor({ question, index, onChange, onDelete, apiKey }: Props) {
  const errors = validateQuestion(question);
  const hasError = (field: string) => errors.some((e) => e.field === field);

  const [checkOpen, setCheckOpen] = useState(false);
  const [answersInput, setAnswersInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<AnswerCheckResult | null>(null);

  function update(patch: Partial<Question>) {
    onChange({ ...question, ...patch });
  }

  async function handleCheck() {
    if (!apiKey) return;
    const playerAnswers = answersInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (playerAnswers.length === 0) return;

    setCheckError(null);
    setCheckResult(null);
    setChecking(true);
    try {
      const result = await checkAnswers(apiKey, {
        questionText: question.text,
        playerAnswers,
      });
      setCheckResult(result);
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }

  const showAiCheck = question.text.trim() !== "" && apiKey;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm font-medium">Вопрос {index + 1}</span>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 text-sm px-2 py-0.5 rounded hover:bg-red-900/30 transition-colors"
        >
          Удалить
        </button>
      </div>

      {/* Text */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Текст вопроса *</label>
        <textarea
          value={question.text}
          onChange={(e) => update({ text: e.target.value })}
          rows={2}
          className={`w-full bg-gray-900 text-white rounded px-3 py-2 text-sm resize-none border ${
            hasError("text") ? "border-red-500" : "border-gray-600"
          } focus:outline-none focus:border-blue-500`}
          placeholder="Назовите музыкальный инструмент, не состоящий из дерева"
        />
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Сложность *</label>
        <select
          value={question.difficulty}
          onChange={(e) => update({ difficulty: Number(e.target.value) })}
          className={`bg-gray-900 text-white rounded px-3 py-2 text-sm border ${
            hasError("difficulty") ? "border-red-500" : "border-gray-600"
          } focus:outline-none focus:border-blue-500`}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Hint */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Подсказка для ведущего</label>
        <input
          type="text"
          value={question.hint ?? ""}
          onChange={(e) => update({ hint: e.target.value || undefined })}
          className="w-full bg-gray-900 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          placeholder="Принимаются: труба, флейта, саксофон. Не принимаются: гитара, скрипка"
        />
      </div>

      {/* Accepted answers */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Эталонные ответы для ИИ (через запятую)
        </label>
        <input
          type="text"
          value={(question.acceptedAnswers ?? []).join(", ")}
          onChange={(e) => {
            const val = e.target.value;
            const arr = val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            update({ acceptedAnswers: arr.length > 0 ? arr : undefined });
          }}
          className="w-full bg-gray-900 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          placeholder="Труба, Флейта, Саксофон, Тромбон"
        />
      </div>

      {/* AI Answer Check */}
      {showAiCheck && (
        <div className="border border-indigo-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setCheckOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-indigo-900/30 hover:bg-indigo-900/50 transition-colors text-left"
          >
            <span className="text-xs text-indigo-300 font-medium">🤖 AI Проверка ответов</span>
            <span className="text-indigo-400 text-xs">{checkOpen ? "▲" : "▼"}</span>
          </button>

          {checkOpen && (
            <div className="p-3 space-y-2 bg-gray-900/40">
              <label className="block text-xs text-gray-400">
                Ответы игроков (по одному на строку)
              </label>
              <textarea
                value={answersInput}
                onChange={(e) => setAnswersInput(e.target.value)}
                rows={4}
                placeholder={"Труба\nГитара\nСкрипка\nФлейта"}
                className="w-full bg-gray-900 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button
                onClick={handleCheck}
                disabled={checking || !answersInput.trim()}
                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
              >
                {checking ? "Проверяю..." : "Проверить"}
              </button>

              {checkError && (
                <div className="bg-red-900/50 border border-red-700 rounded px-3 py-2 text-xs text-red-300">
                  {checkError}
                </div>
              )}

              {checkResult && (
                <div className="space-y-2">
                  {checkResult.groups.map((group) => (
                    <div
                      key={group.id}
                      className={`rounded px-3 py-2 text-sm border ${
                        group.accepted
                          ? "bg-green-900/30 border-green-700"
                          : "bg-red-900/20 border-red-800"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="shrink-0">{group.accepted ? "✅" : "❌"}</span>
                        <div className="min-w-0">
                          <span className="font-medium text-white">{group.canonicalAnswer}</span>
                          <span className="text-gray-400 text-xs ml-2">
                            {group.playerIds.join(", ")}
                          </span>
                          {group.note && (
                            <p className="text-xs text-gray-400 mt-0.5">{group.note}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {checkResult.commentary && (
                    <p className="text-xs text-gray-400 italic pt-1">{checkResult.commentary}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
