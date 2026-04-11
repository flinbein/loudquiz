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
});
