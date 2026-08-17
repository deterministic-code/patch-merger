import { applyMarkedFills, hasBeginMarker } from "../common/marked-sections.ts";
import { type Piece, unsectioned } from "../common/piece.ts";

export const cargoTomlWriter = (pieces: Piece[]): string | null => {
  const none = unsectioned(pieces);
  const skeleton = none.find((p) => hasBeginMarker(p.content));
  if (skeleton) return applyMarkedFills(skeleton.content, pieces);
  return none[0]?.content ?? null;
};
