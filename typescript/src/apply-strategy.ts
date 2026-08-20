import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type IPatchApplyStrategy = {
  apply(target: string, contents: string, rootDir: string): Promise<void>;
};

export class IPatchFileSystemApplyStrategy implements IPatchApplyStrategy {
  async apply(
    target: string,
    contents: string,
    rootDir: string,
  ): Promise<void> {
    const path = join(rootDir, target);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, "utf8");
  }
}
