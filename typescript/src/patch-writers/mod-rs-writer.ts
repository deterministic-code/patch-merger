interface Piece {
  content: string;
  section?: string;
}

export function unionBlocks(contents: string[]): string[] {
  const seen = new Set<string>();
  const blocks = [];
  for (const c of contents) {
    const block = c.replace(/\n+$/, "");
    if (block.length === 0 || seen.has(block)) continue;
    seen.add(block);
    blocks.push(block);
  }
  return blocks;
}

export function modRsWriter(pieces: Piece[]): string | null {
  const blocks = unionBlocks(pieces.map((p) => p.content));
  return blocks.length > 0 ? `${blocks.join("\n")}\n` : null;
}
