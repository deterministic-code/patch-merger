import {
  replaceMarkedBlockText,
  sectionMarkerLines,
} from "../marked-sections.ts";

interface SectionPiece {
  content: string;
  section: string;
}

interface Piece {
  content: string;
  section?: string;
}

export function isSectionPiece(piece: Piece): piece is SectionPiece {
  return piece.section !== undefined;
}

export function applyMarkedFills(
  content: string,
  sectionPieces: SectionPiece[],
): string {
  let next = content;
  for (const patch of sectionPieces) {
    const markers = sectionMarkerLines(next, patch.section);
    if (!markers) {
      throw new Error(
        `applyMarkedFills: skeleton has no marked region for section ${JSON.stringify(patch.section)}`,
      );
    }
    next = replaceMarkedBlockText({
      original: next,
      startMarker: markers.start,
      endMarker: markers.end,
      block: patch.content,
    });
  }
  return next;
}

export function markedBlockWriter(pieces: Piece[]): string | null {
  const skeleton = pieces.find((p) => !p.section);
  if (!skeleton) return null;
  return applyMarkedFills(skeleton.content, pieces.filter(isSectionPiece));
}
