import { useCallback, useEffect, useState } from "react";

const ADVANCED_STORAGE_KEY = "popul8-advanced-features";

export const useEditorSettings = () => {
  const [desiredViewMode, setDesiredViewMode] = useState<"visual" | "code">(
    "visual",
  );
  const [isAdvanced, setIsAdvanced] = useState(() => {
    if (typeof localStorage === "undefined") return true;
    const stored = localStorage.getItem(ADVANCED_STORAGE_KEY);
    if (stored === null) return false;
    return stored === "true";
  });

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(ADVANCED_STORAGE_KEY, String(isAdvanced));
  }, [isAdvanced]);

  const viewMode = isAdvanced ? desiredViewMode : "visual";
  const setViewMode = useCallback((mode: "visual" | "code") => {
    setDesiredViewMode(mode);
  }, []);

  return {
    viewMode,
    setViewMode,
    isAdvanced,
    setIsAdvanced,
  };
};
