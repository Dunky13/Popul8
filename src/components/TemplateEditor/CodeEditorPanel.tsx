import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./TemplateEditor.module.css";
import { formatSvg, foldLargeBlocks } from "./helpers";
import { useCodeMirrorEditor } from "./hooks/useCodeMirrorEditor";
import { useCodeMirrorSync } from "./hooks/useCodeMirrorSync";
import { EditorView, ViewPlugin, highlightActiveLineGutter, lineNumbers, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { ensureSyntaxTree, foldGutter, foldKeymap, foldService, indentOnInput } from "@codemirror/language";
import { xml } from "@codemirror/lang-xml";
import { SYNTAX_HIGHLIGHTING } from "./syntaxHighlighting";
import { createCloseTagRegex, createOpenTagRegex, matchOpenTag } from "../../utils/regexUtils";

type CodeEditorPanelProps = {
  mode: {
    isActive: boolean;
  };
  content: {
    value: string | null;
    onApply: (updatedContent: string) => void;
    onNotify: (notice: string | null, error: string | null) => void;
  };
};

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  mode,
  content,
}) => {
  const { isActive } = mode;
  const { value, onApply, onNotify } = content;
  const [draftContent, setDraftContent] = useState<string | null>(value ?? null);
  const codeContainerRef = useRef<HTMLDivElement | null>(null);
  const codeDirtyRef = useRef(false);
  const initialDocRef = useRef<string>("");
  const autoFormattedRef = useRef<string | null>(null);
  const suppressDirtyRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;
    initialDocRef.current = draftContent ?? "";
  }, [draftContent, isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (codeDirtyRef.current) return;
    if (!value || draftContent === value) return;
    setDraftContent(value);
  }, [draftContent, isActive, value]);

  const codeExtensions = useMemo(
    () => [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      indentOnInput(),
      ViewPlugin.fromClass(
        class {
          constructor(view: EditorView) {
            ensureSyntaxTree(view.state, view.state.doc.length, 200);
          }
          update(update: { state: EditorState; docChanged: boolean }) {
            if (update.docChanged) {
              ensureSyntaxTree(update.state, update.state.doc.length, 200);
            }
          }
        },
      ),
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
      foldService.of((state, lineStart) => {
        const line = state.doc.lineAt(lineStart);
        const openTagMatch = matchOpenTag(line.text);
        if (!openTagMatch) return null;
        if (openTagMatch[0].endsWith("/>")) return null;
        const tagName = openTagMatch[1];
        if (line.text.includes(`</${tagName}`)) return null;

        const openTagRegex = createOpenTagRegex(tagName);
        const closeTagRegex = createCloseTagRegex(tagName);
        let depth = 1;
        let pos = line.to + 1;

        while (pos <= state.doc.length) {
          const nextLine = state.doc.lineAt(pos);
          const lineText = nextLine.text;
          let match: RegExpExecArray | null;

          openTagRegex.lastIndex = 0;
          while ((match = openTagRegex.exec(lineText))) {
            const tagText = match[0];
            if (!tagText.endsWith("/>")) {
              depth += 1;
            }
          }

          closeTagRegex.lastIndex = 0;
          while ((match = closeTagRegex.exec(lineText))) {
            depth -= 1;
          }

          if (depth <= 0) {
            return { from: line.to, to: nextLine.from };
          }

          pos = nextLine.to + 1;
        }

        return null;
      }),
      foldGutter({ openText: "▾", closedText: "▸" }),
      SYNTAX_HIGHLIGHTING,
      xml(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          if (suppressDirtyRef.current) {
            suppressDirtyRef.current = false;
            setDraftContent(update.state.doc.toString());
            return;
          }
          codeDirtyRef.current = true;
          setDraftContent(update.state.doc.toString());
        }
      }),
    ],
    [setDraftContent],
  );

  const codeViewRef = useCodeMirrorEditor({
    isActive,
    containerRef: codeContainerRef,
    initialDoc: initialDocRef.current,
    extensions: codeExtensions,
    onViewCreated: (view) => foldLargeBlocks(view, 25),
  });

  useCodeMirrorSync({
    viewRef: codeViewRef,
    value: draftContent,
    onSync: (view) => foldLargeBlocks(view, 25),
  });

  useEffect(() => {
    if (!isActive) return;
    if (codeDirtyRef.current) return;
    const view = codeViewRef.current;
    const current = view?.state.doc.toString() ?? draftContent ?? "";
    if (!current.trim()) return;
    if (autoFormattedRef.current === current) return;
    let cancelled = false;
    void (async () => {
      const formatted = await formatSvg(current);
      if (cancelled) return;
      if (!formatted || formatted === current) return;
      autoFormattedRef.current = formatted;
      if (view) {
        suppressDirtyRef.current = true;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
      }
      setDraftContent(formatted);
    })();
    return () => {
      cancelled = true;
    };
  }, [codeViewRef, draftContent, isActive]);

  const handleFormat = async () => {
    const view = codeViewRef.current;
    const current = view?.state.doc.toString() ?? draftContent ?? "";
    if (!current.trim()) return;
    onNotify("Formatting SVG...", null);
    const formatted = await formatSvg(current);
    if (formatted === current) {
      onNotify("SVG already formatted.", null);
      return;
    }
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      });
    }
    setDraftContent(formatted);
    onNotify("Formatted SVG.", null);
  };

  const handleApply = () => {
    if (!draftContent) return;
    codeDirtyRef.current = false;
    onApply(draftContent);
    onNotify("Applied code changes.", null);
  };

  if (!isActive) return null;

  return (
    <div className={styles.codeEditor}>
      <div className={styles.codeHint}>
        Collapse groups by clicking the gutter arrows next to opening tags.
      </div>
      <div className={styles.codeActions}>
        <button
          className={styles.secondaryButton}
          onClick={handleFormat}
          disabled={!draftContent}
        >
          Format SVG
        </button>
        <button className={styles.primaryButton} onClick={handleApply}>
          Apply Code Changes
        </button>
      </div>
      <div ref={codeContainerRef} className={styles.codeMirrorHost} />
    </div>
  );
};
