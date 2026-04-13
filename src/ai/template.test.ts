import { describe, it, expect } from "vitest";
import { renderTemplate } from "./template";

describe("renderTemplate", () => {
  it("replaces a single variable", () => {
    expect(renderTemplate("Hello {{name}}!", { name: "World" }))
      .toBe("Hello World!");
  });

  it("replaces multiple different variables", () => {
    expect(renderTemplate("{{a}} and {{b}}", { a: "1", b: "2" }))
      .toBe("1 and 2");
  });

  it("replaces multiple occurrences of the same variable", () => {
    expect(renderTemplate("{{x}} + {{x}}", { x: "y" }))
      .toBe("y + y");
  });

  it("leaves unknown variables as-is", () => {
    expect(renderTemplate("{{known}} {{unknown}}", { known: "yes" }))
      .toBe("yes {{unknown}}");
  });

  it("returns template unchanged when vars is empty", () => {
    expect(renderTemplate("no {{vars}} here", {}))
      .toBe("no {{vars}} here");
  });
});
