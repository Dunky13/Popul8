/**
 * Individual rendered record card with SVG rendering.
 */

import React, { useMemo, useRef, useEffect, useCallback } from "react";
import SVG from "react-inlinesvg";
import type { DataRecord } from "../../types/dataRecord";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { createProcessedSheet, applyTextFittingToRenderedSVG, applyFontSizeOverridesToRenderedSVG } from "../../utils/svgManipulator";
import { sanitizeSvgMarkup } from "../../utils/svgSanitizer";
import styles from "./RecordCard.module.css";

interface RecordCardProps {
  record: DataRecord;
  index: number;
  preview?: boolean;
}

const RecordCardComponent: React.FC<RecordCardProps> = ({
  record,
  index,
  preview = false,
}) => {
  const { svgTemplate, dataMapping, textResizeRules } = useAppStore(
    useShallow((state) => ({
      svgTemplate: state.svgTemplate,
      dataMapping: state.dataMapping,
      textResizeRules: state.textResizeRules,
    })),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const deferredFitTimerRef = useRef<number | null>(null);
  const onLoadTimerRef = useRef<number | null>(null);

  const processedSheet = useMemo(() => {
    if (!svgTemplate) return null;

    return createProcessedSheet(svgTemplate, record, dataMapping, index);
  }, [svgTemplate, record, dataMapping, index]);

  const sanitizedSvgContent = useMemo(() => {
    if (!processedSheet) return null;
    return sanitizeSvgMarkup(processedSheet.svgContent);
  }, [processedSheet]);

  const clearDeferredFitTimer = useCallback(() => {
    if (deferredFitTimerRef.current !== null) {
      window.clearTimeout(deferredFitTimerRef.current);
      deferredFitTimerRef.current = null;
    }
  }, []);

  const clearOnLoadTimer = useCallback(() => {
    if (onLoadTimerRef.current !== null) {
      window.clearTimeout(onLoadTimerRef.current);
      onLoadTimerRef.current = null;
    }
  }, []);

  const ensureSvgFitsContainer = useCallback((svgElement: SVGSVGElement) => {
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

    if (!svgElement.getAttribute("viewBox")) {
      const widthAttr = svgElement.getAttribute("width");
      const heightAttr = svgElement.getAttribute("height");
      const width = widthAttr ? parseFloat(widthAttr) : 0;
      const height = heightAttr ? parseFloat(heightAttr) : 0;

      if (width > 0 && height > 0) {
        svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
      } else {
        try {
          const bbox = svgElement.getBBox();
          if (bbox.width > 0 && bbox.height > 0) {
            svgElement.setAttribute("viewBox", `0 0 ${bbox.width} ${bbox.height}`);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.debug("Unable to derive SVG viewBox:", error);
          }
        }
      }
    }
  }, []);

  const applySizingOverrides = useCallback(
    (svgElement: SVGSVGElement) => {
      ensureSvgFitsContainer(svgElement);
      applyFontSizeOverridesToRenderedSVG(svgElement, record.id, textResizeRules);
    },
    [ensureSvgFitsContainer, record.id, textResizeRules],
  );

  // Apply text fitting whenever the processed sheet changes
  const applyTextFitting = useCallback(() => {
    if (containerRef.current) {
      const svgElement = containerRef.current.querySelector("svg") as SVGSVGElement | null;
      if (svgElement) {
        applySizingOverrides(svgElement);
        clearDeferredFitTimer();
        deferredFitTimerRef.current = window.setTimeout(() => {
          applyTextFittingToRenderedSVG(svgElement, 0);
        }, 50); // Increased delay to ensure DOM is fully rendered
      }
    }
  }, [applySizingOverrides, clearDeferredFitTimer]);

  // Apply text fitting when the component mounts or when the sheet changes
  useEffect(() => {
    if (processedSheet) {
      applyTextFitting();
    }
    return () => {
      clearDeferredFitTimer();
      clearOnLoadTimer();
    };
  }, [applyTextFitting, clearDeferredFitTimer, clearOnLoadTimer, processedSheet]);

  if (!processedSheet) {
    return (
      <div
        className={`${styles.recordCard} ${styles.empty} ${preview ? "print" : ""}`}
      >
        <div className={styles.errorMessage}>
        <p>No template loaded</p>
          <p>Please upload an SVG template to see generated pages</p>
        </div>
      </div>
    );
  }

  if (processedSheet.errors && processedSheet.errors.length > 0) {
    return (
      <div
        className={`${styles.recordCard} ${styles.hasErrors} ${preview ? "print" : ""}`}
      >
        <div className={styles.errorMessage}>
          <h4>Render Errors</h4>
          <ul>
            {processedSheet.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.recordCard} ${preview ? `${styles.preview} print` : ""}`}
    >
      <SVG
        src={sanitizedSvgContent ?? processedSheet.svgContent}
        className={styles.svgContent}
        loader={<div className={styles.loading}>Loading page...</div>}
        onError={(error) => {
          console.error("SVG loading error:", error);
        }}
        onLoad={() => {
          if (import.meta.env.DEV) {
            console.debug("SVG onLoad triggered");
          }
          clearOnLoadTimer();
          onLoadTimerRef.current = window.setTimeout(() => {
            if (containerRef.current) {
              const svgElement = containerRef.current.querySelector("svg") as SVGSVGElement | null;
              if (svgElement) {
                applySizingOverrides(svgElement);
                applyTextFittingToRenderedSVG(svgElement, 0);
              }
            }
          }, 100);
        }}
      />
    </div>
  );
};

export const RecordCard = React.memo(
  RecordCardComponent,
  (prev, next) =>
    prev.record === next.record &&
    prev.index === next.index &&
    prev.preview === next.preview,
);
