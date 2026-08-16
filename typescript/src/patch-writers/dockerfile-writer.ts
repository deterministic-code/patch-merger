import { applyDockerfileCopies } from "./dockerfile-copy-writer.ts";
import { applyMarkedFills, isSectionPiece } from "./marked-block-writer.ts";

interface Piece {
  content: string;
  section?: string;
}

// Distinguish the skeleton piece (the Dockerfile body, carrying a `FROM` line) from a COPY-insertion piece (whose content is a JSON copies array). Both are section-less, so shape tells them apart.
function isDockerfileBody(content: string): boolean {
  return /^FROM\s/m.test(content);
}

/** Compose the Dockerfile from its pieces: the section-less body piece (contains `FROM`) is the skeleton, other section-less pieces are COPY-insertion arrays, and section pieces fill their marked blocks. COPY insertions run before marked replacements, matching emit order; the two never touch the same region. No skeleton → null. */
export function dockerfileWriter(pieces: Piece[]): string | null {
  const noSection = pieces.filter((p) => !p.section);
  const skeleton = noSection.find((p) => isDockerfileBody(p.content));
  if (!skeleton) return null;
  const copyPieces = noSection.filter((p) => p !== skeleton);
  const withCopies = applyDockerfileCopies(skeleton.content, copyPieces);
  return applyMarkedFills(withCopies, pieces.filter(isSectionPiece));
}
