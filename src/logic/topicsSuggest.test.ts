import { describe, it, expect } from "vitest";
import { shouldAutoAdvance } from "./topicsSuggest";

describe("shouldAutoAdvance", () => {
  const onlinePlayers = ["alice", "bob", "carol"];

  it("false when no one contributed", () => {
    expect(shouldAutoAdvance(onlinePlayers, {}, [], 3)).toBe(false);
  });

  it("true when every online player filled topicCount", () => {
    const suggestions = {
      alice: ["a", "b", "c"],
      bob: ["a", "b", "c"],
      carol: ["a", "b", "c"],
    };
    expect(shouldAutoAdvance(onlinePlayers, suggestions, [], 3)).toBe(true);
  });

  it("true when every online player is in noIdeas", () => {
    expect(shouldAutoAdvance(onlinePlayers, {}, onlinePlayers, 3)).toBe(true);
  });

  it("true when mix of full and noIdeas covers everyone", () => {
    const suggestions = { alice: ["a", "b", "c"] };
    expect(shouldAutoAdvance(onlinePlayers, suggestions, ["bob", "carol"], 3)).toBe(true);
  });

  it("false when one player neither full nor noIdeas", () => {
    const suggestions = { alice: ["a", "b", "c"], bob: ["x"] };
    expect(shouldAutoAdvance(onlinePlayers, suggestions, ["carol"], 3)).toBe(false);
  });

  it("false when onlinePlayers is empty", () => {
    expect(shouldAutoAdvance([], {}, [], 3)).toBe(false);
  });
});
