/** JSON.parse is typed `any` in lib.es5; this wrapper forces callers to narrow. */
export function parseJson(text: string): unknown {
  return JSON.parse(text);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return isRecord(err) && typeof err.code === "string";
}
