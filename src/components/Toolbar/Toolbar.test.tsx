import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./Toolbar";

const defaultProps = {
  onOpenCalibration: vi.fn(),
  onToggleFullscreen: vi.fn(),
  onToggleTheme: vi.fn(),
};

describe("Toolbar", () => {
  describe("GameToolbar mode (no player)", () => {
    it("renders only menu button", () => {
      const { container } = render(<Toolbar {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Menu" })).toBeDefined();
      expect(container.querySelectorAll("button")).toHaveLength(1);
    });

    it("click menu opens calibration/fullscreen/theme buttons", () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(4);
    });

    it("clicking a menu button calls callback and closes menu", () => {
      const onCalibration = vi.fn();
      render(<Toolbar {...defaultProps} onOpenCalibration={onCalibration} />);
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      const buttons = screen.getAllByRole("button");
      const calBtn = buttons.find((b) => b.textContent === "\u{1F50A}");
      fireEvent.click(calBtn!);
      expect(onCalibration).toHaveBeenCalledOnce();
    });

    it("sets data-variant attribute", () => {
      const { container } = render(<Toolbar {...defaultProps} variant="inline" />);
      expect(container.firstElementChild?.getAttribute("data-variant")).toBe("inline");
    });
  });

  describe("PlayerToolbar mode", () => {
    const player = { emoji: "🐰", name: "Alice", team: "red" as const };

    it("shows player name and phase", () => {
      render(
        <Toolbar {...defaultProps} player={player} phaseName="Идут ответы" phaseTeam="red" />,
      );
      expect(screen.getByText("Alice")).toBeDefined();
      expect(screen.getByText("Идут ответы")).toBeDefined();
    });

    it("player name has team color via data-team", () => {
      render(<Toolbar {...defaultProps} player={player} />);
      const nameEl = screen.getByText("Alice");
      expect(nameEl.getAttribute("data-team")).toBe("red");
    });

    it("phase name has phaseTeam color via data-team", () => {
      render(
        <Toolbar {...defaultProps} player={player} phaseName="Выбор" phaseTeam="blue" />,
      );
      const phaseEl = screen.getByText("Выбор");
      expect(phaseEl.getAttribute("data-team")).toBe("blue");
    });

    it("avatar button opens player list", () => {
      render(
        <Toolbar
          {...defaultProps}
          player={player}
          players={[
            { emoji: "🐰", name: "Alice", team: "red", online: true, ready: true },
            { emoji: "🐶", name: "Bob", team: "blue", online: true, ready: true },
          ]}
          teamLabels={{ red: "Красные", blue: "Синие" }}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Player list" }));
      expect(screen.getByText("Красные")).toBeDefined();
      expect(screen.getByText("Bob")).toBeDefined();
    });
  });

  describe("panel interactions", () => {
    const player = { emoji: "🐰", name: "Alice", team: "red" as const };

    it("opening menu closes players list", () => {
      render(
        <Toolbar
          {...defaultProps}
          player={player}
          players={[{ emoji: "🐰", name: "Alice", team: "red", online: true, ready: true }]}
          teamLabels={{ red: "Красные" }}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Player list" }));
      expect(screen.getByText("Красные")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.queryByText("Красные")).toBeNull();
    });

    it("Esc closes any open panel", () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("outside click closes any open panel", () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
      fireEvent.mouseDown(document.body);
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });
  });
});
