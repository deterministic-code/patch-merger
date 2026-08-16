import { indentBody } from "../common/marked-sections.ts";

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

export const SHARED_FILE_CONVENTIONS = {
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
  },
};

export function sharedAppendWriter({
  skeleton,
  indent,
  sectionPrefix,
}: SharedFileConvention): (pieces: Piece[]) => string | null {
  return (pieces) => {
    if (!pieces.some((p) => p.section?.startsWith(`${sectionPrefix}_`))) return null;
    const blocks = [...new Map(pieces.map((p) => [p.section, p.content])).values()]
      .map((c) => indentBody(c, indent))
      .filter(Boolean);
    if (blocks.length === 0) return skeleton;
    const base = skeleton && !skeleton.endsWith("\n") ? `${skeleton}\n` : skeleton;
    return `${base}${blocks.join("\n\n")}\n`;
  };
}
