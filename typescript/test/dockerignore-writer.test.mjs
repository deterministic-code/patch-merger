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

// Each lane's producer stamps its resolved output dir onto the piece's `path`; the writer just prefixes that lane's artifacts with it — it no longer computes layout.
function compose(lanes, applicationTier) {
  const pieces = lanes.map(({ language, path }) => ({
    kind: "patch",
    target: ".dockerignore",
    content: "# managed by dockerignore-writer",
    section: `DOCKERIGNORE_${language.toUpperCase()}`,
    ...(path === undefined ? {} : { path }),
  }));
  return composePatchTarget({
    target: ".dockerignore",
    pieces,
    settings: applicationTier === undefined ? undefined : { applicationTier },
  });
}

describe("dockerignore writer — prefixes each lane's artifacts with the piece path", () => {
  const cases = [
    {
      lanes: [{ language: "typescript" }],
      lines: ["node_modules", "dist", ".test"],
    },
    { lanes: [{ language: "rust", path: "" }], lines: ["target"] },
    {
      lanes: [{ language: "csharp", path: "" }],
      lines: ["bin", "obj", "out", "publish"],
    },
    {
      lanes: [
        { language: "typescript", path: "typescript/" },
        { language: "rust", path: "rust/" },
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
        { language: "typescript", path: "backend/typescript/" },
        { language: "csharp", path: "backend/csharp/" },
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
    const label = lanes.map((l) => `${l.language}@${l.path ?? ""}`).join("+");
    it(`[${label}] prefixes with the piece path`, () => {
      expect(compose(lanes, "backend")).toBe(ignore(lines));
    });
  }
});

describe("dockerignore writer — full-stack tier always ignores frontend/", () => {
  it("adds the frontend lane from settings.applicationTier, not from any piece", () => {
    expect(
      compose([{ language: "typescript", path: "backend/" }], "full-stack"),
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

  it("identifies the lane from the piece section, defaulting an absent path to root", () => {
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
