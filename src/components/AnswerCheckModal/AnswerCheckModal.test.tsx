import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnswerCheckModal } from "./AnswerCheckModal";

describe("AnswerCheckModal", () => {
  it("does not render when closed", () => {
    render(
      <AnswerCheckModal
        open={false}
        question={{ text: "Q?", difficulty: 100, acceptedAnswers: [] }}
        apiKey="sk-test"
        language="русский"
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText(/Проверка/)).not.toBeInTheDocument();
  });

  it("renders question text in title", () => {
    render(
      <AnswerCheckModal
        open
        question={{
          text: "Who founded Rome?",
          difficulty: 100,
          acceptedAnswers: [],
        }}
        apiKey="sk-test"
        language="русский"
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/Who founded Rome/)).toBeInTheDocument();
  });

  it("pre-fills textarea from acceptedAnswers", () => {
    render(
      <AnswerCheckModal
        open
        question={{
          text: "Q?",
          difficulty: 100,
          acceptedAnswers: ["Answer1", "Answer2"],
        }}
        apiKey="sk-test"
        language="русский"
        onClose={() => {}}
      />,
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Answer1\nAnswer2");
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn();
    render(
      <AnswerCheckModal
        open
        question={{ text: "Q?", difficulty: 100, acceptedAnswers: [] }}
        apiKey="sk-test"
        language="русский"
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByText("Закрыть"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("limits textarea to 10 lines", async () => {
    render(
      <AnswerCheckModal
        open
        question={{ text: "Q?", difficulty: 100, acceptedAnswers: [] }}
        apiKey="sk-test"
        language="русский"
        onClose={() => {}}
      />,
    );
    const textarea = screen.getByRole("textbox");
    const lines = Array.from({ length: 12 }, (_, i) => `answer${i}`).join(
      "\n",
    );
    await userEvent.type(textarea, lines);
    const value = (textarea as HTMLTextAreaElement).value;
    expect(value.split("\n").length).toBeLessThanOrEqual(10);
  });
});
