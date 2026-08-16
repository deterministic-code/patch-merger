import { applyMarkedFills } from "./marked-block-writer.ts";
import { unionBlocks } from "./mod-rs-writer.ts";

interface Piece {
  content: string;
  section?: string;
}

/** Compose `lib.rs` from backend_app's no-section skeleton (the crate body carrying the empty MODULES / CUSTOM_SERVICES markers) plus the union of the section pieces every module step contributed — `pub mod <top>` into MODULES, `services.with(...)` into CUSTOM_SERVICES. Same skeleton+fill shape as markedBlockWriter, but each section is the dedupe-union of its pieces (many steps declare the same top module). Null when there is no skeleton. */
export function libRsWriter(pieces: Piece[]): string | null {
  const skeleton = pieces.find((p) => !p.section);
  if (!skeleton) return null;
  const bySection = new Map<string, string[]>();
  for (const p of pieces) {
    if (!p.section) continue;
    if (!bySection.has(p.section)) bySection.set(p.section, []);
    bySection.get(p.section)!.push(p.content);
  }
  const fills = [...bySection].map(([section, contents]) => ({
    section,
    content: unionBlocks(contents).join("\n"),
  }));
  return applyMarkedFills(skeleton.content, fills);
}
