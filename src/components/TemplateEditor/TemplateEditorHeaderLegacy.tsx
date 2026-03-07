import React from "react";
import Icon from "../Icon/Icon";
import styles from "./TemplateEditorLegacy.module.css";

type TemplateEditorHeaderProps = {
  stats: {
    fileName: string;
    placeholderCount: number;
    elementIdCount: number;
  };
  view: {
    isAdvanced: boolean;
    viewMode: "visual" | "code";
    onToggleAdvanced: (value: boolean) => void;
    onSetViewMode: (mode: "visual" | "code") => void;
  };
  actions: {
    onDownload: () => void;
  };
  history: {
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  };
};

export const TemplateEditorHeader: React.FC<TemplateEditorHeaderProps> = ({
  stats,
  view,
  actions,
  history,
}) => {
  const { fileName, placeholderCount, elementIdCount } = stats;
  const { isAdvanced, viewMode, onToggleAdvanced, onSetViewMode } = view;
  const { onDownload } = actions;
  const { onUndo, onRedo, canUndo, canRedo } = history;
  return (
    <div className={styles.editorHeader}>
      <div className={styles.headerIntro}>
        <h3>Template Editor</h3>
        <p>
          Draw a region on the canvas, assign a placeholder name, and tune styles
          before mapping data.
        </p>
      </div>
      <div className={styles.snapshotInline}>
        <div className={styles.statsGrid}>
          <div>
            <span className={styles.statLabel}>File</span>
            <span className={styles.statValue}>{fileName}</span>
          </div>
          <div>
            <span className={styles.statLabel}>Placeholders</span>
            <span className={styles.statValue}>{placeholderCount}</span>
          </div>
          <div>
            <span className={styles.statLabel}>Element IDs</span>
            <span className={styles.statValue}>{elementIdCount}</span>
          </div>
        </div>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.secondaryButton} onClick={onDownload}>
          <span className={styles.buttonIcon} aria-hidden="true">
            <Icon name="download" size={16} />
          </span>
          Export SVG
        </button>
        <label className={styles.advancedToggle}>
          <input
            type="checkbox"
            checked={isAdvanced}
            onChange={(event) => onToggleAdvanced(event.target.checked)}
          />
          <span>Advanced controls</span>
        </label>
        {isAdvanced && (
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleButton} ${
                viewMode === "visual" ? styles.toggleActive : ""
              }`}
              onClick={() => onSetViewMode("visual")}
            >
              <span className={styles.buttonIcon} aria-hidden="true">
                <Icon name="visibility" size={16} />
              </span>
              Visual
            </button>
            <button
              className={`${styles.toggleButton} ${
                viewMode === "code" ? styles.toggleActive : ""
              }`}
              onClick={() => onSetViewMode("code")}
            >
              <span className={styles.buttonIcon} aria-hidden="true">
                <Icon name="code" size={16} />
              </span>
              Code
            </button>
          </div>
        )}
      </div>
      <div className={styles.historyActions}>
        <button
          className={styles.secondaryButton}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <span className={styles.buttonIcon} aria-hidden="true">
            <Icon name="undo" size={16} />
          </span>
          Undo
        </button>
        <button
          className={styles.secondaryButton}
          onClick={onRedo}
          disabled={!canRedo}
        >
          <span className={styles.buttonIcon} aria-hidden="true">
            <Icon name="redo" size={16} />
          </span>
          Redo
        </button>
      </div>
    </div>
  );
};
