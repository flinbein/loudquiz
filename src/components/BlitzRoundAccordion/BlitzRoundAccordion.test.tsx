import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlitzRoundAccordion } from "./BlitzRoundAccordion";
import type { BlitzTask } from "@/types/game";

const task: BlitzTask = {
  items: [
    { text: "Crocodile", difficulty: 200 },
    { text: "TV", difficulty: 250 },
    { text: "Philosophy", difficulty: 300 },
  ],
};

describe("BlitzRoundAccordion", () => {
  it("renders round header with count", () => {
    render(
      <BlitzRoundAccordion
        task={task}
        roundIndex={0}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    expect(screen.getByText(/Раунд 1/)).toBeInTheDocument();
  });

  it("expands on click to show items", async () => {
    render(
      <BlitzRoundAccordion
        task={task}
        roundIndex={0}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    await userEvent.click(screen.getByText(/Раунд 1/));
    expect(screen.getByText("Crocodile")).toBeInTheDocument();
    expect(screen.getByText("TV")).toBeInTheDocument();
  });

  it("calls onDeleteRound", async () => {
    const onDeleteRound = vi.fn();
    render(
      <BlitzRoundAccordion
        task={task}
        roundIndex={0}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={onDeleteRound}
      />,
    );
    await userEvent.click(screen.getByLabelText(/delete round/i));
    expect(onDeleteRound).toHaveBeenCalledTimes(1);
  });

  it("calls onDeleteItem when item delete clicked", async () => {
    const onDeleteItem = vi.fn();
    render(
      <BlitzRoundAccordion
        task={task}
        roundIndex={0}
        defaultOpen
        onUpdateItem={() => {}}
        onDeleteItem={onDeleteItem}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    const deleteButtons = screen.getAllByLabelText(/delete item/i);
    await userEvent.click(deleteButtons[0]!);
    expect(onDeleteItem).toHaveBeenCalledWith(0);
  });

  it("hides add button when 5 items", () => {
    const fullTask: BlitzTask = {
      items: [
        { text: "A", difficulty: 200 },
        { text: "B", difficulty: 250 },
        { text: "C", difficulty: 300 },
        { text: "D", difficulty: 350 },
        { text: "E", difficulty: 400 },
      ],
    };
    render(
      <BlitzRoundAccordion
        task={fullTask}
        roundIndex={0}
        defaultOpen
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    expect(screen.queryByText("+ Слово")).not.toBeInTheDocument();
  });

  it("shows warning when fewer than 3 items", () => {
    const smallTask: BlitzTask = {
      items: [
        { text: "A", difficulty: 200 },
        { text: "B", difficulty: 250 },
      ],
    };
    render(
      <BlitzRoundAccordion
        task={smallTask}
        roundIndex={0}
        defaultOpen
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    expect(screen.getByText(/Минимум 3/)).toBeInTheDocument();
  });
});
