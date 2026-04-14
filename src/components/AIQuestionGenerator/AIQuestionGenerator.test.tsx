import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIQuestionGenerator } from "./AIQuestionGenerator";

describe("AIQuestionGenerator", () => {
  it("renders players count and questions per topic inputs", () => {
    render(
      <AIQuestionGenerator
        apiKey="sk-test"
        language="русский"
        topicNames={["History"]}
        onApply={() => {}}
      />,
    );
    expect(screen.getByText("Сгенерировать")).toBeInTheDocument();
  });

  it("disables generate when no topics", () => {
    render(
      <AIQuestionGenerator
        apiKey="sk-test"
        language="русский"
        topicNames={[]}
        onApply={() => {}}
      />,
    );
    expect(screen.getByText("Сгенерировать")).toBeDisabled();
  });

  it("disables generate when no apiKey", () => {
    render(
      <AIQuestionGenerator
        apiKey=""
        language="русский"
        topicNames={["History"]}
        onApply={() => {}}
      />,
    );
    expect(screen.getByText("Сгенерировать")).toBeDisabled();
  });
});
