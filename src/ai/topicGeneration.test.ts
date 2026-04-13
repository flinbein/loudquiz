import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TopicGenerationInput } from "@/types/ai";

vi.mock("./client", () => ({
  chatCompletionJSON: vi.fn(),
}));

import { generateTopics } from "./topicGeneration";
import { chatCompletionJSON } from "./client";

const mockChat = vi.mocked(chatCompletionJSON);

const INPUT: TopicGenerationInput = {
  suggestions: [
    { playerName: "Alice", text: "Movies" },
    { playerName: "Bob", text: "Science" },
  ],
  topicCount: 2,
  pastTopics: ["History"],
};

describe("generateTopics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      topics: [
        { name: "Movies", reason: "Popular choice" },
        { name: "Science", reason: "Educational" },
      ],
    });
  });

  it("calls chatCompletionJSON with rendered prompts", async () => {
    await generateTopics("key", INPUT, "ru");

    expect(mockChat).toHaveBeenCalledOnce();
    const opts = mockChat.mock.calls[0]![0];
    expect(opts.apiKey).toBe("key");
    expect(opts.messages).toHaveLength(2);
    expect(opts.messages[0]!.role).toBe("system");
    expect(opts.messages[0]!.content).toContain("2 topics");
    expect(opts.messages[0]!.content).toContain("ru");
    expect(opts.messages[1]!.role).toBe("user");
    expect(opts.messages[1]!.content).toContain("Alice");
    expect(opts.messages[1]!.content).toContain("Movies");
    expect(opts.messages[1]!.content).toContain("History");
    expect(opts.schema.name).toBe("topic_generation");
  });

  it("forwards model option", async () => {
    await generateTopics("key", INPUT, "en", "custom/model");

    const opts = mockChat.mock.calls[0]![0];
    expect(opts.model).toBe("custom/model");
  });

  it("returns chatCompletionJSON result", async () => {
    const result = await generateTopics("key", INPUT, "ru");

    expect(result.topics).toHaveLength(2);
    expect(result.topics[0]!.name).toBe("Movies");
  });
});
