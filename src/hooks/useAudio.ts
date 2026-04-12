import { useEffect, useRef } from "react";
import { audioManager } from "@/audio/audioManager";
import { useGameStore } from "@/store/gameStore";
import { useCalibrationSettingsStore } from "@/store/calibrationSettingsStore";
import type { GamePhase } from "@/types/game";

/**
 * Binds the imperative audioManager to React state for a single player.
 * - Runs only on player side (host/spectator pass empty `playerName`).
 * - Starts looped music when entering round-ready/round-active/blitz-ready/
 *   blitz-active **if** the player belongs to the active team.
 * - Fades music out on any other phase.
 * - Fires the signal + vibration on the rising and falling edges of
 *   `round-active` and `blitz-active` (heard by every participant).
 */
export interface UseAudioOptions {
  /** Player name; empty string = host/spectator. Host still gets the signal. */
  playerName: string;
}

const MUSIC_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>([
  "round-ready",
  "round-active",
  "blitz-ready",
  "blitz-active",
]);

const SIGNAL_EDGE_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>([
  "round-active",
  "blitz-active",
]);

export function useAudio({ playerName }: UseAudioOptions): void {
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);
  const players = useGameStore((s) => s.players);

  const musicVolume = useCalibrationSettingsStore((s) => s.musicVolume);
  const signalVolume = useCalibrationSettingsStore((s) => s.signalVolume);
  const hapticEnabled = useCalibrationSettingsStore((s) => s.hapticEnabled);

  // Push live calibration values into the manager.
  useEffect(() => {
    audioManager.setMusicVolume(musicVolume);
  }, [musicVolume]);
  useEffect(() => {
    audioManager.setSignalVolume(signalVolume);
  }, [signalVolume]);
  useEffect(() => {
    audioManager.setHapticEnabled(hapticEnabled);
  }, [hapticEnabled]);

  // Music: only players on the active team hear it.
  const isActiveTeamMember = (() => {
    if (!playerName || !currentRound) return false;
    const me = players.find((p) => p.name === playerName);
    return !!me && me.team === currentRound.teamId;
  })();

  const shouldPlayMusic = MUSIC_PHASES.has(phase) && isActiveTeamMember;
  useEffect(() => {
    if (shouldPlayMusic) {
      audioManager.playMusic();
    } else {
      audioManager.stopMusic(true);
    }
  }, [shouldPlayMusic]);

  // Signal: fire on entering and leaving round-active / blitz-active.
  // Ref-tracked so we react to transitions, not to every render.
  const prevPhaseRef = useRef<GamePhase | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev !== phase) {
      if (SIGNAL_EDGE_PHASES.has(phase)) {
        // Entering an active phase.
        audioManager.playSignal();
      } else if (prev && SIGNAL_EDGE_PHASES.has(prev)) {
        // Leaving an active phase.
        audioManager.playSignal();
      }
      prevPhaseRef.current = phase;
    }
  }, [phase]);
}
