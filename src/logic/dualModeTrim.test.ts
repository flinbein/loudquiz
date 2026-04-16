import { describe, it, expect } from "vitest";
import { trimQuestionsFileForDual } from "./dualModeTrim";
import type { QuestionsFile } from "@/types/game";

describe("trimQuestionsFileForDual", () => {
  it("returns file unchanged in single mode", () => {
    const file: QuestionsFile = {
      topics: [{ name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 100, acceptedAnswers: [] }, { text: "Q3", difficulty: 100, acceptedAnswers: [] }] }],
      blitzTasks: [{ items: [{ text: "W1", difficulty: 200 }] }, { items: [{ text: "W2", difficulty: 200 }] }, { items: [{ text: "W3", difficulty: 200 }] }],
    };
    const result = trimQuestionsFileForDual(file, "single");
    expect(result.topics[0]!.questions).toHaveLength(3);
    expect(result.blitzTasks).toHaveLength(3);
  });

  it("trims last question when total is odd in dual", () => {
    const file: QuestionsFile = {
      topics: [
        { name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 100, acceptedAnswers: [] }] },
        { name: "T2", questions: [{ text: "Q3", difficulty: 100, acceptedAnswers: [] }] },
      ],
      blitzTasks: [],
    };
    const result = trimQuestionsFileForDual(file, "dual");
    const total = result.topics.reduce((s, t) => s + t.questions.length, 0);
    expect(total).toBe(2);
  });

  it("drops entire last topic if it has only one question", () => {
    const file: QuestionsFile = {
      topics: [
        { name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 100, acceptedAnswers: [] }] },
        { name: "T2", questions: [{ text: "Q3", difficulty: 100, acceptedAnswers: [] }] },
      ],
      blitzTasks: [],
    };
    const result = trimQuestionsFileForDual(file, "dual");
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]!.name).toBe("T1");
  });

  it("trims last blitz task when count is odd in dual", () => {
    const file: QuestionsFile = {
      topics: [],
      blitzTasks: [{ items: [{ text: "W1", difficulty: 200 }] }, { items: [{ text: "W2", difficulty: 200 }] }, { items: [{ text: "W3", difficulty: 200 }] }],
    };
    const result = trimQuestionsFileForDual(file, "dual");
    expect(result.blitzTasks).toHaveLength(2);
  });

  it("leaves even counts unchanged in dual", () => {
    const file: QuestionsFile = {
      topics: [{ name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 100, acceptedAnswers: [] }] }],
      blitzTasks: [{ items: [{ text: "W1", difficulty: 200 }] }, { items: [{ text: "W2", difficulty: 200 }] }],
    };
    const result = trimQuestionsFileForDual(file, "dual");
    expect(result.topics[0]!.questions).toHaveLength(2);
    expect(result.blitzTasks).toHaveLength(2);
  });
});
