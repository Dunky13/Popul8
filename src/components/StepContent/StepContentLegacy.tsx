import React, { Suspense, lazy } from "react";
import { useAppStore } from "../../store/appStore";
import { DataMapping as DataMappingLegacy } from "../DataMapping/DataMappingLegacy";
import { PageGrid as PageGridLegacy } from "../PageGrid/PageGridLegacy";
import { RowSelection as RowSelectionLegacy } from "../RowSelection/RowSelectionLegacy";
import { UploadStep as UploadStepLegacy } from "../UploadStep/UploadStepLegacy";
import styles from "../../styles/AppLegacy.module.css";

const TemplateEditorLegacy = lazy(() =>
  import("../TemplateEditor/TemplateEditorLegacy").then((module) => ({
    default: module.TemplateEditor,
  })),
);

export const StepContent: React.FC = () => {
  const currentStep = useAppStore((state) => state.currentStep);

  const wrapStep = (step: string, children: React.ReactNode) => (
    <section
      key={step}
      className={styles.stepStage}
      data-step={step}
      aria-live="polite"
    >
      {children}
    </section>
  );

  switch (currentStep) {
    case "upload":
      return wrapStep(
        "upload",
        <div className={styles.stepContent}>
          <UploadStepLegacy />
        </div>,
      );
    case "edit":
      return wrapStep(
        "edit",
        <div className={styles.stepContent}>
          <Suspense fallback={<div className={styles.notReady}>Loading editor…</div>}>
            <TemplateEditorLegacy />
          </Suspense>
        </div>,
      );
    case "mapping":
      return wrapStep(
        "mapping",
        <div className={styles.stepContent}>
          <DataMappingLegacy />
        </div>,
      );
    case "select":
      return wrapStep(
        "select",
        <div className={`${styles.stepContent} ${styles.stepContentWide}`}>
          <RowSelectionLegacy />
        </div>,
      );
    case "preview":
      return wrapStep(
        "preview",
        <div className={styles.stepContent}>
          <PageGridLegacy />
        </div>,
      );
    default:
      return null;
  }
};
