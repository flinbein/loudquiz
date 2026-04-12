import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { useSettings, usePlayers, useTeams } from "@/store/selectors";
import {
  kickPlayer,
  movePlayer,
  canStartGameAsHost,
} from "@/store/actions/lobby";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import {
  PlayerStatusTable,
  type PlayerStatusRow,
} from "@/components/PlayerStatusTable/PlayerStatusTable";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import type { TeamId } from "@/types/game";
import styles from "./HostLobby.module.css";
import { goToNextRound } from "@/store/actions/round";

export function HostLobby({
  roomId,
  joinUrl,
}: {
  roomId: string | null;
  joinUrl: string | null;
}) {
  const { t } = useTranslation();
  const settings = useSettings();
  const players = usePlayers();
  const teams = useTeams();
  const openCalibration = useCalibrationUiStore((s) => s.setOpen);

  function toStatusRows(
    teamId: TeamId
  ): PlayerStatusRow[] {
    return players
      .filter((p) => p.team === teamId)
      .map((p) => ({
        emoji: p.emoji,
        name: p.name,
        team: teamId,
        online: p.online,
        status: p.ready ? ("right" as const) : ("waiting" as const),
      }));
  }

  function handleDrop(targetTeamId: TeamId, e: React.DragEvent) {
    e.preventDefault();
    const name = e.dataTransfer.getData("application/loud-quiz-player-name");
    if (name) movePlayer(name, targetTeamId);
  }

  function handleKickDrop(e: React.DragEvent) {
    e.preventDefault();
    const name = e.dataTransfer.getData("application/loud-quiz-player-name");
    if (name) kickPlayer(name);
  }

  function preventDef(e: React.DragEvent) {
    e.preventDefault();
  }

  const canStart = canStartGameAsHost();
  const startReason = !canStart
    ? getStartBlockReasonHost(t, players, teams, settings)
    : null;

  return (
    <div className={styles.layout}>
      <div className={styles.qrSection}>
        <h2 className={styles.logo}>Loud Quiz</h2>
        <div className={styles.roomId}>
          {t("lobby.room")}: {roomId}
        </div>
        {joinUrl && (
          <>
            <div className={styles.qrCode}>
              <QRCodeSVG value={joinUrl} size={220} />
            </div>
            <div className={styles.scanHint}>{t("lobby.scanQr")}</div>
            <div className={styles.joinUrl}>{joinUrl}</div>
          </>
        )}
      </div>

      <div className={styles.sidebar}>
        <div className={styles.teamList}>
          {settings.teamMode === "dual" ? (
            <>
              {teams
                .filter((team) => team.id !== "none")
                .map((team) => {
                  const rows = toStatusRows(team.id);
                  return (
                    <TeamGroup
                      key={team.id}
                      label={t(`team.${team.id}`)}
                      teamColor={team.id}
                      playerCount={rows.length}
                      onDragOver={preventDef}
                      onDrop={(e) => handleDrop(team.id, e)}
                    >
                      <PlayerStatusTable players={rows} draggable />
                    </TeamGroup>
                  );
                })}
              <TeamGroup
                label={t("team.noTeam")}
                teamColor="none"
                playerCount={players.filter((p) => !p.team || p.team === "none").length}
                onDragOver={preventDef}
                onDrop={(e) => handleDrop("none", e)}
              >
                <PlayerStatusTable
                  players={players
                    .filter((p) => !p.team || p.team === "none")
                    .map((p) => ({
                      emoji: p.emoji,
                      name: p.name,
                      team: "none" as const,
                      online: p.online,
                      status: p.ready
                        ? ("right" as const)
                        : ("waiting" as const),
                    }))}
                  draggable
                />
              </TeamGroup>
            </>
          ) : (
            <TeamGroup
              label={t("team.players")}
              teamColor="none"
              playerCount={players.length}
            >
              <PlayerStatusTable
                players={players.map((p) => ({
                  emoji: p.emoji,
                  name: p.name,
                  team: "none" as const,
                  online: p.online,
                  status: p.ready ? ("right" as const) : ("waiting" as const),
                }))}
                draggable
              />
            </TeamGroup>
          )}
        </div>

        <div
          className={styles.kickZone}
          onDragOver={preventDef}
          onDrop={handleKickDrop}
        >
          {t("lobby.kickZone")}
        </div>

        <div className={styles.controls}>
          <button
            className={styles.calibrationBtn}
            onClick={() => openCalibration(true)}
          >
            {t("lobby.calibration")}
          </button>
          <button
            className={styles.startBtn}
            disabled={!canStart}
            onClick={() => goToNextRound()}
          >
            {t("lobby.start")}
          </button>
          {startReason && (
            <div className={styles.startHint}>{startReason}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStartBlockReasonHost(
  t: (key: string) => string,
  players: ReturnType<typeof usePlayers>,
  teams: ReturnType<typeof useTeams>,
  settings: ReturnType<typeof useSettings>,
): string | null {
  if (players.length === 0) return t("lobby.needMorePlayers");

  if (settings.teamMode === "dual") {
    const teamSizes = teams
      .filter((team) => team.id !== "none")
      .map((team) => players.filter((p) => p.team === team.id).length);
    if (teamSizes.some((s) => s < 2)) return t("lobby.needMorePlayers");
    if (!teamSizes.every((s) => s === teamSizes[0]))
      return t("lobby.unevenTeams");
  } else {
    if (players.length < 2) return t("lobby.needMorePlayers");
  }

  return null;
}
