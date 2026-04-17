import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NominationCarousel } from "./NominationCarousel";
import type { Nomination } from "@/logic/nominations/types";

const mockNominations: Nomination[] = [
  {
    id: "sniper",
    emoji: "🎯",
    titleKey: "finale.nomination.sniper.title",
    descriptionKey: "finale.nomination.sniper.description",
    winners: [{ emoji: "😈", name: "Alice", team: "red" }],
    stat: "92%",
  },
  {
    id: "philosopher",
    emoji: "🤔",
    titleKey: "finale.nomination.philosopher.title",
    descriptionKey: "finale.nomination.philosopher.description",
    winners: [{ emoji: "👹", name: "Bob", team: "blue" }],
    stat: "12.5s",
  },
];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("NominationCarousel", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders first nomination", () => {
    render(<NominationCarousel nominations={mockNominations} />);
    expect(screen.getByText("🎯")).toBeInTheDocument();
  });

  it("advances to next slide on next button", () => {
    render(<NominationCarousel nominations={mockNominations} />);
    fireEvent.click(screen.getByLabelText("next"));
    expect(screen.getByText("🤔")).toBeInTheDocument();
  });

  it("auto-advances after 8 seconds", () => {
    render(<NominationCarousel nominations={mockNominations} />);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByText("🤔")).toBeInTheDocument();
  });

  it("renders progress dots", () => {
    render(<NominationCarousel nominations={mockNominations} />);
    const dots = screen.getAllByRole("button", { name: /slide/i });
    expect(dots).toHaveLength(2);
  });
});
