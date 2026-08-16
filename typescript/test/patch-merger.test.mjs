import { describe, test, expect } from "vitest";
import {
  PatchMerger,
  isPatchTarget,
  composePatchTarget,
  makePatchEntry,
  formatPatchEntryLine,
  parsePatchEntryLine,
  PATCH_ENTRY_LINE_PREFIX,
} from "../src/patch-merger.ts";
import { patchWriterFor } from "../src/patch-writers/registry.ts";
import { DOCKERIGNORE_TRIGGER } from "../src/patch-writers/dockerignore-writer.ts";

const line = (obj) => `${PATCH_ENTRY_LINE_PREFIX}${JSON.stringify(obj)}\n`;

describe("isPatchTarget / patchWriterFor", () => {
  test("a registered basename resolves a writer", () => {
    expect(isPatchTarget("backend/app.ts")).toBe(true);
    expect(patchWriterFor("backend/app.ts")).toBeTypeOf("function");
  });

  test("a registered extension (.csproj) resolves a writer for a project-specific basename", () => {
    expect(isPatchTarget("dotnet/GeneratedApp.csproj")).toBe(true);
    expect(patchWriterFor("dotnet/GeneratedApp.csproj")).toBeTypeOf("function");
  });

  test("an unregistered target has no writer", () => {
    expect(isPatchTarget("src/random.txt")).toBe(false);
    expect(patchWriterFor("src/random.txt")).toBeNull();
  });

  test("an extension-less basename yields an empty extension and no writer", () => {
    expect(isPatchTarget("some/Makefile")).toBe(false);
    expect(patchWriterFor("some/Makefile")).toBeNull();
  });
});

describe("makePatchEntry", () => {
  test("builds a frozen-shape entry, attaching section only when given", () => {
    expect(makePatchEntry({ target: ".env", content: "PORT=1\n" })).toEqual({
      kind: "patch",
      target: ".env",
      content: "PORT=1\n",
    });
    expect(
      makePatchEntry({
        target: ".env",
        content: "PORT=1\n",
        section: "ENV_TS",
      }),
    ).toEqual({
      kind: "patch",
      target: ".env",
      content: "PORT=1\n",
      section: "ENV_TS",
    });
  });

  test("nested .dockerignore targets keep the lane directory on target", () => {
    expect(
      makePatchEntry({
        target: "backend/typescript/.dockerignore",
        content: "# trigger",
        section: "DOCKERIGNORE_TYPESCRIPT",
      }),
    ).toEqual({
      kind: "patch",
      target: "backend/typescript/.dockerignore",
      content: "# trigger",
      section: "DOCKERIGNORE_TYPESCRIPT",
    });
  });

  test("rejects empty content", () => {
    expect(() => makePatchEntry({ target: ".env", content: "" })).toThrow(
      /must be a non-empty string/,
    );
  });
});

describe("formatPatchEntryLine / parsePatchEntryLine", () => {
  test("round-trips a valid entry", () => {
    const entry = makePatchEntry({ target: ".env", content: "PORT=1\n" });
    const parsed = parsePatchEntryLine(formatPatchEntryLine(entry));
    expect(parsed).toEqual(entry);
  });

  test("returns null for a line without the patch prefix", () => {
    expect(parsePatchEntryLine("just some text\n")).toBeNull();
  });

  test("rejects a null payload", () => {
    expect(() => parsePatchEntryLine(line(null))).toThrow(
      /invalid patch entry/,
    );
  });

  test("rejects a non-object payload", () => {
    expect(() => parsePatchEntryLine(line(5))).toThrow(/invalid patch entry/);
  });

  test("rejects a wrong kind", () => {
    expect(() =>
      parsePatchEntryLine(line({ kind: "x", target: "a", content: "b" })),
    ).toThrow(/invalid patch entry/);
  });

  test("rejects a non-string target", () => {
    expect(() =>
      parsePatchEntryLine(line({ kind: "patch", target: 5, content: "b" })),
    ).toThrow(/invalid patch entry/);
  });

  test("rejects a non-string content", () => {
    expect(() =>
      parsePatchEntryLine(line({ kind: "patch", target: "a", content: 5 })),
    ).toThrow(/invalid patch entry/);
  });

  test("rejects a non-string section", () => {
    expect(() =>
      parsePatchEntryLine(
        line({ kind: "patch", target: "a", content: "b", section: 5 }),
      ),
    ).toThrow(/invalid patch entry section/);
  });

  test("rejects an unexpected key on the frozen shape", () => {
    expect(() =>
      parsePatchEntryLine(
        line({ kind: "patch", target: "a", content: "b", extra: 1 }),
      ),
    ).toThrow(/unexpected key "extra"/);
  });
});

describe("composePatchTarget", () => {
  test("throws when the target has no registered writer", () => {
    expect(() =>
      composePatchTarget({ target: "src/random.txt", pieces: [] }),
    ).toThrow(/no writer for 'src\/random\.txt'/);
  });
});

describe("PatchMerger — in-memory apply via an injected writer", () => {
  test("register rejects a target with no writer", () => {
    const merger = new PatchMerger();
    expect(() =>
      merger.register({ kind: "patch", target: "no.txt", content: "x" }),
    ).toThrow(/no PatchWriter for target 'no.txt'/);
  });

  test("apply writes each composed target in emit order", async () => {
    const writes = [];
    const merger = new PatchMerger({
      writeTextFile: async (path, content) => {
        writes.push({ path, content });
      },
    });
    merger.register(
      makePatchEntry({
        target: ".env",
        content: "PORT=1\n",
        section: "ENV_TS",
      }),
    );
    merger.register(
      makePatchEntry({
        target: ".env",
        content: "DATABASE_BACKEND=sqlite\n",
        section: "DB_ENV",
      }),
    );
    const written = await merger.apply("/root");
    expect(written).toEqual([".env"]);
    expect(writes).toHaveLength(1);
    expect(writes[0].path.endsWith(".env")).toBe(true);
    expect(writes[0].content).toContain("PORT=1");
    expect(writes[0].content).toContain("DATABASE_BACKEND=sqlite");
  });

  test("apply skips a target whose pieces do not materialize (composed === null)", async () => {
    const writes = [];
    const merger = new PatchMerger({
      writeTextFile: async (path, content) => {
        writes.push({ path, content });
      },
    });
    merger.register(
      makePatchEntry({
        target: ".env",
        content: "DATABASE_BACKEND=sqlite\n",
        section: "DB_ENV",
      }),
    );
    const written = await merger.apply("/root");
    expect(written).toEqual([]);
    expect(writes).toHaveLength(0);
  });

  test("nested .dockerignore pieces compose into the root file", async () => {
    const writes = [];
    const merger = new PatchMerger({
      writeTextFile: async (path, content) => {
        writes.push({ path, content });
      },
    });
    merger.register(
      makePatchEntry({
        target: "backend/typescript/.dockerignore",
        content: DOCKERIGNORE_TRIGGER,
        section: "DOCKERIGNORE_TYPESCRIPT",
      }),
    );
    merger.register(
      makePatchEntry({
        target: "backend/rust/.dockerignore",
        content: DOCKERIGNORE_TRIGGER,
        section: "DOCKERIGNORE_RUST",
      }),
    );
    const written = await merger.apply("/root");
    expect(written).toEqual([".dockerignore"]);
    expect(writes).toHaveLength(1);
    expect(writes[0].path.endsWith(".dockerignore")).toBe(true);
    expect(writes[0].path.includes("typescript")).toBe(false);
    expect(writes[0].content).toContain("backend/typescript/node_modules");
    expect(writes[0].content).toContain("backend/rust/target");
  });
});
