import { isRecord, parseJson } from "../json.ts";

interface Piece {
  content: string;
  section?: string;
}

const STRING_MAP_SECTIONS = [
  "scripts",
  "dependencies",
  "devDependencies",
  "config",
] as const;

// allowScripts is the approve-scripts opt-in map: package name → boolean, never a string map.
const BOOLEAN_MAP_SECTIONS = ["allowScripts"] as const;

const PACKAGE_JSON_MERGE_SECTIONS = [
  ...STRING_MAP_SECTIONS,
  ...BOOLEAN_MAP_SECTIONS,
] as const;

type StringMap = Record<string, string>;
type BooleanMap = Record<string, boolean>;

/** A parsed package.json — a JSON object whose string merge sections (scripts/dependencies/…) are string maps and whose allowScripts section is a boolean map. Extra keys (version, type, …) are preserved from the skeleton. */
export interface PackageJson {
  name?: string;
  scripts?: StringMap;
  dependencies?: StringMap;
  devDependencies?: StringMap;
  config?: StringMap;
  allowScripts?: BooleanMap;
}

function isMapOf(
  value: unknown,
  valueType: "string" | "boolean",
): value is Record<string, string | boolean> {
  if (!isRecord(value)) return false;
  for (const v of Object.values(value)) {
    if (typeof v !== valueType) return false;
  }
  return true;
}

function isPackageJson(value: unknown): value is PackageJson {
  if (!isRecord(value)) return false;
  if (value.name !== undefined && typeof value.name !== "string") return false;
  for (const section of STRING_MAP_SECTIONS) {
    const v = value[section];
    if (v !== undefined && !isMapOf(v, "string")) return false;
  }
  for (const section of BOOLEAN_MAP_SECTIONS) {
    const v = value[section];
    if (v !== undefined && !isMapOf(v, "boolean")) return false;
  }
  return true;
}

function parsePackageJson(text: string): PackageJson {
  const value = parseJson(text);
  if (!isPackageJson(value)) {
    throw new Error("package.json piece content must be a JSON object");
  }
  return value;
}

/** Compose package.json from its pieces: the skeleton piece (the only one carrying a `name`) is the base manifest, or an empty manifest when no skeleton is present, so a fragment-only patch (e.g. a lone `dependencies` piece declaring one package) still materializes a valid file. Every other piece contributes merge-section entries add-if-absent: a key already on the base keeps its value, so a fragment never clobbers a version or script the skeleton (or an earlier fragment) already set. */
export function packageJsonMergeWriter(pieces: Piece[]): string {
  const parsed = pieces.map((p) => ({
    piece: p,
    json: parsePackageJson(p.content),
  }));
  const skeleton = parsed.find((e) => e.json.name);
  const pkg: Record<string, unknown> = skeleton ? { ...skeleton.json } : {};
  for (const { piece, json } of parsed) {
    if (skeleton && piece === skeleton.piece) continue;
    for (const section of PACKAGE_JSON_MERGE_SECTIONS) {
      const incoming = json[section];
      if (!incoming) continue;
      const base = (pkg[section] as Record<string, string | boolean>) ?? {};
      pkg[section] = { ...incoming, ...base };
    }
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
}
