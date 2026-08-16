interface Piece {
  target: string;
  content: string;
  section?: string;
}

const LANE_IGNORES: Record<string, string[]> = {
  typescript: ["node_modules", "dist", ".test"],
  rust: ["target"],
  csharp: ["bin", "obj", "out", "publish"],
};
const FRONTEND_IGNORES = ["node_modules", "dist"];
const COMMON_IGNORES = [
  ".git",
  ".env.local",
  "*.log",
  "*.sqlite",
  "*.sqlite3",
  "*.db",
];
const DOCKERIGNORE_SECTION = /^DOCKERIGNORE_(.+)$/;

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
  const language = DOCKERIGNORE_SECTION.exec(section ?? "")?.[1];
  return language ? language.toLowerCase() : null;
}

function dirPrefix(target: string): string {
  const slash = target.lastIndexOf("/");
  return slash === -1 ? "" : target.slice(0, slash + 1);
}

export function dockerignoreWriter(
  pieces: Piece[],
  settings?: ComposeSettings,
): string | null {
  if (pieces.length === 0) return null;
  const lines = new Set(COMMON_IGNORES);
  for (const piece of pieces) {
    const language = laneLanguage(piece.section);
    const artifacts = language ? LANE_IGNORES[language] : undefined;
    if (!artifacts) continue;
    const prefix = dirPrefix(piece.target);
    for (const artifact of artifacts) lines.add(`${prefix}${artifact}`);
  }
  if (settings?.applicationTier === "full-stack") {
    for (const artifact of FRONTEND_IGNORES) lines.add(`frontend/${artifact}`);
  }
  return `${[...lines].sort().join("\n")}\n`;
}
