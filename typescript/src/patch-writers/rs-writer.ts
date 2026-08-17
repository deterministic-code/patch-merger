import { append, applyMarkedFills } from "../common/marked-sections.ts";
import { type Piece, groupBySection, uniqueBlocks, unsectioned } from "../common/piece.ts";

export const rsWriter = (pieces: Piece[]): string | null => {
  const skeleton = unsectioned(pieces)[0];
  const bySection = groupBySection(pieces);
  if (skeleton && bySection.size > 0) {
    const fills = [...bySection].map(([section, contents]) => ({
      section,
      content: uniqueBlocks(contents).join("\n"),
    }));
    return applyMarkedFills(skeleton.content, fills);
  }
  const blocks = uniqueBlocks(pieces.map((p) => p.content));
  return blocks.length > 0 ? append("", blocks.join("\n")) : null;
};
