import { describe, it, expect } from "vitest";
import { generateRoomId, formatRoomId, parseRoomId } from "./roomId";

describe("roomId utilities", () => {
  describe("generateRoomId", () => {
    it("returns a 9-digit string", () => {
      const id = generateRoomId();
      expect(id).toMatch(/^\d{9}$/);
    });

    it("pads with leading zeros", () => {
      const id = generateRoomId();
      expect(id).toHaveLength(9);
    });
  });

  describe("formatRoomId", () => {
    it("formats 9-digit string as XXX-XXX-XXX", () => {
      expect(formatRoomId("123456789")).toBe("123-456-789");
    });

    it("formats shorter strings with dashes at correct positions", () => {
      expect(formatRoomId("12345")).toBe("123-45");
    });

    it("returns empty string for empty input", () => {
      expect(formatRoomId("")).toBe("");
    });
  });

  describe("parseRoomId", () => {
    it("strips non-digits", () => {
      expect(parseRoomId("123-456-789")).toBe("123456789");
    });

    it("strips letters and spaces", () => {
      expect(parseRoomId("12 3a4b5c6d7e8f9")).toBe("123456789");
    });

    it("truncates to 9 digits", () => {
      expect(parseRoomId("1234567890")).toBe("123456789");
    });

    it("returns empty for no digits", () => {
      expect(parseRoomId("abc")).toBe("");
    });
  });
});
