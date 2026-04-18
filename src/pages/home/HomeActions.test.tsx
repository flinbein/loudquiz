import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { HomeActions } from "./HomeActions";
import type { HomeSession } from "./useHomeSession";

function renderActions(session: HomeSession, overrides: Partial<React.ComponentProps<typeof HomeActions>> = {}) {
  const props = {
    session,
    onStartNew: vi.fn(),
    onResume: vi.fn(),
    onJoin: vi.fn(),
    onClearAndStartNew: vi.fn(),
    onConstructor: vi.fn(),
    onRules: vi.fn(),
    ...overrides,
  };
  render(
    <I18nextProvider i18n={i18n}>
      <HomeActions {...props} />
    </I18nextProvider>,
  );
  return props;
}

describe("HomeActions", () => {
  describe("when session is fresh", () => {
    it("renders new-game primary button, join, constructor, rules — no clear link", () => {
      renderActions({ kind: "fresh" });
      expect(screen.getByRole("button", { name: /Новая игра|New Game/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Присоединиться|Join Game/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Редактор|Editor/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Правила|Rules/i })).toBeTruthy();
      expect(screen.queryByText(/Идёт раунд|Round in progress|Идёт блиц|Blitz in progress/i)).toBeNull();
    });

    it("clicking new-game calls onStartNew", () => {
      const props = renderActions({ kind: "fresh" });
      fireEvent.click(screen.getByRole("button", { name: /Новая игра|New Game/i }));
      expect(props.onStartNew).toHaveBeenCalledOnce();
    });

    it("clicking join calls onJoin", () => {
      const props = renderActions({ kind: "fresh" });
      fireEvent.click(screen.getByRole("button", { name: /Присоединиться|Join Game/i }));
      expect(props.onJoin).toHaveBeenCalledOnce();
    });
  });

  describe("when session is resume", () => {
    const session: HomeSession = {
      kind: "resume",
      phase: "round-active",
      phaseLabel: "Идёт раунд · 5 / 12",
      roomId: "QUIZ42",
    };

    it("renders continue primary button showing phase label", () => {
      renderActions(session);
      expect(screen.getByRole("button", { name: /Продолжить|Continue/i })).toBeTruthy();
      expect(screen.getByText("Идёт раунд · 5 / 12")).toBeTruthy();
    });

    it("renders clear-and-new as text link", () => {
      renderActions(session);
      expect(screen.getByRole("button", { name: /Новая игра|New Game/i })).toBeTruthy();
    });

    it("clicking continue calls onResume with roomId", () => {
      const props = renderActions(session);
      fireEvent.click(screen.getByRole("button", { name: /Продолжить|Continue/i }));
      expect(props.onResume).toHaveBeenCalledWith("QUIZ42");
    });

    it("clicking new-game text link calls onClearAndStartNew", () => {
      const props = renderActions(session);
      fireEvent.click(screen.getByRole("button", { name: /Новая игра|New Game/i }));
      expect(props.onClearAndStartNew).toHaveBeenCalledOnce();
      expect(props.onStartNew).not.toHaveBeenCalled();
    });
  });
});
