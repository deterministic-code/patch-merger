import { describe, expect, test } from "vitest";
import { Patch, type PatchOptions } from "../src/patch.ts";
import { SectionWriter } from "../src/writers/section-writer.ts";

const writer = SectionWriter;
const ctx = (failOnCollision = false) => ({ failOnCollision });
const patch = (target: string, content: string, options?: PatchOptions) =>
  options === undefined
    ? new Patch({ target, content })
    : new Patch({ target, content, options });

describe("SectionWriter", () => {
  test("creates a # section at End by default", () => {
    expect(
      writer(
        [patch(".env", "PORT=1\n", { sections: ["ENV"] })],
        ctx(),
      ),
    ).toBe("# — START ENV\nPORT=1\n# — END ENV\n");
  });

  test("creates nested sections and // markers for TypeScript targets", () => {
    expect(
      writer(
        [
          patch("app.ts", "import './x';\n", {
            sections: ["Section1", "SubSection1"],
          }),
        ],
        ctx(),
      ),
    ).toBe(
      "// — START Section1\n// — START SubSection1\nimport './x';\n// — END SubSection1\n// — END Section1\n",
    );
  });

  test("appends a missing child at Start or End of the parent", () => {
    const parent = patch(".dockerignore", "keep\n", { sections: ["Ignore"] });
    expect(
      writer(
        [
          parent,
          patch(".dockerignore", "node_modules\n", {
            sections: ["Ignore", "Node"],
            appendIfNotExists: "End",
          }),
        ],
        ctx(),
      ),
    ).toBe(
      "# — START Ignore\nkeep\n# — START Node\nnode_modules\n# — END Node\n# — END Ignore\n",
    );
    expect(
      writer(
        [
          parent,
          patch(".dockerignore", "dist\n", {
            sections: ["Ignore", "Dist"],
            appendIfNotExists: "Start",
          }),
        ],
        ctx(),
      ),
    ).toBe(
      "# — START Ignore\n# — START Dist\ndist\n# — END Dist\nkeep\n# — END Ignore\n",
    );
  });

  test("prepends a missing top-level section when appendIfNotExists is Start", () => {
    expect(
      writer(
        [
          patch(".env", "A=1\n", { sections: ["First"] }),
          patch(".env", "B=2\n", {
            sections: ["Zeroth"],
            appendIfNotExists: "Start",
          }),
        ],
        ctx(),
      ),
    ).toBe(
      "# — START Zeroth\nB=2\n# — END Zeroth\n# — START First\nA=1\n# — END First\n",
    );
  });

  test("replaces an existing leaf and preserves siblings", () => {
    expect(
      writer(
        [
          patch(".env", "A=1\n", { sections: ["One"] }),
          patch(".env", "B=1\n", { sections: ["Two"] }),
          patch(".env", "A=2\n", { sections: ["One"] }),
        ],
        ctx(),
      ),
    ).toBe(
      "# — START One\nA=2\n# — END One\n# — START Two\nB=1\n# — END Two\n",
    );
  });

  test("appendIfNotExists None throws when the section is missing", () => {
    expect(() =>
      writer(
        [
          patch(".env", "A=1\n", {
            sections: ["Missing"],
            appendIfNotExists: "None",
          }),
        ],
        ctx(),
      ),
    ).toThrow(/does not exist/);
  });

  test("failIfExists throws for a repeated path and for a section already in the document", () => {
    expect(() =>
      writer(
        [
          patch(".env", "A=1\n", { sections: ["One"] }),
          patch(".env", "A=2\n", { sections: ["One"], failIfExists: true }),
        ],
        ctx(),
      ),
    ).toThrow(/already exists/);

    expect(() =>
      writer(
        [
          patch(".env", "# — START Child\nold\n# — END Child\n", {
            sections: ["Parent"],
          }),
          patch(".env", "new\n", {
            sections: ["Parent", "Child"],
            failIfExists: true,
          }),
        ],
        ctx(),
      ),
    ).toThrow(/already exists/);
  });

  test("failOnCollision rejects conflicting content and duplicate sibling names", () => {
    expect(() =>
      writer(
        [
          patch(".env", "A=1\n", { sections: ["One"] }),
          patch(".env", "A=2\n", { sections: ["One"] }),
        ],
        ctx(true),
      ),
    ).toThrow(/collision in/);

    expect(
      writer(
        [
          patch(".env", "A=1\n", { sections: ["One"] }),
          patch(".env", "A=1\n", { sections: ["One"] }),
        ],
        ctx(true),
      ),
    ).toContain("A=1");

    expect(() =>
      writer(
        [
          patch(".env", "# — START A\n1\n# — END A\n# — START A\n2\n# — END A\n", {
            sections: ["Root"],
          }),
          patch(".env", "x\n", { sections: ["Root", "A"] }),
        ],
        ctx(true),
      ),
    ).toThrow(/duplicate section/);
  });

  test("matches hyphen markers, nested same-name sections, and CRLF bodies", () => {
    expect(
      writer(
        [
          patch(
            ".env",
            "# - START Inner\n# - START Inner\nkeep\n# - END Inner\n# - END Inner\n",
            { sections: ["Outer"] },
          ),
          patch(".env", "new\r\n", { sections: ["Outer", "Inner"] }),
        ],
        ctx(),
      ),
    ).toBe(
      "# — START Outer\n# - START Inner\nnew\n# - END Inner\n# — END Outer\n",
    );
  });

  test("throws when a START marker has no END", () => {
    expect(() =>
      writer(
        [
          patch(".env", "# — START Child\n", { sections: ["Parent"] }),
          patch(".env", "x\n", { sections: ["Parent", "Child"] }),
        ],
        ctx(),
      ),
    ).toThrow(/missing END marker/);
  });

  test("omitted sections seeds the document; later patches fill regions", () => {
    expect(writer([patch("Dockerfile", "FROM node\n")], ctx())).toBe(
      "FROM node\n",
    );
    expect(
      writer(
        [
          patch(
            "Dockerfile",
            "FROM node\n# === BEGIN MIGRATE_COPY — see PATCH_PLAN ===\n# === END MIGRATE_COPY ===\nCMD node\n",
          ),
          patch("Dockerfile", "COPY migrate /migrate\n", {
            sections: ["MIGRATE_COPY"],
          }),
        ],
        ctx(),
      ),
    ).toBe(
      "FROM node\n# === BEGIN MIGRATE_COPY — see PATCH_PLAN ===\nCOPY migrate /migrate\n# === END MIGRATE_COPY ===\nCMD node\n",
    );
  });

  test("fills <!-- BEGIN/END --> holes in csproj seeds", () => {
    expect(
      writer(
        [
          patch(
            "App.csproj",
            "<ItemGroup>\n    <!-- === BEGIN DIALECT_PACKAGES — see PATCH_PLAN === -->\n    <!-- === END DIALECT_PACKAGES === -->\n</ItemGroup>\n",
          ),
          patch(
            "App.csproj",
            '    <PackageReference Include="Npgsql" Version="9.0.0" />\n',
            { sections: ["DIALECT_PACKAGES"] },
          ),
        ],
        ctx(),
      ),
    ).toBe(
      "<ItemGroup>\n    <!-- === BEGIN DIALECT_PACKAGES — see PATCH_PLAN === -->\n    <PackageReference Include=\"Npgsql\" Version=\"9.0.0\" />\n    <!-- === END DIALECT_PACKAGES === -->\n</ItemGroup>\n",
    );
  });

  test("appends missing csproj sections with XML comments", () => {
    expect(
      writer(
        [
          patch("App.csproj", "<Project />\n"),
          patch("App.csproj", "<PackageReference />\n", {
            sections: ["DIALECT_PACKAGES"],
          }),
        ],
        ctx(),
      ),
    ).toBe(
      "<Project />\n<!-- — START DIALECT_PACKAGES -->\n<PackageReference />\n<!-- — END DIALECT_PACKAGES -->\n",
    );
  });

  test("fills Cargo.toml BEGIN/END holes from a seed", () => {
    expect(
      writer(
        [
          patch(
            "Cargo.toml",
            "[package]\n# === BEGIN PERF_BIN ===\n# === END PERF_BIN ===\n",
          ),
          patch(
            "Cargo.toml",
            '[[bin]]\nname = "perf_server"\npath = "src/bin/perf_server.rs"',
            { sections: ["PERF_BIN"] },
          ),
        ],
        ctx(),
      ),
    ).toBe(
      '[package]\n# === BEGIN PERF_BIN ===\n[[bin]]\nname = "perf_server"\npath = "src/bin/perf_server.rs"\n# === END PERF_BIN ===\n',
    );
  });

  test("conflicting seeds throw when failOnCollision is on", () => {
    expect(() =>
      writer(
        [patch("Dockerfile", "A\n"), patch("Dockerfile", "B\n")],
        ctx(true),
      ),
    ).toThrow(/collision in "Dockerfile" seed/);
    expect(() =>
      writer(
        [
          patch("Dockerfile", "A\n"),
          patch("Dockerfile", "A\n", { failIfExists: true }),
        ],
        ctx(),
      ),
    ).toThrow(/seed already exists/);
  });

  test("rejects empty or invalid sections and appendIfNotExists", () => {
    expect(() =>
      writer([patch(".env", "x\n", { sections: [] })], ctx()),
    ).toThrow(/non-empty array/);
    expect(() =>
      writer([patch(".env", "x\n", { sections: [""] })], ctx()),
    ).toThrow(/non-empty strings/);
    expect(() =>
      writer(
        [
          patch(".env", "x\n", {
            sections: ["A"],
            // @ts-expect-error runtime guard
            appendIfNotExists: "Middle",
          }),
        ],
        ctx(),
      ),
    ).toThrow(/None, End, or Start/);
  });

  test("compose of no patches is empty", () => {
    expect(writer([], ctx())).toBe("");
  });

  test("clears a section body when content is only a newline", () => {
    expect(
      writer(
        [
          patch(".env", "gone\n", { sections: ["A"] }),
          patch(".env", "\n", { sections: ["A"] }),
        ],
        ctx(),
      ),
    ).toBe("# — START A\n# — END A\n");
  });

  test("creates four nested levels in one patch", () => {
    expect(
      writer(
        [
          patch("app.ts", "leaf();\n", {
            sections: ["Root", "Lang", "Feature", "Hook"],
          }),
        ],
        ctx(),
      ),
    ).toBe(
      [
        "// — START Root",
        "// — START Lang",
        "// — START Feature",
        "// — START Hook",
        "leaf();",
        "// — END Hook",
        "// — END Feature",
        "// — END Lang",
        "// — END Root",
        "",
      ].join("\n"),
    );
  });

  test("builds four levels one path segment at a time", () => {
    expect(
      writer(
        [
          patch(".env", "a=1\n", { sections: ["A"] }),
          patch(".env", "b=1\n", { sections: ["A", "B"] }),
          patch(".env", "c=1\n", { sections: ["A", "B", "C"] }),
          patch(".env", "d=1\n", { sections: ["A", "B", "C", "D"] }),
        ],
        ctx(),
      ),
    ).toBe(
      [
        "# — START A",
        "a=1",
        "# — START B",
        "b=1",
        "# — START C",
        "c=1",
        "# — START D",
        "d=1",
        "# — END D",
        "# — END C",
        "# — END B",
        "# — END A",
        "",
      ].join("\n"),
    );
  });

  test("adds a four-level sibling and replaces the original leaf", () => {
    expect(
      writer(
        [
          patch(".env", "old\n", {
            sections: ["A", "B", "C", "D"],
          }),
          patch(".env", "other\n", {
            sections: ["A", "B", "C", "E"],
          }),
          patch(".env", "new\n", {
            sections: ["A", "B", "C", "D"],
          }),
        ],
        ctx(),
      ),
    ).toBe(
      [
        "# — START A",
        "# — START B",
        "# — START C",
        "# — START D",
        "new",
        "# — END D",
        "# — START E",
        "other",
        "# — END E",
        "# — END C",
        "# — END B",
        "# — END A",
        "",
      ].join("\n"),
    );
  });

  test("inserts a missing four-level branch at Start of a deep parent", () => {
    expect(
      writer(
        [
          patch(".env", "keep\n", { sections: ["A", "B", "C"] }),
          patch(".env", "early\n", {
            sections: ["A", "B", "C", "D"],
            appendIfNotExists: "Start",
          }),
        ],
        ctx(),
      ),
    ).toBe(
      [
        "# — START A",
        "# — START B",
        "# — START C",
        "# — START D",
        "early",
        "# — END D",
        "keep",
        "# — END C",
        "# — END B",
        "# — END A",
        "",
      ].join("\n"),
    );
  });
});
