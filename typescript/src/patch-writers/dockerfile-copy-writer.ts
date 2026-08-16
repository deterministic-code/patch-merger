import { parseJson } from "../common/json.ts";
import { sectionMarkerLines } from "../common/marked-sections.ts";

interface DockerfileCopy {
  src: string;
  dest: string;
  workdirRelative?: boolean;
}

interface CopyPayload {
  anchorSection?: string;
  copies: DockerfileCopy[];
}

function dockerfileWorkdirPrefix(content: string): string {
  const workdir = content.match(/^WORKDIR\s+(\S+)\s*$/m)?.[1];
  if (!workdir) {
    throw new Error(
      "applyDockerfileCopies: Dockerfile is missing a `WORKDIR` line",
    );
  }
  return workdir === "/app" ? "" : `${workdir.slice("/app/".length)}/`;
}

function dockerfileCopyAnchor(content: string, anchorSection?: string): number {
  if (anchorSection) {
    const markers = sectionMarkerLines(content, anchorSection);
    if (markers) return content.indexOf(markers.start) + markers.start.length;
  }
  const copyLines = [...content.matchAll(/^COPY [^\n]*$/gm)];
  const last = copyLines[copyLines.length - 1];
  if (last?.index === undefined) {
    throw new Error(
      "insertDockerfileCopies: content has neither the anchor section's markers nor a COPY line to insert after",
    );
  }
  return last.index + last[0].length;
}

export function insertDockerfileCopies(
  content: string,
  copies: DockerfileCopy[],
  anchorSection?: string,
): string {
  if (copies.length === 0) return content;
  const additions = copies
    .map((c) => `COPY ${c.src} ${c.dest}`)
    .filter(
      (line) =>
        !new RegExp(
          `^${line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
          "m",
        ).test(content),
    );
  if (additions.length === 0) return content;
  const insertAt = dockerfileCopyAnchor(content, anchorSection);
  return `${content.slice(0, insertAt)}\n${additions.join("\n")}${content.slice(insertAt)}`;
}

export function applyDockerfileCopies(
  content: string,
  copyPieces: { content: string }[],
): string {
  const prefix = dockerfileWorkdirPrefix(content);
  let next = content;
  for (const patch of copyPieces) {
    const payload = parseJson<CopyPayload>(patch.content);
    const copies = payload.copies.map((c) =>
      c.workdirRelative ? { src: `${prefix}${c.src}`, dest: c.dest } : c,
    );
    next = insertDockerfileCopies(next, copies, payload.anchorSection);
  }
  return next;
}
