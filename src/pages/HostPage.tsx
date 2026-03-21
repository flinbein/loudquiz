import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Players } from "@flinbein/varhub-web-client";
import { getStoredRoom } from "../varhub/roomStore";
import { buildRoomUrl } from "../varhub/hubUtils";
import { GameLogic } from "../game/GameLogic";
import { audioManager } from "../audio/AudioManager";
import { QuestionTable } from "../components/shared/QuestionTable";
import { TeamStatusBlock } from "../components/shared/TeamStatusBlock";
import type { FullGameState, QuestionsFile, AnswerGroup, PublicPlayerInfo } from "../game/types";
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
      <span className="inline-block px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 text-xs font-semibold">
        Красные
      </span>
    );
  if (teamId === "blue")
    return (
      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 text-xs font-semibold">
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
          className={`font-bold ${teamId === "red" ? "text-red-400" : "text-blue-400"}`}
        >
          {teamId === "red" ? "Красные" : "Синие"}: {score}
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

  // Review state: groups built from allAnswers when entering round-review
  const [reviewGroups, setReviewGroups] = useState<AnswerGroup[]>([]);
  const reviewInitializedForRef = useRef<string | null>(null); // questionId

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
    }));
    setReviewGroups(groups);
  }, [gameState?.phase, gameState?.currentRound?.questionId]);

  if (!stored) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-gray-400">Комната не найдена</p>
        <p className="text-sm text-gray-500">
          Возможно, страница была перезагружена. Создайте новую комнату.
        </p>
        <Link
          to="/"
          className="px-6 py-2 bg-blue-700 hover:bg-blue-600 rounded transition-colors"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (roomClosed) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">⚠️</div>
        <p className="text-xl font-semibold">Соединение потеряно</p>
        <p className="text-sm text-gray-500">Соединение с сервером прервалось. Создайте новую комнату.</p>
        <Link
          to="/"
          className="px-6 py-2 bg-blue-700 hover:bg-blue-600 rounded transition-colors"
        >
          На главную
        </Link>
      </div>
    );
  }

  const roomUrl = buildRoomUrl(roomId!);
  const { settings } = stored;

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
  const activePlayers = gameLogicRef.current?.activePlayers() ?? [];

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

  function handleQuestionsFile(e: React.ChangeEvent<HTMLInputElement>) {
    setQuestionsError(null);
    setQuestionsPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const isBlitzMode = stored?.settings.gameMode === "blitz";
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

  function handleStartWithQuestions() {
    if (!questionsPreview) return;
    gameLogicRef.current?.uploadQuestions(questionsPreview);
  }

  // ── Header ────────────────────────────────────────────────────────────────────
  const header = (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-gray-400 hover:text-white text-sm transition-colors">
          &larr; Главная
        </Link>
        <h1 className="text-xl font-bold">Ведущий</h1>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span>{modeLabel}</span>
        <span>·</span>
        <span>{teamsLabel}</span>
        <span>·</span>
        <span>{hostLabel}</span>
        <span>·</span>
        <span className="font-mono text-blue-300">{roomId}</span>
        {gameState && (
          <>
            <span>·</span>
            <ScoreBar scores={gameState.scores} />
          </>
        )}
      </div>
    </header>
  );

  // ── LOBBY ─────────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="flex flex-col lg:flex-row gap-8 p-8 max-w-5xl mx-auto">
          {/* QR code */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <QRCodeSVG value={roomUrl} size={220} />
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Код комнаты</p>
              <p className="text-3xl font-mono font-bold tracking-widest">{roomId}</p>
            </div>
            <p className="text-xs text-gray-500 max-w-[220px] text-center break-all">{roomUrl}</p>
          </div>

          {/* Players */}
          <div className="flex-1 space-y-4">
            {settings.teamCount === 2 ? (
              <>
                <div>
                  <h2 className="text-base font-semibold text-red-400 mb-2">
                    Красные ({redPlayers.length})
                  </h2>
                  {redPlayers.length === 0 ? (
                    <p className="text-gray-600 text-sm">Нет игроков</p>
                  ) : (
                    <ul className="space-y-1">
                      {redPlayers.map((p) => (
                        <li
                          key={p.id}
                          className={`flex items-center gap-2 bg-red-900/30 border border-red-800/40 rounded px-3 py-2 text-sm ${!p.online ? "opacity-60" : ""}`}
                        >
                          <span className={!p.online ? "text-gray-400" : ""}>{p.name}</span>
                          {!p.online && <span className="text-gray-500 text-xs">(офлайн)</span>}
                          <button
                            onClick={() => handleKickPlayer(p.id)}
                            className="ml-auto text-red-500 hover:text-red-400 text-xs transition-colors"
                            title="Кикнуть игрока"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-blue-400 mb-2">
                    Синие ({bluePlayers.length})
                  </h2>
                  {bluePlayers.length === 0 ? (
                    <p className="text-gray-600 text-sm">Нет игроков</p>
                  ) : (
                    <ul className="space-y-1">
                      {bluePlayers.map((p) => (
                        <li
                          key={p.id}
                          className={`flex items-center gap-2 bg-blue-900/30 border border-blue-800/40 rounded px-3 py-2 text-sm ${!p.online ? "opacity-60" : ""}`}
                        >
                          <span className={!p.online ? "text-gray-400" : ""}>{p.name}</span>
                          {!p.online && <span className="text-gray-500 text-xs">(офлайн)</span>}
                          <button
                            onClick={() => handleKickPlayer(p.id)}
                            className="ml-auto text-red-500 hover:text-red-400 text-xs transition-colors"
                            title="Кикнуть игрока"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div>
                <h2 className="text-base font-semibold text-red-400 mb-2">
                  Команда ({redPlayers.length})
                </h2>
                {redPlayers.length === 0 ? (
                  <p className="text-gray-600 text-sm">Нет игроков</p>
                ) : (
                  <ul className="space-y-1">
                    {redPlayers.map((p) => (
                      <li
                        key={p.id}
                        className={`flex items-center gap-2 bg-red-900/30 border border-red-800/40 rounded px-3 py-2 text-sm ${!p.online ? "opacity-60" : ""}`}
                      >
                        <span className={!p.online ? "text-gray-400" : ""}>{p.name}</span>
                        {!p.online && <span className="text-gray-500 text-xs">(офлайн)</span>}
                        <button
                          onClick={() => handleKickPlayer(p.id)}
                          className="ml-auto text-red-500 hover:text-red-400 text-xs transition-colors"
                          title="Кикнуть игрока"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {unassigned.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-yellow-400 mb-2">
                  Не выбрали команду ({unassigned.length})
                </h2>
                <ul className="space-y-1">
                  {unassigned.map((p) => (
                    <li
                      key={p.id}
                      className={`flex items-center gap-2 bg-yellow-900/20 border border-yellow-800/30 rounded px-3 py-2 text-sm ${!p.online ? "opacity-60" : ""}`}
                    >
                      <span className={!p.online ? "text-gray-400" : ""}>{p.name}</span>
                      {!p.online && <span className="text-gray-500 text-xs">(офлайн)</span>}
                      <button
                        onClick={() => handleKickPlayer(p.id)}
                        className="ml-auto text-red-500 hover:text-red-400 text-xs transition-colors"
                        title="Кикнуть игрока"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {spectators.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-400 mb-2">
                  Зрители ({spectators.length})
                </h2>
                <ul className="space-y-1">
                  {spectators.map((p) => (
                    <li
                      key={p.id}
                      className={`flex items-center gap-2 bg-gray-800 rounded px-3 py-2 text-sm text-gray-400 ${!p.online ? "opacity-60" : ""}`}
                    >
                      <span>{p.name}</span>
                      {!p.online && <span className="text-gray-500 text-xs">(офлайн)</span>}
                      <button
                        onClick={() => handleKickPlayer(p.id)}
                        className="ml-auto text-red-500 hover:text-red-400 text-xs transition-colors"
                        title="Кикнуть игрока"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {players.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
                <p className="text-lg mb-2">Ждём игроков...</p>
                <p className="text-sm">
                  Попросите игроков отсканировать QR-код или ввести код комнаты
                </p>
              </div>
            )}

            <button
              onClick={handleStartGame}
              disabled={activePlayers.length === 0}
              className="mt-4 w-full py-3 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
            >
              Начать игру
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── CALIBRATION ──────────────────────────────────────────────────────────────
  if (phase === "calibration") {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Калибровка</h2>
            <div className="text-6xl my-4">🎧</div>
            <p className="text-gray-400">Игроки проверяют наушники</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleTestRing}
              className="px-6 py-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-medium transition-colors"
            >
              Протестировать сигнал
            </button>
            <button
              onClick={handleForceReady}
              className="px-6 py-3 bg-orange-700 hover:bg-orange-600 rounded-lg font-medium transition-colors"
            >
              Все готовы
            </button>
          </div>

          <div className="space-y-3 max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-24 shrink-0">Музыка</span>
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
              <span className="text-sm text-gray-400 w-8 text-right">{Math.round(musicVolume * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-24 shrink-0">Сигнал</span>
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
              <span className="text-sm text-gray-400 w-8 text-right">{Math.round(ringVolume * 100)}%</span>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3 text-gray-300">Статус игроков:</h3>
            {players.filter((p) => p.role === "player").length === 0 ? (
              <p className="text-gray-600 text-sm">Нет активных игроков</p>
            ) : (
              <ul className="space-y-2">
                {players
                  .filter((p) => p.role === "player")
                  .map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3"
                    >
                      <span className="text-xl">{p.isReady ? "✅" : "⭕"}</span>
                      <span className={p.isReady ? "text-green-400" : "text-gray-400"}>
                        {p.name}
                      </span>
                      {p.teamId && (
                        <span className="ml-auto">
                          <TeamBadge teamId={p.teamId} />
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
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
    const questionTable = gameState?.publicQuestionTable ?? [];

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold">Предложение тем</h2>

          {!questionsReady && (
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {!questionsReady && (
            <div>
              <h3 className="text-base font-semibold mb-2 text-gray-300">
                Предложения ({suggestions.length}):
              </h3>
              {suggestions.length === 0 ? (
                <p className="text-gray-600 text-sm">Ждём предложений от игроков...</p>
              ) : (
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <li key={i} className="text-sm bg-gray-800 rounded px-3 py-2">
                      <span className="text-blue-300 font-medium">{s.playerName}:</span> {s.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {selectedTopics && selectedTopics.length > 0 && !questionsReady && (
            <div>
              <h3 className="text-base font-semibold mb-2 text-green-400">Выбранные темы:</h3>
              <ul className="space-y-1">
                {selectedTopics.map((t, i) => (
                  <li
                    key={i}
                    className="bg-green-900/20 border border-green-800/30 rounded px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-green-300">{t.name}</span>
                    {t.reason && <span className="text-gray-400 ml-2">— {t.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center gap-3 text-yellow-400">
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span>Генерирую вопросы...</span>
            </div>
          )}

          {questionsReady && questionTable.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 text-green-400">Вопросы готовы!</h3>
              <QuestionTable questionTable={questionTable} compact />
            </div>
          )}

          {questionsReady && (
            <button
              onClick={() => gameLogicRef.current?.proceedFromTopicSuggest()}
              className="w-full py-3 bg-green-700 hover:bg-green-600 rounded-lg font-semibold text-lg transition-colors"
            >
              Далее →
            </button>
          )}
        </main>
      </div>
    );
  }

  // ── QUESTION-SETUP ────────────────────────────────────────────────────────────
  if (phase === "question-setup") {
    const isBlitzMode = settings.gameMode === "blitz";
    const isAI = settings.hostType === "ai";
    const isGenerating = gameState?.isGeneratingQuestions ?? false;

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold">
            {isBlitzMode ? "Настройка блица" : "Загрузка вопросов"}
          </h2>

          {isBlitzMode && isAI && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Количество блиц-заданий (для всех раундов)
                </label>
                <input
                  type="number"
                  value={blitzTaskCount}
                  onChange={(e) => setBlitzTaskCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={30}
                  className="w-32 bg-gray-800 text-white rounded px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Для {settings.teamCount === 2 ? "2 команды по" : "1 команды по"} {Math.ceil(blitzTaskCount / (settings.teamCount === 2 ? 2 : 1))} раундов
                </p>
              </div>
              <button
                onClick={() => void gameLogicRef.current?.generateBlitzTasksAI(blitzTaskCount)}
                disabled={isGenerating}
                className="w-full py-3 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
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

          {(!isBlitzMode || !isAI) && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                {isBlitzMode ? "Файл блиц-заданий (JSON с blitzTasks[])" : "Файл вопросов (JSON)"}
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleQuestionsFile}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-700 file:text-white hover:file:bg-blue-600 cursor-pointer"
              />
            </div>
          )}

          {questionsError && <p className="text-red-400 text-sm">{questionsError}</p>}

          {questionsPreview && (
            <div>
              {isBlitzMode ? (
                <h3 className="text-base font-semibold mb-3 text-gray-300">
                  Заданий: {questionsPreview.blitzTasks?.length ?? 0}
                </h3>
              ) : (
                <>
                  <h3 className="text-base font-semibold mb-3 text-gray-300">
                    Предпросмотр ({questionsPreview.topics.length} тем):
                  </h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="pb-2 pr-4">Тема</th>
                        <th className="pb-2 text-right">Вопросов</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questionsPreview.topics.map((t, i) => (
                        <tr key={i} className="border-b border-gray-800">
                          <td className="py-2 pr-4">{t.name}</td>
                          <td className="py-2 text-right text-gray-400">{t.questions.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <button
                onClick={handleStartWithQuestions}
                className="mt-4 w-full py-3 bg-green-700 hover:bg-green-600 rounded-lg font-semibold text-lg transition-colors"
              >
                Начать игру
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── ROUND-CAPTAIN ─────────────────────────────────────────────────────────────
  if (phase === "round-captain") {
    const activeTeamId = gameState?.activeTeamId;
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");
    const captainId = gameState?.captainId;
    const captain = players.find((p) => p.id === captainId);

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">Выбор капитана</h2>
            {activeTeamId && <TeamBadge teamId={activeTeamId} />}
          </div>

          {captain ? (
            <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 text-center">
              <p className="text-green-300 text-lg font-semibold">
                Капитан: {captain.name}
              </p>
              <p className="text-gray-400 text-sm mt-1">Переходим к готовности...</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-gray-400">Ожидаем, кто возьмёт роль капитана...</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Игроки команды:</h3>
            <ul className="space-y-2">
              {teamPlayers.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2 text-sm"
                >
                  <span className={p.id === captainId ? "text-yellow-400 font-bold" : ""}>
                    {p.name}
                  </span>
                  {p.wasRecentCaptain && (
                    <span className="text-gray-500 text-xs">(прошлый капитан)</span>
                  )}
                  {p.id === captainId && (
                    <span className="ml-auto text-yellow-400 text-xs font-bold">КАПИТАН</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {!captain && (
            <button
              onClick={() => gameLogicRef.current?.forceCaptain()}
              className="w-full py-2 bg-orange-700 hover:bg-orange-600 rounded text-sm font-medium transition-colors"
            >
              Назначить капитана (форсировать)
            </button>
          )}

          <div className="text-center">
            <ScoreBar scores={gameState?.scores ?? {}} />
          </div>
        </main>
      </div>
    );
  }

  // ── ROUND-READY ───────────────────────────────────────────────────────────────
  if (phase === "round-ready") {
    const activeTeamId = gameState?.activeTeamId;
    const captainId = gameState?.captainId;
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");
    const readyCount = teamPlayers.filter((p) => p.isReady).length;

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">Наушники надеваем!</h2>
            {activeTeamId && <TeamBadge teamId={activeTeamId} />}
            <p className="text-gray-400 mt-2">
              Готовы: {readyCount} / {teamPlayers.length}
            </p>
          </div>

          <div className="text-center text-6xl">🎧</div>

          <ul className="space-y-2">
            {teamPlayers.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 bg-gray-800 rounded px-3 py-2 text-sm"
              >
                <span>{p.isReady ? "✅" : "⭕"}</span>
                <span className={p.isReady ? "text-green-400" : "text-gray-400"}>{p.name}</span>
                {p.id === captainId && (
                  <span className="ml-auto text-yellow-400 text-xs font-bold">КАПИТАН</span>
                )}
              </li>
            ))}
          </ul>

          <button
            onClick={() => gameLogicRef.current?.forceRoundReady()}
            className="w-full py-2 bg-orange-700 hover:bg-orange-600 rounded text-sm font-medium transition-colors"
          >
            Все готовы (форсировать)
          </button>
        </main>
      </div>
    );
  }

  // ── ROUND-PICK ────────────────────────────────────────────────────────────────
  if (phase === "round-pick") {
    const activeTeamId = gameState?.activeTeamId;
    const captainId = gameState?.captainId;
    const captain = players.find((p) => p.id === captainId);
    const questionTable = gameState?.publicQuestionTable ?? [];
    const jokerUsed = gameState?.jokerUsed ?? {};
    const jokerActive = gameState?.jokerActivatedThisRound ?? {};
    const teamJokerUsed = activeTeamId ? jokerUsed[activeTeamId] : true;
    const teamJokerActive = activeTeamId ? jokerActive[activeTeamId] : false;

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Выбор вопроса</h2>
              {activeTeamId && <TeamBadge teamId={activeTeamId} />}
              {captain && (
                <p className="text-gray-400 text-sm mt-1">Капитан: {captain.name}</p>
              )}
            </div>
            <div className="text-right">
              <ScoreBar scores={gameState?.scores ?? {}} />
              {teamJokerActive && (
                <p className="text-yellow-400 text-sm font-bold mt-1">Джокер активирован!</p>
              )}
              {!teamJokerUsed && !teamJokerActive && (
                <p className="text-gray-500 text-xs mt-1">Джокер доступен</p>
              )}
              {teamJokerUsed && (
                <p className="text-gray-600 text-xs mt-1">Джокер использован</p>
              )}
            </div>
          </div>

          {/* Question table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {questionTable.map((topic, ti) => (
                    <th
                      key={ti}
                      className="px-2 py-2 text-center text-gray-300 font-semibold border border-gray-700 bg-gray-800"
                    >
                      {topic.topicName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questionTable[0]?.questions.map((_, qi) => (
                  <tr key={qi}>
                    {questionTable.map((topic, ti) => {
                      const q = topic.questions[qi];
                      if (!q) return <td key={ti} />;
                      return (
                        <td
                          key={ti}
                          className={`px-2 py-2 text-center border border-gray-700 ${
                            q.used
                              ? "bg-gray-800/50 text-gray-600 line-through"
                              : "bg-gray-700/30 text-white"
                          }`}
                        >
                          {q.difficulty}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-500 text-sm text-center">
            Капитан выбирает вопрос на своём устройстве
          </p>
        </main>
      </div>
    );
  }

  // ── ROUND-ACTIVE ──────────────────────────────────────────────────────────────
  if (phase === "round-active") {
    const activeTeamId = gameState?.activeTeamId;
    const captainId = gameState?.captainId;
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");
    const currentRound = gameState?.currentRound;
    const questionTable = gameState?.publicQuestionTable ?? [];
    const questionHistory = gameState?.questionHistory ?? [];

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-6 max-w-5xl mx-auto grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              {activeTeamId && <TeamBadge teamId={activeTeamId} />}
              {currentRound && (
                <span className="text-gray-400 text-sm">
                  {currentRound.topicName} · {currentRound.difficulty} очков
                </span>
              )}
            </div>
            {gameState?.questionRevealText && (
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Вопрос:</p>
                <p className="text-white font-semibold text-lg">{gameState.questionRevealText}</p>
              </div>
            )}
            <div className="text-center">
              <TimerDisplay endsAt={gameState?.timer?.endsAt} />
            </div>
            <QuestionTable
              questionTable={questionTable}
              activeQuestionId={currentRound?.questionId}
              questionHistory={questionHistory}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400">Команда:</h3>
            <TeamStatusBlock players={teamPlayers} captainId={captainId} />
            <button
              onClick={() => gameLogicRef.current?.forceRoundAnswer()}
              className="w-full py-2 bg-orange-700 hover:bg-orange-600 rounded text-sm font-medium transition-colors"
            >
              Завершить раунд (форсировать)
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── ROUND-ANSWER ──────────────────────────────────────────────────────────────
  if (phase === "round-answer") {
    const activeTeamId = gameState?.activeTeamId;
    const captainId = gameState?.captainId;
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");
    const currentRound = gameState?.currentRound;
    const questionTable = gameState?.publicQuestionTable ?? [];
    const questionHistory = gameState?.questionHistory ?? [];
    const questionReveal = gameState?.questionRevealText;

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-6 max-w-5xl mx-auto grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Время отвечать!</h2>
              <TimerDisplay endsAt={gameState?.timer?.endsAt} />
            </div>
            {questionReveal && (
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Вопрос:</p>
                <p className="text-white font-semibold">{questionReveal}</p>
              </div>
            )}
            <QuestionTable
              questionTable={questionTable}
              activeQuestionId={currentRound?.questionId}
              questionHistory={questionHistory}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400">Команда отвечает:</h3>
            <TeamStatusBlock players={teamPlayers} captainId={captainId} />
          </div>
        </main>
      </div>
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
        };
        return prev.filter((g) => g.id !== sourceId).map((g) => (g.id === targetId ? merged : g));
      });
    }

    function handleConfirmReview() {
      gameLogicRef.current?.confirmReview(reviewGroups);
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold">Проверка ответов</h2>

          {revealText && (
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Вопрос:</p>
              <p className="text-white font-semibold">{revealText}</p>
            </div>
          )}

          {isAutoReviewing ? (
            <div className="flex items-center gap-3 text-yellow-400">
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span>ИИ проверяет ответы...</span>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Ответы игроков:</h3>
                <ul className="space-y-2">
                  {teamPlayers.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 bg-gray-800 rounded px-3 py-2 text-sm"
                    >
                      <span className="text-gray-300">{p.name}:</span>
                      <span className="text-white font-medium">
                        {allAnswers[p.id] ?? <span className="text-gray-500 italic">нет ответа</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
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
                        className={`rounded border p-3 text-sm ${
                          g.accepted
                            ? "bg-green-900/20 border-green-700/50"
                            : "bg-red-900/10 border-red-800/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleAccepted(g.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              g.accepted
                                ? "bg-green-600 border-green-500 text-white"
                                : "border-gray-500"
                            }`}
                          >
                            {g.accepted && "✓"}
                          </button>
                          <div>
                            <p className="text-white font-medium">{g.canonicalAnswer || "—"}</p>
                            <p className="text-gray-400 text-xs">{groupPlayers}</p>
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
                                  className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
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
                className="w-full py-3 bg-green-700 hover:bg-green-600 rounded-lg font-semibold text-lg transition-colors"
              >
                Подтвердить
              </button>
            </>
          )}
        </main>
      </div>
    );
  }

  // ── ROUND-RESULT ──────────────────────────────────────────────────────────────
  if (phase === "round-result") {
    const result = gameState?.roundResult;
    const captainId = gameState?.captainId;
    const captain = players.find((p) => p.id === captainId);

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Результат раунда</h2>
            {gameState?.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>

          {result && (
            <>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Вопрос:</p>
                <p className="text-white font-semibold">{result.questionText}</p>
              </div>

              {captain && (
                <p className="text-yellow-400 text-sm">Капитан: {captain.name}</p>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Ответы:</h3>
                <ul className="space-y-2">
                  {result.groups.map((g) => {
                    const groupPlayers = g.playerIds
                      .map((pid) => players.find((p) => p.id === pid)?.name ?? pid)
                      .join(", ");
                    return (
                      <li
                        key={g.id}
                        className={`rounded border p-3 text-sm flex items-start gap-3 ${
                          g.accepted
                            ? "bg-green-900/20 border-green-700/50"
                            : "bg-red-900/10 border-red-800/30"
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">
                          {g.accepted ? "✅" : "❌"}
                        </span>
                        <div>
                          <p className="text-white font-medium">{g.canonicalAnswer}</p>
                          <p className="text-gray-400 text-xs">{groupPlayers}</p>
                          {g.note && <p className="text-gray-500 text-xs italic">{g.note}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Очки за раунд:</p>
                <p className="text-3xl font-bold text-yellow-400">
                  +{result.score}
                  {result.jokerApplied && (
                    <span className="text-base text-yellow-300 ml-2">(Джокер x2)</span>
                  )}
                </p>
              </div>

              {result.commentary && (
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-sm text-blue-300">
                  {result.commentary}
                </div>
              )}
            </>
          )}

          <div className="text-center">
            <ScoreBar scores={gameState?.scores ?? {}} />
          </div>

          <button
            onClick={() => gameLogicRef.current?.forceNextRound()}
            className="w-full py-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-semibold text-lg transition-colors"
          >
            Следующий раунд
          </button>
        </main>
      </div>
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
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">Блиц — подготовка</h2>
            {activeTeamId && <TeamBadge teamId={activeTeamId} />}
          </div>

          {!captainId ? (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-gray-400">Ждём, кто возьмёт роль капитана...</p>
            </div>
          ) : (
            <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 text-center">
              <p className="text-green-300 font-semibold">
                Капитан выбран. Команда выбирает порядок...
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {orderedCount} / {nonCaptainPlayers.length} выбрали позицию
              </p>
            </div>
          )}

          <TeamStatusBlock players={teamPlayers} captainId={captainId} showBlitzOrder />

          <button
            onClick={() => gameLogicRef.current?.forceBlitzCaptainDone()}
            className="w-full py-2 bg-orange-700 hover:bg-orange-600 rounded text-sm font-medium transition-colors"
          >
            {!captainId ? "Назначить капитана и продолжить" : allOrdered ? "Начать выбор задания" : "Пропустить выбор порядка"}
          </button>
        </main>
      </div>
    );
  }

  // ── BLITZ-READY ───────────────────────────────────────────────────────────────
  if (phase === "blitz-ready") {
    const activeTeamId = gameState?.activeTeamId;
    const captainId = gameState?.captainId;
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");
    const readyCount = teamPlayers.filter((p) => p.isReady).length;

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">Блиц — наушники!</h2>
            {activeTeamId && <TeamBadge teamId={activeTeamId} />}
            <p className="text-gray-400 mt-2">
              Готовы: {readyCount} / {teamPlayers.length}
            </p>
          </div>

          <div className="text-center text-6xl">🎧</div>

          <TeamStatusBlock players={teamPlayers} captainId={captainId} showBlitzOrder />

          <button
            onClick={() => gameLogicRef.current?.forceBlitzReady()}
            className="w-full py-2 bg-orange-700 hover:bg-orange-600 rounded text-sm font-medium transition-colors"
          >
            Все готовы (форсировать)
          </button>
        </main>
      </div>
    );
  }

  // ── BLITZ-PICK ────────────────────────────────────────────────────────────────
  if (phase === "blitz-pick") {
    const activeTeamId = gameState?.activeTeamId;
    const captainId = gameState?.captainId;
    const captain = players.find((p) => p.id === captainId);
    const blitzTasks = gameState?.blitzTasks ?? [];
    const usedIds = gameState?.usedBlitzTaskIds ?? [];
    const availableTasks = blitzTasks.filter((t) => !usedIds.includes(t.id));
    const teamPlayers = players.filter((p) => p.teamId === activeTeamId && p.role === "player");

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-4xl mx-auto grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Блиц — выбор задания</h2>
              {captain && (
                <p className="text-gray-400 text-sm">Капитан {captain.name} выбирает задание</p>
              )}
            </div>

            <div className="space-y-2">
              {availableTasks.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет доступных заданий</p>
              ) : (
                availableTasks.map((task) => (
                  <div key={task.id} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">
                      Сложности: {task.items.map((i) => i.difficulty).join(" / ")}
                    </p>
                  </div>
                ))
              )}
            </div>

            <p className="text-gray-500 text-sm text-center">
              Капитан выбирает задание на своём устройстве
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400">Порядок блица:</h3>
            <TeamStatusBlock players={teamPlayers} captainId={captainId} showBlitzOrder />
          </div>
        </main>
      </div>
    );
  }

  // ── BLITZ-ACTIVE ──────────────────────────────────────────────────────────────
  if (phase === "blitz-active") {
    return <BlitzActiveView gameState={gameState} header={header} players={players} />;
  }

  // ── BLITZ-ANSWER ──────────────────────────────────────────────────────────────
  if (phase === "blitz-answer") {
    return <BlitzAnswerView gameState={gameState} header={header} players={players} />;
  }

  // ── BLITZ-RESULT ──────────────────────────────────────────────────────────────
  if (phase === "blitz-result") {
    const result = gameState?.roundResult;
    const blitzTaskReveal = gameState?.blitzTaskReveal;

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Результат блица</h2>
            {gameState?.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>

          {blitzTaskReveal && (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400 mb-1">Слово:</p>
              <p className="text-3xl font-bold text-white">{blitzTaskReveal.text}</p>
              <p className="text-gray-500 text-sm">Сложность: {blitzTaskReveal.difficulty}</p>
            </div>
          )}

          {result && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Цепочка ответов:</h3>
                <ul className="space-y-2">
                  {result.groups.map((g, i) => {
                    const playerName =
                      players.find((p) => p.id === g.playerIds[0])?.name ?? g.playerIds[0];
                    return (
                      <li
                        key={g.id}
                        className={`rounded border p-3 text-sm flex items-start gap-3 ${
                          g.accepted
                            ? "bg-green-900/20 border-green-700/50"
                            : "bg-red-900/10 border-red-800/30"
                        }`}
                      >
                        <span className="text-gray-500 w-5 text-center flex-shrink-0">
                          {i + 1}.
                        </span>
                        <span className="text-xl flex-shrink-0">
                          {g.accepted ? "✅" : "❌"}
                        </span>
                        <div>
                          <p className="text-white font-medium">{g.canonicalAnswer}</p>
                          <p className="text-gray-400 text-xs">{playerName}</p>
                          {g.note && (
                            <p className="text-gray-500 text-xs italic">{g.note}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Очки за блиц:</p>
                <p className="text-3xl font-bold text-yellow-400">+{result.score}</p>
              </div>
            </>
          )}

          <div className="text-center">
            <ScoreBar scores={gameState?.scores ?? {}} />
          </div>

          <button
            onClick={() => gameLogicRef.current?.forceNextRound()}
            className="w-full py-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-semibold text-lg transition-colors"
          >
            Продолжить
          </button>
        </main>
      </div>
    );
  }

  // ── FINALE ────────────────────────────────────────────────────────────────────
  if (phase === "finale") {
    const scores = gameState?.scores ?? {};
    const gameStats = gameState?.gameStats;
    const sortedTeams = Object.entries(scores).sort(([, a], [, b]) => b - a);

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {header}
        <main className="p-8 max-w-2xl mx-auto space-y-6 text-center">
          <div>
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold">Игра завершена!</h2>
          </div>

          <div className="space-y-3">
            {sortedTeams.map(([teamId, score], i) => (
              <div
                key={teamId}
                className={`rounded-lg p-4 border ${
                  i === 0
                    ? "bg-yellow-900/20 border-yellow-600/50"
                    : "bg-gray-800 border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold ${
                      teamId === "red" ? "text-red-400" : "text-blue-400"
                    }`}
                  >
                    {teamId === "red" ? "Красные" : "Синие"}
                    {i === 0 && <span className="ml-2 text-yellow-400">👑</span>}
                  </span>
                  <span className="text-2xl font-bold">{score}</span>
                </div>
              </div>
            ))}
          </div>

          {gameStats && (
            <div className="bg-gray-800 rounded-lg p-4 text-left space-y-2">
              <h3 className="text-gray-400 text-sm font-semibold mb-3">Статистика:</h3>
              {gameStats.topAnswererName && (
                <p className="text-sm">
                  <span className="text-gray-400">Лучший отвечающий: </span>
                  <span className="text-green-400 font-medium">{gameStats.topAnswererName}</span>
                  {gameStats.topAnswererCount && (
                    <span className="text-gray-500 ml-1">({gameStats.topAnswererCount} правильных)</span>
                  )}
                </p>
              )}
              {gameStats.topCaptainName && (
                <p className="text-sm">
                  <span className="text-gray-400">Лучший капитан: </span>
                  <span className="text-yellow-400 font-medium">{gameStats.topCaptainName}</span>
                  {gameStats.topCaptainCount && (
                    <span className="text-gray-500 ml-1">({gameStats.topCaptainCount} раз)</span>
                  )}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => gameLogicRef.current?.restartGame()}
              className="px-8 py-3 bg-green-700 hover:bg-green-600 rounded-lg font-semibold text-lg transition-colors"
            >
              Начать заново
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {header}
      <main className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <p className="text-sm text-gray-600 font-mono">{phase}</p>
      </main>
    </div>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function TimerDisplay({ endsAt }: { endsAt: number | undefined }) {
  const remaining = useTimer(endsAt);
  const seconds = Math.ceil(remaining / 1000);
  const isWarning = seconds <= 10;
  return (
    <div
      className={`text-6xl font-mono font-bold text-center ${isWarning ? "text-red-400 animate-pulse" : "text-white"}`}
    >
      {seconds}
    </div>
  );
}

function BlitzActiveView({
  gameState,
  header,
  players,
}: {
  gameState: FullGameState | null;
  header: React.ReactNode;
  players: PublicPlayerInfo[];
}) {
  const activeTeamId = gameState?.activeTeamId;
  const captainId = gameState?.captainId;
  const blitzOrder = gameState?.blitzOrder ?? [];
  const teamPlayers = players.filter(
    (p: PublicPlayerInfo) => p.teamId === activeTeamId && p.role === "player",
  );
  // Sort by blitz order (captain first with blitzOrder=0, then by position)
  const sortedTeam = [...teamPlayers].sort(
    (a, b) => (a.blitzOrder ?? 999) - (b.blitzOrder ?? 999),
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {header}
      <main className="p-8 max-w-4xl mx-auto grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1">Блиц идёт!</h2>
            {activeTeamId && <TeamBadge teamId={activeTeamId} />}
          </div>
          <div className="text-center">
            <TimerDisplay endsAt={gameState?.timer?.endsAt} />
          </div>
          {/* Asterisk card — captain's word hidden from host screen here */}
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm mb-2">Слово капитана:</p>
            <p className="text-4xl font-bold tracking-widest text-gray-600">* * *</p>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400">Команда:</h3>
          <TeamStatusBlock players={sortedTeam} captainId={captainId} showBlitzOrder />
          <div className="text-xs text-gray-600 text-center">
            {blitzOrder.length} игр. в очереди
          </div>
        </div>
      </main>
    </div>
  );
}

function BlitzAnswerView({
  gameState,
  header,
  players,
}: {
  gameState: FullGameState | null;
  header: React.ReactNode;
  players: PublicPlayerInfo[];
}) {
  const activeTeamId = gameState?.activeTeamId;
  const captainId = gameState?.captainId;
  const blitzOrder = gameState?.blitzOrder ?? [];
  const blitzAnswers = gameState?.blitzAnswers ?? {};
  const teamPlayers = players.filter(
    (p: PublicPlayerInfo) => p.teamId === activeTeamId && p.role === "player",
  );
  const sortedTeam = [...teamPlayers].sort(
    (a, b) => (a.blitzOrder ?? 999) - (b.blitzOrder ?? 999),
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {header}
      <main className="p-8 max-w-4xl mx-auto grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Блиц — финальные ответы</h2>
            <TimerDisplay endsAt={gameState?.timer?.endsAt} />
          </div>
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Слово капитана:</p>
            <p className="text-4xl font-bold tracking-widest text-gray-600">* * *</p>
          </div>
          <div className="space-y-2">
            {blitzOrder.map((pid, i) => {
              const p = players.find((pl) => pl.id === pid);
              if (!p) return null;
              return (
                <div key={pid} className="flex items-center gap-3 bg-gray-800 rounded px-3 py-2 text-sm">
                  <span className="text-gray-500 w-5 text-center">{i + 1}.</span>
                  <span className="text-gray-300 flex-1">{p.name}</span>
                  {blitzAnswers[pid] !== undefined && (
                    <span className="text-white font-medium">{blitzAnswers[pid] || "—"}</span>
                  )}
                  {p.hasAnswered ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-gray-600">✏️</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400">Команда:</h3>
          <TeamStatusBlock players={sortedTeam} captainId={captainId} showBlitzOrder />
        </div>
      </main>
    </div>
  );
}

