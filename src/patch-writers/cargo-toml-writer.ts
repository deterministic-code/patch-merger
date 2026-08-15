import { applyMarkedFills } from "./marked-block-writer.ts";
import { SECTION_MARKERS } from "../section-markers.ts";

interface Piece {
  content: string;
  section?: string;
}

/** Cargo.toml is create-or-update, composed from its pieces. A combined scaffold carries backend_app's skeleton piece (the no-section body with MIGRATE_BIN/MIGRATE_DEPS markers) which the section pieces fill; a standalone migrate scope has only its self-complete seed (a no-section body with no markers), used as-is. The marker-bearing no-section piece wins when both are present — mirroring the old "keep backend_app's Cargo.toml over the seed" contract. */
export function cargoTomlWriter(pieces: Piece[]): string | null {
  const noSection = pieces.filter((p) => !p.section);
  const skeleton = noSection.find((p) =>
    p.content.includes(SECTION_MARKERS.MIGRATE_BIN.start),
  );
  if (skeleton) {
    return applyMarkedFills(
      skeleton.content,
      pieces.filter((p) => p.section),
    );
  }
  return noSection.length > 0 ? noSection[0].content : null;
}
