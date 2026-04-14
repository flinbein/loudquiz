import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicChips } from "./TopicChips";

const topics = [
  { name: "History", questions: [] },
  { name: "Music", questions: [] },
];

describe("TopicChips", () => {
  it("renders topic names", () => {
    render(
      <TopicChips
        topics={topics}
        selectedIndex={0}
        onSelect={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Music")).toBeInTheDocument();
  });

  it("highlights selected chip", () => {
    render(
      <TopicChips
        topics={topics}
        selectedIndex={1}
        onSelect={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
      />,
    );
    const musicChip = screen.getByText("Music").closest("button");
    expect(musicChip).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect when chip clicked", async () => {
    const onSelect = vi.fn();
    render(
      <TopicChips
        topics={topics}
        selectedIndex={0}
        onSelect={onSelect}
        onDelete={() => {}}
        onAdd={() => {}}
      />,
    );
    await userEvent.click(screen.getByText("Music"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("calls onDelete when delete button clicked", async () => {
    const onDelete = vi.fn();
    render(
      <TopicChips
        topics={topics}
        selectedIndex={0}
        onSelect={() => {}}
        onDelete={onDelete}
        onAdd={() => {}}
      />,
    );
    const deleteButtons = screen.getAllByLabelText(/delete/i);
    await userEvent.click(deleteButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith(0);
  });

  it("calls onAdd when add button clicked", async () => {
    const onAdd = vi.fn();
    render(
      <TopicChips
        topics={topics}
        selectedIndex={0}
        onSelect={() => {}}
        onDelete={() => {}}
        onAdd={onAdd}
      />,
    );
    await userEvent.click(screen.getByText("+ Тема"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
