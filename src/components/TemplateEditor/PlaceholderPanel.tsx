import React, { useEffect, useMemo, useRef, useState } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { xml } from "@codemirror/lang-xml";
import { indentOnInput } from "@codemirror/language";
import {
  EditorView,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import Icon from "../Icon/Icon";
import type { PlaceholderBlock, Rect } from "./types";
import styles from "./TemplateEditor.module.css";
import { DeletePlaceholderModal } from "./DeletePlaceholderModal";
import { formatSvg } from "./helpers";
import { useCodeMirrorEditor } from "./hooks/useCodeMirrorEditor";
import { useCodeMirrorSync } from "./hooks/useCodeMirrorSync";
import { SYNTAX_HIGHLIGHTING } from "./syntaxHighlighting";

type PlaceholderPanelProps = {
  panel: {
    shouldShow: boolean;
    status: string;
    hint: string;
    isAdvanced: boolean;
  };
  selection: {
    rect: Rect | null;
    onChangeValue: (
      key: "x" | "y" | "width" | "height",
      value: number,
    ) => void;
  };
  fields: {
    placeholderName: string;
    onPlaceholderNameChange: (value: string) => void;
    previewText: string;
    onPreviewTextChange: (value: string) => void;
    isTextPlaceholder: boolean;
    fontSizeInput: string;
    onFontSizeChange: (value: string) => void;
  };
  code: {
    selectedCode: string | null;
    onSelectedCodeChange: (value: string | null) => void;
    blockTemplate: string;
    onBlockTemplateChange: (value: string) => void;
    markSyncFromCode: () => void;
  };
  feedback: {
    error: string | null;
    notice: string | null;
  };
  editing: {
    isActive: boolean;
    selectedPlaceholder: PlaceholderBlock | null;
    onUpdate: () => void;
    onCancel: () => void;
    onConfirmDelete: () => void;
  };
  inserting: {
    isActive: boolean;
    onInsert: () => void;
    onCancel: () => void;
  };
};

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  panel,
  selection,
  fields,
  code,
  feedback,
  editing,
  inserting,
}) => {
  const { shouldShow, status, hint, isAdvanced } = panel;
  const { rect, onChangeValue } = selection;
  const {
    placeholderName,
    onPlaceholderNameChange,
    previewText,
    onPreviewTextChange,
    isTextPlaceholder,
    fontSizeInput,
    onFontSizeChange,
  } = fields;
  const {
    selectedCode,
    onSelectedCodeChange,
    blockTemplate,
    onBlockTemplateChange,
    markSyncFromCode,
  } = code;
  const { error, notice } = feedback;
  const [selectedCodeOpenForId, setSelectedCodeOpenForId] = useState<
    string | null
  >(null);
  const [showBlockTemplate, setShowBlockTemplate] = useState(false);
  const [deleteModalForId, setDeleteModalForId] = useState<string | null>(null);
  const selectedCodeContainerRef = useRef<HTMLDivElement | null>(null);
  const blockTemplateContainerRef = useRef<HTMLDivElement | null>(null);
  const activePlaceholderId = editing.selectedPlaceholder?.id ?? null;
  const isSelectedCodeOpen =
    selectedCodeOpenForId !== null &&
    selectedCodeOpenForId === activePlaceholderId;
  const isDeleteModalOpen =
    deleteModalForId !== null && deleteModalForId === activePlaceholderId;

  const selectedCodeExtensions = useMemo(
    () => [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      indentOnInput(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      SYNTAX_HIGHLIGHTING,
      xml(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          markSyncFromCode();
          onSelectedCodeChange(update.state.doc.toString());
        }
      }),
    ],
    [markSyncFromCode, onSelectedCodeChange],
  );

  const blockTemplateExtensions = useMemo(
    () => [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      indentOnInput(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      SYNTAX_HIGHLIGHTING,
      xml(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onBlockTemplateChange(update.state.doc.toString());
        }
      }),
    ],
    [onBlockTemplateChange],
  );

  const selectedCodeViewRef = useCodeMirrorEditor({
    isActive: isSelectedCodeOpen,
    containerRef: selectedCodeContainerRef,
    initialDoc: selectedCode ?? "",
    extensions: selectedCodeExtensions,
  });

  const blockTemplateViewRef = useCodeMirrorEditor({
    isActive: showBlockTemplate,
    containerRef: blockTemplateContainerRef,
    initialDoc: blockTemplate,
    extensions: blockTemplateExtensions,
  });

  useCodeMirrorSync({
    viewRef: selectedCodeViewRef,
    value: selectedCode,
  });

  useCodeMirrorSync({
    viewRef: blockTemplateViewRef,
    value: blockTemplate,
    preserveSelection: true,
  });

  useEffect(() => {
    if (!isSelectedCodeOpen) return;
    void (async () => {
      if (!selectedCode?.trim()) return;
      const formatted = await formatSvg(selectedCode);
      if (formatted !== selectedCode) {
        onSelectedCodeChange(formatted);
      }
    })();
  }, [isSelectedCodeOpen, onSelectedCodeChange, selectedCode]);

  const handleDelete = () => {
    if (!activePlaceholderId) return;
    setDeleteModalForId(activePlaceholderId);
  };
  const handleCloseDelete = () => setDeleteModalForId(null);
  const handleConfirmDelete = () => {
    editing.onConfirmDelete();
    setDeleteModalForId(null);
  };

  return (
    <>
      <details
        className={`${styles.formCard} ${styles.collapsibleDisclosure}`}
        open={shouldShow}
      >
        <summary
          className={`${styles.collapsibleSummary} ${
            !shouldShow ? styles.collapsibleSummaryDisabled : ""
          }`}
          aria-disabled={!shouldShow}
          onClick={(event) => {
            if (!shouldShow) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <div className={styles.collapsibleTitle}>
            <span className={styles.collapsibleIcon} aria-hidden="true" />
            <h4>Add Placeholder</h4>
          </div>
          <div className={styles.collapsibleMeta}>
            <span
              className={`${styles.placeholderStatusChip} ${
                editing.isActive
                  ? styles.placeholderStatusEditing
                  : inserting.isActive
                    ? styles.placeholderStatusReady
                    : styles.placeholderStatusIdle
              }`}
            >
              {status}
            </span>
            <span className={styles.collapsibleHint}>{hint}</span>
          </div>
        </summary>
        {shouldShow && (
          <div className={styles.collapsibleBody}>
            <p>
              {editing.isActive
                ? "Adjust the placeholder bounds and update the existing block."
                : "Draw a region, name the placeholder, and insert the block."}
            </p>
            <div className={styles.quickHintRow}>
              <span className={styles.quickHintChip}>
                Enter: {editing.isActive ? "Update" : "Insert"}
              </span>
              <span className={styles.quickHintChip}>Esc: Cancel</span>
              <span className={styles.quickHintChip}>Arrows: Nudge</span>
              <span className={styles.quickHintChip}>Shift+Arrows: Resize</span>
              <span className={styles.quickHintChip}>1/2/3: Tool switch</span>
            </div>

            {rect ? (
              <div className={styles.selectionFields}>
                <label>
                  X
                  <input
                    type="number"
                    value={rect.x}
                    onChange={(e) =>
                      onChangeValue("x", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={rect.y}
                    onChange={(e) =>
                      onChangeValue("y", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  Width
                  <input
                    type="number"
                    value={rect.width}
                    onChange={(e) =>
                      onChangeValue("width", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  Height
                  <input
                    type="number"
                    value={rect.height}
                    onChange={(e) =>
                      onChangeValue("height", Number(e.target.value))
                    }
                  />
                </label>
              </div>
            ) : (
              <div className={styles.selectionHint}>
                Drag on the SVG to define a placeholder region.
              </div>
            )}

            <div className={styles.placeholderHeaderRow}>
              <label
                className={`${styles.placeholderLabel} ${
                  styles.placeholderLabelInfo
                }`}
              >
                <span className={styles.placeholderLabelText}>
                  Placeholder Name
                  <span
                    className={styles.placeholderInfoIcon}
                    aria-hidden="true"
                  >
                    <Icon name="infoOutline" size={14} />
                  </span>
                  <span className={styles.infoTooltip}>
                    Placeholder values map to CSV columns in the next step.
                  </span>
                </span>
                <input
                  type="text"
                  placeholder="placeholderValue"
                  value={placeholderName}
                  onChange={(e) => onPlaceholderNameChange(e.target.value)}
                />
              </label>
              {isTextPlaceholder && (
                <label className={styles.placeholderLabel}>
                  Preview Text
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => onPreviewTextChange(e.target.value)}
                  />
                </label>
              )}
            </div>

            {isTextPlaceholder && (
              <div className={styles.styleSection}>
                <div className={styles.styleRow}>
                  <label className={styles.placeholderLabel}>
                    Font Size
                    <input
                      type="text"
                      placeholder="16px"
                      value={fontSizeInput}
                      onChange={(e) => onFontSizeChange(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}

            {isAdvanced &&
              (editing.isActive ? (
                <details
                  className={styles.codeDisclosure}
                  open={isSelectedCodeOpen}
                  onToggle={(event) =>
                    setSelectedCodeOpenForId(
                      event.currentTarget.open && activePlaceholderId
                        ? activePlaceholderId
                        : null,
                    )
                  }
                >
                  <summary className={styles.codeSummary}>
                    <div className={styles.codeSummaryTitle}>
                      <span className={styles.codeChevron} aria-hidden="true" />
                      Placeholder Markup
                    </div>
                    <span className={styles.codeSummaryHint}>
                      {isSelectedCodeOpen
                        ? "Click to collapse"
                        : "Click to expand"}
                    </span>
                  </summary>
                  <div className={styles.codeBody}>
                    {selectedCode ? (
                      <>
                        <label className={styles.placeholderLabel}>
                          Selected Placeholder Markup
                          <div
                            ref={selectedCodeContainerRef}
                            className={styles.blockTemplateEditor}
                          />
                        </label>
                      </>
                    ) : (
                      <div className={styles.selectionHint}>
                        No placeholder markup selected.
                      </div>
                    )}
                  </div>
                </details>
              ) : (
                <details
                  className={styles.codeDisclosure}
                  open={showBlockTemplate}
                  onToggle={(event) =>
                    setShowBlockTemplate(event.currentTarget.open)
                  }
                >
                  <summary className={styles.codeSummary}>
                    <div className={styles.codeSummaryTitle}>
                      <span className={styles.codeChevron} aria-hidden="true" />
                      Custom Placeholder Markup
                    </div>
                    <span className={styles.codeSummaryHint}>
                      {showBlockTemplate
                        ? "Click to collapse"
                        : "Click to expand"}
                    </span>
                  </summary>
                  <div className={styles.codeBody}>
                    <label className={styles.placeholderLabel}>
                      Custom Block Template
                      <div
                        ref={blockTemplateContainerRef}
                        className={styles.blockTemplateEditor}
                      />
                    </label>
                    <details className={styles.tokenDisclosure}>
                      <summary className={styles.tokenSummary}>
                        <div className={styles.tokenSummaryTitle}>
                          <span
                            className={styles.tokenChevron}
                            aria-hidden="true"
                          />
                          Placeholder Tokens
                        </div>
                        <span className={styles.tokenSummaryHint}>
                          Click to expand
                        </span>
                      </summary>
                      <div className={styles.tokenBody}>
                        <div className={styles.tokenList}>
                          <div>
                            <code>{"{{name}}"}</code> Sets the element{" "}
                            <code>id</code> and class name.
                          </div>
                          <div>
                            <code>{"{{placeholder}}"}</code> Inserts the data
                            token, like <code>{"{{attack_1}}"}</code>.
                          </div>
                          <div>
                            <code>{"{{x}}"}</code>, <code>{"{{y}}"}</code>{" "}
                            Position of the placeholder.
                          </div>
                          <div>
                            <code>{"{{width}}"}</code>,{" "}
                            <code>{"{{height}}"}</code> Size of the placeholder.
                          </div>
                        </div>
                        <div className={styles.helperNote}>
                          The placeholder name becomes the <code>id</code>, the
                          <code>div</code> class, and the{" "}
                          <code>{"{{placeholder}}"}</code> token.
                        </div>
                      </div>
                    </details>
                  </div>
                </details>
              ))}

            {error && <div className={styles.error}>{error}</div>}
            {notice && <div className={styles.notice}>{notice}</div>}

            {editing.isActive ? (
              <div className={styles.actionRow}>
                <button
                  className={styles.primaryButton}
                  onClick={editing.onUpdate}
                  disabled={!rect || !editing.selectedPlaceholder}
                >
                  Update Placeholder
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={editing.onCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.dangerIconButton}
                  onClick={handleDelete}
                  aria-label="Delete placeholder"
                  title="Delete placeholder"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ) : (
              <div className={styles.actionRow}>
                <button
                  className={styles.primaryButton}
                  onClick={inserting.onInsert}
                  disabled={!rect || !placeholderName.trim()}
                >
                  Insert Placeholder
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={inserting.onCancel}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </details>
      <DeletePlaceholderModal
        isOpen={isDeleteModalOpen}
        placeholderName={editing.selectedPlaceholder?.name}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
