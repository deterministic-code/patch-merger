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

const BOOLEAN_MAP_SECTIONS = ["allowScripts"] as const;

const PACKAGE_JSON_MERGE_SECTIONS = [
  ...STRING_MAP_SECTIONS,
  ...BOOLEAN_MAP_SECTIONS,
] as const;

type StringMap = Record<string, string>;
type BooleanMap = Record<string, boolean>;

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
