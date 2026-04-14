import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIBlitzGenerator } from "./AIBlitzGenerator";

describe("AIBlitzGenerator", () => {
  it("renders rounds and words per round inputs", () => {
    render(
      <AIBlitzGenerator apiKey="sk-test" language="русский" onApply={() => {}} />,
    );
    expect(screen.getByText("Сгенерировать")).toBeInTheDocument();
  });

  it("disables generate when no apiKey", () => {
    render(
      <AIBlitzGenerator apiKey="" language="русский" onApply={() => {}} />,
    );
    expect(screen.getByText("Сгенерировать")).toBeDisabled();
  });
});
