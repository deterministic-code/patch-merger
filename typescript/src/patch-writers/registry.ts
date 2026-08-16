import {
  SHARED_FILE_CONVENTIONS,
  sharedAppendWriter,
} from "./shared-append-writer.ts";
import { packageJsonMergeWriter } from "./package-json-writer.ts";
import { markedBlockWriter } from "./marked-block-writer.ts";
import { cargoTomlWriter } from "./cargo-toml-writer.ts";
import { dockerfileWriter } from "./dockerfile-writer.ts";
import { modRsWriter } from "./mod-rs-writer.ts";
import { libRsWriter } from "./lib-rs-writer.ts";
import {
  dockerignoreWriter,
  type ComposeSettings,
} from "./dockerignore-writer.ts";

export type { ComposeSettings };

export type WriterPiece = {
  target: string;
  content: string;
  section?: string;
};

export type PatchWriter = (
  pieces: WriterPiece[],
  settings?: ComposeSettings,
) => string | null;

const WRITERS = new Map<string, PatchWriter>([
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

export function patchWriterFor(target: string): PatchWriter | null {
  const base = target.slice(target.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot) : "";
  return WRITERS.get(base) ?? WRITERS.get(ext) ?? null;
}

export function isPatchTarget(target: string): boolean {
  return patchWriterFor(target) !== null;
}

export function composePatchTarget({
  target,
  pieces,
  settings,
}: {
  target: string;
  pieces: WriterPiece[];
  settings?: ComposeSettings;
}): string | null {
  const writer = patchWriterFor(target);
  if (!writer) throw new Error(`composePatchTarget: no writer for '${target}'`);
  return writer(pieces, settings);
}
