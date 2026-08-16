import { describe, test, expect } from "vitest";
import { PatchMerger, PatchEntry } from "../src/patch-merger.ts";
import {
  isPatchTarget,
  composePatchTarget,
} from "../src/patch-writers/registry.ts";

describe("isPatchTarget", () => {
  test("a registered basename resolves a writer", () => {
    expect(isPatchTarget("backend/app.ts")).toBe(true);
  });

  test("a registered extension (.csproj) resolves a writer for a project-specific basename", () => {
    expect(isPatchTarget("dotnet/GeneratedApp.csproj")).toBe(true);
  });

  test("an unregistered target has no writer", () => {
    expect(isPatchTarget("src/random.txt")).toBe(false);
  });

  test("an extension-less basename yields an empty extension and no writer", () => {
    expect(isPatchTarget("some/Makefile")).toBe(false);
  });
});

describe("PatchEntry", () => {
  test("attaches section only when given", () => {
    expect(new PatchEntry({ target: ".env", content: "PORT=1\n" })).toEqual({
      target: ".env",
      content: "PORT=1\n",
    });
    expect(
      new PatchEntry({
        target: ".env",
        content: "PORT=1\n",
        section: "ENV_TS",
      }),
    ).toEqual({
      target: ".env",
      content: "PORT=1\n",
      section: "ENV_TS",
    });
  });

  test("nested .dockerignore targets keep the lane directory on target", () => {
    expect(
      new PatchEntry({
        target: "backend/typescript/.dockerignore",
        content: "# trigger",
        section: "DOCKERIGNORE_TYPESCRIPT",
      }),
    ).toEqual({
      target: "backend/typescript/.dockerignore",
      content: "# trigger",
      section: "DOCKERIGNORE_TYPESCRIPT",
    });
  });

  test("rejects empty content", () => {
    expect(() => new PatchEntry({ target: ".env", content: "" })).toThrow(
      /must be a non-empty string/,
    );
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
      merger.register(new PatchEntry({ target: "no.txt", content: "x" })),
    ).toThrow(/no PatchWriter for target 'no.txt'/);
  });

  test("apply writes each composed target in emit order", async () => {
    const writes = [];
    const merger = new PatchMerger({
      IWriter: async (path, content) => {
        writes.push({ path, content });
      },
    });
    merger.register(
      new PatchEntry({
        target: ".env",
        content: "PORT=1\n",
        section: "ENV_TS",
      }),
    );
    merger.register(
      new PatchEntry({
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
      IWriter: async (path, content) => {
        writes.push({ path, content });
      },
    });
    merger.register(
      new PatchEntry({
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
      IWriter: async (path, content) => {
        writes.push({ path, content });
      },
    });
    merger.register(
      new PatchEntry({
        target: "backend/typescript/.dockerignore",
        content: "#",
        section: "DOCKERIGNORE_TYPESCRIPT",
      }),
    );
    merger.register(
      new PatchEntry({
        target: "backend/rust/.dockerignore",
        content: "#",
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
