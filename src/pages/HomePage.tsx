import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Varhub } from "@flinbein/varhub-web-client";
import type { GameSettings } from "../game/types";
import { getBackendUrl, setBackendUrl, DEFAULT_BACKEND } from "../varhub/hubUtils";
import { storeRoom } from "../varhub/roomStore";

const API_KEY_STORAGE = "openrouterApiKey";

export default function HomePage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"home" | "create" | "join">("home");

  // Join form
  const [roomCode, setRoomCode] = useState("");

  // Create form
  const [gameMode, setGameMode] = useState<GameSettings["gameMode"]>("standard");
  const [teamCount, setTeamCount] = useState<1 | 2>(2);
  const [hostType, setHostType] = useState<GameSettings["hostType"]>("human");
  const [aiApiKey, setAiApiKeyState] = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? "");
  const [backendUrlInput, setBackendUrlInput] = useState(getBackendUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function handleApiKeyChange(key: string) {
    setAiApiKeyState(key);
    localStorage.setItem(API_KEY_STORAGE, key);
  }

  function handleBackendChange(url: string) {
    setBackendUrlInput(url);
    setBackendUrl(url);
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const backend = backendUrlInput.trim() || DEFAULT_BACKEND;
      const hub = new Varhub(backend);
      const room = hub.createRoomSocket({ integrity: "custom:loudquiz" });
      await room.promise;
      const settings: GameSettings = {
        backendUrl: backend,
        teamCount,
        gameMode,
        hostType,
        aiApiKey: hostType === "ai" ? aiApiKey : undefined,
        roundDuration: 60,
        answerDuration: 25,
        questionsPerTopic: 4,
        topicCount: 3,
        blitzRoundCount: 3,
      };
      storeRoom(room, settings);
      navigate(`/${room.id}/host`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Ошибка создания комнаты");
      setCreating(false);
    }
  }

  function handleJoin() {
    const code = roomCode.trim();
    if (!code) return;
    navigate(`/${code}`);
  }

  if (view === "create") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={() => setView("home")}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Назад
          </button>
          <h2 className="text-2xl font-bold">Создать игру</h2>

          {/* Game mode */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Режим игры</label>
            <div className="flex gap-2">
              {(["standard", "bonus", "blitz"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setGameMode(m)}
                  className={`flex-1 py-2 rounded text-sm transition-colors ${
                    gameMode === m
                      ? "bg-blue-700 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {m === "standard" ? "Стандарт" : m === "bonus" ? "Бонус" : "Блиц"}
                </button>
              ))}
            </div>
          </div>

          {/* Team count */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Количество команд</label>
            <div className="flex gap-2">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setTeamCount(n)}
                  className={`flex-1 py-2 rounded text-sm transition-colors ${
                    teamCount === n
                      ? "bg-blue-700 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {n === 1 ? "Одна команда" : "Две команды"}
                </button>
              ))}
            </div>
          </div>

          {/* Host type */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Тип ведущего</label>
            <div className="flex gap-2">
              {(["human", "ai"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setHostType(t)}
                  className={`flex-1 py-2 rounded text-sm transition-colors ${
                    hostType === t
                      ? "bg-blue-700 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {t === "human" ? "Человек" : "ИИ"}
                </button>
              ))}
            </div>
          </div>

          {/* AI API key (if AI host) */}
          {hostType === "ai" && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">OpenRouter API Key</label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-or-..."
                className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Advanced settings toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showAdvanced ? "▲ Скрыть настройки сервера" : "▼ Настройки сервера"}
          </button>

          {showAdvanced && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL бэкенда</label>
              <input
                type="text"
                value={backendUrlInput}
                onChange={(e) => handleBackendChange(e.target.value)}
                placeholder={DEFAULT_BACKEND}
                className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">По умолчанию: {DEFAULT_BACKEND}</p>
            </div>
          )}

          {createError && (
            <div className="bg-red-900/50 border border-red-700 rounded px-3 py-2 text-sm text-red-300">
              {createError}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || (hostType === "ai" && !aiApiKey.trim())}
            className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold text-lg transition-colors"
          >
            {creating ? "Создание комнаты..." : "Создать комнату"}
          </button>
        </div>
      </div>
    );
  }

  if (view === "join") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <button
            onClick={() => setView("home")}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Назад
          </button>
          <h2 className="text-2xl font-bold">Войти в игру</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Код комнаты</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.trim())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Например: abc123"
              autoFocus
              className="w-full bg-gray-800 text-white rounded px-3 py-3 text-lg border border-gray-600 focus:outline-none focus:border-blue-500 text-center tracking-widest uppercase"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={!roomCode.trim()}
            className="w-full py-3 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold text-lg transition-colors"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4 gap-6">
      <div className="text-center mb-4">
        <h1 className="text-5xl font-bold mb-2">🎮 LoudQuiz</h1>
        <p className="text-gray-400">Жестовая викторина для компании</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => setView("create")}
          className="py-4 bg-green-700 hover:bg-green-600 rounded-lg font-semibold text-lg transition-colors"
        >
          Создать игру
        </button>
        <button
          onClick={() => setView("join")}
          className="py-4 bg-blue-700 hover:bg-blue-600 rounded-lg font-semibold text-lg transition-colors"
        >
          Войти в игру
        </button>
        <Link
          to="/constructor"
          className="py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-lg transition-colors text-center"
        >
          Редактор вопросов
        </Link>
      </div>
    </div>
  );
}
