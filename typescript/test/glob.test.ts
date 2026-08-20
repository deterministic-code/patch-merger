import { describe, expect, test } from "vitest";
import { matchesGlob } from "../src/glob.ts";

describe("matchesGlob", () => {
  test("matches ** prefixes, extensions, and brace groups", () => {
    expect(matchesGlob(".env", "**/.env")).toBe(true);
    expect(matchesGlob("nested/.env", "**/.env")).toBe(true);
    expect(matchesGlob("app.ts", "**/*.{ts,js}")).toBe(true);
    expect(matchesGlob("src/app.ts", "**/*.ts")).toBe(true);
    expect(matchesGlob("src/app.ts", "*.ts")).toBe(false);
    expect(matchesGlob("pkg.json", "**/*.json")).toBe(true);
    expect(matchesGlob("Makefile", "**/Makefile")).toBe(true);
    expect(matchesGlob("backend/Dockerfile.dev", "**/{Dockerfile,Dockerfile.*}")).toBe(
      true,
    );
    expect(matchesGlob(".env.example", "**/.env.*")).toBe(true);
    expect(matchesGlob("App.csproj", "**/*.{xml,csproj}")).toBe(true);
    expect(matchesGlob("app.ts", "app.?s")).toBe(true);
    expect(matchesGlob("app.ts", "app.?")).toBe(false);
    expect(matchesGlob("deep/nested/file.ts", "**")).toBe(true);
    expect(matchesGlob("file.ts", "**")).toBe(true);
    expect(matchesGlob("file.ts", "**/*.ts")).toBe(true);
    expect(matchesGlob("file.ts", "**/*.ts")).toBe(true);
  });
});
