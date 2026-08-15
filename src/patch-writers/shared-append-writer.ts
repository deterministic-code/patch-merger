import { indentBody } from "../marked-sections.ts";

interface SharedFileConvention {
  skeleton: string;
  indent: string;
  sectionPrefix: string;
}

interface Piece {
  content: string;
  section?: string;
}

// Merge conventions per shared target file; entries stay {kind, target, content, section}. Each patch names its own `section` — the owner's is convention-prefixed (ENV_TYPESCRIPT), an augmenter's is not (migrate's DB_ENV). The section id routes the piece and gates materialization; it never appears in the composed output.
export const SHARED_FILE_CONVENTIONS: Record<string, SharedFileConvention> = {
  "docker-compose.yml": {
    skeleton: "services:\n",
    indent: "  ",
    sectionPrefix: "COMPOSE_SERVICE",
  },
  ".env": {
    skeleton: "",
    indent: "",
    sectionPrefix: "ENV",
  },
  ".env.example": {
    skeleton: "",
    indent: "",
    sectionPrefix: "ENV",
  },
  ".gitignore": {
    skeleton: ".env\n",
    indent: "",
    sectionPrefix: "GITIGNORE",
  },
};

// Targets are artifact-root-relative posix paths; conventions key on the basename so per-language copies (rust/.env) share one rule.
export function conventionForTarget(
  target: string,
): SharedFileConvention | null {
  const base = target.slice(target.lastIndexOf("/") + 1);
  return SHARED_FILE_CONVENTIONS[base] ?? null;
}

export function isSharedPatchTarget(target: string): boolean {
  return conventionForTarget(target) !== null;
}

export function sharedAppendWriter(
  convention: SharedFileConvention,
): (pieces: Piece[]) => string | null {
  const ownerPrefix = `${convention.sectionPrefix}_`;
  return (pieces) => {
    // The file materializes only when its owner section (the convention-prefixed one, e.g. ENV_TYPESCRIPT) is among the pieces; augmenter-only pieces (migrate's DB_ENV) no-op rather than compose a half-formed file — the migrate-only-scaffold contract. Composition is the skeleton followed by each section's content in emit order; no disk read, no markers in the output.
    const hasOwner = pieces.some((p) => p.section?.startsWith(ownerPrefix));
    if (!hasOwner) return null;
    // Same-section pieces collapse to the last contribution — the section id is the region's identity — mirroring the old marked-section upsert without emitting markers. Map keeps each section at its first-seen position with its latest content.
    const bySection = new Map<string | undefined, string>();
    for (const p of pieces) bySection.set(p.section, p.content);
    const blocks = [...bySection.values()]
      .map((content) => indentBody(content, convention.indent))
      .filter((b) => b.length > 0);
    if (blocks.length === 0) return convention.skeleton;
    const base =
      convention.skeleton.length === 0 || convention.skeleton.endsWith("\n")
        ? convention.skeleton
        : `${convention.skeleton}\n`;
    return `${base}${blocks.join("\n\n")}\n`;
  };
}
