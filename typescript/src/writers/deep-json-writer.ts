import { createDeepWriter } from "./deep-document.ts";

export const deepJsonWriter = createDeepWriter({
  name: "DeepJsonWriter",
  parse: (content, target) => {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `DeepJsonWriter: invalid JSON for "${target}": ${String(error)}`,
      );
    }
  },
  stringify: (root) => `${JSON.stringify(root, null, 2)}\n`,
});

export { deepJsonWriter as DeepJsonWriter };
