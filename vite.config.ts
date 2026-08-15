import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const entries: Record<string, string> = {
  index: "src/index.ts",
  "patch-merger": "src/patch-merger.ts",
  "section-markers": "src/section-markers.ts",
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
    sourcemap: true,
    rollupOptions: {
      external: [/^node:/],
    },
  },
  plugins: [
    dts({
      include: ["src"],
      exclude: ["src/**/*.test.ts", "src/**/__tests__/**"],
      rollupTypes: true,
    }),
  ],
});
