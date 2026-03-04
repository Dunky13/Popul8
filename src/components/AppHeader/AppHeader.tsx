import React, { useMemo } from "react";
import SVG from "react-inlinesvg";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { getMissingFonts } from "../../utils/svgFonts";
import type { StepId } from "../../types/app";
import type { ThemeMode } from "../../hooks/useThemeMode";
import Icon from "../Icon/Icon";
import styles from "../../styles/App.module.css";
import appLogo from "../../assets/branding/logo.svg";

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

const THEME_ITEMS: Array<{
  value: ThemeMode;
  label: string;
  icon: "lightMode" | "darkMode";
}> = [
  { value: "light", label: "Light", icon: "lightMode" },
  { value: "dark", label: "Dark", icon: "darkMode" },
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
        isCompleted ? styles.completed : ""
      } ${isReady ? styles.ready : ""}`}
      onClick={() => {
        if (isAvailable) {
          onActivate(step);
        }
      }}
      disabled={!isAvailable}
      aria-current={isActive ? "step" : undefined}
    >
      <div className={styles.stepTopRow}>
        <div className={styles.stepIcon}>{icon}</div>
        {readyBadge && (
          <span className={`${styles.stepBadge} ${badgeClassName}`}>
            {readyBadge}
          </span>
        )}
      </div>
      <span className={styles.stepLabel}>{label}</span>
      <span className={styles.stepDetail}>{detail}</span>
      {isCompleted && (
        <div className={styles.stepCheck}>
          <Icon name="check" size={14} />
        </div>
      )}
    </button>
  );
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  themeMode,
  onThemeModeChange,
}) => {
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
    isReadyForPreview,
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
      isReadyForPreview: state.isReadyForPreview,
      isReadyForPrint: state.isReadyForPrint,
    })),
  );

  const missingFontCount = svgTemplate
    ? getMissingFonts(svgTemplate.content).length
    : 0;

  const mappedPlaceholders = useMemo(() => {
    if (!svgTemplate) return 0;
    return svgTemplate.placeholders.filter((key) => Boolean(dataMapping[key]))
      .length;
  }, [dataMapping, svgTemplate]);

  const getStepState = (step: StepId) => {
    const isActive = currentStep === step;
    const isCompleted =
      (step === "upload" && isReadyForEdit() && isReadyForSelection()) ||
      (step === "edit" && isEditComplete()) ||
      (step === "mapping" && isReadyForPreview()) ||
      (step === "select" &&
        isReadyForPreview() &&
        selectedRowIndices.length > 0) ||
      (step === "preview" && isReadyForPrint());

    const isAvailable =
      step === "upload" ||
      (step === "edit" && isReadyForEdit()) ||
      (step === "mapping" && isReadyForMapping()) ||
      (step === "select" && isReadyForPreview()) ||
      (step === "preview" && isReadyForPreview());

    const isReady = isAvailable && !isActive && !isCompleted;

    return { isActive, isCompleted, isAvailable, isReady };
  };

  const stepsWithState = STEP_ITEMS.map((item) => ({
    ...item,
    state: getStepState(item.step),
  }));

  const completedSteps = stepsWithState.filter((item) => item.state.isCompleted)
    .length;
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
            <SVG src={appLogo} title="Popul8 logo" className={styles.logo} />
            <div className={styles.headerText}>
              <h1 className={styles.title}>Popul8</h1>
              <p className={styles.subtitle}>
                CSV + SVG workflow studio for mapping, tweaking, and print-ready card generation.
              </p>
            </div>
          </div>

          <div className={styles.controlRail}>
            <div className={styles.workflowStats}>
              <span className={styles.workflowStat}>
                <strong>{recordCount}</strong> rows
              </span>
              <span className={styles.workflowStat}>
                <strong>{placeholdersTotal}</strong> placeholders
              </span>
              <span className={styles.workflowStat}>
                <strong>{mappedPlaceholders}</strong> mapped
              </span>
              <span className={styles.workflowStat}>
                <strong>{selectedCount}</strong> selected
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

            <div className={styles.themeSwitcher} role="group" aria-label="Theme mode">
              {THEME_ITEMS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`${styles.themeButton} ${
                    themeMode === item.value ? styles.themeButtonActive : ""
                  }`}
                  onClick={() => onThemeModeChange(item.value)}
                  aria-pressed={themeMode === item.value}
                  aria-label={`${item.label} mode`}
                  title={`${item.label} mode`}
                >
                  <Icon name={item.icon} size={16} className={styles.themeIcon} />
                  <span className="sr-only">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {missingFontCount > 0 && (
          <div className={styles.headerWarningRow}>
            <span className={`${styles.workflowStat} ${styles.workflowStatWarning}`}>
              <strong>{missingFontCount}</strong> missing fonts
            </span>
          </div>
        )}

        <nav className={styles.navigation} aria-label="Workflow steps">
          {stepsWithState.map((item) => {
            const badge =
              item.step === "edit" && missingFontCount > 0
                ? `${missingFontCount}`
                : item.step === "select"
                  ? `${selectedRowIndices.length}`
                  : undefined;
            const badgeTone: StepBadgeTone =
              item.step === "edit" && missingFontCount > 0 ? "error" : "default";

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
    </header>
  );
};
