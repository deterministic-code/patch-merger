import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import { createDeepWriter, type JsonObject } from "./deep-document.ts";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: true,
});

export const deepXmlWriter = createDeepWriter({
  name: "DeepXmlWriter",
  parse: (content, target) => {
    const valid = XMLValidator.validate(content);
    if (valid !== true) {
      throw new Error(
        `DeepXmlWriter: invalid XML for "${target}": ${valid.err.msg}`,
      );
    }
    return JSON.parse(JSON.stringify(parser.parse(content)));
  },
  stringify: (root: JsonObject) => {
    const xml = String(builder.build(root)).replace(/\s+$/u, "");
    return xml.length === 0 ? "\n" : `${xml}\n`;
  },
});

export { deepXmlWriter as DeepXmlWriter };
