import type { JsonValue } from "../json-value.ts";

interface Piece {
  content: string;
  section?: string;
}

/** A parsed package.json — a JSON object whose merge sections (scripts/dependencies/…) are string maps. */
type PackageJson = Record<string, JsonValue>;

const asObject = (v: JsonValue): Record<string, JsonValue> =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};

const PACKAGE_JSON_MERGE_SECTIONS = [
  "scripts",
  "dependencies",
  "devDependencies",
  "config",
  "allowScripts",
];

/** Compose package.json from its pieces: the skeleton piece (the only one carrying a `name`) is the base manifest, or an empty manifest when no skeleton is present, so a fragment-only patch (e.g. a lone `dependencies` piece declaring one package) still materializes a valid file. Every other piece contributes merge-section entries add-if-absent: a key already on the base keeps its value, so a fragment never clobbers a version or script the skeleton (or an earlier fragment) already set. */
export function packageJsonMergeWriter(pieces: Piece[]): string {
  const parsed = pieces.map((p) => ({
    piece: p,
    json: JSON.parse(p.content) as PackageJson,
  }));
  const skeleton = parsed.find((e) => e.json.name);
  const pkg: PackageJson = skeleton ? skeleton.json : {};
  for (const { piece, json } of parsed) {
    if (skeleton && piece === skeleton.piece) continue;
    for (const section of PACKAGE_JSON_MERGE_SECTIONS) {
      if (!json[section]) continue;
      pkg[section] = { ...asObject(json[section]), ...asObject(pkg[section]) };
    }
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
}
