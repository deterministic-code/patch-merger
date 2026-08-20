import type { Writer } from "./writer.ts";
import { deepJsonWriter } from "./writers/deep-json-writer.ts";
import { deepXmlWriter } from "./writers/deep-xml-writer.ts";
import { deepYamlWriter } from "./writers/deep-yaml-writer.ts";
import { lineUpsertWriter } from "./writers/line-upsert-writer.ts";
import { sectionWriter } from "./writers/section-writer.ts";

export type WriterBinding = readonly [glob: string, writer: Writer];

export const defaultWriters: WriterBinding[] = [
  ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", sectionWriter],
  ["**/*.{cs,csx,fs,fsx,vb}", sectionWriter],
  ["**/*.rs", sectionWriter],
  ["**/*.{go,java,kt,kts,scala,groovy,gradle}", sectionWriter],
  ["**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx,m,mm}", sectionWriter],
  ["**/*.{swift,php}", sectionWriter],
  ["**/*.{py,rb,pl,pm,r,jl}", sectionWriter],
  ["**/*.{sh,bash,zsh,ksh,fish}", sectionWriter],
  ["**/*.toml", sectionWriter],
  ["**/*.{csproj,fsproj,vbproj,props,targets,nuspec}", sectionWriter],
  ["**/*.{html,htm,vue,svelte,astro}", sectionWriter],
  ["**/*.{css,scss,sass,less}", sectionWriter],
  ["**/*.{sql,graphql,gql}", sectionWriter],
  ["**/*.{cmake,mk,md}", sectionWriter],
  [
    "**/{Dockerfile,Dockerfile.*,Makefile,makefile,GNUmakefile,Justfile,justfile,CMakeLists.txt}",
    sectionWriter,
  ],
  ["**/*.json", deepJsonWriter],
  ["**/*.jsonc", deepJsonWriter],
  ["**/*.json5", deepJsonWriter],
  ["**/*.yml", deepYamlWriter],
  ["**/*.yaml", deepYamlWriter],
  ["**/*.xml", deepXmlWriter],
  ["**/.env", lineUpsertWriter],
  ["**/.env.*", lineUpsertWriter],
  ["**/.gitignore", lineUpsertWriter],
  ["**/.dockerignore", lineUpsertWriter],
  ["**/.containerignore", lineUpsertWriter],
  ["**/.ignore", lineUpsertWriter],
  ["**/.npmignore", lineUpsertWriter],
  ["**/.eslintignore", lineUpsertWriter],
  ["**/.prettierignore", lineUpsertWriter],
  ["**/.stylelintignore", lineUpsertWriter],
  ["**/.markdownlintignore", lineUpsertWriter],
  ["**/.helmignore", lineUpsertWriter],
  ["**/.gcloudignore", lineUpsertWriter],
  ["**/.fdignore", lineUpsertWriter],
  ["**/.rgignore", lineUpsertWriter],
  ["**/.cursorignore", lineUpsertWriter],
  ["**/.claudeignore", lineUpsertWriter],
  ["**/.slugignore", lineUpsertWriter],
  ["**/.tfignore", lineUpsertWriter],
  ["**/.cvsignore", lineUpsertWriter],
  ["**/.bzrignore", lineUpsertWriter],
  ["**/.hgignore", lineUpsertWriter],
];
