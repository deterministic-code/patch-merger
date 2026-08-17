import { describe, test, expect } from "vitest";
import { PatchMerger, Patch } from "../src/patch-merger.ts";

const patch = (fields) => new Patch(fields);
const add = (merger, fields) => merger.add(patch(fields));
const join = (patches) => patches.map((p) => p.content).join("");

const apply = async (pieces, register) => {
  const writes = [];
  const merger = new PatchMerger(async (path, content) => {
    writes.push({ path, content });
  });
  register?.(merger);
  for (const piece of pieces) add(merger, piece);
  return { written: await merger.apply("/root"), writes };
};

describe("Patch", () => {
  test("copies fields, keeps nested target, rejects empty content", () => {
    expect(patch({ target: ".env", content: "PORT=1\n" })).toEqual({
      target: ".env",
      content: "PORT=1\n",
    });
    expect(
      patch({
        target: ".env",
        content: "PORT=1\n",
        section: "ENV_TS",
      }),
    ).toEqual({
      target: ".env",
      content: "PORT=1\n",
      section: "ENV_TS",
    });
    expect(
      patch({
        target: "backend/typescript/.dockerignore",
        content: "# trigger",
        section: "DOCKERIGNORE_TYPESCRIPT",
      }),
    ).toEqual({
      target: "backend/typescript/.dockerignore",
      content: "# trigger",
      section: "DOCKERIGNORE_TYPESCRIPT",
    });
    expect(() => patch({ target: ".env", content: "" })).toThrow(
      /must be a non-empty string/,
    );
  });
});

describe("PatchMerger.add", () => {
  test("resolves registered basename/extension; rejects unknown targets", () => {
    const merger = new PatchMerger();
    expect(() =>
      add(merger, { target: "backend/app.ts", content: "x" }),
    ).not.toThrow();
    expect(() =>
      add(merger, { target: "dotnet/GeneratedApp.csproj", content: "x" }),
    ).not.toThrow();
    expect(() =>
      add(merger, { target: "src/random.txt", content: "x" }),
    ).toThrow(/no PatchWriter for target 'src\/random.txt'/);
    expect(() =>
      add(merger, { target: "some/Makefile", content: "x" }),
    ).toThrow(/no PatchWriter/);
  });
});

describe("PatchMerger.registerWriter", () => {
  test("basename and extension keys are instance-local and used by apply", async () => {
    const a = new PatchMerger();
    a.registerWriter("Makefile", join);
    expect(() =>
      add(a, { target: "some/Makefile", content: "x" }),
    ).not.toThrow();

    const b = new PatchMerger();
    b.registerWriter(".txt", join);
    expect(() =>
      add(b, { target: "src/random.txt", content: "x" }),
    ).not.toThrow();
    expect(() => add(b, { target: "Makefile", content: "x" })).toThrow(
      /no PatchWriter/,
    );

    const { written, writes } = await apply(
      [{ target: "notes.md", content: "hello\n" }],
      (m) => m.registerWriter("notes.md", join),
    );
    expect(written).toEqual(["notes.md"]);
    expect(writes[0].content).toBe("hello\n");
  });
});

describe("PatchMerger.apply", () => {
  test("writes composed targets; skips null; remaps nested dockerignore to root", async () => {
    const env = await apply([
      { target: ".env", content: "PORT=1\n", section: "ENV_TS" },
      {
        target: ".env",
        content: "DATABASE_BACKEND=sqlite\n",
        section: "DB_ENV",
      },
    ]);
    expect(env.written).toEqual([".env"]);
    expect(env.writes).toHaveLength(1);
    expect(env.writes[0].path.endsWith(".env")).toBe(true);
    expect(env.writes[0].content).toContain("PORT=1");
    expect(env.writes[0].content).toContain("DATABASE_BACKEND=sqlite");

    const skipped = await apply([
      {
        target: ".env",
        content: "DATABASE_BACKEND=sqlite\n",
        section: "DB_ENV",
      },
    ]);
    expect(skipped.written).toEqual([]);
    expect(skipped.writes).toHaveLength(0);

    const empty = await apply([]);
    expect(empty.written).toEqual([]);
    expect(empty.writes).toEqual([]);

    const docker = await apply([
      {
        target: "backend/typescript/.dockerignore",
        content: "backend/typescript/node_modules\nbackend/typescript/dist",
        section: "DOCKERIGNORE_TYPESCRIPT",
      },
      {
        target: "backend/rust/.dockerignore",
        content: "backend/rust/target",
        section: "DOCKERIGNORE_RUST",
      },
    ]);
    expect(docker.written).toEqual([".dockerignore"]);
    expect(docker.writes[0].path.endsWith(".dockerignore")).toBe(true);
    expect(docker.writes[0].path.includes("typescript")).toBe(false);
    for (const line of [
      ".git",
      ".env.local",
      "*.log",
      "*.sqlite",
      "*.sqlite3",
      "*.db",
      "backend/typescript/node_modules",
      "backend/typescript/dist",
      "backend/rust/target",
    ]) {
      expect(docker.writes[0].content).toContain(line);
    }
  });
});
