import { describe, test, expect } from "vitest";
import {
  MarkedSectionMissingError,
  indentBody,
  replaceMarkedBlockText,
} from "../src/common/marked-sections.ts";

describe("MarkedSectionMissingError", () => {
  test("carries its own name so callers can instanceof-narrow it", () => {
    const err = new MarkedSectionMissingError("markers gone");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("MarkedSectionMissingError");
    expect(err.message).toBe("markers gone");
  });
});

describe("indentBody", () => {
  test("empty block yields empty string", () => {
    expect(indentBody("", "  ")).toBe("");
  });

  test("block that is only a trailing newline yields empty string", () => {
    expect(indentBody("\n", "  ")).toBe("");
  });

  test("dedents to common indent then re-indents by the given prefix", () => {
    expect(indentBody("    foo\n    bar", "  ")).toBe("  foo\n  bar");
  });

  test("a zero-indent line pins minIndent to 0 so no dedent happens before re-indent", () => {
    expect(indentBody("foo\n    bar", "  ")).toBe("  foo\n      bar");
  });

  test("an all-whitespace line does not count toward the common indent", () => {
    expect(indentBody("    foo\n   \n    bar", ">>")).toBe(">>foo\n\n>>bar");
  });

  test("blank interior lines stay blank and are not indented", () => {
    expect(indentBody("  a\n\n  b", "--")).toBe("--a\n\n--b");
  });
});

describe("replaceMarkedBlockText", () => {
  const START = "// === BEGIN X ===";
  const END = "// === END X ===";

  test("replaces the region between markers, preserving the start-line indent", () => {
    const original = `pre\n    ${START}\nold\n    ${END}\npost`;
    const out = replaceMarkedBlockText(original, START, END, "new line");
    expect(out).toContain(`${START}\n    new line\n    ${END}`);
    expect(out).toContain("pre\n");
    expect(out).toContain("post");
  });

  test("an empty block collapses the region to just the markers", () => {
    const original = `${START}\nold\n${END}`;
    const out = replaceMarkedBlockText(original, START, END, "");
    expect(out).toBe(`${START}\n${END}`);
  });

  test("throws MarkedSectionMissingError when a marker is absent", () => {
    expect(() =>
      replaceMarkedBlockText("no markers here", START, END, "x"),
    ).toThrow(MarkedSectionMissingError);
  });

  test("throws when the end marker precedes the start marker", () => {
    const original = `${END}\nbody\n${START}`;
    expect(() =>
      replaceMarkedBlockText(original, START, END, "x"),
    ).toThrow(/absent or out of order/);
  });
});
