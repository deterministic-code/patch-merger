# @deterministic-code/patch-merger

A standalone patch-merge engine for code generators. Emitters hand it **dumb patches** — `{ target, content, options }` — and a **writer** matched by glob composes the final file. `apply` sends that file through an **apply strategy** (filesystem by default; you can plug in a database or anything else).

## Why

A codegen run has many emitters contributing to the same shared files. Rather than have each emitter read-modify-write those files, every emitter emits **patches**, and an end-of-run `apply` composes each target.

## Usage

```ts
import {
  PatchMerger,
  Patch,
  LineUpsertWriter,
  defaultWriters,
} from "@deterministic-code/patch-merger";

const merger = new PatchMerger();

merger.add(
  new Patch({
    target: ".env",
    content: "PORT=3000\n",
  }),
);
merger.add(
  new Patch({
    target: "app.ts",
    content: "import { x } from './x';\n",
    options: {
      sections: ["Section1", "SubSection1"],
      appendIfNotExists: "End",
    },
  }),
);
merger.add(
  new Patch({
    target: "package.json",
    content: '{"express": "^4"}',
    options: { jsonTarget: "/dependencies" },
  }),
);

const written = await merger.apply(rootDir);
```

`registerWriter(glob, writer)` binds a composer to a glob (`**/.env`, `**/*.csproj`). Later bindings win when more than one glob matches. `add` throws if `target` matches no writer. `apply(rootDir, strategy?)` composes each target and hands it to the strategy. It returns the written target paths. A composer that returns `null` is skipped.

Override or extend the default glob table in the constructor:

```ts
new PatchMerger({
  writers: [...defaultWriters, ["**/*.txt", LineUpsertWriter]],
});
```

Pass a custom `IPatchApplyStrategy` to write somewhere other than disk (`apply(rootDir, strategy)` or `applyStrategy` in the constructor). The default is `IPatchFileSystemApplyStrategy` (mkdir + writeFile).

### Constructor options

| Option | Default | Meaning |
| --- | --- | --- |
| `failOnCollision` | `true` | Two patches that write different values to the same line, section path, or document key throw. Identical values are allowed. Set `false` so the later patch wins. |
| `parallelWriteMode` | `true` | Write composed files concurrently. Set `false` to write targets one at a time. |
| `writers` | `defaultWriters` | Glob → writer table. Replaces the defaults; spread `defaultWriters` to extend. |
| `applyStrategy` | `IPatchFileSystemApplyStrategy` | Where composed files go. |

## Patch format

```ts
new Patch({
  target,   // path relative to apply(rootDir)
  content,  // non-empty string
  options,  // optional PatchOptions
});
```

## Default globs

Last matching glob wins, so the ignore/env patterns at the bottom beat `**/*.json` for names like `.env.json`.

### LineUpsertWriter

Line-oriented files. `KEY=value` upserts by key; any other line upserts by the full line.

| Glob | Typical files |
| --- | --- |
| `**/.env` | `.env` |
| `**/.env.*` | `.env.example`, `.env.local`, `.env.production` |
| `**/.gitignore` | `.gitignore` |
| `**/.dockerignore` | `.dockerignore` |
| `**/.containerignore` | `.containerignore` |
| `**/.ignore` | `.ignore` |
| `**/.npmignore` | `.npmignore` |
| `**/.eslintignore` | `.eslintignore` |
| `**/.prettierignore` | `.prettierignore` |
| `**/.stylelintignore` | `.stylelintignore` |
| `**/.markdownlintignore` | `.markdownlintignore` |
| `**/.helmignore` | `.helmignore` |
| `**/.gcloudignore` | `.gcloudignore` |
| `**/.fdignore` | `.fdignore` |
| `**/.rgignore` | `.rgignore` |
| `**/.cursorignore` | `.cursorignore` |
| `**/.claudeignore` | `.claudeignore` |
| `**/.slugignore` | `.slugignore` |
| `**/.tfignore` | `.tfignore` |
| `**/.cvsignore` | `.cvsignore` |
| `**/.bzrignore` | `.bzrignore` |
| `**/.hgignore` | `.hgignore` |

| Option | Default | Meaning |
| --- | --- | --- |
| `failIfExists` | `false` | When `true`, throw if that key or line is already present. |

### DeepJsonWriter / DeepYamlWriter / DeepXmlWriter

Deep-merges document objects. `jsonTarget` is a `/`-separated path (`""` or omitted is the root). Objects merge recursively; primitives and arrays replace. XML attributes are keys prefixed with `@_`.

| Glob | Writer | Typical files |
| --- | --- | --- |
| `**/*.json` | DeepJsonWriter | `package.json`, `tsconfig.json`, `appsettings.json` |
| `**/*.jsonc` | DeepJsonWriter | `tsconfig.jsonc`, VS Code config |
| `**/*.json5` | DeepJsonWriter | `package.json5` |
| `**/*.yml` | DeepYamlWriter | `docker-compose.yml`, `.github/workflows/ci.yml` |
| `**/*.yaml` | DeepYamlWriter | `openapi.yaml` |
| `**/*.xml` | DeepXmlWriter | `app.config.xml`, `pom.xml` |

| Option | Default | Meaning |
| --- | --- | --- |
| `jsonTarget` | `""` | Path such as `/dependencies` or `/root/item`. Empty means the document root. |
| `failIfExists` | `false` | When `true`, throw if a leaf key already exists. New keys are still merged. |

### SectionWriter

Fills marked regions. Nested paths walk from the outermost name inward. ASCII `-` and `=== BEGIN` / `=== END` markers are recognized when reading; new markers use an em dash (`# — START Name`). Comment syntax follows the target: `//`, `#`, `<!-- … -->`, or `/* … */`.

A patch with **no** `sections` is the seed document for that target (the backend-app scaffold). Later patches fill named holes inside it.

| Glob | Typical files |
| --- | --- |
| `**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}` | `app.ts`, `index.js` |
| `**/*.{cs,csx,fs,fsx,vb}` | `Program.cs`, `Lib.fs` |
| `**/*.rs` | `main.rs`, `lib.rs` |
| `**/*.{go,java,kt,kts,scala,groovy,gradle}` | `main.go`, `App.java` |
| `**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx,m,mm}` | `main.c`, `app.cpp` |
| `**/*.{swift,php}` | `App.swift`, `index.php` |
| `**/*.{py,rb,pl,pm,r,jl}` | `app.py`, `Gemfile`-adjacent `.rb` |
| `**/*.{sh,bash,zsh,ksh,fish}` | `entrypoint.sh` |
| `**/*.toml` | `Cargo.toml` |
| `**/*.{csproj,fsproj,vbproj,props,targets,nuspec}` | `GeneratedApp.csproj` |
| `**/*.{html,htm,vue,svelte,astro}` | `index.html`, `App.vue` |
| `**/*.{css,scss,sass,less}` | `app.css` |
| `**/*.{sql,graphql,gql}` | `schema.sql` |
| `**/*.{cmake,mk,md}` | `README.md` |
| `**/{Dockerfile,Dockerfile.*,Makefile,makefile,GNUmakefile,Justfile,justfile,CMakeLists.txt}` | `Dockerfile`, `Makefile` |

| Option | Default | Meaning |
| --- | --- | --- |
| `sections` | *(omit to seed)* | Non-empty `["Section1", "SubSection1", …]`. Omit (or omit `options`) to set the whole file. An empty array throws. |
| `appendIfNotExists` | `"End"` | `"None"` throws if the section is missing. `"End"` appends at the end of the parent (or file). `"Start"` inserts at the start of the parent (or file). |
| `failIfExists` | `false` | When `true`, throw if that section path (or seed) already exists. |

Custom composers are `(patches, { failOnCollision }) => string | null`.

## Build

`npm run build` writes ESM, CJS, and `.d.ts` to `typescript/dist`. Package `exports` (`types`, `import`, `require`) all point at that folder.

`npm test` runs Vitest. `npm run typecheck` runs `tsc --noEmit`.
