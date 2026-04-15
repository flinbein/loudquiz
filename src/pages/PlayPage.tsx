import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isHost } from "@/persistence/sessionPersistence";
import { getPlayerName, setPlayerName } from "@/persistence/localPersistence";
import { parseRoomId, formatRoomId } from "@/utils/roomId";
import { useTransport, onHostAction } from "@/hooks/useTransport";
import { useAudio } from "@/hooks/useAudio";
import { usePhase } from "@/store/selectors";
import { useGameStore } from "@/store/gameStore";
import { HostLobby } from "@/pages/lobby/HostLobby";
import { PlayerLobby } from "@/pages/lobby/PlayerLobby";
import { HostRound } from "@/pages/round/HostRound";
import { PlayerRound } from "@/pages/round/PlayerRound";
import { HostBlitz } from "@/pages/blitz/HostBlitz";
import { PlayerBlitz } from "@/pages/blitz/PlayerBlitz";
import { HostTopicsSuggest } from "@/pages/topics/HostTopicsSuggest";
import { PlayerTopicsSuggest } from "@/pages/topics/PlayerTopicsSuggest";
import { GameShell } from "@/pages/GameShell";
import { useAiOrchestrator } from "@/hooks/useAiOrchestrator";
import { handleJoin, handleSetTeam, handleSetReady, handleChangeEmoji, startGame } from "@/store/actions/lobby";
import {
  submitTopicSuggestion,
  playerNoIdeas,
  startFirstRound,
} from "@/store/actions/topicsSuggest";
import {
  claimCaptain,
  selectQuestion,
  activateJoker,
  submitAnswer,
  setPlayerReady,
  disputeReview,
  confirmReview,
} from "@/store/actions/round";
import {
  claimBlitzCaptain,
  claimBlitzSlot,
  selectBlitzItem,
  setBlitzPlayerReady,
  submitBlitzAnswer,
  skipBlitzAnswer,
  confirmBlitzReview,
} from "@/store/actions/blitz";
import styles from "./PlayPage.module.css";

export function PlayPage() {
  const [searchParams] = useSearchParams();
  const roomIdFromUrl = searchParams.get("room");

  if (isHost()) {
    return <HostPlay />;
  }

  return <PlayerPlay roomIdFromUrl={roomIdFromUrl} />;
}

function HostPlay() {
  const [, setSearchParams] = useSearchParams();
  const transport = useTransport({ role: "host" });
  const phase = usePhase();
  const peerMap = useRef(new Map<string, string>());

  // Host hears the signal (no music — music is for players only).
  useAudio({ playerName: "" });

  useEffect(() => {
    if (transport.role === "host" && transport.roomId) {
      setSearchParams({ room: transport.roomId }, { replace: true });
    }
  }, [transport.role === "host" ? transport.roomId : null, setSearchParams]);

  // Central action handler for all phases
  useEffect(() => {
    return onHostAction((peerId, action) => {
      const name = peerMap.current.get(peerId) ?? "";
      switch (action.kind) {
        // Lobby actions
        case "join":
          peerMap.current.set(peerId, action.name);
          handleJoin(peerId, action.name);
          break;
        case "set-team":
          handleSetTeam(name, action.team);
          break;
        case "set-ready": {
          const state = useGameStore.getState();
          if (state.phase === "lobby") {
            handleSetReady(name, action.ready);
          } else if (state.phase === "round-ready") {
            setPlayerReady(name);
          } else if (state.phase === "blitz-ready") {
            setBlitzPlayerReady(name);
          }
          break;
        }
        case "change-emoji":
          handleChangeEmoji(name);
          break;
        case "start-game":
          startGame();
          break;
        // Round actions
        case "claim-captain":
          claimCaptain(name);
          break;
        case "select-question":
          selectQuestion(action.questionIndex);
          break;
        case "activate-joker":
          activateJoker();
          break;
        case "submit-answer":
          submitAnswer(name, action.text);
          break;
        case "dispute-review":
          disputeReview();
          break;
        case "next-round": {
          const state = useGameStore.getState();
          if (state.phase === "blitz-review") {
            confirmBlitzReview();
          } else {
            confirmReview();
          }
          break;
        }
        // Blitz actions
        case "claim-blitz-captain":
          claimBlitzCaptain(name);
          break;
        case "claim-blitz-slot":
          claimBlitzSlot(name, action.slot);
          break;
        case "select-blitz-item":
          selectBlitzItem(action.itemIndex);
          break;
        case "submit-blitz-answer":
          submitBlitzAnswer(name, action.text);
          break;
        case "skip-blitz-answer":
          skipBlitzAnswer(name);
          break;
        // Topics suggest
        case "suggest-topic":
          submitTopicSuggestion(name, action.text);
          break;
        case "no-ideas":
          playerNoIdeas(name);
          break;
        case "start-first-round": {
          const state = useGameStore.getState();
          const player = state.players.find((p) => p.name === name);
          if (player && player.team !== "none") startFirstRound(player.team);
          break;
        }
      }
    });
  }, []);

  useAiOrchestrator(transport.role === "host");

  if (transport.role !== "host") return null;

  return (
    <GameShell role="host">
      {phase === "lobby" && (
        <HostLobby roomId={transport.roomId} joinUrl={transport.joinUrl} />
      )}
      {phase.startsWith("topics-") && <HostTopicsSuggest />}
      {phase.startsWith("round-") && <HostRound />}
      {phase.startsWith("blitz-") && <HostBlitz />}
    </GameShell>
  );
}

function PlayerPlay({ roomIdFromUrl }: { roomIdFromUrl: string | null }) {
  const [name, setName] = useState(() => getPlayerName());
  const [roomInput, setRoomInput] = useState(() => {
    if (roomIdFromUrl) return roomIdFromUrl;
    return sessionStorage.getItem("loud-quiz-player-room") ?? "";
  });
  const [joined, setJoined] = useState(() => {
    const savedRoom = sessionStorage.getItem("loud-quiz-player-room");
    const savedName = getPlayerName();
    return !!(savedRoom && savedName && !roomIdFromUrl);
  });

  const roomId = parseRoomId(roomInput);
  const canJoin = roomId.length === 9 && name.trim().length > 0;

  if (joined && roomId.length === 9) {
    return <PlayerPlayConnected roomId={roomId} playerName={name} />;
  }

  return (
    <PlayerEntryForm
      name={name}
      onNameChange={setName}
      roomInput={roomInput}
      onRoomInputChange={setRoomInput}
      roomLocked={!!roomIdFromUrl}
      canJoin={canJoin}
      onJoin={() => {
        setPlayerName(name);
        setJoined(true);
      }}
    />
  );
}

function PlayerEntryForm({
  name,
  onNameChange,
  roomInput,
  onRoomInputChange,
  roomLocked,
  canJoin,
  onJoin,
}: {
  name: string;
  onNameChange: (name: string) => void;
  roomInput: string;
  onRoomInputChange: (value: string) => void;
  roomLocked: boolean;
  canJoin: boolean;
  onJoin: () => void;
}) {
  const { t } = useTranslation();

  function handleRoomInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    onRoomInputChange(digits);
  }

  return (
    <div className={styles.nameEntry}>
      <h2 className={styles.nameTitle}>Loud Quiz</h2>
      <div className={styles.nameForm}>
        <label className={styles.nameLabel}>{t("play.roomCode")}</label>
        <input
          className={`${styles.nameInput} ${styles.roomInput}`}
          value={formatRoomId(parseRoomId(roomInput))}
          onChange={(e) => handleRoomInput(e.target.value)}
          disabled={roomLocked}
          placeholder="000-000-000"
          inputMode="numeric"
        />
        <label className={styles.nameLabel}>{t("lobby.enterName")}</label>
        <input
          className={styles.nameInput}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canJoin) onJoin();
          }}
          autoFocus={!roomLocked}
        />
        <button
          className={styles.joinBtn}
          disabled={!canJoin}
          onClick={onJoin}
        >
          {t("lobby.join")}
        </button>
      </div>
    </div>
  );
}

function PlayerPlayConnected({
  roomId,
  playerName,
}: {
  roomId: string;
  playerName: string;
}) {
  const transport = useTransport({ role: "player", roomId, playerName });
  const phase = usePhase();
  useAudio({ playerName });

  if (transport.role !== "player") return null;

  if (transport.error === "cancelled") {
    sessionStorage.removeItem("loud-quiz-player-room");
    window.location.href = `/play${window.location.search}`;
    return null;
  }

  if (transport.error) {
    return <ConnectionError error={transport.error} onRetry={transport.retry} onCancel={transport.cancel} />;
  }

  if (transport.reconnecting && !transport.connected) {
    return <ConnectionReconnecting />;
  }

  return (
    <GameShell role="player" onClockResync={transport.resyncClock}>
      {phase === "lobby" && (
        <PlayerLobby
          playerName={playerName}
          sendAction={transport.sendAction}
          connected={transport.connected}
        />
      )}
      {phase.startsWith("topics-") && (
        <PlayerTopicsSuggest playerName={playerName} sendAction={transport.sendAction} />
      )}
      {phase.startsWith("round-") && (
        <PlayerRound playerName={playerName} sendAction={transport.sendAction} />
      )}
      {phase.startsWith("blitz-") && (
        <PlayerBlitz playerName={playerName} sendAction={transport.sendAction} />
      )}
    </GameShell>
  );
}

function ConnectionError({
  error,
  onRetry,
  onCancel,
}: {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.nameEntry}>
      <div className={styles.errorCard}>
        <h3>{t("play.connectionError")}</h3>
        <p className={styles.errorText}>{error}</p>
        <div className={styles.errorActions}>
          <button className={styles.joinBtn} onClick={onRetry}>
            {t("play.retry")}
          </button>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {t("play.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectionReconnecting() {
  const { t } = useTranslation();
  return (
    <div className={styles.nameEntry}>
      <div className={styles.errorCard}>
        <p>{t("play.reconnecting")}</p>
      </div>
    </div>
  );
}
