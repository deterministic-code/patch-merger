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
const region = (id) => `${marker(id).start}\n${marker(id).end}`;
const json = (obj) => JSON.stringify(obj);

describe("packageJsonMergeWriter", () => {
  const piece = (obj) => ({ target: "package.json", content: json(obj) });

  test("merges string and boolean maps; skeleton keys win", () => {
    const pkg = JSON.parse(
      packageJsonMergeWriter([
        piece({
          name: "app",
          scripts: { build: "vite build" },
          dependencies: { a: "^1" },
        }),
        piece({
          scripts: { build: "IGNORED", test: "vitest" },
          dependencies: { b: "^2", "better-sqlite3": "^13" },
          allowScripts: { "better-sqlite3": true },
        }),
      ]),
    );
    expect(pkg).toEqual({
      name: "app",
      scripts: { build: "vite build", test: "vitest" },
      dependencies: { a: "^1", b: "^2", "better-sqlite3": "^13" },
      allowScripts: { "better-sqlite3": true },
    });
  });
});

describe("cargoTomlWriter", () => {
  test("empty / unmarked / marked skeleton", () => {
    const seed = '[package]\nname = "migrate"\n';
    expect(cargoTomlWriter([])).toBe(null);
    expect(cargoTomlWriter([{ content: seed }])).toBe(seed);

    const out = cargoTomlWriter([
      { content: '[package]\nname = "seed"\n' },
      {
        content: `[package]\n${region("MIGRATE_BIN")}\n${region("MIGRATE_DEPS")}\n`,
      },
      { content: 'name = "migrate-up"', section: "MIGRATE_BIN" },
      { content: 'rusqlite = "0.31"', section: "MIGRATE_DEPS" },
    ]);
    expect(out).toContain('name = "migrate-up"');
    expect(out).toContain('rusqlite = "0.31"');
    expect(out).toContain("[package]");
  });
});

describe("insertDockerfileCopies", () => {
  const copy = { src: "a", dest: "b" };

  test("no-ops when there is nothing new to insert", () => {
    expect(insertDockerfileCopies("FROM x\n", [])).toBe("FROM x\n");
    expect(insertDockerfileCopies("FROM x\nCOPY a b\n", [copy])).toBe(
      "FROM x\nCOPY a b\n",
    );
  });

  test("inserts after the named marker, else after the last COPY", () => {
    const { start, end } = marker("MIGRATE_COPY");
    const out = insertDockerfileCopies(
      `FROM x\n${region("MIGRATE_COPY")}\nCOPY z z\n`,
      [copy],
      "MIGRATE_COPY",
    );
    expect(out.indexOf("COPY a b")).toBeGreaterThan(out.indexOf(start));
    expect(out.indexOf("COPY a b")).toBeLessThan(out.indexOf(end));
    expect(
      insertDockerfileCopies("FROM x\nCOPY first first\nRUN build\n", [copy]),
    ).toContain("COPY first first\nCOPY a b");
  });

  test("no markers and no COPY line → throws", () => {
    expect(() =>
      insertDockerfileCopies("FROM x\nRUN build\n", [copy]),
    ).toThrow(/neither the anchor section's markers nor a COPY line/);
  });
});

describe("applyDockerfileCopies", () => {
  const apply = (workdir, copies) =>
    applyDockerfileCopies(
      `FROM x\nWORKDIR ${workdir}\n${region("MIGRATE_COPY")}\n`,
      [{ content: json({ anchorSection: "MIGRATE_COPY", copies }) }],
    );

  test("requires WORKDIR; prefixes workdirRelative sources under /app", () => {
    expect(() =>
      applyDockerfileCopies("FROM x\nCOPY a b\n", [
        { content: json([{ src: "s", dest: "d" }]) },
      ]),
    ).toThrow(/missing a `WORKDIR` line/);
    expect(
      apply("/app", [{ src: "s.sql", dest: "d", workdirRelative: true }]),
    ).toContain("COPY s.sql d");
    expect(
      apply("/app/backend", [
        { src: "s.sql", dest: "d", workdirRelative: true },
      ]),
    ).toContain("COPY backend/s.sql d");
    expect(apply("/app/backend", [{ src: "abs.sql", dest: "d" }])).toContain(
      "COPY abs.sql d",
    );
  });
});

describe("dockerfileWriter", () => {
  test("needs a FROM skeleton, then applies COPY pieces and marked fills", () => {
    expect(dockerfileWriter([{ content: "not a dockerfile body" }])).toBe(null);
    const out = dockerfileWriter([
      {
        content: `FROM x\nWORKDIR /app\n${region("MIGRATE_COPY")}\n${region("MIGRATE_BIN")}\n`,
      },
      {
        content: json({
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

describe("sharedAppendWriter", () => {
  const env = sharedAppendWriter(SHARED_FILE_CONVENTIONS[".env"]);
  const compose = sharedAppendWriter(
    SHARED_FILE_CONVENTIONS["docker-compose.yml"],
  );
  const dockerignore = sharedAppendWriter(
    SHARED_FILE_CONVENTIONS[".dockerignore"],
  );

  test("no owner section → null; empty owner blocks → bare skeleton", () => {
    expect(env([])).toBe(null);
    expect(env([{ content: "DB_URL=x", section: "DB_ENV" }])).toBe(null);
    expect(dockerignore([])).toBe(null);
    expect(
      compose([{ content: "", section: "COMPOSE_SERVICE_TYPESCRIPT" }]),
    ).toBe(SHARED_FILE_CONVENTIONS["docker-compose.yml"].skeleton);
  });

  test("joins skeleton + last contribution per section", () => {
    expect(env([{ content: "PORT=3000", section: "ENV_TYPESCRIPT" }])).toBe(
      "PORT=3000\n",
    );
    expect(
      env([
        { content: "PORT=1", section: "ENV_TYPESCRIPT" },
        { content: "PORT=2", section: "ENV_TYPESCRIPT" },
      ]),
    ).toBe("PORT=2\n");
    expect(
      sharedAppendWriter({
        skeleton: "header:",
        indent: "",
        sectionPrefix: "ENV",
      })([{ content: "PORT=3000", section: "ENV_TYPESCRIPT" }]),
    ).toBe("header:\nPORT=3000\n");

    const composeOut = compose([
      { content: "app:\n  image: x", section: "COMPOSE_SERVICE_TYPESCRIPT" },
    ]);
    expect(composeOut.startsWith("services:\n")).toBe(true);
    expect(composeOut).toContain("  app:");
  });

  test("dockerignore appends piece content after the common skeleton", () => {
    const out = dockerignore([
      { content: "node_modules\ndist", section: "DOCKERIGNORE_TYPESCRIPT" },
      { content: "backend/rust/target", section: "DOCKERIGNORE_RUST" },
    ]);
    for (const line of [".git", "node_modules", "dist", "backend/rust/target"]) {
      expect(out).toContain(line);
    }
  });
});

describe("applyMarkedFills / markedBlockWriter", () => {
  test("fills a skeleton region; missing skeleton or region fails", () => {
    expect(() =>
      applyMarkedFills("body", [{ content: "x", section: "NOT_A_SECTION" }]),
    ).toThrow(/no marked region for section/);
    expect(markedBlockWriter([{ content: "x", section: "MIGRATE_BIN" }])).toBe(
      null,
    );

    const out = markedBlockWriter([
      { content: `head\n${region("MIGRATE_BIN")}\ntail\n` },
      { content: "filled", section: "MIGRATE_BIN" },
    ]);
    expect(out).toMatch(/head[\s\S]*filled[\s\S]*tail/);
  });
});
