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
});
