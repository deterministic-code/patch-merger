import { applyMarkedFills, isSectionPiece } from "./marked-block-writer.ts";
import { firstSectionMarkerStart } from "../marked-sections.ts";

interface Piece {
  content: string;
  section?: string;
}

export function cargoTomlWriter(pieces: Piece[]): string | null {
  const noSection = pieces.filter((p) => !p.section);
  const skeleton = noSection.find(
    (p) => firstSectionMarkerStart(p.content) !== null,
  );
  if (skeleton) {
    return applyMarkedFills(skeleton.content, pieces.filter(isSectionPiece));
  }
  return noSection[0]?.content ?? null;
}
