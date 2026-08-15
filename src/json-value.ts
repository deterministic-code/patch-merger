/** A parsed YAML/JSON value — the precise recursive type for arbitrary settings documents the patch writers and entry validators operate on. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | { [key: string]: JsonValue };
