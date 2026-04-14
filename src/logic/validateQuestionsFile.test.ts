import { describe, it, expect } from "vitest";
import { validateQuestionsFile } from "./validateQuestionsFile";

describe("validateQuestionsFile", () => {
  it("accepts a valid QuestionsFile", () => {
    const result = validateQuestionsFile({
      topics: [
        {
          name: "History",
          questions: [
            { text: "Who founded Rome?", difficulty: 100, acceptedAnswers: [] },
          ],
        },
      ],
      blitzTasks: [
        {
          items: [
            { text: "Crocodile", difficulty: 200 },
            { text: "TV", difficulty: 250 },
            { text: "Philosophy", difficulty: 300 },
          ],
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts empty topics and blitzTasks arrays", () => {
    const result = validateQuestionsFile({ topics: [], blitzTasks: [] });
    expect(result.valid).toBe(true);
  });

  it("rejects null", () => {
    const result = validateQuestionsFile(null);
    expect(result.valid).toBe(false);
  });

  it("rejects missing topics", () => {
    const result = validateQuestionsFile({ blitzTasks: [] });
    expect(result.valid).toBe(false);
  });

  it("rejects non-array topics", () => {
    const result = validateQuestionsFile({ topics: "bad", blitzTasks: [] });
    expect(result.valid).toBe(false);
  });

  it("rejects topic without name", () => {
    const result = validateQuestionsFile({
      topics: [{ questions: [] }],
      blitzTasks: [],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects question with invalid difficulty", () => {
    const result = validateQuestionsFile({
      topics: [
        {
          name: "T",
          questions: [{ text: "Q", difficulty: 999, acceptedAnswers: [] }],
        },
      ],
      blitzTasks: [],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects blitz item with invalid difficulty", () => {
    const result = validateQuestionsFile({
      topics: [],
      blitzTasks: [
        {
          items: [
            { text: "A", difficulty: 100 },
            { text: "B", difficulty: 200 },
            { text: "C", difficulty: 300 },
          ],
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts file without blitzTasks (defaults to empty)", () => {
    const result = validateQuestionsFile({
      topics: [{ name: "T", questions: [] }],
    });
    expect(result.valid).toBe(true);
  });
});
