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

const ENV: SharedFileConvention = {
  skeleton: "",
  indent: "",
  sectionPrefix: "ENV",
};

export const SHARED_FILE_CONVENTIONS: Record<string, SharedFileConvention> = {
  "docker-compose.yml": {
    skeleton: "services:\n",
    indent: "  ",
    sectionPrefix: "COMPOSE_SERVICE",
  },
  ".env": ENV,
  ".env.example": ENV,
  ".gitignore": { skeleton: ".env\n", indent: "", sectionPrefix: "GITIGNORE" },
};

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
    if (!pieces.some((p) => p.section?.startsWith(ownerPrefix))) return null;
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
