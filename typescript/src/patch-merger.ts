import { Patch, type PatchOptions } from "./patch.ts";
import type { Writer } from "./writer.ts";
import {
  IPatchFileSystemApplyStrategy,
  type IPatchApplyStrategy,
} from "./apply-strategy.ts";
import { defaultWriters, type WriterBinding } from "./default-writers.ts";
import { compileGlob } from "./glob.ts";

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

const WRITE_CONCURRENCY = 32;

type CompiledBinding = { regexes: RegExp[]; writer: Writer };

type TargetGroup = { writer: Writer; patches: Patch[] };

const compileBindings = (
  writers: Iterable<WriterBinding>,
): CompiledBinding[] =>
  [...writers].map(([glob, writer]) => ({
    regexes: compileGlob(glob),
    writer,
  }));

const writerFor = (bindings: CompiledBinding[], target: string) => {
  const path = target.replaceAll("\\", "/");
  for (let i = bindings.length - 1; i >= 0; i--) {
    const binding = bindings[i]!;
    if (binding.regexes.some((regex) => regex.test(path))) return binding.writer;
  }
  return null;
};

const runPool = async (
  start: () => Promise<void>,
  inFlight: { count: number },
  waiters: Array<() => void>,
  limit: number,
): Promise<void> => {
  if (inFlight.count >= limit) {
    await new Promise<void>((resolve) => {
      waiters.push(resolve);
    });
  } else {
    inFlight.count += 1;
  }
  try {
    await start();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else inFlight.count -= 1;
  }
};

export class PatchMerger {
  #targets = new Map<string, TargetGroup>();
  #bindings: CompiledBinding[];
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
    this.#bindings = compileBindings(writers);
    this.#applyStrategy = applyStrategy;
  }

  registerWriter(glob: string, writer: Writer): void {
    this.#bindings.push({ regexes: compileGlob(glob), writer });
  }

  add(patch: Patch): void {
    const writer = writerFor(this.#bindings, patch.target);
    if (!writer) {
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${patch.target}'`,
      );
    }
    const group = this.#targets.get(patch.target);
    if (group) {
      group.writer = writer;
      group.patches.push(patch);
      return;
    }
    this.#targets.set(patch.target, { writer, patches: [patch] });
  }

  async apply(
    rootDir: string,
    strategy: IPatchApplyStrategy = this.#applyStrategy,
  ): Promise<string[]> {
    const ctx = { failOnCollision: this.#failOnCollision };
    const written: string[] = [];

    if (!this.#parallelWriteMode) {
      for (const [target, group] of this.#targets) {
        const contents = group.writer(group.patches, ctx);
        if (contents === null) continue;
        await strategy.apply(target, contents, rootDir);
        written.push(target);
      }
      return written;
    }

    const pending: Promise<void>[] = [];
    const inFlight = { count: 0 };
    const waiters: Array<() => void> = [];

    for (const [target, group] of this.#targets) {
      const contents = group.writer(group.patches, ctx);
      if (contents === null) continue;
      written.push(target);
      pending.push(
        runPool(
          () => strategy.apply(target, contents, rootDir),
          inFlight,
          waiters,
          WRITE_CONCURRENCY,
        ),
      );
    }
    await Promise.all(pending);
    return written;
  }
}
