import React, {
  Suspense,
  useCallback,
  useEffect,
  lazy,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildGoogleFontsUrl,
  extractFontUsage,
  extractGoogleFontFamiliesFromContent,
  getMissingFonts,
  inferFontWeightsFromSvg,
  parseFontLinksFromComments,
} from "../../utils/svgFonts";
import {
  applyPlaceholderTemplate,
  createPlaceholderRegex,
  matchFontSize,
  normalizePlaceholderName,
} from "../../utils/regexUtils";
import styles from "./TemplateEditor.module.css";
import type { PlaceholderBlock, Rect } from "./types";
import { PlaceholderPanel } from "./PlaceholderPanel";
import { DetectedPlaceholders } from "./DetectedPlaceholders";
import { formatSvg, normalizeFontSize, parseSvgInfo } from "./helpers";
import { CanvasToolbar } from "./CanvasToolbar";
import { TemplateEditorStage } from "./TemplateEditorStage";
import { usePlaceholderBlocks } from "./hooks/usePlaceholderBlocks";
import { useCanvasSelection } from "./hooks/useCanvasSelection";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useSelectedCodeSync } from "./hooks/useSelectedCodeSync";
import {
  findDirectPlaceholderElement,
  findPlaceholderElements,
  findPlaceholderTarget,
  getPlaceholderSnippet,
  getUniqueId,
  updateDuplicateIds,
  updateInlineFontSize,
} from "./placeholderUtils";
import {
  applySelectedMarkupToContent,
  updatePlaceholder,
} from "./placeholderActions";

const GRID_SIZE = 1;
const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

const DEFAULT_TEXT_TEMPLATE = `<g id="{{name}}">
  <foreignObject x="{{x}}" y="{{y}}" width="{{width}}" height="{{height}}">
    <div class="textBox {{name}}">
      {{placeholder}}
    </div>
  </foreignObject>
</g>`;

const DEFAULT_IMAGE_TEMPLATE = `<g id="{{name}}">
  <image id="{{name}}_IMAGE" class="image" x="{{x}}" y="{{y}}" width="{{width}}" height="{{height}}" href="{{placeholder}}" />
</g>`;

const isTypingContext = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return target.closest(".cm-editor") !== null;
};

const CodeEditorPanel = lazy(() =>
  import("./CodeEditorPanel").then((module) => ({
    default: module.CodeEditorPanel,
  })),
);

const CssEditorPanel = lazy(() =>
  import("./CssEditorPanel").then((module) => ({
    default: module.CssEditorPanel,
  })),
);

const FontSourcesPanel = lazy(() =>
  import("./FontSourcesPanel").then((module) => ({
    default: module.FontSourcesPanel,
  })),
);

type TemplateEditorWorkspaceProps = {
  view: {
    mode: "visual" | "code";
    isAdvanced: boolean;
  };
  content: {
    localContent: string;
    summary: { placeholders: string[]; elementIds: string[] } | null;
    onApplyContent: (updatedContent: string) => void;
  };
};

export const TemplateEditorWorkspace: React.FC<
  TemplateEditorWorkspaceProps
> = ({ view, content }) => {
  const { mode: viewMode, isAdvanced } = view;
  const { localContent, summary: contentSummary, onApplyContent } = content;
  const [activeTool, setActiveTool] = useState<"select" | "text" | "image">(
    "select",
  );
  const [placeholderType, setPlaceholderType] = useState<"text" | "image">(
    "text",
  );
  const [blockTemplate, setBlockTemplate] = useState(DEFAULT_TEXT_TEMPLATE);
  const [selectedPlaceholder, setSelectedPlaceholder] =
    useState<PlaceholderBlock | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedCodeType, setSelectedCodeType] = useState<
    "group" | "foreignObject" | "image" | null
  >(null);
  const [placeholderName, setPlaceholderName] = useState("");
  const [fontSizeInput, setFontSizeInput] = useState("");
  const [previewText, setPreviewText] = useState("Preview text");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const svgPreviewRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<SVGSVGElement | null>(null);

  const svgInfo = useMemo(() => parseSvgInfo(localContent), [localContent]);
  const placeholderBlocks = usePlaceholderBlocks(localContent);
  const debouncedFontSize = useDebouncedValue(fontSizeInput, 250);
  const parsedLocalSvg = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(localContent, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return null;
    return { doc, svg };
  }, [localContent]);

  const parseEditableSvg = useCallback(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(localContent, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return null;
    return { doc, svg };
  }, [localContent]);

  const getFontSizeForPlaceholder = useCallback(
    (block: PlaceholderBlock) => {
      if (!parsedLocalSvg) return "";
      const target = findPlaceholderTarget(
        parsedLocalSvg.svg,
        block.name,
        block.index,
      );
      if (!target) return "";
      const textTarget =
        findDirectPlaceholderElement(target, block.name) ?? target;
      const styleText = textTarget.getAttribute("style") ?? "";
      const sizeMatch = matchFontSize(styleText);
      return sizeMatch?.[1]?.trim() ?? "";
    },
    [parsedLocalSvg],
  );

  const clearSelectionMeta = useCallback(() => {
    setSelectedPlaceholder(null);
    setSelectedCode(null);
    setSelectedCodeType(null);
  }, []);

  const handleSelectPlaceholder = useCallback(
    (block: PlaceholderBlock | null) => {
      if (!block) {
        clearSelectionMeta();
        return;
      }
      setSelectedPlaceholder(block);
      setPlaceholderName(block.name);
      setSelectedCode(block.snippet ?? null);
      setSelectedCodeType(block.snippetType ?? null);
      setFontSizeInput(getFontSizeForPlaceholder(block));
    },
    [clearSelectionMeta, getFontSizeForPlaceholder],
  );

  const clearFeedback = useCallback(() => {
    setNotice(null);
    setError(null);
  }, []);

  const handleSelectionCreated = useCallback(() => {
    if (placeholderName.trim().length > 0) return;

    const baseName = placeholderType === "image" ? "image" : "text";
    const existing = new Set(
      (contentSummary?.placeholders ?? [])
        .map((name) => normalizePlaceholderName(name))
        .filter(Boolean),
    );

    let suffix = 1;
    let candidate = `${baseName}${suffix}`;
    while (existing.has(candidate)) {
      suffix += 1;
      candidate = `${baseName}${suffix}`;
    }

    setPlaceholderName(candidate);
  }, [contentSummary?.placeholders, placeholderName, placeholderType]);

  const {
    selection,
    setSelection,
    selectionRect,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useCanvasSelection({
    svgInfo,
    overlayRef,
    activeTool,
    placeholderBlocks,
    onSelectPlaceholder: handleSelectPlaceholder,
    onClearMessages: clearFeedback,
    onSelectionTooSmall: () => {
      setSelection(null);
      setNotice("Selection too small. Drag a larger area.");
    },
    onSelectionCreated: handleSelectionCreated,
    onClearSelectionMeta: clearSelectionMeta,
  });

  const isEditingExisting = Boolean(selectedPlaceholder);
  const isInsertMode =
    Boolean(selection) && activeTool !== "select" && !selectedPlaceholder;
  const shouldShowPlaceholderPanel = isEditingExisting || isInsertMode;
  const isTextPlaceholder = useMemo(() => {
    if (isEditingExisting) {
      return selectedPlaceholder?.snippetType !== "image";
    }
    return placeholderType === "text";
  }, [isEditingExisting, placeholderType, selectedPlaceholder?.snippetType]);

  const placeholderPanelStatus = useMemo(() => {
    if (isEditingExisting) return "Editing";
    if (isInsertMode) return "Ready";
    if (activeTool === "select") return "Select";
    return "Draw";
  }, [activeTool, isEditingExisting, isInsertMode]);

  const placeholderPanelHint = useMemo(() => {
    if (isEditingExisting) return "Editing selected placeholder";
    if (isInsertMode) return "Insert new placeholder";
    if (activeTool === "select") return "Click a placeholder to edit";
    return "Draw a rectangle to add";
  }, [activeTool, isEditingExisting, isInsertMode]);

  const { markSyncFromCode } = useSelectedCodeSync({
    selectedCode,
    setSelectedCode,
    selectedPlaceholder,
    selection,
    setSelection,
    placeholderName,
    setPlaceholderName,
    fontSizeInput,
    setFontSizeInput,
  });

  const updateSelectionValue = useCallback(
    (key: keyof Rect, value: number) => {
      setSelection((prev) => {
        if (!prev) return prev;
        const nextValue = Number.isFinite(value)
          ? snapToGrid(value)
          : prev[key];
        return { ...prev, [key]: nextValue };
      });
    },
    [setSelection],
  );

  const nudgeSelection = useCallback(
    (delta: Partial<Record<keyof Rect, number>>) => {
      setSelection((prev) => {
        if (!prev) return prev;
        const nextWidth = Math.max(
          1,
          snapToGrid(prev.width + (delta.width ?? 0)),
        );
        const nextHeight = Math.max(
          1,
          snapToGrid(prev.height + (delta.height ?? 0)),
        );
        const nextX = Math.max(0, snapToGrid(prev.x + (delta.x ?? 0)));
        const nextY = Math.max(0, snapToGrid(prev.y + (delta.y ?? 0)));

        return {
          x: Number(nextX.toFixed(2)),
          y: Number(nextY.toFixed(2)),
          width: Number(nextWidth.toFixed(2)),
          height: Number(nextHeight.toFixed(2)),
        };
      });
    },
    [setSelection],
  );

  const applyUpdate = useCallback(
    (updatedContent: string, note: string) => {
      onApplyContent(updatedContent);
      setNotice(note);
      setError(null);
    },
    [onApplyContent],
  );

  const handleSelectTool = useCallback(() => {
    setActiveTool("select");
    setSelection(null);
    clearSelectionMeta();
    setPlaceholderName("");
    clearFeedback();
  }, [clearFeedback, clearSelectionMeta, setSelection]);

  const handleTextTool = useCallback(() => {
    setActiveTool("text");
    setPlaceholderType("text");
    setBlockTemplate(DEFAULT_TEXT_TEMPLATE);
    setSelection(null);
    clearSelectionMeta();
    setPlaceholderName("");
    clearFeedback();
  }, [clearFeedback, clearSelectionMeta, setSelection]);

  const handleImageTool = useCallback(() => {
    setActiveTool("image");
    setPlaceholderType("image");
    setBlockTemplate(DEFAULT_IMAGE_TEMPLATE);
    setSelection(null);
    clearSelectionMeta();
    setPlaceholderName("");
    clearFeedback();
  }, [clearFeedback, clearSelectionMeta, setSelection]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))));
  }, []);

  const handleInsertPlaceholder = useCallback(async () => {
    if (!selection) return;

    const normalized = normalizePlaceholderName(placeholderName);
    if (!normalized) {
      setError("Enter a placeholder name.");
      return;
    }

    const existingIds = contentSummary?.elementIds ?? [];
    const existingPlaceholders = contentSummary?.placeholders ?? [];
    const isDuplicatePlaceholder = existingPlaceholders.includes(normalized);
    const uniqueId = isDuplicatePlaceholder
      ? getUniqueId(normalized, [normalized, ...existingIds])
      : getUniqueId(normalized, existingIds);

    const parsedSvg = parseEditableSvg();
    if (!parsedSvg) {
      setError("Unable to read SVG content.");
      return;
    }
    const { doc, svg } = parsedSvg;

    const baseTemplate =
      placeholderType === "image"
        ? DEFAULT_IMAGE_TEMPLATE
        : DEFAULT_TEXT_TEMPLATE;
    const template = blockTemplate || baseTemplate;
    const withValues = applyPlaceholderTemplate(template, {
      name: normalized,
      x: selection.x,
      y: selection.y,
      width: selection.width,
      height: selection.height,
    });

    const fragmentDoc = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${withValues}</svg>`,
      "image/svg+xml",
    );
    const fragmentSvg = fragmentDoc.querySelector("svg");
    if (!fragmentSvg) {
      setError("Unable to parse the custom block template.");
      return;
    }

    const classTarget = findPlaceholderTarget(
      fragmentSvg as unknown as SVGSVGElement,
      normalized,
      0,
    );
    if (classTarget && isTextPlaceholder) {
      const normalizedSize = normalizeFontSize(fontSizeInput);
      if (normalizedSize) {
        const direct =
          findDirectPlaceholderElement(classTarget, normalized) ?? classTarget;
        const existingStyle = direct.getAttribute("style") ?? "";
        direct.setAttribute(
          "style",
          updateInlineFontSize(existingStyle, normalizedSize),
        );
      }
    }

    Array.from(fragmentSvg.childNodes).forEach((node) => {
      const imported = doc.importNode(node, true);
      if (
        (isDuplicatePlaceholder || uniqueId !== normalized) &&
        imported.nodeType === Node.ELEMENT_NODE
      ) {
        updateDuplicateIds(imported as Element, normalized, uniqueId);
      }
      svg.appendChild(imported);
    });

    let updatedContent = new XMLSerializer().serializeToString(svg);
    updatedContent = await formatSvg(updatedContent);
    applyUpdate(updatedContent, `Inserted placeholder "${normalized}".`);
    setSelection(null);
    clearSelectionMeta();
    setPlaceholderName("");
  }, [
    applyUpdate,
    blockTemplate,
    clearSelectionMeta,
    contentSummary,
    fontSizeInput,
    isTextPlaceholder,
    parseEditableSvg,
    placeholderName,
    placeholderType,
    selection,
    setSelection,
  ]);

  const handleUpdatePlaceholder = useCallback(async () => {
    if (!selection || !selectedPlaceholder) return;
    const normalized = normalizePlaceholderName(placeholderName);
    if (!normalized) {
      setError("Enter a placeholder name.");
      return;
    }

    const existingPlaceholders = contentSummary?.placeholders ?? [];
    const existingIds = contentSummary?.elementIds ?? [];
    const isDuplicatePlaceholder =
      normalized !== selectedPlaceholder.name &&
      existingPlaceholders.includes(normalized);
    const uniqueId = isDuplicatePlaceholder
      ? getUniqueId(normalized, [normalized, ...existingIds])
      : normalized;

    const updated = updatePlaceholder({
      content: localContent,
      prevName: selectedPlaceholder.name,
      nextName: normalized,
      rect: selection,
      placeholderIndex: selectedPlaceholder.index,
      shouldUpdateId: isDuplicatePlaceholder,
      uniqueId,
      fontSize: isTextPlaceholder ? normalizeFontSize(fontSizeInput) : undefined,
    });
    if (!updated) {
      setError(
        "Unable to update the placeholder. The original block could not be found.",
      );
      return;
    }

    let updatedContent = updated.content;

    if (selectedCode) {
      const tokenRegex = createPlaceholderRegex(selectedPlaceholder.name, "g");
      const nextCode =
        selectedPlaceholder.name !== normalized
          ? selectedCode.replace(tokenRegex, `{{${normalized}}}`)
          : selectedCode;
      const applied = applySelectedMarkupToContent({
        content: updatedContent,
        targetName: normalized,
        targetIndex: selectedPlaceholder.index,
        rect: selection,
        code: nextCode,
        codeType: selectedCodeType,
        fontSize: isTextPlaceholder
          ? normalizeFontSize(fontSizeInput)
          : undefined,
      });
      if (applied.error) {
        setError(applied.error);
        return;
      }
      updatedContent = applied.content;
      setSelectedCode(nextCode);
    }

    const formatted = await formatSvg(updatedContent);
    applyUpdate(formatted, `Updated placeholder "${normalized}".`);
    const refreshedSnippet = getPlaceholderSnippet(
      formatted,
      normalized,
      selectedPlaceholder.index,
    );
    setSelectedPlaceholder({
      ...selectedPlaceholder,
      name: normalized,
      rect: selection,
      snippet: refreshedSnippet?.snippet ?? updated.snippet,
      snippetType: refreshedSnippet?.snippetType ?? updated.snippetType,
    });
    setPlaceholderName(normalized);
    setSelection(selection);
    setSelectedCode(refreshedSnippet?.snippet ?? updated.snippet ?? null);
    setSelectedCodeType(
      refreshedSnippet?.snippetType ?? updated.snippetType ?? null,
    );
  }, [
    applyUpdate,
    contentSummary,
    fontSizeInput,
    isTextPlaceholder,
    localContent,
    placeholderName,
    selectedCode,
    selectedCodeType,
    selectedPlaceholder,
    selection,
    setSelection,
  ]);

  const handleRemovePlaceholder = useCallback(async () => {
    if (!selectedPlaceholder) return;
    const parsedSvg = parseEditableSvg();
    if (!parsedSvg) {
      setError("Unable to read SVG content.");
      return;
    }
    const { svg } = parsedSvg;

    const candidates = findPlaceholderElements(svg, selectedPlaceholder.name);
    const target =
      candidates[selectedPlaceholder.index] ?? candidates[0] ?? null;
    const group = target?.closest("g") ?? null;
    if (group) {
      group.remove();
    } else if (target) {
      target.remove();
    }

    const updatedContent = await formatSvg(
      new XMLSerializer().serializeToString(svg),
    );
    applyUpdate(
      updatedContent,
      `Removed placeholder "${selectedPlaceholder.name}".`,
    );
    clearSelectionMeta();
    setSelection(null);
    setPlaceholderName("");
  }, [
    applyUpdate,
    clearSelectionMeta,
    parseEditableSvg,
    selectedPlaceholder,
    setSelection,
  ]);

  const handleCancelEdit = useCallback(() => {
    if (!selectedPlaceholder) return;
    setSelection(selectedPlaceholder.rect);
    setPlaceholderName(selectedPlaceholder.name);
    setSelectedCode(selectedPlaceholder.snippet ?? null);
    setSelectedCodeType(selectedPlaceholder.snippetType ?? null);
    if (parsedLocalSvg) {
      const target = findPlaceholderTarget(
        parsedLocalSvg.svg,
        selectedPlaceholder.name,
        selectedPlaceholder.index,
      );
      if (target) {
        const textTarget =
          findDirectPlaceholderElement(target, selectedPlaceholder.name) ??
          target;
        const styleText = textTarget.getAttribute("style") ?? "";
        const sizeMatch = matchFontSize(styleText);
        setFontSizeInput(sizeMatch?.[1]?.trim() ?? "");
      }
    }
    setNotice("Reverted changes.");
    setError(null);
  }, [parsedLocalSvg, selectedPlaceholder, setSelection]);

  const handleCancelInsert = useCallback(() => {
    setSelection(null);
    setSelectedCode(null);
    setSelectedCodeType(null);
    setPlaceholderName("");
    setNotice(null);
    setError(null);
  }, [setPlaceholderName, setSelection]);

  const handleConfirmRemove = useCallback(async () => {
    await handleRemovePlaceholder();
  }, [handleRemovePlaceholder]);

  const handleDetectedPlaceholderSelect = useCallback(
    (block: PlaceholderBlock) => {
      setSelection(block.rect);
      handleSelectPlaceholder(block);
      setNotice(null);
      setError(null);
    },
    [handleSelectPlaceholder, setSelection],
  );

  const fontUsage = useMemo(() => {
    const usage = extractFontUsage(localContent);
    const linkedFonts = parseFontLinksFromComments(localContent);
    return { ...usage, linkedFonts };
  }, [localContent]);

  const missingFonts = useMemo(
    () => (localContent ? getMissingFonts(localContent) : ([] as string[])),
    [localContent],
  );

  const googleFontImports = useMemo(
    () =>
      localContent
        ? extractGoogleFontFamiliesFromContent(localContent)
        : new Set<string>(),
    [localContent],
  );

  const autoLinkFonts = useMemo(
    () => missingFonts.filter((font) => !googleFontImports.has(font)),
    [googleFontImports, missingFonts],
  );

  const inferredFontWeights = useMemo(
    () => (localContent ? inferFontWeightsFromSvg(localContent) : {}),
    [localContent],
  );

  const autoGoogleFontUrl = useMemo(() => {
    if (autoLinkFonts.length === 0) return "";
    return buildGoogleFontsUrl(autoLinkFonts, inferredFontWeights);
  }, [autoLinkFonts, inferredFontWeights]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const linkId = "popul8-google-fonts";
    const existing = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!autoGoogleFontUrl) {
      if (existing) existing.remove();
      return;
    }

    if (existing) {
      if (existing.href !== autoGoogleFontUrl) {
        existing.href = autoGoogleFontUrl;
      }
      return;
    }

    if (isAdvanced) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = autoGoogleFontUrl;
    document.head.appendChild(link);
  }, [autoGoogleFontUrl, isAdvanced]);

  useEffect(() => {
    if (viewMode !== "visual") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingContext(event.target)) return;

      const key = event.key.toLowerCase();

      if (key === "1") {
        event.preventDefault();
        handleSelectTool();
        return;
      }

      if (key === "2") {
        event.preventDefault();
        handleTextTool();
        return;
      }

      if (key === "3") {
        event.preventDefault();
        handleImageTool();
        return;
      }

      if (key === "+" || key === "=") {
        event.preventDefault();
        handleZoomIn();
        return;
      }

      if (key === "-" || key === "_") {
        event.preventDefault();
        handleZoomOut();
        return;
      }

      if (
        selection &&
        (key === "arrowleft" ||
          key === "arrowright" ||
          key === "arrowup" ||
          key === "arrowdown")
      ) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;

        if (event.shiftKey) {
          if (key === "arrowleft") nudgeSelection({ width: -step });
          if (key === "arrowright") nudgeSelection({ width: step });
          if (key === "arrowup") nudgeSelection({ height: -step });
          if (key === "arrowdown") nudgeSelection({ height: step });
          return;
        }

        if (key === "arrowleft") nudgeSelection({ x: -step });
        if (key === "arrowright") nudgeSelection({ x: step });
        if (key === "arrowup") nudgeSelection({ y: -step });
        if (key === "arrowdown") nudgeSelection({ y: step });
        return;
      }

      if (key === "escape") {
        event.preventDefault();
        if (isEditingExisting) {
          handleCancelEdit();
          return;
        }
        if (isInsertMode) {
          handleCancelInsert();
          return;
        }
        handleSelectTool();
        return;
      }

      if (key === "enter") {
        if (isEditingExisting && selection) {
          event.preventDefault();
          void handleUpdatePlaceholder();
          return;
        }
        if (isInsertMode && selection && placeholderName.trim()) {
          event.preventDefault();
          void handleInsertPlaceholder();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleCancelEdit,
    handleCancelInsert,
    handleImageTool,
    handleInsertPlaceholder,
    handleSelectTool,
    handleTextTool,
    handleUpdatePlaceholder,
    handleZoomIn,
    handleZoomOut,
    nudgeSelection,
    isEditingExisting,
    isInsertMode,
    placeholderName,
    selection,
    viewMode,
  ]);

  return (
    <>
      <div className={styles.editorBody}>
        <div className={styles.canvasPanel}>
          {viewMode === "visual" && (
            <CanvasToolbar
              tool={{
                active: activeTool,
                onSelect: handleSelectTool,
                onText: handleTextTool,
                onImage: handleImageTool,
              }}
              zoom={{
                level: zoomLevel,
                onZoomOut: handleZoomOut,
                onZoomIn: handleZoomIn,
              }}
            />
          )}
          <TemplateEditorStage
            view={{
              mode: viewMode,
              svgInfo,
              zoomLevel,
              svgPreviewRef,
              overlayRef,
            }}
            interaction={{
              activeTool,
              placeholderBlocks,
              selectionRect,
              selectedPlaceholderId: selectedPlaceholder?.id,
              onPointerDown: handlePointerDown,
              onPointerMove: handlePointerMove,
              onPointerUp: handlePointerUp,
            }}
            preview={{
              selectedPlaceholder,
              selection,
              selectedCode,
              selectedCodeType,
              previewText,
              isTextPlaceholder,
              fontSizePreview: normalizeFontSize(debouncedFontSize),
            }}
          />

          {isAdvanced && viewMode === "code" && (
            <Suspense fallback={<div className={styles.notice}>Loading code editor…</div>}>
              <CodeEditorPanel
                mode={{ isActive: true }}
                content={{
                  value: localContent,
                  onApply: onApplyContent,
                  onNotify: (nextNotice, nextError) => {
                    if (nextNotice !== null) setNotice(nextNotice);
                    if (nextError !== null) setError(nextError);
                  },
                }}
              />
            </Suspense>
          )}
        </div>

        <div className={styles.controlsPanel}>
          {isAdvanced && (
            <Suspense fallback={<div className={styles.notice}>Loading advanced tools…</div>}>
              <CssEditorPanel
                mode={{ isAdvanced }}
                content={{ svgContent: localContent, onApply: onApplyContent }}
              />
              <FontSourcesPanel
                mode={{ isAdvanced }}
                sources={{
                  svgContent: localContent,
                  missingFontCount: missingFonts.length,
                  fontUsage,
                  autoGoogleFontUrl,
                  autoLinkFonts,
                  inferredFontWeights,
                }}
                actions={{ onApplyContent, onError: setError }}
              />
            </Suspense>
          )}

          <PlaceholderPanel
            panel={{
              shouldShow: shouldShowPlaceholderPanel,
              status: placeholderPanelStatus,
              hint: placeholderPanelHint,
              isAdvanced,
            }}
            selection={{ rect: selection, onChangeValue: updateSelectionValue }}
            fields={{
              placeholderName,
              onPlaceholderNameChange: setPlaceholderName,
              previewText,
              onPreviewTextChange: setPreviewText,
              isTextPlaceholder,
              fontSizeInput,
              onFontSizeChange: setFontSizeInput,
            }}
            code={{
              selectedCode,
              onSelectedCodeChange: setSelectedCode,
              blockTemplate,
              onBlockTemplateChange: setBlockTemplate,
              markSyncFromCode,
            }}
            feedback={{ error, notice }}
            editing={{
              isActive: isEditingExisting,
              selectedPlaceholder,
              onUpdate: handleUpdatePlaceholder,
              onCancel: handleCancelEdit,
              onConfirmDelete: handleConfirmRemove,
            }}
            inserting={{
              isActive: isInsertMode,
              onInsert: handleInsertPlaceholder,
              onCancel: handleCancelInsert,
            }}
          />

          <DetectedPlaceholders
            placeholderBlocks={placeholderBlocks}
            selectedPlaceholderId={selectedPlaceholder?.id}
            onSelect={handleDetectedPlaceholderSelect}
          />
        </div>
      </div>
    </>
  );
};
