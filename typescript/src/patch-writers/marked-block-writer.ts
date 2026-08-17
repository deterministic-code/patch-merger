import { applyMarkedFills } from "../common/marked-sections.ts";
import { type Piece, unsectioned } from "../common/piece.ts";

export { applyMarkedFills };

export const markedBlockWriter = (pieces: Piece[]): string | null => {
  const skeleton = unsectioned(pieces)[0];
  if (!skeleton) return null;
  return applyMarkedFills(skeleton.content, pieces);
};
