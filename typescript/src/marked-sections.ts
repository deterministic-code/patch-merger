export class MarkedSectionMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkedSectionMissingError";
  }
}

function dedentBlock(block: string): string {
  if (block.length === 0) return block;
  const lines = block.split("\n");
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.length === 0) continue;
    const leading = line.match(/^[ \t]*/)![0].length;
    if (leading < line.length && leading < minIndent) minIndent = leading;
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) return block;
  return lines
    .map((line) => (line.length === 0 ? "" : line.slice(minIndent)))
    .join("\n");
}

/** Dedent a block to its common leading whitespace, then re-indent every non-empty line by `indent`. Trailing newline is dropped so callers control block separation. Shared by the marked-block replacer and the shared-append composer. */
export function indentBody(block: string, indent: string): string {
  const trimmedBlock = block.endsWith("\n") ? block.slice(0, -1) : block;
  const dedented = dedentBlock(trimmedBlock);
  if (dedented.length === 0) return "";
  return dedented
    .split("\n")
    .map((line) => (line.length === 0 ? "" : `${indent}${line}`))
    .join("\n");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The generic marked-block convention: a region for `section` is delimited by the line containing `=== BEGIN <section>` and the line containing `=== END <section>`, whatever the host language's comment syntax. Returns the full marker lines (the exact strings `replaceMarkedBlockText` needs), or null when the section is absent. The specific section vocabulary lives with the emitters that stamp the markers, not here. */
export function sectionMarkerLines(
  content: string,
  section: string,
): { start: string; end: string } | null {
  const begin = content.match(
    new RegExp(`^.*===\\s*BEGIN\\s+${escapeRegExp(section)}\\b.*$`, "m"),
  );
  const end = content.match(
    new RegExp(`^.*===\\s*END\\s+${escapeRegExp(section)}\\b.*$`, "m"),
  );
  return begin && end ? { start: begin[0], end: end[0] } : null;
}

/** The first `=== BEGIN <id>` marker line in `content`, or null when none — the generic anchor for insertion writers (the Dockerfile COPY inserter) that target the leading marked region. */
export function firstSectionMarkerStart(content: string): string | null {
  const m = content.match(/^.*===\s*BEGIN\s+\S+.*$/m);
  return m ? m[0] : null;
}

export interface ReplaceMarkedBlockArgs {
  original: string;
  startMarker: string;
  endMarker: string;
  block: string;
}

export function replaceMarkedBlockText({
  original,
  startMarker,
  endMarker,
  block,
}: ReplaceMarkedBlockArgs): string {
  const startIdx = original.indexOf(startMarker);
  const endIdx = original.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new MarkedSectionMissingError(
      `markers '${startMarker}' / '${endMarker}' absent or out of order`,
    );
  }
  const before = original.slice(0, startIdx + startMarker.length);
  const after = original.slice(endIdx);
  const lineStart = original.lastIndexOf("\n", startIdx) + 1;
  const indent = original.slice(lineStart, startIdx);
  const indentedBody = indentBody(block, indent);
  const middle =
    indentedBody.length === 0 ? `\n${indent}` : `\n${indentedBody}\n${indent}`;
  return `${before}${middle}${after}`;
}
