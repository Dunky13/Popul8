import React from "react";
import { useFeatureFlagVariantKey } from "posthog-js/react";
import { App as RedesignedApp } from "./App";
import { App as LegacyApp } from "./AppLegacy";

type UiVariant = "legacy" | "redesign";

const QUERY_PARAM = "uiVariant";
const STORAGE_KEY = "popul8-ui-variant";

const readOverride = (): UiVariant | null => {
  if (typeof window === "undefined") return null;

  const queryValue = new URLSearchParams(window.location.search).get(QUERY_PARAM);
  if (queryValue === "legacy" || queryValue === "redesign") {
    window.localStorage.setItem(STORAGE_KEY, queryValue);
    return queryValue;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (storedValue === "legacy" || storedValue === "redesign") {
    return storedValue;
  }

  return null;
};

const resolveFlagVariant = (variantKey: string | boolean | undefined): UiVariant => {
  if (variantKey === "test" || variantKey === "redesign") {
    return "redesign";
  }
  return "legacy";
};

export const AppExperiment: React.FC = () => {
  const flagVariant = useFeatureFlagVariantKey("new-redesign");
  const [override, setOverride] = React.useState<UiVariant | null>(() =>
    readOverride(),
  );

  React.useEffect(() => {
    const handlePopState = () => {
      setOverride(readOverride());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const uiVariant =
    override ?? (import.meta.env.DEV ? "redesign" : resolveFlagVariant(flagVariant));

  return uiVariant === "redesign" ? <RedesignedApp /> : <LegacyApp />;
};
