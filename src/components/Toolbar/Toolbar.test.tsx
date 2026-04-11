import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "./Toolbar";

describe("Toolbar", () => {
  it("calls onOpenCalibration when calibration button clicked", async () => {
    const fn = vi.fn();
    render(
      <Toolbar
        onOpenCalibration={fn}
        onToggleFullscreen={() => {}}
        onToggleTheme={() => {}}
      />,
    );
    await userEvent.click(screen.getByLabelText("Калибровка"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleFullscreen", async () => {
    const fn = vi.fn();
    render(
      <Toolbar
        onOpenCalibration={() => {}}
        onToggleFullscreen={fn}
        onToggleTheme={() => {}}
      />,
    );
    await userEvent.click(screen.getByLabelText(/fullscreen/i));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleTheme", async () => {
    const fn = vi.fn();
    render(
      <Toolbar
        onOpenCalibration={() => {}}
        onToggleFullscreen={() => {}}
        onToggleTheme={fn}
      />,
    );
    await userEvent.click(screen.getByLabelText(/theme/i));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
