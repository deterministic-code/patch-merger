import type { Piece } from "./piece.ts";

export class MarkedSectionMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkedSectionMissingError";
  }
}

export const indentBody = (block: string, indent: string): string => {
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
};

export const sectionMarkerLines = (
  content: string,
  section: string,
): { start: string; end: string } | null => {
  const esc = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const line = (kind: string) =>
    content.match(new RegExp(`^.*===\\s*${kind}\\s+${esc}\\b.*$`, "m"))?.[0];
  const start = line("BEGIN");
  const end = line("END");
  return start && end ? { start, end } : null;
};

const splice = (
  content: string,
  from: number,
  to: number,
  insert: string,
): string => `${content.slice(0, from)}${insert}${content.slice(to)}`;

export const insertAfter = (
  content: string,
  needle: string,
  block: string,
): string => {
  const at = content.lastIndexOf(needle);
  if (at < 0) {
    throw new Error(`insertAfter: ${JSON.stringify(needle)} not found`);
  }
  const end = at + needle.length;
  return splice(content, end, end, `\n${block}`);
};

export const append = (content: string, block: string): string => {
  if (!block) return content;
  const head = content && !content.endsWith("\n") ? `${content}\n` : content;
  return `${head}${block.endsWith("\n") ? block : `${block}\n`}`;
};

export const hasBeginMarker = (content: string): boolean =>
  /^.*===\s*BEGIN\s+\S+.*$/m.test(content);

export const replaceMarkedBlockText = (
  original: string,
  startMarker: string,
  endMarker: string,
  block: string,
): string => {
  const start = original.indexOf(startMarker);
  const end = original.indexOf(endMarker);
  if (start === -1 || end < start) {
    throw new MarkedSectionMissingError(
      `markers '${startMarker}' / '${endMarker}' absent or out of order`,
    );
  }
  const indent = original.slice(original.lastIndexOf("\n", start) + 1, start);
  const body = indentBody(block, indent);
  return splice(
    original,
    start + startMarker.length,
    end,
    `\n${body ? `${body}\n` : ""}${indent}`,
  );
};

export const replaceMarkedSection = (
  content: string,
  section: string,
  block: string,
): string | null => {
  const markers = sectionMarkerLines(content, section);
  if (!markers) return null;
  return replaceMarkedBlockText(content, markers.start, markers.end, block);
};

export const applyMarkedFills = (content: string, pieces: Piece[]): string =>
  pieces.reduce((next, patch) => {
    if (!patch.section) return next;
    const filled = replaceMarkedSection(next, patch.section, patch.content);
    if (filled === null) {
      throw new Error(
        `applyMarkedFills: skeleton has no marked region for section ${JSON.stringify(patch.section)}`,
      );
    }
    return filled;
  }, content);
