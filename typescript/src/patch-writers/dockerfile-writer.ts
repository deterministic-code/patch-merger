import { applyDockerfileCopies } from "./dockerfile-copy-writer.ts";
import { applyMarkedFills, isSectionPiece } from "./marked-block-writer.ts";

interface Piece {
  content: string;
  section?: string;
}

export function dockerfileWriter(pieces: Piece[]): string | null {
  const noSection = pieces.filter((p) => !p.section);
  const skeleton = noSection.find((p) => /^FROM\s/m.test(p.content));
  if (!skeleton) return null;
  const withCopies = applyDockerfileCopies(
    skeleton.content,
    noSection.filter((p) => p !== skeleton),
  );
  return applyMarkedFills(withCopies, pieces.filter(isSectionPiece));
}
