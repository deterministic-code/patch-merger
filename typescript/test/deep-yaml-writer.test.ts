import { parse } from "yaml";
import { describe, expect, test } from "vitest";
import { Patch, type PatchOptions } from "../src/patch.ts";
import { DeepYamlWriter } from "../src/writers/deep-yaml-writer.ts";

const writer = DeepYamlWriter;
const ctx = (failOnCollision = false) => ({ failOnCollision });
const patch = (
  content: string,
  options: PatchOptions = {},
  target = "app.yaml",
) =>
  new Patch({
    target,
    content,
    options,
  });

const parsed = (patches: Patch[], failOnCollision = false) => {
  const yaml = writer(patches, ctx(failOnCollision));
  if (yaml === null) throw new Error("DeepYamlWriter returned null");
  return parse(yaml);
};

describe("DeepYamlWriter", () => {
  test("merges at the root by default", () => {
    expect(
      parsed([
        patch("name: app\nscripts:\n  build: vite\n"),
        patch("scripts:\n  test: vitest\ndependencies:\n  a: '^1'\n"),
      ]),
    ).toEqual({
      name: "app",
      scripts: { build: "vite", test: "vitest" },
      dependencies: { a: "^1" },
    });
  });

  test("merges into jsonTarget paths and creates intermediates", () => {
    expect(
      parsed([
        patch("express: '^4'\n", { jsonTarget: "/package/dependencies" }),
        patch("vitest: '^2'\n", { jsonTarget: "package/devDependencies" }),
      ]),
    ).toEqual({
      package: {
        dependencies: { express: "^4" },
        devDependencies: { vitest: "^2" },
      },
    });
  });

  test("replaces a primitive when failIfExists is false", () => {
    expect(parsed([patch("a: 1\n"), patch("a: 2\n")])).toEqual({ a: 2 });
  });

  test("failIfExists rejects an existing leaf and allows new keys", () => {
    expect(() =>
      parsed([patch("a: 1\n"), patch("a: 2\n", { failIfExists: true })]),
    ).toThrow(/already exists/);
    expect(
      parsed([patch("a: 1\n"), patch("b: 2\n", { failIfExists: true })]),
    ).toEqual({ a: 1, b: 2 });
  });

  test("failOnCollision rejects conflicting values and allows identical ones", () => {
    expect(() => parsed([patch("a: 1\n"), patch("a: 2\n")], true)).toThrow(
      /collision/,
    );
    expect(parsed([patch("a: 1\n"), patch("a: 1\n")], true)).toEqual({ a: 1 });
  });

  test("rejects invalid YAML, non-object roots, and non-object path prefixes", () => {
    expect(() => parsed([patch("{ [")])).toThrow(/invalid YAML/);
    expect(() => parsed([patch("[1]\n")])).toThrow(/is not an object/);
    expect(() => parsed([patch("just-a-string\n")])).toThrow(/is not an object/);
    expect(() => parsed([patch("true\n")])).toThrow(/is not an object/);
    expect(() => parsed([patch("0\n")])).toThrow(/is not an object/);
    expect(() =>
      parsed([patch("a: 1\n"), patch("b: 2\n", { jsonTarget: "/a/b" })]),
    ).toThrow(/is not an object/);
  });

  test("treats null and empty YAML documents as an empty object", () => {
    expect(parsed([patch("---\n")])).toEqual({});
    expect(parsed([patch("null\n")])).toEqual({});
    expect(parsed([patch("~\n")])).toEqual({});
  });

  test("rejects a non-string jsonTarget", () => {
    expect(() =>
      parsed([
        patch("a: 1\n", {
          // @ts-expect-error runtime guard
          jsonTarget: 1,
        }),
      ]),
    ).toThrow(/must be a string/);
  });

  test("compose of no patches is an empty mapping", () => {
    expect(writer([], ctx())).toBe("{}\n");
  });

  test("jsonTarget empty, slashes, and omitted all mean the root", () => {
    expect(
      parsed([
        patch("a: 1\n", { jsonTarget: "" }),
        patch("b: 2\n", { jsonTarget: "/" }),
        patch("c: 3\n", { jsonTarget: "//" }),
      ]),
    ).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("strips empty jsonTarget segments", () => {
    expect(parsed([patch("n: 1\n", { jsonTarget: "/pkg//deps/" })])).toEqual({
      pkg: { deps: { n: 1 } },
    });
  });

  test("concatenates unique array items in first-seen order", () => {
    expect(
      parsed([patch("items:\n  - 1\n  - 2\n"), patch("items:\n  - 3\n")]),
    ).toEqual({ items: [1, 2, 3] });
  });

  test("replaces an object with a primitive and a primitive with an object", () => {
    expect(parsed([patch("a:\n  b: 1\n"), patch("a: 2\n")])).toEqual({ a: 2 });
    expect(parsed([patch("a: 1\n"), patch("a:\n  b: 2\n")])).toEqual({
      a: { b: 2 },
    });
  });

  test("failIfExists allows nested object merges and unique array concatenation", () => {
    expect(
      parsed([
        patch("scripts:\n  build: vite\n"),
        patch("scripts:\n  test: vitest\n", { failIfExists: true }),
      ]),
    ).toEqual({ scripts: { build: "vite", test: "vitest" } });
    expect(
      parsed([
        patch("items:\n  - 1\n"),
        patch("items:\n  - 1\n  - 2\n", { failIfExists: true }),
      ]),
    ).toEqual({ items: [1, 2] });
  });

  test("failOnCollision allows identical nested objects and rejects mixed types", () => {
    expect(
      parsed([patch("a:\n  b: 1\n"), patch("a:\n  b: 1\n  c: 2\n")], true),
    ).toEqual({ a: { b: 1, c: 2 } });
    expect(() =>
      parsed([patch("a:\n  b: 1\n"), patch("a: 1\n")], true),
    ).toThrow(/collision/);
  });

  test("preserves booleans, numbers, null, and quoted strings", () => {
    expect(
      parsed([
        patch("ok: true\ncount: 0\nmissing: null\nname: 'app'\n"),
        patch("nested:\n  flag: false\n"),
      ]),
    ).toEqual({
      ok: true,
      count: 0,
      missing: null,
      name: "app",
      nested: { flag: false },
    });
  });

  test("merges flow mappings and nested block mappings", () => {
    expect(
      parsed([
        patch("{ env: { NODE_ENV: production } }\n"),
        patch("env:\n  PORT: 3000\n"),
      ]),
    ).toEqual({ env: { NODE_ENV: "production", PORT: 3000 } });
  });

  test("stringifies dates from YAML tags as JSON-safe strings", () => {
    const result = parsed([patch("released: 2024-01-02\n")]);
    expect(result).toEqual({ released: "2024-01-02" });
  });

  test("deep-merges three patches at different depths", () => {
    expect(
      parsed([
        patch("services:\n  api:\n    image: api:1\n"),
        patch("ports:\n  - 80\n", { jsonTarget: "/services/api" }),
        patch("restart: always\n", { jsonTarget: "/services/api" }),
      ]),
    ).toEqual({
      services: { api: { image: "api:1", ports: [80], restart: "always" } },
    });
  });

  test("later patch wins when failOnCollision is false", () => {
    expect(
      parsed([
        patch("list:\n  - a\nvalue: old\n"),
        patch("list:\n  - b\nvalue: new\n"),
      ]),
    ).toEqual({ list: ["a", "b"], value: "new" });
  });

  test("identical arrays are allowed under failOnCollision", () => {
    expect(
      parsed([patch("list:\n  - a\n  - b\n"), patch("list:\n  - a\n  - b\n")], true),
    ).toEqual({ list: ["a", "b"] });
  });

  test("distinct arrays concatenate under failOnCollision", () => {
    expect(
      parsed([patch("list:\n  - a\n"), patch("list:\n  - b\n")], true),
    ).toEqual({ list: ["a", "b"] });
  });

  test("writes a trailing newline", () => {
    const yaml = writer([patch("a: 1\n")], ctx());
    expect(yaml?.endsWith("\n")).toBe(true);
    expect(yaml?.endsWith("\n\n")).toBe(false);
  });

  test("round-trips multiline strings", () => {
    expect(parsed([patch("note: |\n  hello\n  world\n")])).toEqual({
      note: "hello\nworld\n",
    });
  });
});
