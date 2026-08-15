import { replaceMarkedBlockText } from "../marked-sections.ts";
import { SECTION_MARKERS } from "../section-markers.ts";

interface SectionPiece {
  content: string;
  section?: string;
}

interface Piece {
  content: string;
  section?: string;
}

/** Replace each section piece's marked region in `content`, resolving `section` → the style-correct BEGIN/END markers so emitters never touch marker syntax. Shared by the Dockerfile and Cargo.toml composers. Throws if the skeleton lacks a section's markers — surfacing template drift or a missing skeleton piece. */
export function applyMarkedFills(
  content: string,
  sectionPieces: SectionPiece[],
): string {
  let next = content;
  for (const patch of sectionPieces) {
    const markers = (
      SECTION_MARKERS as Record<string, { start: string; end: string }>
    )[patch.section as string];
    if (!markers) {
      throw new Error(
        `applyMarkedFills: unknown section ${JSON.stringify(patch.section)}`,
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

/** Compose a marked-block file (app.ts / test-app.ts / entrypoint.sh / .csproj) from its pieces: the sole no-section piece is the skeleton (the whole body carrying the markers), and every section piece fills its named region. No skeleton piece → null (the file has no owner in this scaffold). */
export function markedBlockWriter(pieces: Piece[]): string | null {
  const skeleton = pieces.find((p) => !p.section);
  if (!skeleton) return null;
  return applyMarkedFills(
    skeleton.content,
    pieces.filter((p) => p.section),
  );
}
