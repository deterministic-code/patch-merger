import { append, indentBody } from "../common/marked-sections.ts";
import type { Piece } from "../common/piece.ts";

interface SharedFileConvention {
  skeleton: string;
  indent: string;
  sectionPrefix: string;
  root?: boolean;
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
  ".dockerignore": {
    skeleton: ".git\n.env.local\n*.log\n*.sqlite\n*.sqlite3\n*.db\n",
    indent: "",
    sectionPrefix: "DOCKERIGNORE",
    root: true,
  },
};

export const sharedAppendWriter = ({
  skeleton,
  indent,
  sectionPrefix,
}: SharedFileConvention): ((pieces: Piece[]) => string | null) =>
  (pieces) => {
    if (!pieces.some((p) => p.section?.startsWith(`${sectionPrefix}_`))) return null;
    const blocks = [...new Map(pieces.map((p) => [p.section, p.content])).values()]
      .map((c) => indentBody(c, indent))
      .filter(Boolean);
    if (blocks.length === 0) return skeleton;
    return append(skeleton, blocks.join("\n\n"));
  };

export const outputTarget = (target: string): string => {
  const base = target.slice(target.lastIndexOf("/") + 1);
  return SHARED_FILE_CONVENTIONS[base]?.root ? base : target;
};
