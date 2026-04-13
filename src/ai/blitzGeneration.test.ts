import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BlitzGenerationInput } from "@/types/ai";

vi.mock("./client", () => ({
  chatCompletionJSON: vi.fn(),
}));

import { generateBlitzTasks } from "./blitzGeneration";
import { chatCompletionJSON } from "./client";

const mockChat = vi.mocked(chatCompletionJSON);

const INPUT: BlitzGenerationInput = {
  rounds: 2,
  tasksPerRound: 4,
  pastTasks: ["Apple"],
};

describe("generateBlitzTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      rounds: [
        { items: [{ text: "Cat", difficulty: 200 }] },
      ],
    });
  });

  it("calls chatCompletionJSON with rendered prompts", async () => {
    await generateBlitzTasks("key", INPUT, "ru");

    expect(mockChat).toHaveBeenCalledOnce();
    const opts = mockChat.mock.calls[0][0];
    expect(opts.messages[0].content).toContain("4 items");
    expect(opts.messages[0].content).toContain("2 blitz rounds");
    expect(opts.messages[0].content).toContain("ru");
    expect(opts.messages[1].content).toContain("Apple");
    expect(opts.schema.name).toBe("blitz_generation");
  });

  it("forwards model option", async () => {
    await generateBlitzTasks("key", INPUT, "en", "custom/model");

    expect(mockChat.mock.calls[0][0].model).toBe("custom/model");
  });

  it("returns chatCompletionJSON result", async () => {
    const result = await generateBlitzTasks("key", INPUT, "ru");

    expect(result.rounds[0].items[0].text).toBe("Cat");
  });
});
