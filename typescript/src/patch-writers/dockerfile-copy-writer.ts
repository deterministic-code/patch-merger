import { parseJson } from "../common/json.ts";
import {
  insertAfter,
  sectionMarkerLines,
} from "../common/marked-sections.ts";
import type { Piece } from "../common/piece.ts";

interface Copy {
  src: string;
  dest: string;
  workdirRelative?: boolean;
}

export const insertDockerfileCopies = (
  content: string,
  copies: Copy[],
  section?: string,
): string => {
  const additions = copies
    .map((c) => `COPY ${c.src} ${c.dest}`)
    .filter((line) => !content.split("\n").some((l) => l.trim() === line));
  if (additions.length === 0) return content;
  const needle =
    (section && sectionMarkerLines(content, section)?.start) ||
    [...content.matchAll(/^COPY [^\n]*$/gm)].at(-1)?.[0];
  if (!needle) {
    throw new Error(
      "insertDockerfileCopies: content has neither the anchor section's markers nor a COPY line to insert after",
    );
  }
  return insertAfter(content, needle, additions.join("\n"));
};

export const applyDockerfileCopies = (
  content: string,
  copyPieces: Piece[],
): string => {
  const workdir = content.match(/^WORKDIR\s+(\S+)\s*$/m)?.[1];
  if (!workdir) {
    throw new Error(
      "applyDockerfileCopies: Dockerfile is missing a `WORKDIR` line",
    );
  }
  const prefix = workdir === "/app" ? "" : `${workdir.slice("/app/".length)}/`;
  return copyPieces.reduce((next, { content: json }) => {
    const { copies, anchorSection } = parseJson<{
      copies: Copy[];
      anchorSection?: string;
    }>(json);
    return insertDockerfileCopies(
      next,
      copies.map((c) =>
        c.workdirRelative ? { src: `${prefix}${c.src}`, dest: c.dest } : c,
      ),
      anchorSection,
    );
  }, content);
};

