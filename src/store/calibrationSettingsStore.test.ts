import { describe, it, expect, beforeEach } from "vitest";
import { useCalibrationSettingsStore } from "./calibrationSettingsStore";
import { getCalibration } from "@/persistence/localPersistence";

describe("calibrationSettingsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useCalibrationSettingsStore.getState().reload();
  });

  it("initializes from localPersistence defaults when storage empty", () => {
    const s = useCalibrationSettingsStore.getState();
    expect(s.musicVolume).toBe(0.7);
    expect(s.signalVolume).toBe(0.8);
    expect(s.hapticEnabled).toBe(true);
    expect(s.sharedHeadphones).toBe(false);
  });

  it("setMusicVolume writes through to localStorage", () => {
    useCalibrationSettingsStore.getState().setMusicVolume(0.25);
    expect(useCalibrationSettingsStore.getState().musicVolume).toBe(0.25);
    expect(getCalibration().musicVolume).toBe(0.25);
  });

  it("setSignalVolume writes through", () => {
    useCalibrationSettingsStore.getState().setSignalVolume(0.33);
    expect(getCalibration().signalVolume).toBe(0.33);
  });

  it("setHapticEnabled writes through", () => {
    useCalibrationSettingsStore.getState().setHapticEnabled(false);
    expect(getCalibration().hapticEnabled).toBe(false);
  });

  it("setSharedHeadphones writes through", () => {
    useCalibrationSettingsStore.getState().setSharedHeadphones(true);
    expect(getCalibration().sharedHeadphones).toBe(true);
  });

  it("reload re-reads from localStorage", () => {
    localStorage.setItem(
      "loud-quiz-calibration",
      JSON.stringify({
        musicVolume: 0.1,
        signalVolume: 0.2,
        hapticEnabled: false,
        sharedHeadphones: true,
      }),
    );
    useCalibrationSettingsStore.getState().reload();
    const s = useCalibrationSettingsStore.getState();
    expect(s.musicVolume).toBe(0.1);
    expect(s.signalVolume).toBe(0.2);
    expect(s.hapticEnabled).toBe(false);
    expect(s.sharedHeadphones).toBe(true);
  });
});
