import { describe, it, expect } from "vitest";
import { normalizeBlitzAnswer, checkBlitzAnswer } from "./blitzCheck";

describe("normalizeBlitzAnswer", () => {
  it("lowercases", () => {
    expect(normalizeBlitzAnswer("Коза")).toBe("коза");
  });

  it("treats ё and е equivalently", () => {
    expect(normalizeBlitzAnswer("Козлёнок")).toBe(normalizeBlitzAnswer("Козленок"));
  });

  it("strips whitespace and punctuation", () => {
    expect(normalizeBlitzAnswer("крем-брюле")).toBe("крембрюле");
    expect(normalizeBlitzAnswer("крем брюле")).toBe("крембрюле");
    expect(normalizeBlitzAnswer("крем  брюле!!")).toBe("крембрюле");
  });

  it("handles empty string", () => {
    expect(normalizeBlitzAnswer("")).toBe("");
    expect(normalizeBlitzAnswer("   ---   ")).toBe("");
  });
});

describe("checkBlitzAnswer", () => {
  it("accepts exact match", () => {
    expect(checkBlitzAnswer("Коза", ["Коза"])).toBe(true);
  });

  it("accepts normalized match", () => {
    expect(checkBlitzAnswer("крем-брюле", ["Крем брюле"])).toBe(true);
    expect(checkBlitzAnswer("КОЗЛЕНОК", ["Козлёнок"])).toBe(true);
  });

  it("rejects wrong answer", () => {
    expect(checkBlitzAnswer("Корова", ["Коза"])).toBe(false);
  });

  it("rejects empty answer", () => {
    expect(checkBlitzAnswer("", ["Коза"])).toBe(false);
    expect(checkBlitzAnswer("   ", ["Коза"])).toBe(false);
  });

  it("checks multiple accepted variants", () => {
    expect(checkBlitzAnswer("Foo", ["Bar", "Foo", "Baz"])).toBe(true);
  });
});
