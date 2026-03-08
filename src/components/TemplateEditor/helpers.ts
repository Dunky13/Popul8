import type { SvgInfo } from "./types";
import { matchSvgOpenTag, matchTagNameFromOpenTag } from "../../utils/regexUtils";
import type { EditorView } from "@codemirror/view";
import { foldEffect } from "@codemirror/language";
import { foldService } from "@codemirror/language";
import { isNumericString } from "../../utils/regexUtils";

let prettierHtmlLoader:
  | Promise<{
      format: (typeof import("prettier/standalone"))["format"];
      htmlPlugin: typeof import("prettier/plugins/html");
    }>
  | null = null;

const loadPrettierHtml = async () => {
  if (!prettierHtmlLoader) {
    prettierHtmlLoader = Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/html"),
    ]).then(([prettierModule, htmlPluginModule]) => ({
      format: prettierModule.format,
      htmlPlugin: htmlPluginModule,
    }));
  }
  return prettierHtmlLoader;
};

export const parseSvgDocument = (content: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;
  return { doc, svg };
};

export const cloneParsedSvgDocument = (parsed: {
  svg: Element;
  doc: XMLDocument;
}) => {
  const namespace = parsed.svg.namespaceURI ?? "http://www.w3.org/2000/svg";
  const doc = parsed.doc.implementation.createDocument(namespace, "svg", null);
  const imported = doc.importNode(parsed.svg, true);
  doc.replaceChild(imported, doc.documentElement);
  return { doc, svg: imported as SVGSVGElement };
};

export const buildSvgInfoFromSvg = (svg: Element): SvgInfo | null => {
  const viewBox = svg.getAttribute("viewBox");
  const widthAttr = svg.getAttribute("width");
  const heightAttr = svg.getAttribute("height");

  const width = widthAttr ? Number.parseFloat(widthAttr) : undefined;
  const height = heightAttr ? Number.parseFloat(heightAttr) : undefined;

  let normalizedViewBox = viewBox;
  if (!normalizedViewBox && width && height) {
    normalizedViewBox = `0 0 ${width} ${height}`;
  }

  if (!normalizedViewBox) return null;

  return {
    svgMarkup: svg.outerHTML,
    viewBox: normalizedViewBox,
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
  };
};

export const parseSvgInfo = (content: string): SvgInfo | null => {
  const parsed = parseSvgDocument(content);
  if (!parsed) return null;
  return buildSvgInfoFromSvg(parsed.svg);
};

export const normalizeFontSize = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isNumericString(trimmed)) {
    return `${trimmed}px`;
  }
  return trimmed;
};

export const foldLargeBlocks = (view: EditorView, minLines = 25) => {
  const doc = view.state.doc;
  const fullText = doc.toString();
  const rootMatch = matchSvgOpenTag(fullText);
  let rootOpenTag: string | null = null;
  let rootTagName = "svg";
  if (rootMatch?.[0]) {
    rootOpenTag = rootMatch[0];
    const tagNameMatch = matchTagNameFromOpenTag(rootOpenTag);
    if (tagNameMatch?.[1]) {
      rootTagName = tagNameMatch[1];
    }
  }
  const foldServices = view.state.facet(foldService);
  if (!foldServices.length) return;
  const effects: { from: number; to: number }[] = [];

  for (let pos = 0; pos <= view.state.doc.length; ) {
    const line = view.state.doc.lineAt(pos);
    let range = null as { from: number; to: number } | null;
    for (const service of foldServices) {
      range = service(view.state, line.from, line.to);
      if (range) break;
    }
    if (range) {
      const toLine = view.state.doc.lineAt(range.to);
      const lineCount = toLine.number - line.number + 1;
      if (lineCount >= minLines) {
        const snippet = doc.sliceString(line.from, range.to);
        const isRoot =
          (rootOpenTag && snippet.startsWith(rootOpenTag)) ||
          snippet.startsWith(`<${rootTagName}`) ||
          snippet.startsWith(`<${rootTagName}:`);
        if (!isRoot) {
          effects.push(range);
          pos = range.to + 1;
        } else {
          pos = line.to + 1;
        }
      } else {
        pos = range.to + 1;
      }
    } else {
      pos = line.to + 1;
    }
  }

  if (effects.length === 0) return;
  view.dispatch({
    effects: effects.map((range) => foldEffect.of(range)),
  });
};

export const formatSvg = async (input: string) => {
  if (!input.trim()) return input;
  try {
    const { format, htmlPlugin } = await loadPrettierHtml();
    return await format(input, {
      parser: "html",
      plugins: [htmlPlugin],
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
      htmlWhitespaceSensitivity: "css",
    });
  } catch (error) {
    console.warn("Prettier SVG formatting failed.", error);
    return input;
  }
};
