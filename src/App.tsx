/**
 * Main application component
 */

import React from "react";
import { useShallow } from "zustand/react/shallow";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { AppMessages } from "./components/AppMessages/AppMessages";
import Icon from "./components/Icon/Icon";
import { StepContent } from "./components/StepContent/StepContent";
import { useAppKeyboardShortcuts } from "./hooks/useAppKeyboardShortcuts";
import { useDefaultMappingSync } from "./hooks/useDefaultMappingSync";
import { useOfflineStatus } from "./hooks/useOfflineStatus";
import { useSelectedRecords } from "./hooks/useSelectedRecords";
import { useThemeMode } from "./hooks/useThemeMode";
import { posthog } from "./lib/posthog";
import { useAppStore } from "./store/appStore";
import styles from "./styles/App.module.css";
import type { StepId } from "./types/app";

export const App: React.FC = () => {
  const {
    csvData,
    selectedRowIndices,
    currentStep,
    svgTemplate,
    records,
    errors,
    warnings,
    setErrors,
    setWarnings,
  } =
    useAppStore(
      useShallow((state) => ({
        csvData: state.csvData,
        selectedRowIndices: state.selectedRowIndices,
        currentStep: state.currentStep,
        svgTemplate: state.svgTemplate,
        records: state.records,
        errors: state.errors,
        warnings: state.warnings,
        setErrors: state.setErrors,
        setWarnings: state.setWarnings,
      })),
    );

  const { showOfflineIndicator } = useOfflineStatus();
  const { themeMode, setThemeMode } = useThemeMode();

  useDefaultMappingSync();
  useSelectedRecords({ csvData, selectedRowIndices });
  useAppKeyboardShortcuts();

  const prevStepRef = React.useRef<StepId | null>(null);
  React.useEffect(() => {
    if (prevStepRef.current !== null && prevStepRef.current !== currentStep) {
      posthog.capture("step navigated", {
        from_step: prevStepRef.current,
        to_step: currentStep,
      });
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  React.useEffect(() => {
    if (currentStep === "preview" && records.length > 0) {
      posthog.capture("cards generated", {
        record_count: records.length,
        placeholder_count: svgTemplate?.placeholders.length ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  React.useEffect(() => {
    if (currentStep === "mapping") return;

    const isMappingError = (message: string) =>
      message.startsWith("Template placeholders not mapped:") ||
      message.startsWith("Invalid mapping:");
    const isMappingWarning = (message: string) =>
      message.startsWith("Unused CSV columns:") ||
      message.startsWith("Potential mapping mismatches:");

    const nextErrors = errors.filter((message) => !isMappingError(message));
    const nextWarnings = warnings.filter((message) => !isMappingWarning(message));

    if (nextErrors.length !== errors.length) {
      setErrors(nextErrors);
    }
    if (nextWarnings.length !== warnings.length) {
      setWarnings(nextWarnings);
    }
  }, [currentStep, errors, warnings, setErrors, setWarnings]);

  return (
    <div className={styles.app}>
      {showOfflineIndicator && (
        <div className={styles.offlineIndicator}>
          <Icon name="wifiOff" size={16} />
          You&apos;re currently offline. Some features may be limited.
        </div>
      )}

      <AppHeader themeMode={themeMode} onThemeModeChange={setThemeMode} />
      {currentStep !== "mapping" && <AppMessages />}

      <main className={styles.main}>
        <StepContent />
      </main>
    </div>
  );
};
