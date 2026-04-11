import { useCallback, useEffect, useRef, useState } from "react";
import { CalibrationPopup } from "@/components/CalibrationPopup/CalibrationPopup";
import type { CalibrationRole } from "@/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection";
import { useCalibrationSettingsStore } from "@/store/calibrationSettingsStore";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { useClockSyncStore } from "@/store/clockSyncStore";
import { useTestAudio } from "@/hooks/useTestAudio";
import { useSecondPulse } from "@/hooks/useSecondPulse";

export interface CalibrationPopupContainerProps {
  role: CalibrationRole;
}

const MUSIC_SRC = "/assets/music.mp3";
const RING_SRC = "/assets/ring.mp3";

/**
 * Container that binds Zustand stores to the pure <CalibrationPopup>.
 * Lives under src/pages/ (not src/components/) because it reads stores.
 */
export function CalibrationPopupContainer({ role }: CalibrationPopupContainerProps) {
  const open = useCalibrationUiStore((s) => s.open);
  const clockExpanded = useCalibrationUiStore((s) => s.clockSectionExpanded);
  const toggleClock = useCalibrationUiStore((s) => s.toggleClockSection);
  const setOpen = useCalibrationUiStore((s) => s.setOpen);

  const musicVolume = useCalibrationSettingsStore((s) => s.musicVolume);
  const signalVolume = useCalibrationSettingsStore((s) => s.signalVolume);
  const hapticEnabled = useCalibrationSettingsStore((s) => s.hapticEnabled);
  const sharedHeadphones = useCalibrationSettingsStore((s) => s.sharedHeadphones);
  const setMusicVolume = useCalibrationSettingsStore((s) => s.setMusicVolume);
  const setSignalVolume = useCalibrationSettingsStore((s) => s.setSignalVolume);
  const setHapticEnabled = useCalibrationSettingsStore((s) => s.setHapticEnabled);
  const setSharedHeadphones = useCalibrationSettingsStore((s) => s.setSharedHeadphones);

  const offset = useClockSyncStore((s) => s.offset);
  const setOffset = useClockSyncStore((s) => s.setOffset);

  const [musicPlaying, setMusicPlaying] = useState(false);
  const [signalTick, setSignalTick] = useState(0);
  const [tempOffset, setTempOffset] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  // Reset volatile state when the popup closes.
  useEffect(() => {
    if (!open) {
      setMusicPlaying(false);
      setTempOffset(0);
      setSyncing(false);
      setSyncFailed(false);
    }
  }, [open]);

  // Isolated test music element — independent of game audio.
  useTestAudio({
    src: MUSIC_SRC,
    loop: true,
    volume: musicVolume,
    enabled: open && musicPlaying,
  });

  // Isolated signal element — re-triggered by bumping `signalTick`.
  const signalAudioRef = useRef<HTMLAudioElement | null>(null);
  if (signalAudioRef.current === null && typeof Audio !== "undefined") {
    signalAudioRef.current = new Audio(RING_SRC);
  }
  useEffect(() => {
    if (signalTick === 0) return;
    const a = signalAudioRef.current;
    if (!a) return;
    a.volume = signalVolume;
    a.currentTime = 0;
    void a.play();
  }, [signalTick, signalVolume]);

  // Clock display pulse — only ticks while popup open + section expanded.
  const { timeMs, pulsing } = useSecondPulse({
    enabled: open && clockExpanded,
    offset,
    tempOffset,
  });

  const vibrationSupported =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  const handleTestVibration = useCallback(() => {
    if (vibrationSupported) navigator.vibrate(200);
  }, [vibrationSupported]);

  const handleTestSignal = useCallback(() => {
    setSignalTick((n) => n + 1);
  }, []);

  const handleApply = useCallback(() => {
    setOffset(offset + tempOffset);
    setTempOffset(0);
  }, [offset, tempOffset, setOffset]);

  const handleResync = useCallback(async () => {
    setSyncing(true);
    setSyncFailed(false);
    try {
      if (typeof window !== "undefined") {
        const handler = (window as unknown as { __calibrationResync?: () => Promise<number> })
          .__calibrationResync;
        if (!handler) {
          throw new Error("no resync handler");
        }
        const next = await handler();
        setOffset(next);
        setTempOffset(0);
      }
    } catch {
      setSyncFailed(true);
      setTimeout(() => setSyncFailed(false), 3000);
    } finally {
      setSyncing(false);
    }
  }, [setOffset]);

  return (
    <CalibrationPopup
      open={open}
      onClose={() => setOpen(false)}
      role={role}
      music={{
        volume: musicVolume,
        isPlaying: musicPlaying,
        onVolumeChange: setMusicVolume,
        onTogglePlay: () => setMusicPlaying((p) => !p),
      }}
      signal={{
        volume: signalVolume,
        onVolumeChange: setSignalVolume,
        onTest: handleTestSignal,
      }}
      vibration={{
        enabled: hapticEnabled,
        supported: vibrationSupported,
        onEnabledChange: setHapticEnabled,
        onTest: handleTestVibration,
      }}
      sharedHeadphones={{
        enabled: sharedHeadphones,
        onEnabledChange: setSharedHeadphones,
      }}
      clock={{
        expanded: clockExpanded,
        onToggleExpanded: toggleClock,
        offset,
        tempOffset,
        onTempOffsetChange: setTempOffset,
        onApply: handleApply,
        onResync: handleResync,
        syncing,
        syncFailed,
        displayTimeMs: timeMs,
        pulsing,
      }}
    />
  );
}
