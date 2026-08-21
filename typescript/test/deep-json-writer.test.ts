import { describe, expect, test } from "vitest";
import { Patch, type PatchOptions } from "../src/patch.ts";
import { DeepJsonWriter } from "../src/writers/deep-json-writer.ts";

const writer = DeepJsonWriter;
const ctx = (failOnCollision = false) => ({ failOnCollision });
const patch = (
  content: string | object,
  options: PatchOptions = {},
  target = "package.json",
) =>
  new Patch({
    target,
    content: typeof content === "string" ? content : JSON.stringify(content),
    options,
  });

const parsed = (patches: Patch[], failOnCollision = false) => {
  const json = writer(patches, ctx(failOnCollision));
  if (json === null) throw new Error("DeepJsonWriter returned null");
  return JSON.parse(json);
};

describe("DeepJsonWriter", () => {
  test("merges at the root by default", () => {
    expect(
      parsed([
        patch({ name: "app", scripts: { build: "vite" } }),
        patch({ scripts: { test: "vitest" }, dependencies: { a: "^1" } }),
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
        patch({ express: "^4" }, { jsonTarget: "/package/dependencies" }),
        patch({ vitest: "^2" }, { jsonTarget: "package/devDependencies" }),
      ]),
    ).toEqual({
      package: {
        dependencies: { express: "^4" },
        devDependencies: { vitest: "^2" },
      },
    });
  });

  test("replaces a primitive when failIfExists is false", () => {
    expect(
      parsed([patch({ a: 1 }), patch({ a: 2 })]),
    ).toEqual({ a: 2 });
  });

  test("failIfExists rejects an existing leaf and allows new keys", () => {
    expect(() =>
      parsed([
        patch({ a: 1 }),
        patch({ a: 2 }, { failIfExists: true }),
      ]),
    ).toThrow(/already exists/);
    expect(
      parsed([
        patch({ a: 1 }),
        patch({ b: 2 }, { failIfExists: true }),
      ]),
    ).toEqual({ a: 1, b: 2 });
  });

  test("failOnCollision rejects conflicting values and allows identical ones", () => {
    expect(() => parsed([patch({ a: 1 }), patch({ a: 2 })], true)).toThrow(
      /collision/,
    );
    expect(parsed([patch({ a: 1 }), patch({ a: 1 })], true)).toEqual({ a: 1 });
  });

  test("rejects invalid JSON, non-object roots, and non-object path prefixes", () => {
    expect(() => parsed([patch("{")])).toThrow(/invalid JSON/);
    expect(() => parsed([patch("null")])).toThrow(/is not an object/);
    expect(() => parsed([patch("[1]")])).toThrow(/is not an object/);
    expect(() =>
      parsed([
        patch({ a: 1 }),
        patch({ b: 2 }, { jsonTarget: "/a/b" }),
      ]),
    ).toThrow(/is not an object/);
  });

  test("rejects a non-string jsonTarget", () => {
    expect(() =>
      parsed([
        patch({ a: 1 }, {
          // @ts-expect-error runtime guard
          jsonTarget: 1,
        }),
      ]),
    ).toThrow(/must be a string/);
  });

  test("compose of no patches is an empty object", () => {
    expect(writer([], ctx())).toBe("{}\n");
  });

  test("jsonTarget empty, slashes, and omitted all mean the root", () => {
    expect(
      parsed([
        patch({ a: 1 }, { jsonTarget: "" }),
        patch({ b: 2 }, { jsonTarget: "/" }),
        patch({ c: 3 }, { jsonTarget: "//" }),
      ]),
    ).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("strips empty jsonTarget segments", () => {
    expect(
      parsed([patch({ n: 1 }, { jsonTarget: "/pkg//deps/" })]),
    ).toEqual({ pkg: { deps: { n: 1 } } });
  });

  test("concatenates unique array items in first-seen order", () => {
    expect(
      parsed([
        patch({ include: ["app.ts", "server.ts"] }),
        patch({ include: ["services/**/*.ts"] }),
        patch({ include: ["services/**/*.ts", "routes/**/*.ts"] }),
      ]),
    ).toEqual({
      include: ["app.ts", "server.ts", "services/**/*.ts", "routes/**/*.ts"],
    });
  });

  test("replaces an object with a primitive and a primitive with an object", () => {
    expect(parsed([patch({ a: { b: 1 } }), patch({ a: 2 })])).toEqual({ a: 2 });
    expect(parsed([patch({ a: 1 }), patch({ a: { b: 2 } })])).toEqual({
      a: { b: 2 },
    });
  });

  test("failIfExists allows nested object merges and unique array concatenation", () => {
    expect(
      parsed([
        patch({ scripts: { build: "vite" } }),
        patch({ scripts: { test: "vitest" } }, { failIfExists: true }),
      ]),
    ).toEqual({ scripts: { build: "vite", test: "vitest" } });
    expect(
      parsed([
        patch({ items: [1] }),
        patch({ items: [1, 2] }, { failIfExists: true }),
      ]),
    ).toEqual({ items: [1, 2] });
  });

  test("failOnCollision allows identical nested objects and rejects mixed types", () => {
    expect(
      parsed(
        [patch({ a: { b: 1 } }), patch({ a: { b: 1, c: 2 } })],
        true,
      ),
    ).toEqual({ a: { b: 1, c: 2 } });
    expect(() =>
      parsed([patch({ a: { b: 1 } }), patch({ a: 1 })], true),
    ).toThrow(/collision/);
  });

  test("boolean, string, and null leaves merge at siblings", () => {
    expect(
      parsed([
        patch({ ok: true, name: "app", missing: null }),
        patch({ count: 0 }),
      ]),
    ).toEqual({ ok: true, name: "app", missing: null, count: 0 });
  });
});
