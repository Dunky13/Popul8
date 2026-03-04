/**
 * SVG font parsing and linking helpers
 */

const FONT_COMMENT_PREFIX = "popul8-font:";
const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "sans",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

const normalizeFontName = (value: string) =>
  value.trim().replace(/^['"]|['"]$/g, "");

const extractFontNamesFromValue = (value: string) => {
  return value
    .split(",")
    .map((entry) => normalizeFontName(entry))
    .filter((entry) => entry.length > 0);
};

const normalizeWeightValue = (value: string) => {
  const weights = new Set<number>();
  const numeric = value.match(/\b\d{3}\b/g) ?? [];
  numeric.forEach((entry) => {
    const parsed = Number(entry);
    if (parsed >= 100 && parsed <= 900) {
      weights.add(parsed);
    }
  });
  if (weights.size > 0) return Array.from(weights);

  const lower = value.toLowerCase();
  if (lower.includes("bold")) return [700];
  if (lower.includes("normal")) return [400];
  return [];
};

const addWeights = (
  map: Record<string, Set<number>>,
  fonts: string[],
  weights: number[],
) => {
  if (weights.length === 0) return;
  fonts.forEach((font) => {
    if (!map[font]) {
      map[font] = new Set<number>();
    }
    weights.forEach((weight) => map[font].add(weight));
  });
};

export const extractFontUsage = (content: string) => {
  const fonts = new Set<string>();
  const embedded = new Set<string>();

  const addFont = (name: string) => {
    const normalized = normalizeFontName(name);
    if (!normalized) return;
    if (GENERIC_FONTS.has(normalized.toLowerCase())) return;
    fonts.add(normalized);
  };

  const familyRegex = /font-family\s*:\s*([^;}{]+)[;}]?/gi;
  let match;
  while ((match = familyRegex.exec(content)) !== null) {
    extractFontNamesFromValue(match[1]).forEach(addFont);
  }

  const attrRegex = /font-family\s*=\s*["']([^"']+)["']/gi;
  while ((match = attrRegex.exec(content)) !== null) {
    extractFontNamesFromValue(match[1]).forEach(addFont);
  }

  const fontFaceRegex = /@font-face\s*{[^}]*}/gi;
  let fontFaceMatch;
  while ((fontFaceMatch = fontFaceRegex.exec(content)) !== null) {
    const block = fontFaceMatch[0];
    const familyMatch = /font-family\s*:\s*([^;}{]+)[;}]?/i.exec(block);
    if (familyMatch?.[1]) {
      extractFontNamesFromValue(familyMatch[1]).forEach((name) => {
        addFont(name);
        embedded.add(normalizeFontName(name));
      });
    }
  }

  return {
    fonts: Array.from(fonts).sort((a, b) => a.localeCompare(b)),
    embeddedFonts: embedded,
  };
};

export const inferFontWeightsFromSvg = (content: string) => {
  const weights: Record<string, Set<number>> = {};

  const parseStyleBlock = (styleText: string) => {
    const ruleRegex = /{([^}]*)}/g;
    let match;
    while ((match = ruleRegex.exec(styleText)) !== null) {
      const body = match[1] ?? "";
      const familyMatch = /font-family\s*:\s*([^;}{]+)[;}]?/i.exec(body);
      const weightMatch = /font-weight\s*:\s*([^;}{]+)[;}]?/i.exec(body);
      if (!familyMatch?.[1] || !weightMatch?.[1]) continue;
      const fonts = extractFontNamesFromValue(familyMatch[1]);
      const weightValues = normalizeWeightValue(weightMatch[1]);
      addWeights(weights, fonts, weightValues);
    }
  };

  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagRegex.exec(content)) !== null) {
    parseStyleBlock(styleMatch[1] ?? "");
  }

  const inlineStyleRegex = /style\s*=\s*["']([^"']+)["']/gi;
  let inlineMatch;
  while ((inlineMatch = inlineStyleRegex.exec(content)) !== null) {
    const styleText = inlineMatch[1] ?? "";
    const familyMatch = /font-family\s*:\s*([^;}{]+)[;}]?/i.exec(styleText);
    const weightMatch = /font-weight\s*:\s*([^;}{]+)[;}]?/i.exec(styleText);
    if (!familyMatch?.[1] || !weightMatch?.[1]) continue;
    const fonts = extractFontNamesFromValue(familyMatch[1]);
    const weightValues = normalizeWeightValue(weightMatch[1]);
    addWeights(weights, fonts, weightValues);
  }

  const tagRegex = /<[^>]+>/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(content)) !== null) {
    const tag = tagMatch[0] ?? "";
    const familyMatch = /font-family\s*=\s*["']([^"']+)["']/i.exec(tag);
    const weightMatch = /font-weight\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!familyMatch?.[1] || !weightMatch?.[1]) continue;
    const fonts = extractFontNamesFromValue(familyMatch[1]);
    const weightValues = normalizeWeightValue(weightMatch[1]);
    addWeights(weights, fonts, weightValues);
  }

  return Object.fromEntries(
    Object.entries(weights).map(([font, values]) => [
      font,
      Array.from(values).sort((a, b) => a - b),
    ]),
  );
};

export const buildGoogleFontsUrl = (
  fonts: string[],
  fontWeights?: Record<string, number[]>,
) => {
  const families = fonts
    .map((font) => font.trim())
    .filter((font) => font.length > 0)
    .map((font) => {
      const encoded = font.replace(/\s+/g, "+");
      const weights = fontWeights?.[font] ?? [];
      if (weights.length === 0) {
        return `family=${encoded}`;
      }
      const unique = Array.from(new Set(weights)).sort((a, b) => a - b);
      return `family=${encoded}:wght@${unique.join(";")}`;
    });

  if (families.length === 0) return "";
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
};

export const extractGoogleFontFamiliesFromContent = (content: string) => {
  const families = new Set<string>();
  const urlRegex = /https:\/\/fonts\.googleapis\.com\/css2\?[^"')\s]+/gi;
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0] ?? "";
    const queryIndex = url.indexOf("?");
    if (queryIndex === -1) continue;
    const query = url.slice(queryIndex + 1);
    const params = new URLSearchParams(query);
    const familyParams = params.getAll("family");
    familyParams.forEach((familyParam) => {
      const raw = familyParam.split(":")[0] ?? "";
      if (!raw) return;
      const decoded = raw.replace(/\+/g, " ").trim();
      if (decoded) families.add(decoded);
    });
  }
  return families;
};

export const parseFontLinksFromComments = (content: string) => {
  const links: Record<string, string> = {};
  const commentRegex = /<!--\s*popul8-font:\s*([\s\S]*?)-->/gi;
  let match;
  while ((match = commentRegex.exec(content)) !== null) {
    const raw = match[1]?.trim() ?? "";
    if (!raw) continue;
    let fontPart = "";
    let urlPart = "";

    if (raw.includes("|")) {
      const [fontRaw, urlRaw] = raw.split("|");
      fontPart = fontRaw?.trim() ?? "";
      urlPart = urlRaw?.trim() ?? "";
    } else {
      const tokens = raw.split(/\s+/);
      const last = tokens[tokens.length - 1] ?? "";
      if (last.startsWith("http://") || last.startsWith("https://")) {
        urlPart = last;
        fontPart = tokens.slice(0, -1).join(" ");
      }
    }

    const font = normalizeFontName(fontPart);
    if (!font || !urlPart) continue;
    links[font] = urlPart;
  }
  return links;
};

export const getMissingFonts = (content: string): string[] => {
  const usage = extractFontUsage(content);
  const linkedFonts = parseFontLinksFromComments(content);
  return usage.fonts.filter(
    (font) => !usage.embeddedFonts.has(font) && !linkedFonts[font],
  );
};

export const updateSvgWithFontLink = (
  content: string,
  fontName: string,
  url: string,
) => {
  const linkMap = parseFontLinksFromComments(content);
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return content;

  const normalizedFont = normalizeFontName(fontName);
  const trimmedUrl = url.trim();
  if (!normalizedFont || !trimmedUrl) return content;

  linkMap[normalizedFont] = trimmedUrl;

  const commentText = `${FONT_COMMENT_PREFIX} "${normalizedFont}" | ${trimmedUrl}`;
  const commentNodes = (Array.from(svg.childNodes) as Node[]).filter(
    (node): node is Comment => node.nodeType === Node.COMMENT_NODE,
  );
  const commentNode =
    commentNodes.find((node) => {
      const text = node.data ?? "";
      if (!text.includes(FONT_COMMENT_PREFIX)) return false;
      const parsed = parseFontLinksFromComments(`<!--${text}-->`);
      return parsed[normalizedFont] !== undefined;
    }) ?? null;

  if (commentNode) {
    commentNode.data = ` ${commentText} `;
  } else {
    const newComment = doc.createComment(` ${commentText} `);
    svg.insertBefore(newComment, svg.firstChild);
  }

  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  let style = defs.querySelector("style#popul8-fonts");
  if (!style) {
    style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
    style.setAttribute("id", "popul8-fonts");
    style.setAttribute("type", "text/css");
    defs.appendChild(style);
  }

  const urls = Object.values(linkMap)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  style.textContent = urls
    .map((entry) => `@import url("${entry}");`)
    .join("\n");

  return new XMLSerializer().serializeToString(svg);
};
