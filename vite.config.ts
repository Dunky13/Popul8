import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const normalizeBasePath = (candidate: string | undefined): string => {
  const trimmed = candidate?.trim();
  if (!trimmed) return "/";

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH);

const swAssetManifestPlugin = (resolvedBasePath: string): Plugin => ({
  name: "popul8-sw-asset-manifest",
  apply: "build",
  generateBundle(_options, bundle) {
    const assets = new Set<string>([
      resolvedBasePath,
      `${resolvedBasePath}index.html`,
      `${resolvedBasePath}manifest.json`,
      `${resolvedBasePath}branding/popul8-logo.svg`,
      `${resolvedBasePath}sw.js`,
    ]);

    Object.values(bundle).forEach((output) => {
      const fileName = output.fileName;
      if (!fileName) return;
      assets.add(`${resolvedBasePath}${fileName}`);
    });

    this.emitFile({
      type: "asset",
      fileName: "sw-assets.json",
      source: JSON.stringify({ assets: Array.from(assets) }, null, 2),
    });
  },
});

const swCacheVersionPlugin = (resolvedBasePath: string): Plugin => ({
  name: "popul8-sw-cache-version",
  apply: "build",
  async writeBundle(options, bundle) {
    const outDir =
      typeof options.dir === "string"
        ? options.dir
        : path.resolve(process.cwd(), "dist");
    const swPath = path.resolve(outDir, "sw.js");
    const manifestPath = path.resolve(outDir, "manifest.json");
    const hash = createHash("sha256");
    const outputs = Object.values(bundle).sort((a, b) =>
      a.fileName.localeCompare(b.fileName),
    );
    for (const output of outputs) {
      hash.update(output.type);
      hash.update(":");
      hash.update(output.fileName);
      hash.update(":");
      if (output.type === "asset") {
        hash.update(output.source);
      } else {
        hash.update(output.code);
      }
      hash.update("|");
    }
    const version = hash.digest("hex").slice(0, 12);

    try {
      const source = await readFile(swPath, "utf8");
      const replaced = source
        .replace("__P8_CACHE_VERSION__", version)
        .replaceAll("__P8_BASE_PATH__", resolvedBasePath);
      if (replaced !== source) {
        await writeFile(swPath, replaced, "utf8");
      }
    } catch (error) {
      console.warn("Failed to inject service worker cache version.", error);
    }

    try {
      const source = await readFile(manifestPath, "utf8");
      const replaced = source.replaceAll("__P8_BASE_PATH__", resolvedBasePath);
      if (replaced !== source) {
        await writeFile(manifestPath, replaced, "utf8");
      }
    } catch (error) {
      console.warn("Failed to inject base path into web manifest.", error);
    }
  },
});

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@codemirror")) return "codemirror";
          if (id.includes("prettier")) return "prettier";
          if (id.includes("papaparse")) return "csv";
          return "vendor";
        },
      },
    },
  },
  plugins: [
    swAssetManifestPlugin(basePath),
    swCacheVersionPlugin(basePath),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
  ],
});
