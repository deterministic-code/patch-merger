import { boolOption, stringOption } from "../options.ts";
import type { Writer } from "../writer.ts";

export type JsonObject = { [key: string]: Json };
export type Json = string | number | boolean | null | Json[] | JsonObject;

export const isObject = (value: Json | undefined): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isArray = (value: Json | undefined): value is Json[] =>
  Array.isArray(value);

const uniqueConcat = (current: Json[], incoming: Json[]): Json[] => {
  const seen = new Set(current.map((item) => JSON.stringify(item)));
  const merged = [...current];
  for (const item of incoming) {
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
};

export const parsePath = (jsonTarget: string) =>
  jsonTarget.split("/").filter((segment) => segment.length > 0);

const asObject = (
  value: Json,
  name: string,
  target: string,
  path: string[],
): JsonObject => {
  if (isObject(value)) return value;
  throw new Error(
    `${name}: path "/${path.join("/")}" in "${target}" is not an object`,
  );
};

const mergeValue = (
  current: Json | undefined,
  incoming: Json,
  name: string,
  target: string,
  path: string[],
  failIfExists: boolean,
  failOnCollision: boolean,
): Json => {
  if (current === undefined) return incoming;
  if (isObject(current) && isObject(incoming)) {
    for (const key of Object.keys(incoming)) {
      current[key] = mergeValue(
        current[key],
        incoming[key]!,
        name,
        target,
        [...path, key],
        failIfExists,
        failOnCollision,
      );
    }
    return current;
  }
  if (isArray(current) && isArray(incoming)) {
    return uniqueConcat(current, incoming);
  }
  if (failIfExists) {
    throw new Error(
      `${name}: value already exists at "/${path.join("/")}" in "${target}"`,
    );
  }
  if (failOnCollision && JSON.stringify(current) !== JSON.stringify(incoming)) {
    throw new Error(
      `${name}: collision at "/${path.join("/")}" in "${target}"`,
    );
  }
  return incoming;
};

export const assignAtPath = (
  root: JsonObject,
  segs: string[],
  incoming: Json,
  name: string,
  target: string,
  failIfExists: boolean,
  failOnCollision: boolean,
  prefix: string[] = [],
): JsonObject => {
  const [head, ...rest] = segs;
  if (head === undefined) {
    return asObject(
      mergeValue(
        root,
        incoming,
        name,
        target,
        prefix,
        failIfExists,
        failOnCollision,
      ),
      name,
      target,
      prefix,
    );
  }
  const path = [...prefix, head];
  if (rest.length === 0) {
    root[head] = mergeValue(
      root[head],
      incoming,
      name,
      target,
      path,
      failIfExists,
      failOnCollision,
    );
    return root;
  }
  const child =
    root[head] === undefined
      ? {}
      : asObject(root[head]!, name, target, path);
  root[head] = assignAtPath(
    child,
    rest,
    incoming,
    name,
    target,
    failIfExists,
    failOnCollision,
    path,
  );
  return root;
};

export const createDeepWriter = ({
  name,
  parse,
  stringify,
}: {
  name: string;
  parse: (content: string, target: string) => Json;
  stringify: (root: JsonObject) => string;
}): Writer => {
  const write: Writer = (patches, { failOnCollision }) => {
    const root = patches.reduce<JsonObject | undefined>((acc, patch) => {
      const failIfExists = boolOption(patch);
      return assignAtPath(
        acc ?? {},
        parsePath(stringOption(patch)),
        parse(patch.content, patch.target),
        name,
        patch.target,
        failIfExists,
        failOnCollision,
      );
    }, undefined);
    return stringify(root ?? {});
  };
  return write;
};
