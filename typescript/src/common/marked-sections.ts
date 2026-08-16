export class MarkedSectionMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkedSectionMissingError";
  }
}

export function indentBody(block: string, indent: string): string {
  const lines = (block.endsWith("\n") ? block.slice(0, -1) : block).split("\n");
  if (lines.length === 1 && lines[0] === "") return "";
  const cut = Math.min(
    ...lines.map((line) => {
      const n = /^[ \t]*/.exec(line)![0].length;
      return n < line.length ? n : Infinity;
    }),
  );
  const pad = Number.isFinite(cut) ? cut : 0;
  return lines
    .map((line) => {
      const sliced = line.slice(pad);
      return sliced ? `${indent}${sliced}` : "";
    })
    .join("\n");
}

export function sectionMarkerLines(
  content: string,
  section: string,
): { start: string; end: string } | null {
  const esc = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const line = (kind: string) =>
    content.match(new RegExp(`^.*===\\s*${kind}\\s+${esc}\\b.*$`, "m"))?.[0];
  const start = line("BEGIN");
  const end = line("END");
  return start && end ? { start, end } : null;
}

export function replaceMarkedBlockText(
  original: string,
  startMarker: string,
  endMarker: string,
  block: string,
): string {
  const start = original.indexOf(startMarker);
  const end = original.indexOf(endMarker);
  if (start === -1 || end < start) {
    throw new MarkedSectionMissingError(
      `markers '${startMarker}' / '${endMarker}' absent or out of order`,
    );
  }
  const indent = original.slice(original.lastIndexOf("\n", start) + 1, start);
  const body = indentBody(block, indent);
  return (
    original.slice(0, start + startMarker.length) +
    `\n${body ? `${body}\n` : ""}${indent}` +
    original.slice(end)
  );
}
