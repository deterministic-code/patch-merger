import { parseJson } from "../common/json.ts";
import type { Piece } from "../common/piece.ts";

const MAP_SECTIONS = [
  "scripts",
  "dependencies",
  "devDependencies",
  "config",
  "allowScripts",
] as const;

type JsonMap = Record<string, string | boolean>;

interface PackageJson {
  name?: string;
  scripts?: JsonMap;
  dependencies?: JsonMap;
  devDependencies?: JsonMap;
  config?: JsonMap;
  allowScripts?: JsonMap;
}

export const packageJsonMergeWriter = (pieces: Piece[]): string => {
  const parsed = pieces.map((p) => parseJson<PackageJson>(p.content));
  const skeleton = parsed.find((json) => json.name);
  const pkg: PackageJson = { ...skeleton };
  for (const json of parsed) {
    if (json === skeleton) continue;
    for (const section of MAP_SECTIONS) {
      if (!json[section]) continue;
      pkg[section] = { ...json[section], ...pkg[section] };
    }
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
};
