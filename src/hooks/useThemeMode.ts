import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";
type ThemePreference = ThemeMode | "system";

const THEME_STORAGE_KEY = "popul8-theme-mode";

const isThemeMode = (value: string): value is ThemeMode => {
  return value === "light" || value === "dark";
};

const getSystemThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === "undefined") return "system";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (!stored || !isThemeMode(stored)) {
    return "system";
  }

  return stored;
};

export const getInitialThemeMode = (): ThemeMode => {
  const preference = getStoredThemePreference();
  return preference === "system" ? getSystemThemeMode() : preference;
};

const applyThemeToDocument = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
};

export const useThemeMode = () => {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getStoredThemePreference(),
  );
  const [systemThemeMode, setSystemThemeMode] = useState<ThemeMode>(() =>
    getSystemThemeMode(),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (event: MediaQueryListEvent) => {
      setSystemThemeMode(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  const themeMode = themePreference === "system" ? systemThemeMode : themePreference;

  useEffect(() => {
    applyThemeToDocument(themeMode);
  }, [themeMode]);

  useEffect(() => {
    try {
      if (themePreference === "system") {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    } catch {
      // Ignore persistence failures in restricted storage environments.
    }
  }, [themePreference]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemePreference(mode);
  }, []);

  return {
    themeMode,
    setThemeMode,
  };
};
