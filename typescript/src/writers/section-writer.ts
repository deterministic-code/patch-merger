import type { Patch } from "../patch.ts";
import { boolOption } from "../options.ts";
import type { Writer } from "../writer.ts";

export type AppendIfNotExists = "None" | "End" | "Start";

const START_LINE =
  /^([ \t]*)(\/\/|#)\s*[—-]\s*START\s+(\S+)\s*$/;
const END_LINE = /^([ \t]*)(\/\/|#)\s*[—-]\s*END\s+(\S+)\s*$/;

const commentPrefixFor = (target: string): string =>
  /\.(?:ts|tsx|js|jsx|cs|rs)$/.test(target) ? "//" : "#";

const splitLines = (content: string): string[] => {
  const trimmed = content.replace(/\r\n/g, "\n").replace(/\n$/, "");
  return trimmed.length === 0 ? [] : trimmed.split("\n");
};

const joinLines = (lines: string[]): string =>
  lines.length === 0 ? "" : `${lines.join("\n")}\n`;

const marker = (prefix: string, indent: string, kind: "START" | "END", name: string): string =>
  `${indent}${prefix} — ${kind} ${name}`;

type SectionRange = {
  start: number;
  end: number;
  indent: string;
  prefix: string;
};

const findSection = (
  lines: string[],
  name: string,
  lo: number,
  hi: number,
): SectionRange | null => {
  for (let i = lo; i < hi; i++) {
    const start = START_LINE.exec(lines[i] ?? "");
    if (!start || start[3] !== name) continue;
    let nested = 0;
    for (let j = i + 1; j < hi; j++) {
      const open = START_LINE.exec(lines[j] ?? "");
      if (open?.[3] === name) {
        nested += 1;
        continue;
      }
      const close = END_LINE.exec(lines[j] ?? "");
      if (close?.[3] !== name) continue;
      if (nested > 0) {
        nested -= 1;
        continue;
      }
      return {
        start: i,
        end: j,
        indent: start[1] ?? "",
        prefix: start[2] ?? "#",
      };
    }
    throw new Error(`SectionWriter: missing END marker for "${name}"`);
  }
  return null;
};

const countSiblingSections = (
  lines: string[],
  name: string,
  lo: number,
  hi: number,
): number => {
  let count = 0;
  let i = lo;
  while (i < hi) {
    const start = START_LINE.exec(lines[i] ?? "");
    if (!start) {
      i += 1;
      continue;
    }
    const found = findSection(lines, start[3] ?? "", i, hi)!;
    if (start[3] === name) count += 1;
    i = found.end + 1;
  }
  return count;
};

const sectionBlock = (
  names: string[],
  body: string[],
  prefix: string,
  indent: string,
): string[] => {
  if (names.length === 0) return body;
  const [head, ...rest] = names;
  const inner = sectionBlock(rest, body, prefix, indent);
  return [
    marker(prefix, indent, "START", head!),
    ...inner,
    marker(prefix, indent, "END", head!),
  ];
};

const replaceRange = (
  lines: string[],
  start: number,
  deleteCount: number,
  insert: string[],
): string[] => [
  ...lines.slice(0, start),
  ...insert,
  ...lines.slice(start + deleteCount),
];

const readSections = (patch: Patch): string[] => {
  const value = patch.options?.sections;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `SectionWriter: options.sections for "${patch.target}" must be a non-empty array`,
    );
  }
  if (!value.every((name) => typeof name === "string" && name.length > 0)) {
    throw new Error(
      `SectionWriter: options.sections for "${patch.target}" must contain non-empty strings`,
    );
  }
  return value;
};

const readAppendIfNotExists = (patch: Patch): AppendIfNotExists => {
  const value = patch.options?.appendIfNotExists;
  if (value === undefined) return "End";
  if (value === "None" || value === "End" || value === "Start") return value;
  throw new Error(
    `SectionWriter: options.appendIfNotExists for "${patch.target}" must be None, End, or Start`,
  );
};

const insertMissing = (
  lines: string[],
  parent: SectionRange | null,
  block: string[],
  mode: AppendIfNotExists,
  target: string,
  name: string,
): string[] => {
  if (mode === "None") {
    throw new Error(
      `SectionWriter: section "${name}" does not exist in "${target}"`,
    );
  }
  if (!parent) {
    return mode === "Start" ? [...block, ...lines] : [...lines, ...block];
  }
  if (mode === "Start") {
    return replaceRange(lines, parent.start + 1, 0, block);
  }
  return replaceRange(lines, parent.end, 0, block);
};

export const sectionWriter: Writer = (patches, ctx) => {
    let lines: string[] = [];
    const written = new Map<string, string>();

    for (const patch of patches) {
      const sections = readSections(patch);
      const failIfExists = boolOption(patch);
      const appendIfNotExists = readAppendIfNotExists(patch);
      const pathKey = sections.join("/");
      const previous = written.get(pathKey);
      if (previous !== undefined) {
        if (failIfExists) {
          throw new Error(
            `SectionWriter: section "${pathKey}" already exists in "${patch.target}"`,
          );
        }
        if (ctx.failOnCollision && previous !== patch.content) {
          throw new Error(
            `SectionWriter: collision in "${patch.target}" section "${pathKey}"`,
          );
        }
      }
      written.set(pathKey, patch.content);

      const prefix = commentPrefixFor(patch.target);
      const body = splitLines(patch.content);
      let lo = 0;
      let hi = lines.length;
      let parent: SectionRange | null = null;

      for (let i = 0; i < sections.length; i++) {
        const name = sections[i]!;
        const remaining = sections.slice(i);
        const matches = countSiblingSections(lines, name, lo, hi);
        if (ctx.failOnCollision && matches > 1) {
          throw new Error(
            `SectionWriter: collision: duplicate section "${name}" in "${patch.target}"`,
          );
        }
        const found = findSection(lines, name, lo, hi);
        const isLeaf = i === sections.length - 1;

        if (!found) {
          const indent = parent?.indent ?? "";
          const block = sectionBlock(remaining, body, prefix, indent);
          lines = insertMissing(
            lines,
            parent,
            block,
            appendIfNotExists,
            patch.target,
            remaining.join("/"),
          );
          break;
        }

        if (isLeaf) {
          if (failIfExists) {
            throw new Error(
              `SectionWriter: section "${pathKey}" already exists in "${patch.target}"`,
            );
          }
          lines = replaceRange(
            lines,
            found.start + 1,
            found.end - found.start - 1,
            body,
          );
          break;
        }

        parent = found;
        lo = found.start + 1;
        hi = found.end;
      }
    }

    return joinLines(lines);
};

export { sectionWriter as SectionWriter };
