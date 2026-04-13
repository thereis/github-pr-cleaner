import { defineConfig } from "rolldown";
import { copyFileSync, mkdirSync } from "node:fs";

const copyAssets = () => ({
  name: "copy-static-assets",
  generateBundle() {
    mkdirSync("dist", { recursive: true });
    copyFileSync("src/manifest.json", "dist/manifest.json");
    copyFileSync("src/popup.html", "dist/popup.html");
    copyFileSync("src/options.html", "dist/options.html");
    for (const size of ["16", "48", "128"]) {
      copyFileSync(`src/icon${size}.png`, `dist/icon${size}.png`);
    }
  },
});

export default defineConfig([
  {
    input: "src/content/index.ts",
    output: {
      dir: "dist",
      format: "iife",
      entryFileNames: "content.js",
    },
    plugins: [copyAssets()],
  },
  {
    input: "src/popup.ts",
    output: {
      dir: "dist",
      format: "iife",
      entryFileNames: "popup.js",
    },
  },
  {
    input: "src/background/index.ts",
    output: {
      dir: "dist",
      format: "esm",
      entryFileNames: "background.js",
    },
  },
  {
    input: "src/options.ts",
    output: {
      dir: "dist",
      format: "iife",
      entryFileNames: "options.js",
    },
  },
]);
