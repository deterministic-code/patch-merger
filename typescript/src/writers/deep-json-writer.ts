import type { Patch } from "../patch.ts";
import { boolOption, stringOption } from "../options.ts";
import type { Writer } from "../writer.ts";

type JsonObject = { [key: string]: Json };
type Json = string | number | boolean | null | Json[] | JsonObject;

const isObject = (value: Json | undefined): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parsePath = (jsonTarget: string) =>
  jsonTarget.split("/").filter((segment) => segment.length > 0);

const parseContent = (patch: Patch): Json => {
  try {
    return JSON.parse(patch.content);
  } catch (error) {
    throw new Error(
      `DeepJsonWriter: invalid JSON for "${patch.target}": ${String(error)}`,
    );
  }
};

const asObject = (value: Json, target: string, path: string[]): JsonObject => {
  if (isObject(value)) return value;
  throw new Error(
    `DeepJsonWriter: path "/${path.join("/")}" in "${target}" is not an object`,
  );
};

const mergeValue = (
  current: Json | undefined,
  incoming: Json,
  target: string,
  path: string[],
  failIfExists: boolean,
  failOnCollision: boolean,
): Json => {
  if (current === undefined) return incoming;
  if (isObject(current) && isObject(incoming)) {
    return Object.keys(incoming).reduce<JsonObject>(
      (result, key) => ({
        ...result,
        [key]: mergeValue(
          current[key],
          incoming[key]!,
          target,
          [...path, key],
          failIfExists,
          failOnCollision,
        ),
      }),
      { ...current },
    );
  }
  if (failIfExists) {
    throw new Error(
      `DeepJsonWriter: value already exists at "/${path.join("/")}" in "${target}"`,
    );
  }
  if (failOnCollision && JSON.stringify(current) !== JSON.stringify(incoming)) {
    throw new Error(
      `DeepJsonWriter: collision at "/${path.join("/")}" in "${target}"`,
    );
  }
  return incoming;
};

const assignAtPath = (
  root: JsonObject,
  segs: string[],
  incoming: Json,
  target: string,
  failIfExists: boolean,
  failOnCollision: boolean,
  prefix: string[] = [],
): JsonObject => {
  const [head, ...rest] = segs;
  if (head === undefined) {
    return asObject(
      mergeValue(root, incoming, target, prefix, failIfExists, failOnCollision),
      target,
      prefix,
    );
  }
  const path = [...prefix, head];
  if (rest.length === 0) {
    return {
      ...root,
      [head]: mergeValue(
        root[head],
        incoming,
        target,
        path,
        failIfExists,
        failOnCollision,
      ),
    };
  }
  const child = root[head] === undefined ? {} : asObject(root[head]!, target, path);
  return {
    ...root,
    [head]: assignAtPath(
      child,
      rest,
      incoming,
      target,
      failIfExists,
      failOnCollision,
      path,
    ),
  };
};

export const deepJsonWriter: Writer = (patches, { failOnCollision }) => {
  const root = patches.reduce<JsonObject | undefined>((acc, patch) => {
    const failIfExists = boolOption(patch);
    return assignAtPath(
      acc ?? {},
      parsePath(stringOption(patch)),
      parseContent(patch),
      patch.target,
      failIfExists,
      failOnCollision,
    );
  }, undefined);
  return `${JSON.stringify(root ?? {}, null, 2)}\n`;
};

export { deepJsonWriter as DeepJsonWriter };
