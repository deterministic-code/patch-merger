import { isRecord, parseJson } from "../json.ts";
import { sectionMarkerLines } from "../marked-sections.ts";

export interface DockerfileCopy {
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

function parseDockerfileCopy(value: unknown): DockerfileCopy {
  if (
    !isRecord(value) ||
    typeof value.src !== "string" ||
    typeof value.dest !== "string"
  ) {
    throw new Error("Dockerfile COPY entry must have string src and dest");
  }
  const copy: DockerfileCopy = { src: value.src, dest: value.dest };
  if (value.workdirRelative === true) copy.workdirRelative = true;
  return copy;
}

function parseCopyPayload(text: string): CopyPayload {
  const value = parseJson(text);
  if (!isRecord(value) || !Array.isArray(value.copies)) {
    throw new Error("Dockerfile COPY piece must be JSON { copies: [...] }");
  }
  const payload: CopyPayload = {
    copies: value.copies.map(parseDockerfileCopy),
  };
  if (typeof value.anchorSection === "string") {
    payload.anchorSection = value.anchorSection;
  }
  return payload;
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The WORKDIR path below /app (trailing slash), so a COPY source can be made relative to the build context. Throws on template drift (no WORKDIR line). */
function dockerfileWorkdirPrefix(content: string): string {
  const workdir = content.match(/^WORKDIR\s+(\S+)\s*$/m)?.[1];
  if (!workdir) {
    throw new Error(
      "applyDockerfileCopies: Dockerfile is missing the expected `WORKDIR` line — create-backend-app template drift; re-run create-backend-app first.",
    );
  }
  return workdir === "/app" ? "" : `${workdir.slice("/app/".length)}/`;
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
  const last = copyLines[copyLines.length - 1];
  if (last?.index === undefined) {
    throw new Error(
      "insertDockerfileCopies: content has neither the anchor section's markers nor a COPY line to anchor after — create-backend-app template drift; re-run create-backend-app first.",
    );
  }
  return last.index + last[0].length;
}

/** Insert `COPY <src> <dest>` lines idempotently at the anchor section's marked region (or after the last COPY line). Unchanged when every line is already present. */
export function insertDockerfileCopies(
  content: string,
  copies: DockerfileCopy[],
  anchorSection?: string,
): string {
  if (copies.length === 0) return content;
  const additions: string[] = [];
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
    const payload = parseCopyPayload(patch.content);
    const copies = payload.copies.map((c) =>
      c.workdirRelative ? { src: `${prefix}${c.src}`, dest: c.dest } : c,
    );
    next = insertDockerfileCopies(next, copies, payload.anchorSection);
  }
  return next;
}
