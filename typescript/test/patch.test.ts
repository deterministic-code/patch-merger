import { describe, expect, test } from "vitest";
import { Patch } from "../src/patch.ts";

describe("Patch", () => {
  test("freezes target, content, and options", () => {
    const patch = new Patch({
      target: ".env",
      content: "PORT=1\n",
      options: { failIfExists: false },
    });
    expect(patch).toEqual({
      target: ".env",
      content: "PORT=1\n",
      options: { failIfExists: false },
    });
    expect(Object.isFrozen(patch)).toBe(true);
    expect(Object.isFrozen(patch.options)).toBe(true);
  });

  test("omits options when they are not provided", () => {
    const patch = new Patch({ target: ".env", content: "A=1\n" });
    expect(patch).toEqual({ target: ".env", content: "A=1\n" });
    expect(patch.options).toBeUndefined();
  });

  test("rejects empty content", () => {
    expect(() => new Patch({ target: ".env", content: "" })).toThrow(
      /must be a non-empty string/,
    );
  });
});
