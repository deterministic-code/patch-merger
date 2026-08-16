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
export {
  DOCKERIGNORE_TRIGGER,
  dockerignoreSection,
} from "./dockerignore-writer.ts";
export {
  conventionForTarget,
  isSharedPatchTarget,
} from "./shared-append-writer.ts";
export { insertDockerfileCopies } from "./dockerfile-copy-writer.ts";

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

function basename(target: string): string {
  return target.slice(target.lastIndexOf("/") + 1);
}

// "" for dotfiles so `.dockerignore` never matches as an extension.
function extname(target: string): string {
  const base = basename(target);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot) : "";
}

export function patchWriterFor(target: string): PatchWriter | null {
  return WRITERS.get(basename(target)) ?? WRITERS.get(extname(target)) ?? null;
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

// Nested `.dockerignore` pieces still compose into the root ignore file.
export function outputTarget(target: string): string {
  return basename(target) === ".dockerignore" ? ".dockerignore" : target;
}
