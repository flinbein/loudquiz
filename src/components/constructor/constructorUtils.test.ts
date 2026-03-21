import { describe, it, expect } from "vitest";
import {
  validateQuestion,
  validateBlitzItem,
  validateBlitzTask,
  importJson,
  exportJson,
  emptyQuestion,
  emptyBlitzTask,
  emptyBlitzItem,
} from "./constructorUtils";
import type { QuestionsFile } from "../../game/types";

// ─── validateQuestion ─────────────────────────────────────────────────────────

describe("validateQuestion", () => {
  it("passes for valid question", () => {
    const q = { ...emptyQuestion(), text: "Назови фрукт", difficulty: 100 };
    expect(validateQuestion(q)).toHaveLength(0);
  });

  it("fails for empty text", () => {
    const q = { ...emptyQuestion(), text: "", difficulty: 100 };
    expect(validateQuestion(q).some((e) => e.field === "text")).toBe(true);
  });

  it("fails for whitespace-only text", () => {
    const q = { ...emptyQuestion(), text: "   ", difficulty: 100 };
    expect(validateQuestion(q).some((e) => e.field === "text")).toBe(true);
  });

  it("fails for difficulty below 100", () => {
    const q = { ...emptyQuestion(), text: "Q", difficulty: 90 };
    expect(validateQuestion(q).some((e) => e.field === "difficulty")).toBe(true);
  });

  it("fails for difficulty above 200", () => {
    const q = { ...emptyQuestion(), text: "Q", difficulty: 210 };
    expect(validateQuestion(q).some((e) => e.field === "difficulty")).toBe(true);
  });

  it("fails for difficulty not multiple of 10", () => {
    const q = { ...emptyQuestion(), text: "Q", difficulty: 115 };
    expect(validateQuestion(q).some((e) => e.field === "difficulty")).toBe(true);
  });

  it("passes for all valid difficulties 100–200 step 10", () => {
    for (let d = 100; d <= 200; d += 10) {
      const q = { ...emptyQuestion(), text: "Q", difficulty: d };
      expect(validateQuestion(q)).toHaveLength(0);
    }
  });
});

// ─── validateBlitzItem ────────────────────────────────────────────────────────

describe("validateBlitzItem", () => {
  it("passes for valid item", () => {
    const item = { ...emptyBlitzItem(), text: "Мороженое", difficulty: 200 };
    expect(validateBlitzItem(item)).toHaveLength(0);
  });

  it("fails for empty text", () => {
    const item = { ...emptyBlitzItem(), text: "", difficulty: 200 };
    expect(validateBlitzItem(item).some((e) => e.field === "text")).toBe(true);
  });

  it("fails for difficulty below 200", () => {
    const item = { ...emptyBlitzItem(), text: "x", difficulty: 190 };
    expect(validateBlitzItem(item).some((e) => e.field === "difficulty")).toBe(true);
  });

  it("fails for difficulty above 400", () => {
    const item = { ...emptyBlitzItem(), text: "x", difficulty: 410 };
    expect(validateBlitzItem(item).some((e) => e.field === "difficulty")).toBe(true);
  });

  it("fails for difficulty not multiple of 10", () => {
    const item = { ...emptyBlitzItem(), text: "x", difficulty: 255 };
    expect(validateBlitzItem(item).some((e) => e.field === "difficulty")).toBe(true);
  });

  it("passes for all valid difficulties 200–400 step 10", () => {
    for (let d = 200; d <= 400; d += 10) {
      expect(validateBlitzItem({ text: "x", difficulty: d })).toHaveLength(0);
    }
  });
});

// ─── validateBlitzTask ────────────────────────────────────────────────────────

describe("validateBlitzTask", () => {
  it("passes for task with items", () => {
    const t = { ...emptyBlitzTask(), items: [{ text: "Дом", difficulty: 200 }] };
    expect(validateBlitzTask(t)).toHaveLength(0);
  });

  it("fails for empty items array", () => {
    const t = { ...emptyBlitzTask(), items: [] };
    expect(validateBlitzTask(t).some((e) => e.field === "items")).toBe(true);
  });

  it("fails when items is missing", () => {
    const t = { id: "b1" } as Partial<import("../../game/types").BlitzTask>;
    expect(validateBlitzTask(t).some((e) => e.field === "items")).toBe(true);
  });
});

// ─── importJson / exportJson ──────────────────────────────────────────────────

const SAMPLE: QuestionsFile = {
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
  blitzTasks: [
    {
      id: "b1",
      items: [
        { text: "Дом", difficulty: 200 },
        { text: "Влажность", difficulty: 300 },
        { text: "Цвет настроения", difficulty: 400 },
      ],
    },
  ],
};

describe("exportJson → importJson roundtrip", () => {
  it("produces identical data", () => {
    const json = exportJson(SAMPLE);
    const { data, warnings } = importJson(json);
    expect(warnings).toHaveLength(0);
    expect(data.topics).toHaveLength(1);
    expect(data.topics[0].name).toBe("Музыка");
    expect(data.topics[0].questions[0].id).toBe("q1");
    expect(data.topics[0].questions[0].difficulty).toBe(160);
    expect(data.topics[0].questions[0].hint).toBe("Труба, флейта...");
    expect(data.topics[0].questions[0].acceptedAnswers).toEqual(["Труба", "Флейта"]);
    expect(data.blitzTasks).toHaveLength(1);
    expect(data.blitzTasks![0].items).toHaveLength(3);
    expect(data.blitzTasks![0].items[0].text).toBe("Дом");
    expect(data.blitzTasks![0].items[1].difficulty).toBe(300);
  });

  it("exports valid JSON string", () => {
    expect(() => JSON.parse(exportJson(SAMPLE))).not.toThrow();
  });
});

describe("importJson", () => {
  it("throws on invalid JSON", () => {
    expect(() => importJson("{not valid}")).toThrow();
  });

  it("throws when topics field missing", () => {
    expect(() => importJson('{"foo": []}')).toThrow(/topics/);
  });

  it("throws when topics is not an array", () => {
    expect(() => importJson('{"topics": "nope"}')).toThrow();
  });

  it("throws when question text is empty", () => {
    const bad = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "", difficulty: 100 }] }],
    });
    expect(() => importJson(bad)).toThrow(/text/);
  });

  it("auto-generates missing question id with warning", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ text: "Q", difficulty: 100 }] }],
    });
    const { data, warnings } = importJson(raw);
    expect(data.topics[0].questions[0].id).toBeTruthy();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("fixes out-of-range difficulty with warning", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "Q", difficulty: 999 }] }],
    });
    const { data, warnings } = importJson(raw);
    expect(data.topics[0].questions[0].difficulty).toBe(100);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("ignores blitzTasks field if absent", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "Q", difficulty: 100 }] }],
    });
    const { data } = importJson(raw);
    expect(data.blitzTasks).toBeUndefined();
  });

  it("throws when blitzTask items is empty array", () => {
    const bad = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "Q", difficulty: 100 }] }],
      blitzTasks: [{ id: "b1", items: [] }],
    });
    expect(() => importJson(bad)).toThrow(/items/);
  });

  it("throws when blitzTask item text is empty", () => {
    const bad = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "Q", difficulty: 100 }] }],
      blitzTasks: [{ id: "b1", items: [{ text: "", difficulty: 200 }] }],
    });
    expect(() => importJson(bad)).toThrow(/text/);
  });

  it("parses blitzTasks with items correctly", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "Вопрос", difficulty: 100 }] }],
      blitzTasks: [{ id: "b1", items: [{ text: "Кот", difficulty: 200 }, { text: "Влажность", difficulty: 300 }] }],
    });
    const { data } = importJson(raw);
    expect(data.blitzTasks![0].items[0].text).toBe("Кот");
    expect(data.blitzTasks![0].items[1].text).toBe("Влажность");
  });

  it("fixes out-of-range item difficulty with warning", () => {
    const raw = JSON.stringify({
      topics: [{ name: "T", questions: [{ id: "q1", text: "Q", difficulty: 100 }] }],
      blitzTasks: [{ id: "b1", items: [{ text: "Кот", difficulty: 999 }] }],
    });
    const { data, warnings } = importJson(raw);
    expect(data.blitzTasks![0].items[0].difficulty).toBe(200);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
