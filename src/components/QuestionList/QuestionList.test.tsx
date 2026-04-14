import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionList } from "./QuestionList";
import type { Question } from "@/types/game";

const questions: Question[] = [
  { text: "Who founded Rome?", difficulty: 100, acceptedAnswers: ["Romulus"] },
  { text: "Year of Moon landing?", difficulty: 150, acceptedAnswers: [] },
];

describe("QuestionList", () => {
  it("renders question texts", () => {
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
        onCheck={() => {}}
      />,
    );
    expect(screen.getByText("Who founded Rome?")).toBeInTheDocument();
    expect(screen.getByText("Year of Moon landing?")).toBeInTheDocument();
  });

  it("renders difficulty values", () => {
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
        onCheck={() => {}}
      />,
    );
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("calls onDelete with index", async () => {
    const onDelete = vi.fn();
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={onDelete}
        onAdd={() => {}}
        onCheck={() => {}}
      />,
    );
    const deleteButtons = screen.getAllByLabelText(/delete/i);
    await userEvent.click(deleteButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith(0);
  });

  it("calls onCheck with index", async () => {
    const onCheck = vi.fn();
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
        onCheck={onCheck}
      />,
    );
    const checkButtons = screen.getAllByLabelText(/check/i);
    await userEvent.click(checkButtons[0]!);
    expect(onCheck).toHaveBeenCalledWith(0);
  });

  it("enters edit mode and saves changes", async () => {
    const onUpdate = vi.fn();
    render(
      <QuestionList
        questions={questions}
        onUpdate={onUpdate}
        onDelete={() => {}}
        onAdd={() => {}}
        onCheck={() => {}}
      />,
    );
    const editButtons = screen.getAllByLabelText(/edit/i);
    await userEvent.click(editButtons[0]!);

    const textInput = screen.getByDisplayValue("Who founded Rome?");
    await userEvent.clear(textInput);
    await userEvent.type(textInput, "Who built Rome?");

    await userEvent.click(screen.getByLabelText(/save/i));
    expect(onUpdate).toHaveBeenCalledWith(0, {
      text: "Who built Rome?",
      difficulty: 100,
      acceptedAnswers: ["Romulus"],
    });
  });

  it("calls onAdd when add button clicked", async () => {
    const onAdd = vi.fn();
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={() => {}}
        onAdd={onAdd}
        onCheck={() => {}}
      />,
    );
    await userEvent.click(screen.getByText("+ Вопрос"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
