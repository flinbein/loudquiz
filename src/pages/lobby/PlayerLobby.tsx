import { useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { PlayerAction } from "@/types/transport";
import type { TeamId } from "@/types/game";
import { usePlayers, useSettings, useTeams } from "@/store/selectors";
import { isAllPlayersReady } from "@/store/selectors";
import { canStartGame } from "@/store/actions/lobby";
import { useGameStore } from "@/store/gameStore";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import {
  PlayerStatusTable,
  type PlayerStatusRow,
} from "@/components/PlayerStatusTable/PlayerStatusTable";
import { TeamPicker } from "@/components/TeamPicker/TeamPicker";
import styles from "./PlayerLobby.module.css";

interface PlayerLobbyProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
  connected: boolean;
}

export function PlayerLobby({
  playerName,
  sendAction,
  connected,
}: PlayerLobbyProps) {
  const { t } = useTranslation();
  const players = usePlayers();
  const settings = useSettings();
  const teams = useTeams();
  const state = useGameStore.getState();
  const openCalibration = useCalibrationUiStore((s) => s.setOpen);
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(players.length);

  const me = players.find((p) => p.name === playerName);
  const isDual = settings.teamMode === "dual";
  const allReady = isAllPlayersReady(state);

  // Auto-scroll only when user is at bottom and a new player joins
  const isAtBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 30;
  }, []);

  useEffect(() => {
    if (players.length > prevCountRef.current && isAtBottom() && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevCountRef.current = players.length;
  }, [players.length, isAtBottom]);

  function toRows(): PlayerStatusRow[] {
    return players.map((p) => ({
      emoji: p.emoji,
      name: p.name,
      team: p.team,
      online: p.online,
      role: p.name === me?.name ? "captain" : undefined,
      status: p.ready ? ("right" as const) : ("waiting" as const),
    }));
  }

  if (!connected || !me) {
    return (
      <div className={styles.page}>
        <div className={styles.connecting}>{t("lobby.connecting")}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Team color header block with avatar */}
      <TeamPicker
        player={me}
        teamMode={settings.teamMode}
        redCount={players.filter((p) => p.team === "red").length}
        blueCount={players.filter((p) => p.team === "blue").length}
        noneCount={players.length}
        onSelectTeam={(team) => sendAction({ kind: "set-team", team })}
        onChangeEmoji={() => sendAction({ kind: "change-emoji" })}
      />

      {/* Player list */}
      <div className={styles.playerList} ref={listRef}>
        {isDual ? (
          <>
            {teams.map((team) => {
              const teamPlayers = players.filter((p) => p.team === team.id);
              if (teamPlayers.length === 0) return null;
              return (
                <TeamGroup
                  key={team.id}
                  label={t(`team.${team.id}`)}
                  teamColor={team.id}
                  playerCount={teamPlayers.length}
                >
                  <PlayerStatusTable
                    players={teamPlayers.map((p) => ({
                      emoji: p.emoji,
                      name: p.name,
                      team: p.team,
                      online: p.online,
                      role: p.name === me.name ? "captain" : undefined,
                      status: p.ready ? "right" : "waiting",
                    }))}
                  />
                </TeamGroup>
              );
            })}
            {players.filter((p) => !p.team).length > 0 && (
              <TeamGroup
                label={t("team.noTeam")}
                teamColor="none"
                playerCount={players.filter((p) => !p.team).length}
              >
                <PlayerStatusTable
                  players={players
                    .filter((p) => !p.team)
                    .map((p) => ({
                      emoji: p.emoji,
                      name: p.name,
                      team: "none" as const,
                      online: p.online,
                      role: p.name === me.name ? "captain" : undefined,
                      status: p.ready ? "right" : "waiting",
                    }))}
                />
              </TeamGroup>
            )}
          </>
        ) : (
          <TeamGroup
            label={t("team.players")}
            teamColor="none"
            playerCount={players.length}
          >
            <PlayerStatusTable players={toRows()} />
          </TeamGroup>
        )}
      </div>

      {/* Bottom controls */}
      <div className={styles.controls}>
        <button
          className={styles.calibrationBtn}
          onClick={() => openCalibration(true)}
        >
          {t("lobby.calibration")}
        </button>
        {!me.ready ? (
          <button
            className={styles.readyBtn}
            disabled={isDual && !me.team}
            onClick={() => sendAction({ kind: "set-ready", ready: true })}
          >
            {isDual && !me.team ? t("lobby.chooseTeam") : t("lobby.ready")}
          </button>
        ) : allReady ? (
          <button
            className={styles.startBtn}
            disabled={!canStartGame()}
            onClick={() => sendAction({ kind: "start-game" })}
          >
            {t("lobby.start")}
          </button>
        ) : (
          <button className={styles.waitingBtn} disabled>
            {t("lobby.waiting")}
          </button>
        )}
      </div>
    </div>
  );
}
