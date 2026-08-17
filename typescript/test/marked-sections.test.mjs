import { describe, test, expect } from "vitest";
import {
  MarkedSectionMissingError,
  indentBody,
  insertAfter,
  append,
  replaceMarkedBlockText,
  replaceMarkedSection,
} from "../src/common/marked-sections.ts";

describe("MarkedSectionMissingError", () => {
  test("is an Error with a distinguishable name", () => {
    const err = new MarkedSectionMissingError("markers gone");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("MarkedSectionMissingError");
    expect(err.message).toBe("markers gone");
  });
});

describe("indentBody", () => {
  test("empty/whitespace collapse; dedent then re-indent; blanks stay blank", () => {
    expect(indentBody("", "  ")).toBe("");
    expect(indentBody("\n", "  ")).toBe("");
    expect(indentBody("    foo\n    bar", "  ")).toBe("  foo\n  bar");
    expect(indentBody("foo\n    bar", "  ")).toBe("  foo\n      bar");
    expect(indentBody("    foo\n   \n    bar", ">>")).toBe(">>foo\n\n>>bar");
    expect(indentBody("  a\n\n  b", "--")).toBe("--a\n\n--b");
  });
});

describe("replaceMarkedBlockText", () => {
  const START = "// === BEGIN X ===";
  const END = "// === END X ===";

  test("replaces or collapses the marked region; missing/out-of-order markers throw", () => {
    const out = replaceMarkedBlockText(
      `pre\n    ${START}\nold\n    ${END}\npost`,
      START,
      END,
      "new line",
    );
    expect(out).toContain(`${START}\n    new line\n    ${END}`);
    expect(out).toContain("pre\n");
    expect(out).toContain("post");
    expect(replaceMarkedBlockText(`${START}\nold\n${END}`, START, END, "")).toBe(
      `${START}\n${END}`,
    );
    expect(() =>
      replaceMarkedBlockText("no markers here", START, END, "x"),
    ).toThrow(MarkedSectionMissingError);
    expect(() =>
      replaceMarkedBlockText(`${END}\nbody\n${START}`, START, END, "x"),
    ).toThrow(/absent or out of order/);
  });
});

describe("append / insertAfter / replaceMarkedSection", () => {
  const START = "// === BEGIN X ===";
  const END = "// === END X ===";

  test("append joins with a separating newline; insertAfter uses the last needle", () => {
    expect(append("base", "")).toBe("base");
    expect(append("header:", "PORT=1")).toBe("header:\nPORT=1\n");
    expect(
      insertAfter("COPY a a\nCOPY b b\nRUN x\n", "COPY b b", "COPY c c"),
    ).toBe("COPY a a\nCOPY b b\nCOPY c c\nRUN x\n");
  });

  test("replaceMarkedSection fills by name, or null when missing", () => {
    const content = `${START}\nold\n${END}`;
    expect(replaceMarkedSection(content, "X", "new")).toContain("new");
    expect(replaceMarkedSection(content, "NOPE", "new")).toBe(null);
  });
});
