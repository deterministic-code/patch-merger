interface Piece {
  content: string;
  section?: string;
  path?: string;
}

// Host build artifacts each language lane produces on disk; the Dockerfile `RUN npm install` / cargo build / dotnet publish rebuilds them inside the image, so the host copies must never ride in via `COPY <lane>/. ./` (a macOS/arm64 better-sqlite3 .node in the Linux image is an "Exec format error"). Prefixed with the lane's dir so the pattern matches the nested `backend/typescript/node_modules`, not just a root `node_modules`.
const LANE_IGNORES: Record<string, string[]> = {
  typescript: ["node_modules", "dist", ".test"],
  rust: ["target"],
  csharp: ["bin", "obj", "out", "publish"],
};

// The frontend lane (present only in the full-stack/combined layout) always lands under `frontend/` and its Dockerfile copies the whole tree, so its host node_modules/dist leak the same way.
const FRONTEND_IGNORES = ["node_modules", "dist"];

// Root-level ignores that don't belong to any one lane; anchored at the build-context root like the pre-lane template.
const COMMON_IGNORES = [
  ".git",
  ".env.local",
  "*.log",
  "*.sqlite",
  "*.sqlite3",
  "*.db",
];

const DOCKERIGNORE_SECTION = /^DOCKERIGNORE_(.+)$/;

// Each participating lane emits one of these trigger pieces so the target composes; the writer ignores the content and synthesizes the whole file from the layout. The section names the lane so a settings-less assemble can still place a flat single-language ignore.
export const DOCKERIGNORE_TRIGGER =
  "# the root .dockerignore is composed from settings by the dockerignore writer";

export function dockerignoreSection(language: string): string {
  return `DOCKERIGNORE_${language.toUpperCase()}`;
}

export type ComposeSettings =
  | { backend?: { languages?: string[] }; applicationTier?: string }
  | null
  | undefined;

function laneLanguage(section: string | undefined): string | null {
  const match = DOCKERIGNORE_SECTION.exec(section ?? "");
  return match ? match[1].toLowerCase() : null;
}

/** Compose the single root `.dockerignore` from the participating lanes' trigger pieces. Every backend Dockerfile builds with `context: .` at the project root, so one root ignore-file serves every lane; each lane's patterns are prefixed with the lane's output dir carried on the piece's `path` (stamped by the producing emitter, which owns the layout) — so a nested `backend/typescript/node_modules` is excluded, not just a root one. The frontend lane (present only in the full-stack tier) is added from `settings`. Output is sorted for a deterministic, testable result. */
export function dockerignoreWriter(
  pieces: Piece[],
  settings?: ComposeSettings,
): string | null {
  if (!pieces || pieces.length === 0) return null;
  const lines = new Set(COMMON_IGNORES);
  for (const piece of pieces) {
    const language = laneLanguage(piece.section);
    if (!language) continue;
    const artifacts = LANE_IGNORES[language];
    if (!artifacts) continue;
    const prefix = piece.path ?? "";
    for (const artifact of artifacts) lines.add(`${prefix}${artifact}`);
  }
  if (settings?.applicationTier === "full-stack") {
    for (const artifact of FRONTEND_IGNORES) lines.add(`frontend/${artifact}`);
  }
  return `${[...lines].sort().join("\n")}\n`;
}
