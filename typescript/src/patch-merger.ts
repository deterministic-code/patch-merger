import { writeFile, mkdir, chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PatchEntry } from "./patch-entry.ts";
import {
  composePatchTarget,
  isPatchTarget,
  type ComposeSettings,
} from "./patch-writers/registry.ts";
import { outputTarget } from "./patch-writers/dockerignore-writer.ts";

export { composePatchTarget, isPatchTarget };
export {
  formatPatchEntryLine,
  makePatchEntry,
  parsePatchEntryLine,
  PATCH_ENTRY_LINE_PREFIX,
  PatchEntry,
} from "./patch-entry.ts";

type WriteTextFile = (path: string, content: string) => Promise<void>;

async function defaultWriteTextFile(
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  if (path.endsWith(".sh")) await chmod(path, 0o755);
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

  async apply(rootDir: string): Promise<string[]> {
    return (await writePatches(this, rootDir)).map((w) => w.file);
  }
}

async function writePatches(
  merger: PatchMerger,
  rootDir: string,
): Promise<{ file: string; contents: string }[]> {
  const byTarget = new Map<string, PatchEntry[]>();
  for (const entry of merger.entries) {
    const key = outputTarget(entry.target);
    const group = byTarget.get(key);
    if (group) group.push(entry);
    else byTarget.set(key, [entry]);
  }
  const written: { file: string; contents: string }[] = [];
  for (const [target, pieces] of byTarget) {
    const contents = composePatchTarget({
      target,
      pieces,
      settings: merger.settings,
    });
    if (contents === null) continue;
    await merger.writeTextFile(join(rootDir, target), contents);
    written.push({ file: target, contents });
  }
  return written;
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
  for (const entry of await PatchEntry.readDir(patchesDir)) {
    merger.register(entry);
  }
  return writePatches(merger, outRoot);
}
