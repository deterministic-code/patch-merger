import { applyDockerfileCopies } from "./dockerfile-copy-writer.ts";
import { applyMarkedFills, isSectionPiece } from "./marked-block-writer.ts";

interface Piece {
  content: string;
  section?: string;
}

function isDockerfileBody(content: string): boolean {
  return /^FROM\s/m.test(content);
}

export function dockerfileWriter(pieces: Piece[]): string | null {
  const noSection = pieces.filter((p) => !p.section);
  const skeleton = noSection.find((p) => isDockerfileBody(p.content));
  if (!skeleton) return null;
  const withCopies = applyDockerfileCopies(
    skeleton.content,
    noSection.filter((p) => p !== skeleton),
  );
  return applyMarkedFills(withCopies, pieces.filter(isSectionPiece));
}
