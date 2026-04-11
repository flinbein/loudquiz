import { describe, it, expect, beforeEach } from "vitest";
import { useCalibrationUiStore } from "./calibrationUiStore";

describe("calibrationUiStore", () => {
  beforeEach(() => {
    useCalibrationUiStore.setState({ open: false, clockSectionExpanded: false });
  });

  it("starts closed and collapsed", () => {
    const s = useCalibrationUiStore.getState();
    expect(s.open).toBe(false);
    expect(s.clockSectionExpanded).toBe(false);
  });

  it("setOpen(true) opens the popup", () => {
    useCalibrationUiStore.getState().setOpen(true);
    expect(useCalibrationUiStore.getState().open).toBe(true);
  });

  it("setOpen(false) closes and collapses clock section", () => {
    useCalibrationUiStore.setState({ open: true, clockSectionExpanded: true });
    useCalibrationUiStore.getState().setOpen(false);
    const s = useCalibrationUiStore.getState();
    expect(s.open).toBe(false);
    expect(s.clockSectionExpanded).toBe(false);
  });

  it("toggleClockSection flips the flag", () => {
    useCalibrationUiStore.getState().toggleClockSection();
    expect(useCalibrationUiStore.getState().clockSectionExpanded).toBe(true);
    useCalibrationUiStore.getState().toggleClockSection();
    expect(useCalibrationUiStore.getState().clockSectionExpanded).toBe(false);
  });
});
