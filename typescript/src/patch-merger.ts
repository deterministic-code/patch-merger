import { readFile, writeFile, mkdir, readdir, chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  MarkedSectionMissingError,
  replaceMarkedBlockText,
} from "./marked-sections.ts";
import {
  SHARED_FILE_CONVENTIONS,
  sharedAppendWriter,
} from "./patch-writers/shared-append-writer.ts";
import { packageJsonMergeWriter } from "./patch-writers/package-json-writer.ts";
import { markedBlockWriter } from "./patch-writers/marked-block-writer.ts";
import { cargoTomlWriter } from "./patch-writers/cargo-toml-writer.ts";
import { dockerfileWriter } from "./patch-writers/dockerfile-writer.ts";
import { modRsWriter } from "./patch-writers/mod-rs-writer.ts";
import { libRsWriter } from "./patch-writers/lib-rs-writer.ts";
import {
  dockerignoreWriter,
  type ComposeSettings,
} from "./patch-writers/dockerignore-writer.ts";
import { isNodeError, isRecord, parseJson } from "./json.ts";
export {
  DOCKERIGNORE_TRIGGER,
  dockerignoreSection,
} from "./patch-writers/dockerignore-writer.ts";

// `@deterministic-code/emitter-sdk/patch-merger` stays the single import surface: the marked-section text ops, shared-file query helpers, and Dockerfile COPY inserter live in their own modules now but are re-exported here.
export { MarkedSectionMissingError, replaceMarkedBlockText };
export {
  conventionForTarget,
  isSharedPatchTarget,
} from "./patch-writers/shared-append-writer.ts";
export { insertDockerfileCopies } from "./patch-writers/dockerfile-copy-writer.ts";

export type PatchEntry = {
  kind: "patch";
  target: string;
  content: string;
  section?: string;
};

type PatchWriter = (
  pieces: PatchEntry[],
  settings?: ComposeSettings,
) => string | null;

export const PATCH_ENTRY_LINE_PREFIX = "DETERMINISTIC_PATCH ";

// Any target with a registered PatchWriter (by basename or extension) — the merger accepts these, the rest throw.
export function isPatchTarget(target: string): boolean {
  return writersFor(target) !== undefined;
}

export function makePatchEntry({
  target,
  content,
  section,
}: {
  target: string;
  content: string;
  section?: string;
}): PatchEntry {
  if (content.length === 0) {
    throw new Error(
      `makePatchEntry: content for "${target}" must be a non-empty string`,
    );
  }
  const entry: PatchEntry = { kind: "patch", target, content };
  if (section) entry.section = section;
  return entry;
}

// Map<basename, writer>. Each file has exactly one PatchWriter that owns how it merges — the Dockerfile writer internally handles both COPY insertion and marked-block replacement, so there is no per-method axis. Each writer function lives in ./patch-writers/.
const PATCH_WRITERS: Map<string, PatchWriter> = new Map<string, PatchWriter>([
  ...Object.entries(SHARED_FILE_CONVENTIONS).map(
    ([base, convention]): [string, PatchWriter] => [
      base,
      sharedAppendWriter(convention),
    ],
  ),
  ["package.json", packageJsonMergeWriter],
  ["Cargo.toml", cargoTomlWriter],
  ["app.ts", markedBlockWriter],
  ["test-app.ts", markedBlockWriter],
  ["entrypoint.sh", markedBlockWriter],
  ["Dockerfile", dockerfileWriter],
  [".csproj", markedBlockWriter],
  ["mod.rs", modRsWriter],
  ["lib.rs", libRsWriter],
  [".dockerignore", dockerignoreWriter],
]);

function basename(target: string): string {
  return target.slice(target.lastIndexOf("/") + 1);
}

// The file extension (`.csproj`) for targets whose basename is project-specific (GeneratedApp.csproj); "" for dotfiles/no-extension so it never shadows a basename rule.
function extname(target: string): string {
  const base = basename(target);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot) : "";
}

function writersFor(target: string): PatchWriter | undefined {
  return (
    PATCH_WRITERS.get(basename(target)) ?? PATCH_WRITERS.get(extname(target))
  );
}

/** The patch writer for a target file, dispatched by basename|extension. Null when none is registered. */
export function patchWriterFor(target: string): PatchWriter | null {
  return writersFor(target) ?? null;
}

/** Compose a target file from its pieces — order-independent, no target read off disk. The filename-keyed writer identifies its own skeleton piece and fills/merges the rest; returns null when the pieces don't materialize the file (no owner/skeleton). `settings` is the run's resolved settings so a writer can derive the output layout (the root `.dockerignore` derives its per-lane ignore prefixes from the declared languages + tier); writers that don't need it ignore the second arg. */
export function composePatchTarget({
  target,
  pieces,
  settings,
}: {
  target: string;
  pieces: PatchEntry[];
  settings?: ComposeSettings;
}): string | null {
  const writer = patchWriterFor(target);
  if (!writer) {
    throw new Error(`composePatchTarget: no writer for '${target}'`);
  }
  return writer(pieces, settings);
}

export function formatPatchEntryLine(entry: PatchEntry): string {
  assertPatchEntry(entry);
  return `${PATCH_ENTRY_LINE_PREFIX}${JSON.stringify(entry)}\n`;
}

export function parsePatchEntryLine(line: string): PatchEntry | null {
  if (!line.startsWith(PATCH_ENTRY_LINE_PREFIX)) return null;
  const entry = parseJson(line.slice(PATCH_ENTRY_LINE_PREFIX.length));
  assertPatchEntry(entry);
  return entry;
}

// The FROZEN SDK patch-entry shape — dumb data the filename-keyed PatchWriter composes; no key the writer selects on (no method / language / markers).
const PATCH_ENTRY_KEYS = new Set(["kind", "target", "content", "section"]);

function assertPatchEntry(entry: unknown): asserts entry is PatchEntry {
  if (
    !isRecord(entry) ||
    entry.kind !== "patch" ||
    typeof entry.target !== "string" ||
    typeof entry.content !== "string"
  ) {
    throw new Error(
      `invalid patch entry: ${JSON.stringify(entry)} — expected {kind:"patch", target, content}`,
    );
  }
  if (entry.section !== undefined && typeof entry.section !== "string") {
    throw new Error(
      `invalid patch entry section: ${JSON.stringify(entry.section)} — expected a string`,
    );
  }
  for (const key of Object.keys(entry)) {
    if (!PATCH_ENTRY_KEYS.has(key)) {
      throw new Error(
        `invalid patch entry: unexpected key "${key}" — the shape is frozen to {${[...PATCH_ENTRY_KEYS].join(", ")}}`,
      );
    }
  }
}

async function readFileOrNull(filePath: string): Promise<string | null> {
  return readFile(filePath, "utf8").catch((err: unknown) => {
    if (isNodeError(err) && err.code === "ENOENT") return null;
    throw err;
  });
}

async function defaultWriteTextFile(
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

type WriteTextFile = (path: string, content: string) => Promise<void>;

export interface PatchMarkedBlockArgs {
  filePath: string;
  startMarker: string;
  endMarker: string;
  block: string;
  missingFileOk?: boolean;
  contextLabel?: string;
}

export interface EnsureLinesInMarkedBlockArgs {
  filePath: string;
  startMarker: string;
  endMarker: string;
  lines: string[];
  contextLabel?: string;
}

// Stateless single-file marked-section editor. writeTextFile is injectable so the server can route through its manifest-aware writer.
export class MarkedFileEditor {
  writeTextFile: WriteTextFile;

  constructor({ writeTextFile }: { writeTextFile?: WriteTextFile } = {}) {
    this.writeTextFile = writeTextFile ?? defaultWriteTextFile;
  }

  async patchMarkedBlock({
    filePath,
    startMarker,
    endMarker,
    block,
    missingFileOk = true,
    contextLabel,
  }: PatchMarkedBlockArgs): Promise<boolean> {
    const original = await readFileOrNull(filePath);
    if (original === null) {
      if (missingFileOk) return false;
      throw new Error(
        `patchMarkedBlock: ${filePath} does not exist (contextLabel=${contextLabel ?? "unspecified"})`,
      );
    }
    let next: string;
    try {
      next = replaceMarkedBlockText({
        original,
        startMarker,
        endMarker,
        block,
      });
    } catch (err) {
      if (err instanceof MarkedSectionMissingError) {
        throw new Error(
          `patchMarkedBlock: ${filePath} is missing the expected '${startMarker}' / '${endMarker}' markers — the backend_app step's template markers are absent; re-run codegen (backend_app) first (${contextLabel ?? "unspecified"}).`,
        );
      }
      throw err;
    }
    if (next === original) return false;
    await this.writeTextFile(filePath, next);
    return true;
  }

  async ensureLinesInMarkedBlock({
    filePath,
    startMarker,
    endMarker,
    lines,
    contextLabel,
  }: EnsureLinesInMarkedBlockArgs): Promise<boolean> {
    const original = await readFileOrNull(filePath);
    if (original === null) return false;
    const startIdx = original.indexOf(startMarker);
    const endIdx = original.indexOf(endMarker);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
      throw new Error(
        `ensureLinesInMarkedBlock: ${filePath} is missing the expected '${startMarker}' / '${endMarker}' markers (${contextLabel ?? "unspecified"}).`,
      );
    }
    const existing = original
      .slice(startIdx + startMarker.length, endIdx)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    // Re-join attribute lines (e.g. #[cfg(test)]) with the declaration below them so entries stay atomic.
    const entries: string[] = [];
    for (const l of existing) {
      const last = entries[entries.length - 1];
      if (last?.endsWith("]")) {
        entries[entries.length - 1] = `${last}\n${l}`;
      } else {
        entries.push(l);
      }
    }
    const union = new Set(entries);
    for (const line of lines) union.add(line.trim());
    return await this.patchMarkedBlock({
      filePath,
      startMarker,
      endMarker,
      block: [...union].sort().join("\n"),
      ...(contextLabel === undefined ? {} : { contextLabel }),
    });
  }
}

// Group entries as output-file -> patches[], preserving insertion order so a file's patches apply in emit order. Every `.dockerignore` piece composes into the root file (Docker build context is `.`); a nested target like `backend/typescript/.dockerignore` only carries the lane prefix.
function outputTarget(target: string): string {
  return basename(target) === ".dockerignore" ? ".dockerignore" : target;
}

function groupByTarget(entries: PatchEntry[]): Map<string, PatchEntry[]> {
  const byTarget = new Map<string, PatchEntry[]>();
  for (const entry of entries) {
    const key = outputTarget(entry.target);
    byTarget.set(key, [...(byTarget.get(key) ?? []), entry]);
  }
  return byTarget;
}

// Stateful collector: accumulates patch entries and merges them into their target files (shared-append .env/.gitignore/compose, package.json, Cargo.toml, Dockerfile) on apply, each via its registered PatchWriter.
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
    assertPatchEntry(entry);
    if (!isPatchTarget(entry.target)) {
      throw new Error(
        `PatchMerger.register: no PatchWriter for target '${entry.target}'`,
      );
    }
    this.entries.push(entry);
  }

  hasEntries(): boolean {
    return this.entries.length > 0;
  }

  async apply(rootDir: string): Promise<string[]> {
    const written: string[] = [];
    for (const [target, pieces] of groupByTarget(this.entries)) {
      const composed = composePatchTarget({
        target,
        pieces,
        settings: this.settings,
      });
      if (composed !== null) {
        await this.writeTextFile(join(rootDir, target), composed);
        written.push(target);
      }
    }
    return written;
  }
}

// The gitignored staging dir (project-root-relative) where each emitter persists its patch pieces; the end-of-run assemble pass composes every target from them. One file per piece so a piece never needs its target to exist.
export const PATCHES_DIR = "deterministic/patches";

/** Deterministic piece filename: a zero-padded emit-order index (the assemble sort key, so shared-append upserts stay in emit order) plus the sanitized project-root-relative target for readability. Uniqueness comes from the index; the index owner (EmitPlan) makes it monotonic across steps. */
export function patchPieceFilename(index: number, target: string): string {
  const safe = target.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${String(index).padStart(5, "0")}-${safe}.json`;
}

async function readdirOrEmpty(dir: string): Promise<string[]> {
  return readdir(dir).catch((err: unknown): string[] => {
    if (isNodeError(err) && err.code === "ENOENT") return [];
    throw err;
  });
}

/** Assemble every target from the persisted pieces in `patchesDir`: read all `*.json` pieces in emit order (filename sort), group by project-root-relative target, compose each with its filename-keyed writer, and write the result under `outRoot`. Pure composition — no target is read off disk. Returns the composed `{ file, contents }[]` so the run can record them without re-reading disk. */
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
  const files = (await readdirOrEmpty(patchesDir))
    .filter((f) => f.endsWith(".json"))
    .sort();
  const pieces: PatchEntry[] = [];
  for (const file of files) {
    const entry = parseJson(await readFile(join(patchesDir, file), "utf8"));
    assertPatchEntry(entry);
    pieces.push(entry);
  }
  const written: { file: string; contents: string }[] = [];
  for (const [target, group] of groupByTarget(pieces)) {
    const composed = composePatchTarget({ target, pieces: group, settings });
    if (composed !== null) {
      const dest = join(outRoot, target);
      // An injected writeTextFile (e.g. writeFileCanonical) may assume the dir exists; a composed target like scripts/entrypoint.sh can be the first thing under its dir, so ensure the parent before writing.
      await mkdir(dirname(dest), { recursive: true });
      await writeTextFile(dest, composed);
      // Composed shell entrypoints must stay executable; the piece can't carry a mode, so it's re-derived from the extension (mirrors EmitPlan's content-write chmod).
      if (target.endsWith(".sh")) await chmod(dest, 0o755);
      written.push({ file: target, contents: composed });
    }
  }
  return written;
}
