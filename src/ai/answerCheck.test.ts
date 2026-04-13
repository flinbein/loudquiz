import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnswerCheckInput } from "@/types/ai";

vi.mock("./client", () => ({
  chatCompletionJSON: vi.fn(),
}));

import { checkAnswers } from "./answerCheck";
import { chatCompletionJSON } from "./client";

const mockChat = vi.mocked(chatCompletionJSON);

const INPUT: AnswerCheckInput = {
  question: "Name a planet",
  answers: [
    { playerName: "Alice", answer: "Mars" },
    { playerName: "Bob", answer: "mars" },
  ],
};

describe("checkAnswers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      results: [
        { playerName: "Alice", accepted: true, group: 1, note: "Correct" },
        { playerName: "Bob", accepted: true, group: 1, note: "Same as Alice" },
      ],
      comment: "Both correct",
    });
  });

  it("calls chatCompletionJSON with rendered prompts", async () => {
    await checkAnswers("key", INPUT, "ru");

    expect(mockChat).toHaveBeenCalledOnce();
    const opts = mockChat.mock.calls[0]![0];
    expect(opts.messages[0]!.content).toContain("quiz judge");
    expect(opts.messages[0]!.content).toContain("ru");
    expect(opts.messages[1]!.content).toContain("Name a planet");
    expect(opts.messages[1]!.content).toContain("Alice");
    expect(opts.messages[1]!.content).toContain("Mars");
    expect(opts.schema.name).toBe("answer_check");
  });

  it("forwards model option", async () => {
    await checkAnswers("key", INPUT, "en", "custom/model");

    expect(mockChat.mock.calls[0]![0].model).toBe("custom/model");
  });

  it("returns chatCompletionJSON result", async () => {
    const result = await checkAnswers("key", INPUT, "ru");

    expect(result.results).toHaveLength(2);
    expect(result.comment).toBe("Both correct");
  });
});
