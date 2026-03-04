import { PRINT_LAYOUT } from "../constants";
import type { PrintOrientation, PrintPageSize } from "../types/printLayout";

export const getPageDimensionsMm = (
  pageSize: PrintPageSize,
  orientation: PrintOrientation
): { width: number; height: number } => {
  const base = PRINT_LAYOUT.PAGE_SIZES_MM[pageSize];
  if (!base) {
    return { width: 210, height: 297 };
  }

  if (orientation === "portrait") {
    return { width: base.width, height: base.height };
  }

  return { width: base.height, height: base.width };
};
