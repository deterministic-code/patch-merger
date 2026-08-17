import { describe, it, expect } from "vitest";
import { PatchMerger, Patch } from "../src/patch-merger.ts";

const SKELETON = [".git", ".env.local", "*.log", "*.sqlite", "*.sqlite3", "*.db"];

async function apply(pieces) {
  const writes = [];
  const merger = new PatchMerger(async (path, content) => {
    writes.push({ path, content });
  });
  for (const piece of pieces) merger.add(new Patch(piece));
  const written = await merger.apply("/root");
  return { written, writes };
}

describe("dockerignore — shared append of piece content", () => {
  it("is a registered patch target", () => {
    expect(() =>
      new PatchMerger().add(
        new Patch({ target: ".dockerignore", content: "#" }),
      ),
    ).not.toThrow();
  });

  it("writes nothing when no pieces are registered", async () => {
    const { written, writes } = await apply([]);
    expect(written).toEqual([]);
    expect(writes).toEqual([]);
  });

  it("writes the common skeleton plus each section's ignore lines", async () => {
    const { writes } = await apply([
      {
        target: "typescript/.dockerignore",
        content: "typescript/node_modules\ntypescript/dist",
        section: "DOCKERIGNORE_TYPESCRIPT",
      },
      {
        target: "rust/.dockerignore",
        content: "rust/target",
        section: "DOCKERIGNORE_RUST",
      },
    ]);
    const out = writes[0].content;
    for (const line of SKELETON) expect(out).toContain(line);
    expect(out).toContain("typescript/node_modules");
    expect(out).toContain("rust/target");
  });
});
