import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { isRecord, parseJson } from "./json.ts";

export const PATCH_ENTRY_LINE_PREFIX = "DETERMINISTIC_PATCH ";

const PATCH_ENTRY_KEYS = new Set(["kind", "target", "content", "section"]);

export class PatchEntry {
  readonly kind = "patch" as const;
  readonly target: string;
  readonly content: string;
  readonly section?: string;

  constructor({
    target,
    content,
    section,
  }: {
    target: string;
    content: string;
    section?: string;
  }) {
    if (content.length === 0) {
      throw new Error(
        `makePatchEntry: content for "${target}" must be a non-empty string`,
      );
    }
    this.target = target;
    this.content = content;
    if (section) this.section = section;
    Object.freeze(this);
  }

  static parse(value: unknown): PatchEntry {
    if (
      !isRecord(value) ||
      value.kind !== "patch" ||
      typeof value.target !== "string" ||
      typeof value.content !== "string"
    ) {
      throw new Error(
        `invalid patch entry: ${JSON.stringify(value)} — expected {kind:"patch", target, content}`,
      );
    }
    if (value.section !== undefined && typeof value.section !== "string") {
      throw new Error(
        `invalid patch entry section: ${JSON.stringify(value.section)} — expected a string`,
      );
    }
    for (const key of Object.keys(value)) {
      if (!PATCH_ENTRY_KEYS.has(key)) {
        throw new Error(
          `invalid patch entry: unexpected key "${key}" — the shape is frozen to {${[...PATCH_ENTRY_KEYS].join(", ")}}`,
        );
      }
    }
    return new PatchEntry({
      target: value.target,
      content: value.content,
      ...(value.section ? { section: value.section } : {}),
    });
  }

  static async readDir(dir: string): Promise<PatchEntry[]> {
    const names = await readdir(dir).catch((err: unknown): string[] => {
      if (isRecord(err) && err.code === "ENOENT") return [];
      throw err;
    });
    const entries: PatchEntry[] = [];
    for (const name of names.filter((f) => f.endsWith(".json")).sort()) {
      entries.push(
        PatchEntry.parse(parseJson(await readFile(join(dir, name), "utf8"))),
      );
    }
    return entries;
  }
}

export function makePatchEntry(args: {
  target: string;
  content: string;
  section?: string;
}): PatchEntry {
  return new PatchEntry(args);
}

export function formatPatchEntryLine(entry: PatchEntry): string {
  return `${PATCH_ENTRY_LINE_PREFIX}${JSON.stringify(entry)}\n`;
}

export function parsePatchEntryLine(line: string): PatchEntry | null {
  if (!line.startsWith(PATCH_ENTRY_LINE_PREFIX)) return null;
  return PatchEntry.parse(parseJson(line.slice(PATCH_ENTRY_LINE_PREFIX.length)));
}
