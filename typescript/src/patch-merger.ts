import { writeFile, mkdir, chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Patch } from "./patch.ts";
import {
  SHARED_FILE_CONVENTIONS,
  sharedAppendWriter,
  outputTarget,
} from "./patch-writers/shared-append-writer.ts";
import { packageJsonMergeWriter } from "./patch-writers/package-json-writer.ts";
import { markedBlockWriter } from "./patch-writers/marked-block-writer.ts";
import { cargoTomlWriter } from "./patch-writers/cargo-toml-writer.ts";
import { dockerfileWriter } from "./patch-writers/dockerfile-writer.ts";
import { rsWriter } from "./patch-writers/rs-writer.ts";

export { Patch };

export type Writer = (patches: Patch[]) => string | null;
type IWriter = (path: string, content: string) => Promise<void>;

const WRITERS = new Map<string, Writer>([
  ...Object.entries(SHARED_FILE_CONVENTIONS).map(
    ([base, convention]): [string, Writer] => [
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
  ["mod.rs", rsWriter],
  ["lib.rs", rsWriter],
]);

const writerFor = (
  writers: Map<string, Writer>,
  target: string,
): Writer | null => {
  const base = target.slice(target.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot) : "";
  return writers.get(base) ?? writers.get(ext) ?? null;
};

const defaultWriter: IWriter = async (path, content) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  if (path.endsWith(".sh")) await chmod(path, 0o755);
};

export class PatchMerger {
  #patches: Patch[] = [];
  #writers = new Map(WRITERS);
  constructor(private writer: IWriter = defaultWriter) {}

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
    const byTarget = new Map<string, Patch[]>();
    for (const patch of this.#patches) {
      const key = outputTarget(patch.target);
      byTarget.set(key, [...(byTarget.get(key) ?? []), patch]);
    }
    const written: string[] = [];
    for (const [target, pieces] of byTarget) {
      const compose = writerFor(this.#writers, target);
      if (!compose) {
        throw new Error(`PatchMerger.apply: no PatchWriter for target '${target}'`);
      }
      const contents = compose(pieces);
      if (contents === null) continue;
      await this.writer(join(rootDir, target), contents);
      written.push(target);
    }
    return written;
  }
}
