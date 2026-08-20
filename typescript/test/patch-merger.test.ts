import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  IPatchFileSystemApplyStrategy,
  type IPatchApplyStrategy,
} from "../src/apply-strategy.ts";
import { defaultWriters } from "../src/default-writers.ts";
import { Patch } from "../src/patch.ts";
import { PatchMerger } from "../src/patch-merger.ts";
import type { Writer } from "../src/writer.ts";

const joinWriter: Writer = (patches) =>
  patches.map((patch) => patch.content).join("");

const skipWriter: Writer = () => null;

const recordingStrategy = (): IPatchApplyStrategy & {
  writes: { path: string; content: string }[];
} => {
  const writes: { path: string; content: string }[] = [];
  return {
    writes,
    apply: async (target, contents, rootDir) => {
      writes.push({ path: join(rootDir, target), content: contents });
    },
  };
};

describe("PatchMerger.add", () => {
  test("uses default globs and rejects unmatched targets", () => {
    const merger = new PatchMerger();
    expect(() =>
      merger.add(new Patch({ target: "backend/app.ts", content: "x" })),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "nested/.env", content: "A=1\n" })),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "package.json", content: "{}" })),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "src/random.txt", content: "x" })),
    ).toThrow(/no PatchWriter for target 'src\/random.txt'/);
  });
});

describe("PatchMerger.registerWriter", () => {
  test("later globs override defaults and stay instance-local", () => {
    const a = new PatchMerger();
    a.registerWriter("**/Makefile", joinWriter);
    expect(() =>
      a.add(new Patch({ target: "some/Makefile", content: "x" })),
    ).not.toThrow();

    const b = new PatchMerger({ writers: [] });
    b.registerWriter("**/*.txt", joinWriter);
    expect(() =>
      b.add(new Patch({ target: "src/random.txt", content: "x" })),
    ).not.toThrow();
    expect(() => b.add(new Patch({ target: "Makefile", content: "x" }))).toThrow(
      /no PatchWriter/,
    );
  });

  test("constructor writers replace the defaults", () => {
    const merger = new PatchMerger({
      writers: [["**/*.txt", joinWriter]],
    });
    expect(() =>
      merger.add(new Patch({ target: ".env", content: "A=1\n" })),
    ).toThrow(/no PatchWriter/);
    expect(() =>
      merger.add(new Patch({ target: "notes.txt", content: "x" })),
    ).not.toThrow();
  });

  test("constructor can keep defaults and add more", () => {
    const merger = new PatchMerger({
      writers: [...defaultWriters, ["**/*.txt", joinWriter]],
    });
    expect(() =>
      merger.add(new Patch({ target: ".env", content: "A=1\n" })),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "notes.txt", content: "x" })),
    ).not.toThrow();
  });
});

describe("PatchMerger.apply", () => {
  test("writes composed targets in parallel by default; skips null", async () => {
    const strategy = recordingStrategy();
    const merger = new PatchMerger({ applyStrategy: strategy });
    merger.registerWriter("skip.txt", skipWriter);
    merger.add(new Patch({ target: ".env", content: "PORT=1\n" }));
    merger.add(new Patch({ target: "skip.txt", content: "ignored\n" }));
    const written = await merger.apply("/root");
    expect(written).toEqual([".env"]);
    expect(strategy.writes).toEqual([
      { path: "/root/.env", content: "PORT=1\n" },
    ]);
  });

  test("writes sequentially when parallelWriteMode is false", async () => {
    const order: string[] = [];
    const merger = new PatchMerger({
      parallelWriteMode: false,
      applyStrategy: {
        apply: async (target, _contents, rootDir) => {
          order.push(join(rootDir, target));
        },
      },
    });
    merger.add(new Patch({ target: ".env", content: "A=1\n" }));
    merger.add(new Patch({ target: ".gitignore", content: "dist\n" }));
    merger.registerWriter("skip.env", skipWriter);
    merger.add(new Patch({ target: "skip.env", content: "X=1\n" }));
    const written = await merger.apply("/out");
    expect(written).toEqual([".env", ".gitignore"]);
    expect(order).toEqual(["/out/.env", "/out/.gitignore"]);
  });

  test("returns an empty list when there are no patches", async () => {
    const merger = new PatchMerger({
      applyStrategy: { apply: async () => undefined },
    });
    expect(await merger.apply("/root")).toEqual([]);
  });

  test("uses IPatchFileSystemApplyStrategy and creates nested dirs", async () => {
    const root = await mkdtemp(join(tmpdir(), "patch-merger-"));
    const merger = new PatchMerger();
    merger.add(new Patch({ target: "nested/.env", content: "PORT=9\n" }));
    expect(await merger.apply(root)).toEqual(["nested/.env"]);
    expect(await readFile(join(root, "nested/.env"), "utf8")).toBe("PORT=9\n");
  });

  test("apply accepts a per-call strategy", async () => {
    const strategy = recordingStrategy();
    const merger = new PatchMerger({
      applyStrategy: new IPatchFileSystemApplyStrategy(),
    });
    merger.add(new Patch({ target: ".env", content: "PORT=1\n" }));
    await merger.apply("/root", strategy);
    expect(strategy.writes).toEqual([
      { path: "/root/.env", content: "PORT=1\n" },
    ]);
  });

  test("failOnCollision defaults to true", async () => {
    const merger = new PatchMerger({
      applyStrategy: { apply: async () => undefined },
    });
    merger.add(new Patch({ target: ".env", content: "PORT=1\n" }));
    merger.add(new Patch({ target: ".env", content: "PORT=2\n" }));
    await expect(merger.apply("/root")).rejects.toThrow(/collision/);
  });

  test("failOnCollision false lets the later patch win", async () => {
    const strategy = recordingStrategy();
    const merger = new PatchMerger({
      failOnCollision: false,
      applyStrategy: strategy,
    });
    merger.add(new Patch({ target: ".env", content: "PORT=1\n" }));
    merger.add(new Patch({ target: ".env", content: "PORT=2\n" }));
    await merger.apply("/root");
    expect(strategy.writes[0]?.content).toBe("PORT=2\n");
  });
});
