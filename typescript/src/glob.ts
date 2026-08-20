const expandBraces = (pattern: string): string[] => {
  const match = /\{([^{}]+)\}/.exec(pattern);
  if (!match || match.index === undefined) return [pattern];
  const token = match[0];
  const alts = match[1]!;
  return alts.split(",").flatMap((alt) =>
    expandBraces(
      `${pattern.slice(0, match.index)}${alt}${pattern.slice(match.index + token.length)}`,
    ),
  );
};

const globToRegExp = (glob: string): RegExp => {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    if (glob.startsWith("**/", i)) {
      source += "(?:.*/)?";
      i += 2;
      continue;
    }
    if (glob.startsWith("**", i)) {
      source += ".*";
      i += 1;
      continue;
    }
    const char = glob[i]!;
    if (char === "*") {
      source += "[^/]*";
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    source += char.replace(/[.*+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
};

const compiledGlobs = new Map<string, RegExp[]>();

export const compileGlob = (pattern: string): RegExp[] => {
  const key = pattern.replaceAll("\\", "/");
  const cached = compiledGlobs.get(key);
  if (cached) return cached;
  const regexes = expandBraces(key).map((glob) => globToRegExp(glob));
  compiledGlobs.set(key, regexes);
  return regexes;
};

export const matchesGlob = (target: string, pattern: string): boolean => {
  const path = target.replaceAll("\\", "/");
  return compileGlob(pattern).some((regex) => regex.test(path));
};
