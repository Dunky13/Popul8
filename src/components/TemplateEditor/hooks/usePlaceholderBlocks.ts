import { useMemo } from "react";
import type { PlaceholderBlock } from "../types";
import { extractPlaceholdersFromString } from "../../../utils/regexUtils";
import {
  extractPlaceholderFromElement,
  extractPlaceholderSnippet,
  getElementRect,
  getForeignObjects,
  getImages,
  serializeElement,
} from "../placeholderUtils";

export const usePlaceholderBlocks = (content: string | null) =>
  useMemo(() => {
    if (!content) return [] as PlaceholderBlock[];
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return [];

    const blocks: PlaceholderBlock[] = [];
    const counts: Record<string, number> = {};
    const positionEpsilon = 0.5;
    const sortByPosition = (a: PlaceholderBlock, b: PlaceholderBlock) => {
      const yDiff = a.rect.y - b.rect.y;
      if (Math.abs(yDiff) > positionEpsilon) return yDiff;
      const xDiff = a.rect.x - b.rect.x;
      if (Math.abs(xDiff) > positionEpsilon) return xDiff;
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.index - b.index;
    };

    const groupElements = Array.from(svg.querySelectorAll("g"));
    groupElements.forEach((group) => {
      const snippet = serializeElement(group);
      const placeholders = extractPlaceholdersFromString(snippet);
      if (placeholders.length === 0) return;

      const candidates: Element[] = [
        group,
        ...Array.from(group.querySelectorAll("*")),
      ];
      const rectElement = candidates.find((element) => getElementRect(element));
      if (!rectElement) return;
      const rect = getElementRect(rectElement);
      if (!rect) return;

      placeholders.forEach((name) => {
        const index = counts[name] ?? 0;
        counts[name] = index + 1;
        blocks.push({
          id: `${name}__${index}`,
          name,
          index,
          rect,
          elementTag: "g",
          snippet,
          snippetType: "group",
        });
      });
    });

    if (blocks.length === 0) {
      const textElements = getForeignObjects(svg);
      const imageElements = getImages(svg);

      [...textElements, ...imageElements].forEach((element) => {
        const name = extractPlaceholderFromElement(element);
        if (!name) return;
        const rect = getElementRect(element);
        if (!rect) return;

        const index = counts[name] ?? 0;
        counts[name] = index + 1;

        const snippetInfo = extractPlaceholderSnippet(element);
        blocks.push({
          id: `${name}__${index}`,
          name,
          index,
          rect,
          elementTag: element.tagName.toLowerCase(),
          snippet: snippetInfo.snippet,
          snippetType: snippetInfo.type,
        });
      });
    }

    return blocks.sort(sortByPosition);
  }, [content]);
