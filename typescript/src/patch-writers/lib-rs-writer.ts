import { applyMarkedFills } from "./marked-block-writer.ts";
import { unionBlocks } from "./mod-rs-writer.ts";

interface Piece {
  content: string;
  section?: string;
}

export function libRsWriter(pieces: Piece[]): string | null {
  const skeleton = pieces.find((p) => !p.section);
  if (!skeleton) return null;
  const bySection = new Map<string, string[]>();
  for (const p of pieces) {
    if (!p.section) continue;
    const existing = bySection.get(p.section);
    if (existing) existing.push(p.content);
    else bySection.set(p.section, [p.content]);
  }
  const fills = [...bySection].map(([section, contents]) => ({
    section,
    content: unionBlocks(contents).join("\n"),
  }));
  return applyMarkedFills(skeleton.content, fills);
}
