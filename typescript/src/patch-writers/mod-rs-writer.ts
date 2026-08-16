interface Piece {
  content: string;
  section?: string;
}

// Concatenate distinct declaration blocks, dropping the trailing blank so re-joins stay tidy.
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

/** Compose a `mod.rs` from the `pub mod`/`pub use` pieces each rust step contributed for the files it emitted into that directory: dedupe identical decls (sibling files re-declaring the same subdir) and concatenate in emit order. No skeleton — a `mod.rs` is nothing but declarations. Rust ignores declaration order, so no sort. Null when there are no pieces. */
export function modRsWriter(pieces: Piece[]): string | null {
  const blocks = unionBlocks(pieces.map((p) => p.content));
  return blocks.length > 0 ? `${blocks.join("\n")}\n` : null;
}
