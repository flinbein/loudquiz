import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isHost } from "@/persistence/sessionPersistence";
import { getPlayerName, setPlayerName } from "@/persistence/localPersistence";
import { useTransport, onHostAction } from "@/hooks/useTransport";
import { usePhase } from "@/store/selectors";
import { useGameStore } from "@/store/gameStore";
import { HostLobby } from "@/pages/lobby/HostLobby";
import { PlayerLobby } from "@/pages/lobby/PlayerLobby";
import { HostRound } from "@/pages/round/HostRound";
import { PlayerRound } from "@/pages/round/PlayerRound";
import { handleJoin, handleSetTeam, handleSetReady, handleChangeEmoji, startGame } from "@/store/actions/lobby";
import {
  claimCaptain,
  selectQuestion,
  activateJoker,
  submitAnswer,
  setPlayerReady,
  disputeReview,
  confirmReview,
} from "@/store/actions/round";
import styles from "./PlayPage.module.css";

export function PlayPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");

  if (isHost()) {
    return <HostPlay />;
  }

  if (!roomId) {
    return <div>{t("play.title")}: no room specified</div>;
  }

  return <PlayerPlay roomId={roomId} />;
}

function HostPlay() {
  const [, setSearchParams] = useSearchParams();
  const transport = useTransport({ role: "host" });
  const phase = usePhase();
  const peerMap = useRef(new Map<string, string>());

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
        case "next-round":
          confirmReview();
          break;
      }
    });
  }, []);

  if (transport.role !== "host") return null;

  return (
    <div>
      {phase === "lobby" && (
        <HostLobby roomId={transport.roomId} joinUrl={transport.joinUrl} />
      )}
      {phase.startsWith("round-") && <HostRound />}
    </div>
  );
}

function PlayerPlay({ roomId }: { roomId: string }) {
  const [name, setName] = useState(() => getPlayerName());
  const [joined, setJoined] = useState(false);

  if (!joined) {
    return (
      <PlayerNameEntry
        name={name}
        onNameChange={setName}
        onJoin={() => {
          setPlayerName(name);
          setJoined(true);
        }}
      />
    );
  }

  return <PlayerPlayConnected roomId={roomId} playerName={name} />;
}

function PlayerNameEntry({
  name,
  onNameChange,
  onJoin,
}: {
  name: string;
  onNameChange: (name: string) => void;
  onJoin: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.nameEntry}>
      <h2 className={styles.nameTitle}>Loud Quiz</h2>
      <div className={styles.nameForm}>
        <label className={styles.nameLabel}>{t("lobby.enterName")}</label>
        <input
          className={styles.nameInput}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onJoin();
          }}
          autoFocus
        />
        <button
          className={styles.joinBtn}
          disabled={!name.trim()}
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

  if (transport.role !== "player") return null;

  return (
    <div>
      {phase === "lobby" && (
        <PlayerLobby
          playerName={playerName}
          sendAction={transport.sendAction}
          connected={transport.connected}
        />
      )}
      {phase.startsWith("round-") && (
        <PlayerRound playerName={playerName} sendAction={transport.sendAction} />
      )}
    </div>
  );
}
