import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "dist/webview",
    rollupOptions: {
      input: "src/webview/main.ts",
      output: {
        entryFileNames: "main.js",
        assetFileNames: "[name][extname]",
      },
    },
    minify: false,
  },
});
