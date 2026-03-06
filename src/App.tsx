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
import { useDefaultMappingSync } from "./hooks/useDefaultMappingSync";
import type { StepId } from "./types/app";
import Icon from "./components/Icon/Icon";
import styles from "./styles/App.module.css";
import { posthog } from "./lib/posthog";

const STEP_COPY: Record<
  StepId,
  { label: string; title: string; description: string }
> = {
  upload: {
    label: "Step 1 of 5",
    title: "Load Source Files",
    description:
      "Start with one CSV dataset and one SVG template. Reuse history stays available inside each upload panel.",
  },
  edit: {
    label: "Step 2 of 5",
    title: "Review The Template",
    description:
      "Refine placeholders, CSS, and typography in the editor before connecting any data fields.",
  },
  mapping: {
    label: "Step 3 of 5",
    title: "Connect Data Fields",
    description:
      "Match template placeholders to CSV columns and verify the sample values before continuing.",
  },
  select: {
    label: "Step 4 of 5",
    title: "Choose Output Rows",
    description:
      "Choose which CSV rows should generate cards and appear in the final print sheets.",
  },
  preview: {
    label: "Step 5 of 5",
    title: "Check Print Output",
    description:
      "Review generated cards, adjust the page layout, and print the final sheets.",
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
    isReadyForMapping,
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
      isReadyForMapping: state.isReadyForMapping,
      isReadyForPrint: state.isReadyForPrint,
    })),
  );

  const { showOfflineIndicator } = useOfflineStatus();
  const { themeMode, setThemeMode } = useThemeMode();
  const [isChecklistExpanded, setIsChecklistExpanded] = React.useState(false);

  useDefaultMappingSync();
  useSelectedRecords({ csvData, selectedRowIndices });
  useAppKeyboardShortcuts();

  const activeStep = STEP_COPY[currentStep];
  const placeholderCount = svgTemplate?.placeholders.length ?? 0;
  const mappedCount = svgTemplate
    ? svgTemplate.placeholders.filter((key) => Boolean(dataMapping[key])).length
    : 0;
  const selectedCount = selectedRowIndices.length;
  const hasCsvUpload = csvData !== null;
  const hasTemplateUpload = svgTemplate !== null;
  const readyForEdit = isReadyForEdit();
  const readyForMapping = isReadyForMapping();
  const readyForPreview = readyForMapping && placeholderCount === mappedCount;
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
          { label: "Template ready for mapping", done: readyForMapping },
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
          {
            label: "Preview can be opened",
            done: readyForPreview && selectedCount > 0,
          },
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
          label: readyForMapping
            ? "Continue To Data Mapping"
            : "Upload CSV To Start Mapping",
          helper: readyForMapping
            ? "Template and CSV are ready. Connect each placeholder to a column."
            : "Data mapping requires both an SVG template and a CSV dataset.",
          targetStep: "mapping",
          enabled: readyForMapping,
        };
      case "mapping":
        return {
          label: readyForPreview
            ? "Continue To Row Selection"
            : "Finish Mapping To Continue",
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

  const completedChecklistCount = flowChecklist.filter(
    (item) => item.done,
  ).length;
  const totalChecklistCount = flowChecklist.length;
  const stepSnapshot = (() => {
    switch (currentStep) {
      case "upload":
        return `${Number(hasCsvUpload) + Number(hasTemplateUpload)}/2 files loaded`;
      case "edit":
        return `${placeholderCount} placeholders detected`;
      case "mapping":
        return `${mappedCount}/${placeholderCount} fields mapped`;
      case "select":
        return `${selectedCount} rows selected`;
      case "preview":
        return `${records.length} cards ready`;
      default:
        return "";
    }
  })();

  const prevStepRef = React.useRef<StepId | null>(null);
  React.useEffect(() => {
    if (prevStepRef.current !== null && prevStepRef.current !== currentStep) {
      posthog.capture('step navigated', {
        from_step: prevStepRef.current,
        to_step: currentStep,
      });
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  React.useEffect(() => {
    if (currentStep === 'preview' && records.length > 0) {
      posthog.capture('cards generated', {
        record_count: records.length,
        placeholder_count: svgTemplate?.placeholders.length ?? 0,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  React.useEffect(() => {
    setIsChecklistExpanded(false);
  }, [currentStep]);

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
            <div className={styles.stepIntroTopRow}>
              <div className={styles.stepIntroLead}>
                <div className={styles.stepIntroMeta}>{activeStep.label}</div>
                <h2 className={styles.stepIntroTitle}>{activeStep.title}</h2>
                <p className={styles.stepIntroDescription}>
                  {activeStep.description}
                </p>
                <div className={styles.stepStatRow}>
                  <span className={styles.stepStat}>
                    {completedChecklistCount}/{totalChecklistCount} checks done
                  </span>
                  <span className={styles.stepStat}>{stepSnapshot}</span>
                </div>
              </div>
              <div
                className={styles.stepIntroChecklistRail}
                aria-label="Current step checklist"
              >
                {flowAction && (
                  <>
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
                  </>
                )}
                <div className={styles.stepIntroChecklistSummary}>
                  <div className={styles.stepIntroChecklistSummaryText}>
                    <p className={styles.stepIntroChecklistLabel}>
                      Checklist
                    </p>
                    <p className={styles.stepIntroChecklistProgress}>
                      {completedChecklistCount}/{totalChecklistCount} items done
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.stepIntroChecklistToggle}
                    aria-expanded={isChecklistExpanded}
                    aria-controls="current-step-checklist"
                    onClick={() => {
                      setIsChecklistExpanded((expanded) => !expanded);
                    }}
                  >
                    <Icon name="checklist" size={14} />
                    {isChecklistExpanded ? "Hide details" : "Show details"}
                  </button>
                </div>
              </div>
            </div>
            {isChecklistExpanded && (
              <ul
                id="current-step-checklist"
                className={styles.flowChecklist}
              >
                {flowChecklist.map((item) => (
                  <li
                    key={item.label}
                    className={`${styles.flowChecklistItem} ${
                      item.done
                        ? styles.flowChecklistDone
                        : styles.flowChecklistPending
                    }`}
                  >
                    <span
                      className={styles.flowChecklistIcon}
                      aria-hidden="true"
                    >
                      <Icon
                        name={item.done ? "check" : "close"}
                        size={14}
                      />
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <StepContent />
      </main>
    </div>
  );
};
