import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { createHash } from "node:crypto";
import { readFile, writeFile, stat } from "node:fs/promises";
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

// ─── PWA Asset Generation ────────────────────────────────────────────────────
// Generates all favicon + PWA icon sizes from the SVG at build/dev start.
// Icons are written to public/ so Vite copies them to dist/ automatically,
// and manifest.json + index.html can reference them as static paths.
//
// Files produced (via minimal2023Preset):
//   public/favicon.ico
//   public/favicon-16x16.png
//   public/favicon-32x32.png
//   public/favicon-48x48.png
//   public/apple-touch-icon-180x180.png  ← iOS home screen
//   public/pwa-64x64.png
//   public/pwa-192x192.png
//   public/pwa-512x512.png               ← Android launcher
//   public/maskable-icon-512x512.png     ← Android adaptive icon (safe-zone padded)
const pwaAssetsPlugin = (): Plugin => {
  const SOURCE_SVG = "public/branding/popul8-logo.svg";
  const STAMP_FILE = "public/.pwa-assets-stamp";

  return {
    name: "popul8-pwa-assets",

    async buildStart() {
      const srcPath = path.resolve(process.cwd(), SOURCE_SVG);
      const stampPath = path.resolve(process.cwd(), STAMP_FILE);

      try {
        const [svgStat, stampStat] = await Promise.all([
          stat(srcPath),
          stat(stampPath),
        ]);
        if (stampStat.mtimeMs >= svgStat.mtimeMs) return;
      } catch {
        // stamp missing → first run, fall through
      }

      this.warn?.(
        `[popul8-pwa-assets] Generating PWA assets from ${SOURCE_SVG}…`,
      );

      const { instructions } =
        await import("@vite-pwa/assets-generator/api/instructions");
      const { generateAssets } =
        await import("@vite-pwa/assets-generator/api/generate-assets");
      const { minimal2023Preset } =
        await import("@vite-pwa/assets-generator/config");

      const svgBuffer = await readFile(srcPath);

      const preset = {
        ...minimal2023Preset,
        maskable: {
          ...minimal2023Preset.maskable,
          resizeOptions: { background: "transparent" },
          padding: 0.3,
        },
        apple: {
          ...minimal2023Preset.apple,
          resizeOptions: { background: "white" },
          padding: 0.1,
        },
      };

      const imageAssets = {
        imageResolver: () => svgBuffer,
        imageName: "popul8-logo.svg",
        preset,
        htmlLinks: { xhtml: false, includeId: false },
        basePath: "/",
        resolveSvgName: (name: string) => name,
      };

      const instructionsResult = await instructions(imageAssets);
      await generateAssets(instructionsResult, true, "public", () => {});

      await writeFile(stampPath, new Date().toISOString(), "utf8");

      this.warn?.("[popul8-pwa-assets] Done.");
    },
  };
};

// ─── SW Asset Manifest ───────────────────────────────────────────────────────
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
      // PWA icons — SW can pre-cache these so the app installs fully offline
      `${resolvedBasePath}favicon.ico`,
      `${resolvedBasePath}favicon-16x16.png`,
      `${resolvedBasePath}favicon-32x32.png`,
      `${resolvedBasePath}favicon-48x48.png`,
      `${resolvedBasePath}apple-touch-icon-180x180.png`,
      `${resolvedBasePath}pwa-64x64.png`,
      `${resolvedBasePath}pwa-192x192.png`,
      `${resolvedBasePath}pwa-512x512.png`,
      `${resolvedBasePath}maskable-icon-512x512.png`,
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

// ─── SW Cache Version ────────────────────────────────────────────────────────
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
    const buildTime = new Date().toISOString();
    try {
      const source = await readFile(swPath, "utf8");
      const replaced = source
        .replace("__P8_CACHE_VERSION__", version)
        .replace("__P8_BUILD_TIME__", buildTime)
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
    pwaAssetsPlugin(),
    swAssetManifestPlugin(basePath),
    swCacheVersionPlugin(basePath),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
  ],
});
