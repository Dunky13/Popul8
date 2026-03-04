const PLACEHOLDER_CAPTURE_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

const extractFromRawSvg = (rawSvg: string) => {
  const placeholders: string[] = [];
  let i = 0;

  while (i < rawSvg.length - 1) {
    if (rawSvg.substring(i, i + 6).toLowerCase() === "<style") {
      const styleEnd = rawSvg.toLowerCase().indexOf("</style>", i);
      if (styleEnd === -1) break;
      i = styleEnd + 8;
      continue;
    }

    if (rawSvg.substring(i, i + 7).toLowerCase() === "<script") {
      const scriptEnd = rawSvg.toLowerCase().indexOf("</script>", i);
      if (scriptEnd === -1) break;
      i = scriptEnd + 9;
      continue;
    }

    if (rawSvg[i] === "{" && rawSvg[i + 1] === "{") {
      const startIndex = i + 2;
      let endIndex = startIndex;
      while (endIndex < rawSvg.length - 1) {
        if (rawSvg[endIndex] === "}" && rawSvg[endIndex + 1] === "}") {
          const placeholderContent = rawSvg.slice(startIndex, endIndex).trim();
          if (placeholderContent.length > 0) {
            placeholders.push(placeholderContent);
          }
          i = endIndex + 2;
          break;
        }
        endIndex++;
      }

      if (endIndex >= rawSvg.length - 1) {
        i++;
      }
    } else {
      i++;
    }
  }

  return placeholders;
};

const extractIdsFromRawSvg = (rawSvg: string) => {
  const idRegex = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  const ids: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = idRegex.exec(rawSvg)) !== null) {
    const id = match[1] ?? match[2] ?? match[3] ?? "";
    if (id) ids.push(id);
  }

  return ids;
};

const captureTokens = (value: string, tokenSet: Set<string>) => {
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_CAPTURE_REGEX.exec(value)) !== null) {
    const token = match[1]?.trim();
    if (token) {
      tokenSet.add(token);
    }
  }
  PLACEHOLDER_CAPTURE_REGEX.lastIndex = 0;
};

export const extractPlaceholders = (svgContent: string): string[] => {
  if (typeof DOMParser === "undefined") {
    return [...new Set(extractFromRawSvg(svgContent))].sort();
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) {
      return [...new Set(extractFromRawSvg(svgContent))].sort();
    }

    const placeholderSet = new Set<string>();
    const ignoredTagNames = new Set([
      "style",
      "script",
      "metadata",
      "title",
      "desc",
    ]);

    const allElements = [svg, ...Array.from(svg.querySelectorAll("*"))];
    allElements.forEach((element) => {
      const tagName = element.tagName.toLowerCase();
      if (ignoredTagNames.has(tagName)) return;

      element.childNodes.forEach((node) => {
        if (node.nodeType !== 3 || !node.nodeValue) return;
        captureTokens(node.nodeValue, placeholderSet);
      });

      Array.from(element.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        const inScopedAttribute =
          attrName === "href" ||
          attrName === "xlink:href" ||
          attrName === "src" ||
          attrName === "title" ||
          attrName === "alt" ||
          attrName === "aria-label" ||
          attrName.startsWith("data-") ||
          attrName.startsWith("aria-");

        if (!inScopedAttribute) return;
        captureTokens(attr.value, placeholderSet);
      });
    });

    return Array.from(placeholderSet).sort();
  } catch {
    return [...new Set(extractFromRawSvg(svgContent))].sort();
  }
};

export const extractElementIds = (svgContent: string): string[] => {
  if (typeof DOMParser === "undefined") {
    return [...new Set(extractIdsFromRawSvg(svgContent))].sort();
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) {
      return [...new Set(extractIdsFromRawSvg(svgContent))].sort();
    }

    const ids = [svg, ...Array.from(svg.querySelectorAll("[id]"))]
      .map((element) => element.getAttribute("id"))
      .filter((id): id is string => Boolean(id && id.trim().length > 0));

    return [...new Set(ids)].sort();
  } catch {
    return [...new Set(extractIdsFromRawSvg(svgContent))].sort();
  }
};
