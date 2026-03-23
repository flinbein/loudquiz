import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Players } from "@flinbein/varhub-web-client";
import { getStoredRoom } from "../varhub/roomStore";
import { buildRoomUrl } from "../varhub/hubUtils";
import { GameLogic } from "../game/GameLogic";
import { audioManager } from "../audio/AudioManager";
import { QuestionTable } from "../components/shared/QuestionTable";
import { ThemeToggle } from "../components/shared/ThemeToggle";
import { AnimatedScore } from "../components/shared/AnimatedScore";
import { HostLayout } from "../components/host/HostLayout";
import { HostSidebar } from "../components/host/HostSidebar";
import { CircularTimer } from "../components/shared/CircularTimer";
import { Equalizer } from "../components/shared/Equalizer";
import { Confetti } from "../components/shared/Confetti";
import { LEDScore } from "../components/shared/LEDScore";
import { PlayerAvatar } from "../components/shared/PlayerAvatar";
import { Sticker } from "../components/shared/Sticker";
import { StickerWithAvatar } from "../components/shared/StickerWithAvatar";
import { Stamp } from "../components/shared/Stamp";
import { pickStampText } from "../components/shared/stampTexts";
import type { FullGameState, QuestionsFile, AnswerGroup, PublicPlayerInfo, GameSettings } from "../game/types";
import type { PlayerToHostMsg } from "../game/messages";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => void;

function useTimer(endsAt: number | undefined): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const update = () => setRemaining(Math.max(0, endsAt - Date.now()));
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

function TeamBadge({ teamId }: { teamId: string }) {
  if (teamId === "red")
    return (
      <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold">
        Красные
      </span>
    );
  if (teamId === "blue")
    return (
      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold">
        Синие
      </span>
    );
  return null;
}

function ScoreBar({ scores }: { scores: Record<string, number> }) {
  return (
    <div className="flex gap-4 text-sm">
      {Object.entries(scores).map(([teamId, score]) => (
        <span
          key={teamId}
          className={`font-bold ${teamId === "red" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"}`}
        >
          {teamId === "red" ? "Красные" : "Синие"}: <AnimatedScore value={score} />
        </span>
      ))}
    </div>
  );
}

export default function HostPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const stored = getStoredRoom();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersRef = useRef<Players<any, any> | null>(null);
  const gameLogicRef = useRef<GameLogic | null>(null);

  const [gameState, setGameState] = useState<FullGameState | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);
  const [questionsPreview, setQuestionsPreview] = useState<QuestionsFile | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [blitzTaskCount, setBlitzTaskCount] = useState(6);
  const [progressPct, setProgressPct] = useState(100);
  const [musicVolume, setMusicVolumeState] = useState(() => audioManager.getMusicVolume());
  const [ringVolume, setRingVolumeState] = useState(() => audioManager.getRingVolume());

  // Envelope animation state

  // Review state: groups built from allAnswers when entering round-review
  const [reviewGroups, setReviewGroups] = useState<AnswerGroup[]>([]);
  const reviewInitializedForRef = useRef<string | null>(null); // questionId

  // Мок-инъекция для скриншотов (только в dev-режиме)
  const [mockMode, setMockMode] = useState(false);
  const [mockSettings, setMockSettings] = useState<GameSettings | null>(null);
  useEffect(() => {
    function applyMock() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mock = (window as any).__MOCK_HOST_STATE__;
      if (!mock) return;
      setMockMode(true);
      setGameState(mock.gameState);
      if (mock.questionsPreview) setQuestionsPreview(mock.questionsPreview);
      if (mock.reviewGroups) setReviewGroups(mock.reviewGroups);
      if (mock.settings) setMockSettings(mock.settings);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__MOCK_APPLIED__ = true;
    }
    applyMock();
    window.addEventListener("__applyMock", applyMock);
    return () => window.removeEventListener("__applyMock", applyMock);
  }, []);

  // Create GameLogic once
  useEffect(() => {
    if (!stored) return;
    if (gameLogicRef.current) return;

    const room = stored.room;
    const logic = new GameLogic(
      {
        broadcast: (msg) => {
          (room as unknown as { broadcast: (msg: unknown) => void }).broadcast(msg);
        },
        onStateChange: (state) => {
          setGameState({ ...state });
        },
        sendTo: (playerId, msg) => {
          const player = playersRef.current?.get(playerId);
          if (player) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (player as any).send(msg);
          }
        },
        onKickPlayer: (playerId) => {
          const player = playersRef.current?.get(playerId);
          if (player) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (player as any).send({ type: "kicked", reason: "kicked_by_host" });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (player as any).kick("kicked_by_host");
          }
        },
      },
      stored.settings,
    );
    gameLogicRef.current = logic;
    setGameState(logic.getFullState());
  }, [stored]);

  // Register event handlers
  useEffect(() => {
    if (!stored) return;
    const logic = gameLogicRef.current;
    if (!logic) return;

    const room = stored.room;

    // Create Players instance — extracts player name from connection parameters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = new Players(room as any, (_connection: any, name: unknown) => {
      if (!name) return null;
      return String(name);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playersRef.current = players as any;

    const handleOffline: AnyHandler = (player: { name: string }) => {
      logic.setPlayerOnline(player.name, false);
    };
    players.on("offline", handleOffline);

    const handleConnectionOpen: AnyHandler = (con: object) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = (con as any).parameters as unknown[];
      const name = String(params[0] ?? "");

      // Duplicate session: close existing connections for the same player name
      if (name) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingPlayer = (players as any).get(name);
        if (existingPlayer?.online) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const oldCon of (existingPlayer as any).connections) {
            if (oldCon !== con) {
              (oldCon as unknown as { send: (d: unknown) => void }).send({
                type: "kicked",
                reason: "duplicate_session",
              });
              (oldCon as unknown as { close: (r: string) => void }).close("duplicate_session");
            }
          }
        }
      }

      // Send current state to the new connection
      const syncMsg = { type: "syncState", state: logic.getPublicState() };
      (con as unknown as { send: (data: unknown) => void }).send(syncMsg);

      // Send private messages if this player is captain
      if (name) {
        for (const msg of logic.getPrivateMessagesForPlayer(name)) {
          (con as unknown as { send: (data: unknown) => void }).send(msg);
        }
      }
    };

    const handleMessage: AnyHandler = (con: object, data: unknown) => {
      const msg = data as PlayerToHostMsg | null;
      if (!msg?.type) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const player = (players as any).get(con as any);
      if (!player) return;
      const playerId: string = player.name;

      const reply = logic.handleMessage(playerId, msg);
      if (reply) {
        (con as unknown as { send: (data: unknown) => void }).send(reply);
      }
      for (const privMsg of logic.getPrivateMessagesForPlayer(playerId)) {
        (con as unknown as { send: (data: unknown) => void }).send(privMsg);
      }
    };

    const handleRoomClose = () => setRoomClosed(true);

    room.on("connectionMessage", handleMessage);
    room.on("connectionOpen", handleConnectionOpen);
    (room as unknown as { on: (event: string, handler: () => void) => void }).on(
      "close",
      handleRoomClose,
    );

    return () => {
      room.off("connectionMessage", handleMessage);
      room.off("connectionOpen", handleConnectionOpen);
      (room as unknown as { off: (event: string, handler: () => void) => void }).off(
        "close",
        handleRoomClose,
      );
      players.off("offline", handleOffline);
      playersRef.current = null;
    };
  }, [stored]);

  // Timer progress bar for topic-suggest
  useEffect(() => {
    if (!gameState || gameState.phase !== "topic-suggest") return;
    const endsAt = gameState.topicSuggestEndsAt;
    if (!endsAt) return;

    const interval = setInterval(() => {
      const remaining = endsAt - Date.now();
      const pct = Math.max(0, (remaining / 60_000) * 100);
      setProgressPct(pct);
      if (remaining <= 0) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [gameState?.phase, gameState?.topicSuggestEndsAt]);

  // Ring signal on phase transitions
  const hostPrevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!gameState) return;
    const phase = gameState.phase;
    if (phase === hostPrevPhaseRef.current) return;
    hostPrevPhaseRef.current = phase;
    if (
      phase === "round-active" ||
      phase === "round-answer" ||
      phase === "blitz-active" ||
      phase === "blitz-answer"
    ) {
      void audioManager.playRing();
    }
  }, [gameState?.phase]);

  // Initialize review groups when entering round-review
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase !== "round-review") {
      reviewInitializedForRef.current = null;
      return;
    }
    const qId = gameState.currentRound?.questionId;
    if (!qId || reviewInitializedForRef.current === qId) return;
    reviewInitializedForRef.current = qId;

    // Build initial groups: one per player in active team (incl captain)
    const activeTeamId = gameState.activeTeamId;
    const teamPlayers = gameState.players.filter(
      (p) => p.teamId === activeTeamId && p.role === "player",
    );
    const allAnswers = gameState.allAnswers;
    const groups: AnswerGroup[] = teamPlayers.map((p, i) => ({
      id: `g_${i}`,
      accepted: true,
      canonicalAnswer: allAnswers[p.id] ?? "",
      playerIds: [p.id],
      note: null,
      rawAnswers: { [p.id]: allAnswers[p.id] ?? "" },
    }));
    setReviewGroups(groups);
  }, [gameState?.phase, gameState?.currentRound?.questionId]);

  if (!stored && !mockMode) {
    return (
      <div className="min-h-[100dvh] bg-game text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-slate-500 dark:text-slate-400">Комната не найдена</p>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Возможно, страница была перезагружена. Создайте новую комнату.
        </p>
        <Link
          to="/"
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (roomClosed) {
    return (
      <div className="min-h-[100dvh] bg-game text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">⚠️</div>
        <p className="text-xl font-semibold">Соединение потеряно</p>
        <p className="text-sm text-slate-400 dark:text-slate-500">Соединение с сервером прервалось. Создайте новую комнату.</p>
        <Link
          to="/"
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
        >
          На главную
        </Link>
      </div>
    );
  }

  const roomUrl = buildRoomUrl(roomId!);
  const settings = mockSettings ?? stored!.settings;

  const modeLabel =
    settings.gameMode === "standard"
      ? "Стандарт"
      : settings.gameMode === "bonus"
        ? "Бонус"
        : "Блиц";
  const teamsLabel = settings.teamCount === 1 ? "1 команда" : "2 команды";
  const hostLabel = settings.hostType === "human" ? "Человек" : "ИИ";

  const phase = gameState?.phase ?? "lobby";
  const players = gameState?.players ?? [];

  const redPlayers = players.filter((p) => p.teamId === "red");
  const bluePlayers = players.filter((p) => p.teamId === "blue");
  const spectators = players.filter((p) => p.role === "spectator");
  const unassigned = players.filter((p) => p.teamId === null && p.role === "player");
  const activePlayers = mockMode
    ? (gameState?.players.filter(p => p.teamId !== null) ?? [])
    : (gameLogicRef.current?.activePlayers() ?? []);

  function handleStartGame() {
    gameLogicRef.current?.startGame();
  }

  function handleKickPlayer(playerId: string) {
    gameLogicRef.current?.kickPlayer(playerId);
  }

  function handleForceReady() {
    gameLogicRef.current?.forceCalibrationDone();
  }

  function handleTestRing() {
    void audioManager.playRing();
  }

  function processQuestionsFile(file: File) {
    setQuestionsError(null);
    setQuestionsPreview(null);
    const isBlitzMode = settings.gameMode === "blitz";
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as QuestionsFile;
        if (isBlitzMode) {
          if (!Array.isArray(data.blitzTasks) || data.blitzTasks.length === 0) {
            setQuestionsError("Файл не содержит блиц-заданий (blitzTasks[])");
            return;
          }
        } else {
          if (!Array.isArray(data.topics) || data.topics.length === 0) {
            setQuestionsError("Файл не содержит тем (topics[])");
            return;
          }
        }
        setQuestionsPreview(data);
      } catch {
        setQuestionsError("Невалидный JSON файл");
      }
    };
    reader.readAsText(file);
  }

  function handleQuestionsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processQuestionsFile(file);
  }

  function handleQuestionsDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".json")) {
      processQuestionsFile(file);
    } else {
      setQuestionsError("Перетащите файл .json");
    }
  }

  function handleStartWithQuestions() {
    if (!questionsPreview) return;
    gameLogicRef.current?.uploadQuestions(questionsPreview);
  }

  // ── Header ────────────────────────────────────────────────────────────────────
  const header = (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-all">
          &larr; Главная
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ведущий</h1>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span>{modeLabel}</span>
        <span>·</span>
        <span>{teamsLabel}</span>
        <span>·</span>
        <span>{hostLabel}</span>
        <span>·</span>
        <span className="font-mono text-indigo-600 dark:text-blue-300">{roomId}</span>
        {gameState && (
          <>
            <span>·</span>
            <ScoreBar scores={gameState.scores} />
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );

  // ── LOBBY ─────────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div className="min-h-[100dvh] bg-game text-slate-900 dark:text-white">
        {header}
        <main className="flex flex-col lg:flex-row gap-8 p-8 max-w-5xl mx-auto">
          {/* QR code */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <QRCodeSVG value={roomUrl} size={220} />
            </div>
            <div className="text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Код комнаты</p>
              <p className="text-3xl font-mono font-bold tracking-widest">{roomId}</p>
            </div>
            <a href={roomUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline max-w-[220px] text-center break-all">{roomUrl}</a>
          </div>

          {/* Players */}
          <div className="flex-1 space-y-4">
            {settings.teamCount === 2 ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h2 className="text-base font-semibold text-red-500 dark:text-red-400 mb-2">
                    Красные ({redPlayers.length})
                  </h2>
                  {redPlayers.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-600 text-sm">Нет игроков</p>
                  ) : (
                    <div className="space-y-1.5">
                      {redPlayers.map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 border border-red-200 dark:border-red-800/40 rounded-xl px-2.5 py-2 text-sm animate-slide-up ${!p.online ? "opacity-50" : ""}`}
                        >
                          <PlayerAvatar name={p.name} emoji={p.emoji} teamId="red" isOnline={p.online} size="sm" />
                          <span className={`flex-1 font-medium truncate ${!p.online ? "text-slate-400 dark:text-slate-500" : "text-red-600 dark:text-red-300"}`}>{p.name}</span>
                          <button onClick={() => handleKickPlayer(p.id)} className="text-red-400 hover:text-red-500 text-xs transition-all opacity-60 hover:opacity-100" title="Кикнуть игрока">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-blue-500 dark:text-blue-400 mb-2">
                    Синие ({bluePlayers.length})
                  </h2>
                  {bluePlayers.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-600 text-sm">Нет игроков</p>
                  ) : (
                    <div className="space-y-1.5">
                      {bluePlayers.map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-800/40 rounded-xl px-2.5 py-2 text-sm animate-slide-up ${!p.online ? "opacity-50" : ""}`}
                        >
                          <PlayerAvatar name={p.name} emoji={p.emoji} teamId="blue" isOnline={p.online} size="sm" />
                          <span className={`flex-1 font-medium truncate ${!p.online ? "text-slate-400 dark:text-slate-500" : "text-blue-600 dark:text-blue-300"}`}>{p.name}</span>
                          <button onClick={() => handleKickPlayer(p.id)} className="text-red-400 hover:text-red-500 text-xs transition-all opacity-60 hover:opacity-100" title="Кикнуть игрока">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Игроки ({redPlayers.length})
                </h2>
                {redPlayers.length === 0 ? (
                  <p className="text-slate-400 dark:text-slate-600 text-sm">Нет игроков</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {redPlayers.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/40 rounded-xl px-2.5 py-2 text-sm animate-slide-up ${!p.online ? "opacity-50" : ""}`}
                      >
                        <PlayerAvatar name={p.name} emoji={p.emoji} teamId={null} isOnline={p.online} size="sm" />
                        <span className={`flex-1 font-medium truncate ${!p.online ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>{p.name}</span>
                        <button onClick={() => handleKickPlayer(p.id)} className="text-red-400 hover:text-red-500 text-xs transition-all opacity-60 hover:opacity-100" title="Кикнуть игрока">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {unassigned.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-amber-600 dark:text-yellow-400 mb-2">
                  Не выбрали команду ({unassigned.length})
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {unassigned.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 border border-amber-200 dark:border-yellow-800/30 rounded-xl px-2.5 py-2 text-sm animate-slide-up ${!p.online ? "opacity-50" : ""}`}
                    >
                      <PlayerAvatar name={p.name} emoji={p.emoji} isOnline={p.online} size="sm" />
                      <span className={`flex-1 font-medium truncate ${!p.online ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>{p.name}</span>
                      <button onClick={() => handleKickPlayer(p.id)} className="text-red-400 hover:text-red-500 text-xs transition-all opacity-60 hover:opacity-100" title="Кикнуть игрока">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {spectators.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Зрители ({spectators.length})
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {spectators.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/30 rounded-xl px-2.5 py-2 text-sm animate-slide-up ${!p.online ? "opacity-50" : ""}`}
                    >
                      <PlayerAvatar name={p.name} emoji={p.emoji} isOnline={p.online} size="sm" />
                      <span className={`flex-1 font-medium truncate ${!p.online ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-400"}`}>{p.name}</span>
                      <button onClick={() => handleKickPlayer(p.id)} className="text-red-400 hover:text-red-500 text-xs transition-all opacity-60 hover:opacity-100" title="Кикнуть игрока">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {players.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center text-slate-400 dark:text-slate-500">
                <p className="text-lg mb-2">Ждём игроков...</p>
                <p className="text-sm">
                  Попросите игроков отсканировать QR-код или ввести код комнаты
                </p>
              </div>
            )}

            <button
              onClick={handleStartGame}
              disabled={activePlayers.length === 0}
              className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl font-semibold text-lg text-white transition-all"
            >
              Начать игру
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Helper: compute game progress
  const questionHistory = gameState?.questionHistory ?? [];

  // Build publicQuestionTable from FullGameState (host has raw questionTable, not the public version)
  const publicQuestionTable = (gameState?.questionTable ?? []).length > 0
    ? (gameState!.questionTable).map((qs, ti) => ({
        topicName: gameState!.topicNames[ti] ?? `Тема ${ti + 1}`,
        questions: qs.map((q) => ({
          id: q.id,
          difficulty: q.difficulty,
          used: (gameState!.usedQuestionIds ?? []).includes(q.id),
        })),
      }))
    : [];

  const totalQuestions = publicQuestionTable.reduce((sum, t) => sum + t.questions.length, 0);
  const completedRounds = questionHistory.length;
  const totalRounds = totalQuestions || completedRounds;

  const layoutProps = {
    roomId: roomId!,
    roomUrl,
    modeLabel,
    teamsLabel,
    hostLabel,
    scores: gameState?.scores ?? {},
  };

  const sidebarProps = {
    scores: gameState?.scores ?? {},
    players,
    captainId: gameState?.captainId,
    activeTeamId: gameState?.activeTeamId,
    phase,
    jokerUsed: gameState?.jokerUsed,
    jokerActivatedThisRound: gameState?.jokerActivatedThisRound,
    totalRounds,
    completedRounds,
    teamCount: settings.teamCount,
  };

  // ── CALIBRATION ──────────────────────────────────────────────────────────────
  if (phase === "calibration") {
    return (
      <div className="min-h-[100dvh] bg-game text-slate-900 dark:text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Калибровка</h2>
            <div className="text-6xl my-4">🎧</div>
            <p className="text-slate-500 dark:text-slate-400">Игроки проверяют наушники</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleTestRing}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all"
            >
              Протестировать сигнал
            </button>
            <button
              onClick={handleForceReady}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-all"
            >
              Все готовы
            </button>
          </div>

          <div className="space-y-3 max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400 w-24 shrink-0">Музыка</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={musicVolume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  audioManager.setMusicVolume(v);
                  setMusicVolumeState(v);
                }}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 w-8 text-right">{Math.round(musicVolume * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400 w-24 shrink-0">Сигнал</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={ringVolume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  audioManager.setRingVolume(v);
                  setRingVolumeState(v);
                }}
                className="flex-1 accent-blue-500"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 w-8 text-right">{Math.round(ringVolume * 100)}%</span>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3 text-slate-600 dark:text-slate-300">Статус игроков:</h3>
            {players.filter((p) => p.role === "player").length === 0 ? (
              <p className="text-slate-400 dark:text-slate-600 text-sm">Нет активных игроков</p>
            ) : (
              (() => {
                const activePlayers = players.filter((p) => p.role === "player");
                const hasTeams = settings.teamCount === 2;
                const col1 = hasTeams ? activePlayers.filter((p) => p.teamId === "red") : activePlayers.filter((_, i) => i % 2 === 0);
                const col2 = hasTeams ? activePlayers.filter((p) => p.teamId === "blue") : activePlayers.filter((_, i) => i % 2 === 1);
                const renderPlayer = (p: typeof activePlayers[0]) => (
                  <li key={p.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                    <PlayerAvatar name={p.name} emoji={p.emoji} teamId={p.teamId} size="sm" isReady={p.isReady} />
                    <span className={`truncate font-medium ${
                      p.teamId === "red" ? "text-red-600 dark:text-red-400"
                      : p.teamId === "blue" ? "text-blue-600 dark:text-blue-400"
                      : p.isReady ? "text-emerald-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {p.name}
                    </span>
                    <span className="ml-auto text-lg">{p.isReady ? "✅" : "⭕"}</span>
                  </li>
                );
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <ul className="space-y-1.5">{col1.map(renderPlayer)}</ul>
                    <ul className="space-y-1.5">{col2.map(renderPlayer)}</ul>
                  </div>
                );
              })()
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── TOPIC-SUGGEST ─────────────────────────────────────────────────────────────
  if (phase === "topic-suggest") {
    const suggestions = gameState?.suggestions ?? [];
    const selectedTopics = gameState?.selectedTopics;
    const isGenerating = gameState?.isGeneratingQuestions ?? false;
    const questionsReady = gameState?.questionsReady ?? false;
    const questionTable = publicQuestionTable;

    return (
      <HostLayout {...layoutProps}>
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold">Предложение тем</h2>

          {!questionsReady && (
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
              <div
                className="bg-indigo-500 h-3 rounded-full transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {!questionsReady && (
            <div>
              <h3 className="text-base font-semibold mb-3 text-slate-600 dark:text-slate-300">
                Предложения ({suggestions.length}):
              </h3>
              {suggestions.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-600 text-sm">Ждём предложений от игроков...</p>
              ) : (
                <SuggestionsGrid suggestions={suggestions} players={players} />
              )}
            </div>
          )}

          {selectedTopics && selectedTopics.length > 0 && !questionsReady && (
            <div>
              <h3 className="text-base font-semibold mb-2 text-emerald-600 dark:text-green-400">Выбранные темы:</h3>
              <ul className="space-y-1">
                {selectedTopics.map((t, i) => (
                  <li
                    key={i}
                    className="bg-emerald-50 dark:bg-green-900/20 border border-emerald-200 dark:border-green-800/30 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-emerald-700 dark:text-green-300">{t.name}</span>
                    {t.reason && <span className="text-slate-500 dark:text-slate-400 ml-2">— {t.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center gap-3 text-amber-600 dark:text-yellow-400">
              <div className="w-5 h-5 border-2 border-amber-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span>Генерирую вопросы...</span>
            </div>
          )}

          {questionsReady && questionTable.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 text-emerald-600 dark:text-green-400">Вопросы готовы!</h3>
              <QuestionTable questionTable={questionTable} compact />
            </div>
          )}

          {questionsReady && (
            <button
              onClick={() => gameLogicRef.current?.proceedFromTopicSuggest()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Далее →
            </button>
          )}
        </div>
      </HostLayout>
    );
  }

  // ── QUESTION-SETUP ────────────────────────────────────────────────────────────
  if (phase === "question-setup") {
    const isBlitzMode = settings.gameMode === "blitz";
    const isAI = settings.hostType === "ai";
    const isGenerating = gameState?.isGeneratingQuestions ?? false;

    return (
      <HostLayout {...layoutProps}>
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
          <h2 className="text-2xl font-bold">
            {isBlitzMode ? "Настройка блица" : "Загрузка вопросов"}
          </h2>

          {isBlitzMode && isAI && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Количество блиц-заданий (для всех раундов)
                </label>
                <input
                  type="number"
                  value={blitzTaskCount}
                  onChange={(e) => setBlitzTaskCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={30}
                  className="w-32 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                />
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  Для {settings.teamCount === 2 ? "2 команды по" : "1 команды по"} {Math.ceil(blitzTaskCount / (settings.teamCount === 2 ? 2 : 1))} раундов
                </p>
              </div>
              <button
                onClick={() => void gameLogicRef.current?.generateBlitzTasksAI(blitzTaskCount)}
                disabled={isGenerating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Генерирую задания...
                  </span>
                ) : (
                  "Создать с ИИ"
                )}
              </button>
            </div>
          )}

          {(!isBlitzMode || !isAI) && !questionsPreview && (
            <label
              className="relative flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleQuestionsDrop}
            >
              <svg className="w-16 h-16 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  {isBlitzMode ? "Загрузите блиц-задания" : "Загрузите вопросы"}
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Перетащите JSON-файл сюда или нажмите для выбора
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleQuestionsFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
          )}

          {questionsError && <p className="text-red-500 dark:text-red-400 text-sm">{questionsError}</p>}

          {questionsPreview && (
            <div className="space-y-4">
              {isBlitzMode ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-base font-semibold text-emerald-600 dark:text-green-400">
                    Заданий: {questionsPreview.blitzTasks?.length ?? 0}
                  </h3>
                </div>
              ) : (
                <QuestionTable
                  questionTable={questionsPreview.topics.map((t) => ({
                    topicName: t.name,
                    questions: t.questions.map((q) => ({ id: q.id, difficulty: q.difficulty, used: false })),
                  }))}
                  compact
                />
              )}

              <label className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Загрузить другой файл
                <input
                  type="file"
                  accept=".json"
                  onChange={handleQuestionsFile}
                  className="sr-only"
                />
              </label>

              <div className="fixed bottom-0 inset-x-0 p-4 bg-surface/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 z-20">
                <button
                  onClick={handleStartWithQuestions}
                  className="w-full max-w-2xl mx-auto block py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition-all"
                >
                  Начать игру
                </button>
              </div>
            </div>
          )}
        </div>
      </HostLayout>
    );
  }

  // ── ROUND-CAPTAIN ─────────────────────────────────────────────────────────────
  if (phase === "round-captain") {
    const activeTeamId = gameState?.activeTeamId;
    const captainId = gameState?.captainId;
    const captain = players.find((p) => p.id === captainId);
    const questionTable = publicQuestionTable;

    return (
      <HostLayout
        {...layoutProps}
        sidebar={
          <HostSidebar {...sidebarProps}>
            {!captain && (
              <button
                onClick={() => gameLogicRef.current?.forceCaptain()}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-all"
              >
                Назначить капитана (форсировать)
              </button>
            )}
          </HostSidebar>
        }
      >
        <div className="animate-fade-in space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">Выбор капитана</h2>
            {activeTeamId && <TeamBadge teamId={activeTeamId} />}
          </div>

          {captain ? (
            <div className="bg-emerald-50/80 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/50 rounded-xl p-6 text-center">
              <p className="text-emerald-700 dark:text-green-300 text-lg font-semibold">
                Капитан: {captain.name}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Переходим к готовности...</p>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-lg">Ожидаем, кто возьмёт роль капитана...</p>
            </div>
          )}

          <QuestionTable
            questionTable={questionTable}
            questionHistory={questionHistory}
          />
        </div>
      </HostLayout>
    );
  }

  // ── ROUND-READY ───────────────────────────────────────────────────────────────
  if (phase === "round-ready") {
    const activeTeamId = gameState?.activeTeamId;
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");
    const readyCount = teamPlayers.filter((p) => p.isReady).length;

    return (
      <HostLayout
        {...layoutProps}
        sidebar={
          <HostSidebar {...sidebarProps}>
            <button
              onClick={() => gameLogicRef.current?.forceRoundReady()}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-all"
            >
              Все готовы (форсировать)
            </button>
          </HostSidebar>
        }
      >
        <div className="animate-fade-in space-y-6 text-center">
          <h2 className="text-2xl font-bold mb-1">Наушники надеваем!</h2>
          {activeTeamId && <TeamBadge teamId={activeTeamId} />}
          <p className="text-slate-500 dark:text-slate-400">
            Готовы: {readyCount} / {teamPlayers.length}
          </p>
          <div className="text-7xl py-4">🎧</div>
        </div>
      </HostLayout>
    );
  }

  // ── ROUND-PICK ────────────────────────────────────────────────────────────────
  if (phase === "round-pick") {
    const activeTeamId = gameState?.activeTeamId;
    const captain = players.find((p) => p.id === gameState?.captainId);
    const questionTable = publicQuestionTable;

    return (
      <HostLayout
        {...layoutProps}
        sidebar={<HostSidebar {...sidebarProps} />}
      >
        <div className="animate-fade-in space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Выбор вопроса</h2>
            {activeTeamId && <TeamBadge teamId={activeTeamId} />}
            {captain && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Капитан: {captain.name}</p>
            )}
          </div>

          <QuestionTable
            questionTable={questionTable}
            questionHistory={questionHistory}
          />

          <p className="text-slate-400 dark:text-slate-500 text-sm text-center">
            Капитан выбирает вопрос на своём устройстве
          </p>
        </div>
      </HostLayout>
    );
  }

  // ── ROUND-ACTIVE ──────────────────────────────────────────────────────────────
  if (phase === "round-active") {
    const currentRound = gameState?.currentRound;
    const questionTable = publicQuestionTable;

    return (
      <HostLayout
        {...layoutProps}
        sidebar={
          <HostSidebar {...sidebarProps}>
            <button
              onClick={() => gameLogicRef.current?.forceRoundAnswer()}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-all"
            >
              Завершить раунд (форсировать)
            </button>
          </HostSidebar>
        }
      >
        <div className="animate-fade-in space-y-4 relative overflow-hidden">
          {/* Equalizer background decoration */}
          <div className="absolute inset-0 flex items-end justify-center opacity-[0.06] dark:opacity-[0.08] pointer-events-none">
            <Equalizer bars={7} className="h-full w-full text-indigo-500 dark:text-purple-400" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              {gameState?.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
              {currentRound && (
                <span className="text-slate-500 dark:text-slate-400 text-sm">
                  {currentRound.topicName} · {currentRound.difficulty} очков
                </span>
              )}
            </div>
            {gameState?.questionRevealText && (
              <div className="bg-indigo-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-indigo-200 dark:border-blue-700/50 rounded-xl p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Вопрос:</p>
                <p className="text-slate-900 dark:text-white font-semibold text-lg">{gameState.questionRevealText}</p>
              </div>
            )}
            <HostTimer endsAt={gameState?.timer?.endsAt} totalSeconds={settings.roundDuration} label="Объяснение" />
            <QuestionTable
              questionTable={questionTable}
              activeQuestionId={currentRound?.questionId}
              questionHistory={questionHistory}
            />
          </div>
        </div>
      </HostLayout>
    );
  }

  // ── ROUND-ANSWER ──────────────────────────────────────────────────────────────
  if (phase === "round-answer") {
    const currentRound = gameState?.currentRound;
    const questionTable = publicQuestionTable;
    const questionReveal = gameState?.questionRevealText;

    return (
      <HostLayout
        {...layoutProps}
        sidebar={<HostSidebar {...sidebarProps} />}
      >
        <div className="animate-fade-in space-y-4">
          <div>
            <h2 className="text-xl font-bold mb-2">Время отвечать!</h2>
            <HostTimer endsAt={gameState?.timer?.endsAt} totalSeconds={settings.answerDuration} label="Ответы" />
          </div>
          {questionReveal && (
            <div className="bg-indigo-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-indigo-200 dark:border-blue-700/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Вопрос:</p>
              <p className="text-slate-900 dark:text-white font-semibold">{questionReveal}</p>
            </div>
          )}
          <QuestionTable
            questionTable={questionTable}
            activeQuestionId={currentRound?.questionId}
            questionHistory={questionHistory}
          />
        </div>
      </HostLayout>
    );
  }

  // ── ROUND-REVIEW ──────────────────────────────────────────────────────────────
  if (phase === "round-review") {
    const isAutoReviewing = gameState?.isAutoReviewing ?? false;
    const captainId = gameState?.captainId;
    const activeTeamId = gameState?.activeTeamId;
    const teamPlayers = players.filter(
      (p) => p.teamId === activeTeamId && p.role === "player" && p.id !== captainId,
    );
    const allAnswers = gameState?.allAnswers ?? {};
    const revealText = gameState?.questionRevealText;

    function toggleAccepted(groupId: string) {
      setReviewGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, accepted: !g.accepted } : g)),
      );
    }

    function mergeIntoGroup(sourceId: string, targetId: string) {
      setReviewGroups((prev) => {
        const source = prev.find((g) => g.id === sourceId);
        const target = prev.find((g) => g.id === targetId);
        if (!source || !target || source.id === target.id) return prev;
        const merged: AnswerGroup = {
          ...target,
          playerIds: [...target.playerIds, ...source.playerIds],
          rawAnswers: { ...target.rawAnswers, ...source.rawAnswers },
        };
        return prev.filter((g) => g.id !== sourceId).map((g) => (g.id === targetId ? merged : g));
      });
    }

    function handleConfirmReview() {
      gameLogicRef.current?.confirmReview(reviewGroups);
    }

    return (
      <HostLayout {...layoutProps} sidebar={<HostSidebar {...sidebarProps} />}>
        <div className="animate-fade-in max-w-2xl space-y-6">
          <h2 className="text-2xl font-bold">Проверка ответов</h2>

          {revealText && (
            <div className="bg-indigo-50 dark:bg-blue-900/30 border border-indigo-200 dark:border-blue-700/50 rounded-lg p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Вопрос:</p>
              <p className="text-slate-900 dark:text-white font-semibold">{revealText}</p>
            </div>
          )}

          {isAutoReviewing ? (
            <div className="flex items-center gap-3 text-amber-600 dark:text-yellow-400">
              <div className="w-5 h-5 border-2 border-amber-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span>ИИ проверяет ответы...</span>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">Ответы игроков:</h3>
                <ul className="space-y-2">
                  {teamPlayers.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="text-slate-600 dark:text-slate-300">{p.name}:</span>
                      <span className="text-slate-900 dark:text-white font-medium">
                        {allAnswers[p.id] ?? <span className="text-slate-400 dark:text-slate-500 italic">нет ответа</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
                  Группы ответов (отметьте принятые):
                </h3>
                <ul className="space-y-2">
                  {reviewGroups.map((g) => {
                    const groupPlayers = g.playerIds
                      .map((pid) => players.find((p) => p.id === pid)?.name ?? pid)
                      .join(", ");
                    return (
                      <li
                        key={g.id}
                        className={`rounded-lg border p-3 text-sm ${
                          g.accepted
                            ? "bg-emerald-50 dark:bg-green-900/20 border-emerald-200 dark:border-green-700/50"
                            : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleAccepted(g.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              g.accepted
                                ? "bg-emerald-600 border-emerald-500 text-white"
                                : "border-slate-400 dark:border-slate-500"
                            }`}
                          >
                            {g.accepted && "✓"}
                          </button>
                          <div>
                            <p className="text-slate-900 dark:text-white font-medium">{g.canonicalAnswer || "—"}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">{groupPlayers}</p>
                          </div>
                        </div>
                        {reviewGroups.length > 1 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {reviewGroups
                              .filter((other) => other.id !== g.id)
                              .map((other) => (
                                <button
                                  key={other.id}
                                  onClick={() => mergeIntoGroup(g.id, other.id)}
                                  className="text-xs px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-all"
                                >
                                  Влить в «{other.canonicalAnswer || "—"}»
                                </button>
                              ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <button
                onClick={handleConfirmReview}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition-all"
              >
                Подтвердить
              </button>
            </>
          )}
        </div>
      </HostLayout>
    );
  }

  // ── ROUND-RESULT ──────────────────────────────────────────────────────────────
  if (phase === "round-result") {
    const result = gameState?.roundResult;
    const captain = players.find((p) => p.id === gameState?.captainId);

    return (
      <HostLayout
        {...layoutProps}
        sidebar={
          <HostSidebar {...sidebarProps}>
            <button
              onClick={() => gameLogicRef.current?.forceNextRound()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Следующий раунд
            </button>
          </HostSidebar>
        }
      >
        <div className="animate-fade-in space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Результат раунда</h2>
            {gameState?.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>

          {result && (
            <>
              {/* Secret card — correct answer */}
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700/40 rounded-xl p-5 text-center">
                <p className="text-xs text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">Правильный ответ</p>
                <p className="text-lg font-bold text-indigo-900 dark:text-indigo-200">{result.questionText}</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{gameState?.currentRound?.difficulty ?? ""} очков</p>
              </div>

              {captain && (
                <p className="text-amber-600 dark:text-yellow-400 text-sm">Капитан: {captain.name}</p>
              )}

              {/* Answer stickers */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">Ответы:</h3>
                <AnswerStickerGrid groups={result.groups} players={players} score={result.score} />
              </div>

              <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 text-center ${result.score === 0 ? "animate-shake" : ""}`}>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Очки за раунд:</p>
                <LEDScore
                  value={result.score}
                  teamId={gameState?.activeTeamId ?? "red"}
                  size="lg"
                />
                {result.jokerApplied && (
                  <p className="text-amber-700 dark:text-yellow-300 text-sm mt-1">Джокер x2</p>
                )}
              </div>

              {result.commentary && (
                <div className="bg-indigo-50/80 dark:bg-blue-900/20 border border-indigo-200 dark:border-blue-700/30 rounded-xl p-3 text-sm text-indigo-700 dark:text-blue-300">
                  {result.commentary}
                </div>
              )}
            </>
          )}
        </div>
      </HostLayout>
    );
  }

  // ── BLITZ-CAPTAIN ─────────────────────────────────────────────────────────────
  if (phase === "blitz-captain") {
    const activeTeamId = gameState?.activeTeamId;
    const captainId = gameState?.captainId;
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");
    const nonCaptainPlayers = teamPlayers.filter((p) => p.id !== captainId);
    const allOrdered = nonCaptainPlayers.every((p) => (p.blitzOrder ?? 0) > 0);
    const orderedCount = nonCaptainPlayers.filter((p) => (p.blitzOrder ?? 0) > 0).length;

    return (
      <HostLayout
        {...layoutProps}
        sidebar={
          <HostSidebar {...sidebarProps} showBlitzOrder>
            <button
              onClick={() => gameLogicRef.current?.forceBlitzCaptainDone()}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-all"
            >
              {!captainId ? "Назначить капитана и продолжить" : allOrdered ? "Начать выбор задания" : "Пропустить выбор порядка"}
            </button>
          </HostSidebar>
        }
      >
        <div className="animate-fade-in space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">Блиц — подготовка</h2>
            {activeTeamId && <TeamBadge teamId={activeTeamId} />}
          </div>

          {!captainId ? (
            <div className="text-center space-y-4">
              <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto opacity-80">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 dark:text-yellow-500" />
                <text x="60" y="45" textAnchor="middle" fontSize="32">🎩</text>
                <text x="60" y="80" textAnchor="middle" fontSize="12" fill="currentColor" className="text-slate-500 dark:text-slate-400">?</text>
              </svg>
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6">
                <p className="text-slate-500 dark:text-slate-400">Ждём, кто возьмёт роль капитана...</p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/50 rounded-xl p-6 text-center">
              <p className="text-emerald-700 dark:text-green-300 font-semibold">
                Капитан выбран. Команда выбирает порядок...
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {orderedCount} / {nonCaptainPlayers.length} выбрали позицию
              </p>
            </div>
          )}
        </div>
      </HostLayout>
    );
  }

  // ── BLITZ-READY ───────────────────────────────────────────────────────────────
  if (phase === "blitz-ready") {
    const activeTeamId = gameState?.activeTeamId;
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");
    const readyCount = teamPlayers.filter((p) => p.isReady).length;

    return (
      <HostLayout
        {...layoutProps}
        sidebar={
          <HostSidebar {...sidebarProps} showBlitzOrder>
            <button
              onClick={() => gameLogicRef.current?.forceBlitzReady()}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-all"
            >
              Все готовы (форсировать)
            </button>
          </HostSidebar>
        }
      >
        <div className="animate-fade-in space-y-6 text-center">
          <h2 className="text-2xl font-bold mb-1">Блиц — наушники!</h2>
          {activeTeamId && <TeamBadge teamId={activeTeamId} />}
          <p className="text-slate-500 dark:text-slate-400">
            Готовы: {readyCount} / {teamPlayers.length}
          </p>
          <div className="text-7xl py-4">🎧</div>
        </div>
      </HostLayout>
    );
  }

  // ── BLITZ-PICK ────────────────────────────────────────────────────────────────
  if (phase === "blitz-pick") {
    const captain = players.find((p) => p.id === gameState?.captainId);
    const blitzTasks = gameState?.blitzTasks ?? [];
    const usedIds = gameState?.usedBlitzTaskIds ?? [];
    const availableTasks = blitzTasks.filter((t) => !usedIds.includes(t.id));

    return (
      <HostLayout
        {...layoutProps}
        sidebar={<HostSidebar {...sidebarProps} showBlitzOrder />}
      >
        <div className="animate-fade-in space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Блиц — выбор задания</h2>
            {captain && (
              <p className="text-slate-500 dark:text-slate-400 text-sm">Капитан {captain.name} выбирает задание</p>
            )}
          </div>

          <div>
            {availableTasks.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm">Нет доступных заданий</p>
            ) : (
              availableTasks.map((task) => (
                <div key={task.id} className="mb-4">
                  <div className="flex flex-wrap gap-3 justify-center">
                    {task.items.map((item: { difficulty: number }, idx: number) => {
                      const teamColor = gameState?.activeTeamId === "blue" ? "blue" as const : "red" as const;
                      const rotations = [-2, 1, -1.5, 2, -0.5];
                      return (
                        <Sticker key={idx} color={teamColor} rotation={rotations[idx % rotations.length]} className="w-24 text-center">
                          <p className="text-2xl font-bold text-slate-800">{item.difficulty}</p>
                        </Sticker>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="text-slate-400 dark:text-slate-500 text-sm text-center">
            Капитан выбирает задание на своём устройстве
          </p>
        </div>
      </HostLayout>
    );
  }

  // ── BLITZ-ACTIVE ──────────────────────────────────────────────────────────────
  if (phase === "blitz-active") {
    return <BlitzActiveView gameState={gameState} layoutProps={layoutProps} sidebarProps={sidebarProps} players={players} />;
  }

  // ── BLITZ-ANSWER ──────────────────────────────────────────────────────────────
  if (phase === "blitz-answer") {
    return <BlitzAnswerView gameState={gameState} layoutProps={layoutProps} sidebarProps={sidebarProps} players={players} />;
  }

  // ── BLITZ-RESULT ──────────────────────────────────────────────────────────────
  if (phase === "blitz-result") {
    const result = gameState?.roundResult;
    const blitzTaskReveal = gameState?.blitzTaskReveal;

    return (
      <HostLayout
        {...layoutProps}
        sidebar={
          <HostSidebar {...sidebarProps} showBlitzOrder>
            <button
              onClick={() => gameLogicRef.current?.forceNextRound()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Продолжить
            </button>
          </HostSidebar>
        }
      >
        <div className="animate-fade-in space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Результат блица</h2>
            {gameState?.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>

          {/* Secret card — blitz word */}
          {blitzTaskReveal && (
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700/40 rounded-xl p-5 text-center">
              <p className="text-xs text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">Правильный ответ</p>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">{blitzTaskReveal.text}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{blitzTaskReveal.difficulty} очков</p>
            </div>
          )}

          {result && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">Цепочка ответов:</h3>
                <div className="flex flex-wrap gap-4">
                  {result.groups.map((g, i) => {
                    const p = players.find((pl) => pl.id === g.playerIds[0]);
                    const teamColor = p?.teamId === "blue" ? "blue" as const : p?.teamId === "red" ? "red" as const : "yellow" as const;
                    const rotations = [-2, 1.5, -1, 2.5, -0.5, 1];
                    const stampDelay = 0.3 + i * 0.4;
                    // blitz: chain-based — if rejected but correct (chain broken), use late-correct
                    const stampVariant = g.accepted ? "correct" as const : "incorrect" as const;
                    return (
                      <motion.div
                        key={g.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="relative"
                      >
                        <StickerWithAvatar
                          playerName={p?.name ?? g.playerIds[0]}
                          playerEmoji={p?.emoji}
                          teamId={p?.teamId}
                          color={teamColor}
                          rotation={rotations[i % rotations.length]}
                          className="w-44"
                        >
                          <p className="font-semibold text-slate-800 text-base">{g.canonicalAnswer || "—"}</p>
                          {g.note && (
                            <p className="text-xs font-handwritten text-slate-500 mt-1">{g.note}</p>
                          )}
                        </StickerWithAvatar>
                        <div className="absolute bottom-2 right-2">
                          <Stamp
                            text={g.accepted ? pickStampText("correct", result.score) : pickStampText(stampVariant)}
                            variant={stampVariant}
                            delay={stampDelay}
                            size="sm"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 text-center ${result.score === 0 ? "animate-shake" : ""}`}>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Очки за блиц:</p>
                <LEDScore
                  value={result.score}
                  teamId={gameState?.activeTeamId ?? "red"}
                  size="lg"
                />
              </div>
            </>
          )}
        </div>
      </HostLayout>
    );
  }

  // ── FINALE ────────────────────────────────────────────────────────────────────
  if (phase === "finale") {
    const scores = gameState?.scores ?? {};
    const gameStats = gameState?.gameStats;
    const sortedTeams = Object.entries(scores).sort(([, a], [, b]) => b - a);

    return (
      <HostLayout {...layoutProps}>
        <Confetti trigger delay={2200} />
        <div className="max-w-2xl mx-auto space-y-6 text-center animate-fade-in">
          <div>
            <div className="text-6xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Игра завершена!
            </h2>
          </div>

          {/* Teams in a row */}
          <div className="flex gap-4 justify-center">
            {sortedTeams.map(([teamId, score], i) => (
              <motion.div
                key={teamId}
                initial={{ opacity: 1 }}
                animate={i === 0 ? {
                  boxShadow: [
                    "0 0 0px rgba(245,180,50,0)",
                    "0 0 30px rgba(245,180,50,0.4)",
                    "0 0 15px rgba(245,180,50,0.2)",
                    "0 0 30px rgba(245,180,50,0.4)",
                  ],
                } : {}}
                transition={i === 0 ? { delay: 2, duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                className={`flex-1 max-w-xs rounded-xl p-6 border-2 transition-all ${
                  i === 0
                    ? "bg-amber-50/80 dark:bg-yellow-900/20 border-amber-400 dark:border-yellow-600/50"
                    : "bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                }`}
              >
                <p
                  className={`font-semibold text-lg mb-2 ${
                    teamId === "red" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"
                  }`}
                >
                  {teamId === "red" ? "Красные" : "Синие"}
                  {i === 0 && <span className="ml-2 inline-block animate-crown">👑</span>}
                </p>
                <AnimatedScore value={score} className="text-4xl font-bold" duration={2000} />
              </motion.div>
            ))}
          </div>

          {/* Stats stickers */}
          {gameStats && (
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {gameStats.topAnswererName && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 2.5, duration: 0.4 }}
                  className="relative"
                >
                  <Sticker color="green" rotation={-2} className="w-48 text-center">
                    <p className="font-semibold text-slate-800">{gameStats.topAnswererName}</p>
                    {gameStats.topAnswererCount && (
                      <p className="text-xs text-slate-500">{gameStats.topAnswererCount} правильных</p>
                    )}
                  </Sticker>
                  <div className="absolute bottom-1 right-1">
                    <Stamp text="Лучший игрок" variant="correct" delay={3} size="sm" />
                  </div>
                </motion.div>
              )}
              {gameStats.topCaptainName && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 3, duration: 0.4 }}
                  className="relative"
                >
                  <Sticker color="yellow" rotation={1.5} className="w-48 text-center">
                    <p className="font-semibold text-slate-800">{gameStats.topCaptainName}</p>
                    {gameStats.topCaptainCount && (
                      <p className="text-xs text-slate-500">{gameStats.topCaptainCount} раз капитан</p>
                    )}
                  </Sticker>
                  <div className="absolute bottom-1 right-1">
                    <Stamp text="Лучший капитан" variant="correct" delay={3.5} size="sm" />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Restart button — pinned */}
          <div className="pt-4">
            <button
              onClick={() => gameLogicRef.current?.restartGame()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Начать заново
            </button>
          </div>
        </div>
      </HostLayout>
    );
  }

  // Fallback
  return (
    <HostLayout {...layoutProps}>
      <div className="text-center space-y-4">
        <p className="text-sm text-slate-400 dark:text-slate-600 font-mono">{phase}</p>
      </div>
    </HostLayout>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function AnswerStickerGrid({ groups, players, score }: { groups: AnswerGroup[]; players: PublicPlayerInfo[]; score: number }) {
  const [topOfStack, setTopOfStack] = useState<Record<string, number>>({});
  const rotations = [-2, 1.5, -1, 2.5, -0.5, 1];
  const perGroupScore = score > 0 ? Math.round(score / groups.filter((g) => g.accepted).length) : 0;
  let stickerIdx = 0;

  return (
    <div className="flex flex-wrap gap-4">
      {groups.map((g, gi) => {
        const firstPlayer = players.find((pl) => pl.id === g.playerIds[0]);
        const teamColor = firstPlayer?.teamId === "blue" ? "blue" as const : firstPlayer?.teamId === "red" ? "red" as const : "yellow" as const;
        const isStack = g.playerIds.length > 1;
        const currentTop = topOfStack[g.id] ?? 0;
        const baseIdx = stickerIdx;
        stickerIdx += g.playerIds.length;
        const stampDelay = 0.3 + baseIdx * 0.4;

        if (!isStack) {
          // Single answer — simple sticker
          const p = firstPlayer;
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: baseIdx * 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <StickerWithAvatar
                playerName={p?.name ?? g.playerIds[0]}
                playerEmoji={p?.emoji}
                teamId={p?.teamId}
                color={teamColor}
                rotation={rotations[baseIdx % rotations.length]}
                className="w-44"
              >
                <p className="font-semibold text-slate-800 text-base">{g.canonicalAnswer || "—"}</p>
                {g.note && <p className="text-xs font-handwritten text-slate-500 mt-1">{g.note}</p>}
              </StickerWithAvatar>
              <div className="absolute bottom-2 right-2">
                <Stamp
                  text={g.accepted ? pickStampText("correct", perGroupScore) : pickStampText("incorrect")}
                  variant={g.accepted ? "correct" : "incorrect"}
                  delay={stampDelay}
                  animate
                  size="sm"
                />
              </div>
            </motion.div>
          );
        }

        // Stack of duplicate answers — overlapping cards
        const orderedPids = [
          g.playerIds[currentTop],
          ...g.playerIds.filter((_, i) => i !== currentTop),
        ];

        return (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: baseIdx * 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative cursor-pointer"
            style={{ width: 176 + (orderedPids.length - 1) * 6, height: "auto" }}
            onClick={() => setTopOfStack((prev) => ({ ...prev, [g.id]: ((prev[g.id] ?? 0) + 1) % g.playerIds.length }))}
            title="Нажмите, чтобы показать следующую карточку"
          >
            {orderedPids.map((pid, stackIdx) => {
              const p = players.find((pl) => pl.id === pid);
              const isOnTop = stackIdx === 0;
              return (
                <div
                  key={pid}
                  className="transition-all duration-300"
                  style={{
                    position: stackIdx === 0 ? "relative" : "absolute",
                    top: stackIdx * 4,
                    left: stackIdx * 6,
                    zIndex: orderedPids.length - stackIdx,
                    opacity: isOnTop ? 1 : 0.7,
                    pointerEvents: isOnTop ? "auto" : "none",
                  }}
                >
                  <StickerWithAvatar
                    playerName={p?.name ?? pid}
                    playerEmoji={p?.emoji}
                    teamId={p?.teamId}
                    color={teamColor}
                    rotation={rotations[(baseIdx + stackIdx) % rotations.length]}
                    className="w-44"
                  >
                    <p className="font-semibold text-slate-800 text-base">{(g.rawAnswers?.[pid] ?? g.canonicalAnswer) || "—"}</p>
                    {isOnTop && g.note && <p className="text-xs font-handwritten text-slate-500 mt-1">{g.note}</p>}
                  </StickerWithAvatar>
                  {isOnTop && (
                    <div className="absolute bottom-2 right-2">
                      <Stamp
                        text={g.accepted ? pickStampText("correct", perGroupScore) : pickStampText("incorrect")}
                        variant={g.accepted ? "correct" : "incorrect"}
                        delay={stampDelay}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {/* Stack indicator */}
            <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center z-30">
              {g.playerIds.length}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function SuggestionsGrid({ suggestions, players }: { suggestions: Array<{ playerName: string; text: string }>; players: PublicPlayerInfo[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(suggestions.length);

  useEffect(() => {
    if (suggestions.length > prevCountRef.current && containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
    prevCountRef.current = suggestions.length;
  }, [suggestions.length]);

  const rotations = [-1.5, 1, -0.5, 2, -2, 1.5];

  return (
    <div ref={containerRef} className="flex flex-wrap gap-3 max-h-96 overflow-y-auto pt-4 pl-4 pr-1 pb-1">
      {suggestions.map((s, i) => {
        const player = players.find((p) => p.name === s.playerName);
        const teamColor = player?.teamId === "blue" ? "blue" as const : player?.teamId === "red" ? "red" as const : "yellow" as const;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.15, duration: 0.3 }}
          >
            <StickerWithAvatar
              playerName={s.playerName}
              playerEmoji={player?.emoji}
              teamId={player?.teamId}
              color={teamColor}
              rotation={rotations[i % rotations.length]}
              className="w-40"
            >
              <p className="text-sm text-slate-800">{s.text}</p>
            </StickerWithAvatar>
          </motion.div>
        );
      })}
    </div>
  );
}

function HostTimer({ endsAt, totalSeconds, label }: { endsAt: number | undefined; totalSeconds: number; label?: string }) {
  const remaining = useTimer(endsAt);
  const seconds = Math.ceil(remaining / 1000);
  return (
    <div className="flex justify-center">
      <CircularTimer remaining={seconds} total={totalSeconds} variant="host" label={label} />
    </div>
  );
}

function BlitzActiveView({
  gameState,
  layoutProps,
  sidebarProps,
  players,
}: {
  gameState: FullGameState | null;
  layoutProps: { roomId: string; modeLabel: string; teamsLabel: string; hostLabel: string; scores: Record<string, number> };
  sidebarProps: Record<string, unknown>;
  players: PublicPlayerInfo[];
}) {
  const activeTeamId = gameState?.activeTeamId;

  return (
    <HostLayout
      {...layoutProps}
      sidebar={<HostSidebar {...(sidebarProps as React.ComponentProps<typeof HostSidebar>)} showBlitzOrder />}
    >
      <div className="animate-fade-in space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">Блиц идёт!</h2>
          {activeTeamId && <TeamBadge teamId={activeTeamId} />}
        </div>
        <HostTimer endsAt={gameState?.timer?.endsAt} totalSeconds={Math.ceil((gameState?.blitzTotalTimeMs ?? 30000) / 1000)} label="Блиц" />
        <div className="flex justify-center">
          <Sticker color={gameState?.activeTeamId === "blue" ? "blue" : "red"} rotation={-1} className="text-center">
            <p className="text-xs text-slate-500 mb-1">Стоимость задания</p>
            <p className="text-3xl font-bold text-slate-800">{gameState?.currentRound?.difficulty ?? "?"}</p>
          </Sticker>
        </div>
      </div>
    </HostLayout>
  );
}

function BlitzAnswerView({
  gameState,
  layoutProps,
  sidebarProps,
  players,
}: {
  gameState: FullGameState | null;
  layoutProps: { roomId: string; modeLabel: string; teamsLabel: string; hostLabel: string; scores: Record<string, number> };
  sidebarProps: Record<string, unknown>;
  players: PublicPlayerInfo[];
}) {
  const blitzOrder = gameState?.blitzOrder ?? [];
  const blitzAnswers = gameState?.blitzAnswers ?? {};

  return (
    <HostLayout
      {...layoutProps}
      sidebar={<HostSidebar {...(sidebarProps as React.ComponentProps<typeof HostSidebar>)} showBlitzOrder />}
    >
      <div className="animate-fade-in space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Блиц — финальные ответы</h2>
          <HostTimer endsAt={gameState?.timer?.endsAt} totalSeconds={20} label="Ответы" />
        </div>
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-2">Слово капитана:</p>
          <p className="text-4xl font-bold tracking-widest text-slate-400 dark:text-slate-600">* * *</p>
        </div>
        <div className="space-y-2">
          {blitzOrder.map((pid, i) => {
            const p = players.find((pl) => pl.id === pid);
            if (!p) return null;
            return (
              <div key={pid} className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
                <span className="text-slate-400 dark:text-slate-500 w-5 text-center">{i + 1}.</span>
                <span className="text-slate-600 dark:text-slate-300 flex-1">{p.name}</span>
                {blitzAnswers[pid] !== undefined && (
                  <span className="text-slate-900 dark:text-white font-medium">{blitzAnswers[pid] || "—"}</span>
                )}
                {p.hasAnswered ? (
                  <span className="text-emerald-600 dark:text-green-400">✓</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">✏️</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </HostLayout>
  );
}
