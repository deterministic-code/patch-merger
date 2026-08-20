import { describe, expect, test } from "vitest";
import { Patch, type PatchOptions } from "../src/patch.ts";
import { LineUpsertWriter } from "../src/writers/line-upsert-writer.ts";

const writer = LineUpsertWriter;
const ctx = (failOnCollision = false) => ({ failOnCollision });
const patch = (content: string, options?: PatchOptions) =>
  new Patch({ target: ".env", content, ...(options ? { options } : {}) });

describe("LineUpsertWriter", () => {
  test("upserts env keys and unique lines", () => {
    expect(
      writer(
        [
          patch("PORT=1\nDEBUG=true\n"),
          patch("PORT=2\n"),
          patch("dist\n"),
          patch("*.log\n"),
        ],
        ctx(),
      ),
    ).toBe("PORT=2\nDEBUG=true\ndist\n*.log\n");
  });

  test("ignores blank lines and trims CRLF", () => {
    expect(writer([patch("\n\n")], ctx())).toBe("");
    expect(writer([patch("A=1\r\nB=2\r\n")], ctx())).toBe("A=1\nB=2\n");
  });

  test("failIfExists rejects a second line with the same key", () => {
    expect(() =>
      writer(
        [patch("PORT=1\n"), patch("PORT=2\n", { failIfExists: true })],
        ctx(),
      ),
    ).toThrow(/line already exists/);
  });

  test("failOnCollision rejects conflicting values and allows identical ones", () => {
    expect(() =>
      writer([patch("PORT=1\n"), patch("PORT=2\n")], ctx(true)),
    ).toThrow(/collision/);
    expect(
      writer([patch("PORT=1\n"), patch("PORT=1\n")], ctx(true)),
    ).toBe("PORT=1\n");
  });

  test("rejects a non-boolean failIfExists option", () => {
    expect(() =>
      writer(
        [
          patch("PORT=1\n", {
            // @ts-expect-error runtime guard
            failIfExists: "yes",
          }),
        ],
        ctx(),
      ),
    ).toThrow(/must be a boolean/);
  });

  test("compose of no patches is empty", () => {
    expect(writer([], ctx())).toBe("");
  });
});
