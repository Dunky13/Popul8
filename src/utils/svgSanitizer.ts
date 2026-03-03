const UNSAFE_TAGS = ["script", "iframe", "object", "embed", "audio", "video"];
const URL_ATTRIBUTES = ["href", "xlink:href", "src"];

type UrlContext = {
  tagName?: string;
  attrName?: string;
};

const hasUnsafeStyleUrl = (value: string) => {
  return /url\s*\(\s*['"]?\s*javascript:/i.test(value);
};

const normalizeTagName = (tagName: string | undefined) => {
  if (!tagName) return "";
  const normalized = tagName.trim().toLowerCase();
  const parts = normalized.split(":");
  return parts[parts.length - 1] ?? normalized;
};

const isImageUrlContext = ({ tagName, attrName }: UrlContext) => {
  const normalizedAttrName = (attrName ?? "").trim().toLowerCase();
  if (!URL_ATTRIBUTES.includes(normalizedAttrName)) return false;
  return normalizeTagName(tagName) === "image";
};

const inferTagNameForAttrMatch = (input: string, offset: number) => {
  const tagStart = input.lastIndexOf("<", offset);
  if (tagStart === -1) return undefined;

  const tagClose = input.indexOf(">", tagStart);
  if (tagClose !== -1 && tagClose < offset) return undefined;

  let cursor = tagStart + 1;
  while (cursor < input.length && /\s/.test(input[cursor])) cursor += 1;
  if (input[cursor] === "/") cursor += 1;
  while (cursor < input.length && /\s/.test(input[cursor])) cursor += 1;

  let end = cursor;
  while (end < input.length && /[^\s/>]/.test(input[end])) end += 1;

  const tagName = input.slice(cursor, end).trim();
  return tagName || undefined;
};

const isSafeSvgUrl = (value: string, context: UrlContext = {}) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.startsWith("#")) return true;
  if (normalized.startsWith("data:image/")) return true;
  if (normalized.startsWith("blob:")) return true;
  if (
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../")
  ) {
    return true;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) {
    if (
      isImageUrlContext(context) &&
      (normalized.startsWith("https:") || normalized.startsWith("http:"))
    ) {
      return true;
    }
    return false;
  }
  return true;
};

export const sanitizeSvgMarkup = (svgMarkup: string) => {
  if (!svgMarkup.trim()) return svgMarkup;

  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    let sanitized = svgMarkup;

    UNSAFE_TAGS.forEach((tagName) => {
      const pairedTagPattern = new RegExp(
        `<${tagName}\\b[\\s\\S]*?<\\/${tagName}\\s*>`,
        "gi",
      );
      const selfClosingPattern = new RegExp(`<${tagName}\\b[^>]*\\/?>`, "gi");
      sanitized = sanitized.replace(pairedTagPattern, "");
      sanitized = sanitized.replace(selfClosingPattern, "");
    });

    sanitized = sanitized.replace(
      /\s(on[a-z0-9:_-]+)\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
      "",
    );

    URL_ATTRIBUTES.forEach((attrName) => {
      const attrPattern = new RegExp(
        `\\s(${attrName})\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
        "gi",
      );
      sanitized = sanitized.replace(
        attrPattern,
        (
          fullMatch,
          _attr,
          _raw,
          doubleQuoted,
          singleQuoted,
          bareValue,
          offset,
          input,
        ) => {
          const resolvedValue = String(
            doubleQuoted ?? singleQuoted ?? bareValue ?? "",
          );
          const tagName =
            typeof input === "string" && typeof offset === "number"
              ? inferTagNameForAttrMatch(input, offset)
              : undefined;
          return isSafeSvgUrl(resolvedValue, { tagName, attrName })
            ? fullMatch
            : "";
        },
      );
    });

    sanitized = sanitized.replace(
      /\s(style)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (fullMatch, _attr, _raw, doubleQuoted, singleQuoted, bareValue) => {
        const resolvedValue = String(
          doubleQuoted ?? singleQuoted ?? bareValue ?? "",
        );
        return hasUnsafeStyleUrl(resolvedValue) ? "" : fullMatch;
      },
    );

    return sanitized;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return svgMarkup;

  UNSAFE_TAGS.forEach((tagName) => {
    const elements = Array.from(svg.querySelectorAll(tagName));
    elements.forEach((element) => element.remove());
  });

  const allElements = [svg, ...Array.from(svg.querySelectorAll("*"))];
  allElements.forEach((element) => {
    const attributes = Array.from(element.attributes);
    attributes.forEach((attribute) => {
      const attrName = attribute.name.toLowerCase();
      const attrValue = attribute.value ?? "";

      if (attrName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (
        URL_ATTRIBUTES.includes(attrName) &&
        !isSafeSvgUrl(attrValue, {
          tagName: element.tagName,
          attrName,
        })
      ) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (attrName === "style" && hasUnsafeStyleUrl(attrValue)) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return new XMLSerializer().serializeToString(svg);
};
