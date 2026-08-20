import { XMLParser } from "fast-xml-parser";
import { describe, expect, test } from "vitest";
import { Patch, type PatchOptions } from "../src/patch.ts";
import { DeepXmlWriter } from "../src/writers/deep-xml-writer.ts";

const writer = DeepXmlWriter;
const ctx = (failOnCollision = false) => ({ failOnCollision });
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
});

const patch = (
  content: string,
  options: PatchOptions = {},
  target = "app.xml",
) =>
  new Patch({
    target,
    content,
    options,
  });

const parsed = (patches: Patch[], failOnCollision = false) => {
  const xml = writer(patches, ctx(failOnCollision));
  if (xml === null) throw new Error("DeepXmlWriter returned null");
  return xmlParser.parse(xml);
};

describe("DeepXmlWriter", () => {
  test("merges sibling elements under the same root", () => {
    expect(
      parsed([
        patch("<root><name>app</name><scripts><build>vite</build></scripts></root>"),
        patch(
          "<root><scripts><test>vitest</test></scripts><dependencies><a>^1</a></dependencies></root>",
        ),
      ]),
    ).toEqual({
      root: {
        name: "app",
        scripts: { build: "vite", test: "vitest" },
        dependencies: { a: "^1" },
      },
    });
  });

  test("merges into jsonTarget paths and creates intermediates", () => {
    expect(
      parsed([
        patch("<express>^4</express>", { jsonTarget: "/package/dependencies" }),
        patch("<vitest>^2</vitest>", { jsonTarget: "package/devDependencies" }),
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
      parsed([patch("<root><a>1</a></root>"), patch("<root><a>2</a></root>")]),
    ).toEqual({ root: { a: 2 } });
  });

  test("failIfExists rejects an existing leaf and allows new keys", () => {
    expect(() =>
      parsed([
        patch("<root><a>1</a></root>"),
        patch("<root><a>2</a></root>", { failIfExists: true }),
      ]),
    ).toThrow(/already exists/);
    expect(
      parsed([
        patch("<root><a>1</a></root>"),
        patch("<root><b>2</b></root>", { failIfExists: true }),
      ]),
    ).toEqual({ root: { a: 1, b: 2 } });
  });

  test("failOnCollision rejects conflicting values and allows identical ones", () => {
    expect(() =>
      parsed(
        [patch("<root><a>1</a></root>"), patch("<root><a>2</a></root>")],
        true,
      ),
    ).toThrow(/collision/);
    expect(
      parsed(
        [patch("<root><a>1</a></root>"), patch("<root><a>1</a></root>")],
        true,
      ),
    ).toEqual({ root: { a: 1 } });
  });

  test("rejects invalid XML, non-object roots, and non-object path prefixes", () => {
    expect(() => parsed([patch("<root>")])).toThrow(/invalid XML/);
    expect(() => parsed([patch("not-xml")])).toThrow(/invalid XML/);
    expect(() =>
      parsed([
        patch("<root><a>1</a></root>"),
        patch("<b>2</b>", { jsonTarget: "/root/a/b" }),
      ]),
    ).toThrow(/is not an object/);
  });

  test("rejects a non-string jsonTarget", () => {
    expect(() =>
      parsed([
        patch("<root><a>1</a></root>", {
          // @ts-expect-error runtime guard
          jsonTarget: 1,
        }),
      ]),
    ).toThrow(/must be a string/);
  });

  test("compose of no patches is a trailing newline", () => {
    expect(writer([], ctx())).toBe("\n");
  });

  test("jsonTarget empty, slashes, and omitted all mean the root", () => {
    expect(
      parsed([
        patch("<a>1</a>", { jsonTarget: "" }),
        patch("<b>2</b>", { jsonTarget: "/" }),
        patch("<c>3</c>", { jsonTarget: "//" }),
      ]),
    ).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("strips empty jsonTarget segments", () => {
    expect(parsed([patch("<n>1</n>", { jsonTarget: "/pkg//deps/" })])).toEqual({
      pkg: { deps: { n: 1 } },
    });
  });

  test("replaces repeated-tag arrays instead of concatenating them", () => {
    expect(
      parsed([
        patch("<root><item>1</item><item>2</item></root>"),
        patch("<root><item>3</item></root>"),
      ]),
    ).toEqual({ root: { item: 3 } });
  });

  test("replaces an element tree with a primitive and a primitive with a tree", () => {
    expect(
      parsed([
        patch("<root><a><b>1</b></a></root>"),
        patch("<root><a>2</a></root>"),
      ]),
    ).toEqual({ root: { a: 2 } });
    expect(
      parsed([
        patch("<root><a>1</a></root>"),
        patch("<root><a><b>2</b></a></root>"),
      ]),
    ).toEqual({ root: { a: { b: 2 } } });
  });

  test("failIfExists allows nested object merges and rejects text replacement", () => {
    expect(
      parsed([
        patch("<root><scripts><build>vite</build></scripts></root>"),
        patch("<root><scripts><test>vitest</test></scripts></root>", {
          failIfExists: true,
        }),
      ]),
    ).toEqual({ root: { scripts: { build: "vite", test: "vitest" } } });
    expect(() =>
      parsed([
        patch("<root><item>1</item></root>"),
        patch("<root><item>1</item></root>", { failIfExists: true }),
      ]),
    ).toThrow(/already exists/);
  });

  test("failOnCollision allows identical nested objects and rejects mixed types", () => {
    expect(
      parsed(
        [
          patch("<root><a><b>1</b></a></root>"),
          patch("<root><a><b>1</b><c>2</c></a></root>"),
        ],
        true,
      ),
    ).toEqual({ root: { a: { b: 1, c: 2 } } });
    expect(() =>
      parsed(
        [patch("<root><a><b>1</b></a></root>"), patch("<root><a>1</a></root>")],
        true,
      ),
    ).toThrow(/collision/);
  });

  test("merges attributes onto the same element", () => {
    expect(
      parsed([
        patch('<item id="1"/>'),
        patch('<item name="widget"/>'),
      ]),
    ).toEqual({ item: { "@_id": 1, "@_name": "widget" } });
  });

  test("preserves boolean attributes and numeric text", () => {
    expect(parsed([patch('<flag enabled="true"/>')])).toEqual({
      flag: { "@_enabled": true },
    });
    expect(parsed([patch("<count>0</count>")])).toEqual({ count: 0 });
  });

  test("self-closing empty root still stringifies as XML", () => {
    const xml = writer([patch("<root/>")], ctx());
    expect(xml).toMatch(/<root\s*\/>/);
    expect(xml?.endsWith("\n")).toBe(true);
  });

  test("deep-merges three patches at different depths", () => {
    expect(
      parsed([
        patch("<services><api><image>api:1</image></api></services>"),
        patch("<port>80</port>", { jsonTarget: "/services/api" }),
        patch("<restart>always</restart>", { jsonTarget: "/services/api" }),
      ]),
    ).toEqual({
      services: { api: { image: "api:1", port: 80, restart: "always" } },
    });
  });

  test("later patch wins when failOnCollision is false", () => {
    expect(
      parsed([
        patch("<root><value>old</value></root>"),
        patch("<root><value>new</value></root>"),
      ]),
    ).toEqual({ root: { value: "new" } });
  });

  test("identical nested documents are allowed under failOnCollision", () => {
    expect(
      parsed(
        [
          patch("<root><list><item>a</item><item>b</item></list></root>"),
          patch("<root><list><item>a</item><item>b</item></list></root>"),
        ],
        true,
      ),
    ).toEqual({ root: { list: { item: ["a", "b"] } } });
  });

  test("conflicting nested arrays throw under failOnCollision", () => {
    expect(() =>
      parsed(
        [
          patch("<root><item>a</item><item>b</item></root>"),
          patch("<root><item>a</item></root>"),
        ],
        true,
      ),
    ).toThrow(/collision/);
  });

  test("comments are ignored by the XML parser", () => {
    expect(
      parsed([patch("<root><!-- ignore --><a>1</a></root>")]),
    ).toEqual({ root: { a: 1 } });
  });

  test("CDATA becomes text", () => {
    expect(parsed([patch("<root><a><![CDATA[x<y]]></a></root>")])).toEqual({
      root: { a: "x<y" },
    });
  });

  test("namespaces stay on tag names", () => {
    expect(parsed([patch("<ns:root xmlns:ns='urn:x'><ns:a>1</ns:a></ns:root>")])).toEqual(
      {
        "ns:root": { "ns:a": 1, "@_xmlns:ns": "urn:x" },
      },
    );
  });
});
