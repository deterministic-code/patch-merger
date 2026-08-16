interface Piece {
  target: string;
  content: string;
  section?: string;
}

const LANE_IGNORES = {
  typescript: ["node_modules", "dist", ".test"],
  rust: ["target"],
  csharp: ["bin", "obj", "out", "publish"],
};

type Lane = keyof typeof LANE_IGNORES;

const COMMON_IGNORES = [
  ".git",
  ".env.local",
  "*.log",
  "*.sqlite",
  "*.sqlite3",
  "*.db",
];
const DOCKERIGNORE_SECTION = /^DOCKERIGNORE_(.+)$/;

function isLane(value: string): value is Lane {
  return value in LANE_IGNORES;
}

function laneFromSection(section: string | undefined): Lane | undefined {
  const language = DOCKERIGNORE_SECTION.exec(section ?? "")?.[1]?.toLowerCase();
  return language && isLane(language) ? language : undefined;
}

export function dockerignoreWriter(pieces: Piece[]): string | null {
  if (pieces.length === 0) return null;
  const lines = new Set(COMMON_IGNORES);
  for (const piece of pieces) {
    const lane = laneFromSection(piece.section);
    if (!lane) continue;
    const slash = piece.target.lastIndexOf("/");
    const prefix = slash === -1 ? "" : piece.target.slice(0, slash + 1);
    for (const artifact of LANE_IGNORES[lane]) lines.add(`${prefix}${artifact}`);
  }
  return `${[...lines].sort().join("\n")}\n`;
}

export function outputTarget(target: string): string {
  const base = target.slice(target.lastIndexOf("/") + 1);
  return base === ".dockerignore" ? ".dockerignore" : target;
}
