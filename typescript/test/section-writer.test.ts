import { describe, expect, test } from "vitest";
import { Patch, type PatchOptions } from "../src/patch.ts";
import { SectionWriter } from "../src/writers/section-writer.ts";

const writer = SectionWriter;
const ctx = (failOnCollision = false) => ({ failOnCollision });
const patch = (target: string, content: string, options: PatchOptions) =>
  new Patch({ target, content, options });

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

  test("rejects empty or invalid sections and appendIfNotExists", () => {
    expect(() =>
      writer([patch(".env", "x\n", { sections: [] })], ctx()),
    ).toThrow(/non-empty array/);
    expect(() =>
      writer([patch(".env", "x\n", {})], ctx()),
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
});
