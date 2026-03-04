import React, { Suspense, lazy } from "react";
import { useAppStore } from "../../store/appStore";
import { DataMapping } from "../DataMapping/DataMapping";
import { PageGrid } from "../PageGrid/PageGrid";
import { RowSelection } from "../RowSelection/RowSelection";
import { UploadStep } from "../UploadStep/UploadStep";
import styles from "../../styles/App.module.css";

const TemplateEditor = lazy(() =>
  import("../TemplateEditor/TemplateEditor").then((module) => ({
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
          <UploadStep />
        </div>,
      );
    case "edit":
      return wrapStep(
        "edit",
        <div className={styles.stepContent}>
          <Suspense fallback={<div className={styles.notReady}>Loading editor…</div>}>
            <TemplateEditor />
          </Suspense>
        </div>,
      );
    case "mapping":
      return wrapStep(
        "mapping",
        <div className={styles.stepContent}>
          <DataMapping />
        </div>,
      );
    case "select":
      return wrapStep(
        "select",
        <div className={`${styles.stepContent} ${styles.stepContentWide}`}>
          <RowSelection />
        </div>,
      );
    case "preview":
      return wrapStep(
        "preview",
        <div className={styles.stepContent}>
          <PageGrid />
        </div>,
      );
    default:
      return null;
  }
};
