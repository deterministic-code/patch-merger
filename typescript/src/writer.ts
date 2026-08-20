import type { Patch } from "./patch.ts";

export type ComposeContext = { failOnCollision: boolean };

export type Writer = (
  patches: Patch[],
  ctx: ComposeContext,
) => string | null;
