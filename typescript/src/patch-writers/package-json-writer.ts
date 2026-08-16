import { parseJson } from "../json.ts";

interface Piece {
  content: string;
}

const STRING_MAP_SECTIONS = [
  "scripts",
  "dependencies",
  "devDependencies",
  "config",
] as const;

const BOOLEAN_MAP_SECTIONS = ["allowScripts"] as const;

type StringMap = Record<string, string>;
type BooleanMap = Record<string, boolean>;

interface PackageJson {
  name?: string;
  scripts?: StringMap;
  dependencies?: StringMap;
  devDependencies?: StringMap;
  config?: StringMap;
  allowScripts?: BooleanMap;
}

export function packageJsonMergeWriter(pieces: Piece[]): string {
  const parsed = pieces.map((p) => ({
    piece: p,
    json: parseJson<PackageJson>(p.content),
  }));
  const skeleton = parsed.find((e) => e.json.name);
  const pkg: PackageJson = skeleton ? { ...skeleton.json } : {};
  for (const { piece, json } of parsed) {
    if (skeleton && piece === skeleton.piece) continue;
    for (const section of STRING_MAP_SECTIONS) {
      const incoming = json[section];
      if (!incoming) continue;
      pkg[section] = { ...incoming, ...(pkg[section] ?? {}) };
    }
    for (const section of BOOLEAN_MAP_SECTIONS) {
      const incoming = json[section];
      if (!incoming) continue;
      pkg[section] = { ...incoming, ...(pkg[section] ?? {}) };
    }
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
}
