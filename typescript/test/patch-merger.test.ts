import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { Patch } from "../src/patch.ts";
import { PatchMerger } from "../src/patch-merger.ts";
import { LineUpsertWriter } from "../src/writers/line-upsert-writer.ts";
import type { Writer } from "../src/writer.ts";

const joinWriter: Writer = (patches) =>
  patches.map((patch) => patch.content).join("");

const skipWriter: Writer = () => null;

describe("PatchMerger.add", () => {
  test("resolves basename and extension writers; rejects unregistered targets", () => {
    const merger = new PatchMerger();
    merger.registerWriter("app.ts", joinWriter);
    merger.registerWriter(".csproj", joinWriter);
    expect(() =>
      merger.add(new Patch({ target: "backend/app.ts", content: "x" })),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "dotnet/GeneratedApp.csproj", content: "x" })),
    ).not.toThrow();
    expect(() =>
      merger.add(new Patch({ target: "src/random.txt", content: "x" })),
    ).toThrow(/no PatchWriter for target 'src\/random.txt'/);
  });
});

describe("PatchMerger.registerWriter", () => {
  test("bindings are instance-local", () => {
    const a = new PatchMerger();
    a.registerWriter("Makefile", joinWriter);
    expect(() =>
      a.add(new Patch({ target: "some/Makefile", content: "x" })),
    ).not.toThrow();

    const b = new PatchMerger();
    b.registerWriter(".txt", joinWriter);
    expect(() =>
      b.add(new Patch({ target: "src/random.txt", content: "x" })),
    ).not.toThrow();
    expect(() => b.add(new Patch({ target: "Makefile", content: "x" }))).toThrow(
      /no PatchWriter/,
    );
  });
});

describe("PatchMerger.apply", () => {
  test("writes composed targets in parallel by default; skips null", async () => {
    const writes: { path: string; content: string }[] = [];
    const merger = new PatchMerger({
      fileWriter: async (path, content) => {
        writes.push({ path, content });
      },
    });
    merger.registerWriter(".env", LineUpsertWriter);
    merger.registerWriter("skip.txt", skipWriter);
    merger.add(new Patch({ target: ".env", content: "PORT=1\n" }));
    merger.add(new Patch({ target: "skip.txt", content: "ignored\n" }));
    const written = await merger.apply("/root");
    expect(written).toEqual([".env"]);
    expect(writes).toEqual([{ path: "/root/.env", content: "PORT=1\n" }]);
  });

  test("writes sequentially when parallelWriteMode is false", async () => {
    const order: string[] = [];
    const merger = new PatchMerger({
      parallelWriteMode: false,
      fileWriter: async (path, content) => {
        order.push(path);
        writes.push({ path, content });
      },
    });
    const writes: { path: string; content: string }[] = [];
    merger.registerWriter(".env", LineUpsertWriter);
    merger.registerWriter(".gitignore", LineUpsertWriter);
    merger.add(new Patch({ target: ".env", content: "A=1\n" }));
    merger.add(new Patch({ target: ".gitignore", content: "dist\n" }));
    merger.add(new Patch({ target: "skip.env", content: "X=1\n" }));
    merger.registerWriter("skip.env", skipWriter);
    const written = await merger.apply("/out");
    expect(written).toEqual([".env", ".gitignore"]);
    expect(order).toEqual(["/out/.env", "/out/.gitignore"]);
  });

  test("returns an empty list when there are no patches", async () => {
    const merger = new PatchMerger({ fileWriter: async () => undefined });
    expect(await merger.apply("/root")).toEqual([]);
  });

  test("uses the default file writer and creates nested dirs", async () => {
    const root = await mkdtemp(join(tmpdir(), "patch-merger-"));
    const merger = new PatchMerger();
    merger.registerWriter(".env", LineUpsertWriter);
    merger.add(new Patch({ target: "nested/.env", content: "PORT=9\n" }));
    expect(await merger.apply(root)).toEqual(["nested/.env"]);
    expect(await readFile(join(root, "nested/.env"), "utf8")).toBe("PORT=9\n");
  });

  test("failOnCollision defaults to true", async () => {
    const merger = new PatchMerger({
      fileWriter: async () => undefined,
    });
    merger.registerWriter(".env", LineUpsertWriter);
    merger.add(new Patch({ target: ".env", content: "PORT=1\n" }));
    merger.add(new Patch({ target: ".env", content: "PORT=2\n" }));
    await expect(merger.apply("/root")).rejects.toThrow(/collision/);
  });

  test("failOnCollision false lets the later patch win", async () => {
    const writes: { path: string; content: string }[] = [];
    const merger = new PatchMerger({
      failOnCollision: false,
      fileWriter: async (path, content) => {
        writes.push({ path, content });
      },
    });
    merger.registerWriter(".env", LineUpsertWriter);
    merger.add(new Patch({ target: ".env", content: "PORT=1\n" }));
    merger.add(new Patch({ target: ".env", content: "PORT=2\n" }));
    await merger.apply("/root");
    expect(writes[0]?.content).toBe("PORT=2\n");
  });
});
