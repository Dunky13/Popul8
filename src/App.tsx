/**
 * Main application component
 */

import React from "react";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { AppMessages } from "./components/AppMessages/AppMessages";
import { StepContent } from "./components/StepContent/StepContent";
import { useAppStore } from "./store/appStore";
import { useShallow } from "zustand/react/shallow";
import { useOfflineStatus } from "./hooks/useOfflineStatus";
import { useSelectedRecords } from "./hooks/useSelectedRecords";
import { useAppKeyboardShortcuts } from "./hooks/useAppKeyboardShortcuts";
import { useThemeMode } from "./hooks/useThemeMode";
import type { StepId } from "./types/app";
import Icon from "./components/Icon/Icon";
import styles from "./styles/App.module.css";

const STEP_COPY: Record<
  StepId,
  { label: string; title: string; description: string }
> = {
  upload: {
    label: "Step 1",
    title: "Bring In Source Files",
    description:
      "Upload your CSV dataset and SVG template to start a complete generation run.",
  },
  edit: {
    label: "Step 2",
    title: "Tweak The Template",
    description:
      "Refine placeholders, CSS, and typography directly in the editor before mapping data.",
  },
  mapping: {
    label: "Step 3",
    title: "Map Data To Placeholders",
    description:
      "Connect template keys to CSV columns and validate the preview row before continuing.",
  },
  select: {
    label: "Step 4",
    title: "Select Records",
    description:
      "Choose the exact rows that should be rendered and included in final output pages.",
  },
  preview: {
    label: "Step 5",
    title: "Preview And Print",
    description:
      "Review generated cards, tune print layout, and export print-ready sheets.",
  },
};

type ChecklistItem = {
  label: string;
  done: boolean;
};

type FlowAction = {
  label: string;
  helper: string;
  targetStep: StepId;
  enabled: boolean;
};

export const App: React.FC = () => {
  const {
    csvData,
    selectedRowIndices,
    currentStep,
    svgTemplate,
    dataMapping,
    records,
    setCurrentStep,
    isReadyForEdit,
    isEditComplete,
    isReadyForMapping,
    isReadyForPreview,
    isReadyForPrint,
  } = useAppStore(
    useShallow((state) => ({
      csvData: state.csvData,
      selectedRowIndices: state.selectedRowIndices,
      currentStep: state.currentStep,
      svgTemplate: state.svgTemplate,
      dataMapping: state.dataMapping,
      records: state.records,
      setCurrentStep: state.setCurrentStep,
      isReadyForEdit: state.isReadyForEdit,
      isEditComplete: state.isEditComplete,
      isReadyForMapping: state.isReadyForMapping,
      isReadyForPreview: state.isReadyForPreview,
      isReadyForPrint: state.isReadyForPrint,
    })),
  );

  const { showOfflineIndicator } = useOfflineStatus();
  const { themeMode, setThemeMode } = useThemeMode();

  useSelectedRecords({ csvData, selectedRowIndices });
  useAppKeyboardShortcuts();

  const activeStep = STEP_COPY[currentStep];
  const rowCount = csvData?.rows.length ?? 0;
  const placeholderCount = svgTemplate?.placeholders.length ?? 0;
  const mappedCount = svgTemplate
    ? svgTemplate.placeholders.filter((key) => Boolean(dataMapping[key])).length
    : 0;
  const selectedCount = selectedRowIndices.length;
  const hasCsvUpload = csvData !== null;
  const hasTemplateUpload = svgTemplate !== null;
  const readyForEdit = isReadyForEdit();
  const editComplete = isEditComplete();
  const readyForMapping = isReadyForMapping();
  const readyForPreview = isReadyForPreview();
  const readyForPrint = isReadyForPrint();
  const hasRenderableRecords = records.length > 0;
  const isUploadStep = currentStep === "upload";

  const flowChecklist: ChecklistItem[] = (() => {
    switch (currentStep) {
      case "upload":
        return [
          { label: "CSV files loaded", done: hasCsvUpload },
          { label: "SVG template loaded", done: hasTemplateUpload },
          { label: "Editor unlocked", done: readyForEdit },
        ];
      case "edit":
        return [
          { label: "Template available", done: hasTemplateUpload },
          { label: "Placeholders detected", done: placeholderCount > 0 },
          { label: "Template ready for mapping", done: editComplete },
        ];
      case "mapping":
        return [
          { label: "Template + CSV loaded", done: readyForMapping },
          { label: "All placeholders mapped", done: readyForPreview },
          { label: "Selection step unlocked", done: readyForPreview },
        ];
      case "select":
        return [
          { label: "Mapping complete", done: readyForPreview },
          { label: "At least one row selected", done: selectedCount > 0 },
          { label: "Preview can be opened", done: readyForPreview && selectedCount > 0 },
        ];
      case "preview":
        return [
          { label: "Mapped data is valid", done: readyForPreview },
          { label: "Renderable cards generated", done: hasRenderableRecords },
          { label: "Print is ready", done: readyForPrint },
        ];
      default:
        return [];
    }
  })();

  const flowAction: FlowAction | null = (() => {
    switch (currentStep) {
      case "upload":
        return {
          label: hasTemplateUpload
            ? "Continue To Template Editing"
            : "Upload SVG To Continue",
          helper: hasTemplateUpload
            ? hasCsvUpload
              ? "Both files are loaded. Open the editor to refine placeholder regions."
              : "CSV can be uploaded now or right before mapping."
            : "The SVG template unlocks the editor and placeholder workflow.",
          targetStep: "edit",
          enabled: hasTemplateUpload,
        };
      case "edit":
        return {
          label: readyForMapping ? "Continue To Data Mapping" : "Upload CSV To Start Mapping",
          helper: readyForMapping
            ? "Template and CSV are ready. Connect each placeholder to a column."
            : "Data mapping requires both an SVG template and a CSV dataset.",
          targetStep: "mapping",
          enabled: readyForMapping,
        };
      case "mapping":
        return {
          label: readyForPreview ? "Continue To Row Selection" : "Finish Mapping To Continue",
          helper: readyForPreview
            ? "Mapping is complete. Pick the rows you want to generate."
            : `${Math.max(placeholderCount - mappedCount, 0)} placeholder${
                placeholderCount - mappedCount === 1 ? "" : "s"
              } still need mapping.`,
          targetStep: "select",
          enabled: readyForPreview,
        };
      case "select":
        return {
          label:
            readyForPreview && selectedCount > 0
              ? "Open Preview"
              : "Select Rows To Preview",
          helper:
            readyForPreview && selectedCount > 0
              ? "Preview is available with your current row selection."
              : "Select at least one row so cards can be generated.",
          targetStep: "preview",
          enabled: readyForPreview && selectedCount > 0,
        };
      default:
        return null;
    }
  })();

  return (
    <div className={styles.app}>
      {showOfflineIndicator && (
        <div className={styles.offlineIndicator}>
          <Icon name="wifiOff" size={16} />
          You&apos;re currently offline. Some features may be limited.
        </div>
      )}

      <AppHeader themeMode={themeMode} onThemeModeChange={setThemeMode} />
      <AppMessages />

      <main className={styles.main}>
        {!isUploadStep && (
          <section className={styles.stepIntro}>
            <div className={styles.stepIntroMeta}>{activeStep.label}</div>
            <h2 className={styles.stepIntroTitle}>{activeStep.title}</h2>
            <p className={styles.stepIntroDescription}>{activeStep.description}</p>
            <div className={styles.stepStatRow}>
              <span className={styles.stepStat}>{rowCount} rows</span>
              <span className={styles.stepStat}>{placeholderCount} placeholders</span>
              <span className={styles.stepStat}>{mappedCount} mapped</span>
              <span className={styles.stepStat}>{selectedCount} selected</span>
            </div>
          </section>
        )}

        {!isUploadStep && (
          <section className={styles.flowCoach} aria-label="Current step checklist">
            <div className={styles.flowCoachHeader}>
              <h3 className={styles.flowCoachTitle}>Step Checklist</h3>
              <p className={styles.flowCoachDescription}>
                Complete each item, then move forward with the guided action.
              </p>
            </div>
            <ul className={styles.flowChecklist}>
              {flowChecklist.map((item) => (
                <li
                  key={item.label}
                  className={`${styles.flowChecklistItem} ${
                    item.done ? styles.flowChecklistDone : styles.flowChecklistPending
                  }`}
                >
                  <span className={styles.flowChecklistIcon} aria-hidden="true">
                    <Icon name={item.done ? "check" : "close"} size={14} />
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            {flowAction && (
              <div className={styles.flowActionRow}>
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.flowActionButton}`}
                  disabled={!flowAction.enabled}
                  onClick={() => {
                    if (flowAction.enabled) {
                      setCurrentStep(flowAction.targetStep);
                    }
                  }}
                >
                  {flowAction.label}
                </button>
                <p
                  className={`${styles.flowActionHelper} ${
                    flowAction.enabled
                      ? styles.flowActionHelperReady
                      : styles.flowActionHelperBlocked
                  }`}
                >
                  {flowAction.helper}
                </p>
              </div>
            )}
          </section>
        )}

        <StepContent />
      </main>
    </div>
  );
};
