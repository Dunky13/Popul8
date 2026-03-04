export type PrintPageSize = "A4" | "A5" | "A3" | "Letter" | "Legal";
export type PrintOrientation = "portrait" | "landscape";

export interface PrintLayout {
  pageSize: PrintPageSize;
  orientation: PrintOrientation;
  rows: number;
  columns: number;
  marginMm: number;
}
