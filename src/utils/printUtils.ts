/**
 * Print utilities and print handling
 */

import { PRINT_LAYOUT, PRINT_TIMEOUT } from "../constants";
import { getPageDimensionsMm } from "./printLayout";
import type { PrintLayout } from "../types/printLayout";

export interface PrintOptions {
  layout: PrintLayout;
}

/**
 * Handle basic print functionality
 */
export const handlePrint = async (options: PrintOptions): Promise<void> => {
  const { layout } = options;

  document.body.classList.add("printing");

  const { width, height } = getPageDimensionsMm(layout.pageSize, layout.orientation);
  const gridColumns = Math.max(1, layout.columns);
  const gridRows = Math.max(1, layout.rows);
  const marginMm =
    typeof layout.marginMm === "number"
      ? Math.max(0, layout.marginMm)
      : PRINT_LAYOUT.MARGIN_MM;
  const totalMargin = marginMm * 2;
  const contentWidth = Math.max(1, width - totalMargin);
  const contentHeight = Math.max(1, height - totalMargin);

  const printStyle = document.createElement("style");
  printStyle.setAttribute("data-popul8-print-style", "true");
  printStyle.textContent = `
    @page {
      size: ${width}mm ${height}mm !important;
      margin: ${marginMm}mm !important;
    }

    @page :first {
      size: ${width}mm ${height}mm !important;
      margin: ${marginMm}mm !important;
    }

    .pageGrid,
    div[class*="pageGrid"],
    .preview > div[class*="pageGrid"] {
      width: ${contentWidth}mm !important;
      height: ${contentHeight}mm !important;
      max-width: ${contentWidth}mm !important;
      max-height: ${contentHeight}mm !important;
      min-width: ${contentWidth}mm !important;
      min-height: ${contentHeight}mm !important;
      grid-template-columns: repeat(${gridColumns}, 1fr) !important;
      grid-template-rows: repeat(${gridRows}, 1fr) !important;
    }
  `;
  document.head.appendChild(printStyle);

  let isCleanedUp = false;
  let cleanupTimeout = 0;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    window.removeEventListener("afterprint", cleanup);
    if (cleanupTimeout) {
      window.clearTimeout(cleanupTimeout);
      cleanupTimeout = 0;
    }
    document.body.classList.remove("printing");
    printStyle.remove();
  };

  window.addEventListener("afterprint", cleanup);
  cleanupTimeout = window.setTimeout(cleanup, PRINT_TIMEOUT);

  try {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    window.print();
  } finally {
    if (!isCleanedUp && cleanupTimeout === 0) {
      cleanupTimeout = window.setTimeout(cleanup, PRINT_TIMEOUT);
    }
  }
};
