export type Piece = { content: string; section?: string };

export const unsectioned = (pieces: Piece[]): Piece[] =>
  pieces.filter((p) => !p.section);

export const groupBySection = (pieces: Piece[]): Map<string, string[]> => {
  const bySection = new Map<string, string[]>();
  for (const p of pieces) {
    if (!p.section) continue;
    const existing = bySection.get(p.section);
    if (existing) existing.push(p.content);
    else bySection.set(p.section, [p.content]);
  }
  return bySection;
};

export const uniqueBlocks = (contents: string[]): string[] => {
  const seen = new Set<string>();
  const blocks: string[] = [];
  for (const c of contents) {
    const block = c.replace(/\n+$/, "");
    if (block.length === 0 || seen.has(block)) continue;
    seen.add(block);
    blocks.push(block);
  }
  return blocks;
};
