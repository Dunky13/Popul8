import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  ADVANCED_EVER_ENABLED_STORAGE_KEY,
  ADVANCED_SETTINGS_UPDATED_EVENT,
  ADVANCED_STORAGE_KEY,
  type AdvancedEditorSettings,
  readAdvancedEditorSettings,
} from "../../../utils/editorPreferences";

export const useEditorSettings = () => {
  const [desiredViewMode, setDesiredViewMode] = useState<"visual" | "code">(
    "visual",
  );
  const [advancedSettings, setAdvancedSettings] =
    useState<AdvancedEditorSettings>(readAdvancedEditorSettings);
  const { isAdvanced, hasEnabledAdvancedBefore } = advancedSettings;

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(ADVANCED_STORAGE_KEY, String(isAdvanced));
    if (hasEnabledAdvancedBefore) {
      localStorage.setItem(ADVANCED_EVER_ENABLED_STORAGE_KEY, "true");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(ADVANCED_SETTINGS_UPDATED_EVENT));
    }
  }, [hasEnabledAdvancedBefore, isAdvanced]);

  const setIsAdvanced = useCallback<Dispatch<SetStateAction<boolean>>>(
    (nextValue) => {
      setAdvancedSettings((previous) => {
        const resolvedValue =
          typeof nextValue === "function"
            ? nextValue(previous.isAdvanced)
            : nextValue;
        return {
          isAdvanced: resolvedValue,
          hasEnabledAdvancedBefore:
            previous.hasEnabledAdvancedBefore || resolvedValue,
        };
      });
    },
    [],
  );

  const viewMode = isAdvanced ? desiredViewMode : "visual";
  const setViewMode = useCallback((mode: "visual" | "code") => {
    setDesiredViewMode(mode);
  }, []);

  return {
    viewMode,
    setViewMode,
    isAdvanced,
    hasEnabledAdvancedBefore,
    setIsAdvanced,
  };
};
