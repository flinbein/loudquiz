import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalibrationPopup } from "./CalibrationPopup";

function defaultProps() {
  return {
    open: true,
    onClose: vi.fn(),
    role: "player" as const,
    music: {
      volume: 0.7,
      isPlaying: false,
      onVolumeChange: vi.fn(),
      onTogglePlay: vi.fn(),
    },
    signal: {
      volume: 0.8,
      onVolumeChange: vi.fn(),
      onTest: vi.fn(),
    },
    vibration: {
      enabled: true,
      supported: true,
      onEnabledChange: vi.fn(),
      onTest: vi.fn(),
    },
    sharedHeadphones: {
      enabled: false,
      onEnabledChange: vi.fn(),
    },
    clock: {
      expanded: false,
      onToggleExpanded: vi.fn(),
      offset: 0,
      tempOffset: 0,
      onTempOffsetChange: vi.fn(),
      onApply: vi.fn(),
      onResync: vi.fn(),
      syncing: false,
      syncFailed: false,
      displayTimeMs: 0,
      pulsing: false,
    },
  };
}

describe("CalibrationPopup", () => {
  it("does not render when closed", () => {
    render(<CalibrationPopup {...defaultProps()} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders all rows when open", () => {
    render(<CalibrationPopup {...defaultProps()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Each row renders its label via i18n — we rely on test setup returning keys
    expect(screen.getAllByRole("slider").length).toBeGreaterThanOrEqual(2);
  });
});
