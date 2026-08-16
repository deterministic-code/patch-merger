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
    const leading = line.match(/^[ \t]*/)?.[0]?.length ?? 0;
    if (leading < line.length && leading < minIndent) minIndent = leading;
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) return block;
  return lines
    .map((line) => (line.length === 0 ? "" : line.slice(minIndent)))
    .join("\n");
}

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

export function sectionMarkerLines(
  content: string,
  section: string,
): { start: string; end: string } | null {
  const begin = content.match(
    new RegExp(`^.*===\\s*BEGIN\\s+${escapeRegExp(section)}\\b.*$`, "m"),
  )?.[0];
  const end = content.match(
    new RegExp(`^.*===\\s*END\\s+${escapeRegExp(section)}\\b.*$`, "m"),
  )?.[0];
  return begin && end ? { start: begin, end } : null;
}

export function firstSectionMarkerStart(content: string): string | null {
  return content.match(/^.*===\s*BEGIN\s+\S+.*$/m)?.[0] ?? null;
}

export function replaceMarkedBlockText({
  original,
  startMarker,
  endMarker,
  block,
}: {
  original: string;
  startMarker: string;
  endMarker: string;
  block: string;
}): string {
  const startIdx = original.indexOf(startMarker);
  const endIdx = original.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new MarkedSectionMissingError(
      `markers '${startMarker}' / '${endMarker}' absent or out of order`,
    );
  }
  const before = original.slice(0, startIdx + startMarker.length);
  const after = original.slice(endIdx);
  const indent = original.slice(original.lastIndexOf("\n", startIdx) + 1, startIdx);
  const body = indentBody(block, indent);
  const middle = body.length === 0 ? `\n${indent}` : `\n${body}\n${indent}`;
  return `${before}${middle}${after}`;
}
