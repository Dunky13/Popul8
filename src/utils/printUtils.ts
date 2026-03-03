/**
 * Print utilities and print handling
 */

import { PRINT_LAYOUT, PRINT_TIMEOUT } from "../constants";
import { getPageDimensionsMm } from "./printLayout";
import type { PrintLayout } from "../types/printLayout";

export interface PrintOptions {
  layout: PrintLayout;
  scrollContainer?: HTMLElement | null;
}

/**
 * Handle basic print functionality
 */
export const handlePrint = async (options: PrintOptions): Promise<void> => {
  const { layout, scrollContainer } = options;

  document.body.classList.add("printing");

  const { width, height } = getPageDimensionsMm(layout.pageSize, layout.orientation);
  const marginMm =
    typeof layout.marginMm === "number"
      ? Math.max(0, layout.marginMm)
      : PRINT_LAYOUT.MARGIN_MM;

  const printStyle = document.createElement("style");
  printStyle.setAttribute("data-popul8-print-style", "true");
  printStyle.textContent = `
    @page {
      size: ${width}mm ${height}mm !important;
      margin: ${marginMm}mm !important;
    }
  `;
  document.head.appendChild(printStyle);

  const previousWindowScrollX = window.scrollX;
  const previousWindowScrollY = window.scrollY;
  const previousContainerScrollTop = scrollContainer?.scrollTop ?? 0;
  const previousContainerScrollLeft = scrollContainer?.scrollLeft ?? 0;

  if (scrollContainer) {
    scrollContainer.scrollTop = 0;
    scrollContainer.scrollLeft = 0;
  }
  window.scrollTo(0, 0);

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

    if (scrollContainer) {
      scrollContainer.scrollTop = previousContainerScrollTop;
      scrollContainer.scrollLeft = previousContainerScrollLeft;
    }
    window.scrollTo(previousWindowScrollX, previousWindowScrollY);

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
