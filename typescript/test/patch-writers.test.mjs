import { describe, test, expect } from "vitest";
import { cargoTomlWriter } from "../src/patch-writers/cargo-toml-writer.ts";
import { packageJsonMergeWriter } from "../src/patch-writers/package-json-writer.ts";
import {
  insertDockerfileCopies,
  applyDockerfileCopies,
} from "../src/patch-writers/dockerfile-copy-writer.ts";
import { dockerfileWriter } from "../src/patch-writers/dockerfile-writer.ts";
import {
  applyMarkedFills,
  markedBlockWriter,
} from "../src/patch-writers/marked-block-writer.ts";
import {
  sharedAppendWriter,
  SHARED_FILE_CONVENTIONS,
} from "../src/patch-writers/shared-append-writer.ts";
const marker = (id) => ({
  start: `# === BEGIN ${id} — see PATCH_PLAN ===`,
  end: `# === END ${id} ===`,
});
const migrateBin = marker("MIGRATE_BIN");
const migrateDeps = marker("MIGRATE_DEPS");
const migrateCopy = marker("MIGRATE_COPY");

describe("packageJsonMergeWriter", () => {
  const piece = (obj) => ({ target: "package.json", content: JSON.stringify(obj) });

  test("add-if-absent merges string sections, skeleton value wins", () => {
    const out = packageJsonMergeWriter([
      piece({ name: "app", scripts: { build: "vite build" }, dependencies: { a: "^1" } }),
      piece({ scripts: { build: "IGNORED", test: "vitest" }, dependencies: { b: "^2" } }),
    ]);
    const pkg = JSON.parse(out);
    expect(pkg.name).toBe("app");
    expect(pkg.scripts).toEqual({ build: "vite build", test: "vitest" });
    expect(pkg.dependencies).toEqual({ a: "^1", b: "^2" });
  });

  test("merges a boolean allowScripts map (approve-scripts opt-in), not a string map", () => {
    const out = packageJsonMergeWriter([
      piece({ name: "app" }),
      piece({ dependencies: { "better-sqlite3": "^13" }, allowScripts: { "better-sqlite3": true } }),
    ]);
    const pkg = JSON.parse(out);
    expect(pkg.allowScripts).toEqual({ "better-sqlite3": true });
    expect(pkg.dependencies).toEqual({ "better-sqlite3": "^13" });
  });
});

describe("cargoTomlWriter", () => {
  test("no pieces → null", () => {
    expect(cargoTomlWriter([])).toBe(null);
  });

  test("no skeleton marker → returns first section-less piece verbatim", () => {
    const seed = '[package]\nname = "migrate"\n';
    expect(cargoTomlWriter([{ content: seed }])).toBe(seed);
  });

  test("marker-bearing skeleton wins and section pieces fill their blocks", () => {
    const skeleton = [
      "[package]",
      `${migrateBin.start}`,
      `${migrateBin.end}`,
      `${migrateDeps.start}`,
      `${migrateDeps.end}`,
      "",
    ].join("\n");
    const out = cargoTomlWriter([
      { content: '[package]\nname = "seed"\n' },
      { content: skeleton },
      { content: 'name = "migrate-up"', section: "MIGRATE_BIN" },
      { content: 'rusqlite = "0.31"', section: "MIGRATE_DEPS" },
    ]);
    expect(out).toContain('name = "migrate-up"');
    expect(out).toContain('rusqlite = "0.31"');
    expect(out).toContain("[package]");
  });
});

describe("insertDockerfileCopies", () => {
  test("empty copies array → content unchanged", () => {
    expect(insertDockerfileCopies("FROM x\n", [])).toBe("FROM x\n");
  });

  test("all lines already present → content unchanged", () => {
    const content = "FROM x\nCOPY a b\n";
    expect(insertDockerfileCopies(content, [{ src: "a", dest: "b" }])).toBe(
      content,
    );
  });

  test("inserts at the named anchor section's marker when present", () => {
    const content = `FROM x\n${migrateCopy.start}\n${migrateCopy.end}\nCOPY z z\n`;
    const out = insertDockerfileCopies(
      content,
      [{ src: "a", dest: "b" }],
      "MIGRATE_COPY",
    );
    const markerIdx = out.indexOf(migrateCopy.start);
    expect(out.indexOf("COPY a b")).toBeGreaterThan(markerIdx);
    expect(out.indexOf("COPY a b")).toBeLessThan(out.indexOf(migrateCopy.end));
  });

  test("no markers → anchors after the last COPY line", () => {
    const content = "FROM x\nCOPY first first\nRUN build\n";
    const out = insertDockerfileCopies(content, [{ src: "a", dest: "b" }]);
    expect(out).toContain("COPY first first\nCOPY a b");
  });

  test("no markers and no COPY line → throws", () => {
    expect(() =>
      insertDockerfileCopies("FROM x\nRUN build\n", [{ src: "a", dest: "b" }]),
    ).toThrow(/neither the anchor section's markers nor a COPY line/);
  });
});

describe("applyDockerfileCopies", () => {
  test("missing WORKDIR line → throws", () => {
    expect(() =>
      applyDockerfileCopies("FROM x\nCOPY a b\n", [
        { content: JSON.stringify([{ src: "s", dest: "d" }]) },
      ]),
    ).toThrow(/missing a `WORKDIR` line/);
  });

  const copyWithWorkdir = (workdir) =>
    applyDockerfileCopies(
      `FROM x\nWORKDIR ${workdir}\n${migrateCopy.start}\n${migrateCopy.end}\n`,
      [
        {
          content: JSON.stringify({
            anchorSection: "MIGRATE_COPY",
            copies: [{ src: "s.sql", dest: "d", workdirRelative: true }],
          }),
        },
      ],
    );

  test("WORKDIR /app → no prefix on relative sources", () => {
    expect(copyWithWorkdir("/app")).toContain("COPY s.sql d");
  });

  test("WORKDIR /app/backend → nested prefix on relative sources", () => {
    expect(copyWithWorkdir("/app/backend")).toContain("COPY backend/s.sql d");
  });

  test("non-relative sources are copied as-is", () => {
    const content = `FROM x\nWORKDIR /app/backend\n${migrateCopy.start}\n${migrateCopy.end}\n`;
    const out = applyDockerfileCopies(content, [
      {
        content: JSON.stringify({
          anchorSection: "MIGRATE_COPY",
          copies: [{ src: "abs.sql", dest: "d" }],
        }),
      },
    ]);
    expect(out).toContain("COPY abs.sql d");
  });
});

describe("dockerfileWriter", () => {
  test("no skeleton (no FROM piece) → null", () => {
    expect(dockerfileWriter([{ content: "not a dockerfile body" }])).toBe(null);
  });

  test("composes skeleton, COPY pieces, then marked fills", () => {
    const skeleton = `FROM x\nWORKDIR /app\n${migrateCopy.start}\n${migrateCopy.end}\n${migrateBin.start}\n${migrateBin.end}\n`;
    const out = dockerfileWriter([
      { content: skeleton },
      {
        content: JSON.stringify({
          anchorSection: "MIGRATE_COPY",
          copies: [{ src: "up.sql", dest: "/app/up.sql" }],
        }),
      },
      { content: "RUN migrate", section: "MIGRATE_BIN" },
    ]);
    expect(out).toContain("COPY up.sql /app/up.sql");
    expect(out).toContain("RUN migrate");
  });
});

describe("dockerignore via sharedAppendWriter", () => {
  const write = sharedAppendWriter(SHARED_FILE_CONVENTIONS[".dockerignore"]);

  test("no owner section → null", () => {
    expect(write([])).toBe(null);
  });

  test("owner section appends piece content after the common skeleton", () => {
    const out = write([
      {
        content: "node_modules\ndist",
        section: "DOCKERIGNORE_TYPESCRIPT",
      },
    ]);
    expect(out).toContain(".git");
    expect(out).toContain("node_modules");
    expect(out).toContain("dist");
  });

  test("nested path prefixes live in the piece content, not the writer", () => {
    const out = write([
      {
        content: "backend/typescript/node_modules",
        section: "DOCKERIGNORE_TYPESCRIPT",
      },
      {
        content: "backend/rust/target",
        section: "DOCKERIGNORE_RUST",
      },
    ]);
    expect(out).toContain("backend/typescript/node_modules");
    expect(out).toContain("backend/rust/target");
  });
});

describe("applyMarkedFills / markedBlockWriter", () => {
  test("section with no marked region in the skeleton → throws", () => {
    expect(() =>
      applyMarkedFills("body", [{ content: "x", section: "NOT_A_SECTION" }]),
    ).toThrow(/no marked region for section/);
  });

  test("markedBlockWriter with no skeleton → null", () => {
    expect(markedBlockWriter([{ content: "x", section: "MIGRATE_BIN" }])).toBe(
      null,
    );
  });

  test("markedBlockWriter fills the skeleton's marked region", () => {
    const skeleton = `head\n${migrateBin.start}\n${migrateBin.end}\ntail\n`;
    const out = markedBlockWriter([
      { content: skeleton },
      { content: "filled", section: "MIGRATE_BIN" },
    ]);
    expect(out).toContain("filled");
    expect(out).toContain("head");
    expect(out).toContain("tail");
  });
});

describe("sharedAppendWriter", () => {
  const envConvention = SHARED_FILE_CONVENTIONS[".env"];
  const composeConvention = SHARED_FILE_CONVENTIONS["docker-compose.yml"];

  test("augmenter-only pieces (no owner section) → null", () => {
    const write = sharedAppendWriter(envConvention);
    expect(write([{ content: "DB_URL=x", section: "DB_ENV" }])).toBe(null);
  });

  test("owner present but all blocks empty → returns bare skeleton", () => {
    const write = sharedAppendWriter(composeConvention);
    expect(
      write([{ content: "", section: "COMPOSE_SERVICE_TYPESCRIPT" }]),
    ).toBe(composeConvention.skeleton);
  });

  test("empty skeleton convention composes blocks with no leading newline", () => {
    const write = sharedAppendWriter(envConvention);
    const out = write([{ content: "PORT=3000", section: "ENV_TYPESCRIPT" }]);
    expect(out).toBe("PORT=3000\n");
  });

  test("skeleton ending in newline is used as-is as the base", () => {
    const write = sharedAppendWriter(composeConvention);
    const out = write([
      { content: "app:\n  image: x", section: "COMPOSE_SERVICE_TYPESCRIPT" },
    ]);
    expect(out.startsWith("services:\n")).toBe(true);
    expect(out).toContain("  app:");
  });

  test("non-empty skeleton without trailing newline gets a separating newline", () => {
    const convention = {
      skeleton: "header:",
      indent: "",
      sectionPrefix: "ENV",
    };
    const write = sharedAppendWriter(convention);
    const out = write([{ content: "PORT=3000", section: "ENV_TYPESCRIPT" }]);
    expect(out).toBe("header:\nPORT=3000\n");
  });

  test("same-section pieces collapse to the last contribution", () => {
    const write = sharedAppendWriter(envConvention);
    const out = write([
      { content: "PORT=1", section: "ENV_TYPESCRIPT" },
      { content: "PORT=2", section: "ENV_TYPESCRIPT" },
    ]);
    expect(out).toBe("PORT=2\n");
  });
});
