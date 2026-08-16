import { describe, it, expect } from "vitest";
import {
  composePatchTarget,
  isPatchTarget,
} from "../src/patch-merger.ts";

const COMMON = ["*.db", "*.log", "*.sqlite", "*.sqlite3", ".env.local", ".git"];

// The whole root .dockerignore is `COMMON` ∪ the per-lane lines, sorted; assert the exact string so a lane-prefix regression (the multi-lang node_modules leak) fails loudly.
function ignore(laneLines) {
  return `${[...COMMON, ...laneLines].sort().join("\n")}\n`;
}

// Each lane's producer stamps the ignore file under its output dir; the writer prefixes that lane's artifacts with the directory on `target`.
function compose(lanes, applicationTier) {
  const pieces = lanes.map(({ language, dir }) => ({
    kind: "patch",
    target: `${dir ?? ""}.dockerignore`,
    content: "# managed by dockerignore-writer",
    section: `DOCKERIGNORE_${language.toUpperCase()}`,
  }));
  return composePatchTarget({
    target: ".dockerignore",
    pieces,
    settings: applicationTier === undefined ? undefined : { applicationTier },
  });
}

describe("dockerignore writer — prefixes each lane's artifacts with the directory on target", () => {
  const cases = [
    {
      lanes: [{ language: "typescript" }],
      lines: ["node_modules", "dist", ".test"],
    },
    { lanes: [{ language: "rust", dir: "" }], lines: ["target"] },
    {
      lanes: [{ language: "csharp", dir: "" }],
      lines: ["bin", "obj", "out", "publish"],
    },
    {
      lanes: [
        { language: "typescript", dir: "typescript/" },
        { language: "rust", dir: "rust/" },
      ],
      lines: [
        "typescript/node_modules",
        "typescript/dist",
        "typescript/.test",
        "rust/target",
      ],
    },
    {
      lanes: [
        { language: "typescript", dir: "backend/typescript/" },
        { language: "csharp", dir: "backend/csharp/" },
      ],
      lines: [
        "backend/typescript/node_modules",
        "backend/typescript/dist",
        "backend/typescript/.test",
        "backend/csharp/bin",
        "backend/csharp/obj",
        "backend/csharp/out",
        "backend/csharp/publish",
      ],
    },
  ];
  for (const { lanes, lines } of cases) {
    const label = lanes.map((l) => `${l.language}@${l.dir ?? ""}`).join("+");
    it(`[${label}] prefixes with the directory on target`, () => {
      expect(compose(lanes, "backend")).toBe(ignore(lines));
    });
  }
});

describe("dockerignore writer — full-stack tier always ignores frontend/", () => {
  it("adds the frontend lane from settings.applicationTier, not from any piece", () => {
    expect(
      compose([{ language: "typescript", dir: "backend/" }], "full-stack"),
    ).toBe(
      ignore([
        "backend/node_modules",
        "backend/dist",
        "backend/.test",
        "frontend/node_modules",
        "frontend/dist",
      ]),
    );
  });
});

describe("dockerignore writer — robustness", () => {
  it("is a registered patch target", () => {
    expect(isPatchTarget(".dockerignore")).toBe(true);
  });

  it("returns null with no pieces (writer never materializes an empty file)", () => {
    expect(
      composePatchTarget({ target: ".dockerignore", pieces: [], settings: {} }),
    ).toBe(null);
  });

  it("identifies the lane from the piece section, defaulting a root target to unprefixed ignores", () => {
    const pieces = [
      {
        kind: "patch",
        target: ".dockerignore",
        content: "# managed",
        section: "DOCKERIGNORE_RUST",
      },
    ];
    expect(
      composePatchTarget({
        target: ".dockerignore",
        pieces,
        settings: undefined,
      }),
    ).toBe(ignore(["target"]));
  });
});
