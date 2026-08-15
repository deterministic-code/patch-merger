import { SECTION_MARKERS } from "../section-markers.ts";

interface DockerfileCopy {
  src: string;
  dest: string;
  workdirRelative?: boolean;
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

/** Where to insert migrate COPY lines: inside the MIGRATE_COPY marker when present, else after the last COPY line. Throws on template drift (neither present). */
function dockerfileCopyAnchor(content: string): number {
  const { start, end } = SECTION_MARKERS.MIGRATE_COPY;
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return startIdx + start.length;
  }
  const copyLines = [...content.matchAll(/^COPY [^\n]*$/gm)];
  if (copyLines.length === 0) {
    throw new Error(
      `insertDockerfileCopies: content has neither '${start}' markers nor a COPY line to anchor after — create-backend-app template drift; re-run create-backend-app first.`,
    );
  }
  const last = copyLines[copyLines.length - 1];
  return last.index! + last[0].length;
}

/** Insert `COPY <src> <dest>` lines idempotently at the MIGRATE_COPY anchor. Unchanged when every line is already present. */
export function insertDockerfileCopies(
  content: string,
  copies: DockerfileCopy[],
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
  const insertAt = dockerfileCopyAnchor(content);
  return `${content.slice(0, insertAt)}\n${additions.join("\n")}${content.slice(insertAt)}`;
}

// Apply Dockerfile COPY-insertion pieces onto the skeleton body: each piece's content is a JSON copies array; `workdirRelative` sources get the WORKDIR prefix. The composer supplies the skeleton, so there is no absent-file case here.
export function applyDockerfileCopies(
  content: string,
  copyPieces: CopyPiece[],
): string {
  const prefix = dockerfileWorkdirPrefix(content);
  let next = content;
  for (const patch of copyPieces) {
    const copies = JSON.parse(patch.content).map((c: DockerfileCopy) =>
      c.workdirRelative ? { src: `${prefix}${c.src}`, dest: c.dest } : c,
    );
    next = insertDockerfileCopies(next, copies);
  }
  return next;
}
