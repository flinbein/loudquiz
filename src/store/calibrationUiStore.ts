import { create } from "zustand";

interface CalibrationUiState {
  open: boolean;
  clockSectionExpanded: boolean;
  setOpen: (open: boolean) => void;
  toggleClockSection: () => void;
}

/**
 * View-state store for the Calibration popup. Not persisted.
 * Closing the popup collapses the clock section — this matches the spec
 * requirement that the tick stops and audio resources are released.
 *
 * Lives in a dedicated store (not local useState) because the popup is
 * opened from both Toolbar and the duplicate button in PlayerLobby; a
 * store avoids prop drilling through GameShell.
 */
export const useCalibrationUiStore = create<CalibrationUiState>((set) => ({
  open: false,
  clockSectionExpanded: false,
  setOpen: (open) =>
    set((s) =>
      open
        ? { ...s, open: true }
        : { ...s, open: false, clockSectionExpanded: false },
    ),
  toggleClockSection: () =>
    set((s) => ({ ...s, clockSectionExpanded: !s.clockSectionExpanded })),
}));
