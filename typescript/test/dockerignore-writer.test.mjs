import { describe, it, expect } from "vitest";
import {
  composePatchTarget,
  isPatchTarget,
} from "../src/patch-writers/registry.ts";

const SKELETON = [".git", ".env.local", "*.log", "*.sqlite", "*.sqlite3", "*.db"];

describe("dockerignore — shared append of piece content", () => {
  it("is a registered patch target", () => {
    expect(isPatchTarget(".dockerignore")).toBe(true);
  });

  it("returns null with no pieces", () => {
    expect(composePatchTarget({ target: ".dockerignore", pieces: [] })).toBe(
      null,
    );
  });

  it("writes the common skeleton plus each section's ignore lines", () => {
    const out = composePatchTarget({
      target: ".dockerignore",
      pieces: [
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
      ],
    });
    for (const line of SKELETON) expect(out).toContain(line);
    expect(out).toContain("typescript/node_modules");
    expect(out).toContain("rust/target");
  });
});
