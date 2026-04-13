import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalibrationPopupContainer } from "./CalibrationPopupContainer";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { useCalibrationSettingsStore } from "@/store/calibrationSettingsStore";
import { useClockSyncStore } from "@/store/clockSyncStore";

describe("CalibrationPopupContainer", () => {
  beforeEach(() => {
    localStorage.clear();
    useCalibrationUiStore.setState({ open: false, clockSectionExpanded: false });
    useCalibrationSettingsStore.getState().reload();
    useClockSyncStore.getState().reset();
  });

  it("renders nothing when closed", () => {
    render(<CalibrationPopupContainer role="player" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders popup when open", () => {
    act(() => useCalibrationUiStore.getState().setOpen(true));
    render(<CalibrationPopupContainer role="player" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shared headphones toggle writes to settings store", async () => {
    act(() => useCalibrationUiStore.getState().setOpen(true));
    render(<CalibrationPopupContainer role="player" />);
    const switches = screen.getAllByRole("switch");
    // The last switch in the list is SharedHeadphonesRow per render order
    // (Music ▶, Signal ♪ test, Vibration test, Vibration toggle, Shared)
    const sharedSwitch = switches[switches.length - 1]!;
    await userEvent.click(sharedSwitch);
    expect(useCalibrationSettingsStore.getState().sharedHeadphones).toBe(true);
  });

  it("music volume slider writes to settings store", () => {
    act(() => useCalibrationUiStore.getState().setOpen(true));
    render(<CalibrationPopupContainer role="player" />);
    const sliders = screen.getAllByRole("slider");
    const musicSlider = sliders[0]!;
    fireEvent.input(musicSlider, { target: { value: "40" } });
    expect(useCalibrationSettingsStore.getState().musicVolume).toBe(0.4);
  });
});
