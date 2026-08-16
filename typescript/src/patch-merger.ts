import { readFile, writeFile, mkdir, readdir, chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isNodeError, isRecord, parseJson } from "./json.ts";
import {
  composePatchTarget,
  isPatchTarget,
  outputTarget,
  type ComposeSettings,
} from "./patch-writers/index.ts";

export {
  MarkedSectionMissingError,
  replaceMarkedBlockText,
} from "./marked-sections.ts";
export {
  composePatchTarget,
  conventionForTarget,
  DOCKERIGNORE_TRIGGER,
  dockerignoreSection,
  insertDockerfileCopies,
  isPatchTarget,
  isSharedPatchTarget,
  patchWriterFor,
} from "./patch-writers/index.ts";

type WriteTextFile = (path: string, content: string) => Promise<void>;

export const PATCH_ENTRY_LINE_PREFIX = "DETERMINISTIC_PATCH ";
export const PATCHES_DIR = "deterministic/patches";

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

async function defaultWriteTextFile(
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  if (path.endsWith(".sh")) await chmod(path, 0o755);
}

function catchEnoent<T>(fallback: T) {
  return (err: unknown): T => {
    if (isNodeError(err) && err.code === "ENOENT") return fallback;
    throw err;
  };
}

function groupByTarget(entries: PatchEntry[]): Map<string, PatchEntry[]> {
  const byTarget = new Map<string, PatchEntry[]>();
  for (const entry of entries) {
    const key = outputTarget(entry.target);
    const group = byTarget.get(key);
    if (group) group.push(entry);
    else byTarget.set(key, [entry]);
  }
  return byTarget;
}

export class PatchMerger {
  writeTextFile: WriteTextFile;
  settings: ComposeSettings;
  entries: PatchEntry[];

  constructor({
    writeTextFile,
    settings,
  }: { writeTextFile?: WriteTextFile; settings?: ComposeSettings } = {}) {
    this.writeTextFile = writeTextFile ?? defaultWriteTextFile;
    this.settings = settings;
    this.entries = [];
  }

  register(entry: PatchEntry): void {
    const patch = entry instanceof PatchEntry ? entry : PatchEntry.parse(entry);
    if (!isPatchTarget(patch.target)) {
      throw new Error(
        `PatchMerger.register: no PatchWriter for target '${patch.target}'`,
      );
    }
    this.entries.push(patch);
  }

  hasEntries(): boolean {
    return this.entries.length > 0;
  }

  async apply(rootDir: string): Promise<string[]> {
    return (await writePatches(this, rootDir)).map((w) => w.file);
  }
}

async function writePatches(
  merger: PatchMerger,
  rootDir: string,
): Promise<{ file: string; contents: string }[]> {
  const written: { file: string; contents: string }[] = [];
  for (const [target, pieces] of groupByTarget(merger.entries)) {
    const contents = composePatchTarget({
      target,
      pieces,
      settings: merger.settings,
    });
    if (contents === null) continue;
    const dest = join(rootDir, target);
    await merger.writeTextFile(dest, contents);
    written.push({ file: target, contents });
  }
  return written;
}

export function patchPieceFilename(index: number, target: string): string {
  const safe = target.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${String(index).padStart(5, "0")}-${safe}.json`;
}

export async function assemblePatches({
  patchesDir,
  outRoot,
  writeTextFile = defaultWriteTextFile,
  settings,
}: {
  patchesDir: string;
  outRoot: string;
  writeTextFile?: WriteTextFile;
  settings?: ComposeSettings;
}): Promise<{ file: string; contents: string }[]> {
  const merger = new PatchMerger({
    writeTextFile: async (path, content) => {
      await mkdir(dirname(path), { recursive: true });
      await writeTextFile(path, content);
      if (path.endsWith(".sh")) await chmod(path, 0o755);
    },
    settings,
  });
  const files = (await readdir(patchesDir).catch(catchEnoent([] as string[])))
    .filter((f) => f.endsWith(".json"))
    .sort();
  for (const file of files) {
    merger.register(
      PatchEntry.parse(parseJson(await readFile(join(patchesDir, file), "utf8"))),
    );
  }
  return writePatches(merger, outRoot);
}
