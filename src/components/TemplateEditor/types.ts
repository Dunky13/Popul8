export type Point = { x: number; y: number };

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlaceholderBlock = {
  id: string;
  name: string;
  index: number;
  rect: Rect;
  elementTag: string;
  snippet?: string;
  snippetType?: "group" | "foreignObject" | "image";
};

export type SvgInfo = {
  svgMarkup: string;
  viewBox: string;
  width?: number;
  height?: number;
};
