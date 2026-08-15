import { sectionMarkerLines } from "../marked-sections.ts";

interface DockerfileCopy {
  src: string;
  dest: string;
  workdirRelative?: boolean;
}

interface CopyPayload {
  anchorSection?: string;
  copies: DockerfileCopy[];
}

interface CopyPiece {
  content: string;
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The WORKDIR path below /app (trailing slash), so a COPY source can be made relative to the build context. Throws on template drift (no WORKDIR line). */
function dockerfileWorkdirPrefix(content: string): string {
  const m = content.match(/^WORKDIR\s+(\S+)\s*$/m);
  if (!m) {
    throw new Error(
      "applyDockerfileCopies: Dockerfile is missing the expected `WORKDIR` line — create-backend-app template drift; re-run create-backend-app first.",
    );
  }
  return m[1] === "/app" ? "" : `${m[1].slice("/app/".length)}/`;
}

/** Where to insert COPY lines: just inside the named anchor section's marked region when present, else after the last COPY line. Throws on template drift (neither present). */
function dockerfileCopyAnchor(content: string, anchorSection?: string): number {
  if (anchorSection) {
    const markers = sectionMarkerLines(content, anchorSection);
    if (markers) {
      return content.indexOf(markers.start) + markers.start.length;
    }
  }
  const copyLines = [...content.matchAll(/^COPY [^\n]*$/gm)];
  if (copyLines.length === 0) {
    throw new Error(
      "insertDockerfileCopies: content has neither the anchor section's markers nor a COPY line to anchor after — create-backend-app template drift; re-run create-backend-app first.",
    );
  }
  const last = copyLines[copyLines.length - 1];
  return last.index! + last[0].length;
}

/** Insert `COPY <src> <dest>` lines idempotently at the anchor section's marked region (or after the last COPY line). Unchanged when every line is already present. */
export function insertDockerfileCopies(
  content: string,
  copies: DockerfileCopy[],
  anchorSection?: string,
): string {
  if (!Array.isArray(copies) || copies.length === 0) return content;
  const additions = [];
  for (const c of copies) {
    const line = `COPY ${c.src} ${c.dest}`;
    if (!new RegExp(`^${escapeForRegex(line)}\\s*$`, "m").test(content)) {
      additions.push(line);
    }
  }
  if (additions.length === 0) return content;
  const insertAt = dockerfileCopyAnchor(content, anchorSection);
  return `${content.slice(0, insertAt)}\n${additions.join("\n")}${content.slice(insertAt)}`;
}

// Apply Dockerfile COPY-insertion pieces onto the skeleton body: each piece's content is a JSON `{ anchorSection?, copies }` payload; `workdirRelative` sources get the WORKDIR prefix. The composer supplies the skeleton, so there is no absent-file case here.
export function applyDockerfileCopies(
  content: string,
  copyPieces: CopyPiece[],
): string {
  const prefix = dockerfileWorkdirPrefix(content);
  let next = content;
  for (const patch of copyPieces) {
    const payload = JSON.parse(patch.content) as CopyPayload;
    const copies = payload.copies.map((c: DockerfileCopy) =>
      c.workdirRelative ? { src: `${prefix}${c.src}`, dest: c.dest } : c,
    );
    next = insertDockerfileCopies(next, copies, payload.anchorSection);
  }
  return next;
}
