import React from "react";
import { FileUpload } from "../FileUpload/FileUpload";
import { TemplateUpload } from "../TemplateUpload/TemplateUpload";
import { usePreviousRunLoader } from "../../hooks/usePreviousRunLoader";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import Icon from "../Icon/Icon";
import styles from "../../styles/App.module.css";

export const UploadStep: React.FC = () => {
  const { hasPreviousRun, handleUseLastUsed } = usePreviousRunLoader();
  const { csvData, svgTemplate, setCurrentStep } = useAppStore(
    useShallow((state) => ({
      csvData: state.csvData,
      svgTemplate: state.svgTemplate,
      setCurrentStep: state.setCurrentStep,
    })),
  );

  const hasCsvUpload = csvData !== null;
  const hasTemplateUpload = svgTemplate !== null;
  const canContinue = hasCsvUpload && hasTemplateUpload;

  return (
    <div className={styles.uploadStep}>
      <section className={styles.uploadStage} aria-label="Upload workflow">
        <div className={styles.uploadStageHeader}>
          <div className={styles.uploadStageText}>
            <p className={styles.uploadStageEyebrow}>Step 1 Workflow</p>
            <h3 className={styles.uploadStageTitle}>Load source files side by side</h3>
            <p className={styles.uploadStageDescription}>
              Start with CSV data and an SVG template. Continue only after both
              files are uploaded or selected from history.
            </p>
          </div>
          <div className={styles.uploadStageAside}>
            <div
              className={styles.uploadStageChecklist}
              role="list"
              aria-label="Upload readiness"
            >
              <span
                role="listitem"
                className={`${styles.uploadStageCheck} ${
                  hasCsvUpload ? styles.uploadStageCheckDone : styles.uploadStageCheckPending
                }`}
              >
                <Icon name={hasCsvUpload ? "check" : "close"} size={12} />
                CSV loaded
              </span>
              <span
                role="listitem"
                className={`${styles.uploadStageCheck} ${
                  hasTemplateUpload
                    ? styles.uploadStageCheckDone
                    : styles.uploadStageCheckPending
                }`}
              >
                <Icon name={hasTemplateUpload ? "check" : "close"} size={12} />
                SVG template loaded
              </span>
              <span
                role="listitem"
                className={`${styles.uploadStageCheck} ${
                  canContinue ? styles.uploadStageCheckDone : styles.uploadStageCheckPending
                }`}
              >
                <Icon name={canContinue ? "check" : "close"} size={12} />
                Editor unlocked
              </span>

              {hasPreviousRun && (
                <button
                  type="button"
                  className={styles.reuseRunAction}
                  onClick={handleUseLastUsed}
                >
                  Reuse Previous Run
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.uploadCoreGrid}>
          <div className={styles.uploadCoreColumn}>
            <FileUpload />
          </div>
          <div className={styles.uploadCoreColumn}>
            <TemplateUpload />
          </div>
        </div>

        <div className={styles.uploadStageFooter}>
          <p
            className={`${styles.uploadStageHint} ${
              canContinue ? styles.uploadStageHintReady : styles.uploadStageHintBlocked
            }`}
          >
            {canContinue
              ? "Both files are loaded. Continue to edit placeholders and styling."
              : "Upload or select both CSV and SVG files to continue."}
          </p>
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.uploadContinueButton}`}
            onClick={() => {
              if (canContinue) {
                setCurrentStep("edit");
              }
            }}
            disabled={!canContinue}
          >
            Continue To Template Editing
          </button>
        </div>
      </section>
    </div>
  );
};
