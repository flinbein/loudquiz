import { create } from "zustand";
import {
  type CalibrationSettings,
  getCalibration,
  setCalibration,
} from "@/persistence/localPersistence";

interface CalibrationSettingsState extends CalibrationSettings {
  setMusicVolume: (v: number) => void;
  setSignalVolume: (v: number) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setSharedHeadphones: (enabled: boolean) => void;
  /** Re-reads the record from localStorage. Used by tests. */
  reload: () => void;
}

/**
 * Zustand mirror of `CalibrationSettings`. Initialized from localPersistence
 * at module load, every setter write-throughs both the in-memory store and
 * localStorage via `setCalibration`. The game audio layer (`useAudio`)
 * subscribes here for live volume / shared-headphones updates.
 *
 * Components must NOT import this store directly — only pages and containers.
 */
export const useCalibrationSettingsStore = create<CalibrationSettingsState>(
  (set, get) => {
    function persist() {
      const s = get();
      setCalibration({
        musicVolume: s.musicVolume,
        signalVolume: s.signalVolume,
        hapticEnabled: s.hapticEnabled,
        sharedHeadphones: s.sharedHeadphones,
      });
    }

    return {
      ...getCalibration(),
      setMusicVolume: (v) => {
        set({ musicVolume: v });
        persist();
      },
      setSignalVolume: (v) => {
        set({ signalVolume: v });
        persist();
      },
      setHapticEnabled: (enabled) => {
        set({ hapticEnabled: enabled });
        persist();
      },
      setSharedHeadphones: (enabled) => {
        set({ sharedHeadphones: enabled });
        persist();
      },
      reload: () => set({ ...getCalibration() }),
    };
  },
);
