import { describe, it, expect } from "vitest";
import { isValidRoomId, buildRoomUrl } from "./hubUtils";

describe("isValidRoomId", () => {
  it("accepts valid alphanumeric ids", () => {
    expect(isValidRoomId("abcd")).toBe(true);
    expect(isValidRoomId("ABCD1234")).toBe(true);
    expect(isValidRoomId("a1b2c3d4efgh")).toBe(true);
  });

  it("accepts ids with hyphens and underscores", () => {
    expect(isValidRoomId("room-id_test")).toBe(true);
    expect(isValidRoomId("my_room-01")).toBe(true);
  });

  it("rejects ids shorter than 4 characters", () => {
    expect(isValidRoomId("abc")).toBe(false);
    expect(isValidRoomId("ab")).toBe(false);
    expect(isValidRoomId("")).toBe(false);
  });

  it("rejects ids with spaces or special characters", () => {
    expect(isValidRoomId("ab cd")).toBe(false);
    expect(isValidRoomId("abc!")).toBe(false);
    expect(isValidRoomId("ab.cd")).toBe(false);
    expect(isValidRoomId("ab/cd")).toBe(false);
  });
});

describe("buildRoomUrl", () => {
  it("builds URL with root base path", () => {
    expect(buildRoomUrl("abcd1234", "http://localhost:5173", "/")).toBe(
      "http://localhost:5173/abcd1234"
    );
  });

  it("builds URL with sub-path base (trailing slash)", () => {
    expect(buildRoomUrl("abcd1234", "https://example.com", "/loud-quiz/")).toBe(
      "https://example.com/loud-quiz/abcd1234"
    );
  });

  it("builds URL with sub-path base (no trailing slash)", () => {
    expect(buildRoomUrl("abcd1234", "https://example.com", "/loud-quiz")).toBe(
      "https://example.com/loud-quiz/abcd1234"
    );
  });

  it("handles empty base as root", () => {
    expect(buildRoomUrl("abcd1234", "https://example.com", "")).toBe(
      "https://example.com/abcd1234"
    );
  });
});
