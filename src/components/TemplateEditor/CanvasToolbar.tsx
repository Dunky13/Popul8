import React from "react";
import Icon from "../Icon/Icon";
import styles from "./TemplateEditor.module.css";

type CanvasToolbarProps = {
  tool: {
    active: "select" | "text" | "image";
    onSelect: () => void;
    onText: () => void;
    onImage: () => void;
  };
  zoom: {
    level: number;
    onZoomOut: () => void;
    onZoomIn: () => void;
  };
};

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  tool,
  zoom,
}) => {
  const { active: activeTool, onSelect, onText, onImage } = tool;
  const { level: zoomLevel, onZoomOut, onZoomIn } = zoom;
  return (
    <div className={styles.canvasToolbar}>
      <div className={styles.toolGroup}>
        <button
          type="button"
          className={`${styles.toolButton} ${
            activeTool === "select" ? styles.toolButtonActive : ""
          }`}
          onClick={onSelect}
          aria-label="Pointer tool (1)"
          title="Pointer tool (1)"
        >
          <Icon name="mouse" size={18} />
        </button>
        <button
          type="button"
          className={`${styles.toolButton} ${
            activeTool === "text" ? styles.toolButtonActive : ""
          }`}
          onClick={onText}
          aria-label="Text tool (2)"
          title="Text tool (2)"
        >
          <Icon name="textFields" size={18} />
        </button>
        <button
          type="button"
          className={`${styles.toolButton} ${
            activeTool === "image" ? styles.toolButtonActive : ""
          }`}
          onClick={onImage}
          aria-label="Image tool (3)"
          title="Image tool (3)"
        >
          <Icon name="image" size={18} />
        </button>
      </div>
      <div className={styles.toolGroup}>
        <button
          type="button"
          className={styles.toolButton}
          onClick={onZoomOut}
          aria-label="Zoom out (-)"
          title="Zoom out (-)"
        >
          <Icon name="zoomOut" size={18} />
        </button>
        <div className={styles.zoomLabel}>{Math.round(zoomLevel * 100)}%</div>
        <button
          type="button"
          className={styles.toolButton}
          onClick={onZoomIn}
          aria-label="Zoom in (+)"
          title="Zoom in (+)"
        >
          <Icon name="zoomIn" size={18} />
        </button>
      </div>
      <div className={styles.toolbarHints} aria-hidden="true">
        <span className={styles.toolbarHintChip}>1/2/3 tools</span>
        <span className={styles.toolbarHintChip}>Arrows nudge</span>
        <span className={styles.toolbarHintChip}>Shift+Arrows resize</span>
        <span className={styles.toolbarHintChip}>+/- zoom</span>
        <span className={styles.toolbarHintChip}>Esc cancel</span>
      </div>
    </div>
  );
};
