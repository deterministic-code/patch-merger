# @deterministic-code/patch-merger

A standalone patch-merge engine for code generators. Emitters hand it **dumb, self-identifying patch entries** — `{ target, content, section? }` — and a single **filename-keyed patch writer** per target composes the final file. No key the writer dispatches on: the filename picks the writer, and the writer owns every "how".

## Why

A codegen run has many emitters contributing to the same shared files — `package.json` (deps + scripts from every step), `Cargo.toml`, `Dockerfile`, `.dockerignore`, `mod.rs`/`lib.rs`, and marked-block source files (`app.ts`, `entrypoint.sh`, `.csproj`). Rather than have each emitter read-modify-write those files (order-dependent, racy), every emitter emits **pieces**, and an end-of-run assemble pass composes each target from its pieces — order-independent, and no target is read off disk.

## Registered writers

Writers live in `patch-writers` and are keyed by filename (basename, or extension for project-specific names like `GeneratedApp.csproj`). Adding a target means registering a writer there; `PatchMerger` only groups pieces and writes files.

| Target | Writer | Merge strategy |
| --- | --- | --- |
| `.env` / `.gitignore` / `.dockerignore` / `docker-compose.yml` | `sharedAppendWriter` | section-keyed upsert-append |
| `package.json` | `packageJsonMergeWriter` | deep JSON merge |
| `Cargo.toml` | `cargoTomlWriter` | base + marked blocks |
| `Dockerfile` | `dockerfileWriter` | COPY insertion + marked blocks |
| `mod.rs` / `lib.rs` | `modRsWriter` / `libRsWriter` | union of module/use blocks |
| `app.ts` / `test-app.ts` / `entrypoint.sh` / `.csproj` | `markedBlockWriter` | fill named marker regions |

## Usage

```ts
import { PatchMerger, PatchEntry } from "@deterministic-code/patch-merger";

const merger = new PatchMerger();
merger.register(new PatchEntry({ target: "package.json", content: "{…}" }));
await merger.apply(rootDir);
```

`apply(rootDir)` composes each registered target and writes it under `rootDir` (creates parent directories; marks `.sh` files executable).

## Build

`vite build` → `typescript/dist` (ESM + CJS + bundled `.d.ts`).
