import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Patch, type PatchOptions } from "./patch.ts";
import type { Writer } from "./writer.ts";

export { Patch, type PatchOptions };
export type { Writer, ComposeContext } from "./writer.ts";

type FileWriter = (path: string, content: string) => Promise<void>;

export type PatchMergerOptions = {
  failOnCollision?: boolean;
  parallelWriteMode?: boolean;
  fileWriter?: FileWriter;
};

const defaultFileWriter: FileWriter = async (path, content) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
};

const writerFor = (writers: Map<string, Writer>, target: string) => {
  const base = target.slice(target.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return writers.get(base) ?? writers.get(dot > 0 ? base.slice(dot) : "") ?? null;
};

const groupByTarget = (patches: Patch[]) =>
  patches.reduce((byTarget, patch) => {
    byTarget.set(patch.target, [...(byTarget.get(patch.target) ?? []), patch]);
    return byTarget;
  }, new Map<string, Patch[]>());

const mapAsync = <T, U>(
  items: T[],
  fn: (item: T) => Promise<U>,
  parallel: boolean,
): Promise<U[]> =>
  parallel
    ? Promise.all(items.map(fn))
    : items.reduce(
        async (acc, item) => [...(await acc), await fn(item)],
        Promise.resolve([] as U[]),
      );

export class PatchMerger {
  #patches: Patch[] = [];
  #writers = new Map<string, Writer>();
  #failOnCollision: boolean;
  #parallelWriteMode: boolean;
  #fileWriter: FileWriter;

  constructor({
    failOnCollision = true,
    parallelWriteMode = true,
    fileWriter = defaultFileWriter,
  }: PatchMergerOptions = {}) {
    this.#failOnCollision = failOnCollision;
    this.#parallelWriteMode = parallelWriteMode;
    this.#fileWriter = fileWriter;
  }

  registerWriter(key: string, writer: Writer): void {
    this.#writers.set(key, writer);
  }

  add(patch: Patch): void {
    if (!writerFor(this.#writers, patch.target)) {
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${patch.target}'`,
      );
    }
    this.#patches.push(patch);
  }

  async apply(rootDir: string): Promise<string[]> {
    const ctx = { failOnCollision: this.#failOnCollision };
    const write = async ([target, pieces]: [string, Patch[]]) => {
      const contents = writerFor(this.#writers, target)!(pieces, ctx);
      if (contents === null) return null;
      await this.#fileWriter(join(rootDir, target), contents);
      return target;
    };
    const written = await mapAsync(
      [...groupByTarget(this.#patches)],
      write,
      this.#parallelWriteMode,
    );
    return written.filter((target): target is string => target !== null);
  }
}
