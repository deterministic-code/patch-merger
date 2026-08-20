import { boolOption } from "../options.ts";
import type { Writer } from "../writer.ts";

const lineKey = (line: string) => {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
  return match ? `env:${match[1]}` : `line:${line}`;
};

const patchLines = (content: string) =>
  content
    .replace(/\r\n/g, "\n")
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

export const lineUpsertWriter: Writer = (patches, ctx) => {
  const order: string[] = [];
  const values = new Map<string, string>();

  for (const patch of patches) {
    const failIfExists = boolOption(patch);
    for (const line of patchLines(patch.content)) {
      const key = lineKey(line);
      const existing = values.get(key);
      if (existing !== undefined) {
        if (failIfExists) {
          throw new Error(
            `LineUpsertWriter: line already exists in "${patch.target}" (${key})`,
          );
        }
        if (ctx.failOnCollision && existing !== line) {
          throw new Error(
            `LineUpsertWriter: collision in "${patch.target}" (${key})`,
          );
        }
      } else {
        order.push(key);
      }
      values.set(key, line);
    }
  }

  return order.length === 0
    ? ""
    : `${order.map((key) => values.get(key)).join("\n")}\n`;
};

export { lineUpsertWriter as LineUpsertWriter };
