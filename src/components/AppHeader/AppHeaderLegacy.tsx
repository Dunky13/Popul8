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
import Icon from "../Icon/Icon";
import { ThemeSwitcher } from "../ThemeSwitcher/ThemeSwitcherLegacy";
import styles from "../../styles/AppLegacy.module.css";

const APP_LOGO_URL = "/branding/popul8-logo.svg";

type StepBadgeTone = "default" | "error";

type StepButtonProps = {
  step: StepId;
  display: {
    label: string;
    detail: string;
    icon: React.ReactElement;
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
  icon: React.ReactElement;
}> = [
  {
    step: "upload",
    label: "Upload",
    detail: "CSV + SVG",
    icon: <Icon name="upload" size={20} />,
  },
  {
    step: "edit",
    label: "Template",
    detail: "Tweak structure",
    icon: <Icon name="edit" size={20} />,
  },
  {
    step: "mapping",
    label: "Mapping",
    detail: "Bind keys",
    icon: <Icon name="schema" size={20} />,
  },
  {
    step: "select",
    label: "Selection",
    detail: "Pick rows",
    icon: <Icon name="checklist" size={20} />,
  },
  {
    step: "preview",
    label: "Preview",
    detail: "Print output",
    icon: <Icon name="print" size={20} />,
  },
];

const StepButton: React.FC<StepButtonProps> = ({
  step,
  display,
  state,
  onActivate,
}) => {
  const { label, detail, icon, badge, badgeTone = "default" } = display;
  const { isActive, isCompleted, isAvailable, isReady } = state;
  const readyBadge = isReady && !badge ? "Ready" : badge;
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
          <div className={styles.stepIcon}>{icon}</div>
          <span className={styles.stepLabel}>{label}</span>
        </div>
        <div className={styles.stepStatus}>
          {readyBadge && (
            <span className={`${styles.stepBadge} ${badgeClassName}`}>
              {readyBadge}
            </span>
          )}
          {isCompleted && (
            <div className={styles.stepCheck}>
              <Icon name="check" size={14} />
            </div>
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
  const progressValue = Math.round((completedSteps / STEP_ITEMS.length) * 100);

  const placeholdersTotal = svgTemplate?.placeholders.length ?? 0;
  const recordCount = csvData?.rows.length ?? 0;
  const selectedCount = selectedRowIndices.length;

  return (
    <header className={styles.header}>
      <div className={styles.headerGlow} aria-hidden="true" />
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
                CSV + SVG workflow studio for mapping, tweaking, and print-ready
                card generation.
              </p>
            </div>
          </div>

          <div className={styles.controlRail}>
            <div className={styles.workflowStats}>
              <span className={styles.workflowStat}>
                <strong>
                  {selectedCount} / {recordCount}
                </strong>{" "}
                selected rows
              </span>
              <span className={styles.workflowStat}>
                <strong>
                  {mappedPlaceholders} / {placeholdersTotal}
                </strong>{" "}
                mapped placeholders
              </span>
            </div>

            <div className={styles.progressCard}>
              <span className={styles.progressLabel}>Workflow Completion</span>
              <span className={styles.progressValue}>{progressValue}%</span>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            </div>

            <ThemeSwitcher
              themeMode={themeMode}
              onThemeModeChange={onThemeModeChange}
            />
          </div>
        </div>

        {warningFontCount > 0 && (
          <div className={styles.headerWarningRow}>
            <span
              className={`${styles.workflowStat} ${styles.workflowStatWarning}`}
            >
              <strong>{warningFontCount}</strong> missing fonts
            </span>
          </div>
        )}

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
                    label: item.label,
                    detail: item.detail,
                    icon: item.icon,
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
      </div>
    </header>
  );
};
