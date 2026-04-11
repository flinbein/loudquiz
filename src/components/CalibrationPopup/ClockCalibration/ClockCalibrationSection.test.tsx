import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClockCalibrationSection } from "./ClockCalibrationSection";

function defaultProps() {
  return {
    role: "player" as const,
    expanded: true,
    onToggleExpanded: vi.fn(),
    offset: -187,
    tempOffset: 0,
    onTempOffsetChange: vi.fn(),
    onApply: vi.fn(),
    onResync: vi.fn(),
    syncing: false,
    syncFailed: false,
    displayTimeMs: 65_000,
    pulsing: false,
    volume: 0.8,
  };
}

describe("ClockCalibrationSection", () => {
  it("when collapsed only shows header button", () => {
    render(
      <ClockCalibrationSection {...defaultProps()} expanded={false} />,
    );
    expect(screen.queryByTestId("clock-display")).not.toBeInTheDocument();
  });

  it("clicking header toggles expanded", async () => {
    const p = defaultProps();
    render(<ClockCalibrationSection {...p} expanded={false} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Подстройка таймера/i }),
    );
    expect(p.onToggleExpanded).toHaveBeenCalled();
  });

  it("player role shows slider and Apply", () => {
    render(<ClockCalibrationSection {...defaultProps()} />);
    expect(screen.getByLabelText(/offset nudge/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Применить/i }),
    ).toBeInTheDocument();
  });

  it("host role hides slider and Apply", () => {
    render(<ClockCalibrationSection {...defaultProps()} role="host" />);
    expect(screen.queryByLabelText(/offset nudge/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Применить/i }),
    ).not.toBeInTheDocument();
  });

  it("host role still shows ClockDisplay", () => {
    render(<ClockCalibrationSection {...defaultProps()} role="host" />);
    expect(screen.getByTestId("clock-display")).toBeInTheDocument();
  });
});
