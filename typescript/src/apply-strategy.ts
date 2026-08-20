import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type IPatchApplyStrategy = {
  apply(target: string, contents: string, rootDir: string): Promise<void>;
};

export class IPatchFileSystemApplyStrategy implements IPatchApplyStrategy {
  #dirs = new Map<string, Promise<void>>();

  #ensureDir(dir: string): Promise<void> {
    const pending = this.#dirs.get(dir);
    if (pending) return pending;
    const created = mkdir(dir, { recursive: true }).then(
      () => undefined,
      (error: unknown) => {
        this.#dirs.delete(dir);
        throw error;
      },
    );
    this.#dirs.set(dir, created);
    return created;
  }

  async apply(
    target: string,
    contents: string,
    rootDir: string,
  ): Promise<void> {
    const path = join(rootDir, target);
    await this.#ensureDir(dirname(path));
    await writeFile(path, contents, "utf8");
  }
}
