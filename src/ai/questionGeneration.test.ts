import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QuestionGenerationInput } from "@/types/ai";

vi.mock("./client", () => ({
  chatCompletionJSON: vi.fn(),
}));

import { generateQuestions } from "./questionGeneration";
import { chatCompletionJSON } from "./client";

const mockChat = vi.mocked(chatCompletionJSON);

const INPUT: QuestionGenerationInput = {
  topics: ["Movies", "Science"],
  questionsPerTopic: 3,
  playersPerTeam: 4,
  pastQuestions: ["Old question"],
};

describe("generateQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      topics: [
        {
          name: "Movies",
          questions: [
            { text: "Q1", difficulty: 100, acceptedAnswers: ["a", "b", "c", "d"] },
          ],
        },
      ],
    });
  });

  it("calls chatCompletionJSON with rendered prompts", async () => {
    await generateQuestions("key", INPUT, "ru");

    expect(mockChat).toHaveBeenCalledOnce();
    const opts = mockChat.mock.calls[0][0];
    expect(opts.messages[0].role).toBe("system");
    expect(opts.messages[0].content).toContain("3 questions");
    expect(opts.messages[0].content).toContain("4 unique");
    expect(opts.messages[0].content).toContain("ru");
    expect(opts.messages[1].role).toBe("user");
    expect(opts.messages[1].content).toContain("Movies");
    expect(opts.messages[1].content).toContain("Old question");
    expect(opts.schema.name).toBe("question_generation");
  });

  it("forwards model option", async () => {
    await generateQuestions("key", INPUT, "en", "custom/model");

    expect(mockChat.mock.calls[0][0].model).toBe("custom/model");
  });

  it("returns chatCompletionJSON result", async () => {
    const result = await generateQuestions("key", INPUT, "ru");

    expect(result.topics[0].name).toBe("Movies");
  });
});
