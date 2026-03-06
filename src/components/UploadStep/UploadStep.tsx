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
  const hasAutoLoadedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasAutoLoadedRef.current) return;
    if (!hasPreviousRun) return;
    if (canContinue) return;

    hasAutoLoadedRef.current = true;
    void handleUseLastUsed();
  }, [canContinue, handleUseLastUsed, hasPreviousRun]);

  return (
    <div className={styles.uploadStep}>
      <section className={styles.uploadStage} aria-label="Upload workflow">
        <div className={styles.uploadStageHeader}>
          <div className={styles.uploadStageText}>
            <p className={styles.uploadStageEyebrow}>Source files</p>
            <h3 className={styles.uploadStageTitle}>
              Load the CSV and template
            </h3>
            <p className={styles.uploadStageDescription}>
              Upload the CSV dataset and SVG template first. File history and
              previous-run reuse stay available inside each panel.
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
                  hasCsvUpload
                    ? styles.uploadStageCheckDone
                    : styles.uploadStageCheckPending
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
                  canContinue
                    ? styles.uploadStageCheckDone
                    : styles.uploadStageCheckPending
                }`}
              >
                <Icon name={canContinue ? "check" : "close"} size={12} />
                Ready for editor
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
              canContinue
                ? styles.uploadStageHintReady
                : styles.uploadStageHintBlocked
            }`}
          >
            {canContinue
              ? "Both source files are ready. Continue to the template workspace."
              : "Load both source files before opening the template workspace."}
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
            Open Template Workspace
          </button>
        </div>
      </section>
    </div>
  );
};
