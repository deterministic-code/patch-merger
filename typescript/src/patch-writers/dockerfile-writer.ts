import { applyDockerfileCopies } from "./dockerfile-copy-writer.ts";
import { applyMarkedFills } from "../common/marked-sections.ts";
import { type Piece, unsectioned } from "../common/piece.ts";

export const dockerfileWriter = (pieces: Piece[]): string | null => {
  const none = unsectioned(pieces);
  const skeleton = none.find((p) => /^FROM\s/m.test(p.content));
  if (!skeleton) return null;
  return applyMarkedFills(
    applyDockerfileCopies(
      skeleton.content,
      none.filter((p) => p !== skeleton),
    ),
    pieces,
  );
};
