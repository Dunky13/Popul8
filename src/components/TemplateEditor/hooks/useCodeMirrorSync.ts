import { useEffect } from "react";
import type { EditorView } from "@codemirror/view";
import type { RefObject } from "react";

type UseCodeMirrorSyncArgs = {
  viewRef: RefObject<EditorView | null>;
  value: string | null;
  onSync?: (view: EditorView) => void;
  preserveSelection?: boolean;
};

export const useCodeMirrorSync = ({
  viewRef,
  value,
  onSync,
  preserveSelection = false,
}: UseCodeMirrorSyncArgs) => {
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value === null || current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      selection: preserveSelection ? view.state.selection : undefined,
    });
    onSync?.(view);
  }, [onSync, preserveSelection, value, viewRef]);
};
