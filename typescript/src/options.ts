import type { Patch } from "./patch.ts";

export const boolOption = (patch: Patch, fallback = false): boolean => {
  const value = patch.options?.failIfExists;
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") {
    throw new Error(
      `Patch.options.failIfExists for "${patch.target}" must be a boolean`,
    );
  }
  return value;
};

export const stringOption = (patch: Patch, fallback = ""): string => {
  const value = patch.options?.jsonTarget;
  if (value === undefined) return fallback;
  if (typeof value !== "string") {
    throw new Error(
      `Patch.options.jsonTarget for "${patch.target}" must be a string`,
    );
  }
  return value;
};
