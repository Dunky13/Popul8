import { useCallback, useMemo, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import type { PlaceholderBlock, Point, Rect, SvgInfo } from "../types";

const GRID_SIZE = 1;
const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
const toFixed = (value: number) => Number(value.toFixed(2));

type UseCanvasSelectionArgs = {
  svgInfo: SvgInfo | null;
  overlayRef: RefObject<SVGSVGElement | null>;
  activeTool: "select" | "text" | "image";
  placeholderBlocks: PlaceholderBlock[];
  onSelectPlaceholder: (block: PlaceholderBlock | null) => void;
  onClearMessages?: () => void;
  onSelectionTooSmall?: () => void;
  onSelectionCreated?: (selection: Rect) => void;
  onClearSelectionMeta?: () => void;
};

export const useCanvasSelection = ({
  svgInfo,
  overlayRef,
  activeTool,
  placeholderBlocks,
  onSelectPlaceholder,
  onClearMessages,
  onSelectionTooSmall,
  onSelectionCreated,
  onClearSelectionMeta,
}: UseCanvasSelectionArgs) => {
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [dragMode, setDragMode] = useState<"draw" | "move" | null>(null);
  const [moveOrigin, setMoveOrigin] = useState<Point | null>(null);
  const [moveStartRect, setMoveStartRect] = useState<Rect | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);

  const getSvgPoint = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const svg = overlayRef.current;
      if (!svg) return null;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const inverted = ctm.inverse();
      const svgPoint = point.matrixTransform(inverted);
      return { x: svgPoint.x, y: svgPoint.y } as Point;
    },
    [overlayRef],
  );

  const findBlockAtPoint = useCallback(
    (point: Point) =>
      placeholderBlocks.find((block) => {
        const { x, y, width, height } = block.rect;
        return (
          point.x >= x &&
          point.x <= x + width &&
          point.y >= y &&
          point.y <= y + height
        );
      }) || null,
    [placeholderBlocks],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!svgInfo) return;
      const point = getSvgPoint(event);
      if (!point) return;
      const hitBlock = findBlockAtPoint(point);

      onClearMessages?.();

      if (activeTool === "select") {
        if (!hitBlock) {
          setSelection(null);
          onSelectPlaceholder(null);
          onClearSelectionMeta?.();
          return;
        }

        onSelectPlaceholder(hitBlock);
        setSelection(hitBlock.rect);
        setDragMode("move");
        setMoveOrigin(point);
        setMoveStartRect(hitBlock.rect);
      } else {
        setDragMode("draw");
        setDragStart(point);
        setDragCurrent(point);
        setSelection(null);
        onSelectPlaceholder(null);
        onClearSelectionMeta?.();
      }

      overlayRef.current?.setPointerCapture(event.pointerId);
    },
    [
      activeTool,
      findBlockAtPoint,
      getSvgPoint,
      onClearMessages,
      onClearSelectionMeta,
      onSelectPlaceholder,
      overlayRef,
      svgInfo,
    ],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const point = getSvgPoint(event);
      if (!point) return;

      if (dragMode === "draw" && dragStart) {
        setDragCurrent(point);
        return;
      }

      if (dragMode === "move" && moveOrigin && moveStartRect) {
        const dx = point.x - moveOrigin.x;
        const dy = point.y - moveOrigin.y;
        setSelection({
          x: toFixed(snapToGrid(moveStartRect.x + dx)),
          y: toFixed(snapToGrid(moveStartRect.y + dy)),
          width: moveStartRect.width,
          height: moveStartRect.height,
        });
      }
    },
    [dragMode, dragStart, getSvgPoint, moveOrigin, moveStartRect],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const point = getSvgPoint(event);
      if (!point) return;

      if (dragMode === "draw" && dragStart) {
        const x = Math.min(dragStart.x, point.x);
        const y = Math.min(dragStart.y, point.y);
        const width = Math.abs(point.x - dragStart.x);
        const height = Math.abs(point.y - dragStart.y);

        if (width < 1 || height < 1) {
          setSelection(null);
          onSelectionTooSmall?.();
        } else {
          const nextSelection = {
            x: toFixed(snapToGrid(x)),
            y: toFixed(snapToGrid(y)),
            width: toFixed(snapToGrid(width)),
            height: toFixed(snapToGrid(height)),
          } as Rect;
          setSelection(nextSelection);
          onSelectionCreated?.(nextSelection);
        }
      }

      setDragStart(null);
      setDragCurrent(null);
      setDragMode(null);
      setMoveOrigin(null);
      setMoveStartRect(null);
      overlayRef.current?.releasePointerCapture(event.pointerId);
    },
    [
      dragMode,
      dragStart,
      getSvgPoint,
      onSelectionCreated,
      onSelectionTooSmall,
      overlayRef,
    ],
  );

  const selectionRect = useMemo(() => {
    if (selection) return selection;
    if (!dragStart || !dragCurrent) return null;

    const x = Math.min(dragStart.x, dragCurrent.x);
    const y = Math.min(dragStart.y, dragCurrent.y);
    const width = Math.abs(dragCurrent.x - dragStart.x);
    const height = Math.abs(dragCurrent.y - dragStart.y);

    return {
      x: toFixed(snapToGrid(x)),
      y: toFixed(snapToGrid(y)),
      width: toFixed(snapToGrid(width)),
      height: toFixed(snapToGrid(height)),
    } as Rect;
  }, [dragCurrent, dragStart, selection]);

  return {
    selection,
    setSelection,
    selectionRect,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
