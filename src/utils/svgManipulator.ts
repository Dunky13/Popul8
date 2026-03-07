/**
 * SVG template parsing and manipulation utilities
 */

import type {
  SVGTemplate,
  DataMapping,
  ProcessedSheet,
} from "../types/template";
import type { DataRecord } from "../types/dataRecord";
import { generateMappedRecord } from "./fuzzyMatcher";
import { getUnmappedRequiredPlaceholders } from "./requiredFields";
import type { TextResizeRules } from "../types/textResize";
import { getFieldOverride, getOverrideForKeys } from "./textResize";
import {
  extractElementIds as extractTemplateElementIds,
  extractPlaceholders as extractTemplatePlaceholders,
} from "./svgTemplateParsing";

const isDevelopmentRuntime = () => {
  const nodeEnv = (
    globalThis as { process?: { env?: { NODE_ENV?: string } } }
  ).process?.env?.NODE_ENV;
  return nodeEnv ? nodeEnv !== "production" : false;
};

/**
 * Find malformed placeholder patterns in SVG content
 * Looks for incomplete or broken placeholder syntax, ignoring CSS and JavaScript content
 */
export const findMalformedPlaceholders = (svgContent: string): string[] => {
  const malformed: string[] = [];
  let i = 0;

  while (i < svgContent.length) {
    // Skip content within <style> tags (case insensitive)
    if (svgContent.substring(i, i + 6).toLowerCase() === "<style") {
      const styleEnd = svgContent.toLowerCase().indexOf("</style>", i);
      if (styleEnd === -1) break;
      i = styleEnd + 8;
      continue;
    }

    // Skip content within <script> tags (case insensitive)
    if (svgContent.substring(i, i + 7).toLowerCase() === "<script") {
      const scriptEnd = svgContent.toLowerCase().indexOf("</script>", i);
      if (scriptEnd === -1) break;
      i = scriptEnd + 9;
      continue;
    }

    if (svgContent[i] === "{") {
      // Check if it's a single { (not {{)
      if (i + 1 >= svgContent.length || svgContent[i + 1] !== "{") {
        malformed.push("{");
        i++;
      } else {
        // We have {{, now look for the matching }}
        const startIndex = i;
        let endIndex = i + 2;
        let foundClosing = false;

        while (endIndex < svgContent.length - 1) {
          if (
            svgContent[endIndex] === "}" &&
            svgContent[endIndex + 1] === "}"
          ) {
            foundClosing = true;
            i = endIndex + 2;
            break;
          }
          endIndex++;
        }

        if (!foundClosing) {
          malformed.push(svgContent.slice(startIndex));
          i = svgContent.length;
        }
      }
    } else if (svgContent[i] === "}") {
      // Check if it's a single } (not }})
      if (i === 0 || svgContent[i - 1] !== "}") {
        malformed.push("}");
        i++;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return malformed;
};

/**
 * Extract placeholders from SVG content without regex
 * Placeholders are in format {{key}}
 */
export const extractPlaceholders = (svgContent: string): string[] => {
  return extractTemplatePlaceholders(svgContent);
};

/**
 * Extract element IDs from SVG content
 */
export const extractElementIds = (svgContent: string): string[] => {
  return extractTemplateElementIds(svgContent);
};

/**
 * Parse SVG template file content
 */
export const parseSVGTemplate = (
  content: string,
  fileName?: string
): SVGTemplate => {
  const placeholders = extractPlaceholders(content);
  const elementIds = extractElementIds(content);

  return {
    content,
    placeholders,
    elementIds,
    fileName,
  };
};

/**
 * Read SVG file and parse it
 */
export const readSVGFile = (file: File): Promise<SVGTemplate> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const template = parseSVGTemplate(content, file.name);
        resolve(template);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse SVG file: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read SVG file"));
    };

    reader.readAsText(file);
  });
};

/**
 * Apply text fitting transformations to already-rendered SVG elements
 * This should be called after the SVG is in the DOM for accurate measurements
 */
export const applyTextFittingToRenderedSVG = (container: Element, retryCount = 0): void => {
  if (!container || !container.isConnected) return;
  const isDebug = isDevelopmentRuntime();

  const textElements = container.querySelectorAll("text");
  if (isDebug) {
    console.debug(
      `Found ${textElements.length} text elements for post-render fitting (retry ${retryCount})`
    );
  }

  let hasTransforms = false;

  textElements.forEach((textElement, index) => {
    // Skip if already transformed
    if (textElement.classList.contains("textTransformed")) {
      if (isDebug) {
        console.debug(`Text element ${index}: Already transformed, skipping`);
      }
      return;
    }

    // Check if text element has a width attribute
    const widthAttr = textElement.getAttribute("width");
    if (!widthAttr) return;

    const targetWidth = parseFloat(widthAttr);
    if (isNaN(targetWidth) || targetWidth <= 0) return;

    // Get text content
    const textContent = textElement.textContent?.trim();
    if (!textContent) return;

    // Get actual rendered width
    let actualWidth = 0;
    try {
      const bbox = (textElement as SVGTextElement).getBBox();
      actualWidth = bbox.width;
    } catch (error) {
      if (isDebug) {
        console.debug(`Could not get BBox for element ${index}:`, error);
      }
      return;
    }

    if (isDebug) {
      console.debug(
        `Text fitting for element ${index}: "${textContent}" - Actual width: ${actualWidth}, Target width: ${targetWidth}`
      );
    }

    if (actualWidth === 0 || actualWidth <= targetWidth) return;

    // Calculate scale factor (only scale down, never up)
    const scale = targetWidth / actualWidth;
    if (isDebug) {
      console.debug(`Text element ${index}: Applying scale factor ${scale}`);
    }

    // Apply transform
    const existingTransform = textElement.getAttribute("transform") || "";
    const scaleTransform = `scale(${scale}, 1)`;

    if (existingTransform) {
      textElement.setAttribute(
        "transform",
        `${existingTransform} ${scaleTransform}`
      );
    } else {
      textElement.setAttribute("transform", scaleTransform);
    }

    // Mark as transformed
    textElement.classList.add("textTransformed");
    hasTransforms = true;

    if (isDebug) {
      console.debug(
        `Text element ${index}: Applied transform:`,
        textElement.getAttribute("transform")
      );
    }
  });

  // Force re-render if transforms were applied
  if (hasTransforms) {
    forceSVGReRender(container);
  } else if (retryCount < 3 && textElements.length > 0) {
    // If no transforms were applied but we have text elements, retry after a delay
    if (isDebug) {
      console.debug("No transforms applied, retrying...");
    }
    setTimeout(() => {
      if (!container.isConnected) return;
      applyTextFittingToRenderedSVG(container, retryCount + 1);
    }, 100 * (retryCount + 1));
  }
};

/**
 * Force SVG re-render after transformations
 */
const forceSVGReRender = (container: Element): void => {
  const svg = container.querySelector("svg");
  if (!svg || !svg.isConnected) return;

  // Trigger a re-render by temporarily modifying a property
  const currentOpacity = svg.getAttribute("opacity") || "1";
  svg.setAttribute("opacity", "0.99");
  
  // Use setTimeout to restore opacity in the next frame
  setTimeout(() => {
    if (!svg.isConnected) return;
    svg.setAttribute("opacity", currentOpacity);
  }, 0);
};

/**
 * Replace placeholders in SVG content with record data.
 */
export const replacePlaceholders = (
  svgContent: string,
  recordData: Record<string, string>,
  mapping: DataMapping,
  templatePlaceholders: string[]
): string => {
  const placeholderValues = new Map<string, string>();
  templatePlaceholders.forEach((templateKey) => {
    const csvColumn = mapping[templateKey];
    const hasTemplateValue = Object.prototype.hasOwnProperty.call(
      recordData,
      templateKey,
    );
    const hasCsvColumnValue =
      Boolean(csvColumn) &&
      Object.prototype.hasOwnProperty.call(recordData, csvColumn);
    const value = hasTemplateValue
      ? recordData[templateKey]
      : hasCsvColumnValue && csvColumn
        ? recordData[csvColumn]
        : "";
    placeholderValues.set(templateKey, value);
  });

  Object.entries(mapping).forEach(([templateKey, csvColumn]) => {
    const hasTemplateValue = Object.prototype.hasOwnProperty.call(
      recordData,
      templateKey,
    );
    const hasCsvColumnValue = Object.prototype.hasOwnProperty.call(
      recordData,
      csvColumn,
    );
    const value = hasTemplateValue
      ? recordData[templateKey]
      : hasCsvColumnValue
        ? recordData[csvColumn]
        : "";
    placeholderValues.set(templateKey, value);
  });

  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgElement = doc.querySelector("svg");
    if (!svgElement) throw new Error("No SVG root found");

    // Replace placeholders in attributes (e.g. href)
    const elements = svgElement.querySelectorAll("*");
    elements.forEach((element) => {
      Array.from(element.attributes).forEach((attr) => {
        if (!attr.value.includes("{{")) return;
        let nextValue = attr.value;
        placeholderValues.forEach((replacement, key) => {
          const pattern = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g");
          if (pattern.test(nextValue)) {
            nextValue = nextValue.replace(pattern, replacement);
          }
        });
        if (nextValue !== attr.value) {
          element.setAttribute(attr.name, nextValue);
        }
      });
    });

    // Replace placeholders in text nodes and tag their containers
    const walker = doc.createTreeWalker(svgElement, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.includes("{{")) continue;
      let nextValue = node.nodeValue;
      const matchedKeys: string[] = [];
      placeholderValues.forEach((replacement, key) => {
        const pattern = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g");
        if (pattern.test(nextValue)) {
          nextValue = nextValue.replace(pattern, replacement);
          matchedKeys.push(key);
        }
      });
      if (nextValue !== node.nodeValue) {
        node.nodeValue = nextValue;
        const parent = node.parentElement;
        if (parent) {
          if (matchedKeys.length === 1) {
            parent.setAttribute("data-template-key", matchedKeys[0]);
          } else if (matchedKeys.length > 1) {
            parent.setAttribute("data-template-keys", matchedKeys.join(","));
          }
        }
      }
    }

    // Add print optimization without overriding existing fills
    if (!svgElement.hasAttribute("shape-rendering")) {
      svgElement.setAttribute("shape-rendering", "crispEdges");
    }
    if (!svgElement.hasAttribute("text-rendering")) {
      svgElement.setAttribute("text-rendering", "optimizeLegibility");
    }

    return new XMLSerializer().serializeToString(doc);
  } catch (error) {
    if (isDevelopmentRuntime()) {
      console.warn("SVG placeholder processing fallback:", error);
    }
  }

  let processedContent = svgContent;
  placeholderValues.forEach((value, templateKey) => {
    processedContent = processedContent.replaceAll(`{{${templateKey}}}`, value);
  });

  processedContent = processedContent.replace(
    /<svg([^>]*)>/,
    (_, attributes) => {
      const hasShapeRendering = attributes.includes("shape-rendering");
      const hasTextRendering = attributes.includes("text-rendering");

      let newAttributes = attributes;
      if (!hasShapeRendering) newAttributes += ' shape-rendering="crispEdges"';
      if (!hasTextRendering)
        newAttributes += ' text-rendering="optimizeLegibility"';

      return `<svg${newAttributes}>`;
    }
  );

  return processedContent;
};

/**
 * Apply per-field text resize overrides to rendered SVG elements.
 */
export const applyFontSizeOverridesToRenderedSVG = (
  container: Element,
  cardId: string,
  rules: TextResizeRules
): void => {
  if (!container) return;

  const resizeTargets = container.querySelectorAll(
    "[data-template-key], [data-template-keys]"
  );

  resizeTargets.forEach((node) => {
    const element = node as HTMLElement;
    const singleKey = element.getAttribute("data-template-key");
    const multiKeys = element.getAttribute("data-template-keys");
    const originalAttr = "data-font-resize-original";
    const appliedAttr = "data-font-resize";

    let overrideInfo:
      | { override: { value: number; unit: "px" | "percent" }; isExplicit: boolean }
      | null = null;
    if (singleKey) {
      overrideInfo = getFieldOverride(rules, cardId, singleKey);
    } else if (multiKeys) {
      const keys = multiKeys
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean);
      overrideInfo = getOverrideForKeys(rules, cardId, keys);
    }

    if (!overrideInfo) return;

    if (overrideInfo.isExplicit) {
      if (!element.hasAttribute(originalAttr)) {
        element.setAttribute(originalAttr, element.style.fontSize || "");
      }
      element.style.fontSize =
        overrideInfo.override.unit === "px"
          ? `${overrideInfo.override.value}px`
          : `${overrideInfo.override.value}%`;
      element.setAttribute(appliedAttr, "true");
    } else if (element.getAttribute(appliedAttr) === "true") {
      const original = element.getAttribute(originalAttr) || "";
      if (original) {
        element.style.fontSize = original;
      } else {
        element.style.removeProperty("font-size");
      }
      element.removeAttribute(appliedAttr);
      element.removeAttribute(originalAttr);
    }
  });
};

/**
 * Create a processed SVG output page.
 */
export const createProcessedSheet = (
  template: SVGTemplate,
  record: DataRecord,
  mapping: DataMapping,
  index: number
): ProcessedSheet => {
  const errors: string[] = [];

  // Check for unmapped placeholders
  const unmappedRequiredPlaceholders = getUnmappedRequiredPlaceholders({
    placeholders: template.placeholders,
    dataMapping: mapping,
  });
  if (unmappedRequiredPlaceholders.length > 0) {
    errors.push(
      `Unmapped placeholders: ${unmappedRequiredPlaceholders.join(", ")}`,
    );
  }

  // Generate mapped record values for all template placeholders.
  const mappedRecord = generateMappedRecord(record, mapping);

  // Empty values are now allowed - no missing data validation needed

  const svgContent = replacePlaceholders(
    template.content,
    mappedRecord,
    mapping,
    template.placeholders,
  );

  return {
    id: `sheet-${index}`,
    svgContent,
    record,
    errors: errors.length > 0 ? errors : undefined,
  };
};

/**
 * Validate SVG template
 */
export const validateSVGTemplate = (template: SVGTemplate): string[] => {
  const errors: string[] = [];

  // Check if content is valid SVG
  if (!template.content.includes("<svg")) {
    errors.push("File does not contain valid SVG content");
  }

  // Check if template has placeholders
  if (template.placeholders.length === 0) {
    errors.push("Warning: Template contains no {{placeholder}} elements");
  }

  // Warn when SVG lacks a viewBox (scaling/layout can break)
  const hasViewBox = /<svg[^>]*\bviewBox\s*=\s*["'][^"']+["']/i.test(
    template.content
  );
  if (!hasViewBox) {
    errors.push("Warning: SVG lacks a viewBox; scaling may be inconsistent");
  }

  // Check for placeholder syntax errors using non-regex approach
  const malformedPlaceholders = findMalformedPlaceholders(template.content);
  if (malformedPlaceholders.length > 0) {
    errors.push(
      `Malformed placeholders found: ${malformedPlaceholders.join(", ")}`
    );
  }

  return errors;
};
