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
      external: [/^node:/],
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
