import { mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
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
      merger.add(new Patch({ target: "Dockerfile", content: "FROM scratch\n" })),
    ).not.toThrow();
    expect(() =>
      merger.add(
        new Patch({ target: "scripts/entrypoint.sh", content: "exec\n" }),
      ),
    ).not.toThrow();
    expect(() =>
      merger.add(
        new Patch({ target: "docker-compose.yml", content: "app: {}\n" }),
      ),
    ).not.toThrow();
    expect(() =>
      merger.add(
        new Patch({ target: "openapi.yaml", content: "openapi: 3.0.0\n" }),
      ),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "config.xml", content: "<root />\n" })),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "Cargo.toml", content: "[package]\n" })),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "App.csproj", content: "<Project />\n" })),
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

  test("yml and xml targets use deep document writers", async () => {
    const strategy = recordingStrategy();
    const merger = new PatchMerger({
      failOnCollision: false,
      applyStrategy: strategy,
    });
    merger.add(new Patch({ target: "app.yml", content: "a: 1\n" }));
    merger.add(new Patch({ target: "app.yml", content: "b: 2\n" }));
    merger.add(
      new Patch({ target: "app.xml", content: "<root><a>1</a></root>" }),
    );
    merger.add(
      new Patch({ target: "app.xml", content: "<root><b>2</b></root>" }),
    );
    await merger.apply("/root");
    const yml = strategy.writes.find((write) => write.path.endsWith("app.yml"));
    const xml = strategy.writes.find((write) => write.path.endsWith("app.xml"));
    expect(yml?.content).toMatch(/a: 1/);
    expect(yml?.content).toMatch(/b: 2/);
    expect(xml?.content).toMatch(/<a>1<\/a>/);
    expect(xml?.content).toMatch(/<b>2<\/b>/);
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

  test("result order follows add order even when later writes finish first", async () => {
    const merger = new PatchMerger({
      writers: [["**/*.txt", joinWriter]],
      applyStrategy: {
        apply: async (target) => {
          await new Promise((resolve) => {
            setTimeout(resolve, target === "a.txt" ? 20 : 0);
          });
        },
      },
    });
    merger.add(new Patch({ target: "a.txt", content: "a" }));
    merger.add(new Patch({ target: "b.txt", content: "b" }));
    merger.add(new Patch({ target: "c.txt", content: "c" }));
    expect(await merger.apply("/root")).toEqual(["a.txt", "b.txt", "c.txt"]);
  });

  test("sequential mode never overlaps writes", async () => {
    let current = 0;
    let max = 0;
    const merger = new PatchMerger({
      parallelWriteMode: false,
      writers: [["**/*.txt", joinWriter]],
      applyStrategy: {
        apply: async () => {
          current += 1;
          max = Math.max(max, current);
          await new Promise((resolve) => {
            setTimeout(resolve, 5);
          });
          current -= 1;
        },
      },
    });
    merger.add(new Patch({ target: "a.txt", content: "a" }));
    merger.add(new Patch({ target: "b.txt", content: "b" }));
    merger.add(new Patch({ target: "c.txt", content: "c" }));
    await merger.apply("/root");
    expect(max).toBe(1);
  });

  test("caps in-flight parallel writes", async () => {
    let current = 0;
    let max = 0;
    const merger = new PatchMerger({
      writers: [["**/*.txt", joinWriter]],
      applyStrategy: {
        apply: async () => {
          current += 1;
          max = Math.max(max, current);
          await new Promise((resolve) => {
            setTimeout(resolve, 5);
          });
          current -= 1;
        },
      },
    });
    for (let i = 0; i < 40; i += 1) {
      merger.add(new Patch({ target: `f${i}.txt`, content: `${i}` }));
    }
    await merger.apply("/root");
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThanOrEqual(32);
  });

  test("writes two nested files through the filesystem strategy", async () => {
    const root = await mkdtemp(join(tmpdir(), "patch-merger-"));
    const merger = new PatchMerger();
    merger.add(new Patch({ target: "nested/.env", content: "A=1\n" }));
    merger.add(new Patch({ target: "nested/.gitignore", content: "dist\n" }));
    expect(await merger.apply(root)).toEqual(["nested/.env", "nested/.gitignore"]);
    expect(await readFile(join(root, "nested/.env"), "utf8")).toBe("A=1\n");
    expect(await readFile(join(root, "nested/.gitignore"), "utf8")).toBe(
      "dist\n",
    );
  });

  test("retries mkdir after a failed ensure", async () => {
    const root = await mkdtemp(join(tmpdir(), "patch-merger-"));
    const blocker = join(root, "nested");
    await writeFile(blocker, "not-a-dir");
    const strategy = new IPatchFileSystemApplyStrategy();
    await expect(strategy.apply("nested/.env", "A=1\n", root)).rejects.toThrow();
    await unlink(blocker);
    await strategy.apply("nested/.env", "A=1\n", root);
    expect(await readFile(join(root, "nested/.env"), "utf8")).toBe("A=1\n");
  });
});
