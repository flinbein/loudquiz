import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders children when open", () => {
    render(
      <BottomSheet open onClose={() => {}} ariaLabel="test">
        <p>hello</p>
      </BottomSheet>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} ariaLabel="test">
        <p>hello</p>
      </BottomSheet>,
    );
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });

  it("fires onClose when backdrop clicked", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="test">
        <p>hello</p>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByTestId("bottom-sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fires onClose on Escape", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="test">
        <p>hello</p>
      </BottomSheet>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has role dialog and aria-modal", () => {
    render(
      <BottomSheet open onClose={() => {}} ariaLabel="calibration">
        <p>hello</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "calibration");
  });

  it("clicks inside the card do not close", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="test">
        <button>inside</button>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByText("inside"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("moves focus into the dialog on open", () => {
    render(
      <BottomSheet open onClose={() => {}} ariaLabel="test">
        <button>inside</button>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);
  });

  it("traps Tab at the last focusable, cycling to the first", async () => {
    const user = userEvent.setup();
    render(
      <BottomSheet open onClose={() => {}} ariaLabel="test">
        <button>one</button>
        <button>two</button>
        <button>three</button>
      </BottomSheet>,
    );
    const buttons = screen.getAllByRole("button");
    const last = buttons[buttons.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);
    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("traps Shift+Tab at the first focusable, cycling to the last", async () => {
    const user = userEvent.setup();
    render(
      <BottomSheet open onClose={() => {}} ariaLabel="test">
        <button>one</button>
        <button>two</button>
        <button>three</button>
      </BottomSheet>,
    );
    const buttons = screen.getAllByRole("button");
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });
});
