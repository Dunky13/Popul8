import React, { useEffect, useMemo, useState } from "react";
import SVG from "react-inlinesvg";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { getMissingFonts } from "../../utils/svgFonts";
import {
  ADVANCED_SETTINGS_UPDATED_EVENT,
  readAdvancedEditorSettings,
  shouldAutoLoadMissingFonts,
} from "../../utils/editorPreferences";
import type { StepId } from "../../types/app";
import type { ThemeMode } from "../../hooks/useThemeMode";
import { ThemeSwitcher } from "../ThemeSwitcher/ThemeSwitcher";
import styles from "../../styles/App.module.css";

const APP_LOGO_URL = "/branding/popul8-logo.svg";

type StepBadgeTone = "default" | "error";

type StepButtonProps = {
  step: StepId;
  display: {
    index: number;
    label: string;
    detail: string;
    badge?: string;
    badgeTone?: StepBadgeTone;
  };
  state: {
    isActive: boolean;
    isCompleted: boolean;
    isAvailable: boolean;
    isReady: boolean;
  };
  onActivate: (step: StepId) => void;
};

type AppHeaderProps = {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
};

const STEP_ITEMS: Array<{
  step: StepId;
  label: string;
  detail: string;
}> = [
  {
    step: "upload",
    label: "Upload",
    detail: "Source files",
  },
  {
    step: "edit",
    label: "Template",
    detail: "Review layout",
  },
  {
    step: "mapping",
    label: "Mapping",
    detail: "Connect fields",
  },
  {
    step: "select",
    label: "Selection",
    detail: "Output rows",
  },
  {
    step: "preview",
    label: "Preview",
    detail: "Print sheets",
  },
];

const StepButton: React.FC<StepButtonProps> = ({
  step,
  display,
  state,
  onActivate,
}) => {
  const { index, label, detail, badge, badgeTone = "default" } = display;
  const { isActive, isCompleted, isAvailable, isReady } = state;
  const readyBadge =
    badge ?? (isCompleted ? "Done" : isReady ? "Ready" : undefined);
  const badgeClassName = badgeTone === "error" ? styles.stepBadgeError : "";

  return (
    <button
      type="button"
      className={`${styles.stepButton} ${isActive ? styles.active : ""} ${
        isCompleted && !isActive ? styles.completed : ""
      } ${isReady && !isActive ? styles.ready : ""}`}
      onClick={() => {
        if (isAvailable) {
          onActivate(step);
        }
      }}
      disabled={!isAvailable}
      aria-current={isActive ? "step" : undefined}
    >
      <div className={styles.stepTopRow}>
        <div className={styles.stepLead}>
          <span className={styles.stepIcon} aria-hidden="true">
            {index}
          </span>
          <span className={styles.stepLabel}>{label}</span>
        </div>
        <div className={styles.stepStatus}>
          {readyBadge && !isActive && (
            <span className={`${styles.stepBadge} ${badgeClassName}`}>
              {readyBadge}
            </span>
          )}
        </div>
      </div>
      <span className={styles.stepDetail}>{detail}</span>
    </button>
  );
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  themeMode,
  onThemeModeChange,
}) => {
  const [advancedSettings, setAdvancedSettings] = useState(
    readAdvancedEditorSettings,
  );
  const {
    currentStep,
    selectedRowIndices,
    svgTemplate,
    dataMapping,
    csvData,
    isReadyForEdit,
    isEditComplete,
    isReadyForSelection,
    isReadyForMapping,
    isReadyForPrint,
  } = useAppStore(
    useShallow((state) => ({
      currentStep: state.currentStep,
      selectedRowIndices: state.selectedRowIndices,
      svgTemplate: state.svgTemplate,
      dataMapping: state.dataMapping,
      csvData: state.csvData,
      isReadyForEdit: state.isReadyForEdit,
      isEditComplete: state.isEditComplete,
      isReadyForSelection: state.isReadyForSelection,
      isReadyForMapping: state.isReadyForMapping,
      isReadyForPrint: state.isReadyForPrint,
    })),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncAdvancedSettings = () => {
      setAdvancedSettings(readAdvancedEditorSettings());
    };
    window.addEventListener("storage", syncAdvancedSettings);
    window.addEventListener(
      ADVANCED_SETTINGS_UPDATED_EVENT,
      syncAdvancedSettings,
    );
    return () => {
      window.removeEventListener("storage", syncAdvancedSettings);
      window.removeEventListener(
        ADVANCED_SETTINGS_UPDATED_EVENT,
        syncAdvancedSettings,
      );
    };
  }, []);

  const missingFontCount = svgTemplate
    ? getMissingFonts(svgTemplate.content).length
    : 0;
  const warningFontCount = shouldAutoLoadMissingFonts(advancedSettings)
    ? 0
    : missingFontCount;

  const mappedPlaceholders = useMemo(() => {
    if (!svgTemplate) return 0;
    return svgTemplate.placeholders.filter((key) => Boolean(dataMapping[key]))
      .length;
  }, [dataMapping, svgTemplate]);
  const readyForPreview =
    isReadyForMapping() &&
    (!svgTemplate || mappedPlaceholders === svgTemplate.placeholders.length);
  const hasSelectedRows = selectedRowIndices.length > 0;

  const getStepState = (step: StepId) => {
    const isActive = currentStep === step;
    const isCompleted =
      (step === "upload" && isReadyForEdit() && isReadyForSelection()) ||
      (step === "edit" && (isEditComplete() || isReadyForMapping())) ||
      (step === "mapping" && readyForPreview) ||
      (step === "select" && readyForPreview && hasSelectedRows) ||
      (step === "preview" && isReadyForPrint() && hasSelectedRows);

    const isAvailable =
      step === "upload" ||
      (step === "edit" && isReadyForEdit()) ||
      (step === "mapping" && isReadyForMapping()) ||
      (step === "select" && readyForPreview) ||
      (step === "preview" && readyForPreview && hasSelectedRows);

    const isReady = isAvailable && !isActive && !isCompleted;

    return { isActive, isCompleted, isAvailable, isReady };
  };

  const stepsWithState = STEP_ITEMS.map((item) => ({
    ...item,
    state: getStepState(item.step),
  }));

  const completedSteps = stepsWithState.filter(
    (item) => item.state.isCompleted,
  ).length;
  const currentStepIndex =
    STEP_ITEMS.findIndex((item) => item.step === currentStep) + 1;

  const placeholdersTotal = svgTemplate?.placeholders.length ?? 0;
  const recordCount = csvData?.rows.length ?? 0;
  const selectedCount = selectedRowIndices.length;
  const currentStepItem =
    stepsWithState.find((item) => item.step === currentStep) ?? stepsWithState[0];
  const currentNavIndex = stepsWithState.findIndex(
    (item) => item.step === currentStep,
  );
  const previousAvailableStep =
    currentNavIndex > 0
      ? [...stepsWithState.slice(0, currentNavIndex)]
          .reverse()
          .find((item) => item.state.isAvailable)?.step
      : undefined;
  const nextAvailableStep =
    currentNavIndex >= 0
      ? stepsWithState
          .slice(currentNavIndex + 1)
          .find((item) => item.state.isAvailable)?.step
      : undefined;
  const mappingSummary =
    placeholdersTotal === 0
      ? { value: "0", label: "fields detected" }
      : {
          value: `${mappedPlaceholders}/${placeholdersTotal}`,
          label: "mapped",
        };
  const selectionSummary =
    recordCount === 0
      ? { value: "0", label: "rows loaded" }
      : { value: `${selectedCount}/${recordCount}`, label: "selected" };

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerMetaRow}>
          <div className={styles.headerContent}>
            <SVG
              src={APP_LOGO_URL}
              title="Popul8 logo"
              className={styles.logo}
            />
            <div className={styles.headerText}>
              <h1 className={styles.title}>Popul8</h1>
              <p className={styles.subtitle}>
                Prepare card sheets from CSV data and SVG templates.
              </p>
            </div>
          </div>

          <div className={styles.controlRail}>
            <div className={styles.workflowStats}>
              <span className={styles.workflowStat}>
                <strong>{currentStepIndex}/5</strong> current stage
              </span>
              <span className={styles.workflowStat}>
                <strong>{completedSteps}/5</strong> complete
              </span>
              <span className={styles.workflowStat}>
                <strong>{mappingSummary.value}</strong> {mappingSummary.label}
              </span>
              <span className={styles.workflowStat}>
                <strong>{selectionSummary.value}</strong>{" "}
                {selectionSummary.label}
              </span>
              {warningFontCount > 0 && (
                <span
                  className={`${styles.workflowStat} ${styles.workflowStatWarning}`}
                >
                  <strong>{warningFontCount}</strong> missing fonts
                </span>
              )}
            </div>

            <ThemeSwitcher
              themeMode={themeMode}
              onThemeModeChange={onThemeModeChange}
            />
          </div>
        </div>

        <div className={styles.navigationScroller}>
          <nav className={styles.navigation} aria-label="Workflow steps">
            {stepsWithState.map((item) => {
              const badge =
                item.step === "edit" && warningFontCount > 0
                  ? `${warningFontCount}`
                  : item.step === "select"
                    ? `${selectedRowIndices.length}`
                    : undefined;
              const badgeTone: StepBadgeTone =
                item.step === "edit" && warningFontCount > 0
                  ? "error"
                  : "default";

              return (
                <StepButton
                  key={item.step}
                  step={item.step}
                  display={{
                    index:
                      STEP_ITEMS.findIndex(
                        (stepItem) => stepItem.step === item.step,
                      ) + 1,
                    label: item.label,
                    detail: item.detail,
                    badge,
                    badgeTone,
                  }}
                  state={item.state}
                  onActivate={(nextStep) => {
                    const { setCurrentStep } = useAppStore.getState();
                    setCurrentStep(nextStep);
                  }}
                />
              );
            })}
          </nav>
        </div>

        <div className={styles.mobileWorkflowNav}>
          <button
            type="button"
            className={styles.mobileWorkflowButton}
            onClick={() => {
              if (!previousAvailableStep) return;
              const { setCurrentStep } = useAppStore.getState();
              setCurrentStep(previousAvailableStep);
            }}
            disabled={!previousAvailableStep}
          >
            Back
          </button>
          <div className={styles.mobileWorkflowSummary}>
            <span className={styles.mobileWorkflowMeta}>
              Step {currentStepIndex} of 5
            </span>
            <strong>{currentStepItem.label}</strong>
            <span className={styles.mobileWorkflowDetail}>
              {currentStepItem.detail}
            </span>
          </div>
          <button
            type="button"
            className={styles.mobileWorkflowButton}
            onClick={() => {
              if (!nextAvailableStep) return;
              const { setCurrentStep } = useAppStore.getState();
              setCurrentStep(nextAvailableStep);
            }}
            disabled={!nextAvailableStep}
          >
            Next
          </button>
        </div>
      </div>
    </header>
  );
};
