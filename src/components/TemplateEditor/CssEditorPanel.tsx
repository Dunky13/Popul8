import React, { useEffect, useMemo, useRef } from "react";
import styles from "./TemplateEditor.module.css";
import {
  buildCssDraft,
  formatCss,
  splitCssDraft,
  updateSvgCssBlocks,
} from "./cssHelpers";
import { formatSvg } from "./helpers";
import { useCssEditorState } from "./hooks/useCssEditorState";
import { useCodeMirrorEditor } from "./hooks/useCodeMirrorEditor";
import { useCodeMirrorSync } from "./hooks/useCodeMirrorSync";
import {
  EditorView,
  highlightActiveLineGutter,
  lineNumbers,
  keymap,
} from "@codemirror/view";
import { history, historyKeymap } from "@codemirror/commands";
import { indentOnInput } from "@codemirror/language";
import { css } from "@codemirror/lang-css";
import { SYNTAX_HIGHLIGHTING } from "./syntaxHighlighting";

type CssEditorPanelProps = {
  mode: {
    isAdvanced: boolean;
  };
  content: {
    svgContent: string | null;
    onApply: (updatedContent: string) => void;
  };
};

export const CssEditorPanel: React.FC<CssEditorPanelProps> = ({
  mode,
  content,
}) => {
  const { isAdvanced } = mode;
  const { svgContent, onApply } = content;
  const cssContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    cssDraft,
    cssError,
    cssNotice,
    cssRuleCount,
    embeddedCss,
    embeddedCssBlocks,
    isOpen,
    setCssDraft,
    setCssError,
    setCssNotice,
    setIsOpen,
  } = useCssEditorState(svgContent);

  const cssExtensions = useMemo(
    () => [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      indentOnInput(),
      keymap.of([...historyKeymap]),
      SYNTAX_HIGHLIGHTING,
      css(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setCssDraft(update.state.doc.toString());
        }
      }),
    ],
    [setCssDraft],
  );

  const cssViewRef = useCodeMirrorEditor({
    isActive: isOpen,
    containerRef: cssContainerRef,
    initialDoc: cssDraft,
    extensions: cssExtensions,
  });

  useCodeMirrorSync({
    viewRef: cssViewRef,
    value: cssDraft,
  });

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      const draft = cssDraft.trim();
      if (!draft) return;
      const { blocks } = splitCssDraft(cssDraft, embeddedCssBlocks);
      const formattedBlocks = await Promise.all(
        blocks.map(async (block) => {
          if (!block.trim()) return block;
          return await formatCss(block);
        }),
      );
      const formattedDraft = buildCssDraft(formattedBlocks);
      if (formattedDraft !== cssDraft) {
        setCssDraft(formattedDraft);
      }
    })();
  }, [cssDraft, embeddedCssBlocks, isOpen, setCssDraft]);

  const handleReset = () => {
    setCssDraft(embeddedCss);
    setCssNotice("Reset to embedded CSS.");
    setCssError(null);
  };

  const handleFormat = async () => {
    if (!cssDraft.trim()) return;
    setCssNotice("Formatting CSS...");
    setCssError(null);
    const { blocks } = splitCssDraft(cssDraft, embeddedCssBlocks);
    const formattedBlocks = await Promise.all(
      blocks.map(async (block) => {
        if (!block.trim()) return block;
        return await formatCss(block);
      }),
    );
    const formattedDraft = buildCssDraft(formattedBlocks);
    if (formattedDraft === cssDraft) {
      setCssNotice("CSS already formatted.");
      return;
    }
    setCssDraft(formattedDraft);
    setCssNotice("Formatted CSS.");
  };

  const handleApply = async () => {
    if (!svgContent) return;
    const { blocks, hasMarkers } = splitCssDraft(cssDraft, embeddedCssBlocks);
    const formattedBlocks = await Promise.all(
      blocks.map(async (block) => {
        if (!block.trim()) return block;
        return await formatCss(block);
      }),
    );
    const formattedDraft = buildCssDraft(formattedBlocks);
    if (formattedDraft !== cssDraft) {
      setCssDraft(formattedDraft);
    }
    const updated = updateSvgCssBlocks(svgContent, formattedBlocks, hasMarkers);
    if (!updated) {
      setCssError("Unable to update SVG style block.");
      return;
    }
    const finalSvg = (await formatSvg(updated)) || updated;
    if (finalSvg === svgContent) {
      setCssNotice("CSS is already up to date.");
      setCssError(null);
      return;
    }
    onApply(finalSvg);
    setCssNotice("Applied CSS updates.");
    setCssError(null);
  };

  if (!isAdvanced) return null;

  return (
    <details
      className={`${styles.cssCard} ${styles.collapsibleDisclosure}`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className={styles.collapsibleSummary}>
        <div className={styles.collapsibleTitle}>
          <span className={styles.collapsibleIcon} aria-hidden="true" />
          <h4>SVG CSS</h4>
        </div>
        <div className={styles.collapsibleMeta}>
          <span className={styles.cssBadge}>{cssRuleCount}</span>
          <span className={styles.collapsibleHint}>
            {isOpen ? "Click to collapse" : "Click to expand"}
          </span>
        </div>
      </summary>
      {isOpen && (
        <div className={styles.collapsibleBody}>
          <p className={styles.cssHint}>
            Edit the embedded <code>{"<style>"}</code> block. If the SVG has no
            styles yet, add rules here and apply to create one.
          </p>
          {embeddedCssBlocks.length > 1 && (
            <div className={styles.selectionHint}>
              Multiple style blocks detected. Use the markers in the editor to
              keep block separation.
            </div>
          )}
          <div className={styles.cssActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleFormat}
              disabled={!cssDraft.trim()}
            >
              Format
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleReset}
              disabled={cssDraft === embeddedCss}
            >
              Reset
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleApply}
            >
              Apply CSS
            </button>
          </div>
          <div ref={cssContainerRef} className={styles.cssEditorHost} />
          {!embeddedCss.trim() && !cssDraft.trim() && (
            <div className={styles.selectionHint}>No embedded CSS found yet.</div>
          )}
          {cssError && <div className={styles.error}>{cssError}</div>}
          {cssNotice && <div className={styles.notice}>{cssNotice}</div>}
        </div>
      )}
    </details>
  );
};
