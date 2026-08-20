# @deterministic-code/patch-merger

A standalone patch-merge engine for code generators. Emitters hand it **dumb patches** — `{ target, content, options }` — and a **writer** registered for that filename composes the final file. The writer owns every "how"; `options` is a per-patch bag the writer interprets.

## Why

A codegen run has many emitters contributing to the same shared files — `package.json`, `.env`, `.dockerignore`, marked-block sources. Rather than have each emitter read-modify-write those files (order-dependent, racy), every emitter emits **patches**, and an end-of-run `apply` composes each target from its patches.

## Usage

```ts
import {
  PatchMerger,
  Patch,
  LineUpsertWriter,
  SectionWriter,
  DeepJsonWriter,
} from "@deterministic-code/patch-merger";

const merger = new PatchMerger({
  failOnCollision: false,
  parallelWriteMode: true,
});

merger.registerWriter(".env", LineUpsertWriter);
merger.registerWriter(".dockerignore", LineUpsertWriter);
merger.registerWriter("app.ts", SectionWriter);
merger.registerWriter("package.json", DeepJsonWriter);

merger.add(
  new Patch({
    target: ".env",
    content: "PORT=3000\n",
    options: { failIfExists: false },
  }),
);
merger.add(
  new Patch({
    target: "app.ts",
    content: "import { x } from './x';\n",
    options: {
      sections: ["Section1", "SubSection1"],
      appendIfNotExists: "End",
      failIfExists: false,
    },
  }),
);
merger.add(
  new Patch({
    target: "package.json",
    content: '{"express": "^4"}',
    options: {
      jsonTarget: "/dependencies",
      failIfExists: false,
    },
  }),
);

const written = await merger.apply(rootDir);
```

`registerWriter(key, writer)` binds a composer to a basename (`.env`, `package.json`) or extension (`.txt`, `.csproj`). `add` throws if `target` has no writer. `apply(rootDir)` composes each target and writes it under `rootDir` (creates parent directories). It returns the list of written paths. A target whose composer returns `null` is skipped.

### Constructor options

| Option | Default | Meaning |
| --- | --- | --- |
| `failOnCollision` | `false` | When `true`, two patches that write different values to the same line, section path, or JSON key throw. Identical values are allowed. When `false`, the later patch wins. |
| `parallelWriteMode` | `true` | Write composed files concurrently. Set `false` to write targets one at a time. |

## Patch format

```ts
new Patch({
  target,   // output path relative to apply(rootDir)
  content,  // non-empty string
  options,  // optional PatchOptions (failIfExists, jsonTarget, sections, appendIfNotExists)
});
```

## Writers

There are no built-in filename mappings. Register the writer that matches how the file should be composed.

### LineUpsertWriter

For line-oriented files such as `.env`, `.dockerignore`, and `.gitignore`. Each patch is split into non-blank lines. A `KEY=value` line upserts by `KEY`; any other line upserts by the full line.

| Option | Default | Meaning |
| --- | --- | --- |
| `failIfExists` | `false` | When `true`, throw if that key or line is already present. |

### SectionWriter

Fills `# — START Name` / `# — END Name` regions (`//` for `.ts`, `.js`, `.cs`, `.rs`). Nested paths walk from the outermost name inward. ASCII `-` markers are recognized when reading; new markers use an em dash.

| Option | Default | Meaning |
| --- | --- | --- |
| `sections` | *(required)* | Non-empty `["Section1", "SubSection1", …]`. Throws if missing or empty. |
| `appendIfNotExists` | `"End"` | `"None"` throws if the section is missing. `"End"` appends at the end of the parent (or file). `"Start"` inserts at the start of the parent (or file). |
| `failIfExists` | `false` | When `true`, throw if that section path already exists. |

### DeepJsonWriter

Deep-merges JSON objects. `jsonTarget` is a `/`-separated path into the document (`""` or omitted is the root). Example: `jsonTarget: "/dependencies"` merges the patch object into `dependencies`.

| Option | Default | Meaning |
| --- | --- | --- |
| `jsonTarget` | `""` | Path such as `/package/dependencies`. Empty means the root. |
| `failIfExists` | `false` | When `true`, throw if a leaf key already exists. New keys are still merged. |

Custom composers are `(patches, { failOnCollision }) => string | null`.

## Build

`npm run build` writes ESM, CJS, and `.d.ts` to `typescript/dist`. Package `exports` (`types`, `import`, `require`) all point at that folder. Regenerated dist belongs in the same commit as the source change.

`npm test` runs Vitest with coverage.
