import { parse, stringify } from "yaml";
import { createDeepWriter } from "./deep-document.ts";

export const deepYamlWriter = createDeepWriter({
  name: "DeepYamlWriter",
  parse: (content, target) => {
    try {
      const parsed = parse(content) ?? {};
      return JSON.parse(JSON.stringify(parsed));
    } catch (error) {
      throw new Error(
        `DeepYamlWriter: invalid YAML for "${target}": ${String(error)}`,
      );
    }
  },
  stringify: (root) => {
    const text = stringify(root, { indent: 2 }).replace(/\s+$/u, "");
    return `${text}\n`;
  },
});

export { deepYamlWriter as DeepYamlWriter };
