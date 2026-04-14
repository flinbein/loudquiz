import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AITopicGenerator } from "./AITopicGenerator";

describe("AITopicGenerator", () => {
  it("renders suggestions textarea and generate button", () => {
    render(
      <AITopicGenerator apiKey="sk-test" language="русский" onApply={() => {}} />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("Сгенерировать")).toBeInTheDocument();
  });

  it("disables generate when no apiKey", () => {
    render(
      <AITopicGenerator apiKey="" language="русский" onApply={() => {}} />,
    );
    expect(screen.getByText("Сгенерировать")).toBeDisabled();
  });

  it("shows counter", () => {
    render(
      <AITopicGenerator apiKey="sk-test" language="русский" onApply={() => {}} />,
    );
    expect(screen.getByText("0 / 60")).toBeInTheDocument();
  });
});
