import { describe, test, expect } from "vitest";
import { PatchMerger, Patch } from "../src/patch-merger.ts";

describe("PatchMerger.add", () => {
  test("a registered basename resolves a writer", () => {
    const merger = new PatchMerger();
    expect(() =>
      merger.add(new Patch({ target: "backend/app.ts", content: "x" })),
    ).not.toThrow();
  });

  test("a registered extension (.csproj) resolves a writer for a project-specific basename", () => {
    const merger = new PatchMerger();
    expect(() =>
      merger.add(
        new Patch({ target: "dotnet/GeneratedApp.csproj", content: "x" }),
      ),
    ).not.toThrow();
  });

  test("an unregistered target has no writer", () => {
    const merger = new PatchMerger();
    expect(() =>
      merger.add(new Patch({ target: "src/random.txt", content: "x" })),
    ).toThrow(/no PatchWriter for target 'src\/random.txt'/);
  });

  test("an extension-less basename yields no writer", () => {
    const merger = new PatchMerger();
    expect(() =>
      merger.add(new Patch({ target: "some/Makefile", content: "x" })),
    ).toThrow(/no PatchWriter/);
  });
});

describe("PatchMerger.registerWriter", () => {
  test("a basename key lets add accept that target", () => {
    const merger = new PatchMerger();
    merger.registerWriter("Makefile", (patches) => patches.map((p) => p.content).join(""));
    expect(() =>
      merger.add(new Patch({ target: "some/Makefile", content: "x" })),
    ).not.toThrow();
  });

  test("an extension key matches any basename with that suffix", () => {
    const merger = new PatchMerger();
    merger.registerWriter(".txt", (patches) => patches.map((p) => p.content).join(""));
    expect(() =>
      merger.add(new Patch({ target: "src/random.txt", content: "x" })),
    ).not.toThrow();
  });

  test("apply uses the registered composer", async () => {
    const writes = [];
    const merger = new PatchMerger(async (path, content) => {
      writes.push({ path, content });
    });
    merger.registerWriter("notes.md", (patches) =>
      patches.map((p) => p.content).join(""),
    );
    merger.add(new Patch({ target: "notes.md", content: "hello\n" }));
    const written = await merger.apply("/root");
    expect(written).toEqual(["notes.md"]);
    expect(writes[0].content).toBe("hello\n");
  });

  test("does not leak onto other PatchMerger instances", () => {
    const a = new PatchMerger();
    a.registerWriter("Makefile", () => "x");
    const b = new PatchMerger();
    expect(() =>
      b.add(new Patch({ target: "Makefile", content: "x" })),
    ).toThrow(/no PatchWriter/);
  });
});

describe("Patch", () => {
  test("attaches section only when given", () => {
    expect(new Patch({ target: ".env", content: "PORT=1\n" })).toEqual({
      target: ".env",
      content: "PORT=1\n",
    });
    expect(
      new Patch({
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
      new Patch({
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
    expect(() => new Patch({ target: ".env", content: "" })).toThrow(
      /must be a non-empty string/,
    );
  });
});

describe("PatchMerger — in-memory apply via an injected writer", () => {
  test("add rejects a target with no writer", () => {
    const merger = new PatchMerger();
    expect(() =>
      merger.add(new Patch({ target: "no.txt", content: "x" })),
    ).toThrow(/no PatchWriter for target 'no.txt'/);
  });

  test("apply writes each composed target in emit order", async () => {
    const writes = [];
    const merger = new PatchMerger(async (path, content) => {
      writes.push({ path, content });
    });
    merger.add(
      new Patch({
        target: ".env",
        content: "PORT=1\n",
        section: "ENV_TS",
      }),
    );
    merger.add(
      new Patch({
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
    const merger = new PatchMerger(async (path, content) => {
      writes.push({ path, content });
    });
    merger.add(
      new Patch({
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
    const merger = new PatchMerger(async (path, content) => {
      writes.push({ path, content });
    });
    merger.add(
      new Patch({
        target: "backend/typescript/.dockerignore",
        content: "backend/typescript/node_modules",
        section: "DOCKERIGNORE_TYPESCRIPT",
      }),
    );
    merger.add(
      new Patch({
        target: "backend/rust/.dockerignore",
        content: "backend/rust/target",
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
