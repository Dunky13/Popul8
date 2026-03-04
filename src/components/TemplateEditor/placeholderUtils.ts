import {
  createPlaceholderRegex,
  extractPlaceholdersFromString,
} from "../../utils/regexUtils";
import type { Rect } from "./types";

const toFixed = (value: number) => Number(value.toFixed(2));

export const updateInlineFontSize = (styleText: string, fontSize: string) => {
  const entries = styleText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => !entry.toLowerCase().startsWith("font-size:"));
  entries.push(`font-size: ${fontSize} !important`);
  return `${entries.join("; ")};`;
};

export const serializeElement = (element: Element) =>
  new XMLSerializer().serializeToString(element);

export const getElementRect = (element: Element): Rect | null => {
  const xAttr = element.getAttribute("x");
  const yAttr = element.getAttribute("y");
  const widthAttr = element.getAttribute("width");
  const heightAttr = element.getAttribute("height");

  if (xAttr === null || yAttr === null) return null;

  const x = Number.parseFloat(xAttr);
  const y = Number.parseFloat(yAttr);
  const width = widthAttr ? Number.parseFloat(widthAttr) : 0;
  const height = heightAttr ? Number.parseFloat(heightAttr) : 0;

  if ([x, y, width, height].some((value) => Number.isNaN(value))) return null;

  return {
    x: toFixed(x),
    y: toFixed(y),
    width: toFixed(width),
    height: toFixed(height),
  };
};

export const getForeignObjects = (svg: SVGSVGElement): Element[] => {
  const doc = svg.ownerDocument;
  const elements = new Set<Element>();

  svg
    .querySelectorAll(
      "foreignObject, svg\\:foreignObject, foreignobject, svg\\:foreignobject",
    )
    .forEach((el) => elements.add(el));

  Array.from(svg.getElementsByTagName("foreignObject")).forEach((el) =>
    elements.add(el),
  );
  Array.from(svg.getElementsByTagName("foreignobject")).forEach((el) =>
    elements.add(el),
  );

  try {
    Array.from(
      svg.getElementsByTagNameNS("http://www.w3.org/2000/svg", "foreignObject"),
    ).forEach((el) => elements.add(el as Element));
  } catch {
    // no-op
  }

  if (doc) {
    Array.from(doc.getElementsByTagName("foreignObject")).forEach((el) =>
      elements.add(el),
    );
    Array.from(doc.getElementsByTagName("foreignobject")).forEach((el) =>
      elements.add(el),
    );
  }

  return Array.from(elements);
};

export const getImages = (svg: SVGSVGElement): Element[] => {
  const elements = new Set<Element>();

  svg.querySelectorAll("image, svg\\:image").forEach((el) => elements.add(el));

  Array.from(svg.getElementsByTagName("image")).forEach((el) =>
    elements.add(el),
  );

  try {
    Array.from(
      svg.getElementsByTagNameNS("http://www.w3.org/2000/svg", "image"),
    ).forEach((el) => elements.add(el as Element));
  } catch {
    // no-op
  }

  return Array.from(elements);
};

export const extractPlaceholderFromElement = (element: Element) => {
  const text = element.textContent ?? "";
  const textMatches = extractPlaceholdersFromString(text);
  if (textMatches.length > 0) return textMatches[0];
  const href =
    element.getAttribute("href") ?? element.getAttribute("xlink:href") ?? "";
  const hrefMatches = extractPlaceholdersFromString(href);
  return hrefMatches.length > 0 ? hrefMatches[0] : null;
};

export const findElementWithPlaceholderToken = (
  root: Element,
  name: string,
): Element | null => {
  const tokenRegex = createPlaceholderRegex(name);
  const walker = root.ownerDocument?.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
  );
  if (!walker) return null;
  let fallback: Element | null = null;
  let current = walker.currentNode as Element | null;
  while (current) {
    const text = current.textContent ?? "";
    if (tokenRegex.test(text)) {
      if (current.getAttribute("class")) return current;
      if (!fallback) fallback = current;
    }
    current = walker.nextNode() as Element | null;
  }
  return fallback;
};

export const findDirectPlaceholderElement = (
  root: Element,
  name: string,
): Element | null => {
  const tokenRegex = createPlaceholderRegex(name);
  const walker = root.ownerDocument?.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
  );
  if (!walker) return null;
  let current = walker.currentNode as Element | null;
  while (current) {
    const attrMatch = Array.from(current.attributes).some((attr) =>
      tokenRegex.test(attr.value),
    );
    const directTextMatch = Array.from(current.childNodes).some(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        tokenRegex.test(node.nodeValue ?? ""),
    );
    if (attrMatch || directTextMatch) {
      return current;
    }
    current = walker.nextNode() as Element | null;
  }
  return null;
};

export const findPlaceholderElements = (
  svg: SVGSVGElement,
  name: string,
): Element[] => {
  const match = createPlaceholderRegex(name);
  const textMatches = getForeignObjects(svg).filter((el) =>
    match.test(el.textContent ?? ""),
  );
  const imageMatches = getImages(svg).filter((el) => {
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href") ?? "";
    return match.test(href);
  });
  return [...textMatches, ...imageMatches];
};

export const findPlaceholderTarget = (
  svg: SVGSVGElement,
  name: string,
  index: number,
): Element | null => {
  const candidates = findPlaceholderElements(svg, name);
  const target = candidates[index] ?? candidates[0] ?? null;
  if (!target) return null;
  if (target.tagName.toLowerCase() === "image") return target;
  const targetWithToken = findElementWithPlaceholderToken(target, name);
  return targetWithToken ?? target;
};

export const extractPlaceholderSnippet = (element: Element) => {
  const group = element.closest("g");
  if (group) {
    return { snippet: serializeElement(group), type: "group" as const };
  }
  if (element.tagName.toLowerCase() === "image") {
    return { snippet: serializeElement(element), type: "image" as const };
  }
  return { snippet: serializeElement(element), type: "foreignObject" as const };
};

export const getPlaceholderSnippet = (
  content: string,
  name: string,
  index: number,
) => {
  if (!content.trim()) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;
  const candidates = findPlaceholderElements(svg, name);
  const target = candidates[index] ?? candidates[0] ?? null;
  if (!target) return null;
  const group = target.closest("g");
  const root = group ?? target;
  const snippetType = group
    ? ("group" as const)
    : target.tagName.toLowerCase() === "image"
      ? ("image" as const)
      : ("foreignObject" as const);
  return { snippet: serializeElement(root), snippetType };
};

export const getUniqueId = (baseId: string, existingIds: string[]) => {
  if (!existingIds.includes(baseId)) return baseId;
  let index = 2;
  while (existingIds.includes(`${baseId}_${index}`)) {
    index += 1;
  }
  return `${baseId}_${index}`;
};

export const updateDuplicateIds = (
  root: Element,
  baseId: string,
  uniqueId: string,
) => {
  if (baseId === uniqueId) return;
  const ids = root.querySelectorAll("[id]");
  ids.forEach((node) => {
    const id = node.getAttribute("id");
    if (!id) return;
    if (id === baseId) {
      node.setAttribute("id", uniqueId);
      return;
    }
    if (id === `${baseId}_IMAGE`) {
      node.setAttribute("id", `${uniqueId}_IMAGE`);
    }
  });
};

export const applyFontSizeToDirectElement = (
  svg: SVGSVGElement,
  name: string,
  index: number,
  fontSize: string,
) => {
  const target = findPlaceholderTarget(svg, name, index);
  if (!target) return;
  const direct =
    findDirectPlaceholderElement(target, name) ??
    findElementWithPlaceholderToken(target, name) ??
    target;
  const existingStyle = direct.getAttribute("style") ?? "";
  direct.setAttribute("style", updateInlineFontSize(existingStyle, fontSize));
  if (direct !== target) {
    const targetStyle = target.getAttribute("style") ?? "";
    if (targetStyle.toLowerCase().includes("font-size")) {
      const next = targetStyle
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .filter((entry) => !entry.toLowerCase().startsWith("font-size:"));
      if (next.length === 0) {
        target.removeAttribute("style");
      } else {
        target.setAttribute("style", `${next.join("; ")};`);
      }
    }
  }
};
