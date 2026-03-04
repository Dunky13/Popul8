import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Extension } from "@codemirror/state";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

type UseCodeMirrorEditorArgs = {
  isActive: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  initialDoc: string;
  extensions: Extension[];
  onViewCreated?: (view: EditorView) => void;
};

export const useCodeMirrorEditor = ({
  isActive,
  containerRef,
  initialDoc,
  extensions,
  onViewCreated,
}: UseCodeMirrorEditorArgs) => {
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      viewRef.current?.destroy();
      viewRef.current = null;
      return;
    }
    if (viewRef.current) return;

    const state = EditorState.create({
      doc: initialDoc,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    onViewCreated?.(view);

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [containerRef, extensions, initialDoc, isActive, onViewCreated]);

  return viewRef;
};
