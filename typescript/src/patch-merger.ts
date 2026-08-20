import { Patch, type PatchOptions } from "./patch.ts";
import type { Writer } from "./writer.ts";
import {
  IPatchFileSystemApplyStrategy,
  type IPatchApplyStrategy,
} from "./apply-strategy.ts";
import { defaultWriters, type WriterBinding } from "./default-writers.ts";
import { matchesGlob } from "./glob.ts";

export { Patch, type PatchOptions };
export type { Writer, ComposeContext } from "./writer.ts";
export {
  IPatchFileSystemApplyStrategy,
  type IPatchApplyStrategy,
} from "./apply-strategy.ts";
export { defaultWriters, type WriterBinding } from "./default-writers.ts";

export type PatchMergerOptions = {
  failOnCollision?: boolean;
  parallelWriteMode?: boolean;
  writers?: Iterable<WriterBinding>;
  applyStrategy?: IPatchApplyStrategy;
};

const writerFor = (writers: WriterBinding[], target: string) => {
  for (let i = writers.length - 1; i >= 0; i--) {
    const binding = writers[i]!;
    if (matchesGlob(target, binding[0])) return binding[1];
  }
  return null;
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
  #writers: WriterBinding[];
  #failOnCollision: boolean;
  #parallelWriteMode: boolean;
  #applyStrategy: IPatchApplyStrategy;

  constructor({
    failOnCollision = true,
    parallelWriteMode = true,
    writers = defaultWriters,
    applyStrategy = new IPatchFileSystemApplyStrategy(),
  }: PatchMergerOptions = {}) {
    this.#failOnCollision = failOnCollision;
    this.#parallelWriteMode = parallelWriteMode;
    this.#writers = [...writers];
    this.#applyStrategy = applyStrategy;
  }

  registerWriter(glob: string, writer: Writer): void {
    this.#writers.push([glob, writer]);
  }

  add(patch: Patch): void {
    if (!writerFor(this.#writers, patch.target)) {
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${patch.target}'`,
      );
    }
    this.#patches.push(patch);
  }

  async apply(
    rootDir: string,
    strategy: IPatchApplyStrategy = this.#applyStrategy,
  ): Promise<string[]> {
    const ctx = { failOnCollision: this.#failOnCollision };
    const write = async ([target, pieces]: [string, Patch[]]) => {
      const contents = writerFor(this.#writers, target)!(pieces, ctx);
      if (contents === null) return null;
      await strategy.apply(target, contents, rootDir);
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
