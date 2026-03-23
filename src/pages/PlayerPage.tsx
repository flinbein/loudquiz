import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Varhub } from "@flinbein/varhub-web-client";
import { getBackendUrl } from "../varhub/hubUtils";
import { audioManager } from "../audio/AudioManager";
import type { PublicGameState, CaptainPrivateInfo, BlitzItem } from "../game/types";
import type { PlayerToHostMsg, BlitzTaskPublic } from "../game/messages";
import { QuestionTable } from "../components/shared/QuestionTable";
import { ThemeToggle } from "../components/shared/ThemeToggle";
import { vibrate, VIBRATION_PATTERNS } from "../utils/vibrate";
import { PlayerAvatar } from "../components/shared/PlayerAvatar";
import { motion } from "framer-motion";
import { StickerWithAvatar } from "../components/shared/StickerWithAvatar";
import { Stamp } from "../components/shared/Stamp";
import { pickStampText } from "../components/shared/stampTexts";

const sessionKey = (roomId: string) => `player:${roomId}`;

interface PlayerSession {
  name: string;
  role: "player" | "spectator";
}

type Status = "form" | "connecting" | "connected" | "error";

function useTimer(endsAt: number | undefined, clockOffset: number): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const update = () =>
      setRemaining(Math.max(0, endsAt - (Date.now() + clockOffset)));
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [endsAt, clockOffset]);
  return remaining;
}

function TeamBadge({ teamId }: { teamId: string }) {
  if (teamId === "red")
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold">
        Красные
      </span>
    );
  if (teamId === "blue")
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold">
        Синие
      </span>
    );
  return null;
}

export default function PlayerPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [name, setName] = useState(() => localStorage.getItem("lastPlayerName") ?? "");
  const [status, setStatus] = useState<Status>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [localRole, setLocalRole] = useState<"player" | "spectator">("player");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const musicTogglingRef = useRef(false); // prevent concurrent toggle calls
  const [readySent, setReadySent] = useState(false);
  const [suggestText, setSuggestText] = useState("");
  const [noIdeasSent, setNoIdeasSent] = useState(false);
  const clockOffsetRef = useRef(0);
  const [progressPct, setProgressPct] = useState(100);

  // Captain private info
  const [captainInfo, setCaptainInfo] = useState<CaptainPrivateInfo | null>(null);
  const [blitzCaptainItem, setBlitzCaptainItem] = useState<BlitzItem | null>(null);

  // Answer input state
  const [answerInput, setAnswerInput] = useState("");
  const [answerSent, setAnswerSent] = useState(false);
  const [blitzAnswerInput, setBlitzAnswerInput] = useState("");
  const [blitzAnswerSent, setBlitzAnswerSent] = useState(false);
  const [blitzTaskList, setBlitzTaskList] = useState<BlitzTaskPublic[] | null>(null);
  const [musicVolume, setMusicVolumeState] = useState(() => audioManager.getMusicVolume());
  const [ringVolume, setRingVolumeState] = useState(() => audioManager.getRingVolume());

  const clientRef = useRef<ReturnType<Varhub["join"]> | null>(null);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConnectedRef = useRef(false); // true after first syncState received
  // null = not kicked, "host" = kicked by host, "duplicate" = duplicate session
  const [kickReason, setKickReason] = useState<null | "host" | "duplicate">(null);

  // Мок-инъекция для скриншотов (только в dev-режиме)
  useEffect(() => {
    function applyMock() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mock = (window as any).__MOCK_PLAYER_STATE__;
      if (!mock) return;
      setGameState(mock.gameState);
      setStatus("connected");
      setName(mock.playerName ?? "Игрок");
      setLocalRole(mock.localRole ?? "player");
      if (mock.captainInfo) setCaptainInfo(mock.captainInfo);
      if (mock.blitzCaptainItem) setBlitzCaptainItem(mock.blitzCaptainItem);
      if (mock.answerSent) setAnswerSent(true);
      if (mock.blitzAnswerSent) setBlitzAnswerSent(true);
      if (mock.readySent) setReadySent(true);
      if (mock.blitzTaskList) setBlitzTaskList(mock.blitzTaskList);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__MOCK_APPLIED__ = true;
    }
    applyMock();
    window.addEventListener("__applyMock", applyMock);
    return () => window.removeEventListener("__applyMock", applyMock);
  }, []);

  function sendMsg(msg: PlayerToHostMsg) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (clientRef.current as any)?.send(msg);
  }

  // Reset answer state on phase change
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!gameState) return;
    const phase = gameState.phase;
    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      if (phase === "round-active" || phase === "round-captain") {
        setAnswerInput("");
        setAnswerSent(false);
      }
      if (phase === "blitz-active" || phase === "blitz-captain") {
        setBlitzAnswerInput("");
        setBlitzAnswerSent(false);
      }
      if (phase === "round-ready" || phase === "blitz-ready") {
        setReadySent(false);
      }
      // Ring signal + vibration on phase starts
      if (phase === "round-active" || phase === "blitz-active") {
        void audioManager.playRing();
        vibrate(VIBRATION_PATTERNS.ROUND_START);
      } else if (phase === "round-answer" || phase === "blitz-answer") {
        void audioManager.playRing();
        vibrate(VIBRATION_PATTERNS.ANSWER_TIME);
      } else if (phase === "round-result" || phase === "blitz-result") {
        vibrate(VIBRATION_PATTERNS.RESULT);
      }
      // Reset noIdeasSent when entering topic-suggest (fixes bug on game restart)
      if (phase === "topic-suggest") {
        setNoIdeasSent(false);
      }
      // Clear captain info when leaving captain phases
      if (!phase.includes("active") && !phase.includes("answer") && !phase.includes("pick")) {
        setCaptainInfo(null);
        setBlitzCaptainItem(null);
        setBlitzTaskList(null);
      }
    }
  }, [gameState?.phase]);

  const connectToRoom = useCallback(
    (playerName: string, role: "player" | "spectator" = "player") => {
      setStatus("connecting");
      setErrorMsg(null);
      setLocalRole(role);
      setReadySent(false);
      setNoIdeasSent(false);

      wasConnectedRef.current = false;
      localStorage.setItem("lastPlayerName", playerName);
      const hub = new Varhub(getBackendUrl());
      // Pass name and role as connection parameters so the host (Players class) registers us immediately
      const client = hub.join(roomId!, { integrity: "custom:loudquiz", params: [playerName, role] });
      clientRef.current = client;

      client.on("open", () => {
        sendMsg({ type: "join", name: playerName, role });
        reconnectAttemptsRef.current = 0;
        sessionStorage.setItem(
          sessionKey(roomId!),
          JSON.stringify({ name: playerName, role } satisfies PlayerSession),
        );
        void audioManager.requestWakeLock();
      });

      client.on("message", (...args: unknown[]) => {
        const data = args[0] as { type: string } | null;
        if (!data?.type) return;

        if (data.type === "syncState") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const state = (data as any).state as PublicGameState;
          const rawOffset = state.serverNow - Date.now();
          clockOffsetRef.current = clockOffsetRef.current * 0.9 + rawOffset * 0.1;
          wasConnectedRef.current = true; // Successfully reached the game
          setGameState(state);
          setStatus("connected");
        } else if (data.type === "captainInfo") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const info = (data as any).info as CaptainPrivateInfo;
          setCaptainInfo(info);
        } else if (data.type === "blitzCaptainInfo") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const item = (data as any).item as BlitzItem;
          setBlitzCaptainItem(item);
        } else if (data.type === "blitzTaskList") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tasks = (data as any).tasks as BlitzTaskPublic[];
          setBlitzTaskList(tasks);
        } else if (data.type === "pong") {
          // NTP offset refinement handled if needed
        } else if (data.type === "kicked") {
          // Forcibly disconnected — do not auto-reconnect
          shouldReconnectRef.current = false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reason = (data as any).reason as string;
          const isDuplicate = reason === "duplicate_session";
          setKickReason(isDuplicate ? "duplicate" : "host");
          setErrorMsg(
            isDuplicate
              ? "Вы вошли с другого устройства. Это подключение закрыто."
              : "Вас отключил ведущий.",
          );
          setStatus("error");
          void audioManager.releaseWakeLock();
        }
      });

      client.on("close", (_reason: unknown) => {
        void audioManager.releaseWakeLock();
        if (!shouldReconnectRef.current) return;
        if (!wasConnectedRef.current) {
          // Never received syncState — handled by promise.catch
          return;
        }
        // Was connected to the game — try to reconnect
        const attempt = reconnectAttemptsRef.current;
        reconnectAttemptsRef.current = attempt + 1;
        const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
        setStatus("connecting");
        setErrorMsg(null);
        reconnectTimerRef.current = setTimeout(() => {
          if (shouldReconnectRef.current) {
            connectToRoom(playerName, role);
          }
        }, delay);
      });

      client.promise.catch((_err: unknown) => {
        if (!shouldReconnectRef.current) return;
        shouldReconnectRef.current = false;
        const wasEverConnected = reconnectAttemptsRef.current > 0;
        const msg = wasEverConnected
          ? "Ведущий завершил игру или потерял соединение."
          : "Комната не найдена. Проверьте код комнаты.";
        setErrorMsg(msg);
        setStatus("error");
        void audioManager.releaseWakeLock();
      });
    },
    [roomId],
  );

  // Check sessionStorage for saved session and auto-connect
  useEffect(() => {
    const raw = sessionStorage.getItem(sessionKey(roomId!));
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as PlayerSession;
      if (session.name) {
        setName(session.name);
        connectToRoom(session.name, session.role);
      }
    } catch {
      sessionStorage.removeItem(sessionKey(roomId!));
    }
  }, [roomId, connectToRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
      }
      clientRef.current?.close();
      void audioManager.releaseWakeLock();
      audioManager.stopMusic(0);
    };
  }, []);

  // Auto-join team in 1-team mode
  useEffect(() => {
    if (!gameState || gameState.phase !== "lobby") return;
    if (gameState.settings?.teamCount !== 1) return;
    const myPlayer = gameState.players.find((p) => p.name === name && p.role === localRole);
    if (!myPlayer || myPlayer.teamId !== null) return;
    sendMsg({ type: "setTeam", teamId: "red" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.phase, gameState?.players.length]);

  // Auto-start/stop music based on game phase
  useEffect(() => {
    if (!gameState) return;
    const { phase } = gameState;
    // Phases where music plays (round-ready is the trigger: headphones on, game starting)
    const musicOnPhases = [
      "round-ready", "round-active",
      "blitz-ready", "blitz-active",
    ];
    // Phases where music stops (no music during selection or review)
    const musicOffPhases = [
      "lobby", "calibration",
      "round-captain", "round-pick",
      "round-answer", "round-review", "round-result",
      "blitz-captain", "blitz-pick",
      "blitz-answer", "blitz-result",
      "topic-suggest", "question-setup", "finale",
    ];
    if (musicOnPhases.includes(phase)) {
      void audioManager.startMusic().then(() => {
        if (audioManager.isMusicPlaying()) setMusicPlaying(true);
      });
    } else if (musicOffPhases.includes(phase)) {
      const instant = phase === "lobby" || phase === "calibration" || phase === "round-captain" || phase === "round-pick";
      audioManager.stopMusic(instant ? 0 : 3);
      setMusicPlaying(false);
    }
  }, [gameState?.phase]);

  // Timer progress bar for topic-suggest
  useEffect(() => {
    if (!gameState || gameState.phase !== "topic-suggest") return;
    const endsAt = gameState.topicSuggestEndsAt;
    if (!endsAt) return;

    const interval = setInterval(() => {
      const offset = clockOffsetRef.current;
      const now = Date.now() + offset;
      const remaining = endsAt - now;
      const pct = Math.max(0, (remaining / 60_000) * 100);
      setProgressPct(pct);
      if (remaining <= 0) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [gameState?.phase, gameState?.topicSuggestEndsAt]);

  function handleJoin() {
    const trimmed = name.trim();
    if (!trimmed) return;
    connectToRoom(trimmed, "player");
  }

  function handleRetry() {
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    wasConnectedRef.current = false;
    setKickReason(null);
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setStatus("form");
    setErrorMsg(null);
    setGameState(null);
    setReadySent(false);
    setNoIdeasSent(false);
    setCaptainInfo(null);
    setBlitzCaptainItem(null);
    setBlitzTaskList(null);
    sessionStorage.removeItem(sessionKey(roomId!));
    clientRef.current?.close();
    clientRef.current = null;
    void audioManager.stopMusic(0);
    setMusicPlaying(false);
  }

  function handleToggleMusic() {
    if (musicTogglingRef.current) return;
    musicTogglingRef.current = true;
    if (musicPlaying) {
      audioManager.stopMusic(1);
      setMusicPlaying(false);
      musicTogglingRef.current = false;
    } else {
      void audioManager.startMusic().then(() => {
        setMusicPlaying(audioManager.isMusicPlaying());
        musicTogglingRef.current = false;
      });
    }
  }

  function handleReady() {
    sendMsg({ type: "ready" });
    setReadySent(true);
  }

  function handleSuggest() {
    const text = suggestText.trim();
    if (!text) return;
    sendMsg({ type: "suggest", text });
    setSuggestText("");
  }

  function handleNoIdeas() {
    sendMsg({ type: "noIdeas" });
    setNoIdeasSent(true);
  }

  function handleSubmitAnswer() {
    const answer = answerInput.trim();
    if (!answer) return;
    sendMsg({ type: "submitAnswer", answer });
    setAnswerSent(true);
  }

  function handleBlitzSubmitAnswer() {
    const answer = blitzAnswerInput.trim();
    if (!answer) return;
    sendMsg({ type: "blitzSubmitAnswer", answer });
    setBlitzAnswerSent(true);
  }

  function handleSurrender() {
    sendMsg({ type: "surrender" });
    setBlitzAnswerSent(true);
  }

  // ── Connecting ─────────────────────────────────────────────────────────────
  if (status === "connecting") {
    return (
      <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 dark:text-slate-300">Подключение к комнате {roomId}...</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-center space-y-3">
          <div className="text-5xl">{kickReason ? "🚫" : "❌"}</div>
          <h2 className="text-xl font-semibold">
            {kickReason === "host"
              ? "Вы отключены"
              : kickReason === "duplicate"
                ? "Другое устройство"
                : "Не удалось подключиться"}
          </h2>
          {errorMsg && <p className="text-red-500 dark:text-red-400 text-sm max-w-xs">{errorMsg}</p>}
        </div>
        <div className="flex gap-3">
          {/* Host kick: no retry. Duplicate session: allow re-entry. No kick: allow retry. */}
          {kickReason !== "host" && (
            <button
              onClick={handleRetry}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
            >
              {kickReason === "duplicate" ? "Повторить вход" : "Попробовать снова"}
            </button>
          )}
          <Link
            to="/"
            className="px-5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg shadow-sm transition-all"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  if (status === "connected" && gameState) {
    const { phase } = gameState;
    const savedSession = (() => {
      try {
        return JSON.parse(
          sessionStorage.getItem(sessionKey(roomId!)) ?? "null",
        ) as PlayerSession | null;
      } catch {
        return null;
      }
    })();
    const myName = savedSession?.name ?? name;
    const ownPlayer = gameState.players.find(
      (p) => p.name === myName && p.role === localRole,
    );
    const myId = ownPlayer?.id;
    const isSpectator = localRole === "spectator";
    const isCaptain = myId !== undefined && gameState.captainId === myId;
    const isActiveTeam = ownPlayer?.teamId === gameState.activeTeamId;
    const clockOffset = clockOffsetRef.current;

    // ── LOBBY ────────────────────────────────────────────────────────────────
    if (phase === "lobby") {
      const isOneTeam = gameState.settings?.teamCount === 1;
      const redPlayers = gameState.players.filter((p) => p.teamId === "red");
      const bluePlayers = gameState.players.filter((p) => p.teamId === "blue");
      const unassigned = gameState.players.filter(
        (p) => p.teamId === null && p.role === "player",
      );
      const spectators = gameState.players.filter((p) => p.role === "spectator");
      const allPlayers = [...redPlayers, ...bluePlayers];

      // Start game button logic
      const hasUnassigned = unassigned.length > 0;
      const teamImbalanced =
        !isOneTeam && Math.abs(redPlayers.length - bluePlayers.length) > 1;
      const noPlayers = allPlayers.length === 0;
      const canStart = !noPlayers && !hasUnassigned && !teamImbalanced;
      const startDisabledReason = noPlayers
        ? "Нет игроков"
        : hasUnassigned
          ? "Есть игроки без команды"
          : teamImbalanced
            ? "Команды несбалансированы"
            : null;

      const myTeamColor = ownPlayer?.teamId === "red" ? "text-red-500 dark:text-red-400" : ownPlayer?.teamId === "blue" ? "text-blue-500 dark:text-blue-400" : "text-white";
      const isRedActive = ownPlayer?.teamId === "red";
      const isBlueActive = ownPlayer?.teamId === "blue";

      return (
        <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col px-4 py-6 max-w-md mx-auto gap-5 pb-24 relative">
          <div className="text-center">
            <h1 className="text-2xl font-bold">LoudQuiz</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Комната{" "}
              <span className="font-mono font-bold text-indigo-600 dark:text-blue-300">{roomId}</span>
            </p>
          </div>

          {/* Player name + large avatar */}
          <div className="flex flex-col items-center gap-3">
            <p className={`text-lg font-semibold ${isOneTeam ? "text-slate-900 dark:text-white" : myTeamColor}`}>{myName}</p>
            <PlayerAvatar
              name={myName || "?"}
              emoji={ownPlayer?.emoji}
              teamId={isOneTeam ? undefined : ownPlayer?.teamId}
              size="xl"
              onClick={() => sendMsg({ type: "changeEmoji" })}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">Нажмите, чтобы сменить иконку</p>
          </div>

          {/* Team selection */}
          {!isSpectator && !isOneTeam && (
            <div className="space-y-3">
              {!ownPlayer?.teamId && (
                <p className="text-center text-sm text-amber-600 dark:text-yellow-400">Выберите команду</p>
              )}
              <div className="flex gap-3 items-stretch">
                <button
                  onClick={() => sendMsg({ type: "setTeam", teamId: "red" })}
                  className={`py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-all duration-300 ${isRedActive ? "flex-[2] shadow-lg shadow-red-500/30" : "flex-1"}`}
                >
                  Красные
                </button>
                <button
                  onClick={() => sendMsg({ type: "setTeam", teamId: "blue" })}
                  className={`py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-all duration-300 ${isBlueActive ? "flex-[2] shadow-lg shadow-blue-500/30" : "flex-1"}`}
                >
                  Синие
                </button>
              </div>
              <button
                onClick={() => sendMsg({ type: "setTeam", teamId: null })}
                className="w-full py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 shadow-sm transition-all"
              >
                Я только посмотрю
              </button>
            </div>
          )}

          {!isSpectator && isOneTeam && ownPlayer?.teamId && (
            <p className="text-center text-sm text-emerald-600 dark:text-green-400">Вы в игре!</p>
          )}

          {isSpectator && (
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm">Режим зрителя</p>
          )}

          {/* Player lists — 2 columns */}
          <div className="space-y-3 text-sm">
            {isOneTeam ? (
              allPlayers.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Игроки ({allPlayers.length})</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {allPlayers.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/60 rounded-lg px-2 py-1.5">
                        <PlayerAvatar name={p.name} emoji={p.emoji} teamId={null} size="sm" />
                        <span className="truncate text-slate-800 dark:text-slate-200">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-red-500 dark:text-red-400 font-semibold mb-1.5">Красные ({redPlayers.length})</p>
                  <div className="space-y-1.5">
                    {redPlayers.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg px-2 py-1.5">
                        <PlayerAvatar name={p.name} emoji={p.emoji} teamId="red" size="sm" />
                        <span className="truncate text-red-700 dark:text-red-300">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-blue-500 dark:text-blue-400 font-semibold mb-1.5">Синие ({bluePlayers.length})</p>
                  <div className="space-y-1.5">
                    {bluePlayers.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1.5">
                        <PlayerAvatar name={p.name} emoji={p.emoji} teamId="blue" size="sm" />
                        <span className="truncate text-blue-700 dark:text-blue-300">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {!isOneTeam && unassigned.length > 0 && (
              <div>
                <p className="text-amber-600 dark:text-yellow-400 font-semibold mb-1.5">Не выбрали команду ({unassigned.length})</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {unassigned.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-amber-50 dark:bg-yellow-900/10 rounded-lg px-2 py-1.5">
                      <PlayerAvatar name={p.name} emoji={p.emoji} size="sm" />
                      <span className="truncate text-slate-500 dark:text-slate-400">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {spectators.length > 0 && (
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-semibold mb-1.5">Зрители ({spectators.length})</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {spectators.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-800/40 rounded-lg px-2 py-1.5">
                      <PlayerAvatar name={p.name} emoji={p.emoji} size="sm" />
                      <span className="truncate text-slate-400 dark:text-slate-500">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Start game — pinned to bottom */}
          {!isSpectator ? (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700">
              <div className="max-w-md mx-auto space-y-1">
                <button
                  onClick={() => sendMsg({ type: "startGame" })}
                  disabled={!canStart}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-200 disabled:border disabled:border-slate-300 dark:disabled:bg-slate-700 dark:disabled:border-slate-600 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-all"
                >
                  Начать игру
                </button>
                {startDisabledReason && (
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500">{startDisabledReason}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400 dark:text-slate-600 text-sm">Ожидание начала игры...</p>
          )}
        </div>
      );
    }

    // ── CALIBRATION ──────────────────────────────────────────────────────────
    if (phase === "calibration") {
      if (isSpectator) {
        const readyCount = gameState.players.filter((p) => p.isReady).length;
        const totalPlayers = gameState.players.filter((p) => p.role === "player").length;
        return (
          <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4">
            <div className="text-6xl">🎧</div>
            <h2 className="text-2xl font-bold">Калибровка</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Готовы: {readyCount} / {totalPlayers}
            </p>
          </div>
        );
      }

      const isReady = ownPlayer?.isReady ?? readySent;

      return (
        <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto">
          <div className="text-6xl">🎧</div>
          <h2 className="text-2xl font-bold text-center">Проверка наушников</h2>

          <div className="w-full space-y-3">
            <button
              onClick={handleToggleMusic}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                musicPlaying
                  ? "bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 shadow-sm"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25"
              }`}
            >
              {musicPlaying ? "Выключить музыку" : "Включить музыку"}
            </button>

            <div className="flex items-center gap-3 px-1">
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

            <button
              onClick={() => void audioManager.playRing()}
              className="w-full py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold shadow-sm transition-all"
            >
              Проиграть сигнал
            </button>

            <div className="flex items-center gap-3 px-1">
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

            <button
              onClick={() => vibrate(VIBRATION_PATTERNS.ring)}
              className="w-full py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold shadow-sm transition-all"
            >
              Проверить вибрацию
            </button>

            <button
              onClick={handleReady}
              disabled={isReady}
              className={`w-full py-3 rounded-lg font-semibold text-lg transition-all ${
                isReady
                  ? "bg-green-800 cursor-not-allowed text-green-300"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {isReady ? "✓ Я готов" : "Я готов"}
            </button>
          </div>

          <div className="w-full text-sm">
            {(() => {
              const calPlayers = gameState.players.filter((p) => p.role === "player");
              const hasTeams = gameState.settings?.teamCount === 2;
              const col1 = hasTeams ? calPlayers.filter((p) => p.teamId === "red") : calPlayers.filter((_, i) => i % 2 === 0);
              const col2 = hasTeams ? calPlayers.filter((p) => p.teamId === "blue") : calPlayers.filter((_, i) => i % 2 === 1);
              const renderP = (p: typeof calPlayers[0]) => (
                <div key={p.id} className="flex items-center gap-1.5 py-1">
                  <PlayerAvatar name={p.name} emoji={p.emoji} teamId={p.teamId} size="sm" isReady={p.isReady} />
                  <span className={`truncate ${
                    p.teamId === "red" ? "text-red-600 dark:text-red-400"
                    : p.teamId === "blue" ? "text-blue-600 dark:text-blue-400"
                    : p.isReady ? "text-emerald-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"
                  }`}>{p.name}</span>
                  <span className="ml-auto">{p.isReady ? "✅" : "⭕"}</span>
                </div>
              );
              return (
                <div className="grid grid-cols-2 gap-x-3">
                  <div>{col1.map(renderP)}</div>
                  <div>{col2.map(renderP)}</div>
                </div>
              );
            })()}
          </div>
        </div>
      );
    }

    // ── TOPIC-SUGGEST ────────────────────────────────────────────────────────
    if (phase === "topic-suggest") {
      const suggestions = gameState.suggestions ?? [];
      const selectedTopics = gameState.selectedTopics;
      const isGenerating = gameState.isGeneratingQuestions ?? false;
      const questionsReady = gameState.questionsReady ?? false;
      const questionTable = gameState.publicQuestionTable ?? [];
      const mySuggestionsCount = suggestions.filter((s) => s.playerName === myName).length;
      const canSuggestMore = mySuggestionsCount < 3 && !isGenerating && !questionsReady;

      // After questions generated: show table + "Далее" button for everyone
      if (questionsReady) {
        return (
          <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col px-4 py-6 max-w-md mx-auto gap-5">
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-xl font-bold">Вопросы готовы!</h2>
            </div>
            {questionTable.length > 0 && (
              <QuestionTable questionTable={questionTable} compact />
            )}
            {!isSpectator && (
              <button
                onClick={() => sendMsg({ type: "proceed" })}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-lg transition-all"
              >
                Далее →
              </button>
            )}
          </div>
        );
      }

      if (isSpectator) {
        return (
          <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col px-4 py-6 max-w-md mx-auto gap-4">
            <h2 className="text-xl font-bold">Предложение тем</h2>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Предложений: {suggestions.length}</p>
            {isGenerating && (
              <div className="flex items-center gap-3 text-amber-600 dark:text-yellow-400">
                <div className="w-4 h-4 border-2 border-amber-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Генерирую вопросы...</span>
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col px-4 py-6 max-w-md mx-auto gap-5">
          <h2 className="text-xl font-bold">Предложите темы</h2>

          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
            <div
              className="bg-indigo-500 h-3 rounded-full transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">Предложений: {mySuggestionsCount} / 3</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={suggestText}
                onChange={(e) => setSuggestText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSuggestMore && handleSuggest()}
                placeholder="Тема..."
                maxLength={100}
                disabled={!canSuggestMore}
                className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleSuggest}
                disabled={!canSuggestMore || !suggestText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all"
              >
                Предложить
              </button>
            </div>
          </div>

          {mySuggestionsCount > 0 && (
            <div className="text-sm space-y-1">
              <p className="text-slate-500 dark:text-slate-400">Ваши предложения:</p>
              {suggestions
                .filter((s) => s.playerName === myName)
                .map((s, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded px-3 py-1 text-slate-600 dark:text-slate-300">
                    {s.text}
                  </div>
                ))}
            </div>
          )}

          <button
            onClick={handleNoIdeas}
            disabled={noIdeasSent}
            className="w-full py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-slate-600 dark:text-slate-300 shadow-sm transition-all"
          >
            {noIdeasSent ? "Отмечено: нет идей" : "Больше нет идей"}
          </button>

          {selectedTopics && selectedTopics.length > 0 && (
            <div className="space-y-1">
              <p className="text-emerald-600 dark:text-green-400 font-semibold text-sm">Выбранные темы:</p>
              {selectedTopics.map((t, i) => (
                <div key={i} className="bg-emerald-50 dark:bg-green-900/20 rounded px-3 py-1 text-sm text-emerald-700 dark:text-green-300">
                  {t.name}
                </div>
              ))}
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center gap-3 text-amber-600 dark:text-yellow-400">
              <div className="w-5 h-5 border-2 border-amber-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span>Генерирую вопросы...</span>
            </div>
          )}
        </div>
      );
    }

    // ── QUESTION-SETUP ───────────────────────────────────────────────────────
    if (phase === "question-setup") {
      return (
        <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-300 text-lg">Ведущий загружает вопросы...</p>
        </div>
      );
    }

    // ── ROUND-CAPTAIN ────────────────────────────────────────────────────────
    if (phase === "round-captain") {
      const captainId = gameState.captainId;
      const captain = gameState.players.find((p) => p.id === captainId);
      const canBecomeCaptain =
        isActiveTeam && !isSpectator && !captainId && !(ownPlayer?.wasRecentCaptain);

      return (
        <div key="round-captain" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">Выбор капитана</h2>
            {gameState.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>

          {captain ? (
            <div className="text-center">
              <p className="text-amber-600 dark:text-yellow-400 text-xl font-bold">{captain.name}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">стал капитаном</p>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center">
              Кто хочет быть капитаном этого раунда?
            </p>
          )}

          {isActiveTeam && !isSpectator && !captain && (
            <button
              onClick={() => sendMsg({ type: "becomeCapitain" })}
              disabled={!canBecomeCaptain}
              className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${
                canBecomeCaptain
                  ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700 cursor-not-allowed text-slate-400 dark:text-slate-500"
              }`}
            >
              {ownPlayer?.wasRecentCaptain ? "Я был капитаном" : "Буду капитаном!"}
            </button>
          )}

          {!isActiveTeam && !isSpectator && (
            <p className="text-slate-400 dark:text-slate-600 text-sm text-center">Ход другой команды</p>
          )}

          <div className="w-full text-sm">
            {gameState.players
              .filter((p) => p.teamId === gameState.activeTeamId && p.role === "player")
              .map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400">
                  <span>{p.id === captainId ? "👑" : "  "}</span>
                  <span className={p.id === captainId ? "text-amber-600 dark:text-yellow-400 font-bold" : ""}>
                    {p.name}
                  </span>
                  {p.wasRecentCaptain && (
                    <span className="text-slate-400 dark:text-slate-600 text-xs">(прошлый)</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      );
    }

    // ── ROUND-READY ──────────────────────────────────────────────────────────
    if (phase === "round-ready") {
      const isReady = ownPlayer?.isReady ?? readySent;
      const captainId = gameState.captainId;
      const captain = gameState.players.find((p) => p.id === captainId);

      if (!isActiveTeam || isSpectator) {
        return (
          <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4">
            <div className="text-5xl">🎧</div>
            <h2 className="text-xl font-bold text-center">Другая команда готовится</h2>
            {gameState.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>
        );
      }

      return (
        <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto">
          <div className="text-6xl">🎧</div>
          <h2 className="text-2xl font-bold text-center">Надевайте наушники!</h2>
          {captain && (
            <p className="text-amber-600 dark:text-yellow-400 text-sm">
              {isCaptain ? "Вы капитан!" : `Капитан: ${captain.name}`}
            </p>
          )}

          <button
            onClick={handleReady}
            disabled={isReady}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
              isReady
                ? "bg-green-800 cursor-not-allowed text-green-300"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {isReady ? "✓ Готов" : "Я готов!"}
          </button>

          <div className="w-full text-sm space-y-1">
            {gameState.players
              .filter((p) => p.teamId === gameState.activeTeamId && p.role === "player")
              .map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span>{p.isReady ? "✅" : "⭕"}</span>
                  <span className={p.isReady ? "text-emerald-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}>
                    {p.name}
                    {p.id === gameState.captainId && (
                      <span className="text-yellow-600 text-xs ml-1">(капитан)</span>
                    )}
                  </span>
                </div>
              ))}
          </div>
        </div>
      );
    }

    // ── ROUND-PICK ───────────────────────────────────────────────────────────
    if (phase === "round-pick") {
      const questionTable = gameState.publicQuestionTable ?? [];
      const jokerUsed = gameState.jokerUsed;
      const jokerActive = gameState.jokerActivatedThisRound;
      const activeTeam = gameState.activeTeamId ?? "";
      const teamJokerUsed = jokerUsed[activeTeam];
      const teamJokerActive = jokerActive[activeTeam];
      const captainName = gameState.players.find((p) => p.id === gameState.captainId)?.name;

      if (!isActiveTeam || isSpectator) {
        return (
          <div key="round-pick-other" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 animate-fade-in">
            <div className="text-6xl">🎧</div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Другая команда выбирает вопрос</h2>
              {gameState.activeTeamId && (
                <div className="mt-2">
                  <TeamBadge teamId={gameState.activeTeamId} />
                </div>
              )}
            </div>
            <QuestionTable
            questionTable={questionTable}
            questionHistory={gameState.questionHistory}
            compact
          />
          </div>
        );
      }

      // All active team members see the same table; captain can pick
      return (
        <div key="round-pick-active" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col px-4 py-6 max-w-lg mx-auto gap-4 animate-fade-in">
          <div className="text-center">
            {isCaptain ? (
              <>
                <h2 className="text-2xl font-bold">Выберите вопрос</h2>
                <p className="text-amber-600 dark:text-yellow-400 font-semibold text-sm">Вы капитан! 🎧</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">Выбор вопроса</h2>
                {captainName && (
                  <p className="text-amber-600 dark:text-yellow-400 text-sm mt-1">Капитан: {captainName}</p>
                )}
              </>
            )}
          </div>

          {!isCaptain && teamJokerActive && (
            <div className="bg-amber-50 dark:bg-yellow-900/30 border border-amber-200 dark:border-yellow-700/50 rounded-lg p-2 text-center">
              <p className="text-amber-600 dark:text-yellow-400 font-bold text-sm">Джокер активирован!</p>
            </div>
          )}

          <QuestionTable
            questionTable={questionTable}
            questionHistory={gameState.questionHistory}
            onPick={
              isCaptain
                ? (topicIdx, questionIdx) =>
                    sendMsg({ type: "pickQuestion", topicIdx, questionIdx })
                : null
            }
            compact
          />

          {/* Joker card — below table */}
          {isCaptain && (
            <div className="flex justify-center">
              {!teamJokerUsed && !teamJokerActive && (
                <button
                  onClick={() => sendMsg({ type: "activateJoker" })}
                  className="flex items-center gap-3 px-6 py-3 bg-amber-50 dark:bg-yellow-900/20 border-2 border-amber-300 dark:border-yellow-600/50 rounded-xl hover:shadow-neon-amber transition-all"
                >
                  <span className="text-2xl">🃏</span>
                  <span className="font-bold text-amber-700 dark:text-yellow-300">бонус ×2</span>
                </button>
              )}
              {teamJokerActive && (
                <div className="flex items-center gap-3 px-6 py-3 bg-amber-100 dark:bg-yellow-900/40 border-2 border-amber-400 dark:border-yellow-500/60 rounded-xl animate-glow-pulse">
                  <span className="text-2xl">🃏</span>
                  <span className="font-bold text-amber-700 dark:text-yellow-300">Джокер активирован!</span>
                </div>
              )}
              {teamJokerUsed && !teamJokerActive && (
                <div className="flex items-center gap-3 px-6 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl opacity-50">
                  <span className="text-2xl grayscale">🃏</span>
                  <span className="font-medium text-slate-400 dark:text-slate-500">Джокер использован</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ── ROUND-ACTIVE ─────────────────────────────────────────────────────────
    if (phase === "round-active") {
      const currentRound = gameState.currentRound;
      const hasAnswered = ownPlayer?.hasAnswered ?? answerSent;

      if (isCaptain) {
        // Captain sees the question + can submit answer
        return (
          <div key="round-active-captain" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
            <div className="text-center">
              <p className="text-amber-600 dark:text-yellow-400 font-bold mb-1">Вы капитан!</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Объясняйте жестами, не говорите слов</p>
            </div>
            {currentRound && (
              <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
                {currentRound.topicName} · {currentRound.difficulty} очков
              </div>
            )}
            {captainInfo ? (
              <div className="relative bg-slate-900 dark:bg-slate-950 border-2 border-dashed border-slate-600 dark:border-slate-500 rounded-xl p-6 text-center overflow-hidden">
                {/* Scan-line overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.04]"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
                  }}
                />
                {/* СЕКРЕТНО stamp */}
                <div className="absolute top-3 right-3 -rotate-12 pointer-events-none">
                  <span className="text-red-500/50 font-black text-xs uppercase tracking-widest border-2 border-red-500/50 px-2 py-0.5 rounded">
                    СЕКРЕТНО
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-2 font-mono">Ваш вопрос / слово:</p>
                <p className="text-2xl font-bold text-white font-mono relative z-10">{captainInfo.questionText}</p>
              </div>
            ) : (
              <div className="text-slate-400 dark:text-slate-500 text-sm">Загружаем вопрос...</div>
            )}
            <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />
            {!hasAnswered ? (
              <div className="w-full space-y-2">
                <input
                  type="text"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !hasAnswered && handleSubmitAnswer()}
                  placeholder="Ваш ответ..."
                  maxLength={100}
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!answerInput.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all"
                >
                  Ответить
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/50 rounded-lg p-4 text-center w-full">
                <p className="text-emerald-600 dark:text-green-400 font-bold">Ответ отправлен!</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{answerInput}</p>
              </div>
            )}
          </div>
        );
      }

      if (!isActiveTeam || isSpectator) {
        const questionReveal = gameState.questionRevealText;
        return (
          <div key="round-active-other" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 animate-fade-in">
            <h2 className="text-xl font-bold text-center">Другая команда играет</h2>
            {questionReveal && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center max-w-sm w-full">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Вопрос:</p>
                <p className="text-slate-900 dark:text-white font-semibold">{questionReveal}</p>
              </div>
            )}
            <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />
          </div>
        );
      }

      // Active team non-captain player
      return (
        <div key="round-active-player" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
          <div className="text-6xl">🎧</div>
          <h2 className="text-xl font-bold text-center">Следите за капитаном!</h2>
          {currentRound && (
            <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
              {currentRound.topicName} · {currentRound.difficulty} очков
            </div>
          )}
          <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />

          {!hasAnswered ? (
            <div className="w-full space-y-2">
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !hasAnswered && handleSubmitAnswer()}
                placeholder="Ваш ответ..."
                maxLength={100}
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!answerInput.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all"
              >
                Ответить
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/50 rounded-lg p-4 text-center">
              <p className="text-emerald-600 dark:text-green-400 font-bold">Ответ отправлен!</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{answerInput}</p>
            </div>
          )}
        </div>
      );
    }

    // ── ROUND-ANSWER ─────────────────────────────────────────────────────────
    if (phase === "round-answer") {
      const hasAnswered = ownPlayer?.hasAnswered ?? answerSent;
      const questionReveal = gameState.questionRevealText;

      // Non-active team or spectator: show question reveal only
      if (!isActiveTeam || isSpectator) {
        return (
          <div key="round-answer-other" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
            <h2 className="text-xl font-bold text-center">Время отвечать!</h2>
            {questionReveal && (
              <div className="bg-indigo-50 dark:bg-blue-900/30 border border-indigo-200 dark:border-blue-700/50 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Вопрос:</p>
                <p className="text-slate-900 dark:text-white font-semibold">{questionReveal}</p>
              </div>
            )}
            <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />
          </div>
        );
      }

      // Active team players (including captain) answer
      return (
        <div key="round-answer-active" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
          <h2 className="text-2xl font-bold text-center">
            {isCaptain ? "Ваш ответ!" : "Ваш ответ!"}
          </h2>
          {questionReveal && (
            <div className="bg-indigo-50 dark:bg-blue-900/30 border border-indigo-200 dark:border-blue-700/50 rounded-lg p-4 text-center w-full">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Вопрос:</p>
              <p className="text-slate-900 dark:text-white font-semibold">{questionReveal}</p>
            </div>
          )}
          <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />

          {!hasAnswered ? (
            <div className="w-full space-y-2">
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !hasAnswered && handleSubmitAnswer()}
                placeholder="Ваш ответ..."
                maxLength={100}
                autoFocus
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!answerInput.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all"
              >
                Ответить
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/50 rounded-lg p-4 text-center w-full">
              <p className="text-emerald-600 dark:text-green-400 font-bold">Ответ отправлен!</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{answerInput}</p>
            </div>
          )}
        </div>
      );
    }

    // ── ROUND-REVIEW ─────────────────────────────────────────────────────────
    if (phase === "round-review") {
      const isAutoReviewing = gameState.isAutoReviewing ?? false;
      return (
        <div key="round-review" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 animate-fade-in">
          {isAutoReviewing ? (
            <>
              <div className="w-8 h-8 border-3 border-amber-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-amber-600 dark:text-yellow-400 font-semibold">ИИ проверяет ответы...</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-600 dark:text-slate-300 text-lg text-center">Ведущий проверяет ответы...</p>
            </>
          )}
        </div>
      );
    }

    // ── ROUND-RESULT ─────────────────────────────────────────────────────────
    if (phase === "round-result") {
      const result = gameState.roundResult;
      const scores = gameState.scores;

      return (
        <div key="round-result" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col px-4 py-6 pb-24 max-w-md mx-auto gap-5 animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Результат раунда</h2>
            {gameState.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>

          {result && (
            <>
              {/* Secret card with correct answer */}
              <div className="relative bg-slate-800 dark:bg-slate-900 rounded-xl p-5 border-2 border-dashed border-slate-600 dark:border-slate-500 overflow-hidden">
                <div className="absolute top-2 right-2 text-[10px] font-bold text-red-500 dark:text-red-400 tracking-widest uppercase opacity-80">СЕКРЕТНО</div>
                <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 4px)" }} />
                <p className="text-white font-semibold text-center relative z-10">{result.questionText}</p>
              </div>

              {/* Answer stickers */}
              <div className="space-y-4">
                {result.groups.map((g, i) => {
                  const player = gameState.players.find((p) => p.id === g.playerIds[0]);
                  const playerName = player?.name ?? g.playerIds[0];
                  const playerEmoji = player?.emoji;
                  const teamId = player?.teamId ?? gameState.activeTeamId ?? undefined;
                  const rotation = ((i % 3) - 1) * 2;
                  const stickerColor = teamId === "red" ? "red" : teamId === "blue" ? "blue" : "yellow";

                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.3, duration: 0.4 }}
                    >
                      <StickerWithAvatar
                        playerName={playerName}
                        playerEmoji={playerEmoji}
                        teamId={teamId}
                        color={stickerColor as "red" | "blue" | "yellow"}
                        rotation={rotation}
                      >
                        <p className="font-medium text-slate-800 text-sm">{g.canonicalAnswer || "—"}</p>
                        {g.note && (
                          <p className="text-xs text-slate-500 font-handwritten mt-1">{g.note}</p>
                        )}
                        {g.playerIds.length > 1 && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            +{g.playerIds.length - 1} {g.playerIds.length - 1 === 1 ? "игрок" : "игрока"}
                          </p>
                        )}
                        <Stamp
                          text={g.accepted ? `+${result.score}` : pickStampText("incorrect")}
                          variant={g.accepted ? "correct" : "incorrect"}
                          animate
                          delay={i * 0.3 + 0.5}
                          size="sm"
                        />
                      </StickerWithAvatar>
                    </motion.div>
                  );
                })}
              </div>

              {/* Score */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Очки за раунд:</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-yellow-400 animate-pop-in">
                  +{result.score}
                  {result.jokerApplied && (
                    <span className="text-base text-amber-700 dark:text-yellow-300 ml-2">Джокер x2</span>
                  )}
                </p>
              </div>

              {result.commentary && (
                <div className="bg-indigo-50 dark:bg-blue-900/20 border border-indigo-200 dark:border-blue-700/30 rounded-lg p-3 text-sm text-indigo-700 dark:text-blue-300 font-handwritten">
                  {result.commentary}
                </div>
              )}
            </>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
            <div className="flex justify-around">
              {Object.entries(scores).map(([teamId, score]) => (
                <div key={teamId} className="text-center">
                  <p className={`font-bold text-lg ${teamId === "red" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"}`}>
                    {score}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">
                    {teamId === "red" ? "Красные" : "Синие"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed bottom button */}
          <div className="fixed bottom-0 inset-x-0 p-4 bg-surface/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => sendMsg({ type: "nextRound" })}
              className="w-full max-w-md mx-auto block py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-lg transition-all"
            >
              Следующий раунд
            </button>
          </div>
        </div>
      );
    }

    // ── BLITZ-CAPTAIN ────────────────────────────────────────────────────────
    if (phase === "blitz-captain") {
      const captainId = gameState.captainId;
      const captain = gameState.players.find((p) => p.id === captainId);
      const canBecomeCaptain =
        isActiveTeam && !isSpectator && !captainId && !(ownPlayer?.wasRecentCaptain);
      const teamPlayersForBlitz = gameState.players.filter(
        (p) => p.teamId === gameState.activeTeamId && p.role === "player" && p.id !== captainId,
      );
      const maxPosition = teamPlayersForBlitz.length;
      const myBlitzOrder = ownPlayer?.blitzOrder;
      const takenPositions = teamPlayersForBlitz
        .filter((p) => (p.blitzOrder ?? 0) > 0)
        .map((p) => p.blitzOrder!);

      if (!isActiveTeam || isSpectator) {
        return (
          <div key="blitz-captain-other" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 animate-fade-in">
            <div className="text-6xl">🎧</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Блиц!</h2>
              {gameState.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center">Команда выбирает капитана и порядок</p>
          </div>
        );
      }

      // Phase 1: no captain yet — show become-captain button
      if (!captain) {
        return (
          <div key="blitz-captain-pick" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Блиц!</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-1">Выбор капитана</p>
              {gameState.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-center">Кто будет капитаном в блице?</p>
            <button
              onClick={() => sendMsg({ type: "blitzBecomeCapitain" })}
              disabled={!canBecomeCaptain}
              className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${
                canBecomeCaptain
                  ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700 cursor-not-allowed text-slate-400 dark:text-slate-500"
              }`}
            >
              {ownPlayer?.wasRecentCaptain ? "Я был капитаном" : "Буду капитаном!"}
            </button>
          </div>
        );
      }

      // Phase 2: captain chosen — captain waits, others pick blitz order
      if (isCaptain) {
        return (
          <div key="blitz-captain-active" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 max-w-sm mx-auto animate-fade-in">
            <p className="text-amber-600 dark:text-yellow-400 text-xl font-bold">Вы капитан блица!</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center">Ждём, пока команда выберет порядок</p>
            <div className="w-full space-y-1 text-sm">
              {teamPlayersForBlitz.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400">
                  <span className="w-5 text-center text-xs">
                    {(p.blitzOrder ?? 0) > 0 ? `${p.blitzOrder}.` : "?"}
                  </span>
                  <span className={(p.blitzOrder ?? 0) > 0 ? "text-emerald-600 dark:text-green-400" : ""}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // Non-captain active team: pick blitz order
      return (
        <div key="blitz-captain-order" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-5 px-4 max-w-sm mx-auto animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Блиц — ваша очередь</h2>
            <p className="text-amber-600 dark:text-yellow-400 text-sm">Капитан: {captain.name}</p>
          </div>

          {(myBlitzOrder ?? 0) > 0 ? (
            <div className="bg-emerald-50 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/50 rounded-lg p-4 text-center">
              <p className="text-emerald-600 dark:text-green-400 font-bold">Вы выбрали позицию {myBlitzOrder}</p>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center">Выберите свою позицию в очереди ответов:</p>
          )}

          <div className="grid grid-cols-3 gap-2 w-full">
            {Array.from({ length: maxPosition }, (_, i) => i + 1).map((pos) => {
              const isTaken = takenPositions.includes(pos) && myBlitzOrder !== pos;
              const isMyPos = myBlitzOrder === pos;
              return (
                <button
                  key={pos}
                  onClick={() => sendMsg({ type: "blitzSetOrder", position: pos })}
                  disabled={isTaken}
                  className={`py-3 rounded-lg font-bold transition-all ${
                    isMyPos
                      ? "bg-emerald-600 text-white"
                      : isTaken
                        ? "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                        : "bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 shadow-sm"
                  }`}
                >
                  {pos}
                </button>
              );
            })}
          </div>

          <div className="w-full text-sm space-y-1">
            {teamPlayersForBlitz.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400">
                <span className="w-5 text-center text-xs">
                  {(p.blitzOrder ?? 0) > 0 ? `${p.blitzOrder}.` : "?"}
                </span>
                <span className={(p.blitzOrder ?? 0) > 0 ? "text-emerald-600 dark:text-green-400" : ""}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── BLITZ-READY ──────────────────────────────────────────────────────────
    if (phase === "blitz-ready") {
      const isReady = ownPlayer?.isReady ?? readySent;
      const captainId = gameState.captainId;
      const captain = gameState.players.find((p) => p.id === captainId);
      const activeTeamPlayers = gameState.players.filter(
        (p) => p.teamId === gameState.activeTeamId && p.role === "player",
      );

      if (!isActiveTeam || isSpectator) {
        return (
          <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4">
            <div className="text-5xl">🎧</div>
            <h2 className="text-xl font-bold text-center">Другая команда готовится к блицу</h2>
            {gameState.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>
        );
      }

      return (
        <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto">
          <div className="text-6xl">🎧</div>
          <h2 className="text-2xl font-bold text-center">Надевайте наушники!</h2>
          {captain && (
            <p className="text-amber-600 dark:text-yellow-400 text-sm">
              {isCaptain ? "Вы капитан блица!" : `Капитан: ${captain.name}`}
            </p>
          )}

          <button
            onClick={handleReady}
            disabled={isReady}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
              isReady
                ? "bg-green-800 cursor-not-allowed text-green-300"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {isReady ? "✓ Готов" : "Я готов!"}
          </button>

          <div className="w-full text-sm space-y-1">
            {activeTeamPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span>{p.isReady ? "✅" : "⭕"}</span>
                <span className={p.isReady ? "text-emerald-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}>
                  {p.name}
                  {p.id === captainId && (
                    <span className="text-yellow-600 text-xs ml-1">(капитан)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── BLITZ-PICK ───────────────────────────────────────────────────────────
    if (phase === "blitz-pick") {
      if (!isCaptain) {
        return (
          <div key="blitz-pick-other" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 max-w-sm mx-auto animate-fade-in">
            <h2 className="text-xl font-bold">Капитан выбирает вопрос...</h2>
            {gameState.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>
        );
      }

      // Captain: pick an item from the pre-selected task (sent privately)
      const currentTask = blitzTaskList?.[0] ?? null;

      return (
        <div key="blitz-pick-captain" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col px-4 py-6 max-w-md mx-auto gap-4 animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Выберите вопрос</h2>
            <p className="text-amber-600 dark:text-yellow-400 text-sm font-semibold">Вы капитан блица!</p>
          </div>

          <div className="space-y-2">
            {currentTask === null && (
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-400 dark:border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Загружаем задания...</span>
              </div>
            )}
            {currentTask?.items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => sendMsg({ type: "blitzPickTask", itemIdx: idx })}
                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-all"
              >
                <span className="text-left">{item.text}</span>
                <span className="text-indigo-200 text-sm ml-4 flex-shrink-0">{item.difficulty}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // ── BLITZ-ACTIVE ─────────────────────────────────────────────────────────
    if (phase === "blitz-active") {
      const blitzOrder = gameState.blitzOrder ?? [];
      const myPosition = blitzOrder.indexOf(myId ?? "");
      const hasAnswered = ownPlayer?.hasAnswered ?? blitzAnswerSent;

      if (isCaptain) {
        return (
          <div key="blitz-active-captain" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
            <p className="text-amber-600 dark:text-yellow-400 font-bold">Вы капитан блица!</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
              Объясняйте жестами, пока команда отвечает по очереди
            </p>
            {blitzCaptainItem ? (
              <div className="relative w-full max-w-xs bg-slate-800 dark:bg-slate-900 rounded-xl p-6 border-2 border-dashed border-slate-600 dark:border-slate-500 overflow-hidden">
                <div className="absolute top-2 right-2 text-[10px] font-bold text-red-500 dark:text-red-400 tracking-widest uppercase opacity-80">
                  СЕКРЕТНО
                </div>
                <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 4px)" }} />
                <p className="text-3xl font-bold text-white text-center font-mono relative z-10">{blitzCaptainItem.text}</p>
                <p className="text-slate-400 text-sm mt-2 text-center relative z-10">
                  Сложность: {blitzCaptainItem.difficulty}
                </p>
              </div>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 text-sm">Загружаем...</p>
            )}
            <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />
          </div>
        );
      }

      if (!isActiveTeam || isSpectator) {
        return (
          <div key="blitz-active-other" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 animate-fade-in">
            <h2 className="text-xl font-bold text-center">Блиц идёт!</h2>
            <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />
          </div>
        );
      }

      const isMyTurn = myPosition >= 0 && !hasAnswered;
      const previousAnswered = myPosition > 0
        ? blitzOrder.slice(0, myPosition).every(
            (pid) => gameState.players.find((p) => p.id === pid)?.hasAnswered,
          )
        : true;

      return (
        <div key="blitz-active-player" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
          <div className="text-6xl">🎧</div>
          <h2 className="text-xl font-bold text-center">Блиц!</h2>
          {myPosition >= 0 && (
            <p className="text-slate-500 dark:text-slate-400 text-sm">Ваша позиция: {myPosition + 1}</p>
          )}
          <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />

          {!hasAnswered && isMyTurn ? (
            <div className="w-full space-y-2">
              <p className="text-amber-600 dark:text-yellow-400 font-bold text-center">Ваша очередь!</p>
              <input
                type="text"
                value={blitzAnswerInput}
                onChange={(e) => setBlitzAnswerInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !hasAnswered && handleBlitzSubmitAnswer()
                }
                placeholder="Ваш ответ..."
                maxLength={100}
                autoFocus
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleBlitzSubmitAnswer}
                disabled={!blitzAnswerInput.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all"
              >
                Ответить
              </button>
            </div>
          ) : hasAnswered ? (
            <div className="bg-emerald-50 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/50 rounded-lg p-4 text-center">
              <p className="text-emerald-600 dark:text-green-400 font-bold">Ответ отправлен!</p>
            </div>
          ) : (
            <p className="text-slate-400 dark:text-slate-500 text-center">
              {previousAnswered ? "Ждём вашей очереди..." : "Ждём предыдущих игроков..."}
            </p>
          )}
        </div>
      );
    }

    // ── BLITZ-ANSWER ─────────────────────────────────────────────────────────
    if (phase === "blitz-answer") {
      const hasAnswered = ownPlayer?.hasAnswered ?? blitzAnswerSent;

      if (isCaptain || !isActiveTeam || isSpectator) {
        return (
          <div key="blitz-answer-other" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 animate-fade-in">
            <h2 className="text-xl font-bold">Финальные ответы!</h2>
            <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />
          </div>
        );
      }

      return (
        <div key="blitz-answer-active" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-6 px-4 max-w-sm mx-auto animate-fade-in">
          <h2 className="text-2xl font-bold text-center">Финальный ответ!</h2>
          <PlayerTimerDisplay endsAt={gameState.timer?.endsAt} clockOffset={clockOffset} />

          {!hasAnswered ? (
            <div className="w-full space-y-2">
              <input
                type="text"
                value={blitzAnswerInput}
                onChange={(e) => setBlitzAnswerInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !hasAnswered && handleBlitzSubmitAnswer()
                }
                placeholder="Ваш ответ..."
                maxLength={100}
                autoFocus
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleBlitzSubmitAnswer}
                disabled={!blitzAnswerInput.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all"
              >
                Ответить
              </button>
              <button
                onClick={handleSurrender}
                className="w-full py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 shadow-sm transition-all"
              >
                Не знаю
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/50 rounded-lg p-4 text-center w-full">
              <p className="text-emerald-600 dark:text-green-400 font-bold">Ответ отправлен!</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {blitzAnswerInput || "Нет ответа"}
              </p>
            </div>
          )}
        </div>
      );
    }

    // ── BLITZ-RESULT ─────────────────────────────────────────────────────────
    if (phase === "blitz-result") {
      const result = gameState.roundResult;
      const blitzTaskReveal = gameState.blitzTaskReveal;
      const scores = gameState.scores;

      return (
        <div key="blitz-result" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col px-4 py-6 pb-24 max-w-md mx-auto gap-5 animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Результат блица</h2>
            {gameState.activeTeamId && <TeamBadge teamId={gameState.activeTeamId} />}
          </div>

          {/* Secret card with blitz word */}
          {blitzTaskReveal && (
            <div className="relative bg-slate-800 dark:bg-slate-900 rounded-xl p-5 border-2 border-dashed border-slate-600 dark:border-slate-500 overflow-hidden">
              <div className="absolute top-2 right-2 text-[10px] font-bold text-red-500 dark:text-red-400 tracking-widest uppercase opacity-80">СЕКРЕТНО</div>
              <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 4px)" }} />
              <p className="text-3xl font-bold text-white text-center font-mono relative z-10">{blitzTaskReveal.text}</p>
              <p className="text-slate-400 text-sm text-center mt-1 relative z-10">Сложность: {blitzTaskReveal.difficulty}</p>
            </div>
          )}

          {result && (
            <>
              {/* Answer chain as stickers */}
              <div className="space-y-4">
                {result.groups.map((g, i) => {
                  const player = gameState.players.find((p) => p.id === g.playerIds[0]);
                  const playerName = player?.name ?? g.playerIds[0];
                  const playerEmoji = player?.emoji;
                  const teamId = player?.teamId ?? gameState.activeTeamId ?? undefined;
                  const rotation = ((i % 3) - 1) * 2;
                  const stickerColor = teamId === "red" ? "red" : teamId === "blue" ? "blue" : "yellow";

                  // Determine stamp variant for blitz
                  const isLateCorrect = !g.accepted && g.note;
                  const stampVariant = g.accepted ? "correct" as const : isLateCorrect ? "late-correct" as const : "incorrect" as const;
                  const stampText = g.accepted
                    ? `+${result.score}`
                    : isLateCorrect
                      ? pickStampText("late-correct")
                      : pickStampText("incorrect");

                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.3, duration: 0.4 }}
                    >
                      <StickerWithAvatar
                        playerName={playerName}
                        playerEmoji={playerEmoji}
                        teamId={teamId}
                        color={stickerColor as "red" | "blue" | "yellow"}
                        rotation={rotation}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 text-sm">{g.canonicalAnswer || "—"}</p>
                        </div>
                        {g.note && (
                          <p className="text-lg text-slate-600  font-handwritten mt-1">{g.note}</p>
                        )}
                        <Stamp
                          text={stampText}
                          variant={stampVariant}
                          animate
                          delay={i * 0.3 + 0.5}
                          size="sm"
                        />
                      </StickerWithAvatar>
                    </motion.div>
                  );
                })}
              </div>

              {/* Score */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Очки за блиц:</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-yellow-400 animate-pop-in">+{result.score}</p>
              </div>
            </>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
            <div className="flex justify-around">
              {Object.entries(scores).map(([teamId, score]) => (
                <div key={teamId} className="text-center">
                  <p className={`font-bold text-lg ${teamId === "red" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"}`}>
                    {score}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">
                    {teamId === "red" ? "Красные" : "Синие"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed bottom button */}
          <div className="fixed bottom-0 inset-x-0 p-4 bg-surface/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => sendMsg({ type: "nextRound" })}
              className="w-full max-w-md mx-auto block py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-lg transition-all"
            >
              Продолжить
            </button>
          </div>
        </div>
      );
    }

    // ── FINALE ────────────────────────────────────────────────────────────────
    if (phase === "finale") {
      const scores = gameState.scores;
      const gameStats = gameState.gameStats;
      const sortedTeams = Object.entries(scores).sort(([, a], [, b]) => b - a);
      const myTeamId = ownPlayer?.teamId;
      const winnerTeamId = sortedTeams[0]?.[0];
      const iWon = myTeamId === winnerTeamId;

      return (
        <div key="finale" className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center px-4 gap-6 max-w-md mx-auto animate-fade-in">
          <div className="text-center">
            <div className="text-6xl mb-2">{iWon ? "🏆" : "🎉"}</div>
            <h2 className="text-3xl font-bold">Игра завершена!</h2>
            {myTeamId && (
              <p
                className={`text-lg font-semibold mt-1 ${
                  iWon ? "text-amber-600 dark:text-yellow-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {iWon ? "Ваша команда победила!" : "Хорошая игра!"}
              </p>
            )}
          </div>

          <div className="w-full space-y-3">
            {sortedTeams.map(([teamId, score], i) => (
              <div
                key={teamId}
                className={`rounded-lg p-4 border flex items-center justify-between ${
                  i === 0
                    ? "bg-amber-50 dark:bg-yellow-900/20 border-amber-300 dark:border-yellow-600/50"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span
                  className={`font-semibold ${
                    teamId === "red" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"
                  }`}
                >
                  {teamId === "red" ? "Красные" : "Синие"}
                  {i === 0 && <span className="ml-2 text-amber-600 dark:text-yellow-400 inline-block animate-crown">👑</span>}
                </span>
                <span className="text-2xl font-bold">{score}</span>
              </div>
            ))}
          </div>

          {gameStats && (
            <div className="w-full bg-white dark:bg-slate-800 rounded-lg p-4 space-y-2">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Статистика:</h3>
              {gameStats.topAnswererName && (
                <p className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Лучший отвечающий: </span>
                  <span className="text-emerald-600 dark:text-green-400 font-medium">{gameStats.topAnswererName}</span>
                </p>
              )}
              {gameStats.topCaptainName && (
                <p className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Лучший капитан: </span>
                  <span className="text-amber-600 dark:text-yellow-400 font-medium">{gameStats.topCaptainName}</span>
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => sendMsg({ type: "restart" })}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-lg transition-all"
          >
            Перезапустить игру
          </button>
        </div>
      );
    }

    // Fallback for any unknown phase
    return (
      <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-400 dark:text-slate-500 text-sm font-mono">{phase}</p>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-surface text-slate-900 dark:text-white flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1">LoudQuiz</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Комната{" "}
            <span className="font-mono font-bold text-indigo-600 dark:text-blue-300">{roomId}</span>
          </p>
        </div>

        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Ваше имя</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Введите имя"
            maxLength={30}
            autoFocus
            className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-3 text-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center"
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={!name.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-all"
        >
          Войти как игрок
        </button>

        <button
          onClick={() => connectToRoom(name.trim() || "Зритель", "spectator")}
          disabled={!name.trim()}
          className="w-full py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-slate-600 dark:text-slate-300 shadow-sm transition-all"
        >
          Смотреть (зритель)
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerTimerDisplay({
  endsAt,
  clockOffset,
}: {
  endsAt: number | undefined;
  clockOffset: number;
}) {
  const remaining = useTimer(endsAt, clockOffset);
  const seconds = Math.ceil(remaining / 1000);
  const isWarning = seconds <= 10;
  return (
    <div
      className={`text-5xl font-mono font-bold text-center ${
        isWarning ? "text-red-500 dark:text-red-400 animate-pulse" : "text-slate-900 dark:text-white"
      }`}
    >
      {seconds}
    </div>
  );
}
