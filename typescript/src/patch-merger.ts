import { writeFile, mkdir, chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PatchEntry } from "./patch-entry.ts";
import {
  composePatchTarget,
  isPatchTarget,
} from "./patch-writers/registry.ts";
import { outputTarget } from "./patch-writers/dockerignore-writer.ts";

export { PatchEntry };

type IWriter = (path: string, content: string) => Promise<void>;

async function defaultWriter(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  if (path.endsWith(".sh")) await chmod(path, 0o755);
}

export class PatchMerger {
  #writer: IWriter;
  #entries: PatchEntry[] = [];

  constructor({ IWriter }: { IWriter?: IWriter } = {}) {
    this.#writer = IWriter ?? defaultWriter;
  }

  register(entry: PatchEntry): void {
    if (!isPatchTarget(entry.target)) {
      throw new Error(
        `PatchMerger.register: no PatchWriter for target '${entry.target}'`,
      );
    }
    this.#entries.push(entry);
  }

  async apply(rootDir: string): Promise<string[]> {
    const byTarget = new Map<string, PatchEntry[]>();
    for (const entry of this.#entries) {
      const key = outputTarget(entry.target);
      const group = byTarget.get(key);
      if (group) group.push(entry);
      else byTarget.set(key, [entry]);
    }
    const written: string[] = [];
    for (const [target, pieces] of byTarget) {
      const contents = composePatchTarget({ target, pieces });
      if (contents === null) continue;
      await this.#writer(join(rootDir, target), contents);
      written.push(target);
    }
    return written;
  }
}
