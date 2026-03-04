const STYLE_BLOCK_MARKER_REGEX =
  /\/\*\s*===\s*SVG STYLE BLOCK\s+\d+\s*===\s*\*\//g;

let prettierCssLoader:
  | Promise<{
      format: (typeof import("prettier/standalone"))["format"];
      cssPlugin: typeof import("prettier/plugins/postcss");
    }>
  | null = null;

const loadPrettierCss = async () => {
  if (!prettierCssLoader) {
    prettierCssLoader = Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/postcss"),
    ]).then(([prettierModule, cssPluginModule]) => ({
      format: prettierModule.format,
      cssPlugin: cssPluginModule,
    }));
  }
  return prettierCssLoader;
};

export const formatCss = async (input: string) => {
  if (!input.trim()) return input;
  try {
    const { format, cssPlugin } = await loadPrettierCss();
    return await format(input, {
      parser: "css",
      plugins: [cssPlugin],
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
    });
  } catch (error) {
    console.warn("Prettier CSS formatting failed.", error);
    return input;
  }
};

export const getSvgCssBlocks = (content: string): string[] => {
  if (!content.trim()) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return [];
  const styles = Array.from(svg.querySelectorAll("style"));
  return styles.map((style) => style.textContent ?? "");
};

export const buildCssDraft = (blocks: string[]): string => {
  if (blocks.length === 0) return "";
  if (blocks.length === 1) return blocks[0];
  return blocks
    .map((block, index) => {
      const marker = `/* === SVG STYLE BLOCK ${index + 1} === */`;
      return `${marker}\n${block.trim()}`;
    })
    .join("\n\n");
};

export const splitCssDraft = (
  draft: string,
  existingBlocks: string[],
): { blocks: string[]; hasMarkers: boolean } => {
  const trimmedDraft = draft.trim();
  if (!trimmedDraft) {
    return { blocks: [""], hasMarkers: false };
  }

  STYLE_BLOCK_MARKER_REGEX.lastIndex = 0;
  const hasMarkers = STYLE_BLOCK_MARKER_REGEX.test(trimmedDraft);
  STYLE_BLOCK_MARKER_REGEX.lastIndex = 0;

  if (hasMarkers) {
    const chunks = trimmedDraft
      .split(STYLE_BLOCK_MARKER_REGEX)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);
    return { blocks: chunks.length > 0 ? chunks : [""], hasMarkers };
  }

  if (existingBlocks.length <= 1) {
    return { blocks: [draft], hasMarkers: false };
  }

  return {
    blocks: [draft, ...existingBlocks.slice(1)],
    hasMarkers: false,
  };
};

export const updateSvgCssBlocks = (
  content: string,
  blocks: string[],
  removeExtra: boolean,
): string | null => {
  type StyleElement = SVGStyleElement | HTMLStyleElement;
  if (!content.trim()) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;

  let styles = Array.from(svg.querySelectorAll("style")) as StyleElement[];
  if (styles.length === 0) {
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.insertBefore(defs, svg.firstChild);
    }
    const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
    defs.appendChild(style);
    styles = [style];
  }

  const normalizedBlocks = blocks.length > 0 ? blocks : [""];
  normalizedBlocks.forEach((block, index) => {
    let style = styles[index];
    if (!style) {
      const defs = svg.querySelector("defs") ?? svg;
      style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
      defs.appendChild(style);
      styles.push(style);
    }
    const normalized = block.trim();
    style.textContent = normalized ? `\n${normalized}\n` : "";
  });

  if (removeExtra && styles.length > normalizedBlocks.length) {
    styles.slice(normalizedBlocks.length).forEach((style) => style.remove());
  }

  return new XMLSerializer().serializeToString(svg);
};

export const countCssRuleBlocks = (cssText: string): number => {
  if (!cssText.trim()) return 0;
  let count = 0;
  let depth = 0;
  let inString: '"' | "'" | null = null;
  let inComment = false;

  for (let i = 0; i < cssText.length; i += 1) {
    const char = cssText[i];
    const next = cssText[i + 1];

    if (inComment) {
      if (char === "*" && next === "/") {
        inComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (char === "\\") {
        i += 1;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      inComment = true;
      i += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        count += 1;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth = Math.max(0, depth - 1);
    }
  }

  return count;
};
