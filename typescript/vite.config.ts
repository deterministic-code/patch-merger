import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const entries: Record<string, string> = {
  index: "src/index.ts",
  "patch-merger": "src/patch-merger.ts",
};

export default defineConfig({
  build: {
    lib: {
      entry: Object.fromEntries(
        Object.entries(entries).map(([name, path]) => [
          name,
          resolve(__dirname, path),
        ]),
      ),
      name: "PatchMerger",
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
    },
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^node:/, "yaml", "fast-xml-parser"],
    },
  },
  test: {
    root: __dirname,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      thresholds: {
        "src/writers/deep-document.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/writers/deep-json-writer.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/writers/deep-yaml-writer.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/writers/deep-xml-writer.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
  plugins: [
    dts({
      include: [resolve(__dirname, "src")],
      exclude: [
        resolve(__dirname, "src/**/*.test.ts"),
        resolve(__dirname, "src/**/__tests__/**"),
      ],
      tsconfigPath: resolve(__dirname, "tsconfig.json"),
      rollupTypes: true,
    }),
  ],
});
