# @deterministic-code/patch-merger

A standalone patch-merge engine for code generators. Emitters hand it **dumb, self-identifying patches** — `{ target, content, section? }` — and a single **filename-keyed patch writer** per target composes the final file. The filename picks the writer; the writer owns every "how".

## Why

A codegen run has many emitters contributing to the same shared files — `package.json`, `Cargo.toml`, `Dockerfile`, `.dockerignore`, `mod.rs`/`lib.rs`, and marked-block sources (`app.ts`, `entrypoint.sh`, `.csproj`). Rather than have each emitter read-modify-write those files (order-dependent, racy), every emitter emits **patches**, and an end-of-run `apply` composes each target from its patches — order-independent, and no target is read off disk.

## Writers

Writers live in `patch-writers` and are keyed by filename (basename, or extension for project-specific names like `GeneratedApp.csproj`). Built-in keys are listed below. Use `registerWriter` to add (or replace) a key on a `PatchMerger` instance.

`PatchMerger.add` groups patches by target and writes the composed files.

| Target | Writer | Merge strategy |
| --- | --- | --- |
| `.env` / `.env.example` / `.gitignore` / `.dockerignore` / `docker-compose.yml` | `sharedAppendWriter` | section-keyed upsert-append |
| `package.json` | `packageJsonMergeWriter` | deep JSON merge |
| `Cargo.toml` | `cargoTomlWriter` | base + marked blocks |
| `Dockerfile` | `dockerfileWriter` | COPY insertion + marked blocks |
| `mod.rs` / `lib.rs` | `rsWriter` | union of module/use blocks; fills a skeleton when present |
| `app.ts` / `test-app.ts` / `entrypoint.sh` / `.csproj` | `markedBlockWriter` | fill named marker regions |

Nested `.dockerignore` patches (e.g. `backend/typescript/.dockerignore`) compose into the root `.dockerignore`.

## Usage

```ts
import { PatchMerger, Patch } from "@deterministic-code/patch-merger";

const merger = new PatchMerger();
merger.add(new Patch({ target: "package.json", content: "{…}" }));
merger.add(
  new Patch({
    target: ".env",
    content: "PORT=3000\n",
    section: "ENV_TYPESCRIPT",
  }),
);
const written = await merger.apply(rootDir);
```

Register a composer for a basename or an extension that the built-in map does not cover:

```ts
const merger = new PatchMerger();
merger.registerWriter("Makefile", (patches) =>
  patches.map((p) => p.content).join(""),
);
merger.registerWriter(".txt", (patches) =>
  patches.map((p) => p.content).join(""),
);
merger.add(new Patch({ target: "Makefile", content: "all:\n" }));
merger.add(new Patch({ target: "src/notes.txt", content: "hello\n" }));
await merger.apply(rootDir);
```

`registerWriter(key, writer)` binds a composer to a basename (`Makefile`) or extension (`.txt`). `add` throws if `target` has no writer. `apply(rootDir)` composes each target and writes it under `rootDir` (creates parent directories; marks `.sh` files executable). It returns the list of written paths. A target whose pieces do not materialize (writer returns `null`) is skipped.

## Build

`npm run build` writes ESM and CJS to `typescript/dist`. TypeScript resolves types from `typescript/src`, so git and `file:` installs typecheck without a built `dist` (npm may block `prepare` scripts). Regenerated dist belongs in the same commit as the source change when you need a runnable JS entry.
