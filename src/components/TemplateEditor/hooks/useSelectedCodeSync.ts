import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  extractPlaceholdersFromString,
  matchFontSizeLoose,
  normalizePlaceholderName,
} from "../../../utils/regexUtils";
import type { PlaceholderBlock, Rect } from "../types";
import {
  findDirectPlaceholderElement,
  findPlaceholderTarget,
  getElementRect,
} from "../placeholderUtils";
import { updateSnippetForInputs } from "../placeholderActions";
import { normalizeFontSize } from "../helpers";

type UseSelectedCodeSyncArgs = {
  selectedCode: string | null;
  setSelectedCode: (value: string | null) => void;
  selectedPlaceholder: PlaceholderBlock | null;
  selection: Rect | null;
  setSelection: Dispatch<SetStateAction<Rect | null>>;
  placeholderName: string;
  setPlaceholderName: (value: string) => void;
  fontSizeInput: string;
  setFontSizeInput: (value: string) => void;
};

export const useSelectedCodeSync = ({
  selectedCode,
  setSelectedCode,
  selectedPlaceholder,
  selection,
  setSelection,
  placeholderName,
  setPlaceholderName,
  fontSizeInput,
  setFontSizeInput,
}: UseSelectedCodeSyncArgs) => {
  const syncingFromCodeRef = useRef(false);
  const syncingFromInputsRef = useRef(false);
  const inputSyncTimerRef = useRef<number | null>(null);
  const placeholderNameRef = useRef(placeholderName);
  const fontSizeInputRef = useRef(fontSizeInput);

  useEffect(() => {
    placeholderNameRef.current = placeholderName;
  }, [placeholderName]);

  useEffect(() => {
    fontSizeInputRef.current = fontSizeInput;
  }, [fontSizeInput]);

  useEffect(() => {
    if (!selectedCode?.trim()) return;
    if (syncingFromInputsRef.current) {
      syncingFromInputsRef.current = false;
      return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${selectedCode}</svg>`,
      "image/svg+xml",
    );
    const svg = doc.querySelector("svg");
    const snippetRoot = svg?.firstElementChild ?? null;
    if (!snippetRoot) return;

    const serialized = new XMLSerializer().serializeToString(snippetRoot);
    const detectedNames = extractPlaceholdersFromString(serialized);
    const detectedName = detectedNames[0] ?? null;
    const target =
      detectedName !== null
        ? findPlaceholderTarget(svg as SVGSVGElement, detectedName, 0)
        : null;
    const textTarget =
      detectedName !== null
        ? (findDirectPlaceholderElement(snippetRoot, detectedName) ??
          (target ? findDirectPlaceholderElement(target, detectedName) : null))
        : null;

    const rect =
      (target ? getElementRect(target) : null) ??
      getElementRect(snippetRoot) ??
      (() => {
        const candidate = Array.from(snippetRoot.querySelectorAll("*")).find(
          (el) => getElementRect(el),
        );
        return candidate ? getElementRect(candidate) : null;
      })();

    const styleText =
      (textTarget ?? target ?? snippetRoot).getAttribute("style") ?? "";
    const sizeMatch = matchFontSizeLoose(styleText);

    const currentPlaceholderName = placeholderNameRef.current;
    const currentFontSize = fontSizeInputRef.current;
    const nextName =
      detectedName && detectedName !== currentPlaceholderName
        ? detectedName
        : null;
    const nextSize = sizeMatch?.[1]?.trim() ?? null;
    let hasUpdates = false;
    if (nextName) {
      hasUpdates = true;
      setPlaceholderName(nextName);
    }
    if (rect) {
      setSelection((prev) => {
        if (
          prev &&
          prev.x === rect.x &&
          prev.y === rect.y &&
          prev.width === rect.width &&
          prev.height === rect.height
        ) {
          return prev;
        }
        hasUpdates = true;
        return prev ? { ...prev, ...rect } : rect;
      });
    }
    if (nextSize && nextSize !== currentFontSize) {
      hasUpdates = true;
      setFontSizeInput(nextSize);
    }
    if (hasUpdates) {
      syncingFromCodeRef.current = true;
    }
  }, [selectedCode, setFontSizeInput, setPlaceholderName, setSelection]);

  useEffect(() => {
    if (!selectedCode || !selectedPlaceholder || !selection) return;
    if (syncingFromCodeRef.current) {
      syncingFromCodeRef.current = false;
      return;
    }
    if (inputSyncTimerRef.current) {
      window.clearTimeout(inputSyncTimerRef.current);
    }
    inputSyncTimerRef.current = window.setTimeout(() => {
      const normalized = normalizePlaceholderName(placeholderName);
      if (!normalized) return;
      const updated = updateSnippetForInputs({
        snippet: selectedCode,
        prevName: selectedPlaceholder.name,
        nextName: normalized,
        rect: selection,
        fontSize: normalizeFontSize(fontSizeInput),
      });
      if (updated === selectedCode) return;
      syncingFromInputsRef.current = true;
      setSelectedCode(updated);
    }, 200);
    return () => {
      if (inputSyncTimerRef.current) {
        window.clearTimeout(inputSyncTimerRef.current);
      }
    };
  }, [
    fontSizeInput,
    placeholderName,
    selectedCode,
    selectedPlaceholder,
    selection,
    setSelectedCode,
  ]);

  return {
    markSyncFromCode: useCallback(() => {
      syncingFromCodeRef.current = true;
    }, []),
  };
};
