import { applyMarkedFills, isSectionPiece } from "./marked-block-writer.ts";
import { firstSectionMarkerStart } from "../marked-sections.ts";

interface Piece {
  content: string;
  section?: string;
}

/** Cargo.toml is create-or-update, composed from its pieces. When a no-section body carries marked regions it is the skeleton the section pieces fill; a self-complete seed (a no-section body with no markers) is used as-is. The marker-bearing no-section piece wins when both are present. */
export function cargoTomlWriter(pieces: Piece[]): string | null {
  const noSection = pieces.filter((p) => !p.section);
  const skeleton = noSection.find(
    (p) => firstSectionMarkerStart(p.content) !== null,
  );
  if (skeleton) {
    return applyMarkedFills(
      skeleton.content,
      pieces.filter(isSectionPiece),
    );
  }
  const seed = noSection[0];
  return seed ? seed.content : null;
}
