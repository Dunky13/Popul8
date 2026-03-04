import { useCallback, useEffect, useRef, useState } from "react";
import type { SVGTemplate } from "../../../types/template";
import { parseSVGTemplate } from "../../../utils/svgManipulator";
import { formatSvg } from "../helpers";
import { formatCss, getSvgCssBlocks, updateSvgCssBlocks } from "../cssHelpers";

type UseTemplateContentResult = {
  localContent: string | null;
  applyContentUpdate: (updatedContent: string) => void;
  handleApplyContent: (updatedContent: string) => void;
  pushUndo: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export const useTemplateContent = (
  svgTemplate: SVGTemplate | null,
  setSvgTemplate: (template: SVGTemplate | null) => void,
): UseTemplateContentResult => {
  const [localContent, setLocalContent] = useState<string | null>(
    svgTemplate?.content ?? null,
  );
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const pendingInternalUpdateRef = useRef(false);
  const formattedOnLoadRef = useRef<string | null>(null);
  const formattedCssOnLoadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!svgTemplate?.content) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalContent(null);
      setUndoStack([]);
      setRedoStack([]);
      return;
    }

    if (pendingInternalUpdateRef.current) {
      pendingInternalUpdateRef.current = false;
      return;
    }

    setLocalContent(svgTemplate.content);
    setUndoStack([]);
    setRedoStack([]);

    if (formattedOnLoadRef.current === svgTemplate.content) return;
    formattedOnLoadRef.current = svgTemplate.content;
    void (async () => {
      const formatted = await formatSvg(svgTemplate.content);
      if (formatted !== svgTemplate.content) {
        pendingInternalUpdateRef.current = true;
        setLocalContent(formatted);
        setSvgTemplate(parseSVGTemplate(formatted, svgTemplate.fileName));
      }

      if (formattedCssOnLoadRef.current === formatted) return;
      const cssBlocks = getSvgCssBlocks(formatted);
      if (cssBlocks.length === 0) return;
      const formattedBlocks = await Promise.all(
        cssBlocks.map(async (block) => {
          if (!block.trim()) return block;
          return await formatCss(block);
        }),
      );
      const updatedSvg = updateSvgCssBlocks(formatted, formattedBlocks, false);
      if (!updatedSvg || updatedSvg === formatted) return;
      const prettifiedSvg = await formatSvg(updatedSvg);
      if (!prettifiedSvg || prettifiedSvg === formatted) return;
      formattedCssOnLoadRef.current = prettifiedSvg;
      pendingInternalUpdateRef.current = true;
      setLocalContent(prettifiedSvg);
      setSvgTemplate(parseSVGTemplate(prettifiedSvg, svgTemplate.fileName));
    })();
  }, [setSvgTemplate, svgTemplate?.content, svgTemplate?.fileName]);

  const pushUndo = useCallback(() => {
    if (!localContent) return;
    setUndoStack((prev) => [localContent, ...prev].slice(0, 50));
    setRedoStack([]);
  }, [localContent]);

  const applyContentUpdate = useCallback(
    (updatedContent: string) => {
      const updatedTemplate = parseSVGTemplate(
        updatedContent,
        svgTemplate?.fileName,
      );
      setLocalContent(updatedContent);
      pendingInternalUpdateRef.current = true;
      setSvgTemplate(updatedTemplate);
    },
    [setSvgTemplate, svgTemplate?.fileName],
  );

  const handleApplyContent = useCallback(
    (updatedContent: string) => {
      pushUndo();
      applyContentUpdate(updatedContent);
    },
    [applyContentUpdate, pushUndo],
  );

  const handleUndo = useCallback(() => {
    if (!undoStack.length) return;
    const [last, ...rest] = undoStack;
    const updatedTemplate = parseSVGTemplate(last, svgTemplate?.fileName);
    setLocalContent(last);
    pendingInternalUpdateRef.current = true;
    setSvgTemplate(updatedTemplate);
    setUndoStack(rest);
    setRedoStack((redoPrev) => {
      if (!localContent) return redoPrev;
      return [localContent, ...redoPrev].slice(0, 50);
    });
  }, [localContent, setSvgTemplate, svgTemplate?.fileName, undoStack]);

  const handleRedo = useCallback(() => {
    if (!redoStack.length) return;
    const [next, ...rest] = redoStack;
    const updatedTemplate = parseSVGTemplate(next, svgTemplate?.fileName);
    setLocalContent(next);
    pendingInternalUpdateRef.current = true;
    setSvgTemplate(updatedTemplate);
    setRedoStack(rest);
    setUndoStack((undoPrev) => {
      if (!localContent) return undoPrev;
      return [localContent, ...undoPrev].slice(0, 50);
    });
  }, [localContent, redoStack, setSvgTemplate, svgTemplate?.fileName]);

  return {
    localContent,
    applyContentUpdate,
    handleApplyContent,
    pushUndo,
    handleUndo,
    handleRedo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
};
