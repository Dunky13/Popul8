import React, { useEffect, useRef } from "react";
import { createPlaceholderRegex } from "../../utils/regexUtils";
import { sanitizeSvgMarkup } from "../../utils/svgSanitizer";
import type { PlaceholderBlock, Rect, SvgInfo } from "./types";
import styles from "./TemplateEditor.module.css";
import { applySelectedMarkupToContent } from "./placeholderActions";
import {
  findDirectPlaceholderElement,
  findPlaceholderTarget,
  updateInlineFontSize,
} from "./placeholderUtils";

type TemplateEditorStageProps = {
  view: {
    mode: "visual" | "code";
    svgInfo: SvgInfo | null;
    zoomLevel: number;
    svgPreviewRef: React.RefObject<HTMLDivElement | null>;
    overlayRef: React.RefObject<SVGSVGElement | null>;
  };
  interaction: {
    activeTool: "select" | "text" | "image";
    placeholderBlocks: PlaceholderBlock[];
    selectionRect: Rect | null;
    selectedPlaceholderId?: string | null;
    onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  };
  preview: {
    selectedPlaceholder: PlaceholderBlock | null;
    selection: Rect | null;
    selectedCode: string | null;
    selectedCodeType: "group" | "foreignObject" | "image" | null;
    previewText: string;
    isTextPlaceholder: boolean;
    fontSizePreview: string;
  };
};

export const TemplateEditorStage: React.FC<TemplateEditorStageProps> = ({
  view,
  interaction,
  preview,
}) => {
  const { mode: viewMode, svgInfo, zoomLevel, svgPreviewRef, overlayRef } = view;
  const {
    activeTool,
    placeholderBlocks,
    selectionRect,
    selectedPlaceholderId,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = interaction;
  const {
    selectedPlaceholder,
    selection,
    selectedCode,
    selectedCodeType,
    previewText,
    isTextPlaceholder,
    fontSizePreview,
  } = preview;
  const lastSvgMarkupRef = useRef<string | null>(null);

  useEffect(() => {
    if (viewMode !== "visual") return;
    lastSvgMarkupRef.current = null;
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "visual") return;
    if (!svgInfo?.svgMarkup) return;
    if (!svgPreviewRef.current) return;
    const previewName = selectedPlaceholder?.name ?? "";
    let previewMarkup = svgInfo.svgMarkup;

    if (
      isTextPlaceholder &&
      selectedPlaceholder &&
      previewName &&
      (previewText.trim() || fontSizePreview)
    ) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(previewMarkup, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (svg) {
        const target = findPlaceholderTarget(
          svg,
          previewName,
          selectedPlaceholder.index,
        );
        if (target) {
          const textTarget =
            findDirectPlaceholderElement(target, previewName) ?? target;
          if (fontSizePreview) {
            const existingStyle = textTarget.getAttribute("style") ?? "";
            textTarget.setAttribute(
              "style",
              updateInlineFontSize(existingStyle, fontSizePreview),
            );
          }
          if (previewText.trim()) {
            const tokenRegex = createPlaceholderRegex(previewName, "g");
            const updateTokens = (node: Element) => {
              node.childNodes.forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE && child.nodeValue) {
                  child.nodeValue = child.nodeValue.replace(
                    tokenRegex,
                    previewText,
                  );
                  return;
                }
                if (child.nodeType === Node.ELEMENT_NODE) {
                  updateTokens(child as Element);
                }
              });
            };
            updateTokens(textTarget);
          }
        }
        previewMarkup = new XMLSerializer().serializeToString(svg);
      }
    }

    if (selectedPlaceholder && selectedCode?.trim()) {
      const sanitizedCode = selectedCode.replace(
        createPlaceholderRegex(previewName, "g"),
        "",
      );
      const applied = applySelectedMarkupToContent({
        content: previewMarkup,
        targetName: selectedPlaceholder.name,
        targetIndex: selectedPlaceholder.index,
        rect: selection ?? selectedPlaceholder.rect,
        code: sanitizedCode,
        codeType: selectedCodeType,
        fontSize: isTextPlaceholder ? fontSizePreview : undefined,
      });
      if (!applied.error) {
        previewMarkup = applied.content;
      }
    }
    previewMarkup = sanitizeSvgMarkup(previewMarkup);
    if (
      lastSvgMarkupRef.current === previewMarkup &&
      svgPreviewRef.current.innerHTML === previewMarkup
    ) {
      return;
    }
    svgPreviewRef.current.innerHTML = previewMarkup;
    lastSvgMarkupRef.current = previewMarkup;
  }, [
    fontSizePreview,
    isTextPlaceholder,
    previewText,
    selectedCode,
    selectedCodeType,
    selectedPlaceholder,
    selection,
    svgInfo?.svgMarkup,
    svgPreviewRef,
    viewMode,
  ]);

  if (!svgInfo) {
    return (
      <div className={styles.parseWarning}>
        Unable to determine SVG dimensions or viewBox. Please ensure the SVG
        has a viewBox or width/height.
      </div>
    );
  }

  if (viewMode !== "visual") return null;

  return (
    <div className={styles.svgStage}>
      <div
        className={styles.svgViewport}
        style={{ transform: `scale(${zoomLevel})` }}
      >
        <div ref={svgPreviewRef} className={styles.svgPreview} />
        <svg
          ref={overlayRef}
          className={`${styles.overlay} ${
            activeTool === "select" ? styles.overlaySelect : ""
          }`}
          viewBox={svgInfo.viewBox}
          preserveAspectRatio="xMinYMin meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {placeholderBlocks.map((block) => (
            <rect
              key={block.id}
              x={block.rect.x}
              y={block.rect.y}
              width={block.rect.width}
              height={block.rect.height}
              className={`${styles.existingRect} ${
                selectedPlaceholderId === block.id ? styles.selectedRect : ""
              }`}
            />
          ))}
          {placeholderBlocks.map((block) => (
            <text
              key={`${block.id}-label`}
              x={block.rect.x + 4}
              y={block.rect.y + 12}
              className={styles.existingLabel}
            >
              {block.name}
            </text>
          ))}
          {selectionRect && (
            <rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              className={styles.selectionRect}
            />
          )}
          {selectionRect && (
            <text
              x={selectionRect.x + 4}
              y={selectionRect.y + 14}
              className={styles.selectionLabel}
            >
              {`${selectionRect.width} x ${selectionRect.height}`}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
};
