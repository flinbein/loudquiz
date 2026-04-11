import { describe, it, expect } from "vitest";
import { EMOJI_POOL, getRandomEmoji, getShortName } from "./emojiPool";

describe("emojiPool", () => {
  describe("EMOJI_POOL", () => {
    it("contains at least 200 emojis", () => {
      expect(EMOJI_POOL.length).toBeGreaterThanOrEqual(200);
    });

    it("has no duplicates", () => {
      const unique = new Set(EMOJI_POOL);
      expect(unique.size).toBe(EMOJI_POOL.length);
    });
  });

  describe("getRandomEmoji", () => {
    it("returns an emoji from the pool", () => {
      const emoji = getRandomEmoji([]);
      expect(EMOJI_POOL).toContain(emoji);
    });

    it("excludes occupied emojis", () => {
      const occupied = EMOJI_POOL.slice(0, EMOJI_POOL.length - 1);
      const emoji = getRandomEmoji(occupied);
      expect(emoji).toBe(EMOJI_POOL[EMOJI_POOL.length - 1]);
    });

    it("returns from full pool if all occupied", () => {
      const emoji = getRandomEmoji([...EMOJI_POOL]);
      expect(EMOJI_POOL).toContain(emoji);
    });
  });

  describe("getShortName", () => {
    it("returns initials for multi-word names", () => {
      expect(getShortName("Алексей Петров")).toBe("АП");
    });

    it("returns first 3 chars for single-word names", () => {
      expect(getShortName("Маша")).toBe("МАШ");
    });

    it("strips special characters", () => {
      expect(getShortName("Алексей!!! Петров???")).toBe("АП");
    });

    it("handles single character name", () => {
      expect(getShortName("А")).toBe("А");
    });
  });
});
