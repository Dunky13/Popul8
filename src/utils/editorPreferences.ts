export const ADVANCED_STORAGE_KEY = "popul8-advanced-features";
export const ADVANCED_EVER_ENABLED_STORAGE_KEY =
  "popul8-advanced-ever-enabled";
export const ADVANCED_SETTINGS_UPDATED_EVENT =
  "popul8-advanced-settings-updated";

export type AdvancedEditorSettings = {
  isAdvanced: boolean;
  hasEnabledAdvancedBefore: boolean;
};

const readBooleanPreference = (key: string): boolean | null => {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(key);
  if (stored === null) return null;
  return stored === "true";
};

export const readAdvancedEditorSettings = (): AdvancedEditorSettings => {
  const isAdvanced = readBooleanPreference(ADVANCED_STORAGE_KEY) ?? false;
  const hasEnabledAdvancedBefore =
    readBooleanPreference(ADVANCED_EVER_ENABLED_STORAGE_KEY) ?? isAdvanced;

  return {
    isAdvanced,
    hasEnabledAdvancedBefore,
  };
};

export const shouldAutoLoadMissingFonts = (
  settings: AdvancedEditorSettings,
) => !settings.isAdvanced || settings.hasEnabledAdvancedBefore;
