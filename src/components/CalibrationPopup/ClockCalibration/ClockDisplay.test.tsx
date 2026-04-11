import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClockDisplay, formatMMSS } from "./ClockDisplay";

describe("formatMMSS", () => {
  it("formats zero", () => {
    expect(formatMMSS(0)).toBe("00:00");
  });

  it("formats 65 seconds", () => {
    expect(formatMMSS(65_000)).toBe("01:05");
  });

  it("formats exactly 60s", () => {
    expect(formatMMSS(60_000)).toBe("01:00");
  });

  it("floors sub-second", () => {
    expect(formatMMSS(12_800)).toBe("00:12");
  });

  it("wraps at 60 minutes (mod)", () => {
    expect(formatMMSS(3_600_000)).toBe("00:00");
  });
});

describe("ClockDisplay", () => {
  it("renders formatted time", () => {
    render(<ClockDisplay timeMs={65_000} pulsing={false} />);
    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("applies pulsing class when pulsing=true", () => {
    render(<ClockDisplay timeMs={1000} pulsing={true} />);
    const el = screen.getByTestId("clock-display");
    expect(el.className).toMatch(/pulsing/);
  });
});
