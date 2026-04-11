import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { VolumeSlider } from "./VolumeSlider";

describe("VolumeSlider", () => {
  it("renders input with value 0..1 scaled to 0..100", () => {
    render(<VolumeSlider value={0.5} onChange={() => {}} label="x" />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "50");
  });

  it("emits onChange with 0..1 value when user drags", () => {
    const onChange = vi.fn();
    render(<VolumeSlider value={0} onChange={onChange} label="x" />);
    fireEvent.input(screen.getByRole("slider"), { target: { value: "75" } });
    expect(onChange).toHaveBeenCalledWith(0.75);
  });

  it("is disabled when prop set", () => {
    render(<VolumeSlider value={0.5} onChange={() => {}} disabled label="x" />);
    expect(screen.getByRole("slider")).toBeDisabled();
  });
});
