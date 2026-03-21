import { describe, it, expect } from "vitest";
import { parseTopicsResponse, parseQuestionsResponse, parseBlitzResponse } from "./aiConstructor";

// ─── parseTopicsResponse ──────────────────────────────────────────────────────

describe("parseTopicsResponse", () => {
  it("parses valid response", () => {
    const raw = JSON.stringify({
      topics: [
        { name: "Музыка", reason: "Популярная тема" },
        { name: "Кино", reason: "Предложена игроками" },
      ],
    });
    const result = parseTopicsResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Музыка");
    expect(result[1].reason).toBe("Предложена игроками");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseTopicsResponse("{bad}")).toThrow("невалидный JSON");
  });

  it("throws when topics missing", () => {
    expect(() => parseTopicsResponse('{"foo":[]}')).toThrow("topics");
  });

  it("throws when topic name empty", () => {
    const raw = JSON.stringify({ topics: [{ name: "", reason: "x" }] });
    expect(() => parseTopicsResponse(raw)).toThrow("name");
  });

  it("tolerates missing reason", () => {
    const raw = JSON.stringify({ topics: [{ name: "История" }] });
    const result = parseTopicsResponse(raw);
    expect(result[0].reason).toBe("");
  });
});

// ─── parseQuestionsResponse ───────────────────────────────────────────────────

describe("parseQuestionsResponse", () => {
  const validRaw = JSON.stringify({
    topics: [
      {
        name: "Музыка",
        questions: [
          {
            id: "q1",
            text: "Музыкальный инструмент не из дерева",
            difficulty: 160,
            hint: "Труба, флейта...",
            acceptedAnswers: ["Труба", "Флейта"],
          },
        ],
      },
    ],
  });

  it("parses valid response", () => {
    const result = parseQuestionsResponse(validRaw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Музыка");
    expect(result[0].questions[0].id).toBe("q1");
    expect(result[0].questions[0].difficulty).toBe(160);
    expect(result[0].questions[0].hint).toBe("Труба, флейта...");
    expect(result[0].questions[0].acceptedAnswers).toEqual(["Труба", "Флейта"]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseQuestionsResponse("not json")).toThrow("невалидный JSON");
  });

  it("throws when topics missing", () => {
    expect(() => parseQuestionsResponse('{"x":1}')).toThrow("topics");
  });

  it("throws when question text empty", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "", difficulty: 100 }] }],
    });
    expect(() => parseQuestionsResponse(raw)).toThrow("text");
  });

  it("fixes out-of-range difficulty to 100", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "Q", difficulty: 999 }] }],
    });
    const result = parseQuestionsResponse(raw);
    expect(result[0].questions[0].difficulty).toBe(100);
  });

  it("auto-generates id when missing", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ text: "Q", difficulty: 100 }] }],
    });
    const result = parseQuestionsResponse(raw);
    expect(result[0].questions[0].id).toBeTruthy();
  });

  it("omits hint and acceptedAnswers when absent", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "Q", difficulty: 100 }] }],
    });
    const result = parseQuestionsResponse(raw);
    expect(result[0].questions[0].hint).toBeUndefined();
    expect(result[0].questions[0].acceptedAnswers).toBeUndefined();
  });
});

// ─── parseBlitzResponse ───────────────────────────────────────────────────────

describe("parseBlitzResponse", () => {
  const validRaw = JSON.stringify({
    tasks: [
      {
        id: "b1",
        items: [
          { text: "Дом", difficulty: 200 },
          { text: "Влажность", difficulty: 300 },
          { text: "Цвет настроения", difficulty: 400 },
        ],
      },
    ],
  });

  it("parses valid response", () => {
    const result = parseBlitzResponse(validRaw);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b1");
    expect(result[0].items).toHaveLength(3);
    expect(result[0].items[0].text).toBe("Дом");
    expect(result[0].items[2].difficulty).toBe(400);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseBlitzResponse("{bad}")).toThrow("невалидный JSON");
  });

  it("throws when tasks missing", () => {
    expect(() => parseBlitzResponse('{"x":1}')).toThrow("tasks");
  });

  it("throws when items empty", () => {
    const raw = JSON.stringify({ tasks: [{ id: "b1", items: [] }] });
    expect(() => parseBlitzResponse(raw)).toThrow("items");
  });

  it("throws when item text empty", () => {
    const raw = JSON.stringify({ tasks: [{ id: "b1", items: [{ text: "", difficulty: 200 }] }] });
    expect(() => parseBlitzResponse(raw)).toThrow("text");
  });

  it("fixes out-of-range item difficulty to 200", () => {
    const raw = JSON.stringify({
      tasks: [{ id: "b1", items: [{ text: "Кот", difficulty: 999 }] }],
    });
    const result = parseBlitzResponse(raw);
    expect(result[0].items[0].difficulty).toBe(200);
  });

  it("auto-generates id when missing", () => {
    const raw = JSON.stringify({
      tasks: [{ items: [{ text: "Кот", difficulty: 200 }] }],
    });
    const result = parseBlitzResponse(raw);
    expect(result[0].id).toBeTruthy();
  });
});
