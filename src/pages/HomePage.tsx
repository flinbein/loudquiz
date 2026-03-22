import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Varhub } from "@flinbein/varhub-web-client";
import type { GameSettings } from "../game/types";
import {
  getBackendUrl,
  setBackendUrl,
  DEFAULT_BACKEND,
} from "../varhub/hubUtils";
import { storeRoom } from "../varhub/roomStore";
import { ThemeToggle } from "../components/shared/ThemeToggle";

const API_KEY_STORAGE = "openrouterApiKey";

export default function HomePage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"home" | "create" | "join">("home");

  // Join form
  const [roomCode, setRoomCode] = useState("");

  // Create form
  const [gameMode, setGameMode] =
    useState<GameSettings["gameMode"]>("standard");
  const [teamCount, setTeamCount] = useState<1 | 2>(2);
  const [hostType, setHostType] =
    useState<GameSettings["hostType"]>("human");
  const [aiApiKey, setAiApiKeyState] = useState(
    () => localStorage.getItem(API_KEY_STORAGE) ?? "",
  );
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
      setCreateError(
        e instanceof Error ? e.message : "Ошибка создания комнаты",
      );
      setCreating(false);
    }
  }

  function handleJoin() {
    const code = roomCode.trim();
    if (!code) return;
    navigate(`/${code}`);
  }

  /* ── Segment button helper ─────────────────────────────────────────── */
  const segBtn = (active: boolean) =>
    `flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
    }`;

  /* ── Input class ───────────────────────────────────────────────────── */
  const inputCls =
    "w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

  /* ── Create view ───────────────────────────────────────────────────── */
  if (view === "create") {
    return (
      <div className="min-h-[100dvh] bg-game flex flex-col items-center justify-center px-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md space-y-5 animate-fade-in">
          <button
            onClick={() => setView("home")}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm transition-colors font-medium"
          >
            ← Назад
          </button>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Создать игру
          </h2>

          {/* Game mode */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Режим игры
            </label>
            <div className="flex gap-2">
              {(["standard", "bonus", "blitz"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setGameMode(m)}
                  className={segBtn(gameMode === m)}
                >
                  {m === "standard"
                    ? "Стандарт"
                    : m === "bonus"
                      ? "Бонус"
                      : "Блиц"}
                </button>
              ))}
            </div>
          </div>

          {/* Team count */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Количество команд
            </label>
            <div className="flex gap-2">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setTeamCount(n)}
                  className={segBtn(teamCount === n)}
                >
                  {n === 1 ? "Одна команда" : "Две команды"}
                </button>
              ))}
            </div>
          </div>

          {/* Host type */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Тип ведущего
            </label>
            <div className="flex gap-2">
              {(["human", "ai"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setHostType(t)}
                  className={segBtn(hostType === t)}
                >
                  {t === "human" ? "Человек" : "ИИ"}
                </button>
              ))}
            </div>
          </div>

          {/* AI API key */}
          {hostType === "ai" && (
            <div className="animate-slide-up">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                OpenRouter API Key
              </label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-or-..."
                className={inputCls}
              />
            </div>
          )}

          {/* Advanced settings */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showAdvanced
              ? "▲ Скрыть настройки сервера"
              : "▼ Настройки сервера"}
          </button>

          {showAdvanced && (
            <div className="animate-slide-up">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                URL бэкенда
              </label>
              <input
                type="text"
                value={backendUrlInput}
                onChange={(e) => handleBackendChange(e.target.value)}
                placeholder={DEFAULT_BACKEND}
                className={inputCls}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                По умолчанию: {DEFAULT_BACKEND}
              </p>
            </div>
          )}

          {createError && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
              {createError}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || (hostType === "ai" && !aiApiKey.trim())}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-lg text-white transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            {creating ? "Создание комнаты..." : "Создать комнату"}
          </button>
        </div>
      </div>
    );
  }

  /* ── Join view ─────────────────────────────────────────────────────── */
  if (view === "join") {
    return (
      <div className="min-h-[100dvh] bg-game flex flex-col items-center justify-center px-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <button
            onClick={() => setView("home")}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm transition-colors font-medium"
          >
            ← Назад
          </button>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Войти в игру
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Код комнаты
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.trim())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Например: abc123"
              autoFocus
              className={`${inputCls} text-lg text-center tracking-widest uppercase`}
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={!roomCode.trim()}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-lg text-white transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  /* ── Home view ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-[100dvh] bg-game flex flex-col items-center justify-center px-4 gap-8 overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Decorative headphone with sound waves */}
      <div className="relative animate-fade-in">
        <div className="relative z-10 text-center">
          <div className="text-7xl mb-6 relative inline-block">
            🎧
            {/* Sound wave rings */}
            <span className="absolute inset-0 rounded-full border-2 border-indigo-500/60 dark:border-purple-400/30 animate-[sound-wave_2s_ease-out_infinite]" />
            <span className="absolute inset-0 rounded-full border-2 border-indigo-500/45 dark:border-purple-400/20 animate-[sound-wave_2s_ease-out_0.5s_infinite]" />
            <span className="absolute inset-0 rounded-full border-2 border-indigo-500/30 dark:border-purple-400/10 animate-[sound-wave_2s_ease-out_1s_infinite]" />
          </div>
          <h1 className="text-6xl sm:text-7xl font-extrabold mb-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">
            LoudQuiz
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
            Жестовая викторина для компании
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs animate-slide-up">
        <button
          onClick={() => setView("create")}
          className="py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-2xl font-bold text-lg text-white transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-[0.97] -rotate-[0.5deg]"
        >
          Создать игру
        </button>
        <button
          onClick={() => setView("join")}
          className="py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl font-bold text-lg text-white transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-[0.97] rotate-[0.5deg]"
        >
          Войти в игру
        </button>
        <Link
          to="/constructor"
          className="py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl font-semibold text-lg text-slate-700 dark:text-slate-200 transition-all text-center hover:scale-[1.02] active:scale-[0.98]"
        >
          Редактор вопросов
        </Link>
      </div>
    </div>
  );
}
