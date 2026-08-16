import { applyMarkedFills, isSectionPiece } from "./marked-block-writer.ts";

interface Piece {
  content: string;
  section?: string;
}

export function cargoTomlWriter(pieces: Piece[]): string | null {
  const noSection = pieces.filter((p) => !p.section);
  const skeleton = noSection.find((p) =>
    /^.*===\s*BEGIN\s+\S+.*$/m.test(p.content),
  );
  if (skeleton) {
    return applyMarkedFills(skeleton.content, pieces.filter(isSectionPiece));
  }
  return noSection[0]?.content ?? null;
}
