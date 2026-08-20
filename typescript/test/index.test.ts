import { describe, expect, test } from "vitest";
import * as pack from "../src/index.ts";

describe("package exports", () => {
  test("re-exports the merger, patch, and writers", () => {
    expect(pack.Patch).toBeTypeOf("function");
    expect(pack.PatchMerger).toBeTypeOf("function");
    expect(pack.LineUpsertWriter).toBeTypeOf("function");
    expect(pack.SectionWriter).toBeTypeOf("function");
    expect(pack.DeepJsonWriter).toBeTypeOf("function");
    expect(pack.IPatchFileSystemApplyStrategy).toBeTypeOf("function");
    expect(pack.defaultWriters.length).toBeGreaterThan(0);
  });
});
