import { replacePlaceholderTokens } from "../../utils/regexUtils";
import type { Rect } from "./types";
import {
  findDirectPlaceholderElement,
  findElementWithPlaceholderToken,
  findPlaceholderElements,
  findPlaceholderTarget,
  serializeElement,
  updateDuplicateIds,
  updateInlineFontSize,
} from "./placeholderUtils";

export const updatePlaceholder = ({
  content,
  prevName,
  nextName,
  rect,
  placeholderIndex,
  shouldUpdateId,
  uniqueId,
  fontSize,
}: {
  content: string;
  prevName: string;
  nextName: string;
  rect: Rect;
  placeholderIndex: number;
  shouldUpdateId: boolean;
  uniqueId: string;
  fontSize?: string;
}) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;

  const candidates = findPlaceholderElements(svg, prevName);
  const target = candidates[placeholderIndex] ?? candidates[0] ?? null;
  if (!target) return null;

  let group = svg.querySelector(`[id="${prevName}"]`);
  if (!group) {
    const parentGroup = target.closest("g");
    if (parentGroup) group = parentGroup;
  }

  const applyRectTo = (node: Element) => {
    node.setAttribute("x", String(rect.x));
    node.setAttribute("y", String(rect.y));
    if (
      node.getAttribute("width") !== null ||
      node.tagName.toLowerCase() === "foreignobject"
    ) {
      node.setAttribute("width", String(rect.width));
    }
    if (
      node.getAttribute("height") !== null ||
      node.tagName.toLowerCase() === "foreignobject"
    ) {
      node.setAttribute("height", String(rect.height));
    }
  };

  applyRectTo(target);

  const updateTokens = (node: Element) => {
    Array.from(node.attributes).forEach((attr) => {
      const nextValue = replacePlaceholderTokens(attr.value, prevName, nextName);
      if (nextValue !== attr.value) {
        node.setAttribute(attr.name, nextValue);
      }
    });

    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && child.nodeValue) {
        child.nodeValue = replacePlaceholderTokens(
          child.nodeValue,
          prevName,
          nextName,
        );
        return;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        updateTokens(child as Element);
      }
    });
  };

  const targetRoot = group ?? target;
  if (shouldUpdateId) {
    updateDuplicateIds(targetRoot, prevName, uniqueId);
    updateDuplicateIds(targetRoot, nextName, uniqueId);
  }
  updateTokens(targetRoot);
  if (fontSize) {
    const textTarget =
      findDirectPlaceholderElement(target, nextName) ??
      findElementWithPlaceholderToken(target, nextName) ??
      target;
    const existingStyle = textTarget.getAttribute("style") ?? "";
    textTarget.setAttribute(
      "style",
      updateInlineFontSize(existingStyle, fontSize),
    );
  }

  const snippetType = group
    ? ("group" as const)
    : target.tagName.toLowerCase() === "image"
      ? ("image" as const)
      : ("foreignObject" as const);
  const snippet = serializeElement(targetRoot);

  return {
    content: new XMLSerializer().serializeToString(svg),
    snippet,
    snippetType,
  };
};

export const updateSnippetForInputs = ({
  snippet,
  prevName,
  nextName,
  rect,
  fontSize,
}: {
  snippet: string;
  prevName: string;
  nextName: string;
  rect: Rect;
  fontSize?: string;
}) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${snippet}</svg>`,
    "image/svg+xml",
  );
  const svg = doc.querySelector("svg");
  if (!svg) return snippet;
  const target =
    findPlaceholderTarget(svg, prevName, 0) ??
    findPlaceholderTarget(svg, nextName, 0);
  let changed = false;
  const updateTokens = (node: Element) => {
    Array.from(node.attributes).forEach((attr) => {
      const nextValue = replacePlaceholderTokens(attr.value, prevName, nextName);
      if (nextValue !== attr.value) {
        node.setAttribute(attr.name, nextValue);
        changed = true;
      }
    });
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && child.nodeValue) {
        const nextValue = replacePlaceholderTokens(
          child.nodeValue,
          prevName,
          nextName,
        );
        if (nextValue !== child.nodeValue) {
          child.nodeValue = nextValue;
          changed = true;
        }
        return;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        updateTokens(child as Element);
      }
    });
  };

  Array.from(svg.children).forEach((child) => updateTokens(child));

  const applyRectTo = (node: Element) => {
    if (node.getAttribute("x") !== null) {
      const nextValue = String(rect.x);
      if (node.getAttribute("x") !== nextValue) {
        node.setAttribute("x", String(rect.x));
        changed = true;
      }
    }
    if (node.getAttribute("y") !== null) {
      const nextValue = String(rect.y);
      if (node.getAttribute("y") !== nextValue) {
        node.setAttribute("y", String(rect.y));
        changed = true;
      }
    }
    if (
      node.getAttribute("width") !== null ||
      node.tagName.toLowerCase() === "foreignobject"
    ) {
      const nextValue = String(rect.width);
      if (node.getAttribute("width") !== nextValue) {
        node.setAttribute("width", nextValue);
        changed = true;
      }
    }
    if (
      node.getAttribute("height") !== null ||
      node.tagName.toLowerCase() === "foreignobject"
    ) {
      const nextValue = String(rect.height);
      if (node.getAttribute("height") !== nextValue) {
        node.setAttribute("height", nextValue);
        changed = true;
      }
    }
  };

  if (target) {
    applyRectTo(target);
    if (fontSize) {
      const textTarget =
        findDirectPlaceholderElement(target, prevName) ??
        findDirectPlaceholderElement(target, nextName) ??
        findElementWithPlaceholderToken(target, prevName) ??
        findElementWithPlaceholderToken(target, nextName) ??
        target;
      const existingStyle = textTarget.getAttribute("style") ?? "";
      const nextStyle = updateInlineFontSize(existingStyle, fontSize);
      if (nextStyle !== existingStyle) {
        textTarget.setAttribute("style", nextStyle);
        changed = true;
      }
    }
  }

  const updated = svg.firstElementChild;
  if (!updated || !changed) return snippet;
  return new XMLSerializer().serializeToString(updated);
};

export const applySelectedMarkupToContent = ({
  content,
  targetName,
  targetIndex,
  rect,
  code,
  codeType,
  fontSize,
}: {
  content: string;
  targetName: string;
  targetIndex: number;
  rect: Rect;
  code: string;
  codeType: "group" | "foreignObject" | "image" | null;
  fontSize?: string;
}) => {
  if (!code.trim()) {
    return { content };
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) {
    return { content, error: "Unable to read SVG content." };
  }

  const wrapper = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${code}</svg>`,
    "image/svg+xml",
  );
  const replacement = wrapper.querySelector("svg")?.firstElementChild;
  if (!replacement) {
    return { content, error: "Selected block markup is not valid SVG." };
  }

  const candidates = findPlaceholderElements(svg, targetName);
  const target = candidates[targetIndex] ?? candidates[0] ?? null;
  if (!target) {
    return {
      content,
      error: "Unable to locate the placeholder to replace.",
    };
  }

  let targetNode: Element | null = target;
  if (codeType === "group") {
    targetNode = target.closest("g") ?? target;
  }
  if (!targetNode?.parentNode) {
    return { content, error: "Unable to replace the placeholder block." };
  }

  const applyRectTo = (node: Element) => {
    if (node.getAttribute("x") !== null) {
      node.setAttribute("x", String(rect.x));
    }
    if (node.getAttribute("y") !== null) {
      node.setAttribute("y", String(rect.y));
    }
    if (
      node.getAttribute("width") !== null ||
      node.tagName.toLowerCase() === "foreignobject"
    ) {
      node.setAttribute("width", String(rect.width));
    }
    if (
      node.getAttribute("height") !== null ||
      node.tagName.toLowerCase() === "foreignobject"
    ) {
      node.setAttribute("height", String(rect.height));
    }
  };

  applyRectTo(replacement);

  if (fontSize) {
    const textTarget =
      findDirectPlaceholderElement(replacement, targetName) ??
      findElementWithPlaceholderToken(replacement, targetName) ??
      replacement;
    const existingStyle = textTarget.getAttribute("style") ?? "";
    textTarget.setAttribute(
      "style",
      updateInlineFontSize(existingStyle, fontSize),
    );
  }

  targetNode.parentNode.replaceChild(
    doc.importNode(replacement, true),
    targetNode,
  );

  return { content: new XMLSerializer().serializeToString(svg) };
};
