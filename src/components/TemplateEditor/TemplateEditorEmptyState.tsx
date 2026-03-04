import React from "react";
import { useAppStore } from "../../store/appStore";
import styles from "./TemplateEditor.module.css";

export const TemplateEditorEmptyState: React.FC = () => {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  return (
    <div className={styles.emptyState}>
      <h3>Upload an SVG template to start editing</h3>
      <p>
        Once an SVG is uploaded, you can select regions and insert placeholder
        blocks.
      </p>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={() => setCurrentStep("upload")}
      >
        Go To Upload
      </button>
    </div>
  );
};
